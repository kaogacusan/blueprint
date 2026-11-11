/* Blueprint Online: the course at /learn.
   One page, hash routes:  #/  the course map · #/s/2  a session (briefing, then each step, then done) · #/blueprint
   Everything goes through /api/learn. Answers save as they type (and to this browser first, in case the signal drops).
   Sign-in: a new email gets in right away; a known email gets a 6-digit code by email. The token stays in this browser. */

const API = "/api/learn";
const PRIVACY_VERSION = "2026-11-11";
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const peso = (n) => `₱${Number(n || 0).toLocaleString("en-PH")}`;
const app = $("#app");

/* ---------- storage that never breaks the page ---------- */
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const TOKEN = "bp_learn_token";
let token = store.get(TOKEN);
let D = null; // the snapshot from the server: me, sessions, work, orders, prices, gcash

/* what they came for: /learn?buy=2 · ?buy=rest · ?from=booth */
const qs = new URLSearchParams(location.search);
const intent = { buy: qs.get("buy"), from: qs.get("from") };
if (qs.toString()) history.replaceState(null, "", location.pathname + location.hash);

/* ---------- icons ---------- */
const I = {
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
  map: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4v16M5 6h9l-2 3 2 3H5"/><circle cx="18" cy="18" r="2"/><path d="M5 18h11"/></svg>`,
  doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>`,
  out: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  play: `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4z" fill="currentColor"/></svg>`,
};

/* ---------- talking to the server ---------- */
async function call(action, data = {}) {
  let r;
  try { r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, token, ...data }) }); }
  catch { const e = new Error("offline"); e.code = "offline"; throw e; }
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { signOut(true); const e = new Error("signin"); e.code = "signin"; throw e; }
  if (!r.ok) { const e = new Error(j.error || "server"); e.code = j.error || "server"; e.data = j; throw e; }
  return j;
}
function take(snap) {
  if (snap.token) { token = snap.token; store.set(TOKEN, token); }
  if (snap.sessions) D = { me: snap.me, sessions: snap.sessions, work: snap.work || {}, orders: snap.orders || [], prices: snap.prices, gcash: snap.gcash };
  mergeLocal();
}
function signOut(quiet) {
  token = null; D = null; store.del(TOKEN);
  if (!quiet) { location.hash = "#/"; route(); }
}

/* ---------- toasts: "READINESS ↑ 42%" ---------- */
function toast(html, bad = false) {
  const t = document.createElement("div");
  t.className = `toast${bad ? " toast--bad" : ""}`;
  t.innerHTML = html;
  $("#toasts").append(t);
  setTimeout(() => t.remove(), 4000);
}

/* ==========================================================================
   Progress: which steps are done, how ready their Blueprint is
   ========================================================================== */
const S = (n) => D.sessions.find((s) => s.n === Number(n));
const W = (n) => (D.work[n] ||= { answers: {}, done: [] });
const filled = (v) => (Array.isArray(v) ? v.some((x) => String(x || "").trim()) : !!String(v || "").trim());
function stepDone(step, answers) {
  const need = (step.fields || []).filter((f) => !f.optional);
  return need.length ? need.every((f) => filled(answers[f.id])) : true;
}
const doneIds = (s) => (s.steps ? s.steps.filter((st) => stepDone(st, W(s.n).answers)).map((st) => st.id) : W(s.n).done || []);
function readiness() {
  const total = D.sessions.reduce((t, s) => t + s.outline.length, 0) || 1;
  const done = D.sessions.reduce((t, s) => t + doneIds(s).length, 0);
  return Math.round((done / total) * 100);
}
const sessionPct = (s) => (s.outline.length ? Math.round((doneIds(s).length / s.outline.length) * 100) : 0);
const isComplete = (s) => s.outline.length > 0 && doneIds(s).length === s.outline.length;
/* the next thing to do: the first open session that isn't finished, at its first unfinished step */
function nextUp() {
  for (const s of D.sessions) {
    if (!s.open || isComplete(s)) continue;
    const done = doneIds(s), i = s.steps.findIndex((st) => !done.includes(st.id));
    return { s, i: i < 0 ? 0 : i, fresh: done.length === 0 };
  }
  const locked = D.sessions.find((s) => !s.open);
  return locked ? { s: locked, locked: true } : null;
}
const pending = (n) => D.orders.some((o) => o.status === "pending" && o.sessions.includes(n));

/* ==========================================================================
   Saving: this browser first, then the server (quietly, a moment after they stop typing)
   ========================================================================== */
