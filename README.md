# 🎨 AI 놀이터

로그인 없이 누구나 즐기는 AI 체험 사이트. 세 가지 기능을 담았습니다.

| 기능 | 설명 | 사용 AI |
|------|------|---------|
| 🪄 **동화제작** | 주인공·주제만 정하면 그림동화 완성 | Groq(이야기) + Pollinations(삽화·무료) |
| 🧭 **진로탐험** | 관심사를 말하면 어울리는 직업 안내 | Groq 챗봇 |
| 💻 **바이브코딩** | 말로 설명하면 동작하는 앱 생성 | Groq |
| 🤖 **디원이** | 모든 화면에 떠 있는 도우미 챗봇 (한국디지털교육원 캐릭터) | Groq |

- **로그인/설치 없음** — 학교·이름만 입력하고 입장
- **Groq API 키는 Cloudflare Worker 뒤에 숨겨져** 브라우저에 노출되지 않음
- 정적 파일이라 **GitHub Pages**에 그대로 올라감

---

## 🚀 배포 (딱 2단계)

### 1단계 — Cloudflare Worker 만들기 (Groq 키 숨기기)

1. https://dash.cloudflare.com 가입/로그인 (무료)
2. 왼쪽 메뉴 **Workers & Pages → Create → Create Worker** → 이름 입력(예: `ai-playground`) → **Deploy**
3. **Edit code** 클릭 → 기본 코드를 모두 지우고 이 저장소의 **`worker.js`** 내용을 붙여넣기 → **Deploy**
4. **Settings → Variables and Secrets →** `GROQ_API_KEY` 추가
   - 이름: `GROQ_API_KEY`
   - 값: 본인 Groq 키 (https://console.groq.com/keys 에서 발급)
   - **Encrypt(Secret)** 로 저장
5. 배포된 주소를 복사 (예: `https://ai-playground.본인계정.workers.dev`)

> (선택) 보안을 높이려면 `worker.js` 상단 `ALLOWED_ORIGINS` 를 본인 GitHub Pages 주소로 바꾸세요.

### 2단계 — 사이트 연결 & GitHub Pages 올리기

1. **`js/config.js`** 열어서 한 줄만 수정:
   ```js
   PROXY_URL: "https://ai-playground.본인계정.workers.dev",
   ```
2. GitHub에 이 폴더를 올리고 **Settings → Pages → Branch: main / root** 선택 → 저장
3. 몇 분 뒤 나오는 주소(`https://본인아이디.github.io/ai-playground/`)로 접속하면 끝! 🎉

---

## 🧪 내 컴퓨터에서 먼저 테스트하려면

`js/config.js` 의 `DEV_GROQ_KEY` 에 Groq 키를 잠깐 넣고, 로컬 서버로 열면 됩니다.

```powershell
cd ai-playground
python -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

> ⚠️ `DEV_GROQ_KEY` 는 키가 그대로 노출되므로 **테스트용**입니다. 공개 배포 전에 반드시 `""` 로 비우세요.

---

## 📁 구조

```
ai-playground/
├─ index.html          # 셸
├─ css/style.css       # 디자인 시스템
├─ js/
│  ├─ config.js        # ← PROXY_URL 여기서 설정
│  ├─ ui.js            # UI 헬퍼
│  ├─ api.js           # Groq(프록시) + Pollinations 이미지
│  ├─ app.js           # 라우터·입장·홈·디원이 챗봇
│  ├─ storybook.js     # 동화제작
│  ├─ career.js        # 진로탐험
│  └─ vibecoding.js    # 바이브코딩
├─ worker.js           # Cloudflare Worker (Groq 프록시)
└─ README.md
```

## 💰 비용
- Groq: 무료 등급으로 충분 (사용량 많아지면 한도 확인)
- Pollinations 이미지: 완전 무료, 키 불필요
- Cloudflare Worker / GitHub Pages: 무료
