/* Outreach: your orgs as boxes by category (or by status), one tap to copy the message and open their page.
   Everyone logs progress on their own orgs; status changes fill in their own dates (DM'd today, follow-up 2 working days later). */
import { S, setting, people, scriptsForOrg, fillScript, followUpDate, focusName, canLogOrg, logOrg, tasksFor, isDone, isGuest } from "/admin/store.js";
import { esc, icon, avatar, fmtDate, fmtWhen, openDrawer, copy, toast, linkKind, todayISO, rel } from "/admin/lib.js";
import { dueChip, editRow, empty, ownerOnly } from "/admin/ui.js";

export const ORG_STATUS = ["Not sent", "Sent", "Followed up", "Yes", "No", "No reply"];
const LANES = [["todo", "To message", ["Not sent"]], ["waiting", "Waiting on them", ["Sent", "Followed up"]], ["done", "Answered", ["Yes", "No", "No reply"]]];
const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, "-");
const orgPill = (s) => `<span class="spill opill--${slug(s)}">${esc(s)}</span>`;
const short = (n) => n.replace(/\s*\(([^)]*)\)\s*$/, "");
const abbr = (n) => (n.match(/\(([^)]*)\)\s*$/) || [])[1] || "";
const pageOf = (o) => (o.page.match(/https?:\/\/\S+/) || [])[0];
const isOpen = (o) => o.status === "Not sent";
const f = { q: "", who: null, by: "type" };
const TIP = "Know someone in the org? Message them first.";

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

/* one tap: status changes and the dates follow on their own */
async function setStatus(o, status) {
  const prev = { status: o.status, dm_date: o.dm_date || "" };
  const patch = { status };
  if (status === "Sent" && !o.dm_date) patch.dm_date = todayISO();
  try {
    await logOrg(o.id, patch);
    toast(`${abbr(o.name) || short(o.name)}: ${status}`, "", { label: "Undo", run: () => logOrg(o.id, prev).catch(() => toast("Couldn’t undo.", "bad")) });
  } catch { toast("Couldn’t save.", "bad"); }
}
/* copy the first message (filled in for this org) and open their page to paste it */
function copyAndOpen(o) {
  const first = scriptsForOrg(o)[0];
  const url = pageOf(o);
  if (first) copy(fillScript(first.body, { org: o, sender: o.owner || S.me?.name }), url ? "Message copied. Paste it in their inbox." : "Message copied");
  if (url) window.open(url, "_blank", "noopener");
}

/* the deadline for someone's outreach: their "Org outreach" task */
const deadlineFor = (name) => tasksFor(name).find((t) => /^org outreach/i.test(t.title) && !isDone(t) && t.due);

function progressBar(orgs) {
  const n = orgs.length || 1;
  return `<span class="obar">${ORG_STATUS.map((s) => { const c = orgs.filter((o) => o.status === s).length; return c ? `<i class="sw--${slug(s)}" style="--w:${(c / n) * 100}%" title="${esc(s)}: ${c}"></i>` : ""; }).join("")}</span>`;
}

function tile(o, i, { showOwner }) {
  const can = canLogOrg(o), fu = followUpDate(o), today = todayISO();
  const name = abbr(o.name) || short(o.name);
  const sub = abbr(o.name) ? short(o.name) : "";
  const followDue = o.status === "Sent" && fu && fu <= today;
  return `<article class="otile in st-${slug(o.status)} ${followDue ? "is-due" : ""}" style="--i:${Math.min(i, 14)}" data-org="${o.id}" tabindex="0" role="button" aria-label="${esc(o.name)}">
    <header class="otile__top">
      ${orgPill(o.status)}
      ${o.tier === 1 ? `<span class="otile__star" title="Top pick: message these first">${icon("sparkles")}</span>` : ""}
      ${showOwner && o.owner ? `<span class="otile__who">${avatar(o.owner, "xs")}</span>` : ""}
    </header>
    <b class="otile__name">${esc(name)}</b>
    ${sub ? `<small class="otile__sub">${esc(sub)}</small>` : ""}
    ${o.status === "Sent" && fu ? `<span class="otile__fu">${followDue ? icon("alert") : icon("clock")} Follow up ${esc(rel(fu).label.toLowerCase())}</span>` : ""}
    <footer class="otile__act">
      ${isOpen(o) || followDue ? `<button class="obtn obtn--go" data-go="${o.id}" title="Copy the message and open their page">${icon("send")} Message</button>` : ""}
      ${can && isOpen(o) ? `<button class="obtn" data-sent="${o.id}" title="I sent it">${icon("check")} Sent</button>` : ""}
      ${can && followDue ? `<button class="obtn" data-followed="${o.id}" title="I followed up">${icon("check")} Done</button>` : ""}
    </footer>
  </article>`;
}

