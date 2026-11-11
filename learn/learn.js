/* Blueprint Online: the course at /learn. Same look as the main site.
   Routes (hash):  #/  course page (signed out) or My learning (signed in) · #/tailor  three questions that tailor it
                   #/s/2  session intro · #/s/2/3  lesson 3 · #/s/2/done · #/blueprint  their document
   Everything goes through /api/learn. Answers save as they type (to this browser first, in case the signal drops).
   Sign-in: a new email gets in right away; a known email gets a 6-digit code by email. The token stays in this browser. */

const API = "/api/learn";
const PRIVACY_VERSION = "2026-11-11";
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const peso = (n) => `₱${Number(n || 0).toLocaleString("en-PH")}`;
const app = $("#app");
const and = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} & ${a.at(-1)}`);

/* ---------- storage that never breaks the page ---------- */
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const TOKEN = "bp_learn_token";
let token = store.get(TOKEN);
let D = null;   // signed in: me, sessions, work, orders, prices, gcash
let C = null;   // the public catalog, for the course page

/* what they came for: /learn?buy=2 · ?buy=rest · ?from=booth */
const qs = new URLSearchParams(location.search);
const intent = { buy: qs.get("buy"), from: qs.get("from") };
if (qs.toString()) history.replaceState(null, "", location.pathname + location.hash);

/* ---------- icons (stroke, like the site's) ---------- */
const P = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  left: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  home: '<path d="M3 10.5 12 3l9 7.5V21H3z"/><path d="M9 21v-6h6v6"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  out: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l-5-5 5-5M5 12h12"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9M7.5 8a2.5 2.5 0 1 1 4.5-1.5A2.5 2.5 0 1 1 16.5 8"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
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
  if (snap.sessions) D = { me: snap.me, sessions: snap.sessions, work: snap.work || {}, orders: snap.orders || [], prices: snap.prices, gcash: snap.gcash };
  mergeLocal();
}
function signOut(quiet) {
  token = null; D = null; store.del(TOKEN);
  if (!quiet) { location.hash = "#/"; route(); }
}
function msg(e) {
  return { offline: "No connection. Check your signal and try again.", invalid: "Something’s missing. Check each box.", busy: "Lots of people are signing up right now. Try again in a minute.",
    image: "That file didn’t work. Upload a screenshot (JPG or PNG).", big: "That picture is too big. Take a normal screenshot and try that.",
    waiting: "We already have a receipt for that session and we’re checking it.", have: "You already have that session.", signin: "Please sign in again." }[e.code]
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
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast("Copied"); }
  catch { toast("Couldn’t copy. Select the text and copy it instead.", true); }
}

/* ==========================================================================
   Tailoring: three answers shape what we point them to. Plain rules, no AI.
   ========================================================================== */
const GOALS = [
  ["internship", "An internship", "This year or next summer"],
  ["job", "My first job", "Graduating soon"],
  ["org", "An org or EB position", "Applying or running for one"],
  ["scholarship", "A scholarship or exchange", "Essays and interviews"],
  ["explore", "Not sure yet", "Figuring out what fits"],
];
const FIELDS = [["business", "Business & management"], ["creative", "Communications & creative"], ["scitech", "Science, tech & health"], ["policy", "Policy, law & social sciences"], ["humanities", "Humanities & education"], ["other", "Something else"]];
const STAGES = [["none", "No résumé yet", "Starting from zero"], ["rough", "I have one", "It needs work"], ["applying", "I’m applying now", "I need it this week"]];
const HEARD = ["Booth", "Student org", "Friend", "Facebook", "Instagram", "Email", "Other"];
const goalName = (g) => ({ internship: "Internship", job: "First job", org: "Org position", scholarship: "Scholarship or exchange", explore: "Exploring" })[g] || "";
const fieldName = (f) => (FIELDS.find(([k]) => k === f) || [, ""])[1];
const PATH = {
  internship: { title: "Your path to an internship", focus: ["Session 2 is your core: your résumé gets read against one real internship post.", "Your outreach message goes to someone already at a company you’d intern at.", "Session 3 makes you easy to find when a recruiter looks you up."],
    next: ["Paste your Experience bullets into your résumé and apply to five internship posts this week.", "Send your outreach message. Then one more, to a different company.", "Put your headline and About on LinkedIn today.", "Ask a friend to read your résumé against the post and tell you what they remember."] },
  job: { title: "Your path to your first job", focus: ["Session 2 rebuilds your bullets against a real job post, not a generic one.", "Your 30-second intro becomes your interview opener.", "Session 4’s post shows hiring managers your work before they meet you."],
    next: ["Apply to five entry-level posts with your rebuilt bullets.", "Open your next interview with your 30-second intro.", "Send your outreach message to someone a year or two into the role.", "Post your finished piece the week you start applying."] },
  org: { title: "Your path to the org position", focus: ["Session 1’s stories are your interview answers to “Tell us about a time…”", "Use the org’s call for applications as your post in Session 2.", "Your outreach message goes to a current officer or head."],
    next: ["Turn your three proof stories into answers for “Tell us about a time…”", "Message a current officer before you apply.", "Use your career-brand statement as your application’s first line.", "Practise your 30-second intro for the panel."] },
  scholarship: { title: "Your path to the scholarship or exchange", focus: ["Your career-brand statement is the first paragraph of your essay.", "Your proof stories become essay paragraphs and interview answers.", "Use the call or selection criteria as your post in Session 2."],
    next: ["Open your essay with your career-brand statement.", "Build one paragraph around the proof story that best fits their criteria.", "Ask a past scholar or exchange student what the panel asked them.", "Practise your 30-second intro for the interview."] },
  explore: { title: "Your path to knowing what you want", focus: ["Session 1 is built for this: the Brand Journey starts from the outcome you want.", "In Session 2, pick any post that sounds interesting. It’s practice.", "Session 3’s pillars show you what you already care about."],
    next: ["Message one person whose work you’re curious about. Ask what a normal week looks like.", "Share one idea from your four-week plan, even just with friends.", "Redo your Brand Journey in a month and see what changed.", "Keep your Blueprint: it’s the start of every application you’ll write."] },
  "": { title: "Your path", focus: ["Session 1: find what you want to be known for, and the stories that prove it.", "Session 2: put it on paper, in your résumé, your LinkedIn and one message.", "Sessions 3 and 4: plan how people will see your work, and finish one post."],
    next: ["Put your rebuilt bullets on your résumé.", "Send your outreach message to one real person.", "Paste your headline and About into LinkedIn.", "Save your Blueprint as a PDF so it’s ready for the next application."] },
};
const STAGE_NOTE = {
  none: "No résumé yet? Good. Session 1 gives you three proof stories and a résumé bullet for each, so you never start from a blank page.",
  rough: "You already have a résumé. Session 2 is where its weakest bullets get rebuilt, one at a time.",
  applying: "Applying right now? Do Session 1, then go straight to Session 2: that’s where your résumé gets fixed for a real post.",
};
/* "For you" notes on the lessons where their goal or field changes the advice */
const TIPS = {
  "s1-brand-journey": { goal: {
    internship: "Aiming for an internship: name the kind of company, the role and the season, like “a marketing internship at a consumer brand, summer 2027”.",
    job: "Name the role, the kind of company and when: “an analyst role at a bank within six months of graduating”.",
    org: "Name the org, the position and the term: “VP for Internal of [org], next school year”.",
    scholarship: "Name the scholarship or programme, and what it lets you do next.",
    explore: "Not sure? Write the outcome that sounds best right now. You can change it any time." } },
  "s1-intro": { goal: {
    internship: "End with your ask: “I’m looking for a marketing internship this summer.”",
    job: "End with the role you want: “I’m looking for my first analyst role.”",
    org: "End with the position you’re going for, and why you, in one line.",
    scholarship: "End with what the scholarship would let you do. One line, specific.",
    explore: "End with a question: “I’m figuring out if this field is for me. What do you wish you knew?”" } },
  "s2-job-post": { goal: {
    internship: "Search “intern” plus your field on LinkedIn Jobs, JobStreet or Kalibrr, or use a company’s internship call.",
    job: "Pick an entry-level post (0 to 1 years) at a place you’d actually join.",
    org: "Use the org’s call for applications as your post. What problem does this position solve for them?",
    scholarship: "Use the scholarship’s call or selection criteria as your post. Treat each criterion as a requirement.",
    explore: "Pick any post that sounds interesting. This one is practice." } },
  "s2-linkedin-headline": { goal: {
    internship: "Lead with what you’re looking for: “Marketing internships | …”",
    job: "Lead with the role: “Entry-level analyst | …”",
    org: "Lead with the work you do in orgs: “Student org operations | …”" } },
  "s2-message": { goal: {
    internship: "Message someone who interned at, or works at, a company on your list.",
    job: "Message someone a year or two into the role you want.",
    org: "Message a current officer or the head of the org.",
    scholarship: "Message a past scholar or exchange student from your school.",
    explore: "Message someone whose job you’re curious about. Ask what a normal week looks like." } },
  "s3-plan-pick": { field: {
    creative: "In communications and creative work, Instagram is a real portfolio for you, not just a boost.",
    scitech: "In your field, a short project write-up with one photo beats an opinion post.",
    business: "LinkedIn first. Short wins with a number travel well in business.",
    policy: "LinkedIn first. A short take on something you read or did works well.",
    humanities: "Writing is your strength: text posts and short essays suit you." } },
};
const tipFor = (st) => { const t = TIPS[st.id]; return t ? (t.goal?.[D.me.goal] || t.field?.[D.me.field] || "") : ""; };
/* examples that match their field, in the boxes where an example helps most */
const PH = {
  "s1-outcome": { business: "Operations internship at a consumer goods company, summer 2027", creative: "Junior copywriter at a creative agency within six months of graduating", scitech: "Research assistant at a public health lab next school year", policy: "Policy intern at a think tank or government office this summer", humanities: "Program associate at an education nonprofit after graduation" },
  "s2-job-title": { business: "Operations Intern, [Company]", creative: "Content & Social Media Intern, [Agency]", scitech: "Research Intern, [Lab or Company]", policy: "Policy Research Intern, [Think tank]", humanities: "Program Intern, [Nonprofit]" },
};

/* ==========================================================================
   Progress: which lessons are done, how built their Blueprint is
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
  return Math.round((D.sessions.reduce((t, s) => t + doneIds(s).length, 0) / total) * 100);
}
const sessionPct = (s) => (s.outline.length ? Math.round((doneIds(s).length / s.outline.length) * 100) : 0);
const isComplete = (s) => s.outline.length > 0 && doneIds(s).length === s.outline.length;
/* the next thing to do: the first open session that isn't finished, at its first unfinished lesson */
function nextUp() {
  for (const s of D.sessions) {
    if (!s.open || isComplete(s)) continue;
    const done = doneIds(s), i = s.steps.findIndex((st) => !done.includes(st.id));
    return { s, i: i < 0 ? 0 : i, fresh: done.length === 0 && !W(s.n).updatedAt };
  }
  const locked = D.sessions.find((s) => !s.open);
  return locked ? { s: locked, locked: true } : null;
}
const pending = (n) => D.orders.some((o) => o.status === "pending" && o.sessions.includes(n));
const ring = (pct, size = 56) => { const r = 24, c = 2 * Math.PI * r; return `<span class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 56 56" aria-hidden="true"><circle class="t" cx="28" cy="28" r="${r}"/><circle class="f" cx="28" cy="28" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct / 100)).toFixed(1)}"/></svg>${size >= 44 ? `<b>${pct}%</b>` : ""}</span>`; };
const poster = (n, { small = "", lock = false } = {}) => `<div class="poster poster--${n}"><b>${String(n).padStart(2, "0")}</b>${small ? `<small>${esc(small)}</small>` : ""}${lock ? `<span class="lk">${icon("lock")}</span>` : ""}</div>`;

/* ==========================================================================
   Saving: this browser first, then the server (quietly, a moment after they stop typing)
   ========================================================================== */
const localKey = (n) => `bp_work_${D?.me?.email}_${n}`;
const timers = {};
let saveState = "ok";
const SAVE_TXT = { ok: "Saved", busy: "Saving…", bad: "Not saved yet, retrying" };
function setSaved(state) {
  saveState = state;
  const el = $("#saved");
  if (el) { el.className = `saved is-${state}`; el.innerHTML = `<i></i><span>${SAVE_TXT[state]}</span>`; }
}
function touch(n) {
  store.set(localKey(n), { answers: W(n).answers, at: Date.now() });
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
   Their Blueprint: the document their answers build
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
const HEAD = ["headline", "aim", "known"];
const feedsOf = (st) => (st.out ? st.out.map((o) => o.to) : [].concat(st.feeds || [])).filter((f) => f && f !== "none");
/* one template: {id} a value (one line per entry if it's a list) · {id*} a list joined with " · " · [ … ] disappears when empty */
function fill(tpl, answers) {
  const ids = [...tpl.matchAll(/\{([a-z0-9-]+)\}/g)].map((m) => m[1]);
  const listId = ids.find((id) => Array.isArray(answers[id]));
  const rows = listId ? answers[listId].map((_, i) => i) : [null];
  const one = (id, i, star) => {
    let v = answers[id];
    if (Array.isArray(v)) v = star ? v.map((x) => String(x || "").trim()).filter(Boolean).join(" · ") : i === null ? v.filter(Boolean).join(", ") : v[i];
    return String(v || "").trim();
  };
  const out = [];
  for (const i of rows) {
    const needs = [...tpl.replace(/\[[^\]]*\]/g, "").matchAll(/\{([a-z0-9-]+)\*?\}/g)].map((m) => m[1]);
    if (needs.length && !needs.some((id) => one(id, i, true))) continue; // the main answer isn't in yet
    let line = tpl.replace(/\[([^\]]*)\]/g, (_, part) => { let got = false; const t = part.replace(/\{([a-z0-9-]+)(\*?)\}/g, (__, id, star) => { const v = one(id, i, star); if (v) got = true; return v; }); return got ? t : ""; });
    line = line.replace(/\{([a-z0-9-]+)(\*?)\}/g, (_, id, star) => one(id, i, star));
    line = line.replace(/\s+([,.;:])/g, "$1").replace(/^[\s,;:–—·-]+|[\s,;:–—·-]+$/g, "").trim();
    if (line) out.push(line);
  }
  return out;
}
function linesOf(st, answers, key) {
  const o = (st.out || []).find((x) => x.to === key);
  if (o?.compose?.length) return o.compose.flatMap((t) => fill(t, answers));
  return (st.fields || []).flatMap((f) => [].concat(answers[f.id] || [])).map((x) => String(x || "").trim()).filter(Boolean);
}
function docParts() {
  const parts = Object.fromEntries([...SECTIONS.map(([k]) => k), ...HEAD].map((k) => [k, []]));
  for (const s of D.sessions) {
    (s.open ? s.steps : s.outline).forEach((st, i) => {
      for (const key of feedsOf(st)) {
        if (!parts[key]) continue;
        parts[key].push(s.open ? { n: s.n, i, lines: linesOf(st, W(s.n).answers, key), title: st.title } : { n: s.n, i, lines: [], locked: true, title: st.title });
      }
    });
  }
  return parts;
}
const docText = (key) => docParts()[key].flatMap((p) => p.lines).join("\n");
/* the document from data: their Blueprint, and the sample on the course page */
function docMarkup({ name, headline, aim, sub, sections, small = false, copyable = false, pct = null }) {
  const sec = ({ key, label, kind, lines, ph, lock }) => {
    const body = lines.length
      ? (kind === "list" ? `<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : lines.map((l) => `<p>${esc(l)}</p>`).join(""))
      : ph ? `<p class="doc__ph">${esc(ph)}</p>` : lock ? `<p class="doc__lock">${icon("lock")}${esc(lock)}</p>` : "";
    const cp = copyable && lines.length ? `<button class="copy no-print" data-copy="${esc(key)}">${icon("copy")}Copy</button>` : "";
    return `<section class="doc__sec" data-sec="${esc(key)}"><div class="doc__h"><h4>${esc(label)}</h4>${cp}</div>${body}</section>`;
  };
  return `<article class="doc ${small ? "doc--sm" : ""}">
    ${pct !== null && !small ? `<span class="doc__pct no-print">${ring(pct, 52)}</span>` : ""}
    <h3 class="doc__name">${esc(name)}</h3>
    <p class="doc__hl" data-sec="headline">${headline ? esc(headline) : `<span class="doc__ph">Your headline lands here in Session 2</span>`}</p>
    ${sub ? `<p class="doc__meta" data-sec="aim">${aim ? `Aiming for: ${esc(aim)} · ` : ""}${esc(sub)}</p>` : ""}
    ${sections.map(sec).join("")}
  </article>`;
}
function docHTML({ small = false, copyable = false } = {}) {
  const parts = docParts();
  const top = (k) => parts[k].flatMap((p) => p.lines);
  const known = top("known")[0];
  const sections = SECTIONS.filter(([key]) => parts[key].length).map(([key, label, kind]) => {
    const ps = parts[key], lines = ps.flatMap((p) => p.lines);
    const todo = ps.find((p) => !p.locked && !p.lines.length);
    const locked = [...new Set(ps.filter((p) => p.locked).map((p) => p.n))];
    return { key, label, kind, lines, ph: !lines.length && todo ? `Fills in at Session ${todo.n}: ${todo.title}` : "", lock: !lines.length && !todo && locked.length ? `Unlocks in Session ${locked.join(" & ")}` : "" };
  });
  return docMarkup({ name: D.me.name, headline: top("headline")[0] || (known ? `Known for: ${known}` : ""), aim: top("aim").at(-1), sub: D.me.email, sections, small, copyable, pct: readiness() });
}
function refreshDoc(liveKeys = []) {
  for (const slot of $$("[data-doc]")) {
    slot.innerHTML = docHTML({ small: slot.dataset.doc === "sm" });
    for (const k of liveKeys) { const sec = $(`[data-sec="${k}"]`, slot); if (sec) { sec.classList.add("is-live"); setTimeout(() => sec.classList.remove("is-live"), 1000); } }
  }
  const seg = $('.seg [data-tab="doc"]');
  if (seg && !seg.classList.contains("is-on") && liveKeys.length) seg.classList.add("ping");
  chrome();
}

