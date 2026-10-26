/* Inquiries: everyone who registered on the site. The owner manages them; the team can see them. */
import { S, update, remove, setting } from "/admin/store.js";
import { esc, icon, copy, toast, download, confirmBox, countUps, todayISO } from "/admin/lib.js";
import { empty } from "/admin/ui.js";

const STATUSES = [["new", "New"], ["emailed", "Emailed"], ["confirmed", "Confirmed"], ["archived", "Archived"]];
const f = { q: "", status: "" };
const fmt = (iso) => new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default {
  id: "inquiries", title: "Inquiries", icon: "inbox",
  badge: () => (S.data.registrations || []).filter((r) => r.status === "new").length || "",
  render(root) {
    const regs = S.data.registrations || [];
    const list = regs.filter((r) => (!f.status || r.status === f.status) && (!f.q || [r.name, r.email, r.course, r.year, r.notes].join(" ").toLowerCase().includes(f.q.toLowerCase())));
    const count = (s) => regs.filter((r) => r.status === s).length;
    const target = setting("costing").baseline || 12, cap = setting("costing").max || 20;
    const paid = count("confirmed");

    root.innerHTML = `
      <header class="ph">
        <div>
          <p class="ph__eyebrow">Sign-ups</p>
          <h1 class="ph__title">Inquiries</h1>
          <p class="ph__sub">Everyone who filled in the Register form on the site.${S.owner ? "" : " View only."}</p>
        </div>
        <div class="ph__actions">
          <button class="btn btn--ghost" id="copyEmails">${icon("copy")} Copy emails</button>
          <a class="btn btn--ghost" id="mailAll" href="#">${icon("mail")} Email (BCC)</a>
          <button class="btn btn--ghost" id="csv">${icon("download")} CSV</button>
        </div>
      </header>

      <section class="kpis kpis--4">
        <button class="card kpi stagger ${!f.status ? "is-on" : ""}" style="--i:0" data-k=""><p class="k">Total</p><p class="big" data-count="${regs.length}">0</p><p class="sub">${target} is the baseline, ${cap} the cap</p><div class="bar"><i style="--w:${Math.min(100, (regs.length / cap) * 100)}%"></i><b style="--at:${(target / cap) * 100}%"></b></div></button>
        ${STATUSES.slice(0, 3).map(([k, l], i) => `<button class="card kpi stagger ${f.status === k ? "is-on" : ""}" style="--i:${i + 1}" data-k="${k}"><p class="k"><span class="sdot sdot--${k}"></span>${l}</p><p class="big" data-count="${count(k)}">0</p><p class="sub">${k === "confirmed" ? `${Math.max(0, target - paid)} to the baseline` : k === "new" ? "Not contacted yet" : "Got the details email"}</p></button>`).join("")}
      </section>

      <div class="filters card">
        <label class="search">${icon("search")}<input id="q" placeholder="Search name, email, course" value="${esc(f.q)}" /></label>
        <select class="select" id="st"><option value="">All statuses</option>${STATUSES.map(([k, l]) => `<option value="${k}" ${f.status === k ? "selected" : ""}>${l}</option>`).join("")}</select>
        <span class="grow"></span><span class="muted">${list.length} shown</span>
      </div>

      ${list.length ? `<div class="tablewrap card"><table class="table table--regs">
        <thead><tr><th>Signed up</th><th>Name</th><th>Email</th><th>Course</th><th>Year</th><th>Status</th><th>Notes</th>${S.owner ? "<th></th>" : ""}</tr></thead>
        <tbody>${list.map((r) => `<tr data-id="${r.id}" class="st-${r.status}">
          <td class="muted nowrap">${esc(fmt(r.created_at))}</td>
          <td><b>${esc(r.name)}</b></td>
          <td><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></td>
          <td>${esc(r.course)}</td><td class="nowrap">${esc(r.year)}</td>
          <td>${S.owner ? `<select class="spill spill--${r.status}" data-field="status">${STATUSES.map(([k, l]) => `<option value="${k}" ${k === r.status ? "selected" : ""}>${l}</option>`).join("")}</select>` : `<span class="spill spill--${r.status}">${STATUSES.find(([k]) => k === r.status)[1]}</span>`}</td>
          <td>${S.owner ? `<input class="note" data-field="notes" value="${esc(r.notes)}" placeholder="Add a note" maxlength="2000" />` : esc(r.notes)}</td>
          ${S.owner ? `<td><button class="iconbtn" data-del title="Delete">${icon("trash")}</button></td>` : ""}
        </tr>`).join("")}</tbody></table></div>` : `<div class="card">${empty(regs.length ? "Nothing matches that search." : "No sign-ups yet. When someone registers on the site, they show up here instantly.", "inbox")}</div>`}`;

    countUps(root);
    const rerender = () => this.render(root);
    const emails = list.map((r) => r.email);
    root.querySelector("#mailAll").href = emails.length ? `mailto:?bcc=${encodeURIComponent(emails.join(","))}` : "#";
    root.querySelector("#copyEmails").addEventListener("click", () => (emails.length ? copy(emails.join(", "), `Copied ${emails.length} email${emails.length > 1 ? "s" : ""}`) : toast("No emails to copy.")));
    root.querySelector("#csv").addEventListener("click", () => {
      const cols = ["created_at", "name", "email", "course", "year", "status", "notes"];
      const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      download(`blueprint-signups-${todayISO()}.csv`, [cols.join(","), ...list.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n"), "text/csv");
    });
    const q = root.querySelector("#q");
    q.addEventListener("input", () => { f.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => { rerender(); const n = root.querySelector("#q"); n.focus(); n.setSelectionRange(f.q.length, f.q.length); }, 180); });
    root.querySelector("#st").addEventListener("change", (e) => { f.status = e.target.value; rerender(); });
    root.querySelectorAll("[data-k]").forEach((b) => b.addEventListener("click", () => { f.status = b.dataset.k; rerender(); }));
    root.querySelector("tbody")?.addEventListener("change", async (e) => {
      const tr = e.target.closest("tr"), field = e.target.dataset.field;
      if (!tr || !field) return;
      try { await update("registrations", Number(tr.dataset.id), { [field]: e.target.value }); toast("Saved"); } catch { toast("Couldn’t save.", "bad"); }
    });
    root.querySelector("tbody")?.addEventListener("click", async (e) => {
      if (!e.target.closest("[data-del]")) return;
      const r = regs.find((x) => x.id === Number(e.target.closest("tr").dataset.id));
      if (!(await confirmBox(`Delete ${r.name} (${r.email})? This can’t be undone.`))) return;
      try { await remove("registrations", r.id); toast("Deleted"); } catch { toast("Couldn’t delete.", "bad"); }
    });
  },
};
