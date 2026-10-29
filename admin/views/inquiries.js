/* Sign-ups: everyone who registered on the site.
   They pay by GCash and type their reference number on /pay; anyone on the team checks it and clicks Paid,
   which emails the confirmation (api/signups.js). Notes, downloading, deleting and the payment setup stay with the owner.
   The rules box matches what privacy.html promises sign-ups. */
import { S, update, remove, setting, saveSetting, setRegStatus, signupAction, eraseRegistrations } from "/admin/store.js";
import { supa } from "/admin/supa.js";
import { esc, icon, copy, toast, download, confirmBox, countUps, todayISO } from "/admin/lib.js";
import { empty } from "/admin/ui.js";

const STATUSES = [["registered", "Registered"], ["paid", "Paid"], ["waitlist", "Waitlist"], ["cancelled", "Cancelled"]];
const HELP = { registered: "Signed up, waiting to pay", paid: "Seat confirmed", waitlist: "After the first paid seats", cancelled: "Not coming" };
const f = { q: "", status: "" };
const fmt = (iso) => new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const label = (k) => (STATUSES.find(([s]) => s === k) || [, k])[1];
const RULES = [
  "Only use these details to run Blueprint.",
  "Emailing more than one person? Put the emails in <b>BCC</b>.",
  "No screenshots or copies in group chats. Send people here instead.",
  "Before clicking Paid, find the reference number in GCash (Transactions) and check it’s ₱1,999. Paid emails them right away.",
  "Payment screenshots: check them, then delete them from chats.",
  "Something leaked or got sent to the wrong person? Tell Keira right away. We have 72 hours to report it.",
];

