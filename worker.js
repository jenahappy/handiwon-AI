/* ===========================================================
   Cloudflare Worker — Groq 프록시
   -----------------------------------------------------------
   역할: 브라우저의 요청을 받아 GROQ_API_KEY(비밀)를 붙여 Groq에
        전달하고 결과를 돌려줌. 키는 브라우저에 절대 노출되지 않음.

   배포: 아래 README.md 의 "Cloudflare Worker 설치" 참고
   비밀값: 대시보드 Settings → Variables → GROQ_API_KEY 등록
   =========================================================== */

// 허용할 사이트(본인 GitHub Pages 주소). 보안을 위해 꼭 본인 주소로 바꾸세요.
// 여러 개면 콤마로. 테스트 중엔 "*" 로 두어도 동작합니다.
const ALLOWED_ORIGINS = "*";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function cors(origin) {
  const allow = ALLOWED_ORIGINS === "*" ? "*"
    : (ALLOWED_ORIGINS.split(",").map(s => s.trim()).includes(origin) ? origin : "");
  return {
    "Access-Control-Allow-Origin": allow || "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = cors(origin);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);
    if (request.method !== "POST" || !url.pathname.endsWith("/chat")) {
      return new Response("AI 놀이터 프록시: POST /chat 만 지원합니다.", { status: 404, headers });
    }

    if (!env.GROQ_API_KEY) {
      return json({ error: "서버에 GROQ_API_KEY가 설정되지 않았습니다." }, 500, headers);
    }

    let body;
    try { body = await request.json(); }
    catch { return json({ error: "잘못된 요청 형식" }, 400, headers); }

    // 안전장치: 너무 큰 요청 방지
    body.max_tokens = Math.min(body.max_tokens || 1500, 4096);
    body.model = body.model || "llama-3.3-70b-versatile";

    try {
      const upstream = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + env.GROQ_API_KEY,
        },
        body: JSON.stringify(body),
      });
      const data = await upstream.text();
      return new Response(data, {
        status: upstream.status,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    } catch (e) {
      return json({ error: "Groq 호출 실패: " + e.message }, 502, headers);
    }
  },
};

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...headers, "Content-Type": "application/json" },
  });
}
