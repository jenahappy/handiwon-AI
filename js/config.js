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

  // 이미지 생성(동화 삽화) — Pollinations
  IMAGE_MODEL: "flux",
  // 앱을 식별해 사용량 제한을 완화 (Pollinations 권장 방식). 사이트 도메인으로.
  IMAGE_REFERRER: "jenahappy.github.io",
  // (선택) 무료 토큰을 넣으면 삽화가 훨씬 안정적으로 생성됩니다.
  // 발급: https://auth.pollinations.ai (GitHub 로그인, 무료). 없으면 "" 로 두세요.
  IMAGE_TOKEN: "",

  // 개발/임시용: PROXY_URL이 비어있을 때 브라우저에 직접 키를 넣어 테스트.
  // ⚠️ 공개 배포 시에는 절대 사용하지 마세요(키 노출). 평소엔 "" 로 두세요.
  DEV_GROQ_KEY: "",
};
