/* Blueprint Online: the course at /learn. Same look as the main site.
   One product (₱349, bought on the main site), four short modules done in order: each is a video (or the deck until
   the video is up), a short page, and a worksheet on the page (Thomas's questions). Answers save as they type;
   submitting the worksheet opens the next module. The 15-minute résumé review: they pick a time on #/review whenever
   they like (even before they start), and their reviewer reads the worksheets first.
   Routes (hash):  #/  welcome + modules (signed in) or the sign-in page · #/m/2  Module 2 · #/review  the review call
   Sign-in: the button in their "You're in" email (?k=…) signs them straight in; otherwise email → 6-digit code.
   Everything goes through /api/learn. The token stays in this browser. */

const API = "/api/learn";
const BUY = "/?get";
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const app = $("#app");

/* ---------- storage that never breaks the page ---------- */
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const TOKEN = "bp_learn_token";
let token = store.get(TOKEN);
let D = null;   // signed in: me, modules (with their worksheet and answers), review
let C = null;   // the public catalog, for the sign-in page

/* the button in the access email: /learn?k=… */
const qs = new URLSearchParams(location.search);
let linkKey = qs.get("k");
if (qs.toString()) history.replaceState(null, "", location.pathname + location.hash);

/* ---------- icons (stroke, like the site's) ---------- */
const P = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  home: '<path d="M3 10.5 12 3l9 7.5V21H3z"/><path d="M9 21v-6h6v6"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  out: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l-5-5 5-5M5 12h12"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
  form: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  slides: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
};
const icon = (n, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ""}</svg>`;
const arrow = `<span class="btn__arrow" aria-hidden="true">→</span>`;

/* ---------- talking to the server ---------- */
async function call(action, data = {}) {
  let r;
  try { r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, token, ...data }) }); }
  catch { throw Object.assign(new Error("offline"), { code: "offline" }); }
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { signOut(true); throw Object.assign(new Error("signin"), { code: "signin" }); }
  if (!r.ok) throw Object.assign(new Error(j.error || "server"), { code: j.error || "server", data: j });
  return j;
}
function take(snap) {
  if (snap.token) { token = snap.token; store.set(TOKEN, token); }
  if (snap.modules) D = { me: snap.me, modules: snap.modules, review: snap.review, finished: snap.finished };
}
function signOut(quiet) {
  token = null; D = null; store.del(TOKEN);
  if (!quiet) { location.hash = "#/"; route(); }
}
function msg(e) {
  return { offline: "No connection. Check your signal and try again.", invalid: "That email doesn’t look right.", signin: "Please sign in again.",
    order: "Submit the worksheet for the module before this one first.", badlink: "That link doesn’t work anymore. Sign in with your email instead.",
    taken: "Someone just took that time. Pick another one.", locked: "Your call is less than 24 hours away, so it can’t be changed here. Ask us on the site.",
    toolong: "That’s a lot of text. Shorten a few answers and try again." }[e.code]
    || "Something went wrong on our side. Try again, or ask us on the site.";
}
function toast(text, bad = false) {
  const t = document.createElement("div");
  t.className = `toast${bad ? " toast--bad" : ""}`;
  t.innerHTML = `${icon(bad ? "x" : "check")}<span>${text}</span>`;
  $("#toasts").append(t);
  setTimeout(() => t.remove(), 3700);
}
function busy(btn, on, label = "Working") {
  if (!btn) return;
  btn.disabled = on;
  if (on) { btn.dataset.label = btn.innerHTML; btn.innerHTML = `<span class="spin"></span>${label}`; }
  else if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
}

/* ---------- where they are ---------- */
const M = (n) => D.modules.find((m) => m.n === Number(n));
const doneCount = () => D.modules.filter((m) => m.doneAt).length;
const nextUp = () => D.modules.find((m) => m.open && !m.doneAt) || null;
const two = (n) => String(n).padStart(2, "0");
const totalMins = (mods) => mods.reduce((t, m) => t + (m.minutes || 0), 0) || 80;
const when = (iso) => new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
const poster = (n, { small = "", lock = false } = {}) => `<div class="poster poster--${n}"><b>${two(n)}</b>${small ? `<small>${esc(small)}</small>` : ""}${lock ? `<span class="lk">${icon("lock")}</span>` : ""}</div>`;
const ring = (pct, size = 56) => { const r = 24, c = 2 * Math.PI * r; return `<span class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 56 56" aria-hidden="true"><circle class="t" cx="28" cy="28" r="${r}"/><circle class="f" cx="28" cy="28" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct / 100)).toFixed(1)}"/></svg>${size >= 44 ? `<b>${Math.round((pct / 100) * 4)}/4</b>` : ""}</span>`; };
/* a module's state, in words */
const stateTag = (m) => m.doneAt ? `<span class="tag tag--done">${icon("check")}Done</span>`
  : m.open ? `<span class="tag tag--open">${nextUp()?.n === m.n ? "Up next" : "Open"}</span>`
  : `<span class="tag">${icon("lock")}After Module ${m.n - 1}</span>`;

/* ==========================================================================
   Chrome: the top bar, the phone tabs, the account menu
   ========================================================================== */
const where = () => location.hash.replace(/^#\/?/, "").split("/");
const initials = (name) => (name.match(/\b\p{L}/gu) || ["B"]).slice(0, 2).join("").toUpperCase();
function chrome() {
  const nav = $("#barNav"), right = $("#barRight"), tabs = $("#tabbar"), h = where();
  if (!D) {
    nav.innerHTML = "";
    right.innerHTML = `<a class="btn btn--ghost btn--sm" href="${BUY}">Get Blueprint</a><button class="btn btn--primary btn--sm" data-signin>Sign in</button>`;
    tabs.hidden = true; document.body.classList.remove("has-tabs");
    return;
  }
  const cur = h[0] === "m" ? h[1] : nextUp()?.n || 1, n = doneCount();
  const on = (k) => ((k === "home" ? !h[0] : k === "mod" ? h[0] === "m" : h[0] === "review") ? "is-on" : "");
  nav.innerHTML = `<a href="#/" class="${on("home")}">My course</a><a href="#/m/${cur}" class="${on("mod")}">Modules</a><a href="#/review" class="${on("review")}">Review call</a>`;
  right.innerHTML = `<a class="meter" href="#/" title="Modules done">${ring((n / 4) * 100, 28)}<b>${n}/4</b><span>done</span></a>
    <button class="avatar" id="me" aria-label="Your account" aria-haspopup="menu">${esc(initials(D.me.name))}</button>`;
  $("#me").onclick = (e) => { e.stopPropagation(); toggleMenu(); };
  tabs.hidden = false; document.body.classList.add("has-tabs");
  tabs.innerHTML = `<a href="#/" class="${on("home")}">${icon("home")}Home</a><a href="#/m/${cur}" class="${on("mod")}">${icon("list")}Module ${cur}</a><a href="#/review" class="${on("review")}">${icon("cal")}Review</a>`;
}
function toggleMenu() {
  const old = $(".menu");
  if (old) return old.remove();
  const m = document.createElement("div");
  m.className = "menu"; m.setAttribute("role", "menu");
  m.innerHTML = `<p><b>${esc(D.me.name)}</b>${esc(D.me.email)}</p>
    <a href="/" role="menuitem">${icon("globe")}Blueprint site</a>
    <a href="/#ask" role="menuitem">${icon("user")}Ask us something</a>
    <button role="menuitem" id="outBtn">${icon("out")}Sign out</button>`;
  $(".bar__in").append(m);
  $("#outBtn", m).onclick = () => { if (confirm("Sign out of Blueprint on this device?")) signOut(); };
}
document.addEventListener("click", (e) => {
  if (!e.target.closest(".menu") && !e.target.closest("#me")) $(".menu")?.remove();
  if (e.target.closest("[data-signin]")) { e.preventDefault(); openSignIn(); }
});

/* ==========================================================================
   Signed out: what Blueprint is, and sign in
   ========================================================================== */
const FAQ = [
  ["I paid. How do I get in?", "Open the “You’re in” email we sent after we checked your payment, and tap Open Blueprint. On another phone or laptop, sign in here with the same email and we’ll send you a 6-digit code."],
  ["Someone bought it for me.", "Sign in with the email they gave us. The access email went there too."],
  ["I paid but didn’t get the email.", "We send it within 1 hour, 8 AM to 10 PM. Check Spam. Still nothing? Ask us on the site with the email you registered with."],
  ["How does the review work?", "It’s a 15-minute one-on-one review of your résumé and LinkedIn on Google Meet. Pick a time on the course page whenever you like, even before you start. Your reviewer reads your worksheets before the call."],
  ["How long do I have access?", "You keep it. Review calls run until Dec 5."],
];
async function renderLanding() {
  chrome();
  document.title = "Blueprint Online";
  if (!C) { try { C = await call("catalog"); } catch { C = { modules: [] }; } }
  const ms = C.modules;
  app.innerHTML = `
  <section class="hero"><div class="wrap hero__grid">
    <div class="fadeup">
      <p class="kicker">Blueprint Online</p>
      <h1 class="display h1">Welcome to <span class="grad">Blueprint.</span></h1>
      <p class="lede">Blueprint helps you figure out what you want to be known for, then puts it on your résumé, your LinkedIn and the way you introduce yourself.</p>
      <ul class="facts">
        <li>${icon("list")}<span><b>4 modules</b>, in order</span></li>
        <li>${icon("clock")}<span>About <b>${totalMins(ms)} minutes</b> in total</span></li>
        <li>${icon("cal")}<span><b>15-minute review</b> of your résumé and LinkedIn</span></li>
        <li>${icon("phone")}<span>On your own time</span></li>
      </ul>
      ${ms.length ? `<ol class="outline stagger">${ms.map((m) => `<li>${poster(m.n)}<span><b>${esc(m.title)}</b><small>${esc(m.tagline)}</small></span><span class="tag">${m.minutes} min</span></li>`).join("")}</ol>` : ""}
    </div>
    <div class="join fadeup" id="join">
      <h2 class="join__title">Sign in</h2>
      <p class="join__sub">Type the email you registered with (or the one the course was sent to). We’ll email you a 6-digit code. No password.</p>
      <form id="inForm" novalidate>
        <div class="field"><label for="i-email">Email</label><input class="in" id="i-email" type="email" autocomplete="email" inputmode="email" maxlength="200" placeholder="you@email.com" /></div>
        <p class="err" id="iErr" role="alert"></p>
        <button class="btn btn--primary btn--lg btn--block" type="submit" style="margin-top:10px">Send my code ${arrow}</button>
      </form>
      <p class="join__alt">Don’t have Blueprint yet? <a class="link" href="${BUY}">Get it for ₱349</a></p>
    </div>
  </div></section>

  <section class="section section--white" id="faq"><div class="wrap" style="max-width:900px">
    <div class="section__head"><p class="kicker">Getting in</p><h2 class="display h2">Questions, <span class="grad">answered.</span></h2></div>
    <div class="faq">${FAQ.map(([q, a]) => `<details class="qa"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>
  </div></section>

  <footer class="foot"><div class="wrap"><span>Blueprint is an LAS50 student venture at Ateneo de Manila.</span>
    <nav><a href="/">Blueprint site</a><a href="/privacy.html">Privacy</a><a href="/#ask">Ask us</a></nav></div></footer>`;
  $("#inForm").onsubmit = (e) => sendCode(e, $("#i-email").value, $("#iErr"));
}
async function sendCode(e, raw, errEl) {
  e.preventDefault();
  const em = raw.trim().toLowerCase();
  errEl.textContent = "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return (errEl.textContent = "That email doesn’t look right.");
  const btn = e.submitter || $("button[type=submit]", e.target);
  busy(btn, true, "Sending");
  try { await call("code", { email: em }); busy(btn, false); openSignIn(em, "code"); }
  catch (err) { busy(btn, false); errEl.textContent = msg(err); }
}

/* ---------- sheets, and sign in: email → 6-digit code ---------- */
function openSheet(html, cls = "") {
  const sh = $("#sheet");
  sh.innerHTML = `<div class="sheet__box ${cls}" role="dialog" aria-modal="true"><button class="x" aria-label="Close">${icon("x")}</button>${html}</div>`;
  sh.hidden = false; document.body.style.overflow = "hidden";
  $(".x", sh).onclick = closeSheet;
  sh.onclick = (e) => { if (e.target === sh) closeSheet(); };
  return $(".sheet__box", sh);
}
function closeSheet() { const sh = $("#sheet"); sh.hidden = true; sh.innerHTML = ""; document.body.style.overflow = ""; }
addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#sheet").hidden) closeSheet(); });
function openSignIn(email = "", mode = "email") {
  if (mode === "email") {
    const box = openSheet(`<h2 class="sheet__title">Sign in</h2><p class="soft">Type the email you registered with. We’ll send you a 6-digit code.</p>
      <form id="sForm" novalidate style="margin-top:18px"><div class="field"><label for="s-email">Email</label><input class="in" id="s-email" type="email" autocomplete="email" inputmode="email" value="${esc(email)}" placeholder="you@email.com" /></div>
      <p class="err" id="sErr" role="alert"></p><button class="btn btn--primary btn--lg btn--block" type="submit" style="margin-top:6px">Send my code ${arrow}</button></form>
      <p class="fine">Don’t have Blueprint yet? <a class="link" href="${BUY}">Get it for ₱349</a></p>`);
    $("#s-email", box).focus();
    $("#sForm", box).onsubmit = (e) => sendCode(e, $("#s-email", box).value, $("#sErr", box));
    return;
  }
  const box = openSheet(`<h2 class="sheet__title">Check your email</h2>
    <p class="soft">If <b>${esc(email)}</b> has Blueprint, a 6-digit code is on its way. Check Spam too.</p>
    <form id="codeForm" novalidate style="margin-top:18px"><div class="field"><label for="c-code">6-digit code</label><input class="in otp" id="c-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="••••••" /></div>
    <p class="err" id="cErr" role="alert"></p><button class="btn btn--primary btn--lg btn--block" type="submit" style="margin-top:6px">Sign in ${arrow}</button></form>
    <p class="fine">No code after a minute? <button class="link" id="again">Send it again</button> · <button class="link" id="other">Use another email</button></p>
    <p class="fine">No code at all? That email may not have Blueprint yet. <a class="link" href="${BUY}">Get it for ₱349</a>, or use the email you registered with.</p>`);
  const input = $("#c-code", box);
  input.focus();
  input.oninput = () => { input.value = input.value.replace(/\D/g, "").slice(0, 6); if (input.value.length === 6) $("#codeForm", box).requestSubmit(); };
  $("#again", box).onclick = async () => { try { await call("code", { email }); toast("Code sent again"); } catch (err) { $("#cErr", box).textContent = msg(err); } };
  $("#other", box).onclick = () => openSignIn("", "email");
  $("#codeForm", box).onsubmit = async (e) => {
    e.preventDefault();
    const btn = $("button[type=submit]", box);
    if (input.value.length !== 6) return ($("#cErr", box).textContent = "The code has 6 digits.");
    busy(btn, true, "Signing in");
    try { take(await call("verify", { email, code: input.value })); closeSheet(); toast(`Welcome, ${esc(D.me.first)}`); location.hash = "#/"; route(); }
    catch (err) {
      busy(btn, false); input.value = ""; input.focus();
      $("#cErr", box).textContent = err.code === "wrong" ? `That code isn’t right.${err.data?.left ? ` ${err.data.left} tries left.` : " Ask for a new one."}`
        : err.code === "expired" ? "That code expired or was used. Tap “Send it again”." : msg(err);
    }
  };
}

/* ==========================================================================
   Signed in: welcome + the four modules
   ========================================================================== */
const TZ = "Asia/Manila";
const callDay = (iso) => new Date(iso).toLocaleDateString("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" });
const callDayLong = (iso) => new Date(iso).toLocaleDateString("en-US", { timeZone: TZ, weekday: "long", month: "long", day: "numeric" });
const callTime = (iso) => new Date(iso).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const callWhen = (iso) => `${callDay(iso)}, ${callTime(iso)}`;
const firstName = (n = "") => n.trim().split(/\s+/)[0];
function reviewCard() {
  const r = D.review, mine = r?.mine;
  return mine
    ? `<a class="card card--pad mini" href="#/review" style="text-decoration:none"><span class="mini__ic">${icon("cal")}</span><div><h3 class="h3" style="font-size:1.15rem">Your review call</h3><p><b>${esc(callWhen(mine.startsAt))}</b> with ${esc(mine.reviewer)}. ${doneCount() < 4 ? `Finish your worksheets before then: ${4 - doneCount()} to go.` : "Your worksheets are in."}</p></div></a>`
    : `<a class="card card--pad mini" href="#/review" style="text-decoration:none"><span class="mini__ic">${icon("cal")}</span><div><h3 class="h3" style="font-size:1.15rem">Book your review call</h3><p>15 minutes on your résumé and LinkedIn. Pick a time now, even before you start: it gives you a date to finish by.</p></div></a>`;
}
function renderHome() {
  chrome();
  document.title = "My course · Blueprint Online";
  const me = D.me, nx = nextUp(), n = doneCount(), mine = D.review?.mine;
  if (!me.paid) return renderNotYet();
  let top;
  if (nx) {
    top = `<a class="card resume fadeup" href="#/m/${nx.n}">
      ${poster(nx.n, { small: `Module ${nx.n}` })}
      <div class="resume__t"><p class="kicker" style="margin:0">${n ? "Up next" : "Start here"}</p>
        <h2 class="h3">Module ${nx.n}: ${esc(nx.title)}</h2>
        <p class="soft">${esc(nx.leaveWith)}</p>
        <div class="resume__row"><span class="soft small">${icon("clock")} About ${nx.minutes} min</span><span class="btn btn--primary">${n ? "Continue" : "Start Module 1"} ${arrow}</span></div></div></a>`;
  } else {
    top = `<a class="card resume fadeup" href="#/review">${poster(4, { small: "All four done" })}
      <div class="resume__t"><p class="kicker" style="margin:0">You finished Blueprint</p>
      <h2 class="h3">${mine ? `Your review call: ${esc(callWhen(mine.startsAt))}` : "Book your review call"}</h2>
      <p class="soft">15 minutes on Google Meet. Your reviewer reads your four worksheets before the call.</p>
      <div class="resume__row"><span class="btn btn--primary">${mine ? "See the details" : "Pick a time"} ${arrow}</span></div></div></a>`;
  }
  const card = (m) => `<a class="card scard ${m.open ? "" : "scard--locked"}" href="#/m/${m.n}">
      ${poster(m.n, { small: m.tagline, lock: !m.open })}
      <div class="scard__t"><b>${esc(m.title)}</b><span>${esc(m.leaveWith)}</span></div>
      <div class="scard__f"><span>${icon("clock")} ${m.minutes} min</span>${stateTag(m)}</div></a>`;
  app.innerHTML = `<div class="wrap dash">
    <div class="hello fadeup"><h1 class="display">Welcome to Blueprint, ${esc(me.first)}.</h1></div>
    <div class="dash__grid">
      <div>
        ${top}
        <div class="blockhead"><h2>Your modules</h2><span>${n} of 4 done · about ${totalMins(D.modules)} min in total</span></div>
        <div class="sgrid stagger">${D.modules.map(card).join("")}</div>
      </div>
      <aside class="side-stack">
        ${reviewCard()}
        <div class="card card--pad fadeup"><p class="kicker">How it works</p>
          <p class="soft" style="margin:8px 0 0">Four modules, about ${totalMins(D.modules)} minutes in total. Do them in order, on your own time.</p>
          <p class="soft" style="margin:10px 0 0">Each one ends with a worksheet right on the page. Your answers save as you type, and they’re your output. Submit the worksheet and the next module opens.</p></div>
        <div class="card card--pad"><p class="kicker">${icon("award")}Certificate</p><p class="soft" style="margin:8px 0 0">Submit all four worksheets and we’ll email you a Blueprint certificate.</p></div>
      </aside>
    </div></div>`;
}
/* signed in, but this email hasn't got Blueprint (yet) */
function renderNotYet() {
  app.innerHTML = `<div class="wrap dash"><div class="card card--pad fadeup" style="max-width:640px;margin:20px auto">
    <p class="kicker">Blueprint Online</p><h1 class="display" style="font-size:clamp(1.8rem,4vw,2.4rem)">Hi ${esc(D.me.first)}. This email doesn’t have Blueprint yet.</h1>
    <p class="soft" style="margin:12px 0 18px">Paid already? We send your access within 1 hour, 8 AM to 10 PM, to the email you registered with. If someone bought it for you, sign in with the email they gave us.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn--primary" href="${BUY}">Get Blueprint (₱349) ${arrow}</a><button class="btn btn--ghost" id="other">Use another email</button></div></div></div>`;
  $("#other").onclick = () => { signOut(true); route().then(() => openSignIn()); };
}