/* ==========================================================================
   Chrome: the top bar, the phone tabs, the account menu
   ========================================================================== */
const where = () => location.hash.replace(/^#\/?/, "").split("/");
const initials = (name) => (name.match(/\b\p{L}/gu) || ["B"]).slice(0, 2).join("").toUpperCase();
function chrome() {
  const nav = $("#barNav"), right = $("#barRight"), tabs = $("#tabbar"), h = where();
  if (!D) {
    nav.innerHTML = [["curriculum", "Curriculum"], ["pricing", "Pricing"], ["faq", "FAQ"]].map(([id, t]) => `<a href="#" data-scroll="${id}">${t}</a>`).join("");
    right.innerHTML = `<button class="btn btn--ghost btn--sm" data-signin>Sign in</button><button class="btn btn--primary btn--sm" data-startfree>Start free</button>`;
    tabs.hidden = true; document.body.classList.remove("has-tabs");
    return;
  }
  const cur = nextUp()?.s?.n || 1, r = readiness(), lessonN = h[0] === "s" ? h[1] : cur;
  const on = (k) => ((k === "home" ? !h[0] || h[0] === "tailor" : k === "learn" ? h[0] === "s" : h[0] === "blueprint") ? "is-on" : "");
  nav.innerHTML = `<a href="#/" class="${on("home")}">My learning</a><a href="#/s/${lessonN}" class="${on("learn")}">Lessons</a><a href="#/blueprint" class="${on("doc")}">My Blueprint</a>`;
  right.innerHTML = `<a class="meter" href="#/blueprint" title="How built your Blueprint is">${ring(r, 28)}<b>${r}%</b><span>built</span></a>
    <button class="avatar" id="me" aria-label="Your account" aria-haspopup="menu">${esc(initials(D.me.name))}</button>`;
  $("#me").onclick = (e) => { e.stopPropagation(); toggleMenu(); };
  tabs.hidden = false; document.body.classList.add("has-tabs");
  tabs.innerHTML = `<a href="#/" class="${on("home")}">${icon("home")}Home</a><a href="#/s/${lessonN}" class="${on("learn")}">${icon("list")}Lessons</a><a href="#/blueprint" class="${on("doc")}">${icon("doc")}Blueprint</a>`;
}
function toggleMenu() {
  const old = $(".menu");
  if (old) return old.remove();
  const m = document.createElement("div");
  m.className = "menu"; m.setAttribute("role", "menu");
  m.innerHTML = `<p><b>${esc(D.me.name)}</b>${esc(D.me.email)}</p>
    <a href="#/tailor" role="menuitem">${icon("target")}Tailor my path</a>
    <a href="/" role="menuitem">${icon("globe")}Blueprint site</a>
    <button role="menuitem" id="outBtn">${icon("out")}Sign out</button>`;
  $(".bar__in").append(m);
  $("#outBtn", m).onclick = () => { if (confirm("Sign out of Blueprint on this device? Your answers stay saved.")) signOut(); };
}
document.addEventListener("click", (e) => {
  if (!e.target.closest(".menu") && !e.target.closest("#me")) $(".menu")?.remove();
  const sc = e.target.closest("[data-scroll]");
  if (sc) { e.preventDefault(); document.getElementById(sc.dataset.scroll)?.scrollIntoView({ behavior: "smooth" }); }
  if (e.target.closest("[data-signin]")) { e.preventDefault(); openSignIn(); }
  if (e.target.closest("[data-startfree]")) { e.preventDefault(); goJoin(); }
  const un = e.target.closest("[data-unlock]");
  if (un && D) { e.preventDefault(); openUnlock(un.dataset.unlock === "rest" ? null : Number(un.dataset.unlock)); }
  const cp = e.target.closest("[data-copy]");
  if (cp && D) copy(docText(cp.dataset.copy));
});
function goJoin() {
  const j = $("#join");
  if (!j) return;
  j.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => $("#j-name")?.focus({ preventScroll: true }), 450);
}

