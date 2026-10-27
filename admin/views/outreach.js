/* Outreach: every org, who's on it, where it stands, and its messages filled in.
   Status changes fill in their own dates (DM'd today, follow-up 2 working days later). */
import { S, setting, people, scriptsForOrg, fillScript, followUpDate, update, focusName } from "/admin/store.js";
import { esc, icon, avatar, fmtDate, openDrawer, copy, toast, linkKind, todayISO } from "/admin/lib.js";
import { dueChip, editRow, empty, ownerOnly } from "/admin/ui.js";

export const ORG_STATUS = ["Not sent", "Sent", "Followed up", "Yes", "No", "No reply"];
const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, "-");
const orgPill = (s) => `<span class="spill opill--${slug(s)}">${esc(s)}</span>`;
const short = (n) => n.replace(/\s*\(([^)]*)\)\s*$/, "");
const abbr = (n) => (n.match(/\(([^)]*)\)\s*$/) || [])[1] || "";
const pageOf = (o) => (o.page.match(/https?:\/\/\S+/) || [])[0];
const f = { q: "", owner: null, status: "", grp: "", sort: "tier" };

const ORG_FIELDS = () => [
  { key: "name", label: "Org", full: true },
  { key: "owner", label: "Owner", type: "select", options: ["", ...people().map((p) => p.name)] },
  { key: "status", label: "Status", type: "select", options: ORG_STATUS },
  { key: "dm_date", label: "Date DM’d", type: "date" },
  { key: "follow_up", label: "Follow up on", type: "date", help: "Leave empty: 2 working days after the DM" },
  { key: "replied_by", label: "Who replied (name, role)" },
  { key: "agreed", label: "What they agreed to" },
  { key: "next_step", label: "Next step", full: true },
  { key: "tier", label: "Tier", type: "number" },
  { key: "cluster", label: "Cluster" },
  { key: "grp", label: "Message type", type: "select", options: Object.entries(setting("outreach").groups || {}).map(([k, g]) => [k, g.label]) },
  { key: "page", label: "Facebook page / how to reach", full: true },
  { key: "why", label: "Why them", type: "textarea", rows: 2 },
];

/* one-click status change; the dates follow on their own */
async function setStatus(o, status) {
  const prev = { status: o.status, dm_date: o.dm_date };
  const patch = { status };
  if (status === "Sent" && !o.dm_date) patch.dm_date = todayISO();
  try {
    await update("orgs", o.id, patch);
    toast(`${short(o.name)}: ${status}`, "", { label: "Undo", run: () => update("orgs", o.id, prev) });
  } catch { toast("Couldn’t save.", "bad"); }
}