/* ==========================================================================
   A module: the video (or the deck), the page, then the worksheet
   ========================================================================== */
function videoEmbed(url) {
  if (!url) return null;
  let m;
  if ((m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/))) return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1&playsinline=1`;
  if ((m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/))) return `https://drive.google.com/file/d/${m[1]}/preview`;
  if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/))) return `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ""}`;
  return null;
}
function moduleList(here) {
  const mine = D.review?.mine;
  return `<ul class="ls">${D.modules.map((m) => `<li><a href="#/m/${m.n}" class="${m.doneAt ? "is-done" : ""} ${here === m.n ? "is-here" : ""}"><span class="st">${m.doneAt ? icon("check") : m.open ? "" : icon("lock")}</span><span>${m.n}. ${esc(m.title)} <small class="soft">· ${m.minutes} min</small></span></a></li>`).join("")}
    <li><a href="#/review" class="${mine ? "is-done" : ""} ${here === "review" ? "is-here" : ""}"><span class="st">${mine ? icon("check") : ""}</span><span>Your review call${mine ? ` <small class="soft">· ${esc(callDay(mine.startsAt))}</small>` : ""}</span></a></li></ul>`;
}
function sidePanel(here) {
  const n = doneCount();
  return `<aside class="card side">
    <div class="side__head"><p class="kicker">Blueprint Online</p><b>Your modules</b><span class="bar-p"><i style="width:${(n / 4) * 100}%"></i></span><small>${n} of 4 done · do them in order</small></div>
    <div class="side__body">${moduleList(here)}</div>
  </aside>`;
}

