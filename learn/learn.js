/* Blueprint Online: the course at /learn. Same look as the main site.
   Thomas's Nov 11 night plan: one product (₱349, bought on the main site), four short modules done in order,
   each one a video (or the deck until the video is up), a short page and a Google Form that is the worksheet.
   Ticking "I've sent my form" opens the next module. Module 4 done → the 15-minute 1:1 with Thomas.
   Routes (hash):  #/  welcome + modules (signed in) or the sign-in page · #/m/2  Module 2 · #/coaching  the 1:1
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
let D = null;   // signed in: me, modules, coaching
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
  if (snap.modules) D = { me: snap.me, modules: snap.modules, coaching: snap.coaching, finished: snap.finished };
}
function signOut(quiet) {
  token = null; D = null; store.del(TOKEN);
  if (!quiet) { location.hash = "#/"; route(); }
}
function msg(e) {
  return { offline: "No connection. Check your signal and try again.", invalid: "That email doesn’t look right.", signin: "Please sign in again.",
    order: "Finish the module before this one first.", badlink: "That link doesn’t work anymore. Sign in with your email instead." }[e.code]
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
  const on = (k) => ((k === "home" ? !h[0] : k === "mod" ? h[0] === "m" : h[0] === "coaching") ? "is-on" : "");
  nav.innerHTML = `<a href="#/" class="${on("home")}">My course</a><a href="#/m/${cur}" class="${on("mod")}">Modules</a><a href="#/coaching" class="${on("coach")}">1:1 with Thomas</a>`;
  right.innerHTML = `<a class="meter" href="#/" title="Modules done">${ring((n / 4) * 100, 28)}<b>${n}/4</b><span>done</span></a>
    <button class="avatar" id="me" aria-label="Your account" aria-haspopup="menu">${esc(initials(D.me.name))}</button>`;
  $("#me").onclick = (e) => { e.stopPropagation(); toggleMenu(); };
  tabs.hidden = false; document.body.classList.add("has-tabs");
  tabs.innerHTML = `<a href="#/" class="${on("home")}">${icon("home")}Home</a><a href="#/m/${cur}" class="${on("mod")}">${icon("list")}Module ${cur}</a><a href="#/coaching" class="${on("coach")}">${icon("cal")}1:1</a>`;
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
  ["How does the 1:1 work?", "Finish Module 4 and you’ll get a booking link. It’s 15 minutes on Google Meet. Thomas reads your answers before the call."],
  ["How long do I have access?", "You keep it. The 1:1 calls run until Dec 5."],
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
        <li>${icon("cal")}<span><b>15-minute 1:1</b> with Thomas</span></li>
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
function renderHome() {
  chrome();
  document.title = "My course · Blueprint Online";
  const me = D.me, nx = nextUp(), n = doneCount();
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
    top = `<a class="card resume fadeup" href="#/coaching">${poster(4, { small: "All four done" })}
      <div class="resume__t"><p class="kicker" style="margin:0">You finished Blueprint</p><h2 class="h3">Book your 1:1 with Thomas</h2>
      <p class="soft">15 minutes on Google Meet. Bring your résumé and LinkedIn; he’ll have read your answers.</p>
      <div class="resume__row"><span class="btn btn--primary">Book my 1:1 ${arrow}</span></div></div></a>`;
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
        <div class="card card--pad fadeup"><p class="kicker">How it works</p>
          <p class="soft" style="margin:8px 0 0">There are four modules, about ${totalMins(D.modules)} minutes in total. Do them in order, on your own time. Each one ends with a short form. Your answers are your output, so keep them.</p>
          <p class="soft" style="margin:10px 0 0">When you send a module’s form, tick <b>I’ve sent my form</b> on that page and the next module opens.</p></div>
        <a class="card card--pad mini" href="#/coaching" style="text-decoration:none">${ring((n / 4) * 100)}<div><h3 class="h3" style="font-size:1.15rem">Your 1:1 with Thomas</h3><p>${D.coaching ? "Unlocked. Book your 15 minutes." : `Unlocks when you finish Module 4.${n ? ` ${4 - n} to go.` : ""}`}</p></div></a>
        <div class="card card--pad"><p class="kicker">${icon("award")}Certificate</p><p class="soft" style="margin:8px 0 0">Finish all four modules and we’ll email you a Blueprint certificate, signed by Thomas.</p></div>
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
   A module: the video (or the deck), the page, the form, then "I've sent it"
   ========================================================================== */
