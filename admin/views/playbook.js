/* Playbook: four doors (guides, messages, files, people). Pick one, then everything is a card:
   guides open in a reader panel, messages look like the chat bubble you'll send, files are tiles, people are contact cards. */
import { S, fillScript, focusName, isGuest } from "/admin/store.js";
import { esc, icon, md, copy, linkKind, openDrawer, avatar } from "/admin/lib.js";
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
/* the four doors */
const DOORS = [
  ["guides", "Guides", "book", "How we run things", "guides"],
  ["scripts", "Messages", "message", "Copy, paste, send", "scripts"],
  ["files", "Files", "folder", "Docs, sheets, folders", "resources"],
  ["contacts", "People", "users", "Who to ask for what", "contacts"],
];
const TABLE = { guides: "guides", scripts: "scripts", files: "resources", contacts: "contacts" };
const FIELDS = { guides: GUIDE_FIELDS, scripts: SCRIPT_FIELDS, files: RES_FIELDS, contacts: CONTACT_FIELDS };
const pb = { tab: "guides", q: "" };
const group = (rows, key = "category") => rows.reduce((m, r) => ((m[r[key]] ||= []).push(r), m), {});
const pad = (n) => String(n).padStart(2, "0");
const marked = (s) => esc(s).replace(/\[[^\]]+\]/g, (m) => `<mark>${m}</mark>`);
const me = () => focusName() || S.me?.name;
const hue = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
/* first plain sentence or two of a guide, for its card */
const preview = (body) => body.split("\n").map((l) => l.trim()).find((l) => l && !/^(#|\||-|\d+\.|>)/.test(l))?.replace(/\*\*|\*|\[([^\]]+)\]\([^)]+\)/g, "$1").slice(0, 170) || "";
const MATCH = {
  guides: (g) => [g.title, g.body, g.category],
  scripts: (s) => [s.title, s.body, s.note, s.category],
  files: (r) => [r.label, r.note, r.category, r.url],
  contacts: (c) => [c.name, c.org, c.note, c.email, c.category],
};

export default {
  id: "playbook", title: "Playbook", icon: "book",
  render(root, params = {}) {
    if (params.tab) pb.tab = params.tab;
    // guests don't see People (outside contacts' emails and numbers); the database hides them too
    const doors = DOORS.filter(([k]) => !(k === "contacts" && isGuest()));
    if (!doors.some(([k]) => k === pb.tab)) pb.tab = "guides";
    const match = (...xs) => !pb.q || xs.join(" ").toLowerCase().includes(pb.q.toLowerCase());
    const rows = (tab) => (S.data[TABLE[tab]] || []).filter((r) => match(...MATCH[tab](r)));
    const door = doors.find((d) => d[0] === pb.tab);

    root.innerHTML = `<div class="page">
      <header class="ph">
        <div>
          <p class="kicker">Playbook</p>
          <h1 class="ph__title">What do you need?</h1>
        </div>
        <div class="ph__actions">
          <label class="search search--lg">${icon("search")}<input id="q" placeholder="Search everything" value="${esc(pb.q)}" /></label>
          ${ownerOnly(`<button class="btn btn--ghost" id="add">${icon("plus")} Add</button>`)}
        </div>
      </header>

      <nav class="doors" aria-label="Playbook sections">${doors.map(([k, l, ic, sub], i) => `
        <button class="door door--${k} ${pb.tab === k ? "is-on" : ""}" data-tab="${k}" style="--i:${i}">
          <span class="door__ic">${icon(ic)}</span>
          <span class="door__t"><b>${l}</b><small>${sub}</small></span>
          <span class="door__n">${rows(k).length}</span>
        </button>`).join("")}
      </nav>

      <div class="results" data-tab-body="${pb.tab}">${({ guides, scripts, files, contacts })[pb.tab](rows(pb.tab), match)}</div></div>`;

    const rerender = () => this.render(root);
    root.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { pb.tab = b.dataset.tab; rerender(); }));
    const q = root.querySelector("#q");
    q.addEventListener("input", () => { pb.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => { rerender(); const n = root.querySelector("#q"); n.focus(); n.setSelectionRange(pb.q.length, pb.q.length); }, 180); });
    root.querySelectorAll("[data-read]").forEach((b) => b.addEventListener("click", (e) => { if (!e.target.closest("[data-edit]")) readGuide(b.dataset.read); }));
    root.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => copy(fillScript(S.data.scripts.find((s) => s.id === b.dataset.copy).body, { sender: me() }), "Message copied")));
    root.querySelectorAll("[data-more]").forEach((b) => b.addEventListener("click", () => { const open = b.closest(".msg").classList.toggle("is-open"); b.textContent = open ? "Show less" : "Show all"; }));
    root.querySelectorAll("[data-copy-text]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); copy(b.dataset.copyText, "Copied"); }));
    root.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      const row = S.data[TABLE[pb.tab]].find((x) => x.id === b.dataset.edit);
      editRow({ table: TABLE[pb.tab], row, fields: FIELDS[pb.tab], title: row.title || row.label || row.name });
    }));
    const category = { guides: "Guide", scripts: "Outreach", files: "Start here", contacts: "General" }[pb.tab];
    root.querySelector("#add")?.addEventListener("click", () => editRow({ table: TABLE[pb.tab], fields: FIELDS[pb.tab], title: `New in ${door[1]}`, defaults: { category, sort: (S.data[TABLE[pb.tab]] || []).length } }));
    if (params.item) {
      if (pb.tab === "guides") readGuide(params.item);
      else requestAnimationFrame(() => root.querySelector(`#s-${params.item}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    }
  },
};

/* ---------- guides: chapter cards; a guide opens in the reader panel ---------- */
function guides(all) {
  if (!all.length) return `<div class="card">${empty("No guides match.", "search")}</div>`;
  return `<div class="chapters">${all.map((g, i) => {
    const toc = [...g.body.matchAll(/^## (.*)$/gm)].map((m) => m[1]);
    const mins = Math.max(1, Math.round(g.body.split(/\s+/).length / 200));
    return `<article class="chapter in" style="--i:${i};--h:${hue(g.category)}" data-read="${g.id}" role="button" tabindex="0">
      <header><span class="chapter__n">${pad(i + 1)}</span><span class="chapter__k">${esc(g.category)}</span>${ownerOnly(`<button class="iconbtn" data-edit="${g.id}" title="Edit">${icon("edit")}</button>`)}</header>
      <h3>${esc(g.title)}</h3>
      <p>${esc(preview(g.body))}</p>
      <footer>${toc.slice(0, 3).map((t) => `<span class="chapter__sec">${esc(t)}</span>`).join("")}${toc.length > 3 ? `<span class="chapter__sec">+${toc.length - 3}</span>` : ""}<span class="grow"></span><span class="chapter__read">${mins} min ${icon("arrow")}</span></footer>
    </article>`;
  }).join("")}</div>`;
}
export function readGuide(id) {
  const g = (S.data.guides || []).find((x) => x.id === id);
  if (!g) return;
  let n = 0;
  const body = md(g.body).replace(/<h4>/g, () => `<h4 id="gsec-${n++}">`);
  const toc = [...g.body.matchAll(/^## (.*)$/gm)].map((m) => m[1]);
  openDrawer({
    wide: true,
    eyebrow: esc(g.category),
    title: esc(g.title),
    body: `${toc.length > 1 ? `<div class="toc">${toc.map((t, i) => `<button class="chipbtn" data-toc="gsec-${i}">${esc(t)}</button>`).join("")}</div>` : ""}
      <div class="prose prose--doc">${body}</div>`,
    actions: S.owner ? `<span class="grow"></span><button class="btn btn--ghost" data-edit-guide>${icon("edit")} Edit</button>` : "",
    onMount(root) {
      root.querySelectorAll("[data-toc]").forEach((b) => b.addEventListener("click", () => root.querySelector(`#${b.dataset.toc}`)?.scrollIntoView({ behavior: "smooth", block: "start" })));
      root.querySelector("[data-edit-guide]")?.addEventListener("click", () => editRow({ table: "guides", row: g, fields: GUIDE_FIELDS, title: g.title }));
    },
  });
}

/* ---------- messages: each one looks like the bubble you'll send ---------- */
function scripts(all) {
  if (!all.length) return `<div class="card">${empty("No messages match.", "search")}</div>`;
  return Object.entries(group(all)).map(([cat, xs]) => `
    <section class="group">
      <p class="kicker kicker--band">${esc(cat)} <span>${xs.length}</span></p>
      <div class="bubbles">${xs.map((s, i) => {
        const text = fillScript(s.body, { sender: me() });
        const long = text.split("\n").length > 7 || text.length > 420;
        return `<article class="msg in" id="s-${s.id}" style="--i:${i}">
          <header class="msg__h">
            <span class="msg__n">${pad(i + 1)}</span>
            <span class="msg__t"><b>${esc(s.title)}</b>${s.note ? `<small>${esc(s.note)}</small>` : ""}</span>
            ${ownerOnly(`<button class="iconbtn" data-edit="${s.id}" title="Edit">${icon("edit")}</button>`)}
          </header>
          <div class="bubble ${long ? "is-long" : ""}"><p>${marked(text)}</p></div>
          <footer class="msg__f">
            ${long ? `<button class="link" data-more>Show all</button>` : ""}
            <span class="grow"></span>
            <button class="btn btn--primary btn--sm" data-copy="${s.id}">${icon("copy")} Copy</button>
          </footer>
        </article>`;
      }).join("")}</div>
    </section>`).join("");
}

/* ---------- files: tiles, then the ones attached to tasks (folded) ---------- */
function files(res, match) {
  const known = new Set((S.data.resources || []).map((r) => r.url));
  const fromTasks = {};
  for (const t of S.data.tasks || []) {
    for (const l of [...(t.links || []), ...(t.outputs || [])]) {
      if (known.has(l.url) || !match(t.title, l.label, l.url)) continue;
      (fromTasks[trackName(t.session)] ||= []).push({ ...l, task: t });
    }
  }
  const nTask = Object.values(fromTasks).flat().length;
  const ftile = (url, title, sub, i, edit = "") => { const [ic, kind] = linkKind(url); return `
    <a class="ftl in" style="--i:${i}" href="${esc(/^https?:/i.test(url) ? url : "#")}" target="_blank" rel="noopener">
      <span class="ftl__ic ic--${ic}">${icon(ic)}</span>
      <b>${esc(title)}</b>
      ${sub ? `<small>${esc(sub)}</small>` : ""}
      <span class="ftl__k">${esc(kind)} ${icon("external")}</span>
      ${edit}
    </a>`; };
  return `${Object.entries(group(res)).map(([cat, xs]) => `
    <section class="group">
      <p class="kicker kicker--band">${esc(cat)} <span>${xs.length}</span></p>
      <div class="ftiles">${xs.map((r, i) => ftile(r.url, r.label, r.note, i, ownerOnly(`<button class="iconbtn ftl__edit" data-edit="${r.id}" title="Edit">${icon("edit")}</button>`))).join("")}</div>
    </section>`).join("") || (nTask ? "" : `<div class="card">${empty("No files match.", "search")}</div>`)}
    ${nTask ? `<details class="more" ${pb.q ? "open" : ""}>
      <summary>${icon("link")} Files attached to tasks <span class="count">${nTask}</span>${icon("down", "fold__chev")}</summary>
      ${Object.entries(fromTasks).map(([track, xs]) => `
        <p class="kicker kicker--band">${esc(track)}</p>
        <div class="ftiles ftiles--sm">${xs.map((l, i) => { const [, kind] = linkKind(l.url); return ftile(l.url, l.label && l.label !== kind ? l.label : kind, `${l.task.title} · ${l.task.owners.join(", ")}`, i); }).join("")}</div>`).join("")}
    </details>` : ""}`;
}

/* ---------- people: contact cards ---------- */
function contacts(all) {
  if (!all.length) return `<div class="card">${empty("No contacts match.", "search")}</div>`;
  return Object.entries(group(all)).map(([cat, xs]) => `
    <section class="group">
      <p class="kicker kicker--band">${esc(cat)} <span>${xs.length}</span></p>
      <div class="pcards">${xs.map((c, i) => `
        <article class="pcard in" style="--i:${i}">
          <header>${avatar(c.name, "md")}<span><b>${esc(c.name)}</b><small>${esc(c.org)}</small></span>${ownerOnly(`<button class="iconbtn" data-edit="${c.id}" title="Edit">${icon("edit")}</button>`)}</header>
          ${c.note ? `<p><span class="kicker">Ask about</span>${esc(c.note)}</p>` : ""}
          <footer>
            ${c.email ? `<a class="btn btn--ghost btn--xs" href="mailto:${esc(c.email)}">${icon("mail")} Email</a><button class="btn btn--ghost btn--xs" data-copy-text="${esc(c.email)}" title="${esc(c.email)}">${icon("copy")} Copy email</button>` : ""}
            ${c.phone ? `<span class="tag">${icon("phone")} ${esc(c.phone)}</span>` : ""}
          </footer>
        </article>`).join("")}</div>
    </section>`).join("");
}