/* ---------- the worksheet ---------- */
const WKEY = (n) => `bp_ws_${D.me.email}_${n}`; // a copy in this browser, in case the connection drops
const lines = (s) => esc(s).replace(/\n/g, "<br>");
const nWords = (s) => (String(s || "").trim().match(/\S+/g) || []).length;
function fromBox(q) {
  const m = M(q.from.m);
  const vals = (q.from.ids || []).map((id) => String(m?.answers?.[id] || "").trim()).filter(Boolean);
  if (!vals.length) return "";
  return `<div class="callout callout--you ws-from"><span class="callout__ic">${icon("doc")}</span><div><b>${esc(q.from.label)}</b><p>${vals.map(lines).join("<br>")}</p>
    ${q.from.paste ? `<button class="link" type="button" data-paste="${esc(q.id)}" style="margin-top:6px">Paste it in</button>` : ""}</div></div>`;
}
function fieldHTML(q, a) {
  const id = `w-${q.id}`, v = a[q.id];
  const opt = q.opt ? `<span class="opt">Optional</span>` : "";
  const help = q.help ? `<p class="hint">${lines(q.help)}</p>` : "";
  const ex = q.ex ? `<details class="ex"><summary>${icon("doc")}Example${icon("down", "chev")}</summary><p>${esc(q.ex)}</p></details>` : "";
  const from = q.from ? fromBox(q) : "";
  const head = (forId) => `<${forId ? `label class="lab" for="${forId}"` : `p class="lab"`}>${esc(q.label)}${opt}</${forId ? "label" : "p"}>${help}${ex}${from}`;
  let body = "";
  if (q.t === "long") {
    body = `<textarea class="ta" id="${id}" data-q="${esc(q.id)}" rows="${q.rows || 4}" maxlength="5000" placeholder="${esc(q.ph || "")}">${esc(v || "")}</textarea>${q.words ? `<p class="ws-count" data-count="${esc(q.id)}"></p>` : ""}`;
    return `<div class="field ws-q" data-field="${esc(q.id)}">${head(id)}${body}</div>`;
  }
  if (q.t === "short" || q.t === "url") {
    body = `<input class="in" id="${id}" data-q="${esc(q.id)}" type="${q.t === "url" ? "url" : "text"}" ${q.t === "url" ? 'inputmode="url" autocapitalize="off"' : ""} maxlength="600" value="${esc(v || "")}" placeholder="${esc(q.ph || "")}" />`;
    return `<div class="field ws-q" data-field="${esc(q.id)}">${head(id)}${body}</div>`;
  }
  if (q.t === "choice") {
    const cards = q.options.some((o) => o.d);
    body = `<div class="${cards ? "cards ws-cards" : "chips"}" role="radiogroup">${q.options.map((o) => `<label><input type="radio" name="${id}" data-q="${esc(q.id)}" value="${esc(o.v)}" ${v === o.v ? "checked" : ""} />
      <span>${cards ? `<b>${esc(o.v)}</b><small>${esc(o.d || "")}</small>` : esc(o.v)}</span></label>`).join("")}</div>
      ${q.more ? `<input class="in ws-more" data-more="${esc(q.id)}" data-for="${esc(q.more.v)}" maxlength="200" value="${esc(a[`${q.id}_more`] || "")}" placeholder="${esc(q.more.ph)}" ${v === q.more.v ? "" : "hidden"} />` : ""}`;
    return `<div class="field ws-q" data-field="${esc(q.id)}">${head("")}${body}</div>`;
  }
  if (q.t === "checks") {
    const on = Array.isArray(v) ? v : [];
    body = `<div class="chips">${q.options.map((o) => `<label><input type="checkbox" data-q="${esc(q.id)}" value="${esc(o)}" ${on.includes(o) ? "checked" : ""} /><span>${esc(o)}</span></label>`).join("")}</div>`;
    return `<div class="field ws-q" data-field="${esc(q.id)}">${head("")}${body}</div>`;
  }
  if (q.t === "grid") {
    const g = v && typeof v === "object" ? v : {};
    body = `<div class="ws-grid">${q.rows.map((r) => `<div class="ws-grid__row"><b>${esc(r)}</b><div class="chips">${q.cols.map((c) => `<label><input type="checkbox" data-q="${esc(q.id)}" data-row="${esc(r)}" value="${esc(c)}" ${(g[r] || []).includes(c) ? "checked" : ""} /><span>${esc(c)}</span></label>`).join("")}</div></div>`).join("")}</div>`;
    return `<div class="field ws-q" data-field="${esc(q.id)}">${head("")}${body}</div>`;
  }
  if (q.t === "tick") {
    return `<div class="field ws-q" data-field="${esc(q.id)}"><label class="consent ws-tick"><input type="checkbox" data-q="${esc(q.id)}" ${v === true ? "checked" : ""} /><span>${esc(q.label)}</span></label></div>`;
  }
  return "";
}
function worksheetHTML(m, a) {
  let qn = 0;
  return (m.worksheet || []).map((q) => {
    if (q.t === "sec") return `<div class="ws-sec"><h3>${esc(q.title)}</h3>${q.text ? `<p>${esc(q.text)}</p>` : ""}</div>`;
    qn++;
    return fieldHTML(q, a);
  }).join("");
}
/* what's on the page right now, in the same shape the server keeps */
function collect(root, items) {
  const out = {};
  for (const q of items || []) {
    if (!q.id) continue;
    const els = $$(`[data-q="${CSS.escape(q.id)}"]`, root);
    if (q.t === "long" || q.t === "short" || q.t === "url") out[q.id] = els[0]?.value ?? "";
    else if (q.t === "choice") {
      out[q.id] = els.find((e) => e.checked)?.value || "";
      if (q.more) out[`${q.id}_more`] = $(`[data-more="${CSS.escape(q.id)}"]`, root)?.value || "";
    } else if (q.t === "checks") out[q.id] = els.filter((e) => e.checked).map((e) => e.value);
    else if (q.t === "grid") out[q.id] = Object.fromEntries(q.rows.map((r) => [r, els.filter((e) => e.dataset.row === r && e.checked).map((e) => e.value)]));
    else if (q.t === "tick") out[q.id] = !!els[0]?.checked;
  }
  return out;
}
const TEXTY = ["long", "short", "url", "choice"];
const missingIds = (items, a) => (items || []).filter((q) => q.id && TEXTY.includes(q.t) && !q.opt && !String(a[q.id] || "").trim()).map((q) => q.id);

