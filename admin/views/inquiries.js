/* Sign-ups: everyone who registered on the site. Since the Nov 11 night plan that's Blueprint Online (₱349, no seat limit):
   they type their GCash reference number on /pay, the team finds it in GCash and clicks Paid, which emails the course link
   (to the gift's recipient if it's a gift). "Refunded, free access" is for last week's workshop buyers: it emails them the course free.
   Before that:
   They pay by GCash and upload a screenshot of the receipt on their own /pay link; anyone on the team opens it,
   checks GCash and clicks Paid, which emails the slot confirmation (api/signups.js). Notes, downloading, deleting and the payment setup stay with the owner.
   The rules box matches what privacy.html promises sign-ups. */
import { S, update, remove, setting, saveSetting, setRegStatus, signupAction, eraseRegistrations, receipt, accessLog } from "/admin/store.js";
import { supa } from "/admin/supa.js";
import { esc, icon, copy, toast, download, confirmBox, countUps, todayISO, peso, openDrawer, closeDrawer } from "/admin/lib.js";
import { empty } from "/admin/ui.js";

const STATUSES = [["registered", "Registered"], ["paid", "Paid"], ["refunded", "Refunded, free access"], ["cancelled", "Cancelled"], ["waitlist", "Waitlist"]];
const HELP = { registered: "Signed up, waiting to pay", paid: "Has the course", refunded: "Last week’s buyers, free", waitlist: "Old workshop seats", cancelled: "Not buying" };
const BREAK_EVEN = 14; // Thomas's doc 00: 14 × ₱349 covers the ₱4,650 spent on materials
const f = { q: "", status: "" };
const fmt = (iso) => new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const label = (k) => (STATUSES.find(([s]) => s === k) || [, k])[1];
/* their ticket (migrations 010, 011): "Full Pass", "Single · S2, S3", or "Barkada · 3 Full Passes" */
const ALL = [1, 2, 3, 4];
const sessionsOf = (r) => (r.ticket === "single" || r.ticket === "free" ? r.sessions || [] : ALL);
const ticketOf = (r) => (r.ticket === "online" ? "Blueprint Online" : r.ticket === "single" || r.ticket === "free" ? `${r.ticket === "free" ? "Free" : "Single"} · ${sessionsOf(r).map((n) => `S${n}`).join(", ")}` : r.ticket === "barkada" ? "Barkada · 3 Full Passes" : "Full Pass");
const friendsOf = (r) => (r.friends || []).map((x) => x.name).filter(Boolean);
/* seats are per session: a Full Pass takes one in all four, a Barkada three (same count as api/signups.js) */
const seatsOf = (r) => (r.ticket === "barkada" ? 3 : 1);

/* pilot prices (Nov 7, api/_lib.js PRICE): every amount that can show up in GCash */
const AMOUNTS = [["₱349", "Blueprint Online"], ["₱299", "old: 1 session"], ["₱598", "2 sessions"], ["₱799", "Full Pass"], ["₱1,999", "Barkada of 3"], ["₱500", "upgrade after 1 session"], ["₱201", "upgrade after 2 sessions"]];
const amountsLine = AMOUNTS.map(([a, w]) => `<b>${a}</b> ${w}`).join(" · ");
const RULES = [
  "Only use these details to run Blueprint.",
  "Emailing more than one person? Put the emails in <b>BCC</b>.",
  "No screenshots or copies in group chats. Send people here instead.",
  "Before clicking Paid, find their reference number in GCash (Transactions). The amount must be ₱349. Paid emails them the course link right away.",
  "Then add a row to the Buyers tab of the Blueprint Online Tracker. At the booth, also post their name and a screenshot of the payment in the GC.",
  `Amounts you might see in GCash: ${amountsLine}. Anything else, check before clicking Paid.`,
  "Receipts stay here. Don’t download them or send them to chats. They’re stored encrypted, and each time someone opens one it’s logged.",
  "Questions from participants: answer them on the Questions page, not from your own email, DMs or group chats.",
  "Something leaked or got sent to the wrong person? Tell Keira right away. We have 72 hours to report it.",
];

