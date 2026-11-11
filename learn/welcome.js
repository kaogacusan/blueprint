/* Blueprint Online: the first thing a buyer sees after they sign in, one screen at a time.
   "Hi, Ana." → "Welcome to Blueprint." → three questions, one per screen (what they're working toward, where their
   résumé is, whether they'll take the 15-minute review) → "Great. Setting that up for you…" → their home.
   The answers go to learners.goal / stage / review_plan (migrations 016 and 019) through /api/learn "profile",
   and shape the home page (learn/home.js): the line under their name, Module 2's path, tips on the next module,
   and whether booking the review comes first. Plain rules, no AI.
   Shown once (until learners.onboarded_at is set). "Change" on the home page reopens just the questions. */

export const GOALS = [
  ["internship", "An internship", "This year or next summer"],
  ["job", "My first job", "Graduating soon"],
  ["org", "An org or EB position", "Applying or running for one"],
  ["scholarship", "A scholarship or exchange", "Essays and interviews"],
  ["explore", "Not sure yet", "Figuring out what fits"],
];
export const STAGES = [
  ["none", "I don’t have one yet", "You’ll build your first one in Module 2"],
  ["rough", "I have one. It needs work.", "You’ll rebuild it in Module 2, bullet by bullet"],
  ["applying", "I’m applying right now", "You’ll fix it against a real post in Module 2"],
];
export const REVIEWS = [
  ["yes", "Yes, I want my work reviewed", "Booking a time goes first on your page"],
  ["later", "Maybe later", "You can book a time whenever you’re ready"],
];
export const goalName = (g) => ({ internship: "Internship", job: "First job", org: "Org position", scholarship: "Scholarship or exchange", explore: "Still exploring" })[g] || "";
export const pathName = (s) => (s === "none" ? "First résumé" : s === "rough" || s === "applying" ? "Rebuild" : "");

const $ = (s, el = document) => el.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* "Hi, Ana." in a few ways, so it doesn't feel like a template */
export function hello(first) {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  if (!first) return [`${part}.`, "Hi there."][Math.floor(Math.random() * 2)];
  const ways = [`Hi, ${first}.`, `Hey, ${first}.`, `${part}, ${first}.`, `Kumusta, ${first}?`];
  return ways[Math.floor(Math.random() * ways.length)];
}

/* each word rises in on its own, Apple-style. cls goes on every word (e.g. "grad"). */
const words = (text, esc, start = 0, cls = "") =>
  String(text).split(/\s+/).filter(Boolean)
    .map((w, i) => `<span class="ob-w ${cls}" style="--i:${start + i}">${esc(w)}</span>`).join(" ");

/**
 * Run the welcome. Resolves when the home page should be drawn underneath; the overlay then fades itself away.
 * ctx: { D, esc, icon, call, take, toast }    opts.only: just the questions (from "Change" on the home page)
 */