/* ==========================================================================
   Signed out: the course page
   ========================================================================== */
const SAMPLE = {
  name: "Alonso Reyes", headline: "Operations internships | Built the officer handover system that halved first-month dropouts | Management, Ateneo",
  aim: "Operations internship at a development NGO", sub: "Sample Blueprint (made up, for teaching)",
  sections: [
    { key: "statement", label: "Career-brand statement", kind: "p", lines: ["I build the systems that keep volunteer teams from falling apart."] },
    { key: "intro", label: "30-second intro", kind: "p", lines: ["Six of our new officers quit in their first month. I rebuilt the handover, and it fell to three. I’m known for making org systems people actually use, and I’m looking for an operations internship this summer."] },
    { key: "exp", label: "Experience", kind: "list", lines: ["VP for Internal, [Org]: Built a 12-page officer handover kit and ran two turnover workshops for 18 incoming officers; first-month dropouts fell from 6 to 3."] },
    { key: "msg", label: "Outreach message", kind: "p", lines: ["Hi Ms. Reyes, I found you on the alumni page while looking at operations roles at [Company]…"] },
  ],
};
const FAQ = [
  ["Is Session 1 really free?", "Yes. Sign up with your name and email and start right away. No payment, no card, no password. You only pay if you want Sessions 2 to 4."],
  ["How do I pay?", "By GCash. Inside the course, tap a locked session, scan our QR, and upload a screenshot of your receipt. The session opens right away, and we double-check every receipt within a day."],
  ["Do I have to finish in one sitting?", "No. Your answers save as you type, on your phone or laptop. Close the tab and pick up where you left off, any day."],
  ["Who is it for?", "College students in any year, and fresh grads: whether you’re going for an internship, a first job, an org position or a scholarship."],
  ["I bought a ticket for the live workshop. Do I pay again?", "No. Sign up with the same email you registered with, and every session opens for free."],
  ["Who sees my answers?", "You, and Blueprint’s core team so we can help. We don’t share them with anyone. See our privacy notice."],
];
async function renderLanding() {
  chrome();
  document.title = "Blueprint Online — Build your career brand";
  if (!C) { try { C = await call("catalog"); } catch { C = { sessions: [], prices: { single: 149, bundle: 349 } }; } }
  const pr = C.prices, ss = C.sessions;
  const mins = ss.reduce((t, s) => t + (s.minutes || 0), 0);
  const lessons = ss.reduce((t, s) => t + s.lessons.length, 0);
  const s1 = ss.find((s) => s.n === 1);
  const crow = (s) => `<details class="crow" ${s.n === 1 ? "open" : ""}>
    <summary><span class="crow__n">${String(s.n).padStart(2, "0")}</span>
      <span class="crow__t"><b>${esc(s.title)}</b><span>${esc(s.tagline)}${s.minutes ? ` · about ${s.minutes} min` : ""} · ${s.lessons.length} lessons</span></span>
      <span class="crow__r">${s.free ? `<span class="tag tag--free">Free</span>` : `<span class="tag">${peso(pr.single)}</span>`}<span class="crow__chev" aria-hidden="true">+</span></span></summary>
    <div class="crow__body"><div><h4>You’ll make</h4><p class="soft">${esc(s.leaveWith)}</p></div><div><h4>Lessons</h4><ol>${s.lessons.map((t) => `<li>${esc(t)}</li>`).join("")}</ol></div></div>
  </details>`;
  app.innerHTML = `
  <section class="hero"><div class="wrap hero__grid">
    <div class="fadeup">
      <p class="kicker">Blueprint Online · Self-paced course</p>
      <h1 class="display h1">Build your <span class="grad">Blueprint.</span></h1>
      <p class="lede">Four short sessions that turn what you’ve done in school, orgs and internships into a résumé, a LinkedIn and an intro people remember. Your answers build the document as you go.</p>
      <ul class="facts">
        <li>${icon("gift")}<span><b>Session 1 free</b></span></li>
        <li>${icon("clock")}<span>${mins ? `About <b>${(Math.round(mins / 30) / 2).toString()} hours</b> · ` : ""}${lessons || 35} lessons</span></li>
        <li>${icon("phone")}<span>On your phone, <b>at your pace</b></span></li>
        <li>${icon("doc")}<span>Leave with <b>your Blueprint</b></span></li>
      </ul>
      <ol class="outline stagger">${ss.map((s) => `<li>${poster(s.n)}<span><b>${esc(s.title)}</b><small>${esc(s.tagline)} · ${s.lessons.length} lessons</small></span>${s.free ? `<span class="tag tag--free">Free</span>` : `<span class="tag">${icon("lock")}${peso(pr.single)}</span>`}</li>`).join("")}</ol>
    </div>
    <div class="join fadeup" id="join">
      <h2 class="join__title">Start Session 1 free</h2>
      <p class="join__sub">No payment, no password. Your answers save as you go.</p>
      <form id="joinForm" novalidate>
        <div class="field"><label for="j-name">Full name</label><input class="in" id="j-name" name="name" autocomplete="name" maxlength="120" placeholder="Juan dela Cruz" /></div>
        <div class="field"><label for="j-email">Email</label><input class="in" id="j-email" name="email" type="email" autocomplete="email" inputmode="email" maxlength="200" placeholder="you@email.com" /></div>
        <div class="field"><label for="j-year">Year</label><select class="sel" id="j-year" name="year"><option value="" disabled selected>Pick one</option><option>1st year</option><option>2nd year</option><option>3rd year</option><option>4th year</option><option>Fresh grad</option><option>Other</option></select></div>
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
        <label class="consent"><input type="checkbox" name="consent" /><span>I agree to the <a href="/privacy.html" target="_blank" rel="noopener">privacy notice</a>. Blueprint keeps my name, email, year and answers to run the course.</span></label>
        <p class="err" id="jErr" role="alert"></p>
        <button class="btn btn--primary btn--lg btn--block" type="submit" style="margin-top:16px">Start free ${arrow}</button>
      </form>
      <p class="join__alt">Already started? <button class="link" data-signin>Sign in</button></p>
    </div>
  </div></section>

  <section class="section section--white"><div class="wrap make">
    <div>
      <p class="kicker">What you’ll make</p>
      <h2 class="display h2">Walk away with <span class="grad">something to show.</span></h2>
      <p class="lede">Every lesson ends with something real. Your answers drop into one document, so by the end it’s already written.</p>
      <ul class="ticks" style="margin-top:22px">
        <li>A career-brand statement you can say in one breath</li><li>Three proof stories, each turned into a résumé bullet</li>
        <li>Résumé bullets rebuilt for one real job post</li><li>Your LinkedIn headline, About and Featured</li>
        <li>One message to one real person</li><li>A four-week plan and one finished post</li>
      </ul>
    </div>
    <div class="make__doc"><span class="tag tag--free" style="position:absolute;top:-12px;left:22px;z-index:2">Sample</span>${docMarkup({ ...SAMPLE })}</div>
  </div></section>

  <section class="section" id="curriculum"><div class="wrap">
    <div class="section__head"><p class="kicker">Curriculum</p><h2 class="display h2">${ss.length || 4} sessions. <span class="grad">One blueprint.</span></h2></div>
    <div class="curr">${ss.map(crow).join("")}</div>
  </div></section>

  <section class="section section--white" id="pricing"><div class="wrap">
    <div class="section__head"><p class="kicker">Pricing</p><h2 class="display h2">Start free. <span class="grad">Pay for what you want.</span></h2></div>
    <div class="prices">
      <article class="price"><span class="price__name">Session 1</span><p class="price__amt"><b>Free</b></p><ul class="ticks"><li>The video lesson and all ${s1?.lessons.length || 10} lessons</li><li>Your statement, stories and intro</li><li>Keep everything you make</li></ul><button class="btn btn--ghost btn--block" data-startfree>Start free</button></article>
      <article class="price"><span class="price__name">One session</span><p class="price__amt"><b>${peso(pr.single)}</b>each</p><ul class="ticks"><li>Pick any of Sessions 2 to 4</li><li>Opens right after you pay</li><li>Want the rest later? Pay just the difference</li></ul><button class="btn btn--ghost btn--block" data-startfree>Start with Session 1</button></article>
      <article class="price price--best"><span class="price__badge">Best value</span><span class="price__name">Sessions 2 to 4</span><p class="price__amt"><b>${peso(pr.bundle)}</b>for all three</p><ul class="ticks"><li>The whole course</li><li>Save ${peso(pr.single * 3 - pr.bundle)} on three singles</li><li>Your full Blueprint, ready to send</li></ul><button class="btn btn--primary btn--block" data-startfree>Start free, unlock later</button></article>
    </div>
    <p class="fine" style="margin-top:18px">Pay by GCash inside the course and upload your receipt. Sessions open right away.</p>
  </div></section>

  <section class="section"><div class="wrap">
    <div class="section__head"><p class="kicker">Your facilitators</p><h2 class="display h2">Made by the people <span class="grad">who run it live.</span></h2></div>
    <div class="people">
      <article class="person"><div class="person__pic">TS</div><div><h3>Thomas Santos</h3><p class="person__role">Workshop Director and Facilitator</p><p class="person__bio">Thomas runs Blueprint. He’s finishing AB Development Studies at Ateneo, where his thesis turns research into workshops for mission-driven organizations. He co-leads EZ Run Club and is building Unseen Media, a creative and communications agency.</p></div></article>
      <article class="person"><div class="person__pic">KB</div><div><h3>Kurt Boquiren</h3><p class="person__role">Session 3 Facilitator</p><p class="person__bio">Kurt works in learning and organizational development. At Breakthrough Leadership, he co-designs leadership programs, workbooks and digital toolkits for local and global clients. He graduated magna cum laude from iACADEMY in Marketing Management.</p></div></article>
    </div>
  </div></section>

  <section class="section section--white" id="faq"><div class="wrap" style="max-width:900px">
    <div class="section__head"><p class="kicker">FAQ</p><h2 class="display h2">Questions, <span class="grad">answered.</span></h2></div>
    <div class="faq">${FAQ.map(([q, a]) => `<details class="qa"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>
  </div></section>

  <section class="final"><div class="wrap">
    <h2 class="display h2">Build <span class="grad">yours.</span></h2>
    <p>Session 1 takes about ${s1?.minutes || 40} minutes and costs nothing. Start now, finish whenever.</p>
    <button class="btn btn--light btn--lg" data-startfree>Start Session 1 free ${arrow}</button>
  </div></section>

  <footer class="foot"><div class="wrap"><span>Blueprint is an LAS50 student venture at Ateneo de Manila.</span>
    <nav><a href="/">Blueprint site</a><a href="/privacy.html">Privacy</a><a href="/#ask">Ask us</a></nav></div></footer>
  <button class="btn btn--primary btn--lg mcta" id="mcta" data-startfree>Start Session 1 free ${arrow}</button>`;
  $("#joinForm").onsubmit = onJoin;
  // phones: a "Start free" button follows them once the form scrolls out of view above
  new IntersectionObserver(([e]) => $("#mcta")?.classList.toggle("is-on", !e.isIntersecting && e.boundingClientRect.top < 0)).observe($("#join"));
  if (intent.buy) setTimeout(goJoin, 300);
}
async function onJoin(e) {
  e.preventDefault();
  const f = e.target, v = Object.fromEntries(new FormData(f)), err = $("#jErr");
  err.textContent = "";
  if (!v.name.trim()) return (err.textContent = "Please type your name.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email.trim())) return (err.textContent = "That email doesn’t look right.");
  if (!v.year) return (err.textContent = "Please pick your year.");
  if (!f.consent.checked) return (err.textContent = "Please tick the privacy box to continue.");
  const btn = e.submitter || $("button[type=submit]", f);
  busy(btn, true, "Starting");
  try {
    const email = v.email.trim().toLowerCase();
    const r = await call("start", { name: v.name.trim(), email, year: v.year, heard_from: intent.from === "booth" ? "Booth" : "", consent: true, privacy_version: PRIVACY_VERSION, website: v.website });
    if (r.needCode) { busy(btn, false); return openSignIn(email, "code", `Welcome back! <b>${esc(email)}</b> already has a Blueprint, so we emailed you a 6-digit code to sign in.`); }
    take(r);
    toast("You’re in. Session 1 is open.");
    tailorMode = "first";
    location.hash = "#/tailor";
  } catch (ex) { busy(btn, false); err.textContent = msg(ex); }
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
function openSignIn(email = "", mode = "email", note = "") {
  if (mode === "email") {
    const box = openSheet(`<h2 class="sheet__title">Welcome back</h2><p class="soft">Type the email you started with. We’ll send you a 6-digit code. No password needed.</p>
      <form id="inForm" novalidate style="margin-top:18px"><div class="field"><label for="i-email">Email</label><input class="in" id="i-email" type="email" autocomplete="email" inputmode="email" value="${esc(email)}" placeholder="you@email.com" /></div>
      <p class="err" id="iErr" role="alert"></p><button class="btn btn--primary btn--lg btn--block" type="submit" style="margin-top:6px">Send my code ${arrow}</button></form>
      <p class="fine">New here? <button class="link" id="toJoin">Start Session 1 free</button></p>`);
    $("#i-email", box).focus();
    $("#toJoin", box).onclick = () => { closeSheet(); goJoin(); };
    $("#inForm", box).onsubmit = async (e) => {
      e.preventDefault();
      const em = $("#i-email", box).value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return ($("#iErr", box).textContent = "That email doesn’t look right.");
      const btn = $("button[type=submit]", box); busy(btn, true, "Sending");
      try { await call("code", { email: em }); openSignIn(em, "code"); }
      catch (err) { busy(btn, false); $("#iErr", box).textContent = msg(err); }
    };
    return;
  }
  const box = openSheet(`<h2 class="sheet__title">Check your email</h2>
    <p class="soft">${note || `If <b>${esc(email)}</b> has a Blueprint, a 6-digit code is on its way. Check Spam too.`}</p>
    <form id="codeForm" novalidate style="margin-top:18px"><div class="field"><label for="c-code">6-digit code</label><input class="in otp" id="c-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="••••••" /></div>
    <p class="err" id="cErr" role="alert"></p><button class="btn btn--primary btn--lg btn--block" type="submit" style="margin-top:6px">Sign in ${arrow}</button></form>
    <p class="fine">No code after a minute? <button class="link" id="again">Send it again</button> · <button class="link" id="other">Use another email</button></p>`);
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
    try { take(await call("verify", { email, code: input.value })); closeSheet(); toast(`Welcome back, ${esc(D.me.first)}`); afterIn(); }
    catch (err) {
      busy(btn, false); input.value = ""; input.focus();
      $("#cErr", box).textContent = err.code === "wrong" ? `That code isn’t right.${err.data?.left ? ` ${err.data.left} tries left.` : " Ask for a new one."}`
        : err.code === "expired" ? "That code expired or was used. Tap “Send it again”." : msg(err);
    }
  };
}
/* the three tailoring questions show up right after sign-up ("first"), and once on each device when someone who
   hasn't answered them signs in or comes back ("welcome": workshop ticket holders, people who skipped). "edit" from the menu. */
let tailorMode = "edit";
const askedKey = () => `bp_tailor_asked_${D?.me?.email}`;
const shouldAsk = () => D && !D.me.goal && !store.get(askedKey());
function afterIn() {
  if (intent.buy) {
    const n = intent.buy === "rest" ? null : Number(intent.buy);
    intent.buy = null;
    if (location.hash !== "#/") location.hash = "#/"; else route();
    setTimeout(() => { if (n === null || (S(n) && !S(n).open)) openUnlock(n); else if (S(n)) location.hash = `#/s/${n}`; }, 120);
    return;
  }
  if (location.hash === "#/" || !location.hash) route(); else location.hash = "#/";
}

