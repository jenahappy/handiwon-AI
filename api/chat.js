/* ===========================================================
   Vercel 서버리스 함수 — Groq 프록시
   -----------------------------------------------------------
   /api/chat 로 들어온 요청에 GROQ_API_KEY(비밀)를 붙여 Groq에
   전달하고 결과를 돌려줌. 키는 브라우저에 절대 노출되지 않음.

   설정: Vercel 프로젝트 → Settings → Environment Variables 에
        GROQ_API_KEY 등록 (값 = 본인 Groq 키)
   =========================================================== */
export default async function handler(req, res) {
  // CORS (어느 사이트에서든 호출 가능)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(404).json({ error: "POST /api/chat 만 지원합니다." });

  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ error: "서버에 GROQ_API_KEY가 설정되지 않았습니다." });

  // 본문 파싱 (Vercel이 자동 파싱하지만 문자열로 올 때도 대비)
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== "object") body = {};

  body.max_tokens = Math.min(body.max_tokens || 1500, 4096);
  body.model = body.model || "llama-3.3-70b-versatile";

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    res.setHeader("Content-Type", "application/json");
    return res.status(r.status).send(text);
  } catch (e) {
    return res.status(502).json({ error: "Groq 호출 실패: " + e.message });
  }
}
