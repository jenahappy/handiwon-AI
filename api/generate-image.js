/* ===========================================================
   Vercel 서버리스 함수 — Gemini 이미지 생성 (인증 사용자 전용)
   -----------------------------------------------------------
   - 인증: 이름 "jena" + 전화번호 "01012341234" 일 때만 허용, 아니면 403
   - 키는 코드에 없음. Vercel 환경변수 GEMINI_API_KEY 사용.
   - 성공 시 이미지 바이트(image/png 등)를 그대로 반환.

   설정: Vercel → Settings → Environment Variables
        GEMINI_API_KEY = (본인 Gemini 키)
        (선택) GEMINI_IMAGE_MODEL = 사용할 모델명
   =========================================================== */
export const config = { maxDuration: 60 };

const AUTH_NAME = "jena";
const AUTH_PHONE = "01012341234";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST /api/generate-image 만 지원합니다." });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  // 인증 확인
  const name = String(body.name || "").trim().toLowerCase();
  const phone = String(body.phone || "").replace(/[^0-9]/g, "");
  if (name !== AUTH_NAME || phone !== AUTH_PHONE) {
    return res.status(403).json({ error: "Gemini 이미지 생성 권한이 없습니다." });
  }

  const prompt = String(body.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: "prompt가 필요합니다." });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "서버에 GEMINI_API_KEY가 설정되지 않았습니다." });

  // 모델명: 환경변수 우선, 없으면 가용 모델(generateContent 지원)을 차례로 시도
  const models = process.env.GEMINI_IMAGE_MODEL
    ? [process.env.GEMINI_IMAGE_MODEL]
    : ["gemini-2.5-flash-image", "gemini-3.1-flash-image", "gemini-3-pro-image"];

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["IMAGE"] },
  };

  const errors = [];
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) { errors.push({ model, status: r.status, detail: data?.error?.message || data }); continue; }

      const parts = data?.candidates?.[0]?.content?.parts || [];
      const part = parts.find(p => p.inlineData || p.inline_data);
      const inline = part?.inlineData || part?.inline_data;
      if (!inline?.data) { errors.push({ model, status: 502, detail: "이미지 데이터 없음" }); continue; }

      const buf = Buffer.from(inline.data, "base64");
      res.setHeader("Content-Type", inline.mimeType || inline.mime_type || "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.status(200).send(buf);
    } catch (e) {
      errors.push({ model, status: 502, detail: e.message });
    }
  }

  return res.status(errors[0]?.status || 502).json({ error: "Gemini 이미지 생성 실패", errors });
}