export default {
  id: "inquiries", title: "Sign-ups", icon: "inbox",
  badge: () => (S.data.registrations || []).filter(toCheck).length || "",
  render(root) {
    const regs = S.data.registrations || [];
    const list = regs.filter((r) => (!f.status || r.status === f.status) && (!f.q || [r.name, r.email, r.mobile, r.course, r.year, r.heard_from, r.heard_org, r.notes].join(" ").toLowerCase().includes(f.q.toLowerCase())));
    const count = (s) => regs.filter((r) => r.status === s).length;
    const seats = setting("costing").max || 20;
    const checking = regs.filter(toCheck);

    root.innerHTML = `
      <header class="ph">
        <div>
          <h1 class="ph__title">Sign-ups</h1>
          <p class="ph__sub">${checking.length ? `<b>${checking.length} paid and waiting for you.</b> Find each reference number in GCash, then click Paid. That emails their confirmation and pre-work.` : `Everyone who registered on the site. When someone types their GCash reference number, it shows here with a Paid button.`} The first ${seats} to pay get seats.</p>
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
          ${regs.length ? `<button class="btn btn--ghost btn--xs" id="eraseAll">${icon("trash")} Erase all ${regs.length} sign-ups</button>` : ""}</p>` : ""}
      </details>

      ${S.owner ? paySetup() : ""}

      <section class="stats">
        ${STATUSES.map(([k, l]) => `<button class="stat ${f.status === k ? "is-on" : ""}" data-k="${k}">
          <span class="stat__k"><i class="sdot sdot--${k}"></i>${l}</span>
          <span class="stat__n"><b data-count="${count(k)}">0</b>${k === "paid" ? `<small>of ${seats} seats</small>` : ""}</span>
          ${k === "paid" ? `<i class="meter"><i style="--w:${Math.min(100, (count(k) / seats) * 100)}%"></i></i>` : `<span class="stat__sub">${HELP[k]}</span>`}
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
          <td><b>${esc(r.name)}</b><small><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></small></td>
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
    root.querySelector("#eraseAll")?.addEventListener("click", async () => {
      if (!(await confirmBox(`Erase all ${regs.length} sign-ups for good? Only do this after the program is over. This can’t be undone.`))) return;
      try { const n = await eraseRegistrations(); toast(`Erased ${n} sign-up${n === 1 ? "" : "s"}`); } catch { toast("Couldn’t erase.", "bad"); }
    });
    root.querySelector("#csv")?.addEventListener("click", () => {
      const cols = ["created_at", "name", "email", "code", "gcash_ref", "ref_at", "paid_at", "paid_by", "mobile", "course", "year", "heard_from", "heard_org", "status", "notes", "consented_at", "privacy_version"];
      const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
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
      if (e.target.closest("[data-resend]")) {
        try { await signupAction("resend", r.id); toast(`Email sent again to ${r.name}`); } catch { toast("Couldn’t send. Try again in a minute.", "bad"); }
        return;
      }
      if (!e.target.closest("[data-del]")) return;
      if (!(await confirmBox(`Delete ${r.name} (${r.email})? This can’t be undone.`))) return;
      try { await remove("registrations", r.id); toast("Deleted"); } catch { toast("Couldn’t delete.", "bad"); }
    });
  },
};

/* typed a reference number, not marked yet */
const toCheck = (r) => r.status === "registered" && r.gcash_ref;

function payCell(r) {
  const unsent = r.code && !r.emailed_at && r.status !== "cancelled";
  return `${r.code ? `<span class="mono">${esc(r.code)}</span>` : `<span class="muted">—</span>`}
    ${r.gcash_ref ? `<small>Ref <span class="mono">${esc(r.gcash_ref)}</span>${r.ref_at ? ` · ${esc(fmt(r.ref_at))}` : ""}</small>` : r.status === "registered" ? `<small class="muted">Not paid yet</small>` : ""}
    ${r.paid_at ? `<small>Paid ${esc(fmt(r.paid_at))}${r.paid_by ? ` · ${esc(r.paid_by)}` : ""}</small>` : ""}
    ${toCheck(r) ? `<button class="btn btn--primary btn--xs" data-paid>${icon("check")} Paid</button>` : ""}
    ${unsent ? `<small class="bad">Email not sent</small>` : ""}
    ${r.code && ["registered", "paid", "waitlist"].includes(r.status) ? `<button class="btn btn--ghost btn--xs" data-resend title="Send their last email again">${icon("send")} ${unsent ? "Send email" : "Resend"}</button>` : ""}`;
}

async function markPaid(r) {
  if (!(await confirmBox(`Mark ${r.name} as paid?${r.gcash_ref ? ` Check GCash ref ${r.gcash_ref} first.` : " They haven’t typed a reference number."} This emails their confirmation and pre-work.`, { ok: "Paid", tone: "" }))) return;
  try {
    const out = await signupAction("paid", r.id);
    if (out.status === "waitlist") toast(`Seats are full. ${r.name} is on the waitlist${out.emailed ? " and got the waitlist email. Refund them if no seat opens" : ", but the email didn’t send"}.`, "bad");
    else toast(out.emailed ? `${r.name} is in. Confirmation sent.` : `${r.name} is marked paid, but the email didn’t send. Click Send email.`, out.emailed ? "" : "bad");
  } catch { toast("Couldn’t mark paid. Try again.", "bad"); }
}

/* ---------- owner: what the payment emails say ---------- */
function paySetup() {
  const p = setting("payment");
  const missing = [!p.qrPath && "GCash QR", !p.gcashName && "account name", !(p.prework || []).length && "pre-work links"].filter(Boolean);
  return `<details class="card fold" ${!p.qrPath || !p.gcashName ? "open" : ""}>
    <summary class="ch ch--pad"><h3>${icon("wallet")} Payment setup</h3><span class="muted">${missing.length ? `Missing: ${missing.join(", ")}` : "Ready"}</span>${icon("down", "fold__chev")}</summary>
    <div class="fold__body payset">
      <label class="payset__f"><span>GCash account name <small>Shown under the QR so people know they’re paying us</small></span>
        <input class="cell-in" id="payName" value="${esc(p.gcashName || "")}" placeholder="e.g. AM**R S." maxlength="80" /></label>
      <div class="payset__f"><span>GCash QR <small>Goes in the sign-up email. Kept private, never on the website.</small></span>
        <div class="payset__qr">${p.qrPath ? `<img id="qrImg" alt="GCash QR" />` : `<span class="muted">No QR yet</span>`}
          <label class="btn btn--ghost btn--sm">${icon("upload")} ${p.qrPath ? "Replace" : "Upload"} QR<input type="file" id="qrFile" accept="image/png,image/jpeg" hidden /></label></div></div>
      <label class="payset__f"><span>Pre-work links <small>One per line: Label | link. Sent when someone is marked Paid.</small></span>
        <textarea class="cell-in" id="payPrework" rows="3" placeholder="Session 1 pre-work | https://forms.gle/...">${esc((p.prework || []).map((x) => `${x.label} | ${x.url}`).join("\n"))}</textarea></label>
      <label class="payset__f"><span>Sales close <small>Said in the sign-up email</small></span>
        <input class="cell-in" id="payClose" type="date" value="${esc(p.salesClose || "")}" /></label>
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
  root.querySelector("#payClose")?.addEventListener("change", (e) => save({ salesClose: e.target.value }));
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