function videoEmbed(url) {
  if (!url) return null;
  let m;
  if ((m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/))) return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1&playsinline=1`;
  if ((m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/))) return `https://drive.google.com/file/d/${m[1]}/preview`;
  if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/))) return `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ""}`;
  return null;
}
const opened = (n) => !!store.get(`bp_form_${D.me.email}_${n}`);
function moduleList(here) {
  return `<ul class="ls">${D.modules.map((m) => `<li><a href="#/m/${m.n}" class="${m.doneAt ? "is-done" : ""} ${here === m.n ? "is-here" : ""}"><span class="st">${m.doneAt ? icon("check") : m.open ? "" : icon("lock")}</span><span>${m.n}. ${esc(m.title)} <small class="soft">· ${m.minutes} min</small></span></a></li>`).join("")}
    <li><a href="#/coaching" class="${D.coaching ? "" : ""} ${here === "coaching" ? "is-here" : ""}"><span class="st">${D.coaching ? "" : icon("lock")}</span><span>Your 1:1 with Thomas</span></a></li></ul>`;
}
function sidePanel(here) {
  const n = doneCount();
  return `<aside class="card side">
    <div class="side__head"><p class="kicker">Blueprint Online</p><b>Your modules</b><span class="bar-p"><i style="width:${(n / 4) * 100}%"></i></span><small>${n} of 4 done · do them in order</small></div>
    <div class="side__body">${moduleList(here)}</div>
  </aside>`;
}
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
      <div class="m-locked card card--pad">${icon("lock")}<div><b>Finish Module ${prev.n} first</b><p class="soft">Blueprint works in order: each module builds on your answers from the one before. Send the Module ${prev.n} form, tick <b>I’ve sent my form</b>, and this one opens.</p>
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
  const done = m.doneAt
    ? `<div class="m-done card card--pad"><span class="m-done__ic">${icon("check")}</span><div><b>You sent the Module ${m.n} form${m.doneAt ? ` (${esc(when(m.doneAt))})` : ""}.</b>
        <p class="soft">${next ? `Module ${next.n} is open.` : "That’s all four. Your 1:1 with Thomas is unlocked."}</p>
        <a class="btn btn--primary" href="${next ? `#/m/${next.n}` : "#/coaching"}" style="margin-top:12px">${next ? `Next: Module ${next.n}, ${esc(next.title)}` : "Book my 1:1 with Thomas"} ${arrow}</a></div></div>`
    : `<div class="m-send card card--pad"><b>Sent it?</b>
        <p class="soft">Once you’ve submitted the Module ${m.n} form, tick this${next ? ` to open Module ${next.n}` : " to unlock your 1:1 with Thomas"}. Thomas reads your answers before your call, so take your time.</p>
        <button class="btn btn--ghost" id="doneBtn" style="margin-top:12px">${icon("check")}I’ve sent my Module ${m.n} form</button></div>`;
  app.innerHTML = `<div class="wrap player">
    <section>${crumbs}${mbar}<div class="fadeup">
      <div class="lesson__head"><p class="kicker">Module ${m.n} of 4 · about ${m.minutes} min</p><h1 class="display">${esc(m.title)}</h1><p>${esc(m.tagline)}</p></div>
      ${media}
      <div class="m-page">
        ${m.text ? `<p class="m-text">${esc(m.text)}</p>` : ""}
        <div class="m-leave"><p class="kicker">You leave with</p><p>${esc(m.leaveWith)}</p></div>
        ${m.n === 2 ? `<div class="callout"><span class="callout__ic">${icon("doc")}</span><div><b>Two paths</b><p><b>First résumé</b> if you don’t have one yet: you build your first three bullets from your orgs, school projects, volunteering and part-time work. <b>Rebuild</b> if you want yours better.</p></div></div>` : ""}
        <div class="m-form">
          ${m.form
            ? `<a class="btn btn--primary btn--lg btn--block" id="formBtn" href="${esc(m.form)}" target="_blank" rel="noopener">${icon("form")}Start the Module ${m.n} form ${arrow}</a>
               <p class="fine">Opens in a new tab. The form is the worksheet: its questions walk you through the module, and your answers are your output. Use the same email you signed in with.</p>`
            : `<div class="note">The Module ${m.n} form goes up soon. Check back later today; we’ll also post it in our stories.</div>`}
        </div>
        ${done}
        ${m.credits ? `<p class="m-credits"><b>Credits:</b> ${esc(m.credits)}</p>` : ""}
      </div>
    </div></section>
    ${sidePanel(m.n)}
  </div>`;
  wireList(m.n);
  $("#formBtn")?.addEventListener("click", () => store.set(`bp_form_${D.me.email}_${m.n}`, Date.now()));
  $("#doneBtn")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    if (!m.form) return toast("The form isn’t up yet. Check back soon.", true);
    if (!opened(m.n) && !confirm(`Did you submit the Module ${m.n} form? Thomas reads your answers before your 1:1.`)) return;
    busy(btn, true, "Saving");
    try {
      take(await call("done", { module: m.n }));
      toast(next ? `Module ${m.n} done. Module ${next.n} is open.` : "All four done. Book your 1:1 with Thomas.");
      route();
    } catch (err) { busy(btn, false); toast(msg(err), true); }
  });
}
function wireList(here) {
  $("#mList")?.addEventListener("click", () => { const box = openSheet(`<p class="kicker">Blueprint Online</p><h2 class="sheet__title">Your modules</h2><div style="margin-top:12px">${moduleList(here)}</div>`); $$("a", box).forEach((a) => a.addEventListener("click", closeSheet)); });
}