/* ==========================================================================
   Tailor it to you: three quick taps
   ========================================================================== */
function renderTailor() {
  chrome();
  document.title = "Tailor Blueprint to you · Blueprint Online";
  const me = D.me, mode = tailorMode;
  store.set(askedKey(), 1);
  const T = {
    first: { kicker: "One last thing", lede: "Three quick taps. We’ll point you to the parts that matter most for what you want, with examples from your field. Change it any time.", go: "Start Session 1", skip: "Skip for now", to: "#/s/1" },
    welcome: { kicker: `Welcome back, ${esc(me.first)}`, lede: "Before you jump back in: three quick taps, so we can point you to the parts that matter most for what you want, with examples from your field. Change it any time.", go: "Show me my plan", skip: "Skip for now", to: "#/" },
    edit: { kicker: "Your path", lede: "Three quick taps. We’ll point you to the parts that matter most for what you want, with examples from your field. Change it any time.", go: "Save my path", skip: "Cancel", to: "#/" },
  }[mode] || {};
  const cards = (name, list, cur) => `<div class="cards" role="radiogroup">${list.map(([v, b, s]) => `<label><input type="radio" name="${name}" value="${v}" ${cur === v ? "checked" : ""} /><span><b>${esc(b)}</b>${s ? `<small>${esc(s)}</small>` : ""}</span></label>`).join("")}</div>`;
  const chips = (name, list, cur) => `<div class="chips" role="radiogroup">${list.map(([v, b]) => `<label><input type="radio" name="${name}" value="${v}" ${cur === v ? "checked" : ""} /><span>${esc(b)}</span></label>`).join("")}</div>`;
  app.innerHTML = `<div class="wrap"><form class="tailor fadeup" id="tailorForm">
    <p class="kicker">${T.kicker}</p>
    <h1 class="display h2">Tailor Blueprint <span class="grad">to you.</span></h1>
    <p class="lede">${T.lede}</p>
    <div class="q"><p class="q__t"><span>1</span>What are you working toward?</p>${cards("goal", GOALS, me.goal)}</div>
    <div class="q"><p class="q__t"><span>2</span>What field are you in?</p>${chips("field", FIELDS, me.field)}</div>
    <div class="q"><p class="q__t"><span>3</span>Where’s your résumé at?</p>${cards("stage", STAGES, me.stage)}</div>
    ${!me.heard ? `<div class="q"><p class="q__t" style="font-size:1.05rem"><span>+</span>How did you hear about Blueprint? <span class="opt">optional</span></p>${chips("heard", HEARD.map((x) => [x, x]), "")}</div>` : ""}
    <div class="tailor__go"><button class="btn btn--primary btn--lg" type="submit">${T.go} ${arrow}</button><button type="button" class="link" id="skip">${T.skip}</button></div>
  </form></div>`;
  $("#skip").onclick = () => { tailorMode = "edit"; location.hash = T.to; };
  $("#tailorForm").onsubmit = async (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    const btn = e.submitter; busy(btn, true, "Saving");
    try {
      take(await call("profile", { goal: v.goal || "", field: v.field || "", stage: v.stage || "", ...(v.heard ? { heard_from: v.heard } : {}) }));
      tailorMode = "edit";
      toast(v.goal ? `Tailored for: ${goalName(v.goal)}` : "Saved");
      location.hash = T.to;
    } catch (ex) { busy(btn, false); toast(msg(ex), true); }
  };
}

