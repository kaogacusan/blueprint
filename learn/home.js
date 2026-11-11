/* Blueprint Online: the signed-out page (what Blueprint is + sign in) and the signed-in home ("My course").
   Drawn by learn.js, which passes in what these need (ctx). Styles: learn/home.css.
   Look: the main site's system, narrowed to one direction: paper and deep navy, one blue, tight display type,
   mono labels like the hero's "330 × 112" tag, and module covers with outlined numerals.
   The home page uses the welcome answers (learn/welcome.js): the line under their name, Module 2's path,
   one tip on the next module, and whether booking the review comes first. */
import { goalName, pathName } from "/learn/welcome.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const two = (n) => String(n).padStart(2, "0");
const TZ = "Asia/Manila";
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const day = (iso) => new Date(iso).toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric" });
const callDay = (iso) => new Date(iso).toLocaleDateString("en-US", { timeZone: TZ, weekday: "long", month: "long", day: "numeric" });
const callTime = (iso) => new Date(iso).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const initials = (name = "") => (name.match(/\b\p{L}/gu) || ["B"]).slice(0, 2).join("").toUpperCase();

/* icons (stroke, like the site's): our own set, so this file doesn't depend on learn.js's list */
const P = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
};
export const icon = (n, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ""}</svg>`;

/* a module's cover: navy, a faint grid, the number in outline */
export const cover = (n, icon, { lock = false, done = false, tag = true } = {}) =>
  `<div class="cv cv--${n}${lock ? " is-locked" : ""}" aria-hidden="true"><b class="cv__n">${two(n)}</b>${tag ? `<span class="cv__tag">Module ${two(n)}</span>` : ""}${lock ? `<span class="cv__badge">${icon("lock")}</span>` : done ? `<span class="cv__badge cv__badge--ok">${icon("check")}</span>` : ""}</div>`;

/* scroll reveals + the tilted product shot. One set per render. */
let io = null, onScroll = null;
function motion(root) {
  io?.disconnect();
  if (onScroll) removeEventListener("scroll", onScroll);
  const els = $$(".rv", root);
  if (calm() || !("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("is-in")); }
  else {
    io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    els.forEach((e) => io.observe(e));
  }
  const shot = $(".lx-shot", root);
  if (!shot || calm()) return;
  onScroll = () => {
    const r = shot.getBoundingClientRect(), vh = innerHeight;
    const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.9)));   // 0 when it peeks in, 1 when it's well in view
    shot.style.setProperty("--tilt", `${(16 * (1 - p)).toFixed(2)}deg`);
    shot.style.setProperty("--lift", `${(0.94 + 0.06 * p).toFixed(3)}`);
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* ==========================================================================
   Signed out
   ========================================================================== */
export function landing(ctx) {
  const { app, esc, arrow, BUY, FAQ } = ctx;
  const ms = ctx.C?.modules?.length ? ctx.C.modules : [];
  const total = ms.reduce((t, m) => t + (m.minutes || 0), 0) || 80;
  $("#barNav").innerHTML = `<button data-go="lxInside">What’s inside</button><button data-go="lxHow">How it works</button><button data-go="lxWho">Reviewers</button><button data-go="lxFaq">FAQ</button>`;

  // the product shot: a quiet picture of the course page itself
  const shot = `
    <div class="lx-shot rv" aria-hidden="true"><div class="lx-shot__win">
      <div class="lx-shot__chrome"><i></i><i></i><i></i><span>ateneoblueprint.vercel.app/learn</span></div>
      <div class="lx-shot__app">
        <div class="lx-shot__bar"><img src="/assets/blueprint-mark.png" alt="" /><b>blueprint</b><em>Online</em><span class="lx-shot__nav"><u>My course</u><u>Modules</u><u>Review call</u></span><span class="lx-shot__av">AR</span></div>
        <div class="lx-shot__hero">
          <div><p class="lx-mono">Your Blueprint</p><p class="lx-shot__hi">Good evening, Ana.</p><p class="lx-shot__line">Set up for an internship. Module 2 builds your first résumé.</p>
            <div class="lx-shot__seg"><i class="on"></i><i></i><i></i><i></i></div><p class="lx-shot__count">1 of 4 worksheets submitted</p></div>
          <div class="lx-shot__next">${cover(2, icon)}<div><p class="lx-mono">Up next · 25 min</p><b>Proof on Paper</b><span class="lx-shot__btn">Continue</span></div></div>
        </div>
        <div class="lx-shot__row">${[1, 2, 3, 4].map((n) => `<div class="lx-shot__mod">${cover(n, icon, { lock: n > 2, done: n === 1, tag: false })}<b>${esc(ms[n - 1]?.title || ["Sino Ka?", "Proof on Paper", "Proof in Public", "Ako ’To"][n - 1])}</b></div>`).join("")}</div>
      </div>
    </div></div>`;

  app.innerHTML = `
  <section class="lx-hero"><div class="wrap">
    <p class="lx-mono lx-hero__k ob-fade">Blueprint Online <span>·</span> ${ms.length || 4} modules <span>·</span> ₱349</p>
    <h1 class="lx-h1"><span class="lx-line">Four modules.</span> <span class="lx-line">One <span class="grad">blueprint.</span></span></h1>
    <p class="lx-lede ob-fade" style="--d:.35s">Work out what you want to be known for, then put it on your résumé, your LinkedIn and the way you introduce yourself. About ${total} minutes on your own time, then a 15&#8209;minute review of your work.</p>
    <div class="lx-cta ob-fade" style="--d:.5s"><a class="btn btn--primary btn--lg" href="${BUY}">Get Blueprint · ₱349 ${arrow}</a><button class="btn btn--ghost btn--lg" data-signin>Sign in</button></div>
    <p class="lx-fine ob-fade" style="--d:.6s">Bought it already? Sign in with the email you registered with.</p>
    ${shot}
  </div></section>

  <section class="lx-sec" id="lxInside"><div class="wrap">
    <div class="lx-head rv"><p class="lx-mono">What’s inside</p><h2 class="lx-h2">Four short modules. <span class="soft">Each one opens when you finish the one before.</span></h2></div>
    <div class="lx-mods">${ms.map((m, i) => `
      <article class="lx-mod rv" style="--d:${i * 0.07}s">${cover(m.n, icon)}
        <div class="lx-mod__t"><p class="lx-mono">${m.minutes} min</p><h3>${esc(m.title)}</h3><p>${esc(m.tagline)}</p></div>
        <p class="lx-mod__out"><span>You leave with</span>${esc(m.leaveWith.replace(/\.?\s*Unlocks your 1:1\.?$/i, ""))}</p>
      </article>`).join("")}</div>
    <div class="lx-final rv">
      <div class="lx-final__t"><p class="lx-mono">Then</p><h3>Your 15-minute résumé review.</h3><p>One-on-one on Google Meet. Your reviewer reads your four worksheets first, then goes through your résumé and LinkedIn with you. Finish all four and we email you a Blueprint certificate.</p></div>
      <ul class="lx-final__list"><li>${icon("cal")}Book a time whenever you like</li><li>${icon("video")}15 minutes on Google Meet</li><li>${icon("award")}Certificate when you finish</li></ul>
    </div>
  </div></section>

  <section class="lx-sec lx-sec--white" id="lxHow"><div class="wrap">
    <div class="lx-head rv"><p class="lx-mono">How it works</p><h2 class="lx-h2">Every module, <span class="soft">the same three steps.</span></h2></div>
    <ol class="lx-steps">
      <li class="rv"><span class="lx-steps__n">1</span><h3>Watch</h3><p>A short lesson you can pause and come back to.</p></li>
      <li class="rv" style="--d:.08s"><span class="lx-steps__n">2</span><h3>Do the worksheet</h3><p>Questions right on the page. Your answers save as you type, and they’re what you leave with.</p></li>
      <li class="rv" style="--d:.16s"><span class="lx-steps__n">3</span><h3>Submit it</h3><p>The next module opens, and your reviewer has your answers ready for your call.</p></li>
    </ol>
  </div></section>

  <section class="lx-sec" id="lxWho"><div class="wrap">
    <div class="lx-head rv"><p class="lx-mono">Reviewers</p><h2 class="lx-h2">Who reviews <span class="grad">your work.</span></h2></div>
    <div class="lx-people">
      <article class="lx-person rv"><span class="lx-person__pic">KB</span><div><h3>Kurt Boquiren</h3><p class="soft">Learning and development consultant</p>
        <ul class="lx-pills"><li>Learning experience design, Breakthrough Leadership</li><li>Associate consultant, Project Purpose</li><li>Magna cum laude, iACADEMY</li></ul></div></article>
      <article class="lx-person rv" style="--d:.08s"><span class="lx-person__pic">TS</span><div><h3>Thomas Santos</h3><p class="soft">Founder, Blueprint</p>
        <ul class="lx-pills"><li>AB Development Studies, Ateneo</li><li>Building Unseen Media, a creative agency</li><li>Co-lead, EZ Run Club</li></ul></div></article>
    </div>
  </div></section>

  <section class="lx-sec lx-sec--white" id="lxIn"><div class="wrap">
    <div class="lx-pair">
      <div class="lx-card rv" id="join">
        <p class="lx-mono">Have Blueprint?</p><h2 class="lx-h3">Sign in</h2>
        <p class="soft">Type the email you registered with, or the one the course was sent to. We’ll email you a 6-digit code. No password.</p>
        <form id="inForm" novalidate class="lx-form">
          <label class="sr" for="i-email">Email</label>
          <input class="in" id="i-email" type="email" autocomplete="email" inputmode="email" maxlength="200" placeholder="you@email.com" />
          <button class="btn btn--primary btn--lg" type="submit">Send my code ${arrow}</button>
        </form>
        <p class="err" id="iErr" role="alert"></p>
      </div>
      <div class="lx-card lx-card--navy rv" style="--d:.08s">
        <p class="lx-mono">New here?</p><h2 class="lx-h3"><span class="lx-price">₱349</span> <span class="lx-price__s">one payment, by GCash</span></h2>
        <ul class="lx-ticks"><li>${icon("check")}${ms.length || 4} modules, about ${total} minutes</li><li>${icon("check")}Worksheets your reviewer reads</li><li>${icon("check")}15-minute résumé review on Google Meet</li><li>${icon("check")}A certificate when you finish</li></ul>
        <a class="btn btn--light btn--lg" href="${BUY}">Get Blueprint ${arrow}</a>
      </div>
    </div>
  </div></section>

  <section class="lx-sec" id="lxFaq"><div class="wrap lx-faq">
    <div class="rv"><p class="lx-mono">Getting in</p><h2 class="lx-h2">Questions, <span class="grad">answered.</span></h2></div>
    <div class="faq rv">${(FAQ || []).map(([q, a]) => `<details class="qa"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>
  </div></section>

  <footer class="lx-foot"><div class="wrap">
    <p class="lx-foot__big" aria-hidden="true">blueprint</p>
    <div class="lx-foot__row"><span>Blueprint is an LAS50 student venture at Ateneo de Manila.</span>
      <nav><a href="/">Blueprint site</a><a href="/privacy.html">Privacy</a><a href="/#ask">Ask us</a></nav></div>
  </div></footer>`;

  $("#inForm").onsubmit = (e) => ctx.sendCode(e, $("#i-email").value, $("#iErr"));
  $$("[data-go]").forEach((b) => b.onclick = () => document.getElementById(b.dataset.go)?.scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "start" }));
  motion(app);
}