export default {
  id: "inquiries", title: "Sign-ups", icon: "inbox",
  badge: () => (S.data.registrations || []).filter(toCheck).length || "",
  render(root) {
    const regs = S.data.registrations || [];
    const list = regs.filter((r) => (!f.status || r.status === f.status) && (!f.q || [r.name, r.email, r.mobile, r.course, r.year, r.heard_from, r.heard_org, r.notes, ticketOf(r), ...friendsOf(r)].join(" ").toLowerCase().includes(f.q.toLowerCase())));
    const count = (s) => regs.filter((r) => r.status === s).length;
    const checking = regs.filter(toCheck);
    const paidOnline = regs.filter((r) => r.ticket === "online" && r.status === "paid").length;
    const shown = STATUSES.filter(([k]) => k !== "waitlist" || count(k));

    root.innerHTML = `
      <header class="ph">
        <div>
          <h1 class="ph__title">Sign-ups</h1>
          <p class="ph__sub">${checking.length ? `<b>${checking.length} to check.</b> Find their reference number in GCash (₱349), then click Paid. That emails them the course link.` : `Everyone who registered for Blueprint Online. When someone types their GCash reference number, it shows here with a Paid button.`} Send access within 1 hour, 8 AM to 10 PM. No limit on buyers; sales close Sun Nov 15, 10 PM.</p>
        </div>
        <div class="ph__actions">
          <button class="btn btn--ghost" id="copyEmails" title="Copy the emails shown below, to paste in BCC">${icon("copy")} Copy emails</button>
          ${S.owner ? `<button class="btn btn--ghost" id="csv" title="Download the list below as a spreadsheet">${icon("download")} Download</button>` : ""}
        </div>
      </header>

      <details class="more">
        <summary>${icon("lock")} Private: how to handle sign-ups${icon("down", "fold__chev")}</summary>
        <ul class="rules">${RULES.map((r) => `<li>${r}</li>`).join("")}</ul>
        ${S.owner ? `<p class="footnote">We promised to delete everyone’s details within 60 days after the last session (<a href="/privacy.html" target="_blank" rel="noopener">privacy notice</a>). Delete any downloads too.
          ${regs.length ? `<button class="btn btn--ghost btn--xs" id="eraseAll">${icon("trash")} Erase all ${regs.length} sign-ups</button>` : ""}</p>
        <p class="footnote">${icon("eye")} <b>Access log:</b> who opened a receipt, marked someone paid, resent an email or answered a question. Check it if something looks off. <button class="btn btn--ghost btn--xs" id="showLog">Show</button></p>
        <ul class="alog" id="alog" hidden></ul>` : ""}
      </details>

      ${S.owner ? paySetup() : ""}

      <section class="stats">
        ${shown.map(([k, l]) => `<button class="stat ${f.status === k ? "is-on" : ""}" data-k="${k}">
          <span class="stat__k"><i class="sdot sdot--${k}"></i>${l}</span>
          <span class="stat__n"><b data-count="${count(k)}">0</b>${k === "paid" ? `<small>${paidOnline} online of ${BREAK_EVEN} to break even</small>` : ""}</span>
          ${k === "paid" ? `<i class="meter" title="Blueprint Online paid: ${paidOnline} of ${BREAK_EVEN}"><i style="--w:${Math.min(100, (paidOnline / BREAK_EVEN) * 100)}%"></i></i>` : `<span class="stat__sub">${HELP[k]}</span>`}
        </button>`).join("")}
      </section>

      <div class="card filters">
        <label class="search">${icon("search")}<input id="q" placeholder="Search name, email, course, org" value="${esc(f.q)}" /></label>
        <label class="pick"><span>Status</span><select id="st"><option value="">All</option>${STATUSES.map(([k, l]) => `<option value="${k}" ${f.status === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <span class="grow"></span>
        <span class="muted">${list.length} of ${regs.length}</span>
      </div>

      ${list.length ? `<div class="card tablewrap"><table class="table table--regs">
        <thead><tr><th>Name</th><th>GCash</th><th>Mobile</th><th>Course</th><th>Heard from</th><th>Status</th><th>Notes</th><th>Signed up</th>${S.owner ? "<th></th>" : ""}</tr></thead>
        <tbody>${list.map((r, i) => `<tr data-id="${r.id}" class="in st-${r.status}" style="--i:${Math.min(i, 16)}">
          <td><b>${esc(r.name)}</b><small><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></small>${friendsOf(r).length ? `<small>+ ${esc(friendsOf(r).join(", "))}</small>` : ""}${r.gift_email ? `<small>${icon("send")} Gift for <b>${esc(r.gift_name)}</b> · ${esc(r.gift_email)}</small>` : ""}</td>
          <td class="nowrap">${payCell(r)}</td>
          <td class="nowrap">${r.mobile ? `<a href="tel:${esc(r.mobile.replace(/[^\d+]/g, ""))}">${esc(r.mobile)}</a>` : `<span class="muted">—</span>`}</td>
          <td>${esc(r.course)}<small>${esc(r.year)}</small></td>
          <td>${r.heard_from ? `${esc(r.heard_from)}${r.heard_org ? `<small>${esc(r.heard_org)}</small>` : ""}` : `<span class="muted">—</span>`}</td>
          <td><select class="spill spill--${r.status}" data-status aria-label="Status">${STATUSES.map(([k, l]) => `<option value="${k}" ${k === r.status ? "selected" : ""}>${l}</option>`).join("")}</select></td>
          <td>${S.owner ? `<input class="note" data-field="notes" value="${esc(r.notes)}" placeholder="Add a note" maxlength="2000" />` : esc(r.notes)}</td>
          <td class="muted nowrap">${esc(fmt(r.created_at))}</td>
          ${S.owner ? `<td><button class="iconbtn" data-del title="Delete">${icon("trash")}</button></td>` : ""}
        </tr>`).join("")}</tbody></table></div>` : `<div class="card">${empty(regs.length ? "Nothing matches that search." : "No sign-ups yet. They show up here as soon as someone registers.", "inbox")}</div>`}`;

    countUps(root);
    const rerender = () => this.render(root);
    const emails = list.map((r) => r.email);
    root.querySelector("#copyEmails").addEventListener("click", () => (emails.length ? copy(emails.join(", "), `Copied ${emails.length} email${emails.length > 1 ? "s" : ""}. Paste them in BCC, not To.`) : toast("No emails to copy.")));
    wirePaySetup(root);
    root.querySelector("#showLog")?.addEventListener("click", async (e) => {
      const ul = root.querySelector("#alog");
      try {
        const rows = await accessLog();
        const who = (t) => (t.startsWith("q") ? "a question" : t.startsWith("course:") ? `course order ${(S.data.course_orders || []).find((o) => `course:${o.id}` === t)?.code || t.slice(7)}` : regs.find((r) => String(r.id) === t)?.name || `sign-up #${t}`);
        ul.innerHTML = rows.length ? rows.map((a) => `<li><span>${esc(fmt(a.at))}</span><span><b>${esc(a.who)}</b> ${esc(a.action)}: ${esc(who(a.target))}</span></li>`).join("") : `<li><span>Nothing yet.</span></li>`;
        ul.hidden = false; e.target.hidden = true;
      } catch { toast("Couldn’t load the log.", "bad"); }
    });
    root.querySelector("#eraseAll")?.addEventListener("click", async () => {
      if (!(await confirmBox(`Erase all ${regs.length} sign-ups and their receipts for good? Only do this after the program is over. This can’t be undone.`))) return;
      try { await removeProofs(regs); const n = await eraseRegistrations(); toast(`Erased ${n} sign-up${n === 1 ? "" : "s"}`); } catch { toast("Couldn’t erase.", "bad"); }
    });
    root.querySelector("#csv")?.addEventListener("click", () => {
      const cols = ["created_at", "name", "email", "code", "ticket", "gift_name", "gift_email", "gcash_ref", "sessions", "amount", "friends", "topup", "proof_at", "paid_at", "paid_by", "mobile", "course", "year", "heard_from", "heard_org", "status", "notes", "consented_at", "privacy_version"];
      const flat = (v) => (!Array.isArray(v) ? v ?? "" : v.some((x) => x && typeof x === "object") ? v.map((x) => `${x.name} <${x.email}>`).join("; ") : v.join(" "));
      const cell = (v) => `"${String(flat(v)).replace(/"/g, '""')}"`;
      download(`blueprint-signups-${todayISO()}.csv`, [cols.join(","), ...list.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n"), "text/csv");
    });
    const q = root.querySelector("#q");
    q.addEventListener("input", () => { f.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => { rerender(); const n = root.querySelector("#q"); n.focus(); n.setSelectionRange(f.q.length, f.q.length); }, 180); });
    root.querySelector("#st").addEventListener("change", (e) => { f.status = e.target.value; rerender(); });
    root.querySelectorAll("[data-k]").forEach((b) => b.addEventListener("click", () => { f.status = f.status === b.dataset.k ? "" : b.dataset.k; rerender(); }));
    root.querySelector("tbody")?.addEventListener("change", async (e) => {
      const tr = e.target.closest("tr");
      if (!tr) return;
      const id = Number(tr.dataset.id), r = regs.find((x) => x.id === id);
      if (e.target.matches("[data-status]")) {
        const prev = r.status, next = e.target.value;
        if (next === "paid") { e.target.value = prev; return markPaid(r); }
        if (next === "refunded") { e.target.value = prev; return markRefunded(r); }
        try { await setRegStatus(id, next); toast(`${r.name}: ${label(next)}`, "", { label: "Undo", run: () => setRegStatus(id, prev).catch(() => toast("Couldn’t undo.", "bad")) }); }
        catch { e.target.value = prev; toast("Couldn’t save.", "bad"); }
        return;
      }
      if (e.target.dataset.field) {
        try { await update("registrations", id, { [e.target.dataset.field]: e.target.value }); toast("Saved"); } catch { toast("Couldn’t save.", "bad"); }
      }
    });
    root.querySelector("tbody")?.addEventListener("click", async (e) => {
      const tr = e.target.closest("tr"), r = tr && regs.find((x) => x.id === Number(tr.dataset.id));
      if (e.target.closest("[data-paid]")) return markPaid(r);
      if (e.target.closest("[data-proof]")) return showProof(r);
      if (e.target.closest("[data-resend]")) {
        try { await signupAction("resend", r.id); toast(`Email sent again to ${r.name}`); } catch { toast("Couldn’t send. Try again in a minute.", "bad"); }
        return;
      }
      if (!e.target.closest("[data-del]")) return;
      if (!(await confirmBox(`Delete ${r.name} (${r.email})? This can’t be undone.`))) return;
      try { await removeProofs([r]); await remove("registrations", r.id); toast("Deleted"); } catch { toast("Couldn’t delete.", "bad"); }
    });
  },
};

