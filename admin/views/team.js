/* Team: names, role labels, and who can sign in. Roles are labels only — the owner is the only one who can change things. */
import { S, people, tasksFor, isDone, isLate, update, setting, saveSetting } from "/admin/store.js";
import { esc, icon, avatar, toast } from "/admin/lib.js";
import { editRow, ownerOnly } from "/admin/ui.js";
import { go } from "/admin/app.js";

const FIELDS = (p) => [
  { key: "name", label: "Name", autofocus: true, help: "The name used on tasks." },
  { key: "role_title", label: "Role", help: "Just a label. It doesn’t change what they can do." },
  ...(p?.access === "owner" ? [] : [{ key: "email", label: "Login email", type: "email", help: "Add an email to let them sign in and view the workspace." }]),
  { key: "aliases", label: "Also called", type: "tags", help: "Other names they go by in docs, e.g. Lorenz. Imports use these to match tasks." },
  { key: "sort", label: "Order", type: "number" },
];

export default {
  id: "team", title: "Team", icon: "users",
  render(root) {
    const team = people();
    root.innerHTML = `
      <header class="ph">
        <h1 class="ph__title">Team</h1>
        <div class="ph__actions">${ownerOnly(`<button class="btn btn--primary" id="add">${icon("plus")} Add person</button>`)}</div>
      </header>

      <div class="panel tablewrap"><table class="table teamt">
        <thead><tr><th>Person</th><th>Role</th><th>Access</th>${S.owner ? "<th>Login email</th>" : ""}<th class="r">Open</th><th class="r">Late</th><th></th></tr></thead>
        <tbody>${team.map((p, i) => {
          const ts = tasksFor(p.name), open = ts.filter((t) => !isDone(t)).length, late = ts.filter(isLate).length;
          return `<tr class="in is-click" style="--i:${i}" data-tasks="${esc(p.name)}">
            <td><span class="who">${avatar(p.name, "md")}<span><b>${esc(p.name)}</b>${(p.aliases || []).length ? `<small>aka ${esc(p.aliases.join(", "))}</small>` : ""}</span></span></td>
            <td class="muted">${esc(p.role_title || "—")}</td>
            <td><span class="access ${p.access === "owner" ? "access--owner" : p.email ? "" : "access--none"}">${p.access === "owner" ? "Owner" : p.email ? "Can view" : "No login"}</span></td>
            ${S.owner ? `<td class="mono muted">${esc(p.email || "—")}</td>` : ""}
            <td class="r mono"><b>${open}</b></td>
            <td class="r mono ${late ? "bad" : "muted"}"><b>${late}</b></td>
            <td class="r">${ownerOnly(`<button class="iconbtn" data-edit="${p.id}" title="Edit">${icon("edit")}</button>`)}</td>
          </tr>`;
        }).join("")}</tbody>
      </table></div>

      ${S.owner ? `<p class="footnote">To give someone access, add their email here. They open <b>${esc(location.origin)}/admin</b> and press “Create your account.”</p>` : ""}`;

    root.querySelectorAll("[data-tasks]").forEach((b) => b.addEventListener("click", () => go("tasks", { person: b.dataset.tasks })));
    root.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const p = team.find((x) => x.id === b.dataset.edit);
      let renamed = "";
      editRow({
        table: "team", row: p, fields: FIELDS(p), title: p.name,
        transform: (v) => {
          const out = p.access === "owner" ? v : cleanTeam(v);
          if (out.name && out.name !== p.name) {
            renamed = out.name;
            if (!out.aliases.includes(p.name)) out.aliases = [...out.aliases, p.name]; // old name still matches in imports
          }
          return out;
        },
        after: () => renamed && renameEverywhere(p.name, renamed),
      });
    }));
    root.querySelector("#add")?.addEventListener("click", () => editRow({ table: "team", fields: FIELDS(), title: "Add a person", defaults: { sort: team.length, aliases: [] }, transform: cleanTeam }));
  },
};

/* team rows store emails in lowercase; empty email = no login */
export const cleanTeam = (v) => ({ ...v, email: v.email ? v.email.toLowerCase() : null });

/* a new name follows the person onto their tasks, key dates, orgs and deadlines */
async function renameEverywhere(from, to) {
  const swap = (xs) => xs.map((x) => (x === from ? to : x));
  const jobs = [
    ...(S.data.tasks || []).filter((t) => t.owners.includes(from)).map((t) => update("tasks", t.id, { owners: swap(t.owners) })),
    ...(S.data.milestones || []).filter((m) => m.who.includes(from)).map((m) => update("milestones", m.id, { who: swap(m.who) })),
    ...(S.data.orgs || []).filter((o) => o.owner === from).map((o) => update("orgs", o.id, { owner: to })),
  ];
  const ops = structuredClone(setting("ops"));
  if ((ops.rules || []).some((r) => r.owner === from)) {
    ops.rules.forEach((r) => r.owner === from && (r.owner = to));
    jobs.push(saveSetting("ops", ops));
  }
  await Promise.allSettled(jobs);
  if (jobs.length) toast(`Renamed on ${jobs.length} item${jobs.length > 1 ? "s" : ""}`);
}