const localKey = (n) => `bp_work_${D?.me?.email}_${n}`;
const timers = {};
let saveState = "ok";
function setSaved(state) {
  saveState = state;
  const el = $("#saved");
  if (!el) return;
  el.className = `saved is-${state}`;
  el.innerHTML = `<i></i>${{ ok: "Saved", busy: "Saving", bad: "Not saved yet: we’ll retry" }[state]}`;
}
function touch(n) {
  const w = W(n);
  store.set(localKey(n), { answers: w.answers, at: Date.now() });
  setSaved("busy");
  clearTimeout(timers[n]);
  timers[n] = setTimeout(() => push(n), 900);
}
async function push(n, { complete = false, keepalive = false } = {}) {
  clearTimeout(timers[n]);
  const s = S(n), w = W(n);
  const body = { session: n, answers: w.answers, done: doneIds(s), complete };
  try {
    if (keepalive) { fetch(API, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", token, ...body }) }); return; }
    const r = await call("save", body);
    w.updatedAt = r.at; w.done = body.done;
    if (r.completedAt) w.completedAt = r.completedAt;
    store.del(localKey(n));
    setSaved("ok");
  } catch (e) {
    if (e.code === "signin") return;
    setSaved("bad");
    timers[n] = setTimeout(() => push(n), 5000);
  }
}
/* answers typed here that never reached the server (signal dropped, tab closed) win if they're newer */
function mergeLocal() {
  if (!D) return;
  for (const s of D.sessions) {
    if (!s.open) continue;
    const loc = store.get(localKey(s.n));
    if (!loc) continue;
    const w = W(s.n), serverAt = w.updatedAt ? Date.parse(w.updatedAt) : 0;
    if (loc.at > serverAt) { w.answers = { ...w.answers, ...loc.answers }; setTimeout(() => push(s.n), 300); }
    else store.del(localKey(s.n));
  }
}
addEventListener("pagehide", () => { if (D) Object.keys(timers).forEach((n) => push(Number(n), { keepalive: true })); });

/* ==========================================================================
   Their Blueprint: the document that fills in as they go
   Each step says which part of it its answers feed. Locked sessions still show where they'll land.
   ========================================================================== */
const SECTIONS = [
  ["statement", "Career-brand statement", "p"],
  ["intro-pitch", "30-second intro", "p"],
  ["resume-experience", "Experience", "list"],
  ["resume-bullets", "Proof bullets", "list"],
  ["linkedin-headline", "LinkedIn headline", "p"],
  ["linkedin-about", "LinkedIn About", "p"],
  ["featured", "LinkedIn Featured", "list"],
  ["outreach-message", "Outreach message", "p"],
  ["stories", "Story bank", "list"],
  ["pillars", "Content pillars", "list"],
  ["plan", "Four-week plan", "list"],
  ["post", "Your first post", "p"],
  ["circle", "Keeping it going", "list"],
];
const HEAD = ["headline", "aim", "known"]; // the top of the document: headline, what they're aiming for, what they want to be known for
const feedsOf = (st) => (st.out ? st.out.map((o) => o.to) : [].concat(st.feeds || [])).filter((f) => f && f !== "none");
/* fill one template: {id} a value (one line per entry if it's a list), {id*} a list joined with " · ",
   [ ... ] a part that disappears when everything in it is empty */
function fill(tpl, answers) {
  const ids = [...tpl.matchAll(/\{([a-z0-9-]+)\}/g)].map((m) => m[1]);
  const listId = ids.find((id) => Array.isArray(answers[id]));
  const rows = listId ? (answers[listId].length ? answers[listId].map((_, i) => i) : []) : [null];
  const one = (id, i, star) => {
    let v = answers[id];
    if (Array.isArray(v)) v = star ? v.map((x) => String(x || "").trim()).filter(Boolean).join(" · ") : i === null ? v.filter(Boolean).join(", ") : v[i];
    return String(v || "").trim();
  };
  const out = [];
  for (const i of rows) {
    let any = false;
    const sub = (t) => t.replace(/\{([a-z0-9-]+)(\*?)\}/g, (_, id, star) => { const v = one(id, i, star); if (v) any = true; return v; });
    // optional parts first: keep one only if something inside it is filled
    let line = tpl.replace(/\[([^\]]*)\]/g, (_, part) => { let filled = false; const t = part.replace(/\{([a-z0-9-]+)(\*?)\}/g, (__, id, star) => { const v = one(id, i, star); if (v) filled = true; return v; }); return filled ? t : ""; });
    any = false;
    line = sub(line);
    const fixed = tpl.replace(/\[[^\]]*\]/g, "");
    const needs = [...fixed.matchAll(/\{([a-z0-9-]+)\*?\}/g)].map((m) => m[1]);
    // a line only shows once its main (non-optional) answer is in
    if (needs.length && !needs.some((id) => one(id, i, true))) continue;
    line = line.replace(/\s+([,.;:])/g, "$1").replace(/^[\s,;:–—·-]+|[\s,;:–—·-]+$/g, "").trim();
    if (any && line) out.push(line);
  }
  return out;
}
/* one step's answers → lines for one part of the document */
function linesOf(st, answers, key) {
  const o = (st.out || []).find((x) => x.to === key);
  if (o?.compose?.length) return o.compose.flatMap((t) => fill(t, answers));
  return (st.fields || []).flatMap((f) => [].concat(answers[f.id] || [])).map((x) => String(x || "").trim()).filter(Boolean);
}
function docParts() {
  const parts = Object.fromEntries([...SECTIONS.map(([k]) => k), ...HEAD].map((k) => [k, []]));
  for (const s of D.sessions) {
    const list = s.open ? s.steps : s.outline;
    list.forEach((st, i) => {
      for (const key of feedsOf(st)) {
        if (!parts[key]) continue;
        parts[key].push(s.open
          ? { n: s.n, i, lines: linesOf(st, W(s.n).answers, key), title: st.title }
          : { n: s.n, i, lines: [], locked: true, title: st.title });
      }
    });
  }
  return parts;
}
function docHTML({ full = false } = {}) {
  const parts = docParts();
  const top = (k) => parts[k].flatMap((p) => p.lines);
  const headline = top("headline")[0], aim = top("aim").at(-1), known = top("known")[0];
  const sec = ([key, label, kind]) => {
    const ps = parts[key];
    if (!ps.length) return "";
    const lines = ps.flatMap((p) => p.lines);
    const lockedFrom = [...new Set(ps.filter((p) => p.locked).map((p) => p.n))];
    const todo = ps.filter((p) => !p.locked && !p.lines.length);
    const body = lines.length
      ? (kind === "list" ? `<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : lines.map((l) => `<p>${esc(l)}</p>`).join(""))
      : todo.length ? `<p class="doc__ph">Fills in at Session ${todo[0].n}: ${esc(todo[0].title)}</p>` : "";
    const lock = lockedFrom.length && !lines.length && !todo.length ? `<p class="doc__lock">Unlocks in Session ${lockedFrom.join(" & ")}</p>` : "";
    const copy = full && lines.length ? `<button class="copybtn no-print" data-copy="${esc(key)}">Copy</button>` : "";
    return `<div class="doc__sec" data-sec="${esc(key)}"><div class="copyrow"><h4>${esc(label)}</h4>${copy}</div>${body}${lock}</div>`;
  };
  return `<article class="doc" id="doc">
    <span class="doc__stamp">BLUEPRINT · ${readiness()}%</span>
    <h3 class="doc__name">${esc(D.me.name)}</h3>
    <p class="doc__hl" data-sec="headline">${headline ? esc(headline) : known ? `Known for: ${esc(known)}` : `<span class="doc__ph">Your headline lands here (Session 2)</span>`}</p>
    <p class="doc__meta" data-sec="aim">${aim ? `Aiming for: ${esc(aim)} · ` : ""}${esc(D.me.email)}</p>
    ${SECTIONS.map(sec).join("")}
  </article>`;
}
const docText = (key) => docParts()[key].flatMap((p) => p.lines).join("\n");
function refreshDoc(liveKeys = []) {
  const el = $("#docSlot");
  if (!el) return;
  el.innerHTML = docHTML();
  for (const k of liveKeys) {
    const sec = $(`[data-sec="${k}"]`, el);
    if (sec) { sec.classList.add("is-live"); setTimeout(() => sec.classList.remove("is-live"), 900); }
  }
  topBar();
}

/* ==========================================================================
   Top bar + phone dock
   ========================================================================== */
function topBar() {
  const el = $("#topRight");
  if (!D) { el.innerHTML = ""; return; }
  const r = readiness();
  el.innerHTML = `<div class="ready" title="How complete your Blueprint is"><span class="hide-sm">Readiness</span><span class="ready__bar"><i style="width:${r}%"></i></span><b>${r}%</b></div>
    <button class="iconbtn" id="outBtn" aria-label="Sign out" title="Sign out">${I.out}</button>`;
  $("#outBtn").onclick = () => { if (confirm("Sign out of Blueprint on this device? Your answers stay saved.")) signOut(); };
}
function dock(on) {
  return `<nav class="dock" aria-label="Course">
    <a href="#/" class="${on === "map" ? "is-on" : ""}">${I.map}Course</a>
    <a href="#/blueprint" class="${on === "doc" ? "is-on" : ""}">${I.doc}My Blueprint</a>
  </nav>`;
}
let lastReady = null;
function bumpReadiness() {
  const r = readiness();
  if (lastReady !== null && r > lastReady) toast(`<span class="up">↑</span> Readiness <b>${r}%</b>`);
  lastReady = r;
  topBar();
}

/* ==========================================================================
   The gate: start free, or sign in
   ========================================================================== */
function renderGate(mode = "start", note = "") {
  topBar();
  const free = "Free";
  app.innerHTML = `<section class="gate">
    <div class="gate__pitch stagger">
      <span class="k">Blueprint Online · 4 sessions</span>
      <h1>Build your <span class="grad">Blueprint.</span></h1>
      <p class="lede">You already have the experience. In four short sessions you turn it into a résumé, a LinkedIn and an intro people remember. Your answers build the document as you go.</p>
      <ul class="gate__list">
        <li><span class="gate__n gate__n--free">01</span><span><b>Sino Ka? · ${free}</b>Find your story and the proof behind it. Leave with your intro.</span></li>
        <li><span class="gate__n">02</span><span><b>Proof on Paper</b>Turn what you did into résumé lines that show results.</span></li>
        <li><span class="gate__n">03</span><span><b>Proof in Public</b>Your LinkedIn, and a four-week plan to get seen.</span></li>
        <li><span class="gate__n">04</span><span><b>Ako ’To</b>Put it together, say it out loud, and reach out.</span></li>
      </ul>
      <div class="price-note" id="priceNote"><span>Session 1 <b>free</b></span></div>
    </div>
    <div class="hud fadein" id="gateBox"></div>
  </section>
  <footer class="foot"><span>An LAS50 student venture at Ateneo de Manila</span><a href="/">About Blueprint</a><a href="/privacy.html">Privacy</a><a href="/#ask">Ask us</a></footer>`;
  gateBox(mode, note);
  call("prices").then((pr) => { const el = $("#priceNote"); if (el) el.innerHTML = `<span>Session 1 <b>free</b></span><span>Each session <b>${peso(pr.single)}</b></span><span>Sessions 2–4 <b>${peso(pr.bundle)}</b></span>`; }).catch(() => {});
}
function gateBox(mode, note = "", email = "") {
  const box = $("#gateBox");
  const tabs = `<div class="tabs" role="tablist"><button class="${mode === "start" ? "is-on" : ""}" data-mode="start">Start free</button><button class="${mode !== "start" ? "is-on" : ""}" data-mode="signin">I have an account</button></div>`;
  if (mode === "start") {
    box.innerHTML = `${tabs}
      <form id="startForm" novalidate>
        <div class="field"><label for="g-name">Full name</label><input class="in" id="g-name" name="name" autocomplete="name" required maxlength="120" placeholder="Juan dela Cruz" /></div>
        <div class="field"><label for="g-email">Email</label><input class="in" id="g-email" name="email" type="email" autocomplete="email" inputmode="email" required maxlength="200" placeholder="you@email.com" value="${esc(email)}" /><span class="hint">This is how you sign back in. No password.</span></div>
        <div class="field"><label for="g-year">Year</label><select class="sel" id="g-year" name="year" required>
          <option value="" disabled selected>Pick one</option><option>1st year</option><option>2nd year</option><option>3rd year</option><option>4th year</option><option>Fresh grad</option><option>Other</option></select></div>
        <div class="field"><label for="g-heard">How did you hear about us? <span class="muted small">(optional)</span></label><select class="sel" id="g-heard" name="heard_from">
          <option value="">Skip</option>${["Booth", "Student org", "Friend", "Facebook", "Instagram", "Email", "Other"].map((h) => `<option ${intent.from === "booth" && h === "Booth" ? "selected" : ""}>${h}</option>`).join("")}</select></div>
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
        <label class="check"><input type="checkbox" name="consent" required /><span>I agree to the <a href="/privacy.html" target="_blank" rel="noopener">privacy notice</a>: Blueprint keeps my name, email, year and my answers to run the course.</span></label>
        <p class="err" id="gErr" role="alert"></p>
        <button class="btn btn--wide" type="submit" style="margin-top:14px">Start Session 1 free <span class="arrow">→</span></button>
        <p class="fine">Free to start. You only pay if you want Sessions 2 to 4.</p>
      </form>`;
    $("#startForm").onsubmit = onStart;
  } else if (mode === "signin") {
    box.innerHTML = `${tabs}
      <form id="inForm" novalidate>
        <p class="muted small" style="margin:12px 0 0">${note || "Type the email you started with. We’ll send you a 6-digit code."}</p>
        <div class="field"><label for="i-email">Email</label><input class="in" id="i-email" type="email" autocomplete="email" inputmode="email" required value="${esc(email)}" placeholder="you@email.com" /></div>
        <p class="err" id="gErr" role="alert"></p>
        <button class="btn btn--wide" type="submit" style="margin-top:14px">Send my code <span class="arrow">→</span></button>
      </form>`;
    $("#inForm").onsubmit = async (e) => {
      e.preventDefault();
      const em = $("#i-email").value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return ($("#gErr").textContent = "That email doesn’t look right.");
      busy(e.submitter, true);
      try { await call("code", { email: em }); gateBox("code", "", em); }
      catch (err) { $("#gErr").textContent = msg(err); busy(e.submitter, false); }
    };
  } else {
    box.innerHTML = `${tabs}
      <form id="codeForm" novalidate>
        <p class="muted small" style="margin:12px 0 0">${note || `If <b>${esc(email)}</b> has a Blueprint, a 6-digit code is on its way. Check your inbox (and Spam).`}</p>
        <div class="field"><label for="c-code">Code</label><input class="in otp" id="c-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" required placeholder="••••••" /></div>
        <p class="err" id="gErr" role="alert"></p>
        <button class="btn btn--wide" type="submit" style="margin-top:14px">Sign in <span class="arrow">→</span></button>
        <p class="fine">No code after a minute? <button type="button" class="link" id="again">Send it again</button> · <button type="button" class="link" id="other">Use another email</button></p>
      </form>`;
    const input = $("#c-code");
    input.focus();
    input.oninput = () => { input.value = input.value.replace(/\D/g, "").slice(0, 6); if (input.value.length === 6) $("#codeForm").requestSubmit(); };
    $("#again").onclick = async () => { try { await call("code", { email }); toast("Code sent again"); } catch (err) { $("#gErr").textContent = msg(err); } };
    $("#other").onclick = () => gateBox("signin");
    $("#codeForm").onsubmit = async (e) => {
      e.preventDefault();
      const btn = $("#codeForm .btn");
      if (input.value.length !== 6) return ($("#gErr").textContent = "The code has 6 digits.");
      busy(btn, true);
      try { take(await call("verify", { email, code: input.value })); afterIn(); }
      catch (err) {
        busy(btn, false); input.value = "";
        $("#gErr").textContent = err.code === "wrong" ? `That code isn’t right. ${err.data?.left ? `${err.data.left} tries left.` : "Ask for a new one."}`
          : err.code === "expired" ? "That code expired or was used. Tap “Send it again”." : msg(err);
      }
    };
  }
  $$("[data-mode]", box).forEach((b) => (b.onclick = () => gateBox(b.dataset.mode)));
}
async function onStart(e) {
  e.preventDefault();
  const f = e.target, v = Object.fromEntries(new FormData(f));
  const err = $("#gErr");
  if (!v.name.trim()) return (err.textContent = "Please type your name.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email.trim())) return (err.textContent = "That email doesn’t look right.");
  if (!v.year) return (err.textContent = "Please pick your year.");
  if (!f.consent.checked) return (err.textContent = "Please tick the privacy box to continue.");
  busy(e.submitter, true);
  try {
    const r = await call("start", { name: v.name.trim(), email: v.email.trim().toLowerCase(), year: v.year, heard_from: v.heard_from, consent: true, privacy_version: PRIVACY_VERSION, website: v.website });
    if (r.needCode) return gateBox("code", `Welcome back! <b>${esc(v.email.trim())}</b> already has a Blueprint, so we sent a 6-digit code to sign you in.`, v.email.trim().toLowerCase());
    take(r);
    toast(`<span class="up">◆</span> Session 1 unlocked`);
    afterIn(true);
  } catch (ex) { err.textContent = msg(ex); busy(e.submitter, false); }
}
function afterIn(fresh = false) {
  lastReady = readiness();
  if (intent.buy) {
    const n = intent.buy === "rest" ? null : Number(intent.buy);
    intent.buy = null;
    location.hash = "#/";
    route();
    if (n === null || (S(n) && !S(n).open)) return openUnlock(n);
    if (S(n)) location.hash = `#/s/${n}`;
    return;
  }
  location.hash = fresh ? "#/s/1" : "#/";
  route();
}
function busy(btn, on) { if (!btn) return; btn.disabled = on; if (on) { btn.dataset.label = btn.innerHTML; btn.innerHTML = `<span class="boot__dot"></span>Working`; } else if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
function msg(e) {
  return { offline: "No connection. Check your signal and try again.", invalid: "Something’s missing. Check each box.", busy: "Lots of people are signing up right now. Try again in a minute.",
    image: "That file didn’t work. Upload a screenshot (JPG or PNG).", big: "That picture is too big. Take a normal screenshot and try that.",
    waiting: "We already have a receipt for that session and we’re checking it.", have: "You already have that session.", signin: "Please sign in again." }[e.code]
    || "Something went wrong on our side. Try again, or ask us on the site.";
}

/* ==========================================================================
   Home: the course map
   ========================================================================== */
function renderHome() {
  const nx = nextUp(), r = readiness();
  const first = D.me.first || D.me.name.split(" ")[0];
  let next = "";
  if (nx && !nx.locked) {
    next = `<div class="hud next fadein">
      <span class="k">Objective</span>
      <div class="next__row">
        <div><h3>${nx.fresh ? "Start" : "Continue"} Session ${nx.s.n}: ${esc(nx.s.title)}</h3>
        <p class="objective" style="margin:6px 0 0">${nx.fresh ? "Watch the briefing, then" : `Step ${nx.i + 1} of ${nx.s.steps.length}:`} <b>${esc(nx.fresh ? nx.s.steps[0]?.title || "" : nx.s.steps[nx.i]?.title || "")}</b></p></div>
        <a class="btn" href="#/s/${nx.s.n}${nx.fresh ? "" : `/${nx.i + 1}`}">${nx.fresh ? "Start" : "Continue"} <span class="arrow">→</span></a>
      </div></div>`;
  } else if (nx?.locked) {
    next = `<div class="hud next fadein"><span class="k">Objective</span><div class="next__row">
      <div><h3>Session ${nx.s.n}: ${esc(nx.s.title)} is next</h3><p class="muted small" style="margin:6px 0 0">${esc(nx.s.leaveWith)}</p></div>
      <button class="btn" data-unlock="${nx.s.n}">Unlock · ${peso(D.prices.single)}</button></div></div>`;
  } else {
    next = `<div class="hud next fadein"><span class="k">Blueprint complete</span><div class="next__row"><div><h3>You built it.</h3><p class="muted small" style="margin:6px 0 0">Download your Blueprint, copy your LinkedIn text, and send that first message.</p></div><a class="btn" href="#/blueprint">Open my Blueprint <span class="arrow">→</span></a></div></div>`;
  }
  const nodes = D.sessions.map((s) => {
    const pct = sessionPct(s), done = isComplete(s), wait = !s.open && pending(s.n);
    const now = nx && !nx.locked && nx.s.n === s.n;
    const cls = done ? "node--done" : now ? "node--now" : !s.open ? "node--locked" : "";
    const dots = s.outline.map((st) => `<i class="${doneIds(s).includes(st.id) ? "on" : ""}"></i>`).join("");
    const right = s.free ? `<span class="tag tag--free">Free</span>` : s.open ? (done ? `<span class="tag tag--ok">Complete</span>` : `<span class="tag tag--ok">Unlocked</span>`)
      : wait ? `<span class="tag tag--wait">Checking receipt</span>` : `<span class="tag tag--lock">${peso(D.prices.single)}</span>`;
    const foot = s.open ? `<span class="steps-dots" aria-label="${pct}% done">${dots}</span><span class="k k--plain k--dim">${pct}% · ${s.outline.length} steps${s.minutes ? ` · ~${s.minutes} min` : ""}</span>`
      : `<span class="lockline">${I.lock} Locked</span><span class="k k--plain k--dim">${s.outline.length} steps${s.minutes ? ` · ~${s.minutes} min` : ""}</span>`;
    const attrs = s.open ? `href="#/s/${s.n}"` : `href="#" data-unlock="${s.n}"`;
    return `<div class="node ${cls}">
      <div class="node__pin"><span>${String(s.n).padStart(2, "0")}</span></div>
      <a class="hud hud--quiet node__card" ${attrs}>
        <div class="node__top"><span class="k">Session ${s.n}${s.tagline ? ` · ${esc(s.tagline)}` : ""}</span>${right}</div>
        <p class="node__title">${esc(s.title)}</p>
        <p class="node__make">${esc(s.leaveWith)}</p>
        <div class="node__foot">${foot}</div>
      </a></div>`;
  }).join("");
  const rest = D.prices.restSessions;
  const bundle = rest.length > 1 && !rest.some(pending) ? `<div class="hud bundle fadein">
      <div><span class="k">Best value</span><h3>Unlock Sessions ${rest.join(", ").replace(/, (\d)$/, " & $1")}</h3>
      <p>${rest.length * D.prices.single > D.prices.rest ? `<span class="strike">${peso(rest.length * D.prices.single)}</span>` : ""}<b>${peso(D.prices.rest)}</b> for all ${rest.length}.${D.prices.spent ? ` You already paid ${peso(D.prices.spent)}, so this is just the difference.` : " Open right after you pay."}</p></div>
      <button class="btn" data-unlock="rest">Unlock all · ${peso(D.prices.rest)}</button></div>` : "";

  app.innerHTML = `<div class="home">
    <section>
      <div class="hello fadein"><div><span class="k">${r ? `Readiness ${r}%` : "Welcome"}</span><h1 style="margin-top:8px">Hi, ${esc(first)}.</h1></div></div>
      ${next}
      <div style="margin-top:28px"><span class="k">Course map</span></div>
      <div class="map stagger" style="margin-top:14px">${nodes}</div>
      ${bundle}
      ${ordersNote()}
    </section>
    <aside class="doc-wrap doc-wrap--side">
      <div class="doc-head"><span class="k">Your Blueprint · live</span><a class="btn btn--ghost btn--sm" href="#/blueprint">Open</a></div>
      <div id="docSlot">${docHTML()}</div>
    </aside>
  </div>${dock("map")}`;
  wireUnlocks();
}
function ordersNote() {
  const wait = D.orders.filter((o) => o.status === "pending"), bad = D.orders.filter((o) => o.status === "rejected" && !o.sessions.every((n) => S(n).open));
  if (!wait.length && !bad.length) return "";
  return `<div class="hud hud--quiet" style="margin-top:18px">
    ${wait.map((o) => `<p class="small" style="margin:0 0 6px"><span class="tag tag--wait">Checking</span> Order ${esc(o.code)} · ${peso(o.amount)}: we’re checking your GCash receipt. ${o.sessions.every((n) => S(n).open) ? "You can already use it." : ""}</p>`).join("")}
    ${bad.map((o) => `<p class="small" style="margin:0 0 6px;color:var(--bad)">Order ${esc(o.code)}: we couldn’t match that receipt.${o.note ? ` ${esc(o.note)}` : ""} Upload the right one to unlock.</p>`).join("")}
  </div>`;
}
function wireUnlocks() {
  $$("[data-unlock]").forEach((b) => (b.onclick = (e) => { e.preventDefault(); const v = b.dataset.unlock; openUnlock(v === "rest" ? null : Number(v)); }));
}

/* ==========================================================================
   A session: briefing (step 0) → steps 1..n → done
   ========================================================================== */
function videoEmbed(url) {
  if (!url) return null;
  let m;
  if ((m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/))) return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1&playsinline=1`;
  if ((m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/))) return `https://drive.google.com/file/d/${m[1]}/preview`;
  if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/))) return `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ""}`;
  return null;
}
function renderSession(n, i) {
  const s = S(n);
  if (!s) { location.hash = "#/"; return; }
  if (!s.open) { location.hash = "#/"; route(); return openUnlock(n); }
  const total = s.steps.length;
  i = Math.max(0, Math.min(i, total + 1));
  if (i === total + 1) return renderDone(s);
  const done = doneIds(s);
  const rail = [`<button class="${i === 0 ? "here" : "on"}" data-go="0" aria-label="Briefing"></button>`]
    .concat(s.steps.map((st, k) => `<button class="${k + 1 === i ? "here" : done.includes(st.id) ? "on" : ""}" data-go="${k + 1}" aria-label="Step ${k + 1}: ${esc(st.title)}"></button>`)).join("");
  const head = `<nav class="crumbs"><a href="#/">← Course map</a><span class="k k--dim">Session ${s.n} · ${esc(s.title)}</span></nav><div class="rail">${rail}</div>`;
  const main = i === 0 ? briefing(s) : stepView(s, s.steps[i - 1], i);
  const nextLabel = i === 0 ? (done.length ? "Continue" : "Start step 1") : i === total ? "Finish session" : "Next step";
  app.innerHTML = `<div class="sess">
    <section>${head}<div class="fadein" id="stage">${main}</div>
      <div class="stepnav">
        ${i > 0 ? `<button class="btn btn--ghost btn--sm" data-go="${i - 1}">← Back</button>` : `<span></span>`}
        ${i > 0 ? `<span class="saved is-${saveState}" id="saved"><i></i>${saveState === "bad" ? "Not saved yet" : "Saved"}</span>` : ""}
        <button class="btn" data-go="${i + 1}" id="nextBtn">${nextLabel} <span class="arrow">→</span></button>
      </div>
    </section>
    <aside class="doc-wrap doc-wrap--side no-print" id="sideDoc">
      <div class="doc-head"><span class="k">Your Blueprint · live</span><a class="btn btn--ghost btn--sm" href="#/blueprint">Open</a></div>
      <div id="docSlot">${docHTML()}</div>
    </aside>
  </div>`;
  $$("[data-go]").forEach((b) => (b.onclick = () => goStep(s, Number(b.dataset.go), i)));
  if (i > 0) wireFields(s, s.steps[i - 1]);
  // on phones the live document sits under the step: show it only once there's something to see
  if (matchMedia("(max-width: 999px)").matches && i === 0) $("#sideDoc").hidden = true;
}
function goStep(s, to, from) {
  if (from > 0) push(s.n, { complete: to === s.steps.length + 1 && isComplete(s) });
  bumpReadiness();
  if (to === s.steps.length + 1 && !isComplete(s)) {
    // let them finish, but tell them what's still empty
    const left = s.steps.filter((st) => !stepDone(st, W(s.n).answers));
    if (left.length) toast(`${left.length} step${left.length > 1 ? "s" : ""} still empty · you can come back`, true);
  }
  location.hash = `#/s/${s.n}/${to}`;
  window.scrollTo({ top: 0 });
}
function briefing(s) {
  const src = videoEmbed(s.video);
  const video = src
    ? `<div class="video"><iframe src="${esc(src)}" title="Session ${s.n} lesson" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>`
    : `<div class="video video--soon"><div>${I.play}<p class="k k--plain" style="margin-top:6px">Video lesson uploading</p><p>The briefing below has everything you need to start now.</p></div></div>`;
  const cards = (s.lesson || []).map((c, k) => `<div class="hud hud--quiet brief__card"><span class="k k--dim">Briefing ${String(k + 1).padStart(2, "0")}</span><h3>${esc(c.heading)}</h3><ul>${(c.points || []).map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>`).join("");
  return `<div class="stephead"><span class="k">Session ${s.n} · Briefing</span><h2>${esc(s.title)}</h2><p class="instr">${esc(s.leaveWith)}</p></div>
    <div style="margin-top:16px">${video}</div>
    <div class="brief stagger">${cards}</div>`;
}
function fieldHTML(f, v) {
  const id = `f-${f.id}`;
  const opt = f.optional ? ` <span class="opt-tag">optional</span>` : "";
  const lab = `<label for="${id}" class="lab">${esc(f.label || f.prompt)}${opt}</label>${f.label && f.prompt && f.prompt !== f.label ? `<span class="hint">${esc(f.prompt)}</span>` : ""}`;
  if (f.type === "list") {
    const n = Math.max(f.count || 3, Array.isArray(v) ? v.length : 0), vals = Array.isArray(v) ? v : [];
    return `<div class="field"><span class="lab">${esc(f.label || f.prompt)}${opt}</span>${f.label && f.prompt && f.prompt !== f.label ? `<span class="hint">${esc(f.prompt)}</span>` : ""}
      <div class="listin">${Array.from({ length: n }, (_, k) => `<div class="row"><span>${k + 1}</span><input class="in" data-f="${esc(f.id)}" data-k="${k}" value="${esc(vals[k] || "")}" placeholder="${esc(k === 0 ? f.placeholder || "" : "")}" maxlength="1500" /></div>`).join("")}</div></div>`;
  }
  if (f.type === "choice") {
    const multi = !!f.multi, cur = [].concat(v || []);
    return `<div class="field"><span class="lab">${esc(f.label || f.prompt)}${opt}</span>${f.label && f.prompt && f.prompt !== f.label ? `<span class="hint">${esc(f.prompt)}</span>` : ""}
      <div class="choices" role="${multi ? "group" : "radiogroup"}">${(f.options || []).map((o) => `<label><input type="${multi ? "checkbox" : "radio"}" name="${esc(f.id)}" data-f="${esc(f.id)}" value="${esc(o)}" ${cur.includes(o) ? "checked" : ""} /><span>${esc(o)}</span></label>`).join("")}</div></div>`;
  }
  if (f.type === "long") return `<div class="field">${lab}<textarea class="ta" id="${id}" data-f="${esc(f.id)}" maxlength="3000" placeholder="${esc(f.placeholder || "")}">${esc(v || "")}</textarea></div>`;
  return `<div class="field">${lab}<input class="in" id="${id}" data-f="${esc(f.id)}" value="${esc(v || "")}" maxlength="${f.max || 300}" placeholder="${esc(f.placeholder || "")}" /></div>`;
}
function stepView(s, st, i) {
  const a = W(s.n).answers;
  return `<div class="stephead"><span class="k">Session ${s.n} · Step ${i} of ${s.steps.length}</span><h2>${esc(st.title)}</h2>${st.instructions ? `<p class="instr">${esc(st.instructions)}</p>` : ""}</div>
    ${st.example ? `<details class="example" ${i === 1 ? "open" : ""}><summary>See an example</summary><p>${esc(st.example)}</p></details>` : ""}
    <form class="hud" style="margin-top:16px" onsubmit="return false">${(st.fields || []).map((f) => fieldHTML(f, a[f.id])).join("")}</form>
    ${st.tip ? `<aside class="drill"><span class="k">Solo drill</span><p>${esc(st.tip)}</p></aside>` : ""}`;
}
function wireFields(s, st) {
  const a = W(s.n).answers, feeds = feedsOf(st);
  const wasDone = stepDone(st, a);
  const onInput = (el) => {
    const id = el.dataset.f, f = st.fields.find((x) => x.id === id);
    if (f.type === "list") { const arr = $$(`[data-f="${id}"]`).map((x) => x.value); while (arr.length && !arr.at(-1)) arr.pop(); a[id] = arr; }
    else if (f.type === "choice") { const on = $$(`[data-f="${id}"]:checked`).map((x) => x.value); a[id] = f.multi ? on : on[0] || ""; }
    else a[id] = el.value;
    touch(s.n);
    refreshDoc(feeds);
    if (!wasDone && stepDone(st, a)) { bumpReadiness(); }
  };
  $$("[data-f]").forEach((el) => { el.addEventListener("input", () => onInput(el)); el.addEventListener("change", () => onInput(el)); });
  const firstEmpty = $$("[data-f]").find((el) => !el.value && el.type !== "radio" && el.type !== "checkbox");
  if (firstEmpty && matchMedia("(min-width: 1000px)").matches) firstEmpty.focus({ preventScroll: true });
}
function renderDone(s) {
  const done = doneIds(s), nxt = D.sessions.find((x) => x.n > s.n);
  const nodes = s.steps.map((st, k) => `${k ? `<span class="flow__line" style="animation-delay:${k * 0.12}s"></span>` : ""}<div class="flow__n" style="animation-delay:${k * 0.12}s"><b>${esc(st.title)}</b>${done.includes(st.id) ? `<span class="tag tag--ok">Done</span>` : `<a class="tag" href="#/s/${s.n}/${k + 1}">Finish</a>`}</div>`).join("");
  const cta = !nxt ? `<a class="btn" href="#/blueprint">Open my Blueprint <span class="arrow">→</span></a>`
    : nxt.open ? `<a class="btn" href="#/s/${nxt.n}">Start Session ${nxt.n} <span class="arrow">→</span></a>`
    : `<button class="btn" data-unlock="${nxt.n}">Unlock Session ${nxt.n} · ${peso(D.prices.single)}</button>`;
  app.innerHTML = `<section class="done">
    <span class="k">Session ${s.n} · ${isComplete(s) ? "Complete" : "Saved"}</span>
    <h1>${isComplete(s) ? `${esc(s.title)}, <span class="grad">done.</span>` : "Saved. Finish the rest any time."}</h1>
    <p class="lede" style="margin-inline:auto">Readiness <b style="color:#fff">${readiness()}%</b>. ${nxt ? `Next: Session ${nxt.n}, ${esc(nxt.title)}. ${esc(nxt.leaveWith)}` : "Every session is done. Your Blueprint is ready."}</p>
    <div class="flow">${nodes}</div>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px">${cta}<a class="btn btn--ghost" href="#/blueprint">See my Blueprint</a></div>
  </section>${dock("map")}`;
  wireUnlocks();
}