/* paid for Single Sessions and asked to move up to the Full Pass (migration 011): owes r.topup */
const upgrading = (r) => r.status === "paid" && r.topup > 0;
/* the upgrade receipt only counts if it came in after they asked */
const topupSent = (r) => upgrading(r) && r.proof_at && r.topup_at && Date.parse(r.proof_at) > Date.parse(r.topup_at);
/* sent a receipt (or, from the first version of /pay, typed a reference number), not marked yet; or sent the upgrade receipt */
const toCheck = (r) => (r.status === "registered" && (r.proof_path || r.gcash_ref)) || topupSent(r);
/* what to look for in GCash: the top-up if they're upgrading, else their ticket's amount */
const owed = (r) => (upgrading(r) ? r.topup : r.amount);

function payCell(r) {
  const unsent = r.code && !r.emailed_at && r.status !== "cancelled";
  return `${r.code ? `<span class="mono">${esc(r.code)}</span>` : `<span class="muted">—</span>`}
    <small class="tk"><b>${esc(peso(r.amount))}</b> · ${esc(ticketOf(r))}</small>
    ${upgrading(r) ? `<small class="${topupSent(r) ? "" : "muted"}">Upgrading to Full Pass: <b>${esc(peso(r.topup))}</b> ${topupSent(r) ? `receipt sent ${esc(fmt(r.proof_at))}` : "not paid yet"}</small>` : ""}
    ${r.proof_path && !upgrading(r) ? `<small>Receipt sent ${r.proof_at ? esc(fmt(r.proof_at)) : ""}</small>` : r.gcash_ref ? `<small>Ref <span class="mono">${esc(r.gcash_ref)}</span></small>` : r.status === "registered" ? `<small class="muted">Not paid yet</small>` : ""}
    ${r.status === "refunded" ? `<small>Refunded · course free</small>` : r.ticket === "free" ? `<small>${r.status === "waitlist" ? "Free · next in line" : "Free · no payment"}</small>` : r.paid_at ? `<small>Paid ${esc(fmt(r.paid_at))}${r.paid_by ? ` · ${esc(r.paid_by)}` : ""}</small>` : ""}
    ${(r.proof_path && r.status === "registered") || topupSent(r) ? `<button class="btn btn--primary btn--xs" data-proof>${icon("eye")} Check receipt</button>`
      : r.proof_path ? `<button class="btn btn--ghost btn--xs" data-proof>${icon("eye")} Receipt</button>`
      : toCheck(r) ? `<button class="btn btn--primary btn--xs" data-paid>${icon("check")} Paid</button>` : ""}
    ${unsent ? `<small class="bad">Email not sent</small>` : ""}
    ${r.code && ["registered", "paid", "waitlist", "refunded"].includes(r.status) ? `<button class="btn btn--ghost btn--xs" data-resend title="Send their last email again">${icon("send")} ${unsent ? "Send email" : "Resend"}</button>` : ""}`;
}

