/* Course: Blueprint Online at /learn (migrations 014, 017, 018; api/learn.js).
   Since the Nov 11 night plan buyers pay on the site (Sign-ups page); Paid emails them a link that signs them in.
   Four modules, in order: each is a video (or the deck until the video is up), Thomas's page text and a worksheet on the
   page (Thomas's questions, private/course/worksheets.mjs). Submitting a worksheet opens the next module; all four = certificate.
   Review calls: the team adds open times here (15 minutes each, Thomas or Kurt); learners book one on /learn whenever they like.
   Anyone on the core team can read a learner's answers (drawer) or download a module's answers as a CSV for the tracker.
   The owner pastes the video and slides links here. Guests never see this page.
   Old per-session receipts (course_orders, before the night plan) still show if there are any. */
import { S, update, reloadCourse, courseReceipt, checkCourseOrder, reviewAction, workAnswers } from "/admin/store.js";
import { esc, icon, copy, toast, confirmBox, countUps, peso, openDrawer, closeDrawer, download } from "/admin/lib.js";
import { empty } from "/admin/ui.js";

const SESSIONS = [1, 2, 3, 4];
const STATUS = { pending: "Pending", paid: "Paid", rejected: "Not paid" };
const VIA = { online: "Bought", gift: "Gift", refunded: "Refunded, free", workshop: "Workshop ticket", demo: "Demo" };
const f = { q: "" };
const folds = { rules: false, setup: false, past: false }; // stay open or shut when the page redraws
const REVIEWERS = ["Thomas Santos", "Kurt Boquiren"];
const TZ = "Asia/Manila";
const dayKey = (iso) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
const dayName = (iso) => new Date(iso).toLocaleDateString("en-PH", { timeZone: TZ, weekday: "long", month: "short", day: "numeric" });
const tm = (iso) => new Date(iso).toLocaleTimeString("en-PH", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const todayManila = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
const mem = { get: (k) => { try { return localStorage.getItem(k) || ""; } catch { return ""; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const fmt = (iso) => new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const day = (iso) => new Date(iso).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric" });
const first = (name = "") => name.trim().split(/\s+/)[0] || "They";
const sorted = (ns = []) => [...ns].sort((a, b) => a - b).map((n) => `S${n}`);
const sess = (ns) => sorted(ns).join(", ");
const words = (ns) => { const s = sorted(ns); return s.length > 1 ? `${s.slice(0, -1).join(", ")} and ${s.at(-1)}` : s[0] || ""; };
const many = (ns) => ns.length > 1;
const learnerOf = (o) => (S.data.learners || []).find((l) => l.id === o.learner_id);
/* what they told the welcome on /learn (learn/welcome.js): working toward, where their résumé is, the review call */
const GOAL = { internship: "Internship", job: "First job", org: "Org position", scholarship: "Scholarship or exchange", explore: "Exploring" };
const STAGE = { none: "No résumé yet", rough: "Résumé needs work", applying: "Applying now" };
const aims = (l) => { const t = [GOAL[l.goal], STAGE[l.stage], l.review_plan === "yes" ? "Wants a review" : ""].filter(Boolean); return t.length ? `<small>${esc(t.join(" · "))}</small>` : ""; };

const RULES = [
  "Only use these details to run Blueprint Online. Emailing more than one learner? Put the emails in <b>BCC</b>.",
  "Payments are checked on the <a href=\"#inquiries\">Sign-ups</a> page: find their GCash reference number (₱349), click Paid, and the course link goes out by itself.",
  "Your reviewer reads the learner’s worksheet answers (the <b>Answers</b> button) before their review call. The certificate goes out when all four worksheets are submitted. <b>CSV</b> downloads a module’s answers for the Blueprint Online Tracker.",
  "Something leaked or got sent to the wrong person? Tell Keira right away. We have 72 hours to report it.",
];

/* the course tables aren't on realtime: ask again when the page opens, and every minute while it's open */
let pulled = 0, ticker = 0;
const pull = () => { pulled = Date.now(); reloadCourse().catch(() => {}); };
function keepFresh() {
  ticker ||= setInterval(() => location.hash === "#course" && !document.hidden && pull(), 60000);
  if (Date.now() - pulled > 30000) pull();
}

export default {
  id: "course", title: "Course", icon: "globe",
  badge: () => (S.data.course_orders || []).filter((o) => o.status === "pending").length || "",
  render(root) {
    keepFresh();
    const orders = S.data.course_orders || [], learners = S.data.learners || [];
    const pending = orders.filter((o) => o.status === "pending");
    const rows = [...pending, ...orders.filter((o) => o.status !== "pending")];
    const list = learners.filter((l) => !f.q || `${l.name} ${l.email}`.toLowerCase().includes(f.q.toLowerCase()));
    const done = new Map(); // learner id → modules finished
    for (const w of S.data.course_work || []) if (w.completed_at) done.set(w.learner_id, [...(done.get(w.learner_id) || []), w.session]);
    const finished = (n) => learners.filter((l) => (done.get(l.id) || []).includes(n)).length;
    const started = learners.filter((l) => l.last_seen).length;
    const slots = S.data.review_slots || [], now = Date.now();
    const booked = slots.filter((x) => x.learner_id && Date.parse(x.starts_at) > now - 3600e3);
    const openFuture = slots.filter((x) => !x.learner_id && Date.parse(x.starts_at) > now).length;
    const callOf = new Map(slots.filter((x) => x.learner_id).map((x) => [x.learner_id, x]));

    root.innerHTML = `
      <header class="ph">
        <div>
          <h1 class="ph__title">Course</h1>
          <p class="ph__sub">Blueprint Online at <a href="/learn" target="_blank" rel="noopener">/learn</a>. Buyers get in through the link in their “You’re in” email. They do the four modules in order, each ending with a worksheet on the page, and book a 15-minute résumé review whenever they like.</p>
        </div>
        <div class="ph__actions">
          <a class="btn btn--ghost" href="/learn" target="_blank" rel="noopener" title="The course page learners see">${icon("external")} Open /learn</a>
          <button class="btn btn--ghost" id="copyEmails" title="Copy the learners’ emails shown below, to paste in BCC">${icon("copy")} Copy emails</button>
        </div>
      </header>

      <details class="more" id="rulesFold" ${folds.rules ? "open" : ""}>
        <summary>${icon("lock")} Private: how to handle learners${icon("down", "fold__chev")}</summary>
        <ul class="rules">${RULES.map((r) => `<li>${r}</li>`).join("")}</ul>
      </details>

      ${S.owner ? setup() : ""}

      <section class="stats">
        <div class="stat"><span class="stat__k">Learners</span><span class="stat__n"><b data-count="${learners.length}">0</b></span><span class="stat__sub">${started} opened the course</span></div>
        <div class="stat"><span class="stat__k">Module 1 done</span><span class="stat__n"><b data-count="${finished(1)}">0</b>${learners.length ? `<small>of ${learners.length}</small>` : ""}</span><span class="stat__sub">Submitted the Sino Ka? worksheet</span></div>
        <div class="stat"><span class="stat__k">All four done</span><span class="stat__n"><b data-count="${finished(4)}">0</b></span><span class="stat__sub">Certificate due</span></div>
        <div class="stat"><span class="stat__k">Review calls booked</span><span class="stat__n"><b data-count="${booked.length}">0</b></span><span class="stat__sub">${openFuture} open time${openFuture === 1 ? "" : "s"} left</span></div>
      </section>

      ${reviews(slots, learners, done)}

      ${rows.length ? `<section class="card">
        <div class="ch"><h3>${icon("wallet")} Old course orders</h3><span class="muted">${pending.length} to check · from before the ₱349 plan</span></div>
        <div class="tablewrap"><table class="table table--regs table--course">
          <thead><tr><th>Order</th><th>Learner</th><th>What</th><th class="r">Amount</th><th>Status</th><th>When</th></tr></thead>
          <tbody id="orders">${rows.map((o, i) => orderRow(o, i)).join("")}</tbody></table></div>
      </section>` : ""}

      <section class="card">
        <div class="ch ch--tools"><h3>${icon("users")} Learners</h3>
          ${learners.length ? `<label class="search">${icon("search")}<input id="q" placeholder="Search name or email" value="${esc(f.q)}" /></label><span class="muted">${list.length} of ${learners.length}</span>` : `<span class="muted">Everyone who opened the course</span>`}
          <span class="csvs" title="Each module’s answers as a spreadsheet, for the Blueprint Online Tracker">${icon("download")} CSV ${SESSIONS.map((n) => `<button class="btn btn--ghost btn--xs" data-csv="${n}">M${n}</button>`).join("")}</span></div>
        ${list.length ? `<div class="tablewrap"><table class="table table--regs table--course">
          <thead><tr><th>Name</th><th>Year</th><th>How they got it</th><th>Worksheets</th><th>Review call</th><th>Last seen</th></tr></thead>
          <tbody id="learnerRows">${list.map((l, i) => `<tr class="in" data-l="${l.id}" style="--i:${Math.min(i, 16)}">
            <td><b>${esc(l.name)}</b><small><a href="mailto:${esc(l.email)}">${esc(l.email)}</a></small><button class="btn btn--ghost btn--xs" data-answers>${icon("doc")} Answers</button></td>
            <td class="nowrap">${esc(l.year)}${aims(l)}</td>
            <td>${l.via ? `<span class="tag">${esc(VIA[l.via] || l.via)}</span>` : `<span class="muted">—</span>`}</td>
            <td>${chips(l, done.get(l.id) || [])}</td>
            <td class="nowrap">${callOf.get(l.id) ? `<b>${esc(fmt(callOf.get(l.id).starts_at))}</b><small>${esc(callOf.get(l.id).reviewer)}</small>` : `<span class="muted">Not booked</span>`}</td>
            <td class="muted nowrap">${l.last_seen ? esc(fmt(l.last_seen)) : "Not yet"}<small>Added ${esc(day(l.created_at))}</small></td>
          </tr>`).join("")}</tbody></table></div>`
        : empty(learners.length ? "Nobody matches that search." : "Nobody yet. Learners show up here the first time they open the course from their email.", "users")}
      </section>`;

    countUps(root);
    const rerender = () => this.render(root);
    const emails = list.map((l) => l.email);
    root.querySelector("#copyEmails").addEventListener("click", () => (emails.length ? copy(emails.join(", "), `Copied ${emails.length} email${emails.length > 1 ? "s" : ""}. Paste them in BCC, not To.`) : toast("No emails to copy.")));
    root.querySelector("#rulesFold").addEventListener("toggle", (e) => (folds.rules = e.target.open));
    root.querySelector("#orders")?.addEventListener("click", (e) => {
      const b = e.target.closest("[data-check]"), o = b && orders.find((x) => x.id === Number(b.closest("tr").dataset.id));
      if (o) showOrder(o);
    });
    const q = root.querySelector("#q");
    q?.addEventListener("input", () => { f.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => { rerender(); const n = root.querySelector("#q"); n.focus(); n.setSelectionRange(f.q.length, f.q.length); }, 180); });
    root.querySelector("#learnerRows")?.addEventListener("click", (e) => {
      if (!e.target.closest("[data-answers]")) return;
      const l = learners.find((x) => x.id === Number(e.target.closest("tr").dataset.l));
      if (l) showAnswers(l);
    });
    root.querySelectorAll("[data-csv]").forEach((b) => b.addEventListener("click", () => csv(Number(b.dataset.csv), b)));
    wireReviews(root, rerender);
    wireSetup(root);
  },
};

/* M1 to M4: done ones filled in their module colour, the rest grey */
function chips(l, doneNs) {
  return `<span class="sess">${SESSIONS.map((n) => {
    const on = doneNs.includes(n);
    return `<span class="tag ${on ? `tag--s${n}` : "is-off"}" title="Module ${n}: ${on ? "worksheet submitted" : "not yet"}">M${n}${on ? " ✓" : ""}</span>`;
  }).join("")}</span>`;
}

function orderRow(o, i) {
  const l = learnerOf(o);
  const checked = o.status !== "pending" && o.checked_at ? `<small>${esc(o.checked_by || "Checked")} · ${esc(day(o.checked_at))}</small>` : "";
  // the button sits under the code (like Sign-ups), so it's on screen on a phone without scrolling sideways
  return `<tr data-id="${o.id}" class="in st-${o.status}" style="--i:${Math.min(i, 16)}">
    <td class="nowrap"><span class="mono">${esc(o.code)}</span>${o.status === "pending" ? `<button class="btn btn--primary btn--xs" data-check>${icon("eye")} Check receipt</button>`
      : o.proof_path ? `<button class="btn btn--ghost btn--xs" data-check>${icon("eye")} Receipt</button>` : ""}</td>
    <td>${l ? `<b>${esc(l.name)}</b><small><a href="mailto:${esc(l.email)}">${esc(l.email)}</a></small>` : `<span class="muted">Learner #${o.learner_id}</span>`}</td>
    <td class="nowrap">${esc(sess(o.sessions))}</td>
    <td class="r nowrap"><b>${esc(peso(o.amount))}</b></td>
    <td class="st"><span class="spill spill--${o.status}">${STATUS[o.status] || esc(o.status)}</span>${checked}${o.status === "rejected" && o.note ? `<small title="Sent to them">“${esc(o.note)}”</small>` : ""}</td>
    <td class="muted nowrap">${esc(fmt(o.created_at))}</td>
  </tr>`;
}

/* the receipt next to the Paid / Not paid buttons, so checking and deciding is one place */
function showOrder(o) {
  const l = learnerOf(o), name = l?.name || `Learner #${o.learner_id}`, who = first(name);
  const pending = o.status === "pending", what = words(o.sessions);
  const isOpen = !!l && o.sessions.every((n) => l.unlocked.includes(n));
  const info = pending
    ? `Find this payment in GCash (Transactions): <b>${esc(peso(o.amount))}</b>, same reference number. ${isOpen ? `${what} ${many(o.sessions) ? "are" : "is"} already open for ${esc(who)}.` : `${what} open${many(o.sessions) ? "" : "s"} for ${esc(who)} when you click Paid.`}`
    : `${STATUS[o.status]}${o.checked_by ? `, checked by ${esc(o.checked_by)}` : ""}${o.checked_at ? ` on ${esc(fmt(o.checked_at))}` : ""}.${o.note ? ` Note in their email: “${esc(o.note)}”` : ""}`;
  openDrawer({
    eyebrow: `${esc(o.code)} · ${esc(peso(o.amount))} · ${esc(sess(o.sessions))}`,
    title: esc(name),
    body: `<p class="muted">${info}</p>
      <div class="proof">${o.proof_path ? `<span class="muted" id="proofLoading">Loading receipt…</span><img id="proofImg" alt="${esc(name)}’s GCash receipt" hidden />` : `<span class="muted">No receipt came with this order.</span>`}</div>
      ${pending ? `<div class="notebox" id="noteBox" hidden>
        <label for="rejNote"><b>Not paid?</b> ${esc(who)} gets an email saying we couldn’t match the receipt, and ${what} ${isOpen ? `lock${many(o.sessions) ? "" : "s"} again` : `stay${many(o.sessions) ? "" : "s"} locked`}. Add a short note for the email if it helps.</label>
        <textarea id="rejNote" rows="3" maxlength="500" placeholder="e.g. We couldn’t find ${esc(peso(o.amount))} with that reference number in GCash."></textarea>
      </div>` : ""}`,
    actions: pending ? `<button class="btn btn--ghost btn--danger-text" id="notPaid">${icon("x")} Not paid</button><span class="grow"></span><button class="btn btn--primary" id="isPaid">${icon("check")} Paid</button>` : "",
    onMount: async (el) => {
      const nb = el.querySelector("#notPaid"), pb = el.querySelector("#isPaid");
      const busy = (on) => [nb, pb].forEach((b) => b && (b.disabled = on));
      nb?.addEventListener("click", async () => {
        const box = el.querySelector("#noteBox");
        if (box.hidden) { // first click: ask for the note, second click sends
          box.hidden = false;
          nb.className = "btn btn--danger";
          nb.innerHTML = `${icon("send")} Send: not paid`;
          el.querySelector("#rejNote").focus({ preventScroll: true });
          box.scrollIntoView({ block: "end", behavior: "smooth" }); // above the sticky buttons
          return;
        }
        busy(true);
        try {
          const out = await checkCourseOrder(o.id, false, el.querySelector("#rejNote").value.trim());
          closeDrawer();
          toast(out.emailed ? `${name}: not paid. ${what} ${isOpen ? "locked again" : "stay locked"}, and they got an email.` : `${name}: not paid, but the email didn’t send. Email them from the Blueprint inbox.`, out.emailed ? "" : "bad");
        } catch (e) { busy(false); if (e.message === "checked") { closeDrawer(); reloadCourse().catch(() => {}); toast("Someone on the team already checked this one.", "bad"); } else toast("Couldn’t save. Try again.", "bad"); }
      });
      pb?.addEventListener("click", async () => {
        if (!(await confirmBox(`Mark ${o.code} as paid? Only if you found ${peso(o.amount)} in GCash with the same reference number.${isOpen ? "" : ` This opens ${what} for ${who}.`}`, { ok: "Paid", tone: "" }))) return;
        busy(true);
        try {
          await checkCourseOrder(o.id, true);
          closeDrawer();
          toast(`${name}: paid.${isOpen ? "" : ` ${what} ${many(o.sessions) ? "are" : "is"} open now.`}`);
        } catch (e) { busy(false); if (e.message === "checked") { closeDrawer(); reloadCourse().catch(() => {}); toast("Someone on the team already checked this one.", "bad"); } else toast("Couldn’t save. Try again.", "bad"); }
      });
      if (!o.proof_path) return;
      const im = el.querySelector("#proofImg"), msg = el.querySelector("#proofLoading");
      try {
        im.onload = () => { msg.hidden = true; im.hidden = false; };
        im.src = await courseReceipt(o.id); // decrypted by the server, which logs that you opened it
      } catch { msg.textContent = "Couldn’t load the receipt. Try again."; }
    },
  });
}

/* ---------- owner: each module's video and slides ---------- */
const LINKS = [["video_url", "Video", "https://youtu.be/…", "Unlisted YouTube (or Google Drive / Vimeo). Shows at the top of the module."],
  ["slides_url", "Slides", "https://…", "The deck, shown until the video is up (Canva, Google Slides or a PDF link)."]];
function setup() {
  const rows = S.data.course_sessions || [];
  const count = (k) => rows.filter((s) => s[k]).length;
  const ws = rows.filter((s) => (s.worksheet || []).length).length;
  return `<details class="card fold cset" id="setupFold" ${folds.setup ? "open" : ""}>
    <summary class="ch ch--pad"><h3>${icon("globe")} Course setup</h3><span class="muted">${count("video_url")} of 4 videos · ${count("slides_url")} of 4 slides · ${ws} of 4 worksheets</span>${icon("down", "fold__chev")}</summary>
    <div class="fold__body payset">
      ${SESSIONS.map((n) => {
        const s = rows.find((x) => x.n === n);
        return `<div class="payset__f cset__wide"><span>Module ${n}${s?.title ? `: ${esc(s.title)}` : ""}${s?.minutes ? ` <small>${s.minutes} min · ${(s.worksheet || []).filter((q) => q.id).length} worksheet questions</small>` : ""}</span>
          <div class="cset__vids">${LINKS.map(([k, label, ph]) => `<label><small>${label}</small><input class="cell-in" data-link="${k}" data-n="${n}" type="url" maxlength="300" value="${esc(s?.[k] || "")}" placeholder="${ph}" ${s ? "" : "disabled"} /></label>`).join("")}</div></div>`;
      }).join("")}
      <small class="cset__wide">${LINKS.map(([, l, , help]) => `<b>${l}:</b> ${help}`).join(" ")} Only buyers whose module is open get these links. The worksheets are Thomas’s questions; changing them is a script, so ask Keira.</small>
    </div>
  </details>`;
}

function wireSetup(root) {
  if (!S.owner) return;
  root.querySelector("#setupFold")?.addEventListener("toggle", (e) => (folds.setup = e.target.open));
  const okUrl = (url) => !url || /^https:\/\/\S+$/i.test(url);
  root.querySelectorAll("[data-link]").forEach((inp) => inp.addEventListener("change", async () => {
    const n = Number(inp.dataset.n), k = inp.dataset.link, url = inp.value.trim(), what = LINKS.find(([x]) => x === k)[1];
    if (!okUrl(url)) return toast("Paste a link that starts with https://", "bad");
    try { await update("course_sessions", n, { [k]: url }); toast(url ? `Saved. Module ${n} shows the ${what.toLowerCase()} now.` : `${what} removed from Module ${n}.`); }
    catch { toast("Couldn’t save.", "bad"); }
  }));
}

/* ---------- review calls: add open times, see who booked, cancel ---------- */
function reviews(slots, learners, done) {
  const now = Date.now(), byId = new Map(learners.map((l) => [l.id, l]));
  const upcoming = slots.filter((x) => Date.parse(x.starts_at) + (x.minutes || 15) * 60e3 > now);
  const past = slots.filter((x) => x.learner_id && Date.parse(x.starts_at) + (x.minutes || 15) * 60e3 <= now);
  const days = new Map();
  for (const x of upcoming) { const k = dayKey(x.starts_at); if (!days.has(k)) days.set(k, []); days.get(k).push(x); }
  const who = (r) => mem.get(`bp_review_who`) || (S.me?.name?.startsWith("Kurt") ? REVIEWERS[1] : REVIEWERS[0]);
  const slotRow = (x) => {
    const l = x.learner_id && byId.get(x.learner_id), d = l ? done.get(l.id) || [] : [];
    return `<li class="rslot ${x.learner_id ? "is-booked" : ""}" data-slot="${x.id}">
      <span class="rslot__t"><b>${esc(tm(x.starts_at))}</b><small>${esc(x.reviewer.split(" ")[0])}</small></span>
      ${x.learner_id
        ? `<span class="rslot__who"><b>${esc(l?.name || `Learner #${x.learner_id}`)}</b><small>${l ? `<a href="mailto:${esc(l.email)}">${esc(l.email)}</a> · ` : ""}${d.length} of 4 worksheets${x.meet_url ? "" : " · no Meet link"}</small></span>
           <span class="rslot__act">${l ? `<button class="btn btn--ghost btn--xs" data-ans="${l.id}">${icon("doc")} Answers</button>` : ""}<button class="btn btn--ghost btn--xs btn--danger-text" data-cancel>${icon("x")} Cancel</button></span>`
        : `<span class="rslot__who muted">Open${x.meet_url ? "" : " · no Meet link"}</span><span class="rslot__act"><button class="iconbtn" data-remove title="Remove this open time" aria-label="Remove this open time">${icon("trash")}</button></span>`}
    </li>`;
  };
  return `<section class="card">
    <div class="ch"><h3>${icon("calendar")} Review calls</h3><span class="muted">15 minutes each on Google Meet · learners book on /learn, up to 12 hours before · they can change until 24 hours before · until Dec 5</span></div>
    <form class="radd" id="rAdd">
      <label><small>Day</small><input class="cell-in" type="date" id="rDate" min="${todayManila()}" max="2026-12-05" value="${esc(mem.get("bp_review_date") || "")}" required /></label>
      <label><small>From</small><input class="cell-in" type="time" id="rFrom" step="900" value="${esc(mem.get("bp_review_from") || "16:00")}" required /></label>
      <label><small>To</small><input class="cell-in" type="time" id="rTo" step="900" value="${esc(mem.get("bp_review_to") || "17:00")}" required /></label>
      <label><small>Reviewer</small><select class="cell-in" id="rWho">${REVIEWERS.map((r) => `<option ${r === who() ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></label>
      <label class="radd__meet"><small>Google Meet link <span class="muted">(remembered per reviewer)</span></small><input class="cell-in" type="url" id="rMeet" maxlength="290" placeholder="https://meet.google.com/…" value="${esc(mem.get(`bp_meet_${who()}`))}" /></label>
      <button class="btn btn--primary" type="submit">${icon("plus")} Add open times</button>
    </form>
    ${days.size ? `<div class="rdays">${[...days].map(([k, xs]) => `<div class="rday"><h4>${esc(dayName(xs[0].starts_at))}<span class="muted">${xs.filter((x) => x.learner_id).length} booked · ${xs.filter((x) => !x.learner_id).length} open</span></h4><ul>${xs.map(slotRow).join("")}</ul></div>`).join("")}</div>`
      : `<p class="muted rnone">No open times yet. Add a block above (e.g. 4:00 to 5:00 PM makes four 15-minute times). Learners see them on /learn right away.</p>`}
    ${past.length ? `<details class="more rpast" id="pastFold" ${folds.past ? "open" : ""}><summary>${past.length} past call${past.length === 1 ? "" : "s"}${icon("down", "fold__chev")}</summary><ul>${past.map((x) => `<li><b>${esc(fmt(x.starts_at))}</b> · ${esc(byId.get(x.learner_id)?.name || `Learner #${x.learner_id}`)} · ${esc(x.reviewer)}</li>`).join("")}</ul></details>` : ""}
  </section>`;
}

function wireReviews(root, rerender) {
  const form = root.querySelector("#rAdd");
  if (!form) return;
  const who = form.querySelector("#rWho"), meet = form.querySelector("#rMeet");
  who.addEventListener("change", () => { mem.set("bp_review_who", who.value); meet.value = mem.get(`bp_meet_${who.value}`); });
  root.querySelector("#pastFold")?.addEventListener("toggle", (e) => (folds.past = e.target.open));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const date = form.querySelector("#rDate").value, from = form.querySelector("#rFrom").value, to = form.querySelector("#rTo").value, link = meet.value.trim();
    if (!date || !from || !to) return toast("Pick the day and the times.", "bad");
    if (link && !/^https:\/\/\S+$/i.test(link)) return toast("The Meet link should start with https://", "bad");
    mem.set("bp_review_date", date); mem.set("bp_review_from", from); mem.set("bp_review_to", to); mem.set("bp_review_who", who.value);
    if (link) mem.set(`bp_meet_${who.value}`, link);
    const btn = form.querySelector("button[type=submit]"); btn.disabled = true;
    try {
      const out = await reviewAction("slotsAdd", { date, from, to, reviewer: who.value, meet: link });
      toast(out.added ? `Added ${out.added} open time${out.added === 1 ? "" : "s"}.${out.asked > out.added ? ` ${out.asked - out.added} were already there.` : ""}` : "Those times were already there.");
    } catch (err) {
      toast({ past: "That time has already passed.", late: "Calls run until Dec 5.", range: "“To” has to be after “From” (12 hours at most).", meet: "Check the Meet link.", not_on_team: "Only the core team can add times." }[err.message] || "Couldn’t add those times.", "bad");
    } finally { btn.disabled = false; }
  });
  root.querySelectorAll(".rslot").forEach((li) => li.addEventListener("click", async (e) => {
    const id = Number(li.dataset.slot), x = (S.data.review_slots || []).find((s) => s.id === id);
    if (!x) return;
    const ans = e.target.closest("[data-ans]");
    if (ans) { const l = (S.data.learners || []).find((y) => y.id === Number(ans.dataset.ans)); if (l) showAnswers(l); return; }
    if (e.target.closest("[data-remove]")) {
      try { await reviewAction("slotRemove", { id }); toast(`Removed ${tm(x.starts_at)}.`); }
      catch (err) { toast(err.message === "booked" ? "Someone just booked that time." : "Couldn’t remove it.", "bad"); }
      return;
    }
    if (e.target.closest("[data-cancel]")) {
      const l = (S.data.learners || []).find((y) => y.id === x.learner_id);
      if (!(await confirmBox(`Cancel ${l?.name || "this learner"}’s review call on ${fmt(x.starts_at)}? They get an email asking them to pick another time, and the time opens up again.`, { ok: "Cancel the call" }))) return;
      try { const out = await reviewAction("slotCancel", { id }); toast(out.emailed ? "Cancelled. They got an email to pick another time." : "Cancelled. The email didn’t send, so message them yourself.", out.emailed ? "" : "bad"); }
      catch { toast("Couldn’t cancel it.", "bad"); }
    }
  }));
}

/* ---------- a learner's worksheet answers ---------- */
const sessionsById = () => new Map((S.data.course_sessions || []).map((s) => [s.n, s]));
function answerText(q, a) {
  const v = a[q.id];
  if (q.t === "checks") return (v || []).join(", ");
  if (q.t === "grid") return q.rows.map((r) => `${r}: ${((v || {})[r] || []).join(", ") || "none"}`).join("\n");
  if (q.t === "tick") return v === true ? "Yes" : "";
  if (q.t === "choice" && q.more && v === q.more.v && a[`${q.id}_more`]) return `${v}: ${a[`${q.id}_more`]}`;
  return String(v ?? "");
}
async function showAnswers(l) {
  const mods = sessionsById();
  openDrawer({
    eyebrow: `${esc(l.email)} · ${esc(l.year)}`,
    title: `${esc(l.name)}’s worksheets`,
    wide: true,
    body: `<p class="muted" id="ansLoading">Loading answers…</p><div id="ansBody" class="answers"></div>`,
    onMount: async (el) => {
      try {
        const rows = await workAnswers(l.id);
        const body = el.querySelector("#ansBody");
        el.querySelector("#ansLoading").hidden = true;
        if (!rows.length) { body.innerHTML = `<p class="muted">${esc(first(l.name))} hasn’t started a worksheet yet.</p>`; return; }
        body.innerHTML = SESSIONS.map((n) => {
          const w = rows.find((r) => r.session === n), m = mods.get(n);
          if (!w) return `<details class="ans"><summary><b>Module ${n}${m ? `: ${esc(m.title)}` : ""}</b><span class="muted">Not started</span></summary></details>`;
          const items = (m?.worksheet || []);
          const qs = items.map((q) => q.t === "sec" ? `<h5>${esc(q.title)}</h5>` : (() => { const t = answerText(q, w.answers || {}); return `<div class="ans__q"><p class="ans__l">${esc(q.label)}</p><p class="ans__a ${t.trim() ? "" : "muted"}">${t.trim() ? esc(t) : "No answer"}</p></div>`; })()).join("");
          return `<details class="ans" ${w.completed_at ? "open" : ""}><summary><b>Module ${n}${m ? `: ${esc(m.title)}` : ""}</b><span class="${w.completed_at ? "" : "muted"}">${w.completed_at ? `Submitted ${esc(fmt(w.completed_at))}` : `Draft, saved ${esc(fmt(w.updated_at))}`}</span></summary>${qs}</details>`;
        }).join("");
      } catch { el.querySelector("#ansLoading").textContent = "Couldn’t load the answers. Try again."; }
    },
  });
}

/* one module's answers as a CSV (opens in Google Sheets / Excel) */
async function csv(n, btn) {
  btn.disabled = true;
  try {
    const rows = (await workAnswers()).filter((r) => r.session === n);
    if (!rows.length) return toast(`Nobody has started Module ${n} yet.`);
    const m = sessionsById().get(n), items = (m?.worksheet || []).filter((q) => q.id);
    const byId = new Map((S.data.learners || []).map((l) => [l.id, l]));
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Name", "Email", "Year", "Status", "Submitted", "Last saved", ...items.map((q) => q.label)];
    const lines = rows.map((r) => {
      const l = byId.get(r.learner_id) || {};
      return [l.name, l.email, l.year, r.completed_at ? "Submitted" : "Draft", r.completed_at ? fmt(r.completed_at) : "", fmt(r.updated_at), ...items.map((q) => answerText(q, r.answers || {}))].map(cell).join(",");
    });
    download(`blueprint-module-${n}-answers.csv`, "\ufeff" + [head.map(cell).join(","), ...lines].join("\r\n"), "text/csv");
    toast(`Downloaded Module ${n}: ${rows.length} learner${rows.length === 1 ? "" : "s"}. Keep it private.`);
  } catch { toast("Couldn’t load the answers.", "bad"); }
  finally { btn.disabled = false; }
}
