/* ===========================================================
   메인 앱 — 상태, 라우터, 입장화면, 홈, 상단바, 디원이 챗봇
   =========================================================== */
window.App = (() => {
  const { el, esc, toast } = UI;
  const appRoot = document.getElementById("app");

  let user = loadUser();

  function loadUser() {
    try { return JSON.parse(localStorage.getItem("ai_user") || "null"); } catch { return null; }
  }
  function saveUser(u) { user = u; localStorage.setItem("ai_user", JSON.stringify(u)); }

  /* ---------------- 라우터 ---------------- */
  const ROUTES = {
    "": renderEntry,
    "home": renderHome,
    "story": p => renderFeature(p, "story"),
    "career": p => renderFeature(p, "career"),
    "code": p => renderFeature(p, "code"),
  };

  function go(hash) { location.hash = hash; }

  function route() {
    const key = (location.hash.replace(/^#\/?/, "") || "").split("/")[0];
    // 입장 안 했으면 무조건 입장화면
    if (!user && key !== "") { location.hash = ""; return; }
    const fn = ROUTES[key] || renderHome;
    appRoot.scrollTop = 0;
    window.scrollTo(0, 0);
    fn(appRoot);
    mountChatbot();
  }

  /* ---------------- 입장 화면 ---------------- */
  function renderEntry(root) {
    const school = el("input", { class: "input", placeholder: "예: 행복초등학교", value: user?.school || "" });
    const name = el("input", { class: "input", placeholder: "예: 홍길동", value: user?.name || "" });
    name.addEventListener("keydown", e => { if (e.key === "Enter") enter(); });

    const card = el("div", { class: "entry-card" },
      el("div", { class: "entry-logo" }, "🎨"),
      el("h1", {}, "AI 놀이터"),
      el("p", { class: "sub" }, "로그인 없이 누구나 즐기는 AI 체험"),
      el("div", { class: "field" }, el("label", {}, "학교"), school),
      el("div", { class: "field" }, el("label", {}, "이름"), name),
      el("button", { class: "btn lg block", onclick: enter }, "입장하기 →"),
      el("div", { class: "badges" },
        el("span", { class: "badge" }, "🪄 동화제작"),
        el("span", { class: "badge" }, "🧭 진로탐험"),
        el("span", { class: "badge" }, "💻 바이브코딩"),
      ),
    );
    root.innerHTML = "";
    root.append(el("div", { class: "entry screen" }, card));
    removeChatbot(); // 입장 전엔 챗봇 숨김

    function enter() {
      if (!name.value.trim()) return toast("이름을 입력해 주세요!");
      saveUser({ school: school.value.trim(), name: name.value.trim() });
      go("home");
    }
  }

  /* ---------------- 상단바 ---------------- */
  function topbar() {
    const initial = (user?.name || "?").slice(0, 1);
    return el("div", { class: "topbar" },
      el("div", { class: "wrap topbar-inner" },
        el("div", { class: "brand", onclick: () => go("home") },
          el("span", { class: "logo" }, "🎨"), el("span", {}, "AI 놀이터")),
        el("div", { class: "topbar-spacer" }),
        el("div", { class: "userchip" }, el("span", { class: "avatar" }, initial),
          el("span", {}, (user?.name || "친구")),
          user?.school ? el("span", { style: "color:var(--muted);font-weight:500" }, "· " + user.school) : null),
        el("button", { class: "ghost-btn", onclick: logout }, "나가기"),
      ),
    );

    function logout() {
      localStorage.removeItem("ai_user");
      user = null;
      go("");
    }
  }

  /* ---------------- 홈(허브) ---------------- */
  function renderHome(root) {
    const features = [
      { key: "story", cls: "story", icon: "🪄", title: "동화제작", desc: "주인공과 주제만 정하면 나만의 그림동화가 뚝딱!", go: "동화 만들러 가기" },
      { key: "career", cls: "career", icon: "🧭", title: "진로탐험", desc: "좋아하는 걸 말하면 어울리는 직업을 찾아줘요.", go: "진로 탐험하기" },
      { key: "code", cls: "code", icon: "💻", title: "바이브코딩", desc: "말로 설명하면 진짜 동작하는 앱을 만들어줘요.", go: "코딩 시작하기" },
    ];
    const grid = el("div", { class: "grid3" });
    features.forEach(f => grid.append(
      el("div", { class: "feature " + f.cls, onclick: () => go(f.key) },
        el("div", { class: "blob" }),
        el("div", { class: "ficon" }, f.icon),
        el("h3", {}, f.title),
        el("p", {}, f.desc),
        el("span", { class: "go" }, f.go + " →"),
      )
    ));

    const notice = AI.isConfigured() ? null : el("div", {
      class: "card",
      style: "max-width:1040px;margin:0 auto 4px;padding:14px 18px;border-color:#ffd9a3;background:#fff7ec;color:#8a5a00;font-size:14px;font-weight:600",
    }, "⚙️ AI가 아직 연결되지 않았어요. README의 배포 가이드에 따라 js/config.js의 PROXY_URL을 설정하면 모든 기능이 켜져요.");

    root.innerHTML = "";
    root.append(
      topbar(),
      el("div", { class: "wrap screen" },
        notice,
        el("div", { class: "hero" },
          el("h1", {}, (user?.name || "친구") + "야, ", el("span", { class: "grad" }, "AI와 놀아볼까?")),
          el("p", {}, "원하는 체험을 골라보세요. 로그인도, 설치도 필요 없어요!"),
        ),
        grid,
        el("div", { class: "footer" }, "한국디지털교육원 · AI 놀이터 — 디원이가 도와줄게요 🤖"),
      ),
    );
  }

  /* ---------------- 기능 화면 래퍼 ---------------- */
  const META = {
    story:  { icon: "🪄", soft: "var(--story-soft)", title: "동화제작", sub: "AI와 함께 나만의 그림동화를 만들어요" },
    career: { icon: "🧭", soft: "var(--career-soft)", title: "진로탐험", sub: "디원이의 친구 탐험봇과 진로를 찾아봐요" },
    code:   { icon: "💻", soft: "var(--code-soft)", title: "바이브코딩", sub: "말로 설명하면 앱이 만들어져요" },
  };
  function renderFeature(root, key) {
    const m = META[key];
    root.innerHTML = "";
    root.append(topbar());
    const wrap = el("div", { class: "wrap" },
      el("div", { class: "page-head" },
        el("button", { class: "ghost-btn", onclick: () => go("home"), style: "margin-right:4px" }, "←"),
        el("div", { class: "pico", style: "background:" + m.soft }, m.icon),
        el("div", {}, el("h2", {}, m.title), el("p", {}, m.sub)),
      ),
      el("div", { id: "feature-body" }),
    );
    root.append(wrap);
    Screens[key].render(document.getElementById("feature-body"));
  }

  /* ===========================================================
     디원이 — 한국디지털교육원 캐릭터 도우미 챗봇 (모든 화면 플로팅)
     =========================================================== */
  const DIWON_SYS = `너는 '디원이'야. 한국디지털교육원의 귀엽고 똑똑한 AI 캐릭터 도우미.
이곳은 'AI 놀이터'이고, 동화제작·진로탐험·바이브코딩 세 가지 체험이 있어.
규칙:
- 항상 밝고 다정한 우리말, 이모지를 적당히 사용 😊
- 짧고 친절하게(2~4문장). 초·중학생 눈높이.
- 사용자가 무엇을 할지 모르면 세 가지 체험을 추천해줘.
- 동화제작: 이야기와 그림을 만들어줌 / 진로탐험: 어울리는 직업 찾기 / 바이브코딩: 말로 앱 만들기.
- 어려운 질문에도 쉽게 설명. 모르면 솔직하게.`;

  let chatbotOpen = false;
  let chatbotEl = null, fabEl = null;
  const diwonHistory = [{ role: "system", content: DIWON_SYS }];

  function removeChatbot() {
    fabEl?.remove(); chatbotEl?.remove(); fabEl = chatbotEl = null;
  }

  function mountChatbot() {
    if (!user) return removeChatbot();
    if (fabEl || chatbotEl) return; // 이미 있음

    fabEl = el("button", { class: "fab", title: "디원이에게 물어보기", onclick: toggle },
      "🤖", el("span", { class: "badge-dot" }));

    const log = el("div", { class: "chatbot-body" });
    const input = el("input", { class: "input", placeholder: "디원이에게 물어보세요…" });
    input.addEventListener("keydown", e => { if (e.key === "Enter") send(); });

    chatbotEl = el("div", { class: "chatbot" },
      el("div", { class: "chatbot-head" },
        el("span", { style: "font-size:22px" }, "🤖"),
        el("div", {}, el("div", { class: "ttl" }, "디원이"), el("div", { class: "st" }, "한국디지털교육원 AI 도우미")),
        el("button", { class: "x", onclick: toggle }, "×"),
      ),
      log,
      el("div", { class: "chatbot-foot" },
        el("div", { class: "chat-input" }, input,
          el("button", { class: "btn", style: "padding:11px 16px", onclick: send }, "➤")),
      ),
    );

    document.body.append(fabEl, chatbotEl);

    // 첫 인사 (한 번만)
    if (diwonHistory.length === 1) {
      botMsg(`안녕! 나는 디원이야 🤖 한국디지털교육원에서 왔어!\n동화제작🪄·진로탐험🧭·바이브코딩💻 중에 뭐가 궁금해? 무엇이든 물어봐!`);
    } else {
      // 다시 마운트 시 기존 대화 복원
      diwonHistory.slice(1).forEach(m => addBubble(m.role === "user" ? "user" : "bot", m.content));
    }

    function toggle() {
      chatbotOpen = !chatbotOpen;
      chatbotEl.classList.toggle("open", chatbotOpen);
      fabEl.style.display = chatbotOpen ? "none" : "grid";
      if (chatbotOpen) setTimeout(() => input.focus(), 50);
    }

    function botMsg(text) { diwonHistory.push({ role: "assistant", content: text }); addBubble("bot", text); }

    function addBubble(who, text) {
      const m = el("div", { class: "msg " + who },
        who === "bot" ? el("div", { class: "mavatar", style: "background:linear-gradient(135deg,var(--primary),var(--code));font-size:16px" }, "🤖") : null,
        el("div", { class: "bubble", html: who === "bot" ? UI.lightMd(text) : esc(text) }));
      log.append(m); log.scrollTop = log.scrollHeight;
      return m;
    }

    async function send() {
      const text = input.value.trim();
      if (!text) return;
      if (!AI.isConfigured()) return toast("AI가 아직 연결되지 않았어요 (배포 가이드 참고)");
      input.value = "";
      addBubble("user", text);
      diwonHistory.push({ role: "user", content: text });

      const typing = addBubble("bot", "");
      typing.querySelector(".bubble").classList.add("dots");
      try {
        const reply = await AI.chat(diwonHistory, { temperature: 0.8, max_tokens: 500 });
        diwonHistory.push({ role: "assistant", content: reply });
        typing.querySelector(".bubble").classList.remove("dots");
        typing.querySelector(".bubble").innerHTML = UI.lightMd(reply);
      } catch (e) {
        typing.querySelector(".bubble").classList.remove("dots");
        typing.querySelector(".bubble").textContent = "앗, 잠깐 문제가 생겼어요 😢 다시 물어봐 줄래요?";
      }
      log.scrollTop = log.scrollHeight;
    }

    // 열림 상태 유지
    chatbotEl.classList.toggle("open", chatbotOpen);
    fabEl.style.display = chatbotOpen ? "none" : "grid";
  }

  /* ---------------- 시작 ---------------- */
  window.addEventListener("hashchange", route);
  // app.js는 body 끝에서 로드되므로 DOM이 준비된 상태. 한 번만 호출.
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", route, { once: true });
  } else {
    route();
  }

  return { go, user: () => user };
})();
