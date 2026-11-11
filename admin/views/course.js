/* Course: Blueprint Online at /learn (migrations 014, 017; api/learn.js).
   Since the Nov 11 night plan buyers pay on the site (Sign-ups page); Paid emails them a link that signs them in.
   Four modules, in order: each is a video (or the deck until the video is up), Thomas's page text and a Google Form.
   They tick "I've sent my form" to open the next one. Module 4 done → the 1:1 booking link, and they count for the certificate.
   The owner pastes the video, slides, form and booking links here. Guests never see this page.
   Old per-session receipts (course_orders, before the night plan) still show if there are any. */
import { S, update, setting, saveSetting, reloadCourse, courseReceipt, checkCourseOrder } from "/admin/store.js";
import { esc, icon, copy, toast, confirmBox, countUps, peso, openDrawer, closeDrawer } from "/admin/lib.js";
import { empty } from "/admin/ui.js";

const SESSIONS = [1, 2, 3, 4];
const STATUS = { pending: "Pending", paid: "Paid", rejected: "Not paid" };
const VIA = { online: "Bought", gift: "Gift", refunded: "Refunded, free", workshop: "Workshop ticket", demo: "Demo" };
const f = { q: "" };
const folds = { rules: false, setup: false }; // stay open or shut when the page redraws
const fmt = (iso) => new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const day = (iso) => new Date(iso).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric" });
const first = (name = "") => name.trim().split(/\s+/)[0] || "They";
const sorted = (ns = []) => [...ns].sort((a, b) => a - b).map((n) => `S${n}`);
const sess = (ns) => sorted(ns).join(", ");
const words = (ns) => { const s = sorted(ns); return s.length > 1 ? `${s.slice(0, -1).join(", ")} and ${s.at(-1)}` : s[0] || ""; };
const many = (ns) => ns.length > 1;
const learnerOf = (o) => (S.data.learners || []).find((l) => l.id === o.learner_id);