/* ==========================================================================
   Signed in: home
   ========================================================================== */
/* one tip per module, by what they're working toward (the old tailoring copy, fitted to the four modules) */
const TIP = {
  1: {
    internship: "When Module 1 asks for the outcome you want, name the kind of company, the role and the season, like “a marketing internship at a consumer brand, summer 2027”.",
    job: "When Module 1 asks for the outcome you want, name the role, the kind of company and when, like “an analyst role at a bank within six months of graduating”.",
    org: "When Module 1 asks for the outcome you want, name the org, the position and the term, like “VP for Internal of [org], next school year”.",
    scholarship: "When Module 1 asks for the outcome you want, name the scholarship or programme, and what it lets you do next.",
    explore: "Not sure what you want yet? When Module 1 asks, write the outcome that sounds best right now. You can change it later.",
  },
  2: {
    internship: "For the real post, search “intern” plus your field on LinkedIn Jobs, JobStreet or Kalibrr, or use a company’s internship call.",
    job: "For the real post, pick an entry-level role (0 to 1 years) at a place you’d actually join.",
    org: "For the real post, use the org’s call for applications. What problem does this position solve for them?",
    scholarship: "For the real post, use the scholarship’s call or selection criteria. Treat each criterion as a requirement.",
    explore: "For the real post, pick any post that sounds interesting. This one is practice.",
  },
  4: {
    internship: "End your intro with your ask, like “I’m looking for a marketing internship this summer.” Send your message to someone at a company on your list.",
    job: "End your intro with the role you want. Send your message to someone a year or two into that role.",
    org: "End your intro with the position you’re going for. Send your message to a current officer or the head of the org.",
    scholarship: "End your intro with what the scholarship would let you do. Send your message to a past scholar from your school.",
    explore: "End your intro with a question about the field. Send your message to someone whose job you’re curious about.",
  },
};
const STAGE_TIP = {
  none: "No résumé yet? Take the First résumé path in Module 2: your Module 1 moments become your first bullets.",
  rough: "Take the Rebuild path in Module 2: you copy three lines from your résumé and rebuild them one at a time.",
  applying: "Applying now? Do Module 1, then Module 2 right after. That’s where your résumé gets read against a real post.",
};
const GOAL_LINE = { internship: "Set up for an internship.", job: "Set up for your first job.", org: "Set up for an org position.", scholarship: "Set up for a scholarship or exchange.", explore: "Set up for working out what fits." };
const STAGE_LINE = { none: "Module 2 builds your first résumé.", rough: "Module 2 rebuilds the résumé you have.", applying: "Module 2 gets your résumé ready for a real post." };