/* ==========================================================================
   My Blueprint: the whole document, copy each part, save as PDF
   ========================================================================== */
function renderBlueprint() {
  const r = readiness();
  app.innerHTML = `<section style="max-width:760px;margin:0 auto">
    <nav class="crumbs no-print"><a href="#/">← Course map</a></nav>
    <div class="no-print"><span class="k">Your Blueprint · ${r}%</span><h2 style="margin:8px 0 6px">${r === 100 ? "Ready to send." : "Building as you go."}</h2>
    <p class="muted" style="margin:0 0 18px">Everything you wrote, in one place. Copy each part into your résumé and LinkedIn, or save it as a PDF.</p></div>
    <div id="docSlot">${docHTML({ full: true })}</div>
    <div class="doc-actions no-print"><button class="btn" id="pdf">Save as PDF</button><button class="btn btn--ghost" id="copyAll">Copy everything</button></div>
  </section>${dock("doc")}`;
  $("#pdf").onclick = () => print();
  $("#copyAll").onclick = () => copy(SECTIONS.map(([k, label]) => { const t = docText(k); return t ? `${label.toUpperCase()}\n${t}` : ""; }).filter(Boolean).join("\n\n"));
  $$("[data-copy]").forEach((b) => (b.onclick = () => copy(docText(b.dataset.copy))));
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast("Copied"); }
  catch { toast("Couldn’t copy. Select the text and copy it instead.", true); }
}