/* their receipt next to the Paid button, so checking and confirming is one place */
async function showProof(r) {
  const open = r.status === "registered" || topupSent(r);
  openDrawer({
    eyebrow: `${esc(r.code || "")} · ${esc(peso(owed(r)))} · ${esc(upgrading(r) ? "Upgrade to Full Pass" : ticketOf(r))}`,
    title: esc(r.name),
    body: `<p class="muted">${open ? `Find this payment in GCash (Transactions): <b>${esc(peso(owed(r)))}</b>, same reference number. Then click Paid.${upgrading(r) ? ` They paid ${esc(peso(r.amount))} for ${esc(ticketOf(r))} before; this is the top-up for the Full Pass.` : ""}` : `Status: ${esc(label(r.status))}`}</p>
      <div class="proof"><span class="muted" id="proofLoading">Loading receipt…</span><img id="proofImg" alt="${esc(r.name)}’s GCash receipt" hidden /></div>`,
    actions: open ? `<button class="btn btn--ghost" data-close-drawer>Not yet</button><button class="btn btn--primary" id="proofPaid">${icon("check")} Paid</button>` : "",
    onMount: async (el) => {
      el.querySelector("#proofPaid")?.addEventListener("click", async () => { if (await markPaid(r)) closeDrawer(); });
      const im = el.querySelector("#proofImg"), msg = el.querySelector("#proofLoading");
      try {
        im.onload = () => { msg.hidden = true; im.hidden = false; };
        im.src = await receipt(r.id); // decrypted by the server, which logs that you opened it
      } catch { msg.textContent = "Couldn’t load the receipt. Try again."; }
    },
  });
}