/* ==========================================================================
   My learning: the dashboard
   ========================================================================== */
function greet() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }
function renderHome() {
  chrome();
  document.title = "My learning · Blueprint Online";
  const nx = nextUp(), me = D.me, path = PATH[me.goal] || PATH[""], r = readiness();
  const chips = me.goal || me.field
    ? `${me.goal ? `<span class="tag tag--open">${icon("target")}${esc(goalName(me.goal))}</span>` : ""}${me.field ? `<span class="tag">${esc(fieldName(me.field))}</span>` : ""}<a class="link small" href="#/tailor">Edit</a>`
    : `<a class="btn btn--ghost btn--sm" href="#/tailor">${icon("target")}Tailor Blueprint to you</a>`;
  let resume;
  if (nx && !nx.locked) {
    const st = nx.s.steps[nx.i], pct = sessionPct(nx.s);
    resume = `<a class="card resume fadeup" href="#/s/${nx.s.n}${nx.fresh ? "" : `/${nx.i + 1}`}">
      ${poster(nx.s.n, { small: `Session ${nx.s.n}` })}
      <div class="resume__t"><p class="kicker" style="margin:0">${nx.fresh ? "Start here" : "Continue where you left off"}</p>
        <h2 class="h3">Session ${nx.s.n}: ${esc(nx.s.title)}</h2>
        <p class="soft">${nx.fresh ? esc(nx.s.leaveWith) : `Lesson ${nx.i + 1} of ${nx.s.steps.length} · ${esc(st?.title || "")}`}</p>
        <div class="resume__row"><span class="bar-p"><i style="width:${pct}%"></i></span><span class="soft small">${pct}%</span><span class="btn btn--primary">${nx.fresh ? "Start" : "Resume"} ${arrow}</span></div></div></a>`;
  } else if (nx?.locked) {
    const wait = pending(nx.s.n);
    resume = `<div class="card resume fadeup">${poster(nx.s.n, { small: `Session ${nx.s.n}`, lock: true })}
      <div class="resume__t"><p class="kicker" style="margin:0">${wait ? "Checking your receipt" : "Up next"}</p><h2 class="h3">Session ${nx.s.n}: ${esc(nx.s.title)}</h2><p class="soft">${esc(nx.s.leaveWith)}</p>
      <div class="resume__row">${wait ? `<span class="tag tag--wait">We’re checking your receipt</span>` : `<button class="btn btn--primary" data-unlock="${nx.s.n}">Unlock for ${peso(D.prices.single)} ${arrow}</button>`}</div></div></div>`;
  } else {
    resume = `<div class="card resume fadeup">${poster(4, { small: "Complete" })}<div class="resume__t"><p class="kicker" style="margin:0">Course complete</p><h2 class="h3">You built your Blueprint.</h2><p class="soft">Save it as a PDF, paste your LinkedIn parts, and send that first message.</p><div class="resume__row"><a class="btn btn--primary" href="#/blueprint">Open my Blueprint ${arrow}</a></div></div></div>`;
  }
  const scard = (s) => {
    const pct = sessionPct(s), done = isComplete(s), wait = !s.open && pending(s.n);
    const tag = s.free ? `<span class="tag tag--free">Free</span>` : s.open ? (done ? `<span class="tag tag--done">${icon("check")}Done</span>` : `<span class="tag tag--open">Unlocked</span>`) : wait ? `<span class="tag tag--wait">Checking receipt</span>` : `<span class="tag">${icon("lock")}${peso(D.prices.single)}</span>`;
    const href = s.open ? `href="#/s/${s.n}"` : `href="#" data-unlock="${s.n}"`;
    return `<a class="card scard ${s.open ? "" : "scard--locked"}" ${href}>
      ${poster(s.n, { small: s.tagline, lock: !s.open })}
      <div class="scard__t"><b>${esc(s.title)}</b><span>${esc(s.leaveWith)}</span></div>
      <div class="scard__f">${s.open ? `<span class="bar-p"><i style="width:${pct}%"></i></span><span>${doneIds(s).length}/${s.outline.length} lessons</span>` : `<span>${s.outline.length} lessons${s.minutes ? ` · ${s.minutes} min` : ""}</span>`}${tag}</div></a>`;
  };
  const rest = D.prices.restSessions;
  const bundle = rest.length > 1 && !rest.some(pending) ? `<div class="unlock"><div><h3 class="h3">Unlock Sessions ${and(rest.map(String))}</h3>
    <p>${rest.length * D.prices.single > D.prices.rest ? `<s>${peso(rest.length * D.prices.single)}</s>` : ""}<b>${peso(D.prices.rest)}</b> for all ${rest.length}.${D.prices.spent ? ` You already paid ${peso(D.prices.spent)}, so this is just the difference.` : " They open right after you pay."}</p></div>
    <button class="btn btn--light" data-unlock="rest">Unlock all · ${peso(D.prices.rest)}</button></div>` : "";
  app.innerHTML = `<div class="wrap dash">
    <div class="hello fadeup"><h1 class="display">${greet()}, ${esc(me.first)}.</h1><div class="path">${chips}</div></div>
    <div class="dash__grid">
      <div>
        ${resume}
        ${ordersNote()}
        <div class="blockhead"><h2>Your sessions</h2><span>${D.sessions.filter(isComplete).length} of ${D.sessions.length} done</span></div>
        <div class="sgrid stagger">${D.sessions.map(scard).join("")}</div>
        ${bundle}
      </div>
      <aside class="side-stack">
        <div class="card card--pad plan fadeup"><p class="kicker">${icon("target")}${me.goal ? esc(goalName(me.goal)) : "Your plan"}</p><h3 class="h3">${esc(path.title)}</h3><ul class="ticks">${path.focus.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
          ${me.stage && STAGE_NOTE[me.stage] ? `<p class="plan__note">${esc(STAGE_NOTE[me.stage])}</p>` : !me.goal ? `<p class="plan__note">Tell us what you’re working toward and we’ll tailor this. <a class="link" href="#/tailor">Tailor it</a></p>` : ""}</div>
        <a class="card card--pad mini" href="#/blueprint" style="text-decoration:none">${ring(r)}<div><h3 class="h3" style="font-size:1.15rem">Your Blueprint</h3><p>${r ? `${r}% built. Every lesson adds to it.` : "Your first lesson starts it."}</p></div></a>
        <div class="card card--pad"><p class="kicker">${icon("sparkle")}Next moves</p><h3 class="h3" style="font-size:1.15rem">After the course</h3><ul class="ticks" style="margin-top:12px">${path.next.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
      </aside>
    </div></div>`;
}
function ordersNote() {
  const wait = D.orders.filter((o) => o.status === "pending"), bad = D.orders.filter((o) => o.status === "rejected" && !o.sessions.every((n) => S(n).open));
  return wait.map((o) => `<p class="note">Order <b>${esc(o.code)}</b> (${peso(o.amount)}): we’re checking your GCash receipt.${o.sessions.every((n) => S(n).open) ? " You can already use it." : ""}</p>`).join("")
    + bad.map((o) => `<p class="note note--bad">Order <b>${esc(o.code)}</b>: we couldn’t match that receipt.${o.note ? ` ${esc(o.note)}` : ""} Upload the right one to unlock.</p>`).join("");
}