/* ==========================================================================
   Unlock: pick what to buy → pay by GCash → upload the receipt → open
   ========================================================================== */
let payInfo = null;
const shrink = (f) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(f), im = new Image();
  im.onload = () => {
    const k = Math.min(1, 1800 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url); resolve(c.toDataURL("image/jpeg", 0.85));
  };
  im.onerror = () => { URL.revokeObjectURL(url); reject(Object.assign(new Error("image"), { code: "image" })); };
  im.src = url;
});
function closeSheet() { const sh = $("#sheet"); sh.hidden = true; sh.innerHTML = ""; document.body.style.overflow = ""; }
async function openUnlock(n) {
  const rest = D.prices.restSessions;
  if (!rest.length) return toast("You already have every session");
  if (n && !rest.includes(n)) n = null;
  if ((n ? [n] : rest).some(pending)) return toast("We’re already checking a receipt for that. Give us a little time.", true);
  const sh = $("#sheet");
  sh.hidden = false; document.body.style.overflow = "hidden";
  const single = n ? S(n) : null;
  const opts = [];
  if (single) opts.push({ v: "single", t: `Session ${n}: ${single.title}`, d: single.leaveWith, amt: D.prices.single });
  if (rest.length > 1 || !single || D.prices.rest < D.prices.single) opts.push({ v: "rest", t: rest.length > 1 ? `Sessions ${rest.join(", ").replace(/, (\d)$/, " & $1")}` : `Session ${rest[0]}`, d: D.prices.spent ? `You already paid ${peso(D.prices.spent)}: this is just the difference.` : rest.length > 1 ? "Every paid session. Best value." : S(rest[0]).leaveWith, amt: D.prices.rest, save: rest.length * D.prices.single - D.prices.rest });
  let pick = opts.length > 1 ? "rest" : opts[0].v, image = null;
  const amount = () => opts.find((o) => o.v === pick).amt;
  sh.innerHTML = `<div class="sheet__box" role="dialog" aria-modal="true" aria-labelledby="uTitle">
    <button class="iconbtn sheet__x" aria-label="Close">${I.x}</button>
    <span class="k">Unlock</span><h2 id="uTitle" style="margin-top:8px;font-size:26px">${single ? `Open Session ${n}` : "Open the rest of Blueprint"}</h2>
    <div class="opts">${opts.map((o) => `<label class="opt"><input type="radio" name="pick" value="${o.v}" ${o.v === pick ? "checked" : ""} /><span><b>${esc(o.t)}</b><small>${esc(o.d)}</small></span><span class="amt">${peso(o.amt)}${o.save > 0 ? `<span class="save">Save ${peso(o.save)}</span>` : ""}</span></label>`).join("")}</div>
    <div class="paybox">
      <div class="paystep"><span class="paystep__n">1</span><div><b>Pay <span id="amt">${peso(amount())}</span> with GCash</b>
        <div id="qrSlot"><p class="muted small" style="margin:8px 0">Loading our QR…</p></div></div></div>
      <div class="paystep"><span class="paystep__n">2</span><div><b>Upload the receipt screenshot</b>
        <label class="file" style="margin-top:10px" id="fileBox"><input type="file" accept="image/*" id="file" /><span id="fileTxt">Tap to choose your GCash receipt</span></label></div></div>
    </div>
    <p class="err" id="uErr" role="alert"></p>
    <button class="btn btn--wide" id="payBtn" style="margin-top:12px" disabled>Unlock now <span class="arrow">→</span></button>
    <p class="fine">It opens as soon as you upload. We double-check every receipt within a day.</p>
  </div>`;
  $(".sheet__x", sh).onclick = closeSheet;
  sh.onclick = (e) => { if (e.target === sh) closeSheet(); };
  $$("[name=pick]", sh).forEach((r) => (r.onchange = () => { pick = r.value; $("#amt").textContent = peso(amount()); }));
  $("#file").onchange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    $("#uErr").textContent = "";
    try { image = await shrink(f); $("#fileTxt").innerHTML = `<img src="${image}" alt="Your receipt" /><span class="small">Looks good. Tap to change.</span>`; $("#payBtn").disabled = false; }
    catch (err) { image = null; $("#uErr").textContent = msg(err); $("#payBtn").disabled = true; }
  };
  $("#payBtn").onclick = async (e) => {
    busy(e.currentTarget, true);
    try {
      const r = await call("buy", { item: pick, session: n, image });
      take(r);
      const opened = pick === "single" ? [n] : rest;
      $(".sheet__box", sh).innerHTML = `<div class="unlocked fadein"><span class="big">◆ ${opened.length > 1 ? "Sessions" : "Session"} ${opened.join(" · ")} ${r.instant ? "unlocked" : "received"}</span>
        <h2 style="margin:12px 0 8px">${r.instant ? "You’re in." : "Thanks! We’re checking it."}</h2>
        <p class="muted">Order <b style="color:#fff">${esc(r.order)}</b>. ${r.instant ? "We sent a copy to your email." : "We’ll email you as soon as it opens."}</p>
        <a class="btn btn--wide" style="margin-top:16px" href="#/s/${opened[0]}" id="goNow">${r.instant ? `Start Session ${opened[0]}` : "Back to my course"} <span class="arrow">→</span></a></div>`;
      $("#goNow").onclick = () => closeSheet();
      if (r.instant) toast(`<span class="up">◆</span> ${opened.length > 1 ? "Sessions" : "Session"} ${opened.join(", ")} unlocked`);
      if (!r.instant) $("#goNow").href = "#/";
      route();
    } catch (err) { busy(e.currentTarget, false); $("#uErr").textContent = msg(err); }
  };
  try {
    payInfo ||= await call("pay");
    $("#qrSlot").innerHTML = `${payInfo.qr ? `<img class="qr" src="${payInfo.qr}" alt="Blueprint GCash QR" />` : ""}
      <p class="payto">${payInfo.name ? `To <b>${esc(payInfo.name)}</b><br>` : ""}${payInfo.number ? `GCash <b class="mono">${esc(payInfo.number)}</b>` : ""}</p>
      ${payInfo.qr ? `<p class="fine" style="margin-top:6px">On this phone? Long-press the QR to save it, then in GCash tap <b>Pay QR › Upload QR</b>.</p>` : ""}`;
  } catch { $("#qrSlot").innerHTML = `<p class="err">Couldn’t load the QR. Close this and try again.</p>`; }
}

