/* Playbook: the guides, every message we send (ready to copy), the files, and who to ask. */
import { S, fillScript, focusName } from "/admin/store.js";
import { esc, icon, md, copy, linkKind } from "/admin/lib.js";
import { editRow, empty, ownerOnly, trackName } from "/admin/ui.js";

const GUIDE_FIELDS = [
  { key: "title", label: "Title", full: true, autofocus: true },
  { key: "category", label: "Section" },
  { key: "sort", label: "Order", type: "number" },
  { key: "body", label: "Content", type: "textarea", rows: 18, help: "## Heading · - bullet · 1. step · **bold** · > note · | table | rows |" },
];
const SCRIPT_FIELDS = [
  { key: "title", label: "Title", full: true, autofocus: true },
  { key: "category", label: "Section" },
  { key: "note", label: "When to use it" },
  { key: "sort", label: "Order", type: "number" },
  { key: "body", label: "Message", type: "textarea", rows: 14, help: "[Org], [Name], [dates], [room], [link], [session times] fill in automatically where we know them." },
];
const RES_FIELDS = [
  { key: "label", label: "Name", full: true, autofocus: true },
  { key: "url", label: "Link", full: true, placeholder: "https://…" },
  { key: "category", label: "Section" },
  { key: "sort", label: "Order", type: "number" },
  { key: "note", label: "Note", type: "textarea", rows: 2 },
];
const CONTACT_FIELDS = [
  { key: "name", label: "Name", full: true, autofocus: true },
  { key: "org", label: "Office / role" },
  { key: "category", label: "Section" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone / local" },
  { key: "note", label: "What to contact them for", type: "textarea", rows: 3 },
];
const TABS = [["guides", "Guides", "book"], ["scripts", "Scripts", "message"], ["files", "Files", "folder"], ["contacts", "Contacts", "mail"]];
const pb = { tab: "guides", item: "", q: "" };
const HELP = {
  guides: "How we run things, step by step. Pick a guide on the left.",
  scripts: "Every message we send. Copy one and paste it. Brackets fill in where we know the answer.",
  files: "Every folder and file the team uses, plus files attached to tasks.",
  contacts: "Who to ask for what.",
};
const group = (rows, key = "category") => rows.reduce((m, r) => ((m[r[key]] ||= []).push(r), m), {});
const pad = (n) => String(n).padStart(2, "0");
const marked = (s) => esc(s).replace(/\[[^\]]+\]/g, (m) => `<mark>${m}</mark>`);

