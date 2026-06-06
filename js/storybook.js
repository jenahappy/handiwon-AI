/* ===========================================================
   동화제작 — Groq로 이야기(5장) + HF/Pollinations로 삽화
   글자+이미지를 모두 생성한 뒤 한 번에 보여주고, A4 5쪽 PDF로 저장
   =========================================================== */
window.Screens = window.Screens || {};
window.Screens.story = (() => {
  const { el, esc, toast } = UI;

  const THEMES = ["우주 모험", "마법 숲", "바닷속 친구들", "공룡 시대", "용감한 기사", "하늘을 나는 꿈", "로봇 친구", "작은 영웅"];
  const MOODS = ["따뜻하고 감동적인", "신나고 모험 가득한", "웃기고 유쾌한", "잔잔하고 포근한"];
  const PAGES = 5; // 항상 5페이지

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // 실패 시 보여줄 자리표시 이미지
  function svgPlaceholder(emoji, line, bg) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='768' height='768'>` +
      `<rect width='100%' height='100%' fill='${bg}'/>` +
      `<text x='50%' y='46%' font-size='120' text-anchor='middle'>${emoji}</text>` +
      `<text x='50%' y='58%' font-size='30' fill='#9aa1ad' text-anchor='middle' font-family='sans-serif'>${line}</text></svg>`;
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }
  const ERROR_IMG = svgPlaceholder("🖼️", "그림을 못 불러왔어요", "#f3f4f7");

  function blobToDataUrl(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  // 이미지를 dataURL로 받아옴(표시·PDF 공용). 실패 시 재시도 후 null.
  async function fetchImageDataUrl(promptText, seed, attempt = 0) {
    try {
      const url = await AI.resolveImageSrc(promptText, { seed: seed + attempt * 1000 });
      const res = await fetch(url);
      if (!res.ok) throw new Error("status " + res.status);
      const blob = await res.blob();
      if (!blob.type.startsWith("image")) throw new Error("not image");
      return await blobToDataUrl(blob);
    } catch (e) {
      if (attempt < 3) { await sleep(4000 + attempt * 4000); return fetchImageDataUrl(promptText, seed, attempt + 1); }
      return null;
    }
  }

  function render(root) {
    const state = { name: "", theme: "", mood: MOODS[0] };

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
      el("button", { class: "btn story lg block", onclick: () => make() }, "✨ 동화 만들기 (5페이지)"),
      el("p", { class: "hint" }, "글과 그림을 모두 만든 뒤 한 번에 보여드려요. 그림 5장을 그리는 데 시간이 조금 걸려요(보통 30초~1분)."),
    );

    root.innerHTML = "";
    root.append(form);

    async function make() {
      const theme = state.theme.trim();
      if (!state.name.trim()) return toast("주인공 이름을 알려주세요!");
      if (!theme) return toast("이야기 주제를 골라주세요!");
      if (!AI.isConfigured()) return toast("AI가 아직 연결되지 않았어요 (배포 가이드 참고)");

      const loader = loading("AI가 이야기를 쓰고 있어요");
      root.innerHTML = "";
      root.append(loader);

      try {
        // 1) 이야기(5장) 생성
        const sys = "너는 한국 어린이를 위한 따뜻한 동화작가야. 쉽고 다정한 우리말로 쓴다. 'text' 필드는 어떤 경우에도 반드시 한국어로만 작성하고, 'image' 필드만 영어로 작성한다.";
        const usr =
`다음 조건으로 정확히 ${PAGES}장짜리 그림동화를 만들어줘.
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
pages 배열은 정확히 ${PAGES}개.`;

        const data = await AI.chatJSON(
          [{ role: "system", content: sys }, { role: "user", content: usr }],
          { max_tokens: 2200, temperature: 0.9 }
        );
        if (!data.pages || !data.pages.length) throw new Error("이야기를 못 만들었어요");
        data.pages = data.pages.slice(0, PAGES);

        // 2) 삽화 5장 생성 (모두 완료될 때까지 대기, 진행률 표시)
        const style = data.style || "soft watercolor children book";
        const seed = Math.floor(Math.random() * 100000); // 화풍 일관성용
        for (let i = 0; i < data.pages.length; i++) {
          loader._set(`🎨 그림 그리는 중... (${i + 1} / ${data.pages.length})`);
          data.pages[i].imgData = await fetchImageDataUrl(`${data.pages[i].image}, ${style}`, seed + i * 100);
        }

        // 3) 모두 준비되면 한 번에 열기
        showBook(data);
      } catch (e) {
        root.innerHTML = "";
        root.append(errorBox(e.message, make));
      }
    }

    function showBook(data) {
      const all = el("div", { class: "book-all" });
      data.pages.forEach((pg, i) => {
        all.append(
          el("div", { class: "pdf-page" },
            el("div", { class: "pp-head" }, "📖 " + (data.title || "나의 동화")),
            el("div", { class: "pp-num" }, (i + 1) + "장"),
            el("img", { class: "pp-img", src: pg.imgData || ERROR_IMG, alt: "삽화" }),
            el("div", { class: "pp-text" }, pg.text || ""),
          )
        );
      });

      const saveBtn = el("button", { class: "btn story" }, "💾 저장");
      saveBtn.addEventListener("click", () => downloadPDF(data, saveBtn));

      const view = el("div", { class: "screen" },
        el("h3", { class: "book-title" }, "📖 " + (data.title || "나의 동화")),
        all,
        el("div", { style: "text-align:center; margin:22px 0 8px; display:flex; gap:10px; justify-content:center; flex-wrap:wrap;" },
          saveBtn,
          el("button", { class: "ghost-btn", onclick: () => render(root) }, "🔄 새 동화 만들기"),
        ),
      );

      root.innerHTML = "";
      root.append(view);
    }
  }

  // A4 5쪽 PDF로 저장 (화면을 캡처해 한글 깨짐 없이)
  async function downloadPDF(data, btn) {
    if (!window.jspdf || !window.html2canvas) {
      return toast("PDF 도구를 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.");
    }
    const pages = document.querySelectorAll(".pdf-page");
    if (!pages.length) return;

    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = "📄 PDF 만드는 중...";
    try {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      for (let i = 0; i < pages.length; i++) {
        const canvas = await window.html2canvas(pages[i], { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297); // A4 전체에 맞춤
      }
      pdf.save((data.title || "내동화") + ".pdf");
      toast("PDF로 저장했어요! (총 " + pages.length + "쪽)");
    } catch (e) {
      toast("PDF 저장 실패: " + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  }

  /* ---- 작은 빌더 헬퍼 ---- */
  function field(label, inputNode) {
    return el("div", { class: "field" }, el("label", {}, label), inputNode);
  }
  function inputEl(ph, onInput, cls = "") {
    const i = el("input", { class: "input", placeholder: ph });
    if (cls === "mt") i.style.marginTop = "8px";
    i.addEventListener("input", () => onInput(i.value));
    return i;
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
    const txt = el("div", { class: "dots" }, msg);
    const node = el("div", { class: "loading" }, el("div", { class: "spinner" }), txt);
    node._set = (m) => { txt.classList.remove("dots"); txt.textContent = m; };
    return node;
  }
  function errorBox(msg, retry) {
    return el("div", { class: "panel card", style: "text-align:center" },
      el("p", { style: "font-size:38px;margin:0" }, "😢"),
      el("p", {}, "앗, 문제가 생겼어요: " + msg),
      el("button", { class: "btn", onclick: retry }, "다시 시도"));
  }

  return { render, _loading: loading, _error: errorBox };
})();