const RULES = [
  "Only use these details to run Blueprint Online. Emailing more than one learner? Put the emails in <b>BCC</b>.",
  "Payments are checked on the <a href=\"#inquiries\">Sign-ups</a> page: find their GCash reference number (₱349), click Paid, and the course link goes out by itself.",
  "Thomas reads each learner’s form answers in the Blueprint Online Tracker before their 1:1. The certificate goes out when all four forms are in the tracker.",
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

    root.innerHTML = `
      <header class="ph">
        <div>
          <h1 class="ph__title">Course</h1>
          <p class="ph__sub">Blueprint Online at <a href="/learn" target="_blank" rel="noopener">/learn</a>. Buyers get in through the link in their “You’re in” email. They do the four modules in order, and finishing Module 4 shows them the 1:1 booking link.</p>
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
        <div class="stat"><span class="stat__k">Module 1 done</span><span class="stat__n"><b data-count="${finished(1)}">0</b>${learners.length ? `<small>of ${learners.length}</small>` : ""}</span><span class="stat__sub">Sent the Sino Ka? form</span></div>
        <div class="stat"><span class="stat__k">Module 2 done</span><span class="stat__n"><b data-count="${finished(2)}">0</b></span><span class="stat__sub">Résumé and LinkedIn</span></div>
        <div class="stat"><span class="stat__k">Ready for the 1:1</span><span class="stat__n"><b data-count="${finished(4)}">0</b></span><span class="stat__sub">Finished all four: booking link and certificate</span></div>
      </section>

      ${rows.length ? `<section class="card">
        <div class="ch"><h3>${icon("wallet")} Old course orders</h3><span class="muted">${pending.length} to check · from before the ₱349 plan</span></div>
        <div class="tablewrap"><table class="table table--regs table--course">
          <thead><tr><th>Order</th><th>Learner</th><th>What</th><th class="r">Amount</th><th>Status</th><th>When</th></tr></thead>
          <tbody id="orders">${rows.map((o, i) => orderRow(o, i)).join("")}</tbody></table></div>
      </section>` : ""}

      <section class="card">
        <div class="ch ch--tools"><h3>${icon("users")} Learners</h3>
          ${learners.length ? `<label class="search">${icon("search")}<input id="q" placeholder="Search name or email" value="${esc(f.q)}" /></label><span class="muted">${list.length} of ${learners.length}</span>` : `<span class="muted">Everyone who opened the course</span>`}</div>
        ${list.length ? `<div class="tablewrap"><table class="table table--regs table--course">
          <thead><tr><th>Name</th><th>Year</th><th>How they got it</th><th>Modules done</th><th>Last seen</th></tr></thead>
          <tbody>${list.map((l, i) => `<tr class="in" style="--i:${Math.min(i, 16)}">
            <td><b>${esc(l.name)}</b><small><a href="mailto:${esc(l.email)}">${esc(l.email)}</a></small></td>
            <td class="nowrap">${esc(l.year)}</td>
            <td>${l.via ? `<span class="tag">${esc(VIA[l.via] || l.via)}</span>` : `<span class="muted">—</span>`}</td>
            <td>${chips(l, done.get(l.id) || [])}</td>
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
    wireSetup(root);
  },
};

/* M1 to M4: done ones filled in their module colour, the rest grey */
function chips(l, doneNs) {
  return `<span class="sess">${SESSIONS.map((n) => {
    const on = doneNs.includes(n);
    return `<span class="tag ${on ? `tag--s${n}` : "is-off"}" title="Module ${n}: ${on ? "form sent" : "not yet"}">M${n}${on ? " ✓" : ""}</span>`;
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

/* ---------- owner: each module's links, and the 1:1 booking link ---------- */
const LINKS = [["video_url", "Video", "https://youtu.be/…", "Unlisted YouTube (or Google Drive / Vimeo). Shows at the top of the module."],
  ["slides_url", "Slides", "https://…", "The deck, shown until the video is up (Canva, Google Slides or a PDF link)."],
  ["form_url", "Google Form", "https://forms.gle/…", "The worksheet. The module page’s main button opens it."]];
function setup() {
  const c = setting("course"), rows = S.data.course_sessions || [];
  const count = (k) => rows.filter((s) => s[k]).length;
  return `<details class="card fold cset" id="setupFold" ${folds.setup ? "open" : ""}>
    <summary class="ch ch--pad"><h3>${icon("globe")} Course setup</h3><span class="muted">${count("form_url")} of 4 forms · ${count("video_url")} of 4 videos · ${c.booking ? "booking link set" : "no booking link yet"}</span>${icon("down", "fold__chev")}</summary>
    <div class="fold__body payset">
      ${SESSIONS.map((n) => {
        const s = rows.find((x) => x.n === n);
        return `<div class="payset__f cset__wide"><span>Module ${n}${s?.title ? `: ${esc(s.title)}` : ""}${s?.minutes ? ` <small>${s.minutes} min</small>` : ""}</span>
          <div class="cset__vids">${LINKS.map(([k, label, ph]) => `<label><small>${label}</small><input class="cell-in" data-link="${k}" data-n="${n}" type="url" maxlength="300" value="${esc(s?.[k] || "")}" placeholder="${ph}" ${s ? "" : "disabled"} /></label>`).join("")}</div></div>`;
      }).join("")}
      <small class="cset__wide">${LINKS.map(([, l, , help]) => `<b>${l}:</b> ${help}`).join(" ")} Only buyers whose module is open get these links.</small>
      <label class="payset__f cset__wide"><span>1:1 booking link <small>Shown once a learner finishes Module 4 (Google Calendar booking page, Calendly…). Calls run until Dec 5.</small></span>
        <input class="cell-in" id="cBooking" type="url" maxlength="300" value="${esc(c.booking || "")}" placeholder="https://calendar.app.google/…" /></label>
    </div>
  </details>`;
}

function wireSetup(root) {
  if (!S.owner) return;
  root.querySelector("#setupFold")?.addEventListener("toggle", (e) => (folds.setup = e.target.open));
  const okUrl = (url) => !url || /^https:\/\/\S+$/i.test(url);
  root.querySelector("#cBooking")?.addEventListener("change", async (e) => {
    const url = e.target.value.trim();
    if (!okUrl(url)) return toast("Paste a link that starts with https://", "bad");
    try { await saveSetting("course", { ...setting("course"), booking: url }); toast(url ? "Saved. Learners who finish Module 4 see it now." : "Booking link removed."); }
    catch { toast("Couldn’t save.", "bad"); }
  });
  root.querySelectorAll("[data-link]").forEach((inp) => inp.addEventListener("change", async () => {
    const n = Number(inp.dataset.n), k = inp.dataset.link, url = inp.value.trim(), what = LINKS.find(([x]) => x === k)[1];
    if (!okUrl(url)) return toast("Paste a link that starts with https://", "bad");
    try { await update("course_sessions", n, { [k]: url }); toast(url ? `Saved. Module ${n} shows the ${what.toLowerCase()} now.` : `${what} removed from Module ${n}.`); }
    catch { toast("Couldn’t save.", "bad"); }
  }));
}
