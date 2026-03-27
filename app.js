/* =============================================
   AnestheMemo — app.js
   ============================================= */

/* Firebase 모듈은 index.html에서 window.__firebase로 노출됨 */
const {
  auth, db,
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
  collection, doc, addDoc, getDocs, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp
} = window.__firebase;

/* ── State ── */
let currentUser  = null;
let memos        = [];           // Firestore에서 불러온 사용자 메모 목록
let activeMemoId = null;         // 현재 선택된 메모 ID ('bmi' 또는 Firestore doc ID)
let editingId    = null;         // 현재 편집 중인 메모 ID (신규면 null)
let pendingDeleteId = null;      // 삭제 대기 중인 메모 ID

/* ── DOM Refs ── */
const loginScreen   = document.getElementById('login-screen');
const appEl         = document.getElementById('app');
const googleBtn     = document.getElementById('google-login-btn');
const logoutBtn     = document.getElementById('logout-btn');
const userAvatar    = document.getElementById('user-avatar');
const userName      = document.getElementById('user-name');

const memoList      = document.getElementById('memo-list');
const newMemoBtn    = document.getElementById('new-memo-btn');

const emptyState    = document.getElementById('empty-state');
const bmiView       = document.getElementById('bmi-view');
const userMemoView  = document.getElementById('user-memo-view');
const memoForm      = document.getElementById('memo-form');

// BMI
const bmiHeight     = document.getElementById('bmi-height');
const bmiWeight     = document.getElementById('bmi-weight');
const bmiCalcBtn    = document.getElementById('bmi-calc-btn');
const bmiResult     = document.getElementById('bmi-result');
const bmiValueEl    = document.getElementById('bmi-value');
const bmiLabelEl    = document.getElementById('bmi-label');
const bmiBarFill    = document.getElementById('bmi-bar-fill');
const bmiBarMarker  = document.getElementById('bmi-bar-marker');

// 사용자 메모 보기
const viewTitle     = document.getElementById('view-title');
const viewContent   = document.getElementById('view-content');
const viewMeta      = document.getElementById('view-meta');
const editBtn       = document.getElementById('edit-btn');
const deleteBtn     = document.getElementById('delete-btn');

// 메모 폼
const formTitleLabel = document.getElementById('form-title-label');
const memoTitleInput = document.getElementById('memo-title');
const memoContentInput = document.getElementById('memo-content');
const cancelBtn     = document.getElementById('cancel-btn');
const saveBtn       = document.getElementById('save-btn');

// 모달
const confirmModal  = document.getElementById('confirm-modal');
const confirmMemoTitle = document.getElementById('confirm-memo-title');
const modalCancel   = document.getElementById('modal-cancel');
const modalConfirm  = document.getElementById('modal-confirm');

/* =============================================
   AUTH
   ============================================= */
googleBtn.addEventListener('click', async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error('로그인 오류:', err);
    alert('로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
  }
});

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    userAvatar.src = user.photoURL || '';
    userAvatar.style.display = user.photoURL ? 'block' : 'none';
    userName.textContent = user.displayName || user.email;

    loginScreen.style.display = 'none';
    appEl.style.display = 'block';

    await loadMemos();
    renderSidebar();
    showView('empty');
  } else {
    currentUser = null;
    memos = [];
    loginScreen.style.display = 'flex';
    appEl.style.display = 'none';
  }
});

/* =============================================
   FIRESTORE CRUD
   ============================================= */
function userMemosRef() {
  return collection(db, 'users', currentUser.uid, 'memos');
}