let saver = null; // the open worksheet's autosave, so leaving the page can flush it
function flushSave() { saver?.flush(); }

function renderModule(n) {
  const m = M(n);
  if (!m || !D.me.paid) { location.hash = "#/"; return; }
  chrome();
  document.title = `Module ${m.n}: ${m.title} · Blueprint Online`;
  const crumbs = `<nav class="crumbs"><a href="#/">My course</a>${icon("chev")}<span>Module ${m.n}: ${esc(m.title)}</span></nav>`;
  const mbar = `<div class="mbar"><button class="btn btn--ghost btn--sm" id="mList">${icon("list")}Modules ${doneCount()}/4</button></div>`;
  if (!m.open) {
    const prev = M(m.n - 1);
    app.innerHTML = `<div class="wrap player"><section>${crumbs}${mbar}
      <div class="fadeup"><div class="lesson__head"><p class="kicker">Module ${m.n} · about ${m.minutes} min</p><h1 class="display">${esc(m.title)}</h1><p>${esc(m.leaveWith)}</p></div>
      <div class="m-locked card card--pad">${icon("lock")}<div><b>Finish Module ${prev.n} first</b><p class="soft">Blueprint works in order: each module builds on your answers from the one before. Submit the Module ${prev.n} worksheet and this one opens.</p>
        <a class="btn btn--primary" href="#/m/${prev.n}" style="margin-top:12px">Go to Module ${prev.n}: ${esc(prev.title)} ${arrow}</a></div></div></div>
    </section>${sidePanel(m.n)}</div>`;
    return wireList(m.n);
  }
  const src = videoEmbed(m.video);
  const media = src
    ? `<div class="video"><iframe src="${esc(src)}" title="Module ${m.n} video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>`
    : m.slides
    ? `<div class="video poster poster--${m.n}"><span class="poster__t">Module ${m.n} · ${esc(m.title)}</span><b>${two(m.n)}</b>
        <a class="soon" href="${esc(m.slides)}" target="_blank" rel="noopener">${icon("slides")}Open the slides</a></div>
       <p class="fine" style="margin-top:10px">The video for this module goes up soon. Until then, go through the slides and read the page below.</p>`
    : `<div class="video poster poster--${m.n}"><span class="poster__t">Module ${m.n} · ${esc(m.title)}</span><b>${two(m.n)}</b><span class="soon">${icon("video")}Video going up soon</span></div>`;
  const next = M(m.n + 1);
  // their answers: the server's copy, unless this browser has a newer one that didn't reach us
  const local = store.get(WKEY(m.n));
  let answers = m.answers || {};
  const localNewer = local && local.answers && (!m.savedAt || local.at > Date.parse(m.savedAt) + 1000);
  if (localNewer) answers = { ...answers, ...local.answers };
  const items = m.worksheet || [];
  const doneBox = m.doneAt ? `<div class="m-done card card--pad" id="mDone"><span class="m-done__ic">${icon("check")}</span><div>
      <b>${justSubmitted === m.n ? "Worksheet submitted." : `You submitted this worksheet on ${esc(when(m.doneAt))}.`}</b>
      <p class="soft">${justSubmitted === m.n && m.confirm ? esc(m.confirm) : "You can still change your answers below. They save as you type."}</p>
      <div class="m-done__row">${next ? `<a class="btn btn--primary" href="#/m/${next.n}">Next: Module ${next.n}, ${esc(next.title)} ${arrow}</a>` : `<a class="btn btn--primary" href="#/review">${D.review?.mine ? "Your review call" : "Book your review call"} ${arrow}</a>`}</div></div></div>` : "";
  app.innerHTML = `<div class="wrap player">
    <section>${crumbs}${mbar}<div class="fadeup">
      <div class="lesson__head"><p class="kicker">Module ${m.n} of 4 · about ${m.minutes} min</p><h1 class="display">${esc(m.title)}</h1><p>${esc(m.tagline)}</p></div>
      ${media}
      <div class="m-page">
        ${m.text ? `<p class="m-text">${esc(m.text)}</p>` : ""}
        <div class="m-leave"><p class="kicker">You leave with</p><p>${esc(m.leaveWith)}</p></div>
        ${m.n === 2 ? `<div class="callout"><span class="callout__ic">${icon("doc")}</span><div><b>Two paths</b><p><b>First résumé</b> if you don’t have one yet: you build your first three bullets from your orgs, school projects, volunteering and part-time work. <b>Rebuild</b> if you want yours better.${M(1)?.answers?.path ? ` In Module 1 you picked <b>${esc(M(1).answers.path)}</b>.` : ""}</p></div></div>` : ""}
        ${doneBox}
        ${items.length ? `<form class="card ws" id="ws" novalidate>
          <div class="ws-head"><p class="kicker">${icon("pen")}Module ${m.n} worksheet</p>
            <h2 class="h3">Your answers are your output.</h2>
            <p class="soft">Work through it with the video. Your answers save as you type, so you can stop and come back. Your reviewer reads them before your review call.</p></div>
          ${worksheetHTML(m, answers)}
          <div class="lnav ws-bar"><span class="saved" id="saved" aria-live="polite"><i></i><span>${m.savedAt ? `Saved ${esc(when(m.savedAt))}` : "Saves as you type"}</span></span>
            <button class="btn btn--primary" type="submit" id="submitBtn">${m.doneAt ? `${icon("check")}Save changes` : `Submit Module ${m.n} ${arrow}`}</button></div>
          <p class="err" id="wsErr" role="alert"></p>
        </form>` : `<div class="note">The Module ${m.n} worksheet goes up soon. Check back later today.</div>`}
        ${m.credits ? `<p class="m-credits"><b>Credits:</b> ${esc(m.credits)}</p>` : ""}
      </div>
    </div></section>
    ${sidePanel(m.n)}
  </div>`;
  wireList(m.n);
  if (justSubmitted === m.n) { justSubmitted = 0; requestAnimationFrame(() => $("#mDone")?.scrollIntoView({ block: "center", behavior: "smooth" })); }
  if (items.length) wireWorksheet(m, items, localNewer);
}
let justSubmitted = 0;