export default {
  id: "outreach", title: "Outreach", icon: "send",
  render(root) {
    const orgs = S.data.orgs || [];
    const groups = setting("outreach").groups || {};
    const out = setting("outreach");
    const today = todayISO();
    const owners = [...new Set(orgs.map((o) => o.owner).filter(Boolean))].sort();
    const me = focusName() || S.me?.name;
    if (f.who === null) f.who = owners.includes(me) ? me : "all";
    const person = f.who === "all" ? "" : f.who;
    const mine = orgs.filter((o) => !person || o.owner === person);
    const list = mine.filter((o) => !f.q || `${o.name} ${o.cluster} ${o.why}`.toLowerCase().includes(f.q.toLowerCase()))
      .sort((a, b) => (a.tier || 9) - (b.tier || 9) || a.sort - b.sort);
    const sent = mine.filter((o) => !isOpen(o)).length;
    const dueFollow = mine.filter((o) => o.status === "Sent" && followUpDate(o) && followUpDate(o) <= today);
    const dl = person && deadlineFor(person);
    const showOwner = !person;

    // boxes: one per category (message type), ordered by their best tier; or three lanes by status
    let boxes;
    if (f.by === "status") {
      boxes = LANES.map(([k, label, sts]) => ({ key: k, label, orgs: list.filter((o) => sts.includes(o.status)), lane: true }));
    } else {
      const by = {};
      list.forEach((o) => (by[o.grp || "other"] ||= []).push(o));
      boxes = Object.entries(by).map(([k, xs]) => ({ key: k, label: groups[k]?.label || "Other", orgs: xs }))
        .sort((a, b) => Math.min(...a.orgs.map((o) => o.tier || 9)) - Math.min(...b.orgs.map((o) => o.tier || 9)) || b.orgs.length - a.orgs.length);
    }

    root.innerHTML = `<div class="page">
      <header class="ph">
        <div>
          <p class="kicker">Outreach</p>
          <h1 class="ph__title">${person ? `${esc(person === S.me?.name ? "Your" : person + "’s")} orgs` : "Every org"}</h1>
        </div>
        <div class="ph__actions">
          <label class="pick"><span>Showing</span><select id="who"><option value="all" ${f.who === "all" ? "selected" : ""}>Everyone</option>${owners.map((n) => `<option ${f.who === n ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
          ${ownerOnly(`<button class="btn btn--primary" id="addOrg">${icon("plus")} Add org</button>`)}
        </div>
      </header>

      <section class="ohero">
        <div class="ohero__n">
          <b>${sent}<small>/${mine.length}</small></b>
          <span>messaged</span>
        </div>
        <div class="ohero__mid">
          ${progressBar(mine)}
          ${person ? "" : `<p class="ohero__legend">${ORG_STATUS.map((s) => { const c = mine.filter((o) => o.status === s).length; return c ? `<span><i class="sw sw--${slug(s)}"></i>${esc(s)} <b>${c}</b></span>` : ""; }).join("")}</p>`}
          ${!person ? `<div class="ohero__people">${owners.map((n) => { const xs = orgs.filter((o) => o.owner === n), d = xs.filter((o) => !isOpen(o)).length; return `<button class="operson" data-person="${esc(n)}">${avatar(n, "xs")}<span>${esc(n)}</span><b>${d}/${xs.length}</b></button>`; }).join("")}</div>` : ""}
        </div>
        ${dl ? `<div class="ohero__due ${rel(dl.due).tone}"><span class="kicker">Due</span><b>${esc(fmtWhen(dl.due, dl.due_time))}</b>${dueChip(dl.due, dl.due_time)}</div>` : ""}
      </section>

      ${person && mine.some(isOpen) ? `<p class="tip">${icon("sparkles")}<span>${esc(out.tip || TIP)}</span></p>` : ""}
      ${dueFollow.length ? `<div class="banner">${icon("clock")}<span><b>Follow up today:</b> ${dueFollow.map((o) => `<button class="chipbtn" data-org="${o.id}">${esc(abbr(o.name) || short(o.name))}</button>`).join("")}</span></div>` : ""}

      <div class="obar-tools">
        <div class="seg" role="group" aria-label="Group by">
          <button class="${f.by === "type" ? "is-on" : ""}" data-by="type">${icon("overview")} Category</button>
          <button class="${f.by === "status" ? "is-on" : ""}" data-by="status">${icon("tasks")} Status</button>
        </div>
        <label class="search">${icon("search")}<input id="q" placeholder="Find an org" value="${esc(f.q)}" /></label>
      </div>

      ${list.length ? `<div class="oboxes ${f.by === "status" ? "oboxes--lanes" : ""}">${boxes.map((b) => {
        const d = b.orgs.filter((o) => !isOpen(o)).length;
        return `<section class="obox ${b.lane ? `obox--${b.key}` : b.orgs.length > 3 ? "obox--wide" : ""}">
          <header class="obox__h">
            <h3>${esc(b.label)}</h3>
            <span class="obox__n">${b.lane ? b.orgs.length : `${d}/${b.orgs.length}`}</span>
            ${b.lane ? "" : progressBar(b.orgs)}
          </header>
          <div class="obox__grid">${b.orgs.length ? b.orgs.map((o, i) => tile(o, i, { showOwner })).join("") : `<p class="obox__empty">Nothing here.</p>`}</div>
        </section>`;
      }).join("")}</div>` : `<div class="card">${empty(f.q ? "No orgs match." : "No orgs yet.", "search")}</div>`}</div>`;

    const rerender = () => this.render(root);
    const q = root.querySelector("#q");
    q.addEventListener("input", () => { f.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => { rerender(); const n = root.querySelector("#q"); n.focus(); n.setSelectionRange(f.q.length, f.q.length); }, 180); });
    root.querySelector("#who").addEventListener("change", (e) => { f.who = e.target.value; rerender(); });
    root.querySelectorAll("[data-person]").forEach((b) => b.addEventListener("click", () => { f.who = b.dataset.person; rerender(); }));
    root.querySelectorAll("[data-by]").forEach((b) => b.addEventListener("click", () => { f.by = b.dataset.by; rerender(); }));
    const byId = (id) => orgs.find((o) => o.id === id);
    const page = root.firstElementChild; // listeners live on this render's wrapper, not on the shared #main
    page.addEventListener("click", (e) => {
      const go = e.target.closest("[data-go]"), sentB = e.target.closest("[data-sent]"), fol = e.target.closest("[data-followed]");
      if (go) return copyAndOpen(byId(go.dataset.go));
      if (sentB) return setStatus(byId(sentB.dataset.sent), "Sent");
      if (fol) return setStatus(byId(fol.dataset.followed), "Followed up");
      const t = e.target.closest("[data-org]");
      if (t) openOrg(t.dataset.org);
    });
    page.addEventListener("keydown", (e) => { const t = e.target.closest?.(".otile"); if (t && e.key === "Enter" && e.target === t) openOrg(t.dataset.org); });
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
  const can = canLogOrg(o);
  const first = scripts[0] ? fillScript(scripts[0].body, { org: o, sender }) : "";
  const bubble = (t) => esc(t).replace(/\[[^\]]+\]/g, (m) => `<mark>${m}</mark>`);
  openDrawer({
    wide: true,
    eyebrow: `${esc(g?.label || o.cluster)}${o.tier === 1 ? " · Top pick" : ""}`,
    title: esc(o.name),
    body: `
      <div class="dmeta">${orgPill(o.status)}${o.owner ? `<span class="who">${avatar(o.owner, "sm")}${esc(o.owner)}</span>` : ""}${o.status === "Sent" && fu ? `<span class="muted">Follow up</span>${dueChip(fu)}` : ""}</div>

      <ol class="steps">
        <li>
          <span class="steps__n">1</span>
          <div class="steps__b">
            <b>Send the message</b>
            ${scripts[0] ? `<div class="go-row">
              <button class="btn btn--primary" data-first>${icon("send")} Copy${pageUrl ? " & open page" : ""}</button>
              ${pageUrl ? `<a class="btn btn--ghost" href="${esc(pageUrl)}" target="_blank" rel="noopener">${icon(linkKind(pageUrl)[0])} Page</a>` : ""}
            </div>
            <details class="peek"><summary>See the message</summary><div class="bubble"><p>${bubble(first)}</p></div></details>` : `<p class="muted">No message for this org yet.</p>`}
            ${!pageUrl && o.page ? `<p class="steps__note">Reach them: ${esc(o.page)}</p>` : ""}
          </div>
        </li>
        <li>
          <span class="steps__n">2</span>
          <div class="steps__b">
            <b>${can ? "Mark it" : "Status"}</b>
            ${can ? `<div class="statusset" role="group" aria-label="Status">${ORG_STATUS.map((s) => `<button class="${s === o.status ? "is-on" : ""}" data-s="${esc(s)}"><i class="sw sw--${slug(s)}"></i>${esc(s)}</button>`).join("")}</div>
` : `<p>${orgPill(o.status)}${o.dm_date ? ` <span class="muted">DM’d ${esc(fmtDate(o.dm_date))}</span>` : ""}</p>`}
          </div>
        </li>
        <li>
          <span class="steps__n">3</span>
          <div class="steps__b">
            <b>Their reply</b>
            ${can ? `<div class="form form--log">
              <label class="fld"><input id="lgWho" value="${esc(o.replied_by)}" placeholder="Who replied" aria-label="Who replied" /></label>
              <label class="fld"><input id="lgAgreed" value="${esc(o.agreed)}" placeholder="What they agreed to" aria-label="What they agreed to" /></label>
              <label class="fld fld--full"><input id="lgNext" value="${esc(o.next_step)}" placeholder="Next step" aria-label="Next step" /></label>
              <button class="btn btn--ghost btn--sm" data-log>${icon("check")} Save</button>
            </div>` : `<dl class="facts">
              <div><dt>Replied</dt><dd>${esc(o.replied_by) || "—"}</dd></div>
              <div><dt>Agreed to</dt><dd>${esc(o.agreed) || "—"}</dd></div>
              <div><dt>Next step</dt><dd>${esc(o.next_step) || "—"}</dd></div>
            </dl>`}
          </div>
        </li>
      </ol>

      ${o.why ? `<p class="why">${icon("help")}<span><b>Why them:</b> ${esc(o.why)}</span></p>` : ""}

      ${scripts.length > 1 ? `<details class="more">
        <summary>${icon("message")} Follow-up messages <span class="count">${scripts.length - 1}</span>${icon("down", "fold__chev")}</summary>
        <div class="scripts">${scripts.slice(1).map((s, i) => `
          <article class="script">
            <header><b>${esc(s.title)}</b>${s.note ? `<small>${esc(s.note)}</small>` : ""}<button class="btn btn--ghost btn--xs" data-copy="${i + 1}">${icon("copy")} Copy</button></header>
            <pre>${bubble(fillScript(s.body, { org: o, sender }))}</pre>
          </article>`).join("")}</div>
      </details>` : ""}`,
    actions: S.owner ? `<span class="grow"></span><button class="btn btn--ghost" data-edit>${icon("edit")} Edit details</button>` : "",
    onMount(root) {
      root.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => copy(fillScript(scripts[b.dataset.copy].body, { org: o, sender }), "Message copied")));
      root.querySelector("[data-first]")?.addEventListener("click", () => copyAndOpen(o));
      root.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", async () => { await setStatus(o, b.dataset.s); openOrg(o.id); }));
      root.querySelector("[data-log]")?.addEventListener("click", async () => {
        const patch = { replied_by: root.querySelector("#lgWho").value.trim(), agreed: root.querySelector("#lgAgreed").value.trim(), next_step: root.querySelector("#lgNext").value.trim() };
        try { await logOrg(o.id, patch); toast("Saved"); openOrg(o.id); } catch { toast("Couldn’t save.", "bad"); }
      });
      root.querySelector("[data-edit]")?.addEventListener("click", () => editRow({ table: "orgs", row: o, fields: ORG_FIELDS(), title: o.name, after: () => openOrg(o.id) }));
    },
  });
}
