/* Tasks: the project log, with filters and a list or board layout. */
import { S, people, isDone, isLate } from "/admin/store.js";
import { esc, icon, avatar, todayISO, addDays } from "/admin/lib.js";
import { taskRow, editTask, empty, TASK_STATUS, TRACKS, statusPill, ownerOnly } from "/admin/ui.js";
import { openImport } from "/admin/import.js";

export const taskFilter = { q: "", person: "", track: "all", status: "open", layout: "list" };

export default {
  id: "tasks", title: "Tasks", icon: "tasks",
  badge: () => (S.data.tasks || []).filter(isLate).length || "",
  render(root, params = {}) {
    if (params.person !== undefined) taskFilter.person = params.person;
    const f = taskFilter;
    const all = S.data.tasks || [];
    const list = all.filter((t) =>
      (!f.person || t.owners.includes(f.person)) &&
      (f.track === "all" || t.session === f.track) &&
      (f.status === "all" || (f.status === "open" ? !isDone(t) : t.status === f.status)) &&
      (!f.q || `${t.title} ${t.notes} ${t.owners.join(" ")}`.toLowerCase().includes(f.q.toLowerCase())));
    const scope = all.filter((t) => (!f.person || t.owners.includes(f.person)) && (f.track === "all" || t.session === f.track));
    const pct = scope.length ? Math.round((scope.filter(isDone).length / scope.length) * 100) : 0;
    const byDue = (a, b) => (a.due || "9999").localeCompare(b.due || "9999") || a.sort - b.sort;

    const today = todayISO(), wk = addDays(today, 7);
    const groups = [
      ["Late", list.filter(isLate)],
      ["This week", list.filter((t) => !isDone(t) && t.due && t.due >= today && t.due <= wk)],
      ["Later", list.filter((t) => !isDone(t) && t.due && t.due > wk)],
      ["No date yet", list.filter((t) => !isDone(t) && !t.due)],
      ["Done", list.filter(isDone)],
    ].map(([name, xs]) => [name, xs.sort(byDue)]).filter(([, xs]) => xs.length);

    root.innerHTML = `
      <header class="ph">
        <div>
          <p class="ph__eyebrow">Project log</p>
          <h1 class="ph__title">Tasks</h1>
          <p class="ph__sub">Who’s doing what, by when, with the right files attached.</p>
        </div>
        <div class="ph__actions">
          ${ownerOnly(`<button class="btn btn--ghost" id="import">${icon("upload")} Import from Excel</button><button class="btn btn--primary" id="newTask">${icon("plus")} New task</button>`)}
        </div>
      </header>

      <div class="filters card">
        <label class="search">${icon("search")}<input id="q" placeholder="Search tasks" value="${esc(f.q)}" /></label>
        <div class="people-filter">
          <button class="pf ${!f.person ? "is-on" : ""}" data-person="">Everyone</button>
          ${people().map((p) => `<button class="pf ${f.person === p.name ? "is-on" : ""}" data-person="${esc(p.name)}">${avatar(p.name, "xs")}${esc(p.name)}</button>`).join("")}
        </div>
        <div class="frow">
          <div class="seg" id="track">
            <button class="${f.track === "all" ? "is-on" : ""}" data-v="all">All</button>
            ${TRACKS.map(([k, label]) => `<button class="${f.track === k ? "is-on" : ""}" data-v="${k}" title="${esc(label)}">${k || "General"}</button>`).join("")}
          </div>
          <select class="select" id="status">
            <option value="open" ${f.status === "open" ? "selected" : ""}>Open tasks</option>
            <option value="all" ${f.status === "all" ? "selected" : ""}>Everything</option>
            ${TASK_STATUS.map((s) => `<option ${f.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
          <span class="grow"></span>
          <div class="progress-mini" title="${pct}% done">${pct}% done <i style="--w:${pct}%"></i></div>
          <div class="seg seg--icons" id="layout">
            <button class="${f.layout === "list" ? "is-on" : ""}" data-v="list" title="List">${icon("list")}</button>
            <button class="${f.layout === "board" ? "is-on" : ""}" data-v="board" title="Board">${icon("board")}</button>
          </div>
        </div>
      </div>

      ${!list.length ? empty("No tasks match these filters.", "search") : f.layout === "list" ? `
        <div class="groups">${groups.map(([name, xs], gi) => `
          <section class="group stagger ${name === "Done" ? "group--done" : ""} ${name === "Late" ? "group--late" : ""}" style="--i:${gi}">
            <h3 class="group__h">${esc(name)} <span>${xs.length}</span></h3>
            <div class="tlist card">${xs.map(taskRow).join("")}</div>
          </section>`).join("")}</div>` : `
        <div class="board">${TASK_STATUS.map((s, i) => {
          const xs = list.filter((t) => t.status === s).sort(byDue);
          return `<section class="col stagger" style="--i:${i}"><h3 class="col__h">${statusPill(s)}<span>${xs.length}</span></h3><div class="col__body">${xs.map(taskRow).join("") || `<p class="col__empty">None</p>`}</div></section>`;
        }).join("")}</div>`}`;

    const rerender = () => this.render(root);
    const q = root.querySelector("#q");
    q.addEventListener("input", () => { f.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => { rerender(); root.querySelector("#q").focus(); root.querySelector("#q").setSelectionRange(f.q.length, f.q.length); }, 180); });
    root.querySelectorAll("[data-person]").forEach((b) => b.addEventListener("click", () => { f.person = b.dataset.person; rerender(); }));
    root.querySelectorAll("#track [data-v]").forEach((b) => b.addEventListener("click", () => { f.track = b.dataset.v; rerender(); }));
    root.querySelectorAll("#layout [data-v]").forEach((b) => b.addEventListener("click", () => { f.layout = b.dataset.v; rerender(); }));
    root.querySelector("#status").addEventListener("change", (e) => { f.status = e.target.value; rerender(); });
    root.querySelector("#newTask")?.addEventListener("click", () => editTask(null, { owners: f.person ? [f.person] : [], session: f.track !== "all" ? f.track : "" }));
    root.querySelector("#import")?.addEventListener("click", openImport);
  },
};
