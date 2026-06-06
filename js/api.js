/* ===========================================================
   AI API 레이어
   - chat()      : Groq 챗 (Cloudflare Worker 프록시 경유, 키 숨김)
   - chatJSON()  : JSON 형식 응답을 받아 파싱
   - imageUrl()  : Pollinations 무료 이미지 URL (키 불필요)
   =========================================================== */
window.AI = (() => {
  const C = window.CONFIG;

  function endpoint() {
    if (C.PROXY_URL) return C.PROXY_URL.replace(/\/$/, "") + "/chat";
    return null; // 프록시 미설정
  }

  // 공통 채팅 호출
  async function chat(messages, opts = {}) {
    const body = {
      model: opts.model || C.MODEL,
      messages,
      temperature: opts.temperature ?? 0.8,
      max_tokens: opts.max_tokens ?? 1500,
    };
    if (opts.json) body.response_format = { type: "json_object" };

    const url = endpoint();

    // 1) 프록시(권장) 경유
    if (url) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`AI 서버 오류 (${res.status}) ${t.slice(0, 200)}`);
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "";
    }

    // 2) (개발용) 키를 직접 넣은 경우에만 Groq 직접 호출
    if (C.DEV_GROQ_KEY) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + C.DEV_GROQ_KEY },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Groq 오류 " + res.status);
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "";
    }

    throw new Error("CONFIG.PROXY_URL 이 설정되지 않았습니다. (배포 가이드 참고)");
  }

  // JSON 응답 전용 — 모델이 가끔 코드펜스를 붙여도 안전하게 파싱
  async function chatJSON(messages, opts = {}) {
    const raw = await chat(messages, { ...opts, json: true });
    return safeJSON(raw);
  }

  function safeJSON(raw) {
    if (!raw) throw new Error("빈 응답");
    let s = raw.trim();
    // ```json ... ``` 제거
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    try { return JSON.parse(s); } catch (_) {}
    // 본문 중 첫 { ~ 마지막 } 추출 시도
    const a = s.indexOf("{"), b = s.lastIndexOf("}");
    if (a !== -1 && b !== -1) {
      try { return JSON.parse(s.slice(a, b + 1)); } catch (_) {}
    }
    throw new Error("AI 응답을 이해하지 못했어요. 다시 시도해 주세요.");
  }

  function decoratePrompt(prompt) {
    return prompt + ", children's storybook illustration, soft colors, cute, warm, high quality, no text, no letters";
  }

  // Pollinations 이미지 URL 생성 (referrer/token으로 사용량 제한 완화)
  function imageUrl(prompt, opts = {}) {
    const full = decoratePrompt(prompt);
    const w = opts.width || 768, h = opts.height || 768;
    const seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 1e6);
    const params = new URLSearchParams({
      width: String(w), height: String(h), seed: String(seed), nologo: "true", model: C.IMAGE_MODEL,
    });
    if (C.IMAGE_REFERRER) params.set("referrer", C.IMAGE_REFERRER);
    if (C.IMAGE_TOKEN) params.set("token", C.IMAGE_TOKEN);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?${params.toString()}`;
  }

  // 인증 사용자(jena / 01012341234) 판별
  function isGeminiUser() {
    const u = window.App && window.App.user && window.App.user();
    if (!u) return false;
    const name = String(u.name || "").trim().toLowerCase();
    const phone = String(u.phone || "").replace(/[^0-9]/g, "");
    return name === "jena" && phone === "01012341234";
  }

  // Vercel /api/generate-image 호출 → Gemini 이미지(blob URL) 반환
  async function geminiImage(prompt) {
    if (!C.PROXY_URL) throw new Error("PROXY_URL 미설정");
    const u = (window.App && window.App.user && window.App.user()) || {};
    const endpoint = C.PROXY_URL.replace(/\/$/, "") + "/generate-image";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: decoratePrompt(prompt), name: u.name, phone: u.phone }),
    });
    if (!res.ok) throw new Error("Gemini 이미지 오류 " + res.status);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  // 사용자에 따라 이미지 소스를 결정해 반환(Promise<string>)
  //  - 인증 사용자: Gemini(blob URL). 실패하면 Pollinations로 자동 대체.
  //  - 그 외: Pollinations URL.
  async function resolveImageSrc(prompt, opts = {}) {
    if (isGeminiUser()) {
      try { return await geminiImage(prompt); }
      catch (e) { console.warn("Gemini 실패 → Pollinations로 대체:", e.message); }
    }
    return imageUrl(prompt, opts);
  }

  function isConfigured() { return !!(C.PROXY_URL || C.DEV_GROQ_KEY); }

  return { chat, chatJSON, imageUrl, resolveImageSrc, isGeminiUser, isConfigured };
})();
