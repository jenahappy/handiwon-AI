/* ===========================================================
   동화제작 — Groq로 이야기 생성 + Pollinations로 삽화 생성
   =========================================================== */
window.Screens = window.Screens || {};
window.Screens.story = (() => {
  const { el, esc, toast } = UI;

  const THEMES = ["우주 모험", "마법 숲", "바닷속 친구들", "공룡 시대", "용감한 기사", "하늘을 나는 꿈", "로봇 친구", "작은 영웅"];
  const MOODS = ["따뜻하고 감동적인", "신나고 모험 가득한", "웃기고 유쾌한", "잔잔하고 포근한"];

  // 그림 자리표시 이미지(SVG) — 로딩/실패 안내
  function svgPlaceholder(emoji, line1, line2, bg) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='768' height='768'>` +
      `<rect width='100%' height='100%' fill='${bg}'/>` +
      `<text x='50%' y='42%' font-size='110' text-anchor='middle'>${emoji}</text>` +
      `<text x='50%' y='56%' font-size='34' fill='#7a7f88' text-anchor='middle' font-family='sans-serif'>${line1}</text>` +
      `<text x='50%' y='63%' font-size='24' fill='#aab' text-anchor='middle' font-family='sans-serif'>${line2}</text></svg>`;
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }
  const LOADING_IMG = svgPlaceholder("🎨", "그림을 그리고 있어요", "잠시만 기다려 주세요…", "#fff0f4");
  const ERROR_IMG = svgPlaceholder("🖼️", "그림을 불러오지 못했어요", "여기를 눌러 다시 시도", "#f3f4f7");

  // 삽화 1장 로딩: 실패하면 자동 재시도(시드 변경) 후, 끝내 실패 시 눌러서 재시도
  function loadImage(imgEl, promptText, seedBase, attempt) {
    attempt = attempt || 0;
    imgEl.onclick = null;
    imgEl.style.cursor = "default";
    imgEl.src = LOADING_IMG;
    const url = AI.imageUrl(promptText, { seed: seedBase + attempt * 1000 });
    const pre = new Image();
    let done = false;
    const finish = (ok) => {
      if (done) return; done = true;
      if (ok) {
        imgEl.src = url;
      } else if (attempt < 3) {
        // Pollinations 익명 제한(15초/IP) 대응: 시간을 두고 재시도
        setTimeout(() => loadImage(imgEl, promptText, seedBase, attempt + 1), 6000 + attempt * 5000);
      } else {
        imgEl.src = ERROR_IMG;
        imgEl.style.cursor = "pointer";
        imgEl.title = "눌러서 다시 시도";
        imgEl.onclick = () => loadImage(imgEl, promptText, seedBase, 0);
      }
    };
    pre.onload = () => finish(true);
    pre.onerror = () => finish(false);
    setTimeout(() => { if (!done && !pre.complete) finish(false); }, 35000); // 타임아웃
    pre.src = url;
  }

  function render(root) {
    const state = { name: "", theme: "", mood: MOODS[0], pages: 5 };

    const form = el("div", { class: "panel card screen" },
      el("h4", {}, "🎨 어떤 동화를 만들어 볼까요?"),
      field("주인공 이름", inputEl("예: 민준, 토끼 콩이, 나의 강아지", v => state.name = v)),
      el("div", { class: "field" },
        el("label", {}, "이야기 주제"),
        chipRow(THEMES, v => { state.theme = v; }),
        inputEl("직접 입력도 가능해요 (예: 무지개를 찾아 떠나는 고양이)", v => state.theme = v, "mt"),
      ),
      el("div", { class: "field" },
        el("label", {}, "분위기"),
        chipRow(MOODS, v => state.mood = v, MOODS[0]),
      ),
      el("div", { class: "field" },
        el("label", {}, "이야기 길이"),
        selectEl([["4", "짧게 (4장)"], ["5", "보통 (5장)"], ["7", "길게 (7장)"]], "5", v => state.pages = +v),
      ),
      el("button", { class: "btn story lg block", onclick: () => make() }, "✨ 동화 만들기"),
      el("p", { class: "hint" }, "이야기는 Groq AI가, 그림은 Pollinations AI가 무료로 만들어요. (그림은 한 장당 몇 초 걸려요)"),
    );

    root.innerHTML = "";
    root.append(form);

    async function make() {
      const theme = state.theme.trim();
      if (!state.name.trim()) return toast("주인공 이름을 알려주세요!");
      if (!theme) return toast("이야기 주제를 골라주세요!");
      if (!AI.isConfigured()) return toast("AI가 아직 연결되지 않았어요 (배포 가이드 참고)");

      root.innerHTML = "";
      root.append(loading("AI가 이야기를 쓰고 있어요"));

      try {
        const n = state.pages;
        const sys = "너는 한국 어린이를 위한 따뜻한 동화작가야. 쉽고 다정한 우리말로 쓴다. 'text' 필드는 어떤 경우에도 반드시 한국어로만 작성하고, 'image' 필드만 영어로 작성한다.";
        const usr =
`다음 조건으로 ${n}장짜리 그림동화를 만들어줘.
- 주인공: ${state.name}
- 주제: ${theme}
- 분위기: ${state.mood}
- 각 장은 2~3문장, 7~10세가 읽기 좋은 쉬운 문장.
- 따뜻한 교훈이 자연스럽게 담기게.

반드시 아래 JSON 형식으로만 답해:
{
 "title": "동화 제목",
 "style": "그림 전체 화풍을 한 영어 문구로 (예: soft watercolor)",
 "pages": [
   {"text": "1장 내용(한국어)", "image": "이 장면을 묘사하는 영어 그림 프롬프트"}
 ]
}
pages 배열은 정확히 ${n}개.`;

        const data = await AI.chatJSON(
          [{ role: "system", content: sys }, { role: "user", content: usr }],
          { max_tokens: 2200, temperature: 0.9 }
        );

        if (!data.pages || !data.pages.length) throw new Error("이야기를 못 만들었어요");
        showBook(data);
      } catch (e) {
        root.innerHTML = "";
        root.append(errorBox(e.message, make));
      }
    }

    function showBook(data) {
      const style = data.style || "soft watercolor children book";
      const seed = Math.floor(Math.random() * 100000); // 일관된 화풍 유지를 위한 시드
      let idx = 0;

      const imgEl = el("img", { class: "book-img", alt: "삽화" });
      const textEl = el("div", { class: "book-text" });
      const dotsEl = el("div", { class: "page-dots" });
      const prevBtn = el("button", { class: "btn secondary", onclick: () => go(idx - 1) }, "◀ 이전");
      const nextBtn = el("button", { class: "btn story", onclick: () => go(idx + 1) }, "다음 ▶");

      const view = el("div", { class: "book screen" },
        el("h3", { class: "book-title" }, "📖 " + (data.title || "나의 동화")),
        el("div", { class: "book-page" }, imgEl, textEl),
        el("div", { class: "book-nav" }, prevBtn, dotsEl, nextBtn),
        el("div", { style: "text-align:center; margin-top:18px; display:flex; gap:10px; justify-content:center;" },
          el("button", { class: "ghost-btn", onclick: () => render(root) }, "🔄 새 동화 만들기"),
          el("button", { class: "ghost-btn", onclick: () => downloadStory(data) }, "💾 텍스트 저장"),
        ),
      );

      data.pages.forEach((_, i) => dotsEl.append(el("div", { class: "page-dot" + (i === 0 ? " active" : "") })));

      function go(i) {
        if (i < 0 || i >= data.pages.length) return;
        idx = i;
        const pg = data.pages[idx];
        loadImage(imgEl, `${pg.image}, ${style}`, seed + idx * 100);

        textEl.innerHTML = `<span style="color:var(--story);font-weight:800">${idx + 1}장</span><br>` + esc(pg.text);
        [...dotsEl.children].forEach((d, k) => d.classList.toggle("active", k === idx));
        prevBtn.style.visibility = idx === 0 ? "hidden" : "visible";
        nextBtn.textContent = idx === data.pages.length - 1 ? "끝 🎉" : "다음 ▶";
      }

      root.innerHTML = "";
      root.append(view);
      go(0);
    }
  }

  function downloadStory(data) {
    let txt = `${data.title}\n\n`;
    data.pages.forEach((p, i) => { txt += `${i + 1}장\n${p.text}\n\n`; });
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (data.title || "내동화") + ".txt";
    a.click();
    UI.toast("동화를 저장했어요!");
  }

  /* ---- 작은 빌더 헬퍼 ---- */
  function field(label, inputNode) {
    return el("div", { class: "field" }, el("label", {}, label), inputNode);
  }
  function inputEl(ph, onInput, cls = "") {
    const i = el("input", { class: "input" + (cls === "mt" ? "" : ""), placeholder: ph });
    if (cls === "mt") i.style.marginTop = "8px";
    i.addEventListener("input", () => onInput(i.value));
    return i;
  }
  function selectEl(opts, def, onChange) {
    const s = el("select", { class: "input" });
    opts.forEach(([v, label]) => s.append(el("option", { value: v }, label)));
    s.value = def;
    s.addEventListener("change", () => onChange(s.value));
    return s;
  }
  function chipRow(items, onPick, def) {
    const row = el("div", { class: "chips" });
    items.forEach(t => {
      const c = el("button", { class: "chip" + (t === def ? " active" : ""), onclick: () => {
        [...row.children].forEach(x => x.classList.remove("active"));
        c.classList.add("active"); onPick(t);
      } }, t);
      row.append(c);
    });
    return row;
  }
  function loading(msg) {
    return el("div", { class: "loading" }, el("div", { class: "spinner" }),
      el("div", { class: "dots" }, msg));
  }
  function errorBox(msg, retry) {
    return el("div", { class: "panel card", style: "text-align:center" },
      el("p", { style: "font-size:38px;margin:0" }, "😢"),
      el("p", {}, "앗, 문제가 생겼어요: " + msg),
      el("button", { class: "btn", onclick: retry }, "다시 시도"));
  }

  return { render, _loading: loading, _error: errorBox };
})();