/* ==========================================================================
   Router
   ========================================================================== */
async function route() {
  closeSheetIfRouteChanged();
  if (!token) return renderGate(intent.buy ? "start" : "start");
  if (!D) {
    try { take(await call("me")); lastReady = readiness(); }
    catch (e) {
      if (e.code === "signin" || !token) return renderGate("signin", "You were signed out. Type your email and we’ll send a code.");
      app.innerHTML = `<div class="hud" style="max-width:520px"><span class="k">Connection</span><h3 style="margin:8px 0">Couldn’t load your Blueprint.</h3><p class="muted">${esc(msg(e))}</p><button class="btn" onclick="location.reload()">Try again</button></div>`;
      return;
    }
    if (intent.buy) return afterIn();
  }
  topBar();
  const h = location.hash.replace(/^#\/?/, "").split("/");
  if (h[0] === "s") renderSession(Number(h[1]), Number(h[2] || 0));
  else if (h[0] === "blueprint") renderBlueprint();
  else renderHome();
}
let lastHash = location.hash;
function closeSheetIfRouteChanged() { if (location.hash !== lastHash) { lastHash = location.hash; if (!$("#sheet").hidden && !$("#goNow")) closeSheet(); } }
addEventListener("hashchange", route);
addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#sheet").hidden) closeSheet(); });
route();