export default {
  id: "outreach", title: "Outreach", icon: "send",
  render(root) {
    if (f.owner === null) f.owner = focusName() && (S.data.orgs || []).some((o) => o.owner === focusName()) ? focusName() : "";
    const orgs = S.data.orgs || [];
    const groups = setting("outreach").groups || {};
    const today = todayISO();
    const list = orgs.filter((o) =>
      (!f.owner || o.owner === f.owner) && (!f.status || o.status === f.status) && (!f.grp || o.grp === f.grp) &&
      (!f.q || `${o.name} ${o.cluster} ${o.why}`.toLowerCase().includes(f.q.toLowerCase())));
    const sorters = {
      tier: (a, b) => (a.tier || 9) - (b.tier || 9) || a.sort - b.sort,
      name: (a, b) => short(a.name).localeCompare(short(b.name)),
      owner: (a, b) => (a.owner || "~").localeCompare(b.owner || "~") || (a.tier || 9) - (b.tier || 9),
      status: (a, b) => ORG_STATUS.indexOf(a.status) - ORG_STATUS.indexOf(b.status),
    };
    list.sort(sorters[f.sort]);
    const count = (s, xs = orgs) => xs.filter((o) => o.status === s).length;
    const owners = [...new Set(orgs.map((o) => o.owner).filter(Boolean))];
    const dueFollow = orgs.filter((o) => o.status === "Sent" && followUpDate(o) && followUpDate(o) <= today);
    const th = (k, label) => `<th><button class="sort ${f.sort === k ? "is-on" : ""}" data-sort="${k}">${label}${f.sort === k ? icon("down") : ""}</button></th>`;
    const sent = orgs.filter((o) => o.status !== "Not sent").length;

    root.innerHTML = `
      <header class="ph">
        <div>
          <h1 class="ph__title">Outreach</h1>
          <p class="ph__sub">${orgs.length} orgs · ${sent} messaged · ${count("Yes")} said yes. Click an org to copy its message.</p>
        </div>
        <div class="ph__actions">${ownerOnly(`<button class="btn btn--primary" id="addOrg">${icon("plus")} Add org</button>`)}</div>
      </header>

      ${dueFollow.length ? `<div class="banner">${icon("clock")}<span><b>${dueFollow.length} follow-up${dueFollow.length > 1 ? "s" : ""} due.</b> ${dueFollow.map((o) => `<button class="chipbtn" data-org="${o.id}">${esc(short(o.name))}</button>`).join("")}</span></div>` : ""}

      <div class="statuses" role="group" aria-label="Filter by status">
        <button class="st-chip ${!f.status ? "is-on" : ""}" data-status="">All <b>${orgs.length}</b></button>
        ${ORG_STATUS.map((s) => `<button class="st-chip ${f.status === s ? "is-on" : ""}" data-status="${esc(s)}"><i class="sw sw--${slug(s)}"></i>${esc(s)} <b>${count(s)}</b></button>`).join("")}
      </div>

      <div class="card filters">
        <label class="search">${icon("search")}<input id="q" placeholder="Search orgs" value="${esc(f.q)}" /></label>
        <label class="pick"><span>Owner</span><select id="owner"><option value="">Everyone</option>${owners.map((n) => `<option ${f.owner === n ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
        <label class="pick"><span>Type</span><select id="grp"><option value="">All</option>${Object.entries(groups).map(([k, g]) => `<option value="${k}" ${f.grp === k ? "selected" : ""}>${esc(g.label)}</option>`).join("")}</select></label>
        <span class="grow"></span>
        ${f.owner || f.status || f.grp || f.q ? `<button class="btn btn--ghost btn--sm" id="clear">${icon("x")} Clear filters</button>` : ""}
      </div>

      <div class="results">${list.length ? `<div class="card tablewrap"><table class="table orgt">
        <thead><tr>${th("name", "Org")}${th("owner", "Owner")}${th("status", "Status")}<th>Follow up</th></tr></thead>
        <tbody>${list.map((o, i) => {
          const fu = followUpDate(o);
          return `<tr class="in is-click" style="--i:${Math.min(i, 16)}" data-org="${o.id}">
            <td><b>${esc(short(o.name))}</b>${abbr(o.name) ? ` <span class="muted">${esc(abbr(o.name))}</span>` : ""}${o.tier === 1 ? ` <span class="tag tag--s1" title="Message these first">Top pick</span>` : ""}<small>${esc(o.why)}</small></td>
            <td class="nowrap">${o.owner ? `<span class="who">${avatar(o.owner, "xs")}${esc(o.owner)}</span>` : `<span class="muted">—</span>`}</td>
            <td>${S.owner ? `<select class="spill opill--${slug(o.status)}" data-set="${o.id}" aria-label="Status">${ORG_STATUS.map((s) => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}</select>` : orgPill(o.status)}</td>
            <td class="nowrap">${o.status === "Sent" && fu ? dueChip(fu) : `<span class="muted">—</span>`}</td>
          </tr>`;
        }).join("")}</tbody></table></div>` : `<div class="card">${empty("No orgs match.", "search")}</div>`}</div>`;

    const rerender = () => this.render(root);
    const q = root.querySelector("#q");
    q.addEventListener("input", () => { f.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => { rerender(); const n = root.querySelector("#q"); n.focus(); n.setSelectionRange(f.q.length, f.q.length); }, 180); });
    root.querySelectorAll("[data-status]").forEach((b) => b.addEventListener("click", () => { f.status = b.dataset.status; rerender(); }));
    root.querySelector("#owner").addEventListener("change", (e) => { f.owner = e.target.value; rerender(); });
    root.querySelectorAll("[data-sort]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); f.sort = b.dataset.sort; rerender(); }));
    root.querySelector("#grp").addEventListener("change", (e) => { f.grp = e.target.value; rerender(); });
    root.querySelector("#clear")?.addEventListener("click", () => { Object.assign(f, { q: "", owner: "", status: "", grp: "" }); rerender(); });
    root.querySelectorAll("[data-set]").forEach((s) => {
      s.addEventListener("click", (e) => e.stopPropagation());
      s.addEventListener("change", () => setStatus(orgs.find((o) => o.id === s.dataset.set), s.value));
    });
    root.querySelectorAll("[data-org]").forEach((b) => b.addEventListener("click", () => openOrg(b.dataset.org)));
    root.querySelector("#addOrg")?.addEventListener("click", () => editRow({ table: "orgs", fields: ORG_FIELDS(), title: "Add an org", defaults: { status: "Not sent", grp: "business" } }));
  },
};

export function openOrg(id) {
  const o = S.data.orgs.find((x) => x.id === id);
  if (!o) return;
  const scripts = scriptsForOrg(o);
  const sender = o.owner || S.me?.name;
  const pageUrl = pageOf(o);
  const fu = followUpDate(o);
  const g = setting("outreach").groups?.[o.grp];
  openDrawer({
    wide: true,
    eyebrow: `${o.tier ? `Tier ${o.tier} · ` : ""}${esc(o.cluster)}${g?.label ? ` · ${esc(g.label)}` : ""}`,
    title: esc(o.name),
    body: `
      <div class="dmeta">${orgPill(o.status)}${o.owner ? `<span class="who">${avatar(o.owner, "sm")}${esc(o.owner)}</span>` : ""}${o.status === "Sent" && fu ? `<span class="muted">Follow up</span>${dueChip(fu)}` : ""}</div>

      <div class="go-row">
        ${scripts[0] ? `<button class="btn btn--primary" data-first>${icon("copy")} Copy first message${pageUrl ? " + open page" : ""}</button>` : ""}
        ${pageUrl ? `<a class="btn btn--ghost" href="${esc(pageUrl)}" target="_blank" rel="noopener">${icon(linkKind(pageUrl)[0])} Page</a>` : ""}
      </div>
      ${S.owner ? `<div class="statusset" role="group" aria-label="Status">${ORG_STATUS.map((s) => `<button class="${s === o.status ? "is-on" : ""}" data-s="${esc(s)}"><i class="sw sw--${slug(s)}"></i>${esc(s)}</button>`).join("")}</div>` : ""}

      <dl class="facts">
        <div><dt>Why them</dt><dd>${esc(o.why) || "—"}</dd></div>
        ${!pageUrl && o.page ? `<div><dt>Reach</dt><dd>${esc(o.page)}</dd></div>` : ""}
        ${o.dm_date ? `<div><dt>DM’d</dt><dd>${esc(fmtDate(o.dm_date))}</dd></div>` : ""}
        ${o.replied_by ? `<div><dt>Replied</dt><dd>${esc(o.replied_by)}</dd></div>` : ""}
        ${o.agreed ? `<div><dt>Agreed to</dt><dd>${esc(o.agreed)}</dd></div>` : ""}
        ${o.next_step ? `<div><dt>Next step</dt><dd>${esc(o.next_step)}</dd></div>` : ""}
      </dl>

      <section class="dsec">
        <h4>Messages · ${esc(sender || "sender")}</h4>
        <div class="scripts">${scripts.map((s, i) => {
          const text = fillScript(s.body, { org: o, sender });
          return `<article class="script ${i === 0 ? "is-first" : ""}">
            <header><span class="script__n">${pad(i + 1)}</span><b>${esc(s.title)}</b>${s.note ? `<small>${esc(s.note)}</small>` : ""}<button class="btn btn--ghost btn--xs" data-copy="${i}">${icon("copy")} Copy</button></header>
            <pre>${esc(text).replace(/\[[^\]]+\]/g, (m) => `<mark>${m}</mark>`)}</pre>
          </article>`;
        }).join("")}</div>
      </section>`,
    actions: S.owner ? `<span class="grow"></span><button class="btn btn--ghost" data-edit>${icon("edit")} Edit details</button>` : "",
    onMount(root) {
      root.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => copy(fillScript(scripts[b.dataset.copy].body, { org: o, sender }), "Message copied")));
      root.querySelector("[data-first]")?.addEventListener("click", () => {
        copy(fillScript(scripts[0].body, { org: o, sender }), pageUrl ? "Copied. Paste it in their page’s inbox." : "Message copied");
        if (pageUrl) window.open(pageUrl, "_blank", "noopener");
      });
      root.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", async () => { await setStatus(o, b.dataset.s); openOrg(o.id); }));
      root.querySelector("[data-edit]")?.addEventListener("click", () => editRow({ table: "orgs", row: o, fields: ORG_FIELDS(), title: o.name, after: () => openOrg(o.id) }));
    },
  });
}
const pad = (n) => String(n).padStart(2, "0");