function wireWorksheet(m, items, unsaved) {
  const form = $("#ws"), saved = $("#saved"), label = $("span", saved);
  let timer = 0, dirty = false, inflight = null;
  const setSaved = (state, text) => { saved.className = `saved ${state}`; label.textContent = text; };
  const words = () => $$("[data-count]", form).forEach((el) => {
    const q = items.find((x) => x.id === el.dataset.count), n = nWords($(`[data-q="${CSS.escape(q.id)}"]`, form).value);
    el.textContent = `${n} word${n === 1 ? "" : "s"}${q.words ? ` · under ${q.words}` : ""}`;
    el.classList.toggle("is-over", !!q.words && n > q.words);
  });
  const save = async () => {
    clearTimeout(timer);
    if (!dirty) return;
    dirty = false;
    const answers = collect(form, items);
    store.set(WKEY(m.n), { answers, at: Date.now() });
    setSaved("is-busy", "Saving…");
    inflight = call("save", { module: m.n, answers })
      .then((r) => { m.answers = answers; m.savedAt = r.savedAt; store.del(WKEY(m.n)); if (!dirty) setSaved("", "Saved"); })
      .catch((e) => { dirty = true; setSaved("is-bad", e.code === "offline" ? "Not saved yet: no connection" : "Not saved yet"); })
      .finally(() => { inflight = null; });
    return inflight;
  };
  const touch = () => { dirty = true; setSaved("is-busy", "Editing…"); clearTimeout(timer); timer = setTimeout(save, 1200); };
  saver = {
    flush() {
      if (!dirty) return;
      const answers = collect(form, items);
      store.set(WKEY(m.n), { answers, at: Date.now() });
      m.answers = answers;
      try { navigator.sendBeacon(API, new Blob([JSON.stringify({ action: "save", token, module: m.n, answers })], { type: "application/json" })); } catch {}
      dirty = false; clearTimeout(timer);
    },
  };
  form.addEventListener("input", (e) => {
    if (e.target.dataset.count !== undefined || e.target.matches("textarea")) words();
    e.target.closest(".ws-q")?.classList.remove("is-missing");
    touch();
  });
  form.addEventListener("change", (e) => {
    const t = e.target;
    if (t.type === "radio") {
      const more = $(`[data-more="${CSS.escape(t.dataset.q)}"]`, form);
      if (more) { more.hidden = t.value !== more.dataset.for; if (!more.hidden) more.focus(); }
      t.closest(".ws-q")?.classList.remove("is-missing");
    }
    touch();
  });
  form.addEventListener("click", (e) => {
    const b = e.target.closest("[data-paste]");
    if (!b) return;
    const q = items.find((x) => x.id === b.dataset.paste), ta = $(`[data-q="${CSS.escape(q.id)}"]`, form);
    const text = (q.from.ids || []).map((id) => String(M(q.from.m)?.answers?.[id] || "").trim()).filter(Boolean).join(" ");
    ta.value = ta.value.trim() ? `${ta.value.trim()}\n${text}` : text;
    ta.focus(); touch();
  });
  words();
  if (unsaved) { dirty = true; save(); }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#submitBtn"), err = $("#wsErr");
    err.textContent = "";
    const answers = collect(form, items);
    const left = missingIds(items, answers);
    $$(".ws-q.is-missing", form).forEach((x) => x.classList.remove("is-missing"));
    if (left.length) {
      left.forEach((id) => $(`[data-field="${CSS.escape(id)}"]`, form)?.classList.add("is-missing"));
      const firstEl = $(`[data-field="${CSS.escape(left[0])}"]`, form);
      firstEl?.scrollIntoView({ block: "center", behavior: "smooth" });
      $("textarea, input", firstEl)?.focus({ preventScroll: true });
      err.textContent = `${left.length} answer${left.length === 1 ? " is" : "s are"} still empty. They’re marked in red. Your answers so far are saved.`;
      touch();
      return;
    }
    clearTimeout(timer); dirty = false;
    if (inflight) await inflight.catch(() => {});
    busy(btn, true, "Saving");
    const first = !m.doneAt;
    try {
      take(await call("submit", { module: m.n, answers }));
      store.del(WKEY(m.n));
      saver = null;
      if (first) { justSubmitted = m.n; toast(M(m.n + 1) ? `Module ${m.n} submitted. Module ${m.n + 1} is open.` : "All four submitted. That’s Blueprint."); route(); }
      else { busy(btn, false); setSaved("", "Saved"); toast("Changes saved"); }
    } catch (ex) {
      busy(btn, false);
      if (ex.code === "missing") {
        (ex.data?.ids || []).forEach((id) => $(`[data-field="${CSS.escape(id)}"]`, form)?.classList.add("is-missing"));
        err.textContent = "A few answers are still empty. They’re marked in red.";
      } else err.textContent = msg(ex);
    }
  });
}
function wireList(here) {
  $("#mList")?.addEventListener("click", () => { const box = openSheet(`<p class="kicker">Blueprint Online</p><h2 class="sheet__title">Your modules</h2><div style="margin-top:12px">${moduleList(here)}</div>`); $$("a", box).forEach((a) => a.addEventListener("click", closeSheet)); });
}
addEventListener("pagehide", flushSave);
addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushSave(); });

