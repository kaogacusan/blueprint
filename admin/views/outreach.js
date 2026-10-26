/* Outreach: every org, who's on it, where it stands, and its messages filled in. */
import { S, setting, people, scriptsForOrg, fillScript, followUpDate, update, focusName } from "/admin/store.js";
import { esc, icon, avatar, fmtDate, openDrawer, copy, toast, linkKind } from "/admin/lib.js";
import { dueChip, editRow, empty, ownerOnly } from "/admin/ui.js";

export const ORG_STATUS = ["Not sent", "Sent", "Followed up", "Yes", "No", "No reply"];
const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, "-");
const orgPill = (s) => `<span class="opill opill--${slug(s)}">${esc(s)}</span>`;
const short = (n) => n.replace(/\s*\(([^)]*)\)\s*$/, "");
const abbr = (n) => (n.match(/\(([^)]*)\)\s*$/) || [])[1] || "";
const f = { q: "", owner: null, status: "", grp: "" };

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

export default {
  id: "outreach", title: "Outreach", icon: "send",
  render(root) {
    if (f.owner === null) f.owner = focusName() && (S.data.orgs || []).some((o) => o.owner === focusName()) ? focusName() : "";
    const orgs = S.data.orgs || [];
    const groups = setting("outreach").groups || {};
    const list = orgs.filter((o) =>
      (!f.owner || o.owner === f.owner) && (!f.status || o.status === f.status) && (!f.grp || o.grp === f.grp) &&
      (!f.q || `${o.name} ${o.cluster} ${o.why}`.toLowerCase().includes(f.q.toLowerCase())));
    const count = (s, xs = orgs) => xs.filter((o) => o.status === s).length;
    const owners = [...new Set(orgs.map((o) => o.owner).filter(Boolean))];

    root.innerHTML = `
      <header class="ph">
        <div>
          <p class="ph__eyebrow">Partnerships</p>
          <h1 class="ph__title">Org outreach</h1>
          <p class="ph__sub">Open an org to get its messages with the brackets already filled in.</p>
        </div>
        <div class="ph__actions">${ownerOnly(`<button class="btn btn--primary" id="addOrg">${icon("plus")} Add org</button>`)}</div>
      </header>

      <section class="card pad pipeline stagger" style="--i:0">
        <div class="pipeline__bar">${ORG_STATUS.map((s) => { const n = count(s); return n ? `<i class="opill--${slug(s)}" style="flex:${n}" title="${esc(s)}: ${n}"></i>` : ""; }).join("")}</div>
        <div class="pipeline__legend">${ORG_STATUS.map((s) => `<button class="pl ${f.status === s ? "is-on" : ""}" data-status="${esc(s)}"><span class="opill--${slug(s)}"></span>${esc(s)} <b>${count(s)}</b></button>`).join("")}</div>
        <div class="owners">${owners.map((n) => {
          const mine = orgs.filter((o) => o.owner === n), sent = mine.filter((o) => o.status !== "Not sent").length;
          return `<button class="own ${f.owner === n ? "is-on" : ""}" data-owner="${esc(n)}">${avatar(n, "sm")}<span><b>${esc(n)}</b><small>${sent}/${mine.length} messaged · ${count("Yes", mine)} yes</small></span><i class="own__bar"><i style="--w:${(sent / mine.length) * 100}%"></i></i></button>`;
        }).join("")}</div>
      </section>

      <div class="filters card">
        <label class="search">${icon("search")}<input id="q" placeholder="Search orgs" value="${esc(f.q)}" /></label>
        <select class="select" id="grp"><option value="">All types</option>${Object.entries(groups).map(([k, g]) => `<option value="${k}" ${f.grp === k ? "selected" : ""}>${esc(g.label)}</option>`).join("")}</select>
        ${f.owner || f.status || f.grp || f.q ? `<button class="btn btn--ghost btn--sm" id="clear">${icon("x")} Clear filters</button>` : ""}
        <span class="grow"></span><span class="muted">${list.length} of ${orgs.length}</span>
      </div>

      ${list.length ? `<div class="orgs">${list.map((o, i) => {
        const fu = followUpDate(o);
        return `<button class="org card stagger" style="--i:${Math.min(i, 12)}" data-org="${o.id}">
          <span class="org__top">${o.tier ? `<span class="tier">T${o.tier}</span>` : ""}<span class="org__cl">${esc(o.cluster)}</span>${orgPill(o.status)}</span>
          <b class="org__n">${esc(short(o.name))}${abbr(o.name) ? ` <em>${esc(abbr(o.name))}</em>` : ""}</b>
          <span class="org__why">${esc(o.why)}</span>
          <span class="org__foot">${avatar(o.owner, "xs")}<span>${esc(o.owner || "Unassigned")}</span><span class="grow"></span>${o.status === "Sent" && fu ? dueChip(fu) : o.dm_date ? `<span class="muted">DM’d ${esc(fmtDate(o.dm_date, { weekday: undefined }))}</span>` : ""}</span>
        </button>`;
      }).join("")}</div>` : empty("No orgs match.", "search")}`;

    const rerender = () => this.render(root);
    const q = root.querySelector("#q");
    q.addEventListener("input", () => { f.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => { rerender(); const n = root.querySelector("#q"); n.focus(); n.setSelectionRange(f.q.length, f.q.length); }, 180); });
    root.querySelectorAll("[data-status]").forEach((b) => b.addEventListener("click", () => { f.status = f.status === b.dataset.status ? "" : b.dataset.status; rerender(); }));
    root.querySelectorAll("[data-owner]").forEach((b) => b.addEventListener("click", () => { f.owner = f.owner === b.dataset.owner ? "" : b.dataset.owner; rerender(); }));
    root.querySelector("#grp").addEventListener("change", (e) => { f.grp = e.target.value; rerender(); });
    root.querySelector("#clear")?.addEventListener("click", () => { Object.assign(f, { q: "", owner: "", status: "", grp: "" }); rerender(); });
    root.querySelectorAll("[data-org]").forEach((b) => b.addEventListener("click", () => openOrg(b.dataset.org)));
    root.querySelector("#addOrg")?.addEventListener("click", () => editRow({ table: "orgs", fields: ORG_FIELDS(), title: "Add an org", defaults: { status: "Not sent", grp: "business" } }));
  },
};

