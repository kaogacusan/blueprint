/* Playbook: how-to guides and copy-ready scripts. */
import { S, fillScript, focusName } from "/admin/store.js";
import { esc, icon, md, copy } from "/admin/lib.js";
import { editRow, empty, ownerOnly } from "/admin/ui.js";

let current = "";
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
const group = (rows) => rows.reduce((m, r) => ((m[r.category] ||= []).push(r), m), {});

export default {
  id: "playbook", title: "Playbook", icon: "book",
  render(root, params = {}) {
    if (params.item) current = params.item;
    const guides = S.data.guides || [], scripts = S.data.scripts || [];
    const all = [...guides.map((g) => ({ ...g, kind: "g" })), ...scripts.map((s) => ({ ...s, kind: "s" }))];
    const cur = all.find((x) => x.id === current) || all[0];
    current = cur?.id || "";
    const me = focusName() || S.me?.name;

    root.innerHTML = `
      <header class="ph">
        <div>
          <p class="ph__eyebrow">How we do things</p>
          <h1 class="ph__title">Playbook</h1>
          <p class="ph__sub">Thomas’s guides and every message we send, ready to copy.</p>
        </div>
        <div class="ph__actions">${ownerOnly(`<button class="btn btn--ghost" id="addGuide">${icon("plus")} Guide</button><button class="btn btn--ghost" id="addScript">${icon("plus")} Script</button>`)}</div>
      </header>

      <div class="pb">
        <nav class="pb__nav card">
          <p class="pb__h">${icon("book")} Guides</p>
          ${Object.entries(group(guides)).map(([cat, xs]) => `<p class="pb__cat">${esc(cat)}</p>${xs.map((g) => `<button class="pb__item ${g.id === current ? "is-on" : ""}" data-item="${g.id}">${esc(g.title)}</button>`).join("")}`).join("")}
          <p class="pb__h">${icon("message")} Scripts</p>
          ${Object.entries(group(scripts)).map(([cat, xs]) => `<p class="pb__cat">${esc(cat)}</p>${xs.map((s) => `<button class="pb__item ${s.id === current ? "is-on" : ""}" data-item="${s.id}">${esc(s.title)}</button>`).join("")}`).join("")}
        </nav>
        <article class="pb__doc card">${!cur ? empty("Nothing here yet.") : cur.kind === "g" ? `
          <header class="pb__dh"><div><p class="ph__eyebrow">${esc(cur.category)}</p><h2>${esc(cur.title)}</h2></div>${ownerOnly(`<button class="btn btn--ghost btn--sm" data-edit>${icon("edit")} Edit</button>`)}</header>
          <div class="prose prose--doc">${md(cur.body)}</div>` : `
          <header class="pb__dh"><div><p class="ph__eyebrow">${esc(cur.category)} script</p><h2>${esc(cur.title)}</h2>${cur.note ? `<p class="muted">${esc(cur.note)}</p>` : ""}</div>
            <div class="ph__actions">${ownerOnly(`<button class="btn btn--ghost btn--sm" data-edit>${icon("edit")} Edit</button>`)}<button class="btn btn--primary btn--sm" data-copy>${icon("copy")} Copy</button></div></header>
          <pre class="pb__script">${esc(fillScript(cur.body, { sender: me })).replace(/\[[^\]]+\]/g, (m) => `<mark>${m}</mark>`)}</pre>
          <p class="hint">${icon("sparkles")} Highlighted parts are yours to fill in. For org messages, open the org in Outreach and its name and wording are filled in too.</p>`}
        </article>
      </div>`;

    root.querySelectorAll("[data-item]").forEach((b) => b.addEventListener("click", () => { current = b.dataset.item; this.render(root); root.querySelector(".pb__doc").scrollIntoView({ behavior: "smooth", block: "nearest" }); }));
    root.querySelector("[data-copy]")?.addEventListener("click", () => copy(fillScript(cur.body, { sender: me }), "Script copied"));
    root.querySelector("[data-edit]")?.addEventListener("click", () => editRow({ table: cur.kind === "g" ? "guides" : "scripts", row: S.data[cur.kind === "g" ? "guides" : "scripts"].find((x) => x.id === cur.id), fields: cur.kind === "g" ? GUIDE_FIELDS : SCRIPT_FIELDS, title: cur.title }));
    root.querySelector("#addGuide")?.addEventListener("click", () => editRow({ table: "guides", fields: GUIDE_FIELDS, title: "New guide", defaults: { category: "Guide", sort: guides.length } }));
    root.querySelector("#addScript")?.addEventListener("click", () => editRow({ table: "scripts", fields: SCRIPT_FIELDS, title: "New script", defaults: { category: "Outreach", sort: scripts.length } }));
  },
};