export default {
  id: "playbook", title: "Playbook", icon: "book",
  render(root, params = {}) {
    if (params.tab) pb.tab = params.tab;
    if (params.item) pb.item = params.item;
    const match = (...xs) => !pb.q || xs.join(" ").toLowerCase().includes(pb.q.toLowerCase());
    const counts = { guides: (S.data.guides || []).length, scripts: (S.data.scripts || []).length, files: (S.data.resources || []).length, contacts: (S.data.contacts || []).length };
    const add = { guides: "Guide", scripts: "Script", files: "Link", contacts: "Contact" }[pb.tab];

    root.innerHTML = `
      <header class="ph">
        <div>
          <h1 class="ph__title">Playbook</h1>
          <p class="ph__sub">${esc(HELP[pb.tab])}</p>
        </div>
        <div class="ph__actions">${ownerOnly(`<button class="btn btn--ghost" id="add">${icon("plus")} Add ${add.toLowerCase()}</button>`)}</div>
      </header>

      <div class="card filters">
        <div class="seg seg--tabs" id="pbTabs">${TABS.map(([k, l, ic]) => `<button class="${pb.tab === k ? "is-on" : ""}" data-tab="${k}">${icon(ic)}${l}<span>${counts[k]}</span></button>`).join("")}</div>
        <label class="search">${icon("search")}<input id="q" placeholder="Search ${pb.tab}" value="${esc(pb.q)}" /></label>
      </div>

      <div class="results">${({ guides, scripts, files, contacts })[pb.tab](match)}</div>`;

    const rerender = () => this.render(root);
    root.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { pb.tab = b.dataset.tab; pb.item = ""; rerender(); }));
    const q = root.querySelector("#q");
    q.addEventListener("input", () => { pb.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => { rerender(); const n = root.querySelector("#q"); n.focus(); n.setSelectionRange(pb.q.length, pb.q.length); }, 180); });
    root.querySelectorAll("[data-item]").forEach((b) => b.addEventListener("click", () => { pb.item = b.dataset.item; rerender(); if (innerWidth < 900) root.querySelector(".reader__doc")?.scrollIntoView({ behavior: "smooth" }); }));
    root.querySelectorAll("[data-toc]").forEach((b) => b.addEventListener("click", () => root.querySelector(`#${b.dataset.toc}`)?.scrollIntoView({ behavior: "smooth", block: "start" })));
    root.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => copy(fillScript(S.data.scripts.find((s) => s.id === b.dataset.copy).body, { sender: me() }), "Script copied")));
    root.querySelectorAll("[data-copy-text]").forEach((b) => b.addEventListener("click", () => copy(b.dataset.copyText, "Copied")));
    const table = { guides: "guides", scripts: "scripts", files: "resources", contacts: "contacts" }[pb.tab];
    const fields = { guides: GUIDE_FIELDS, scripts: SCRIPT_FIELDS, files: RES_FIELDS, contacts: CONTACT_FIELDS }[pb.tab];
    root.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      const row = S.data[table].find((x) => x.id === b.dataset.edit);
      editRow({ table, row, fields, title: row.title || row.label || row.name });
    }));
    const category = { guides: "Guide", scripts: "Outreach", files: "Start here", contacts: "General" }[pb.tab];
    root.querySelector("#add")?.addEventListener("click", () => editRow({ table, fields, title: `New ${add.toLowerCase()}`, defaults: { category, sort: (S.data[table] || []).length } }));
    if (pb.tab === "scripts" && params.item) requestAnimationFrame(() => root.querySelector(`#s-${params.item}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  },
};

const me = () => focusName() || S.me?.name;

/* ---------- guides: index on the left, the guide on the right ---------- */
function guides(match) {
  const all = (S.data.guides || []).filter((g) => match(g.title, g.body, g.category));
  if (!all.length) return `<div class="card">${empty("No guides match.", "search")}</div>`;
  const cur = all.find((g) => g.id === pb.item) || all[0];
  let n = 0;
  const body = md(cur.body).replace(/<h4>/g, () => `<h4 id="sec-${n++}">`);
  const toc = [...cur.body.matchAll(/^## (.*)$/gm)].map((m) => m[1]);
  return `<div class="reader">
    <nav class="card reader__nav">${all.map((g, i) => `
      <button class="ridx in ${g.id === cur.id ? "is-on" : ""}" style="--i:${i}" data-item="${g.id}"><b>${esc(g.title)}</b><small>${esc(g.category)}</small></button>`).join("")}
    </nav>
    <article class="card reader__doc in">
      <header class="reader__h">
        <div><p class="reader__k">${esc(cur.category)}</p><h2>${esc(cur.title)}</h2></div>
        ${ownerOnly(`<button class="iconbtn" data-edit="${cur.id}" title="Edit">${icon("edit")}</button>`)}
      </header>
      ${toc.length > 1 ? `<div class="toc">${toc.map((t, i) => `<button class="chipbtn" data-toc="sec-${i}">${esc(t)}</button>`).join("")}</div>` : ""}
      <div class="prose prose--doc">${body}</div>
    </article>
  </div>`;
}

/* ---------- scripts: every message, filled in, one click to copy ---------- */
function scripts(match) {
  const all = (S.data.scripts || []).filter((s) => match(s.title, s.body, s.note, s.category));
  if (!all.length) return `<div class="card">${empty("No scripts match.", "search")}</div>`;
  return Object.entries(group(all)).map(([cat, xs]) => `
    <section class="group">
      <h3 class="band">${esc(cat)} <span>${xs.length}</span></h3>
      <div class="scriptgrid">${xs.map((s, i) => `
        <article class="script in ${s.id === pb.item ? "is-first" : ""}" id="s-${s.id}" style="--i:${i}">
          <header><span class="script__n">${pad(i + 1)}</span><b>${esc(s.title)}</b>${ownerOnly(`<button class="iconbtn" data-edit="${s.id}" title="Edit">${icon("edit")}</button>`)}<button class="btn btn--ghost btn--xs" data-copy="${s.id}">${icon("copy")} Copy</button></header>
          ${s.note ? `<p class="script__note">${esc(s.note)}</p>` : ""}
          <pre>${marked(fillScript(s.body, { sender: me() }))}</pre>
        </article>`).join("")}</div>
    </section>`).join("");
}

/* ---------- files: every link, then the ones attached to tasks ---------- */
function files(match) {
  const res = (S.data.resources || []).filter((r) => match(r.label, r.note, r.category, r.url));
  const known = new Set((S.data.resources || []).map((r) => r.url));
  const fromTasks = {};
  for (const t of S.data.tasks || []) {
    for (const l of [...(t.links || []), ...(t.outputs || [])]) {
      if (known.has(l.url) || !match(t.title, l.label, l.url)) continue;
      (fromTasks[trackName(t.session)] ||= []).push({ ...l, task: t });
    }
  }
  const nTask = Object.values(fromTasks).flat().length;
  const row = (url, title, sub, i, edit = "") => { const [ic, kind] = linkKind(url); return `
    <a class="frow in" style="--i:${i}" href="${esc(url)}" target="_blank" rel="noopener">
      <span class="frow__ic ic--${ic}">${icon(ic)}</span>
      <span class="frow__b"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</span>
      <span class="frow__k">${esc(kind)}</span>
      ${edit}${icon("arrow", "frow__go")}
    </a>`; };
  return `${Object.entries(group(res)).map(([cat, xs]) => `
    <section class="group">
      <h3 class="band">${esc(cat)} <span>${xs.length}</span></h3>
      <div class="card flist">${xs.map((r, i) => row(r.url, r.label, r.note, i, ownerOnly(`<button class="iconbtn" data-edit="${r.id}" title="Edit">${icon("edit")}</button>`))).join("")}</div>
    </section>`).join("") || (nTask ? "" : `<div class="card">${empty("No files match.", "search")}</div>`)}
    ${nTask ? `<details class="group fromtasks" ${pb.q ? "open" : ""}>
      <summary class="band">Attached to tasks <span>${nTask}</span>${icon("down", "fold__chev")}</summary>
      ${Object.entries(fromTasks).map(([track, xs]) => `
        <p class="sub-band">${esc(track)}</p>
        <div class="card flist">${xs.map((l, i) => { const [, kind] = linkKind(l.url); return row(l.url, l.label && l.label !== kind ? l.label : kind, `${l.task.title} · ${l.task.owners.join(", ")}`, i); }).join("")}</div>`).join("")}
    </details>` : ""}`;
}

/* ---------- contacts ---------- */
function contacts(match) {
  const all = (S.data.contacts || []).filter((c) => match(c.name, c.org, c.note, c.email, c.category));
  if (!all.length) return `<div class="card">${empty("No contacts match.", "search")}</div>`;
  return Object.entries(group(all)).map(([cat, xs]) => `
    <section class="group">
      <h3 class="band">${esc(cat)} <span>${xs.length}</span></h3>
      <div class="card tablewrap"><table class="table contactt"><tbody>${xs.map((c, i) => `
        <tr class="in" style="--i:${i}">
          <td class="w-name"><b>${esc(c.name)}</b><small>${esc(c.org)}</small></td>
          <td class="muted">${esc(c.note)}</td>
          <td class="r nowrap">
            ${c.email ? `<a class="btn btn--ghost btn--xs" href="mailto:${esc(c.email)}" title="${esc(c.email)}">${icon("mail")} Email</a><button class="iconbtn" data-copy-text="${esc(c.email)}" title="Copy ${esc(c.email)}">${icon("copy")}</button>` : ""}
            ${c.phone ? `<span class="tag">${icon("phone")} ${esc(c.phone)}</span>` : ""}
            ${ownerOnly(`<button class="iconbtn" data-edit="${c.id}" title="Edit">${icon("edit")}</button>`)}
          </td>
        </tr>`).join("")}</tbody></table></div>
    </section>`).join("");
}