export function openOrg(id) {
  const o = S.data.orgs.find((x) => x.id === id);
  if (!o) return;
  const scripts = scriptsForOrg(o);
  const sender = o.owner || S.me?.name;
  const pageUrl = (o.page.match(/https?:\/\/\S+/) || [])[0];
  const fu = followUpDate(o);
  const g = setting("outreach").groups?.[o.grp];
  openDrawer({
    wide: true,
    eyebrow: `${o.tier ? `Tier ${o.tier} · ` : ""}${esc(o.cluster)}`,
    title: esc(o.name),
    body: `
      <div class="dmeta">${orgPill(o.status)}${o.owner ? `<span class="who">${avatar(o.owner, "sm")}${esc(o.owner)}</span>` : ""}${o.status === "Sent" && fu ? `<span class="muted">Follow up</span>${dueChip(fu)}` : ""}</div>
      <dl class="facts">
        <div><dt>Why them</dt><dd>${esc(o.why) || "—"}</dd></div>
        <div><dt>Reach them</dt><dd>${pageUrl ? `<a href="${esc(pageUrl)}" target="_blank" rel="noopener" class="inline-link">${icon(linkKind(pageUrl)[0])}${esc(pageUrl.replace(/^https?:\/\/(www\.)?/, ""))}</a>` : ""}${esc(o.page.replace(pageUrl || "", "").replace(/^\s*[·-]\s*/, "")) || (pageUrl ? "" : "—")}</dd></div>
        ${o.dm_date ? `<div><dt>DM’d</dt><dd>${esc(fmtDate(o.dm_date))}</dd></div>` : ""}
        ${o.replied_by ? `<div><dt>Replied</dt><dd>${esc(o.replied_by)}</dd></div>` : ""}
        ${o.agreed ? `<div><dt>Agreed to</dt><dd>${esc(o.agreed)}</dd></div>` : ""}
        ${o.next_step ? `<div><dt>Next step</dt><dd>${esc(o.next_step)}</dd></div>` : ""}
      </dl>
      <section class="dsec">
        <h4>${icon("message")} Messages for ${esc(short(o.name))}</h4>
        <p class="hint">Filled in for ${esc(sender || "the sender")}${g?.label ? ` · ${esc(g.label)} wording` : ""}. Anything still in [brackets] needs you.</p>
        <div class="scripts">${scripts.map((s, i) => {
          const text = fillScript(s.body, { org: o, sender });
          return `<article class="script ${i === 0 ? "is-first" : ""}">
            <header><b>${esc(s.title)}</b>${s.note ? `<small>${esc(s.note)}</small>` : ""}<button class="btn btn--ghost btn--xs" data-copy="${i}">${icon("copy")} Copy</button></header>
            <pre>${esc(text).replace(/\[[^\]]+\]/g, (m) => `<mark>${m}</mark>`)}</pre>
          </article>`;
        }).join("")}</div>
      </section>`,
    actions: S.owner ? `<span class="grow"></span><button class="btn btn--primary" data-edit>${icon("edit")} Update</button>` : "",
    onMount(root) {
      root.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => copy(fillScript(scripts[b.dataset.copy].body, { org: o, sender }), "Message copied")));
      root.querySelector("[data-edit]")?.addEventListener("click", () => editRow({ table: "orgs", row: o, fields: ORG_FIELDS(), title: o.name, after: () => openOrg(o.id) }));
    },
  });
}