/* ==========================================================================
   The 15-minute résumé review: book a time, any time after they get in
   ========================================================================== */
function gcal(s) {
  const st = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = Date.parse(s.startsAt), end = start + (s.minutes || 15) * 60e3;
  const q = new URLSearchParams({ action: "TEMPLATE", text: "Blueprint résumé review", dates: `${st(start)}/${st(end)}`,
    details: `Your 15-minute résumé review with ${s.reviewer}.${s.meet ? ` Join: ${s.meet}` : ""}`, location: s.meet || "Google Meet" });
  return `https://calendar.google.com/calendar/render?${q}`;
}
let picking = false; // "Pick another time" open
function renderReview() {
  if (!D.me.paid) { location.hash = "#/"; return; }
  chrome();
  document.title = "Your review call · Blueprint Online";
  const r = D.review || { mine: null, open: [], until: "Dec 5" }, mine = r.mine, n = doneCount(), nx = nextUp();
  const crumbs = `<nav class="crumbs"><a href="#/">My course</a>${icon("chev")}<span>Your review call</span></nav>`;
  const progress = n === 4
    ? `<p class="soft">All four worksheets are in. Your reviewer reads them before the call.</p>`
    : `<p class="soft"><b>${n} of 4 worksheets</b> submitted. Finish them before your call: your reviewer reads them first, so the 15 minutes go to your résumé, not to catching up.</p>
       ${nx ? `<a class="btn btn--ghost btn--sm" href="#/m/${nx.n}" style="margin-top:10px">Continue: Module ${nx.n}, ${esc(nx.title)} ${arrow}</a>` : ""}`;
  const mineBox = mine ? `<div class="card card--pad rv-mine fadeup">
      <p class="kicker">${icon("cal")}Booked</p>
      <h2 class="display rv-when">${esc(callDayLong(mine.startsAt))}<span>${esc(callTime(mine.startsAt))} · 15 minutes, Manila time</span></h2>
      <p class="rv-who">With <b>${esc(mine.reviewer)}</b>, on Google Meet.</p>
      <div class="rv-acts">
        ${mine.meet ? `<a class="btn btn--primary" href="${esc(mine.meet)}" target="_blank" rel="noopener">${icon("video")}Google Meet link</a>` : `<span class="soft small">We’ll email the Google Meet link before the call.</span>`}
        <a class="btn btn--ghost" href="${esc(gcal(mine))}" target="_blank" rel="noopener">${icon("cal")}Add to Google Calendar</a>
      </div>
      <div class="rv-prog">${progress}</div>
      ${mine.canChange
        ? `<p class="fine rv-change">Need another time? <button class="link" id="rvPick">${picking ? "Keep this time" : "Pick another time"}</button> · <button class="link" id="rvCancel">Cancel my call</button></p>`
        : `<p class="fine rv-change">Your call is less than 24 hours away, so it can’t be changed here. Something came up? <a class="link" href="/#ask">Ask us</a>.</p>`}
    </div>` : "";
  const days = new Map();
  for (const s of r.open) { const k = callDayLong(s.startsAt); if (!days.has(k)) days.set(k, []); days.get(k).push(s); }
  const picker = !mine || picking ? `<div class="rv-pick fadeup">
      <h2 class="h3">${mine ? "Pick another time" : "Pick a time"}</h2>
      <p class="soft" style="margin:6px 0 16px">${mine ? "Your current time is kept until you pick a new one." : "Book it now, even before you start. A date gives you something to finish by."}</p>
      ${days.size ? [...days].map(([d, ss]) => `<div class="rv-day"><h3>${esc(d)}</h3><div class="rv-times">${ss.map((s) => `<button class="rv-t" data-slot="${s.id}"><b>${esc(callTime(s.startsAt))}</b><small>${esc(firstName(s.reviewer))}</small></button>`).join("")}</div></div>`).join("")
        : `<div class="note">No open times right now. We’re adding more this week, so check back soon. Calls run until ${esc(r.until)}.</div>`}
    </div>` : "";
  app.innerHTML = `<div class="wrap player"><section>${crumbs}<div class="fadeup">
    <div class="lesson__head"><p class="kicker">Included with Blueprint</p><h1 class="display">Your 15-minute résumé review</h1><p>A one-on-one review of your résumé and LinkedIn, on Google Meet.</p></div>
    ${mineBox}
    ${picker}
    <div class="m-page" style="margin-top:26px">
      <div class="card card--pad"><p class="kicker">How it goes</p>
        <ul class="ticks" style="margin-top:10px">
          <li>Before the call, your reviewer reads your worksheets and your résumé.</li>
          <li>The 15 minutes: 5 on your résumé bullets, 5 on your LinkedIn or your intro, 5 on your next step.</li>
          <li>Have your résumé and LinkedIn open.</li>
          <li>Change or cancel here up to 24 hours before. A missed call without notice isn’t rebooked.</li>
          <li>Calls run until ${esc(r.until)}.</li>
        </ul></div>
    </div>
  </div></section>${sidePanel("review")}</div>`;
  $("#rvPick")?.addEventListener("click", () => { picking = !picking; renderReview(); });
  $("#rvCancel")?.addEventListener("click", async (e) => {
    if (!confirm(`Cancel your review call on ${callWhen(mine.startsAt)}? Someone else can book that time.`)) return;
    const b = e.currentTarget; b.disabled = true;
    try { take(await call("cancel")); picking = false; toast("Call cancelled. Pick a new time whenever you’re ready."); renderReview(); }
    catch (err) { b.disabled = false; toast(msg(err), true); if (err.code === "locked") { take(await call("me").catch(() => ({}))); renderReview(); } }
  });
  $$("[data-slot]").forEach((b) => b.addEventListener("click", () => confirmSlot(r.open.find((s) => s.id === Number(b.dataset.slot)))));
}
function confirmSlot(s) {
  if (!s) return;
  const moving = !!D.review?.mine;
  const box = openSheet(`<p class="kicker">${icon("cal")}Your review call</p>
    <h2 class="sheet__title">${esc(callDayLong(s.startsAt))}, ${esc(callTime(s.startsAt))}</h2>
    <p class="soft">15 minutes on Google Meet with <b>${esc(s.reviewer)}</b>. Manila time. ${moving ? "Your old time goes back on the list." : ""}</p>
    <p class="soft" style="margin-top:10px">We’ll email you the details. You can change it here up to 24 hours before.</p>
    <p class="err" id="bErr" role="alert"></p>
    <button class="btn btn--primary btn--lg btn--block" id="bookBtn" style="margin-top:18px">${moving ? "Move my call here" : "Book this time"} ${arrow}</button>`);
  $("#bookBtn", box).onclick = async (e) => {
    const btn = e.currentTarget;
    busy(btn, true, "Booking");
    try { take(await call("book", { slot: s.id })); closeSheet(); picking = false; toast(moving ? "Moved. We emailed you the new time." : "Booked. We emailed you the details."); renderReview(); window.scrollTo({ top: 0, behavior: "smooth" }); }
    catch (err) {
      busy(btn, false); $("#bErr", box).textContent = msg(err);
      if (err.code === "taken") { try { take(await call("me")); } catch {} setTimeout(() => { closeSheet(); renderReview(); }, 1400); }
    }
  };
}