export function onboarding(ctx, { only = false } = {}) {
  const { esc, icon } = ctx;
  const me = ctx.D.me;
  const until = ctx.D.review?.until || "Dec 5";
  const v = { goal: me.goal || "", stage: me.stage || "", review: me.reviewPlan || "" };

  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.className = "ob";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", only ? "Your answers" : "Welcome to Blueprint");
    root.innerHTML = `
      <div class="ob__bg" aria-hidden="true"><i class="ob__grid"></i><i class="ob__glow ob__glow--a"></i><i class="ob__glow ob__glow--b"></i></div>
      <div class="ob__top">
        <button class="ob__back" type="button" aria-label="Back" hidden>${icon("chev")}</button>
        <ol class="ob__dots" aria-hidden="true" hidden><li></li><li></li><li></li></ol>
        <button class="ob__skip" type="button" hidden>${only ? "Close" : "Skip for now"}</button>
      </div>
      <div class="ob__stage" aria-live="polite"></div>`;
    document.body.append(root);
    document.body.classList.add("ob-open");
    requestAnimationFrame(() => root.classList.add("is-on"));
    const stage = $(".ob__stage", root), back = $(".ob__back", root), dots = $(".ob__dots", root), skip = $(".ob__skip", root);

    let cur = null, busyMove = false;
    async function show(html, { q = 0 } = {}) {
      if (cur) {
        cur.classList.add("is-out");
        await wait(calm() ? 120 : 460);
        cur.remove();
      }
      const el = document.createElement("section");
      el.className = "ob-scene";
      el.innerHTML = html;
      stage.append(el);
      cur = el;
      // the top row: back + 3 dots + skip only on the questions
      back.hidden = !q || (only && q === 1);
      dots.hidden = !q;
      skip.hidden = !q;
      [...dots.children].forEach((d, i) => d.className = i < q - 1 ? "is-done" : i === q - 1 ? "is-on" : "");
      requestAnimationFrame(() => el.classList.add("is-in"));
      return el;
    }

    /* ---------- 1. Hi, Ana. ---------- */
    async function greet() {
      const el = await show(`<h1 class="ob-big">${words(hello(me.first), esc)}</h1>`);
      el.addEventListener("click", () => welcome(), { once: true });
      await wait(calm() ? 900 : 2300);
      if (cur === el) welcome();
    }

    /* ---------- 2. Welcome to Blueprint. ---------- */
    let welcomed = false;
    async function welcome() {
      if (welcomed) return; welcomed = true;
      const el = await show(`
        <img class="ob-mark" src="/assets/blueprint-mark.png" alt="" />
        <h1 class="ob-big">${words("Welcome to", esc)} ${words("Blueprint.", esc, 2, "grad")}</h1>
        <p class="ob-sub ob-late" style="--d:1.15s">Four short modules on what you want to be known for, your résumé, your LinkedIn and how you introduce yourself. Set up around you.</p>
        <div class="ob-late ob-go" style="--d:2s">
          <p class="ob-note">Three quick questions first.</p>
          <button class="ob-btn" type="button" id="obGo">Let’s go ${icon("chev")}</button>
        </div>`);
      $("#obGo", el).onclick = () => ask(1);
      setTimeout(() => $("#obGo", el)?.focus({ preventScroll: true }), calm() ? 50 : 2100);
    }

    /* ---------- 3. the questions, one per screen ---------- */
    const QS = {
      1: { key: "goal", title: "What are you working toward?", sub: "Your tips and examples change with this.", opts: GOALS },
      2: { key: "stage", title: "Where’s your résumé right now?", sub: "Module 2 has two paths. This picks yours.", opts: STAGES },
      3: { key: "review", title: "Will you take your 15-minute résumé review?",
        sub: `It’s one-on-one on Google Meet with Thomas Santos or Kurt Boquiren. They read your worksheets before the call. Calls run until ${esc(until)}.`, opts: REVIEWS },
    };
    let at = 0;
    async function ask(n) {
      at = n;
      const q = QS[n];
      const el = await show(`
        <p class="ob-step">${n} of 3</p>
        <h2 class="ob-q">${words(q.title, esc)}</h2>
        <p class="ob-sub ob-late" style="--d:.45s">${q.sub}</p>
        <div class="ob-opts" role="radiogroup" aria-label="${esc(q.title)}">
          ${q.opts.map(([k, t, d], i) => `<button type="button" role="radio" aria-checked="${v[q.key] === k}" class="ob-opt ${v[q.key] === k ? "is-picked" : ""}" data-k="${k}" style="--d:${0.55 + i * 0.07}s">
            <span class="ob-opt__t"><b>${esc(t)}</b><small>${esc(d)}</small></span><span class="ob-opt__ic">${icon("check")}</span></button>`).join("")}
        </div>`, { q: n });
      el.querySelectorAll(".ob-opt").forEach((b) => b.addEventListener("click", async () => {
        if (busyMove) return; busyMove = true;
        v[q.key] = b.dataset.k;
        el.querySelectorAll(".ob-opt").forEach((x) => { x.classList.toggle("is-picked", x === b); x.setAttribute("aria-checked", x === b); });
        await wait(calm() ? 120 : 520);
        busyMove = false;
        n < 3 ? ask(n + 1) : finish();
      }));
      setTimeout(() => (el.querySelector(".ob-opt.is-picked") || el.querySelector(".ob-opt"))?.focus({ preventScroll: true }), calm() ? 50 : 700);
    }
    back.onclick = () => { if (at > 1) ask(at - 1); };
    skip.onclick = () => (only ? close(false) : finish());

    /* ---------- 4. Great. Setting that up for you… ---------- */
    async function finish() {
      at = 0;
      const ticks = only
        ? ["Your answers", "Your tips and Module 2’s path", "Your home page"]
        : ["Your four modules, in order",
           v.stage ? `Module 2 on the ${pathName(v.stage)} path` : "Module 2’s two paths",
           v.review === "yes" ? "Your résumé review, ready to book" : "Your résumé review, for whenever you’re ready"];
      const el = await show(`
        <div class="ob-load" aria-hidden="true"><svg viewBox="0 0 60 60"><circle class="t" cx="30" cy="30" r="26"/><circle class="f" cx="30" cy="30" r="26"/></svg><span class="ob-load__ok">${icon("check")}</span></div>
        <h2 class="ob-q">${only ? words("Saving that…", esc) : `${words("Great.", esc)} ${words("Setting that up for you…", esc, 1)}`}</h2>
        <ul class="ob-ticks">${ticks.map((t, i) => `<li style="--d:${0.5 + i * 0.6}s">${icon("check")}<span>${esc(t)}</span></li>`).join("")}</ul>`);
      const minTime = wait(calm() ? 900 : only ? 1700 : 2900);
      let ok = true;
      try { ctx.take(await ctx.call("profile", { goal: v.goal, stage: v.stage, review: v.review })); }
      catch { ok = false; }
      await minTime;
      el.classList.add("is-ready");
      await wait(calm() ? 200 : 750);
      close(ok);
    }

    function close(saved) {
      resolve({ saved, answers: { ...v } });
      // the home page is drawn underneath by now; fade the welcome away over it
      setTimeout(() => {
        root.classList.add("is-leaving");
        document.body.classList.remove("ob-open");
        setTimeout(() => root.remove(), calm() ? 150 : 900);
        if (!saved && !only) ctx.toast("Couldn’t save your answers. You can set them again from your page.", true);
      }, 40);
    }

    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && only) close(false);
      if (e.key === "ArrowLeft" && at > 1) ask(at - 1);
    });

    if (only) ask(1);
    else greet();
  });
}
