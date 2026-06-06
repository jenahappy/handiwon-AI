/* ===========================================================
   Vercel 서버리스 함수 — 이미지 생성 프록시 (모든 사용자용)
   -----------------------------------------------------------
   1순위: Hugging Face 무료 이미지 (HF_TOKEN, 서버에만 숨김)
   실패 시: Pollinations 로 302 리다이렉트 (사용자 브라우저 IP로 생성)

   <img src="/api/image?prompt=...&seed=..."> 형태로 바로 사용 가능.

   설정: Vercel → Settings → Environment Variables
        HF_TOKEN = (본인 Hugging Face 토큰)
        (선택) HF_IMAGE_MODEL = 사용할 모델 (기본 FLUX.1-schnell 등 시도)
   =========================================================== */
export const config = { maxDuration: 60 };

const MODELS = process.env.HF_IMAGE_MODEL
  ? [process.env.HF_IMAGE_MODEL]
  : ["black-forest-labs/FLUX.1-dev", "black-forest-labs/FLUX.1-schnell", "stabilityai/stable-diffusion-xl-base-1.0"];

function pollinationsUrl(prompt, q) {
  const w = q.width || "768", h = q.height || "768";
  const seed = q.seed || String(Math.floor(Math.random() * 1e6));
  const p = new URLSearchParams({ width: w, height: h, seed, nologo: "true", model: "flux", referrer: "jenahappy.github.io" });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${p.toString()}`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  // GET 쿼리 또는 POST 본문 모두 지원
  let q = req.query || {};
  if (req.method === "POST") {
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    q = { ...q, ...(body || {}) };
  }

  const prompt = String(q.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: "prompt가 필요합니다." });

  const token = process.env.HF_TOKEN;
  const errors = [];

  // 1순위: Hugging Face
  if (token) {
    const endpoints = (model) => [
      `https://router.huggingface.co/hf-inference/models/${model}`,
      `https://api-inference.huggingface.co/models/${model}`,
    ];
    for (const model of MODELS) {
      for (const url of endpoints(model)) {
        try {
          const r = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: "Bearer " + token,
              "Content-Type": "application/json",
              Accept: "image/png",
            },
            body: JSON.stringify({ inputs: prompt }),
          });
          const ct = r.headers.get("content-type") || "";
          if (r.ok && ct.startsWith("image")) {
            const buf = Buffer.from(await r.arrayBuffer());
            res.setHeader("Content-Type", ct);
            res.setHeader("Cache-Control", "public, max-age=86400");
            return res.status(200).send(buf);
          }
          const txt = await r.text().catch(() => "");
          errors.push({ model, status: r.status, detail: txt.slice(0, 160) });
        } catch (e) {
          errors.push({ model, status: 0, detail: e.message });
        }
      }
    }
  } else {
    errors.push({ detail: "HF_TOKEN 미설정" });
  }

  // 진단용 (HF 실패 시 원인 확인)
  if (q.debug) return res.status(200).json({ hfToken: !!process.env.HF_TOKEN, errors });

  // 2순위: Pollinations 로 리다이렉트 (브라우저가 자기 IP로 받음)
  res.setHeader("Cache-Control", "no-store");
  return res.redirect(302, pollinationsUrl(prompt, q));
}