export function home(ctx) {
  const { app, esc, arrow } = ctx, D = ctx.D, me = D.me, mods = D.modules;
  const done = mods.filter((m) => m.doneAt).length;
  const nx = mods.find((m) => m.open && !m.doneAt) || null;
  const started = (m) => !m.doneAt && Object.values(m.answers || {}).some((a) => (Array.isArray(a) ? a.length : a && typeof a === "object" ? Object.values(a).some((x) => x.length) : String(a).trim()));
  const total = mods.reduce((t, m) => t + (m.minutes || 0), 0) || 80;
  const r = D.review || null, mine = r?.mine || null;
  const h = new Date().getHours();
  const hi = `${h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"}${me.first ? `, ${esc(me.first)}` : ""}.`;

  const line = done === 4 ? "All four worksheets are in. That’s Blueprint."
    : `${GOAL_LINE[me.goal] || "Four short modules, in order, on your own time."} ${STAGE_LINE[me.stage] || ""}`.trim();
  const chips = [
    me.goal ? `<span class="hm-chip">${icon("target")}${esc(goalName(me.goal))}</span>` : "",
    me.stage ? `<span class="hm-chip">${icon("doc")}${esc(pathName(me.stage))} path</span>` : "",
    mine ? `<span class="hm-chip">${icon("cal")}Review ${esc(day(mine.startsAt))}</span>` : me.reviewPlan === "yes" ? `<span class="hm-chip">${icon("cal")}Review: to book</span>` : "",
  ].join("");

  /* the one thing to do next */
  const tip = nx ? (TIP[nx.n]?.[me.goal] || (nx.n === 2 ? STAGE_TIP[me.stage] : "") || "") : "";
  const next = nx ? `
    <a class="hm-next" href="#/m/${nx.n}">
      ${cover(nx.n, icon)}
      <div class="hm-next__t">
        <p class="hm-mono">${started(nx) ? "Continue" : done ? "Up next" : "Start here"} · about ${nx.minutes} min</p>
        <h2>Module ${nx.n}: ${esc(nx.title)}</h2>
        <p class="hm-next__out">${esc(nx.leaveWith.replace(/\.?\s*Unlocks your 1:1\.?$/i, ""))}</p>
        ${tip ? `<p class="hm-tip"><b>For you</b>${esc(tip)}</p>` : ""}
        <span class="btn btn--light">${started(nx) ? "Continue" : `Start Module ${nx.n}`} ${arrow}</span>
      </div>
    </a>` : `
    <a class="hm-next hm-next--done" href="#/review">
      <div class="hm-next__seal">${icon("award")}</div>
      <div class="hm-next__t">
        <p class="hm-mono">All four done</p>
        <h2>${mine ? `Your review: ${esc(callDay(mine.startsAt))}` : "Book your résumé review"}</h2>
        <p class="hm-next__out">${mine ? `${esc(callTime(mine.startsAt))}, Manila time, with ${esc(mine.reviewer)}. Your worksheets are in.` : "15 minutes on Google Meet. Your reviewer reads your four worksheets before the call."}</p>
        <span class="btn btn--light">${mine ? "See the details" : "Pick a time"} ${arrow}</span>
      </div>
    </a>`;

  /* the path: four modules, then the review, then the certificate */
  const row = (m, i) => {
    const isNext = nx?.n === m.n, lock = !m.open;
    const state = m.doneAt ? `<span class="hm-state hm-state--ok">${icon("check")}Submitted ${esc(day(m.doneAt))}</span>`
      : isNext ? `<span class="hm-state hm-state--on">${started(m) ? "In progress" : "Up next"}</span>`
      : lock ? `<span class="hm-state">${icon("lock")}Opens after Module ${m.n - 1}</span>` : `<span class="hm-state hm-state--on">Open</span>`;
    const pathPill = m.n === 2 && me.stage ? `<span class="hm-pill">${esc(pathName(me.stage))} path</span>` : "";
    return `<li class="hm-row ${m.doneAt ? "is-done" : ""} ${isNext ? "is-next" : ""} ${lock ? "is-locked" : ""} rv" style="--d:${i * 0.06}s">
      <span class="hm-node" aria-hidden="true">${m.doneAt ? icon("check") : lock ? icon("lock") : two(m.n)}</span>
      <a class="hm-row__card" href="#/m/${m.n}" ${lock ? `aria-label="Module ${m.n}: ${esc(m.title)}, locked. Opens after Module ${m.n - 1}."` : ""}>
        ${cover(m.n, icon, { lock, done: !!m.doneAt, tag: false })}
        <div class="hm-row__t"><p class="hm-mono">Module ${two(m.n)} · ${m.minutes} min ${pathPill}</p><h3>${esc(m.title)}</h3>
          <p>${lock ? `Submit Module ${m.n - 1}’s worksheet to open this.` : esc(m.leaveWith.replace(/\.?\s*Unlocks your 1:1\.?$/i, ""))}</p></div>
        <div class="hm-row__s">${state}${lock ? "" : `<span class="hm-go">${icon("chev")}</span>`}</div>
      </a></li>`;
  };
  const reviewRow = `<li class="hm-row hm-row--extra ${mine ? "is-done" : ""} rv" style="--d:.26s">
      <span class="hm-node" aria-hidden="true">${mine ? icon("check") : icon("cal")}</span>
      <a class="hm-row__card" href="#/review"><div class="hm-row__ic">${icon("cal")}</div>
        <div class="hm-row__t"><p class="hm-mono">Included · 15 min</p><h3>Your résumé review</h3><p>${mine ? `${esc(callDay(mine.startsAt))}, ${esc(callTime(mine.startsAt))} with ${esc(mine.reviewer)}.` : "One-on-one on Google Meet. Book a time whenever you like."}</p></div>
        <div class="hm-row__s">${mine ? `<span class="hm-state hm-state--ok">${icon("check")}Booked</span>` : `<span class="hm-state hm-state--on">Book any time</span>`}<span class="hm-go">${icon("chev")}</span></div>
      </a></li>`;
  const certRow = `<li class="hm-row hm-row--extra ${done === 4 ? "is-done" : "is-locked"} rv" style="--d:.32s">
      <span class="hm-node" aria-hidden="true">${done === 4 ? icon("check") : icon("award")}</span>
      <div class="hm-row__card hm-row__card--static"><div class="hm-row__ic">${icon("award")}</div>
        <div class="hm-row__t"><p class="hm-mono">When you finish</p><h3>Blueprint certificate</h3><p>${done === 4 ? "All four are in. We’ll email your certificate." : `Submit all four worksheets. ${4 - done} to go.`}</p></div>
        <div class="hm-row__s">${done === 4 ? `<span class="hm-state hm-state--ok">${icon("check")}Earned</span>` : `<span class="hm-state">${icon("lock")}${done}/4</span>`}</div>
      </div></li>`;

  /* the side: the review call, what the reviewer reads, the account */
  const wantsReview = me.reviewPlan === "yes" && !mine;
  const reviewCard = mine ? `
    <div class="hm-card hm-card--call rv">
      <p class="hm-mono">${icon("cal")}Your review call</p>
      <p class="hm-when">${esc(callDay(mine.startsAt))}<span>${esc(callTime(mine.startsAt))} · 15 min · Manila time</span></p>
      <div class="hm-who"><span class="hm-av">${esc(initials(mine.reviewer))}</span><span>With <b>${esc(mine.reviewer)}</b><small>on Google Meet</small></span></div>
      <a class="btn btn--ghost btn--sm" href="#/review">Details and Meet link ${arrow}</a>
    </div>` : `
    <div class="hm-card ${wantsReview ? "hm-card--ask" : ""} rv">
      <p class="hm-mono">${icon("cal")}${wantsReview ? "You said yes" : "Included with Blueprint"}</p>
      <h3>Book your 15-minute résumé review</h3>
      <div class="hm-avs"><span class="hm-av">TS</span><span class="hm-av">KB</span><small>Thomas Santos or Kurt Boquiren</small></div>
      <p class="soft">One-on-one on Google Meet. Pick a time now, even before you start: it gives you a date to finish your worksheets by.</p>
      <a class="btn ${wantsReview ? "btn--primary" : "btn--ghost"} btn--sm" href="#/review">Pick a time ${arrow}</a>
    </div>`;

  app.innerHTML = `
  <section class="hm-hero"><div class="wrap hm-hero__in">
    <div class="hm-hi">
      <p class="hm-mono hm-fade">Your Blueprint</p>
      <h1 class="hm-h1 hm-fade" style="--d:.06s">${hi}</h1>
      <p class="hm-line hm-fade" style="--d:.14s">${esc(line)}</p>
      ${chips || me.goal !== undefined ? `<div class="hm-chips hm-fade" style="--d:.2s">${chips}<button class="hm-edit" id="hmEdit">${chips ? "Change" : "Tailor it to you"}</button></div>` : ""}
      <div class="hm-prog hm-fade" style="--d:.26s">
        <div class="hm-seg" role="img" aria-label="${done} of 4 worksheets submitted">${mods.map((m) => `<i class="${m.doneAt ? "on" : nx?.n === m.n ? "cur" : ""}"></i>`).join("")}</div>
        <p><b>${done} of 4</b> worksheets submitted <span>· about ${total} min in total</span></p>
      </div>
    </div>
    <div class="hm-fade" style="--d:.18s">${next}</div>
  </div></section>

  <div class="wrap hm-body">
    <section>
      <div class="hm-head rv"><h2>Your path</h2><span>Modules open in order</span></div>
      <ol class="hm-path">${mods.map(row).join("")}${reviewRow}${certRow}</ol>
    </section>
    <aside class="hm-aside">
      ${reviewCard}
      <div class="hm-card rv" style="--d:.06s">
        <p class="hm-mono">${icon("pen")}Your worksheets</p>
        <h3>Your reviewer reads every answer.</h3>
        <p class="soft">Give real detail: names, numbers, what you actually did. The more you put in, the more your 15 minutes can cover. Answers save as you type, so you can stop and come back.</p>
      </div>
      <div class="hm-card hm-card--me rv" style="--d:.12s">
        <span class="hm-av hm-av--lg">${esc(initials(me.name))}</span>
        <div><b>${esc(me.name || "You")}</b><small>${esc(me.email)}</small></div>
      </div>
    </aside>
  </div>`;
  $("#hmEdit")?.addEventListener("click", () => ctx.editProfile());
  motion(app);
}