/* owner: receipts go with the sign-up (an upgrade's top-up receipt sits next to the first one, api/pay.js) */
async function removeProofs(rows) {
  const paths = [...new Set(rows.flatMap((r) => (r.proof_path ? [r.proof_path, `proofs/${r.id}.enc`, `proofs/${r.id}-topup.enc`] : [])))];
  if (!paths.length) return;
  const { error } = await supa.storage.from("payment").remove(paths);
  if (error) throw error;
}

/* last week's workshop buyers: they keep their refund and get Blueprint Online free (Thomas's doc 03) */
async function markRefunded(r) {
  if (!(await confirmBox(`Mark ${r.name} as refunded, free access? This emails them Blueprint Online for free (the course link and the 1:1). Only for last week’s workshop buyers.`, { ok: "Send free access", tone: "" }))) return false;
  try {
    const out = await signupAction("refunded", r.id);
    toast(out.emailed ? `Free access sent to ${out.to}.` : `${r.name} is marked, but the email didn’t send. Click Resend.`, out.emailed ? "" : "bad");
    return true;
  } catch { toast("Couldn’t save. Try again.", "bad"); return false; }
}

async function markPaid(r) {
  if (r.ticket === "online") {
    const to = r.gift_email || r.email;
    if (!(await confirmBox(`Mark ${r.name} as paid?${r.gcash_ref ? ` Find GCash ref ${r.gcash_ref} for ₱349 first.` : r.proof_path ? " Only if you found their ₱349 in GCash." : " They haven’t typed a reference number yet."} This emails the course link to ${to}${r.gift_email ? ` (a gift for ${r.gift_name})` : ""}.`, { ok: "Paid", tone: "" }))) return false;
    try {
      const out = await signupAction("paid", r.id);
      toast(out.emailed ? `${r.name} is in. Course link sent to ${out.to || to}. Add them to the Buyers tab.` : `${r.name} is marked paid, but the email didn’t send. Click Send email.`, out.emailed ? "" : "bad");
      return true;
    } catch { toast("Couldn’t mark paid. Try again.", "bad"); return false; }
  }
  const up = upgrading(r);
  const ask = up ? `Confirm ${r.name}’s ${peso(r.topup)} top-up? Only if you found it in GCash. They move to the Full Pass and get the full schedule and pre-work by email.`
    : `Mark ${r.name} as paid?${r.proof_path ? " Only if you found their payment in GCash." : r.gcash_ref ? ` Check GCash ref ${r.gcash_ref} first.` : " They haven’t sent a receipt."} This emails their slot confirmation and pre-work${r.ticket === "barkada" ? " to all three" : ""}.`;
  if (!(await confirmBox(ask, { ok: "Paid", tone: "" }))) return false;
  try {
    const out = await signupAction("paid", r.id);
    if (out.upgraded) { toast(out.emailed ? `${r.name} is on the Full Pass now. Email sent.` : `${r.name} is on the Full Pass, but the email didn’t send. Click Resend.`, out.emailed ? "" : "bad"); return true; }
    if (out.status === "waitlist") toast(`${r.ticket === "single" ? "Their session is" : r.ticket === "barkada" ? "A session doesn’t have 3 seats left, so it’s" : "A session is"} full. ${r.name} is on the waitlist${out.emailed ? " and got the waitlist email. Refund them if no seat opens" : ", but the email didn’t send"}.`, "bad");
    else toast(out.emailed ? `${r.name} is in. Slot confirmation sent.` : `${r.name} is marked paid, but the email didn’t send. Click Send email.`, out.emailed ? "" : "bad");
    return true;
  } catch (e) {
    if (e.message === "full") toast(`A session they’d add is full, so ${r.name} stays on their Single Session. Refund their ${peso(r.topup)} top-up and tell them on the Questions page or by email.`, "bad");
    else toast("Couldn’t mark paid. Try again.", "bad");
    return false;
  }
}

