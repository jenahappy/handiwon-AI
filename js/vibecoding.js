/* ===========================================================
   바이브코딩 — 말로 설명하면 Groq가 HTML 앱을 만들어 즉시 미리보기
   =========================================================== */
window.Screens = window.Screens || {};
window.Screens.code = (() => {
  const { el, esc, toast } = UI;

  const IDEAS = [
    "무지개 색이 바뀌는 인사 버튼",
    "구구단 연습 퀴즈 게임",
    "내 강아지 소개 카드 페이지",
    "클릭하면 별이 쏟아지는 화면",
    "간단한 그림판",
    "오늘의 기분 일기장",
  ];

  const SYS = `너는 어린이를 위한 웹앱을 만드는 코딩 도우미야.
사용자의 요청을 듣고 '하나의 완성된 HTML 문서'를 만든다.
규칙(매우 중요):
- 화면에 보이는 모든 글자(제목/버튼/안내문/메시지 등)는 어떤 경우에도 반드시 한국어로 작성.
- 반드시 <!DOCTYPE html> 로 시작하는 완전한 단일 HTML 파일만 출력.
- CSS와 JS는 모두 파일 안에 inline 으로 포함(외부 링크 금지).
- 설명/인사/마크다운 코드펜스 없이 'HTML 코드만' 출력.
- 화면은 알록달록하고 귀엽게, 한국어 UI, 모바일에서도 잘 보이게.
- 글자 크기 적당히 크게, 버튼은 둥글게.`;

  function render(root) {
    const history = [{ role: "system", content: SYS }];
    let currentHtml = "";

    const prompt = el("textarea", { class: "textarea", placeholder: "만들고 싶은 걸 자유롭게 적어보세요.\n예: 버튼을 누르면 폭죽이 터지는 축하 페이지" });
    const ideaRow = el("div", { class: "chips", style: "margin-top:12px" });
    IDEAS.forEach(t => ideaRow.append(el("button", { class: "chip", onclick: () => { prompt.value = t; } }, t)));

    const startPanel = el("div", { class: "panel card" },
      el("h4", {}, "💜 무엇을 만들어 볼까요?"),
      prompt,
      el("div", { style: "display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-top:6px" },
        el("span", { class: "hint" }, "이런 건 어때요?"),
      ),
      ideaRow,
      el("button", { class: "btn code lg block", style: "margin-top:16px", onclick: () => generate(prompt.value) }, "⚡ 만들기"),
    );

    root.innerHTML = "";
    root.append(el("div", { class: "screen" }, startPanel));

    async function generate(text, isRefine = false) {
      text = (text || "").trim();
      if (!text) return toast("무엇을 만들지 적어주세요!");
      if (!AI.isConfigured()) return toast("AI가 아직 연결되지 않았어요 (배포 가이드 참고)");

      root.innerHTML = "";
      root.append(Screens.story._loading(isRefine ? "AI가 코드를 고치고 있어요" : "AI가 앱을 만들고 있어요"));

      if (isRefine) {
        history.push({ role: "user", content: `지금 만든 걸 이렇게 바꿔줘: ${text}\n(전과 같이 완전한 HTML 한 파일만 출력)` });
      } else {
        history.length = 1; // system만 남김
        history.push({ role: "user", content: `이런 웹앱을 만들어줘: ${text}` });
      }

      try {
        const raw = await AI.chat(history, { temperature: 0.6, max_tokens: 4000 });
        const html = extractHtml(raw);
        if (!html) throw new Error("코드를 못 만들었어요");
        history.push({ role: "assistant", content: html });
        currentHtml = html;
        showResult(text);
      } catch (e) {
        root.innerHTML = "";
        root.append(Screens.story._error(e.message, () => generate(text, isRefine)));
      }
    }

    function showResult(lastText) {
      const frame = el("iframe", { class: "preview-frame", sandbox: "allow-scripts allow-modals", title: "미리보기" });
      const codebox = el("pre", { class: "codebox" }, currentHtml);

      const refineInput = el("input", { class: "input", placeholder: "고치고 싶은 점을 적어보세요 (예: 배경을 분홍색으로)" });
      refineInput.addEventListener("keydown", e => { if (e.key === "Enter") generate(refineInput.value, true); });

      const layout = el("div", { class: "screen" },
        el("div", { class: "code-layout" },
          el("div", { class: "preview-wrap" },
            el("div", { class: "preview-bar" },
              el("span", { class: "dot", style: "background:#ff5f57" }),
              el("span", { class: "dot", style: "background:#febc2e" }),
              el("span", { class: "dot", style: "background:#28c840" }),
              el("span", { class: "tt" }, "미리보기"),
            ),
            frame,
          ),
          el("div", { class: "code-side" },
            el("div", { style: "font-weight:700;margin-bottom:8px;font-size:14px" }, "📄 코드"),
            codebox,
            el("div", { class: "code-actions" },
              el("button", { class: "btn code", onclick: () => downloadHtml(currentHtml) }, "💾 HTML 저장"),
              el("button", { class: "btn secondary", onclick: () => { navigator.clipboard.writeText(currentHtml); toast("코드를 복사했어요!"); } }, "📋 복사"),
              el("button", { class: "ghost-btn", onclick: () => render(root) }, "🔄 새로 만들기"),
            ),
          ),
        ),
        el("div", { class: "panel card", style: "margin-top:18px" },
          el("h4", {}, "✏️ 더 고쳐볼까요?"),
          el("div", { class: "chat-input" },
            refineInput,
            el("button", { class: "btn code", onclick: () => generate(refineInput.value, true) }, "고치기"),
          ),
        ),
      );

      root.innerHTML = "";
      root.append(layout);
      frame.srcdoc = currentHtml;
    }
  }

  function extractHtml(raw) {
    let s = (raw || "").trim();
    s = s.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "");
    const i = s.search(/<!DOCTYPE html>|<html[\s>]/i);
    if (i > 0) s = s.slice(i);
    return s.includes("<") ? s : "";
  }

  function downloadHtml(html) {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "내가만든앱.html";
    a.click();
    UI.toast("앱을 저장했어요! 더블클릭하면 열려요.");
  }

  return { render };
})();