/* ==========================================================================
   The lesson player: intro (0) → lessons 1..n → done
   ========================================================================== */
function videoEmbed(url) {
  if (!url) return null;
  let m;
  if ((m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/))) return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1&playsinline=1`;
  if ((m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/))) return `https://drive.google.com/file/d/${m[1]}/preview`;
  if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/))) return `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ""}`;
  return null;
}
let sideTab = "lessons";
function lessonList(s, here) {
  const done = doneIds(s);
  return `<ul class="ls"><li><a href="#/s/${s.n}" class="is-intro ${here === 0 ? "is-here" : ""}"><span class="st">${icon("play")}</span><span>Intro: watch the lesson</span></a></li>
    ${s.steps.map((st, k) => `<li><a href="#/s/${s.n}/${k + 1}" class="${done.includes(st.id) ? "is-done" : ""} ${here === k + 1 ? "is-here" : ""}"><span class="st">${done.includes(st.id) ? icon("check") : ""}</span><span>${k + 1}. ${esc(st.title)}</span></a></li>`).join("")}</ul>`;
}
function sidePanel(s, here) {
  const nxt = D.sessions.find((x) => x.n === s.n + 1), pct = sessionPct(s);
  const up = nxt ? `<a class="side__next" ${nxt.open ? `href="#/s/${nxt.n}"` : `href="#" data-unlock="${nxt.n}"`}>Up next<b>Session ${nxt.n}: ${esc(nxt.title)}</b>${nxt.open ? "" : `<span class="tag" style="margin-top:8px">${icon("lock")}${peso(D.prices.single)}</span>`}</a>` : "";
  return `<aside class="card side">
    <div class="side__head"><p class="kicker">Session ${s.n}${s.free ? " · Free" : ""}</p><b>${esc(s.title)}</b><span class="bar-p"><i style="width:${pct}%"></i></span><small>${doneIds(s).length} of ${s.steps.length} lessons done</small></div>
    <div class="seg" role="tablist"><button data-tab="lessons" class="${sideTab === "lessons" ? "is-on" : ""}">Lessons</button><button data-tab="doc" class="${sideTab === "doc" ? "is-on" : ""}">My Blueprint</button></div>
    <div class="side__body">${sideTab === "lessons" ? lessonList(s, here) + up : `<div data-doc="sm">${docHTML({ small: true })}</div>`}</div>
  </aside>`;
}
function redrawSide(s, here) {
  const side = $(".side");
  if (!side) return;
  const scroll = $(".side__body", side)?.scrollTop || 0;
  side.outerHTML = sidePanel(s, here);
  $(".side .side__body").scrollTop = scroll;
  $$(".seg [data-tab]").forEach((b) => (b.onclick = () => { sideTab = b.dataset.tab; redrawSide(s, here); }));
}
function renderSession(n, i) {
  const s = S(n);
  if (!s) { location.hash = "#/"; return; }
  if (!s.open) { location.hash = "#/"; return setTimeout(() => openUnlock(Number(n)), 80); }
  chrome();
  const total = s.steps.length;
  if (i === "done") return renderDone(s);
  i = Math.max(0, Math.min(Number(i) || 0, total));
  document.title = `${i ? s.steps[i - 1].title : s.title} · Blueprint Online`;
  const crumbs = `<nav class="crumbs"><a href="#/">My learning</a>${icon("chev")}<a href="#/s/${s.n}">Session ${s.n}: ${esc(s.title)}</a>${i ? `${icon("chev")}<span>Lesson ${i}</span>` : ""}</nav>`;
  const mbar = `<div class="mbar"><button class="btn btn--ghost btn--sm" id="mLessons">${icon("list")}Lessons ${doneIds(s).length}/${total}</button><button class="btn btn--ghost btn--sm" id="mDoc">${icon("doc")}My Blueprint</button></div>`;
  const main = i === 0 ? intro(s) : lessonView(s, s.steps[i - 1], i);
  const next = i === 0 ? `<a class="btn btn--primary btn--lg" href="#/s/${s.n}/1">Start lesson 1 ${arrow}</a>`
    : `<button class="btn btn--primary btn--lg" id="nextBtn">${i === total ? "Finish session" : "Next lesson"} ${arrow}</button>`;
  app.innerHTML = `<div class="wrap player">
    <section>${crumbs}${mbar}<div class="fadeup">${main}</div>
      <div class="lnav">${i > 0 ? `<button class="btn btn--ghost" id="prevBtn" aria-label="Previous">${icon("left")}Back</button>` : `<span></span>`}
        ${i > 0 ? `<span class="saved is-${saveState}" id="saved"><i></i><span>${SAVE_TXT[saveState]}</span></span>` : ""}${next}</div>
    </section>
    ${sidePanel(s, i)}
  </div>`;
  redrawSide(s, i);
  $("#mLessons").onclick = () => { const box = openSheet(`<p class="kicker">Session ${s.n}</p><h2 class="sheet__title">${esc(s.title)}</h2><div style="margin-top:12px">${lessonList(s, i)}</div>`); $$("a", box).forEach((a) => a.addEventListener("click", closeSheet)); };
  $("#mDoc").onclick = () => openSheet(`<p class="kicker">Live preview</p><h2 class="sheet__title">My Blueprint</h2><div style="margin-top:14px" data-doc="full">${docHTML()}</div><a class="btn btn--ghost btn--block" href="#/blueprint" style="margin-top:14px">Open full Blueprint</a>`, "sheet__box--doc");
  if (i > 0) {
    wireFields(s, s.steps[i - 1], i);
    $("#nextBtn").onclick = () => leaveLesson(s, i === total ? "done" : i + 1);
    $("#prevBtn").onclick = () => leaveLesson(s, i - 1);
  }
}
function leaveLesson(s, to) {
  const finishing = to === "done";
  push(s.n, { complete: finishing && isComplete(s) });
  if (finishing && !isComplete(s)) {
    const left = s.steps.filter((st) => !stepDone(st, W(s.n).answers)).length;
    if (left) toast(`${left} lesson${left > 1 ? "s" : ""} still empty. Come back any time.`, true);
  }
  location.hash = to ? `#/s/${s.n}/${to}` : `#/s/${s.n}`;
}
function intro(s) {
  const src = videoEmbed(s.video);
  const video = src
    ? `<div class="video"><iframe src="${esc(src)}" title="Session ${s.n} lesson video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>`
    : `<div class="video poster poster--${s.n}"><span class="poster__t">Session ${s.n} · ${esc(s.tagline)}</span><b>${String(s.n).padStart(2, "0")}</b><span class="soon">${icon("play")}Video lesson uploading soon</span></div>`;
  const ideas = (s.lesson || []).map((c, k) => `<details class="idea" ${k === 0 ? "open" : ""}><summary><span class="n">${k + 1}</span>${esc(c.heading)}${icon("down", "chev")}</summary><ul>${(c.points || []).map((p) => `<li>${esc(p)}</li>`).join("")}</ul></details>`).join("");
  return `<div class="lesson__head"><p class="kicker">Session ${s.n} · Intro${s.minutes ? ` · about ${s.minutes} min` : ""}</p><h1 class="display">${esc(s.title)}</h1><p>${esc(s.leaveWith)}</p></div>
    ${video}
    <div class="about">
      <div class="card"><h3 class="h3">In this session</h3><ol style="margin:0;padding-left:20px;display:grid;gap:6px;color:var(--ink-2)">${s.steps.map((st) => `<li>${esc(st.title)}</li>`).join("")}</ol></div>
      <div><h3 class="h3" style="margin-bottom:12px">Key ideas</h3><div class="ideas">${ideas}</div></div>
    </div>`;
}
function fieldHTML(f, v) {
  const id = `f-${f.id}`;
  const opt = f.optional ? `<span class="opt">optional</span>` : "";
  const ph = PH[f.id]?.[D.me.field] || f.placeholder || "";
  const hint = f.label && f.prompt && f.prompt !== f.label ? `<span class="hint">${esc(f.prompt)}</span>` : "";
  const label = esc(f.label || f.prompt);
  if (f.type === "list") {
    const n = Math.max(f.count || 3, Array.isArray(v) ? v.length : 0), vals = Array.isArray(v) ? v : [];
    return `<div class="field"><span class="lab">${label}${opt}</span>${hint}<div class="rows">${Array.from({ length: n }, (_, k) => `<div class="row"><span>${k + 1}</span><input class="in" data-f="${esc(f.id)}" data-k="${k}" value="${esc(vals[k] || "")}" placeholder="${esc(k === 0 ? ph : "")}" maxlength="1500" aria-label="${label} ${k + 1}" /></div>`).join("")}</div></div>`;
  }
  if (f.type === "choice") {
    const multi = !!f.multi, cur = [].concat(v || []);
    return `<div class="field"><span class="lab">${label}${opt}</span>${hint}<div class="chips" role="${multi ? "group" : "radiogroup"}">${(f.options || []).map((o) => `<label><input type="${multi ? "checkbox" : "radio"}" name="${esc(f.id)}" data-f="${esc(f.id)}" value="${esc(o)}" ${cur.includes(o) ? "checked" : ""} /><span>${esc(o)}</span></label>`).join("")}</div></div>`;
  }
  if (f.type === "long") return `<div class="field"><label for="${id}">${label}${opt}</label>${hint}<textarea class="ta" id="${id}" data-f="${esc(f.id)}" maxlength="3000" placeholder="${esc(ph)}">${esc(v || "")}</textarea></div>`;
  return `<div class="field"><label for="${id}">${label}${opt}</label>${hint}<input class="in" id="${id}" data-f="${esc(f.id)}" value="${esc(v || "")}" maxlength="${f.max || 300}" placeholder="${esc(ph)}" /></div>`;
}
function lessonView(s, st, i) {
  const a = W(s.n).answers, tip = tipFor(st);
  return `<div class="lesson__head"><p class="kicker">Lesson ${i} of ${s.steps.length}</p><h1 class="display">${esc(st.title)}</h1>${st.instructions ? `<p>${esc(st.instructions)}</p>` : ""}</div>
    ${st.example ? `<details class="ex" ${i === 1 ? "open" : ""}><summary>${icon("bulb")}See an example${icon("down", "chev")}</summary><p>${esc(st.example)}</p></details>` : ""}
    ${tip ? `<div class="callout callout--you" style="margin:0 0 16px"><span class="callout__ic">${icon("target")}</span><div><b>For you${D.me.goal ? ` · ${esc(goalName(D.me.goal))}` : ""}</b><p>${esc(tip)}</p></div></div>` : ""}
    <form class="card work" onsubmit="return false">${(st.fields || []).map((f) => fieldHTML(f, a[f.id])).join("")}</form>
    ${st.tip ? `<div class="callout"><span class="callout__ic">${icon("mic")}</span><div><b>Try this</b><p>${esc(st.tip)}</p></div></div>` : ""}`;
}
let lastDone = null;
function wireFields(s, st, here) {
  const a = W(s.n).answers, feeds = feedsOf(st);
  let wasDone = stepDone(st, a);
  const onInput = (el) => {
    const id = el.dataset.f, f = st.fields.find((x) => x.id === id);
    if (f.type === "list") { const arr = $$(`[data-f="${id}"]`).map((x) => x.value); while (arr.length && !arr.at(-1)) arr.pop(); a[id] = arr; }
    else if (f.type === "choice") { const on = $$(`[data-f="${id}"]:checked`).map((x) => x.value); a[id] = f.multi ? on : on[0] || ""; }
    else a[id] = el.value;
    touch(s.n);
    refreshDoc(feeds);
    const now = stepDone(st, a);
    if (now && !wasDone && lastDone !== st.id) { lastDone = st.id; toast(`Lesson done · Blueprint ${readiness()}% built`); }
    if (now !== wasDone) { wasDone = now; if (sideTab === "lessons") redrawSide(s, here); }
  };
  $$("[data-f]").forEach((el) => { el.addEventListener("input", () => onInput(el)); el.addEventListener("change", () => onInput(el)); });
}
function renderDone(s) {
  const nxt = D.sessions.find((x) => x.n === s.n + 1), complete = isComplete(s);
  document.title = `Session ${s.n} complete · Blueprint Online`;
  const parts = docParts();
  const made = SECTIONS.filter(([k]) => parts[k].some((p) => p.n === s.n)).map(([k, label]) => [label, parts[k].filter((p) => p.n === s.n).some((p) => p.lines.length)]);
  const cta = !nxt ? `<a class="btn btn--primary btn--lg" href="#/blueprint">Open my Blueprint ${arrow}</a>`
    : nxt.open ? `<a class="btn btn--primary btn--lg" href="#/s/${nxt.n}">Start Session ${nxt.n} ${arrow}</a>`
    : `<button class="btn btn--primary btn--lg" data-unlock="${nxt.n}">Unlock Session ${nxt.n} · ${peso(D.prices.single)}</button>`;
  app.innerHTML = `<div class="wrap" style="max-width:820px"><section class="done">
    <div class="done__ic">${icon(complete ? "check" : "doc")}</div>
    <p class="kicker">Session ${s.n} · ${complete ? "Complete" : "Saved"}</p>
    <h1 class="display h2">${complete ? `${esc(s.title)} <span class="grad">done.</span>` : "Saved. Finish the rest any time."}</h1>
    <p class="lede">Your Blueprint is <b>${readiness()}% built</b>. ${nxt ? `Next: Session ${nxt.n}, ${esc(nxt.title)}. ${esc(nxt.leaveWith)}` : "Every session is done. Your Blueprint is ready to use."}</p>
    ${made.length ? `<ul class="made">${made.map(([label, ok], k) => `<li style="animation-delay:${k * 0.08}s">${icon(ok ? "check" : "doc")}${esc(label)}${ok ? `<span class="tag tag--done">Added</span>` : `<span class="tag">To finish</span>`}</li>`).join("")}</ul>` : ""}
    <div class="done__go">${cta}<a class="btn btn--ghost btn--lg" href="#/blueprint">See my Blueprint</a></div>
    ${!complete ? `<p class="fine"><a class="link" href="#/s/${s.n}">Back to Session ${s.n}’s lessons</a></p>` : ""}
  </section></div>`;
}

