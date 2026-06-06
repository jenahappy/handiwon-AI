/* ===========================================================
   설정 파일
   -----------------------------------------------------------
   배포 후 여기 PROXY_URL 한 줄만 본인 Cloudflare Worker 주소로
   바꾸면 됩니다. (예: https://ai-playground.본인계정.workers.dev)
   =========================================================== */
window.CONFIG = {
  // 프록시 주소 (Groq 키는 프록시 뒤에 숨겨져 있음)
  // Vercel 서버리스 함수 사용: 도메인 + "/api"  (→ /api/chat 호출)
  PROXY_URL: "https://handiwon-ai.vercel.app/api",

  // Groq 모델 (Worker 쪽과 맞추기)
  MODEL: "llama-3.3-70b-versatile",

  // 이미지 생성(동화 삽화) — Pollinations 무료, 키 불필요
  IMAGE_MODEL: "flux",

  // 개발/임시용: PROXY_URL이 비어있을 때 브라우저에 직접 키를 넣어 테스트.
  // ⚠️ 공개 배포 시에는 절대 사용하지 마세요(키 노출). 평소엔 "" 로 두세요.
  DEV_GROQ_KEY: "",
};
