/* ===========================================================
   진로탐험 — Groq 챗봇 진로상담사
   아이의 관심사를 듣고 어울리는 직업을 친근하게 안내
   =========================================================== */
window.Screens = window.Screens || {};
window.Screens.career = (() => {
  const { el, esc, toast } = UI;

  const INTERESTS = ["그림 그리기", "게임", "동물", "우주·과학", "운동", "음악", "요리", "만들기·발명", "책읽기", "컴퓨터"];

  function sysPrompt(user) {
    return `너는 한국 초·중학생을 위한 따뜻하고 신나는 '진로 탐험 도우미'야.
이름은 '탐험봇'. 학생 이름은 ${user.name || "친구"}.
규칙:
- 어떤 경우에도 반드시 한국어로만 답한다. (영어/외국어 단독 사용 금지)
- 항상 쉽고 다정한 우리말. 이모지를 적절히 사용.
- 한 번에 너무 길게 말하지 말고, 3~5문장 정도로.
- 학생의 관심사를 물어보고, 어울리는 직업을 2~3개씩 소개해.
- 각 직업은 '무슨 일을 하는지, 왜 너에게 어울리는지, 지금 해볼 수 있는 작은 활동'을 알려줘.
- 마지막엔 더 궁금한 점을 묻는 질문으로 마무리해서 대화를 이어가.
- 특정 직업을 강요하지 말고 가능성을 넓혀주는 태도.`;
  }

  function render(root) {
    const user = window.App.user();
    const history = [{ role: "system", content: sysPrompt(user) }];

    const log = el("div", { class: "chat-log" });
    const suggest = el("div", { class: "suggest" });
    const input = el("input", { class: "input", placeholder: "관심사나 궁금한 직업을 적어보세요…" });
    const sendBtn = el("button", { class: "btn career", onclick: send }, "보내기");

    input.addEventListener("keydown", e => { if (e.key === "Enter") send(); });

    const view = el("div", { class: "screen" },
      el("div", { class: "panel card chat" },
        log,
        suggest,
        el("div", { class: "chat-input" }, input, sendBtn),
      ),
    );
    root.innerHTML = "";
    root.append(view);

    // 환영 메시지 + 관심사 칩
    addMsg("bot", `안녕 ${user.name || "친구"}! 나는 진로 탐험 도우미 탐험봇이야 🧭✨\n네가 좋아하는 걸 알려주면, 어울리는 멋진 직업들을 같이 찾아볼게!\n아래에서 골라도 되고, 직접 적어줘도 돼.`);
    INTERESTS.forEach(t => suggest.append(
      el("button", { class: "chip", onclick: () => { input.value = t + " 좋아해요"; send(); } }, t)
    ));

    async function send() {
      const text = input.value.trim();
      if (!text) return;
      if (!AI.isConfigured()) return toast("AI가 아직 연결되지 않았어요 (배포 가이드 참고)");
      input.value = "";
      suggest.innerHTML = "";
      addMsg("user", text);
      history.push({ role: "user", content: text });

      const typing = addMsg("bot", "…");
      typing.querySelector(".bubble").classList.add("dots");
      typing.querySelector(".bubble").textContent = "";
      sendBtn.disabled = true;

      try {
        const reply = await AI.chat(history, { temperature: 0.85, max_tokens: 700 });
        history.push({ role: "assistant", content: reply });
        typing.querySelector(".bubble").classList.remove("dots");
        typing.querySelector(".bubble").innerHTML = UI.lightMd(reply);
      } catch (e) {
        typing.querySelector(".bubble").classList.remove("dots");
        typing.querySelector(".bubble").textContent = "앗, 잠깐 문제가 생겼어요. 다시 한 번 보내줄래요? (" + e.message + ")";
      } finally {
        sendBtn.disabled = false;
        log.scrollTop = log.scrollHeight;
        input.focus();
      }
      log.scrollTop = log.scrollHeight;
    }

    function addMsg(who, text) {
      const m = el("div", { class: "msg " + who },
        who === "bot" ? el("div", { class: "mavatar" }, "🧭") : null,
        el("div", { class: "bubble", html: who === "bot" ? UI.lightMd(text) : esc(text) }),
      );
      log.append(m);
      log.scrollTop = log.scrollHeight;
      return m;
    }
  }

  return { render };
})();