/* ==========================================================================
   My Blueprint
   ========================================================================== */
function renderBlueprint() {
  chrome();
  document.title = "My Blueprint · Blueprint Online";
  const r = readiness(), path = PATH[D.me.goal] || PATH[""];
  app.innerHTML = `<div class="wrap bp">
    <section><div class="no-print" style="margin-bottom:18px"><p class="kicker">My Blueprint</p><h1 class="display h2">${r === 100 ? `Ready to <span class="grad">send.</span>` : r ? `Building <span class="grad">as you go.</span>` : `It starts with <span class="grad">lesson one.</span>`}</h1>
      <p class="lede">Everything you’ve written, in one place. Copy each part into your résumé and LinkedIn, or save the whole thing as a PDF.</p></div>
      ${docHTML({ copyable: true })}</section>
    <aside class="side-stack no-print">
      <div class="card card--pad"><div class="mini">${ring(r)}<div><h3 class="h3" style="font-size:1.15rem">${r}% built</h3><p>${r === 100 ? "Every lesson is in." : "Each lesson you finish adds to it."}</p></div></div>
        <div style="display:grid;gap:8px;margin-top:18px"><button class="btn btn--primary btn--block" id="pdf">${icon("download")}Save as PDF</button><button class="btn btn--ghost btn--block" id="copyAll">${icon("copy")}Copy everything</button></div></div>
      <div class="card card--pad"><p class="kicker">${icon("sparkle")}Next moves</p><h3 class="h3" style="font-size:1.15rem">Put it to work</h3><ul class="ticks" style="margin-top:12px">${path.next.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
    </aside></div>`;
  $("#pdf").onclick = () => print();
  $("#copyAll").onclick = () => copy(SECTIONS.map(([k, label]) => { const t = docText(k); return t ? `${label.toUpperCase()}\n${t}` : ""; }).filter(Boolean).join("\n\n"));
}