/* ---------- owner: what the payment emails say ---------- */
function paySetup() {
  const p = setting("payment");
  const missing = [!p.qrPath && "GCash QR", !p.gcashName && "account name"].filter(Boolean);
  return `<details class="card fold" ${!p.qrPath || !p.gcashName ? "open" : ""}>
    <summary class="ch ch--pad"><h3>${icon("wallet")} Payment setup</h3><span class="muted">${missing.length ? `Missing: ${missing.join(", ")}` : "Ready"}</span>${icon("down", "fold__chev")}</summary>
    <div class="fold__body payset">
      <label class="payset__f"><span>GCash account name <small>Shown under the QR so people know they’re paying us</small></span>
        <input class="cell-in" id="payName" value="${esc(p.gcashName || "")}" placeholder="e.g. AM**R S." maxlength="80" /></label>
      <label class="payset__f"><span>GCash number <small>For people who send by number instead of the QR</small></span>
        <input class="cell-in" id="payNumber" value="${esc(p.gcashNumber || "")}" placeholder="0917 123 4567" maxlength="20" inputmode="tel" /></label>
      <p class="payset__f payset__amts"><span>Amounts <small>Pilot prices from Nov 7. One QR for all of them: each person’s page and email show their own amount.</small></span><span>${amountsLine}</span></p>
      <div class="payset__f"><span>GCash QR <small>Goes in the sign-up email and on each person’s private payment page. Never on the public site.</small></span>
        <div class="payset__qr">${p.qrPath ? `<img id="qrImg" alt="GCash QR" />` : `<span class="muted">No QR yet</span>`}
          <label class="btn btn--ghost btn--sm">${icon("upload")} ${p.qrPath ? "Replace" : "Upload"} QR<input type="file" id="qrFile" accept="image/png,image/jpeg" hidden /></label></div></div>
      <label class="payset__f"><span>Pre-work links <small>One per line: Label | link. Sent when someone is marked Paid.</small></span>
        <textarea class="cell-in" id="payPrework" rows="3" placeholder="Session 1 pre-work | https://forms.gle/...">${esc((p.prework || []).map((x) => `${x.label} | ${x.url}`).join("\n"))}</textarea></label>
    </div>
  </details>`;
}

