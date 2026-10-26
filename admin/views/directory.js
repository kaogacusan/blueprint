/* Directory: the right folders, files and people, in one place. */
import { S } from "/admin/store.js";
import { esc, icon, linkKind, copy } from "/admin/lib.js";
import { editRow, empty, ownerOnly, trackName } from "/admin/ui.js";

let q = "";
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
const group = (rows, key = "category") => rows.reduce((m, r) => ((m[r[key]] ||= []).push(r), m), {});
const match = (...xs) => !q || xs.join(" ").toLowerCase().includes(q.toLowerCase());

export default {
  id: "directory", title: "Directory", icon: "folder",
  render(root) {
    const res = (S.data.resources || []).filter((r) => match(r.label, r.note, r.category, r.url));
    const contacts = (S.data.contacts || []).filter((c) => match(c.name, c.org, c.note, c.email, c.category));
    // every file linked from a task, so nothing gets lost in a doc
    const known = new Set((S.data.resources || []).map((r) => r.url));
    const fromTasks = {};
    for (const t of S.data.tasks || []) {
      for (const l of [...(t.links || []), ...(t.outputs || [])]) {
        if (known.has(l.url) || !match(t.title, l.label, l.url)) continue;
        (fromTasks[trackName(t.session)] ||= []).push({ ...l, task: t });
      }
    }

    root.innerHTML = `
      <header class="ph">
        <div>
          <p class="ph__eyebrow">Links & people</p>
          <h1 class="ph__title">Directory</h1>
          <p class="ph__sub">The right folder, the right file, the right person to ask.</p>
        </div>
        <div class="ph__actions">${ownerOnly(`<button class="btn btn--ghost" id="addRes">${icon("plus")} Link</button><button class="btn btn--ghost" id="addContact">${icon("plus")} Contact</button>`)}</div>
      </header>

      <div class="filters card"><label class="search">${icon("search")}<input id="q" placeholder="Search links, files and contacts" value="${esc(q)}" /></label></div>

      ${Object.entries(group(res)).map(([cat, xs], gi) => `
        <section class="dir stagger" style="--i:${gi}">
          <h3 class="group__h">${esc(cat)} <span>${xs.length}</span></h3>
          <div class="tiles">${xs.map((r) => { const [ic, kind] = linkKind(r.url); return `
            <div class="tile card">
              <a href="${esc(r.url)}" target="_blank" rel="noopener" class="tile__a">
                <span class="tile__ic ic--${ic}">${icon(ic)}</span>
                <span class="tile__b"><b>${esc(r.label)}</b><small>${esc(r.note || kind)}</small></span>
                ${icon("arrow", "tile__go")}
              </a>
              ${ownerOnly(`<button class="iconbtn tile__edit" data-res="${r.id}" title="Edit">${icon("edit")}</button>`)}
            </div>`; }).join("")}</div>
        </section>`).join("")}

      <section class="dir">
        <h3 class="group__h">Contacts <span>${contacts.length}</span></h3>
        <div class="contacts">${Object.entries(group(contacts)).map(([cat, xs]) => `
          <div class="card pad cgroup"><p class="cgroup__h">${esc(cat)}</p>${xs.map((c) => `
            <div class="contact">
              <div class="contact__b"><b>${esc(c.name)}</b><small>${esc(c.org)}</small>${c.note ? `<p>${esc(c.note)}</p>` : ""}</div>
              <div class="contact__act">
                ${c.email ? `<a class="btn btn--ghost btn--xs" href="mailto:${esc(c.email)}">${icon("mail")} ${esc(c.email)}</a><button class="iconbtn" data-copy="${esc(c.email)}" title="Copy email">${icon("copy")}</button>` : ""}
                ${c.phone ? `<span class="tag">${icon("phone")} ${esc(c.phone)}</span>` : ""}
                ${ownerOnly(`<button class="iconbtn" data-contact="${c.id}" title="Edit">${icon("edit")}</button>`)}
              </div>
            </div>`).join("")}</div>`).join("") || empty("No contacts match.")}</div>
      </section>

      <section class="dir">
        <h3 class="group__h">Files from tasks <span class="muted">collected automatically</span></h3>
        ${Object.keys(fromTasks).length ? `<div class="card pad ftasks">${Object.entries(fromTasks).map(([track, xs]) => `
          <div class="ftasks__g"><p class="cgroup__h">${esc(track)}</p>${xs.map((l) => { const [ic, kind] = linkKind(l.url); return `
            <a class="ftask" href="${esc(l.url)}" target="_blank" rel="noopener">${icon(ic)}<span><b>${esc(l.label && l.label !== kind ? l.label : kind)}</b><small>${esc(l.task.title)} · ${esc(l.task.owners.join(", "))}</small></span>${icon("external", "ftask__go")}</a>`; }).join("")}</div>`).join("")}</div>` : empty("No other files.")}
      </section>`;

    const input = root.querySelector("#q");
    input.addEventListener("input", () => { q = input.value; clearTimeout(input._t); input._t = setTimeout(() => { this.render(root); const n = root.querySelector("#q"); n.focus(); n.setSelectionRange(q.length, q.length); }, 180); });
    root.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => copy(b.dataset.copy, "Email copied")));
    root.querySelectorAll("[data-res]").forEach((b) => b.addEventListener("click", () => editRow({ table: "resources", row: S.data.resources.find((r) => r.id === b.dataset.res), fields: RES_FIELDS, title: "Link" })));
    root.querySelectorAll("[data-contact]").forEach((b) => b.addEventListener("click", () => editRow({ table: "contacts", row: S.data.contacts.find((r) => r.id === b.dataset.contact), fields: CONTACT_FIELDS, title: "Contact" })));
    root.querySelector("#addRes")?.addEventListener("click", () => editRow({ table: "resources", fields: RES_FIELDS, title: "Add a link", defaults: { category: "Start here", sort: (S.data.resources || []).length } }));
    root.querySelector("#addContact")?.addEventListener("click", () => editRow({ table: "contacts", fields: CONTACT_FIELDS, title: "Add a contact", defaults: { category: "General", sort: (S.data.contacts || []).length } }));
  },
};