/* ==========================================================================
   Unlock: pick → pay by GCash → upload the receipt → open
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
async function openUnlock(n) {
  const rest = D.prices.restSessions;
  if (!rest.length) return toast("You already have every session");
  if (n && !rest.includes(n)) n = null;
  if ((n ? [n] : rest).some(pending)) return toast("We’re already checking a receipt for that. Give us a little time.", true);
  const single = n ? S(n) : null, opts = [];
  if (single) opts.push({ v: "single", t: `Session ${n}: ${single.title}`, d: single.leaveWith, amt: D.prices.single });
  if (rest.length > 1 || !single || D.prices.rest < D.prices.single) opts.push({ v: "rest", t: rest.length > 1 ? `Sessions ${and(rest.map(String))}` : `Session ${rest[0]}`, d: D.prices.spent ? `You already paid ${peso(D.prices.spent)}, so this is just the difference.` : rest.length > 1 ? "The whole rest of the course." : S(rest[0]).leaveWith, amt: D.prices.rest, save: rest.length * D.prices.single - D.prices.rest });
  let pick = opts.length > 1 ? "rest" : opts[0].v, image = null;
  const amount = () => opts.find((o) => o.v === pick).amt;
  const box = openSheet(`<p class="kicker">${icon("lock")}Unlock</p><h2 class="sheet__title">${single ? `Open Session ${n}` : "Open the rest of Blueprint"}</h2>
    <div class="pick">${opts.map((o) => `<label><input type="radio" name="pick" value="${o.v}" ${o.v === pick ? "checked" : ""} /><span><b>${esc(o.t)}</b><small>${esc(o.d)}</small></span><span class="amt">${peso(o.amt)}${o.save > 0 ? `<span class="save">Save ${peso(o.save)}</span>` : ""}</span></label>`).join("")}</div>
    <div class="steps">
      <div class="stp"><span class="stp__n">1</span><div><b>Pay <span id="amt">${peso(amount())}</span> with GCash</b><div id="qrSlot"><p class="soft small">Loading our QR…</p></div></div></div>
      <div class="stp"><span class="stp__n">2</span><div><b>Upload your receipt screenshot</b><label class="drop"><input type="file" accept="image/*" id="file" /><span id="fileTxt" style="display:grid;justify-items:center;gap:6px">${icon("upload")}Tap to choose your GCash receipt</span></label></div></div>
    </div>
    <p class="err" id="uErr" role="alert"></p>
    <button class="btn btn--primary btn--lg btn--block" id="payBtn" style="margin-top:18px" disabled>Unlock now ${arrow}</button>
    <p class="fine">It opens as soon as you upload. We double-check every receipt within a day.</p>`);
  $$("[name=pick]", box).forEach((r) => (r.onchange = () => { pick = r.value; $("#amt", box).textContent = peso(amount()); }));
  $("#file", box).onchange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    $("#uErr", box).textContent = "";
    try { image = await shrink(f); $("#fileTxt", box).innerHTML = `<img src="${image}" alt="Your receipt" /><span class="small">Looks good. Tap to change it.</span>`; $("#payBtn", box).disabled = false; }
    catch (err) { image = null; $("#uErr", box).textContent = msg(err); $("#payBtn", box).disabled = true; }
  };
  $("#payBtn", box).onclick = async (e) => {
    busy(e.currentTarget, true, "Unlocking");
    try {
      const r = await call("buy", { item: pick, session: n, image });
      take(r);
      const opened = pick === "single" ? [n] : rest;
      box.innerHTML = `<button class="x" aria-label="Close">${icon("x")}</button><div class="ok-big fadeup"><div class="done__ic">${icon("check")}</div>
        <h2 class="sheet__title" style="margin:0">${r.instant ? `Session${opened.length > 1 ? "s" : ""} ${and(opened.map(String))} ${opened.length > 1 ? "are" : "is"} open.` : "Thanks! We’re checking it."}</h2>
        <p class="soft" style="margin-top:8px">Order <b>${esc(r.order)}</b>. ${r.instant ? "We emailed you a copy." : "We’ll email you as soon as it opens."}</p>
        <a class="btn btn--primary btn--lg btn--block" style="margin-top:20px" href="${r.instant ? `#/s/${opened[0]}` : "#/"}" id="goNow">${r.instant ? `Start Session ${opened[0]}` : "Back to my learning"} ${arrow}</a></div>`;
      $(".x", box).onclick = () => { closeSheet(); route(); };
      $("#goNow", box).onclick = () => closeSheet();
    } catch (err) { busy(e.currentTarget, false); $("#uErr", box).textContent = msg(err); }
  };
  try {
    payInfo ||= await call("pay");
    $("#qrSlot", box).innerHTML = `${payInfo.qr ? `<img class="qr" src="${payInfo.qr}" alt="Blueprint GCash QR code" />` : ""}
      <p class="payto">${payInfo.name ? `To <b>${esc(payInfo.name)}</b>` : ""}${payInfo.number ? `<br>GCash <b>${esc(payInfo.number)}</b>` : ""}</p>
      ${payInfo.qr ? `<p class="soft small" style="margin-top:6px">On this phone? Long-press the QR to save it, then in GCash tap <b>Pay QR</b> › <b>Upload QR</b>.</p>` : ""}`;
  } catch { $("#qrSlot", box).innerHTML = `<p class="err">Couldn’t load the QR. Close this and try again.</p>`; }
}

/* ==========================================================================
   Router
   ========================================================================== */
async function route() {
  $(".menu")?.remove();
  if (!$("#sheet").hidden && !$("#goNow") && !$("#c-code")) closeSheet();
  if (!token) return renderLanding();
  if (!D) {
    try { take(await call("me")); }
    catch (e) {
      if (!token) { await renderLanding(); return openSignIn("", "email"); }
      app.innerHTML = `<div class="wrap"><div class="boot"><div><h2 class="h3">Couldn’t load your Blueprint.</h2><p class="soft" style="margin:8px 0 16px">${esc(msg(e))}</p><button class="btn btn--primary" onclick="location.reload()">Try again</button></div></div></div>`;
      return;
    }
    if (intent.buy) return afterIn();
  }
  const h = where();
  window.scrollTo({ top: 0 });
  if (h[0] === "s") renderSession(Number(h[1]), h[2] || 0);
  else if (h[0] === "blueprint") renderBlueprint();
  else if (h[0] === "tailor") renderTailor();
  else if (shouldAsk()) { tailorMode = "welcome"; location.hash = "#/tailor"; }
  else renderHome();
}
addEventListener("hashchange", route);
route();