/* ==========================================================================
   The 1:1 with Thomas (after Module 4)
   ========================================================================== */
function renderCoaching() {
  if (!D.me.paid) { location.hash = "#/"; return; }
  chrome();
  document.title = "Your 1:1 with Thomas · Blueprint Online";
  const c = D.coaching, left = 4 - doneCount(), nx = nextUp();
  const crumbs = `<nav class="crumbs"><a href="#/">My course</a>${icon("chev")}<span>Your 1:1 with Thomas</span></nav>`;
  const body = c
    ? `${c.booking
        ? `<a class="btn btn--primary btn--lg" href="${esc(c.booking)}" target="_blank" rel="noopener">${icon("cal")}Book my 15 minutes ${arrow}</a><p class="fine">Book any open slot. It’s on Google Meet.</p>`
        : `<div class="note">The booking link goes up soon. We’ll email it to you, so keep an eye on your inbox.</div>`}
      <div class="m-page" style="margin-top:22px">
        <p class="m-text">Before the call, Thomas reads your module answers and your résumé. The 15 minutes go like this: 5 minutes on your résumé bullets, 5 on your LinkedIn or your intro, 5 on your next step.</p>
        <ul class="ticks"><li>Bring your résumé and your LinkedIn.</li><li>Can’t make your slot? Reschedule at least 24 hours before through the same link.</li><li>A missed call without notice isn’t rebooked.</li><li>Calls run until ${esc(c.until || "Dec 5")}.</li></ul>
      </div>`
    : `<div class="m-locked card card--pad">${icon("lock")}<div><b>Unlocks when you finish Module 4</b><p class="soft">${left} module${left === 1 ? "" : "s"} to go. When you send the Module 4 form and tick <b>I’ve sent my form</b>, the booking link shows up here.</p>
        ${nx ? `<a class="btn btn--primary" href="#/m/${nx.n}" style="margin-top:12px">Continue: Module ${nx.n}, ${esc(nx.title)} ${arrow}</a>` : ""}</div></div>`;
  app.innerHTML = `<div class="wrap player"><section>${crumbs}<div class="fadeup">
    <div class="lesson__head"><p class="kicker">After Module 4</p><h1 class="display">Your 15-minute 1:1 with Thomas</h1><p>One call on Google Meet to go over your résumé, your LinkedIn and your next step.</p></div>
    ${body}
  </div></section>${sidePanel("coaching")}</div>`;
}

/* ==========================================================================
   Router
   ========================================================================== */
async function route() {
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
  window.scrollTo({ top: 0 });
  if (h[0] === "m") renderModule(Number(h[1]));
  else if (h[0] === "coaching") renderCoaching();
  else renderHome();
}
addEventListener("hashchange", route);
route();