async function loadMemos() {
  try {
    const q = query(userMemosRef(), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    memos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('메모 불러오기 오류:', err);
  }
}

async function saveMemo() {
  const title   = memoTitleInput.value.trim();
  const content = memoContentInput.value.trim();

  if (!title) {
    memoTitleInput.focus();
    memoTitleInput.style.borderColor = 'var(--danger)';
    setTimeout(() => { memoTitleInput.style.borderColor = ''; }, 1200);
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = '저장 중…';

  try {
    if (editingId) {
      // 수정
      await updateDoc(doc(db, 'users', currentUser.uid, 'memos', editingId), {
        title,
        content,
        updatedAt: serverTimestamp()
      });
      const idx = memos.findIndex(m => m.id === editingId);
      if (idx !== -1) {
        memos[idx] = { ...memos[idx], title, content, updatedAt: new Date() };
      }
      activeMemoId = editingId;
    } else {
      // 신규
      const docRef = await addDoc(userMemosRef(), {
        title,
        content,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      const newMemo = { id: docRef.id, title, content, createdAt: new Date(), updatedAt: new Date() };
      memos.unshift(newMemo);
      activeMemoId = docRef.id;
    }

    renderSidebar();
    showView('user-view');
  } catch (err) {
    console.error('저장 오류:', err);
    alert('저장에 실패했습니다. 다시 시도해 주세요.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '저장';
    editingId = null;
  }
}

async function deleteMemo(id) {
  try {
    await deleteDoc(doc(db, 'users', currentUser.uid, 'memos', id));
    memos = memos.filter(m => m.id !== id);
    activeMemoId = null;
    renderSidebar();
    showView('empty');
  } catch (err) {
    console.error('삭제 오류:', err);
    alert('삭제에 실패했습니다. 다시 시도해 주세요.');
  }
}

/* =============================================
   SIDEBAR RENDER
   ============================================= */
function renderSidebar() {
  memoList.innerHTML = '';

  // BMI 고정 항목
  const bmiItem = document.createElement('li');
  bmiItem.className = 'memo-item' + (activeMemoId === 'bmi' ? ' active' : '');
  bmiItem.dataset.id = 'bmi';
  bmiItem.innerHTML = `
    <span class="memo-item-icon">🧮</span>
    <div class="memo-item-info">
      <div class="memo-item-title">BMI 계산기</div>
      <div class="memo-item-date">기본 메모</div>
    </div>`;
  bmiItem.addEventListener('click', () => {
    activeMemoId = 'bmi';
    editingId = null;
    renderSidebar();
    showView('bmi');
  });
  memoList.appendChild(bmiItem);

  // 사용자 메모들
  memos.forEach(memo => {
    const li = document.createElement('li');
    li.className = 'memo-item' + (activeMemoId === memo.id ? ' active' : '');
    li.dataset.id = memo.id;

    const date = formatDate(memo.updatedAt || memo.createdAt);
    li.innerHTML = `
      <span class="memo-item-icon">📝</span>
      <div class="memo-item-info">
        <div class="memo-item-title">${escapeHtml(memo.title)}</div>
        <div class="memo-item-date">${date}</div>
      </div>`;

    li.addEventListener('click', () => {
      activeMemoId = memo.id;
      editingId = null;
      renderSidebar();
      showView('user-view');
    });

    memoList.appendChild(li);
  });
}

/* =============================================
   VIEW SWITCHER
   ============================================= */
function showView(view) {
  emptyState.style.display    = 'none';
  bmiView.style.display       = 'none';
  userMemoView.style.display  = 'none';
  memoForm.style.display      = 'none';

  switch (view) {
    case 'empty':
      emptyState.style.display = 'flex';
      break;

    case 'bmi':
      bmiView.style.display = 'block';
      // BMI 결과 초기화
      bmiResult.style.display = 'none';
      bmiHeight.value = '';
      bmiWeight.value = '';
      break;

    case 'user-view': {
      const memo = memos.find(m => m.id === activeMemoId);
      if (!memo) { showView('empty'); return; }
      viewTitle.textContent   = memo.title;
      viewContent.textContent = memo.content || '(내용 없음)';
      viewMeta.textContent    = `마지막 수정: ${formatDate(memo.updatedAt || memo.createdAt)}`;
      userMemoView.style.display = 'block';
      break;
    }

    case 'form':
      if (editingId) {
        const memo = memos.find(m => m.id === editingId);
        formTitleLabel.textContent  = '메모 편집';
        memoTitleInput.value        = memo?.title || '';
        memoContentInput.value      = memo?.content || '';
      } else {
        formTitleLabel.textContent  = '새 메모';
        memoTitleInput.value        = '';
        memoContentInput.value      = '';
      }
      memoForm.style.display = 'block';
      setTimeout(() => memoTitleInput.focus(), 50);
      break;
  }
}

/* =============================================
   EVENT LISTENERS
   ============================================= */
// 새 메모
newMemoBtn.addEventListener('click', () => {
  activeMemoId = null;
  editingId    = null;
  renderSidebar();
  showView('form');
});

// 편집
editBtn.addEventListener('click', () => {
  editingId = activeMemoId;
  showView('form');
});

// 저장
saveBtn.addEventListener('click', saveMemo);

// 취소
cancelBtn.addEventListener('click', () => {
  if (activeMemoId && activeMemoId !== 'bmi') {
    showView('user-view');
  } else {
    showView('empty');
  }
  editingId = null;
});

// 삭제 버튼 → 모달
deleteBtn.addEventListener('click', () => {
  const memo = memos.find(m => m.id === activeMemoId);
  if (!memo) return;
  pendingDeleteId = memo.id;
  confirmMemoTitle.textContent = `"${memo.title}"`;
  confirmModal.style.display = 'flex';
});

// 모달 취소
modalCancel.addEventListener('click', () => {
  confirmModal.style.display = 'none';
  pendingDeleteId = null;
});

// 모달 확인 (삭제)
modalConfirm.addEventListener('click', async () => {
  confirmModal.style.display = 'none';
  if (pendingDeleteId) {
    await deleteMemo(pendingDeleteId);
    pendingDeleteId = null;
  }
});

// 모달 오버레이 클릭으로 닫기
confirmModal.addEventListener('click', (e) => {
  if (e.target === confirmModal) {
    confirmModal.style.display = 'none';
    pendingDeleteId = null;
  }
});

// Ctrl/Cmd + Enter로 저장
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (memoForm.style.display !== 'none') saveMemo();
  }
  if (e.key === 'Escape') {
    if (confirmModal.style.display !== 'none') {
      confirmModal.style.display = 'none';
      pendingDeleteId = null;
    }
  }
});

/* =============================================
   BMI 계산
   ============================================= */
bmiCalcBtn.addEventListener('click', calcBMI);
bmiHeight.addEventListener('keydown', (e) => { if (e.key === 'Enter') bmiWeight.focus(); });
bmiWeight.addEventListener('keydown', (e) => { if (e.key === 'Enter') calcBMI(); });

function calcBMI() {
  const h = parseFloat(bmiHeight.value);
  const w = parseFloat(bmiWeight.value);

  if (!h || !w || h <= 0 || w <= 0) {
    [bmiHeight, bmiWeight].forEach(el => {
      if (!parseFloat(el.value)) {
        el.style.borderColor = 'var(--danger)';
        setTimeout(() => { el.style.borderColor = ''; }, 1200);
      }
    });
    return;
  }

  const bmi = w / (h * h);
  const rounded = Math.round(bmi * 10) / 10;

  bmiValueEl.textContent = rounded.toFixed(1);

  // 분류 (아시아 기준)
  let label, cls;
  if (bmi < 18.5)       { label = '저체중';  cls = 'underweight'; }
  else if (bmi < 23)    { label = '정상';    cls = 'normal'; }
  else if (bmi < 25)    { label = '과체중';  cls = 'overweight'; }
  else                  { label = '비만';    cls = 'obese'; }

  bmiLabelEl.textContent = label;
  bmiLabelEl.className   = 'bmi-label ' + cls;

  // 바 채우기: BMI 범위 10–40 → 0–100%
  const pct = Math.min(100, Math.max(0, ((bmi - 10) / 30) * 100));
  bmiBarFill.style.width   = pct + '%';
  bmiBarMarker.style.left  = pct + '%';

  bmiResult.style.display = 'block';
}

/* =============================================
   UTILITIES
   ============================================= */
function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
