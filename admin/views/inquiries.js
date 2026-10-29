/* Sign-ups: everyone who registered on the site.
   Anyone on the team can set a status (e.g. Amber marks "Paid"); notes, downloading and deleting stay with the owner.
   The rules box matches what privacy.html promises sign-ups. */
import { S, update, remove, setting, setRegStatus, eraseRegistrations } from "/admin/store.js";
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
  "Payment screenshots: check them, mark Paid, then delete them from chats.",
  "Something leaked or got sent to the wrong person? Tell Keira right away. We have 72 hours to report it.",
];

export default {
  id: "inquiries", title: "Sign-ups", icon: "inbox",
  badge: () => (S.data.registrations || []).filter((r) => r.status === "registered").length || "",
  render(root) {
    const regs = S.data.registrations || [];
    const list = regs.filter((r) => (!f.status || r.status === f.status) && (!f.q || [r.name, r.email, r.mobile, r.course, r.year, r.heard_from, r.heard_org, r.notes].join(" ").toLowerCase().includes(f.q.toLowerCase())));
    const count = (s) => regs.filter((r) => r.status === s).length;
    const seats = setting("costing").max || 20;

    root.innerHTML = `
      <header class="ph">
        <div>
          <h1 class="ph__title">Sign-ups</h1>
          <p class="ph__sub">Everyone who registered on the site. The first ${seats} to pay get seats; everyone after goes on the waitlist. Change a status in the table.</p>
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
        <thead><tr><th>Name</th><th>Mobile</th><th>Course</th><th>Heard from</th><th>Status</th><th>Notes</th><th>Signed up</th>${S.owner ? "<th></th>" : ""}</tr></thead>
        <tbody>${list.map((r, i) => `<tr data-id="${r.id}" class="in st-${r.status}" style="--i:${Math.min(i, 16)}">
          <td><b>${esc(r.name)}</b><small><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></small></td>
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
    root.querySelector("#eraseAll")?.addEventListener("click", async () => {
      if (!(await confirmBox(`Erase all ${regs.length} sign-ups for good? Only do this after the program is over. This can’t be undone.`))) return;
      try { const n = await eraseRegistrations(); toast(`Erased ${n} sign-up${n === 1 ? "" : "s"}`); } catch { toast("Couldn’t erase.", "bad"); }
    });
    root.querySelector("#csv")?.addEventListener("click", () => {
      const cols = ["created_at", "name", "email", "mobile", "course", "year", "heard_from", "heard_org", "status", "notes", "consented_at", "privacy_version"];
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
        try { await setRegStatus(id, next); toast(`${r.name}: ${label(next)}`, "", { label: "Undo", run: () => setRegStatus(id, prev).catch(() => toast("Couldn’t undo.", "bad")) }); }
        catch { e.target.value = prev; toast("Couldn’t save.", "bad"); }
        return;
      }
      if (e.target.dataset.field) {
        try { await update("registrations", id, { [e.target.dataset.field]: e.target.value }); toast("Saved"); } catch { toast("Couldn’t save.", "bad"); }
      }
    });
    root.querySelector("tbody")?.addEventListener("click", async (e) => {
      if (!e.target.closest("[data-del]")) return;
      const r = regs.find((x) => x.id === Number(e.target.closest("tr").dataset.id));
      if (!(await confirmBox(`Delete ${r.name} (${r.email})? This can’t be undone.`))) return;
      try { await remove("registrations", r.id); toast("Deleted"); } catch { toast("Couldn’t delete.", "bad"); }
    });
  },
};
