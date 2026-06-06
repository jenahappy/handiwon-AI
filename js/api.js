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

  // Pollinations 무료 이미지 URL 생성
  function imageUrl(prompt, opts = {}) {
    const p = encodeURIComponent(prompt + ", children's storybook illustration, soft colors, cute, warm, high quality");
    const w = opts.width || 768, h = opts.height || 768;
    const seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 1e6);
    return `https://image.pollinations.ai/prompt/${p}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=${C.IMAGE_MODEL}`;
  }

  function isConfigured() { return !!(C.PROXY_URL || C.DEV_GROQ_KEY); }

  return { chat, chatJSON, imageUrl, isConfigured };
})();
