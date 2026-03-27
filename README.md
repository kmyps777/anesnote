# ⚕ AnestheMemo

마취과 필수 메모 관리 앱 — Firebase Firestore + Google 로그인 + PWA (Safari)

---

## 📦 파일 구조

```
/
├── index.html      # 앱 진입점 + Firebase 설정
├── app.js          # 앱 로직 (Auth, Firestore CRUD, UI 제어)
├── style.css       # 스타일시트
├── manifest.json   # PWA 매니페스트 (직접 생성 필요)
└── README.md
```

---

## 🚀 배포 순서

### 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. **프로젝트 추가** 클릭 → 프로젝트 이름 입력
3. Google Analytics는 선택사항 (꺼도 무방)

### 2. Firebase 서비스 활성화

#### Authentication (Google 로그인)
1. 콘솔 좌측 **Authentication** → **시작하기**
2. **Sign-in method** → **Google** → 활성화
3. 프로젝트 지원 이메일 설정 후 저장

#### Firestore Database
1. 콘솔 좌측 **Firestore Database** → **데이터베이스 만들기**
2. **프로덕션 모드**로 시작
3. 리전 선택 (예: `asia-northeast3` = 서울)
4. 생성 완료 후 **규칙** 탭에서 아래로 교체:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/memos/{memoId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 3. Firebase 앱 등록 및 config 복사

1. 콘솔 **프로젝트 설정** (⚙️) → **일반** 탭
2. **내 앱** 섹션 → **웹 앱 추가** (`</>` 아이콘)
3. 앱 닉네임 입력 후 등록
4. 표시되는 `firebaseConfig` 객체를 복사

### 4. index.html에 config 붙여넣기

`index.html` 안의 아래 부분을 교체:

```javascript
// ✏️ 아래 값들을 본인의 Firebase 프로젝트 값으로 교체하세요
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",           // ← 교체
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

### 5. GitHub Pages 배포

```bash
# 저장소 생성 후 파일 업로드
git init
git add .
git commit -m "init: AnestheMemo"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

GitHub 저장소 → **Settings** → **Pages** → **Source: main branch / root** → Save

배포 URL 형식: `https://YOUR_USERNAME.github.io/YOUR_REPO/`

### 6. Firebase에 승인된 도메인 추가

1. Firebase Console → **Authentication** → **Settings**
2. **승인된 도메인** → **도메인 추가**
3. `YOUR_USERNAME.github.io` 입력 후 추가

---

## 📱 Safari PWA 설치 (iPhone / iPad)

1. Safari에서 배포 URL 접속
2. 하단 **공유** 버튼 탭 (□↑ 아이콘)
3. **홈 화면에 추가** 선택
4. 이름 확인 후 **추가**

> 홈 화면에서 아이콘을 탭하면 전체화면 PWA 모드로 실행됩니다.

---

## ⚙️ PWA manifest.json 생성

아래 내용으로 `manifest.json` 파일을 만들어 루트에 저장하세요:

```json
{
  "name": "AnestheMemo",
  "short_name": "AnestheMemo",
  "description": "마취과 필수 메모 관리",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#0f1923",
  "theme_color": "#0f1923",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

> 아이콘 파일(`icon-192.png`, `icon-512.png`)은 원하는 이미지로 준비해 루트에 저장하세요.

---

## 🗂️ Firestore 데이터 구조

```
users/
  {uid}/
    memos/
      {memoId}/
        title:     string
        content:   string
        createdAt: timestamp
        updatedAt: timestamp
```

---

## ✨ 주요 기능

| 기능 | 설명 |
|---|---|
| Google 로그인 | Firebase Authentication 기반 |
| BMI 계산기 | 키(m), 몸무게(kg) 입력 → BMI + 분류 시각화 |
| 메모 작성/편집/삭제 | Firestore 실시간 저장 |
| 삭제 경고 팝업 | 실수 방지용 확인 모달 |
| 사용자별 데이터 | 각 Google 계정에 독립적으로 저장 |
| PWA 지원 | Safari 홈 화면 추가, 전체화면 실행 |
| 단축키 | `Cmd+Enter` 저장, `Esc` 모달 닫기 |

---

## 🔒 보안 참고사항

- `firebaseConfig`의 `apiKey`는 클라이언트 공개 키로, GitHub에 올려도 안전합니다.
- 실제 보안은 Firestore **보안 규칙**으로 제어됩니다 (위 규칙 참고).
- 본인 계정의 데이터에만 읽기/쓰기가 허용됩니다.