/* ==========================================================================
   Router
   ========================================================================== */
async function route() {
  flushSave(); saver = null;
  $(".menu")?.remove();
  if (!$("#sheet").hidden && !$("#c-code")) closeSheet();
  if (linkKey) {
    // the button in their access email
    const k = linkKey; linkKey = null;
    try { token = null; take(await call("link", { k })); toast(`You’re in, ${esc(D.me.first)}.`); }
    catch (e) { await renderLanding(); toast(msg(e), true); return; }
  }
  if (!token) return renderLanding();
  if (!D) {
    try { take(await call("me")); }
    catch (e) {
      if (!token) { await renderLanding(); return openSignIn("", "email"); }
      app.innerHTML = `<div class="wrap"><div class="boot"><div><h2 class="h3">Couldn’t load Blueprint.</h2><p class="soft" style="margin:8px 0 16px">${esc(msg(e))}</p><button class="btn btn--primary" onclick="location.reload()">Try again</button></div></div></div>`;
      return;
    }
  }
  const h = where();
  if (h[0] === "coaching") { location.replace("#/review"); return; } // old links
  if (h[0] !== "review") picking = false;
  if (!justSubmitted) window.scrollTo({ top: 0 });
  if (h[0] === "m") renderModule(Number(h[1]));
  else if (h[0] === "review") renderReview();
  else renderHome();
}
addEventListener("hashchange", route);
route();
