/* ===========================================================
   설정 파일
   -----------------------------------------------------------
   배포 후 여기 PROXY_URL 한 줄만 본인 Cloudflare Worker 주소로
   바꾸면 됩니다. (예: https://ai-playground.본인계정.workers.dev)
   =========================================================== */
window.CONFIG = {
  // Cloudflare Worker 프록시 주소 (Groq 키는 Worker 안에 숨겨져 있음)
  // ↓↓↓ 배포 후 이 주소를 본인 Worker 주소로 바꾸세요 ↓↓↓
  PROXY_URL: "",

  // Groq 모델 (Worker 쪽과 맞추기)
  MODEL: "llama-3.3-70b-versatile",

  // 이미지 생성(동화 삽화) — Pollinations 무료, 키 불필요
  IMAGE_MODEL: "flux",

  // 개발/임시용: PROXY_URL이 비어있을 때 브라우저에 직접 키를 넣어 테스트.
  // ⚠️ 공개 배포 시에는 절대 사용하지 마세요(키 노출). 평소엔 "" 로 두세요.
  DEV_GROQ_KEY: "",
};