function wirePaySetup(root) {
  if (!S.owner) return;
  const p = setting("payment");
  const save = async (patch) => {
    try { await saveSetting("payment", { ...setting("payment"), ...patch }); toast("Saved. New emails use it."); } catch { toast("Couldn’t save.", "bad"); }
  };
  root.querySelector("#payName")?.addEventListener("change", (e) => save({ gcashName: e.target.value.trim() }));
  root.querySelector("#payNumber")?.addEventListener("change", (e) => save({ gcashNumber: e.target.value.trim() }));
  root.querySelector("#payPrework")?.addEventListener("change", (e) => {
    const rows = e.target.value.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [a, b] = l.includes("|") ? l.split("|").map((x) => x.trim()) : ["Pre-work", l];
      return { label: a || "Pre-work", url: b };
    });
    if (rows.some((x) => !/^https:\/\//i.test(x.url))) return toast("Each line needs a link starting with https://", "bad");
    save({ prework: rows });
  });
  if (p.qrPath) supa.storage.from("payment").createSignedUrl(p.qrPath, 600).then(({ data }) => { const im = root.querySelector("#qrImg"); if (im && data) im.src = data.signedUrl; });
  root.querySelector("#qrFile")?.addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 3e6) return toast("That image is over 3 MB. Use a screenshot instead.", "bad");
    const path = `gcash-qr-${Date.now()}.${f.type === "image/png" ? "png" : "jpg"}`;
    const { error } = await supa.storage.from("payment").upload(path, f, { contentType: f.type });
    if (error) return toast("Couldn’t upload the QR.", "bad");
    save({ qrPath: path });
  });
}
