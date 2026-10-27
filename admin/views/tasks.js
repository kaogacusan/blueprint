/* Tasks: the project log, with filters and a list or board layout. */
import { S, people, isDone, isLate } from "/admin/store.js";
import { esc, icon, todayISO, addDays } from "/admin/lib.js";
import { taskRow, editTask, empty, TASK_STATUS, TRACKS, statusPill, ownerOnly } from "/admin/ui.js";
import { openImport } from "/admin/import.js";

export const taskFilter = { q: "", person: null, track: "all", status: "open", layout: "list" };

export default {
  id: "tasks", title: "Tasks", icon: "tasks",
  badge: () => (S.data.tasks || []).filter(isLate).length || "",
  render(root, params = {}) {
    const f = taskFilter;
    if (params.person !== undefined) f.person = params.person;
    if (f.person === null) f.person = S.owner ? "" : S.me?.name || ""; // teammates start on their own tasks
    const all = S.data.tasks || [];
    const scope = all.filter((t) => (!f.person || t.owners.includes(f.person)) && (f.track === "all" || t.session === f.track));
    const list = scope.filter((t) =>
      (f.status === "all" || (f.status === "open" ? !isDone(t) : t.status === f.status)) &&
      (!f.q || `${t.title} ${t.notes} ${t.owners.join(" ")}`.toLowerCase().includes(f.q.toLowerCase())));
    const doneN = scope.filter(isDone).length;
    const byDue = (a, b) => (a.due || "9999").localeCompare(b.due || "9999") || a.sort - b.sort;

    const today = todayISO(), wk = addDays(today, 7);
    const groups = [
      ["Late", list.filter(isLate)],
      ["This week", list.filter((t) => !isDone(t) && t.due && t.due >= today && t.due <= wk)],
      ["Later", list.filter((t) => !isDone(t) && t.due && t.due > wk)],
      ["No date yet", list.filter((t) => !isDone(t) && !t.due)],
      ["Done", list.filter(isDone)],
    ].map(([name, xs]) => [name, xs.sort(byDue)]).filter(([, xs]) => xs.length);

    const lateN = scope.filter(isLate).length;
    root.innerHTML = `
      <header class="ph">
        <div>
          <h1 class="ph__title">Tasks</h1>
          <p class="ph__sub">${doneN} of ${scope.length} done${lateN ? ` · <b class="bad">${lateN} late</b>` : ""}. Click a task to see its notes and files.</p>
        </div>
        <div class="ph__actions">
          ${ownerOnly(`<button class="btn btn--ghost" id="import" title="Update tasks from Thomas’s project log (.xlsx)">${icon("upload")} Import from Excel</button><button class="btn btn--primary" id="newTask">${icon("plus")} New task</button>`)}
        </div>
      </header>

      <div class="card filters">
        <label class="search">${icon("search")}<input id="q" placeholder="Search tasks" value="${esc(f.q)}" /></label>
        <label class="pick"><span>Who</span><select id="person"><option value="">Everyone</option>${people().map((p) => `<option ${f.person === p.name ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
        <label class="pick"><span>Session</span><select id="track"><option value="all">All</option>${TRACKS.map(([k, label]) => `<option value="${k}" ${f.track === k ? "selected" : ""}>${esc(label)}</option>`).join("")}</select></label>
        <label class="pick"><span>Show</span><select id="status"><option value="open" ${f.status === "open" ? "selected" : ""}>Not done yet</option><option value="all" ${f.status === "all" ? "selected" : ""}>Everything</option>${TASK_STATUS.map((s) => `<option ${f.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
        <span class="grow"></span>
        <div class="seg" id="layout" role="group" aria-label="Layout">
          <button class="${f.layout === "list" ? "is-on" : ""}" data-v="list">${icon("list")} List</button>
          <button class="${f.layout === "board" ? "is-on" : ""}" data-v="board">${icon("board")} Board</button>
        </div>
      </div>

      <div class="results">${!list.length ? `<div class="card">${empty("No tasks match these filters.", "search")}</div>` : f.layout === "list" ? `
        <div class="groups">${groups.map(([name, xs]) => `
          <section class="group ${name === "Done" ? "group--done" : ""}">
            <h3 class="band ${name === "Late" ? "band--bad" : ""}">${esc(name)} <span>${xs.length}</span></h3>
            <div class="card tlist">${xs.map(taskRow).join("")}</div>
          </section>`).join("")}</div>` : `
        <div class="board">${TASK_STATUS.map((s) => {
          const xs = list.filter((t) => t.status === s).sort(byDue);
          return `<section class="col"><h3 class="col__h">${statusPill(s)}<span>${xs.length}</span></h3><div class="col__body">${xs.map(taskRow).join("") || `<p class="col__empty">None</p>`}</div></section>`;
        }).join("")}</div>`}</div>`;

    const rerender = () => this.render(root);
    const q = root.querySelector("#q");
    q.addEventListener("input", () => { f.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => { rerender(); const n = root.querySelector("#q"); n.focus(); n.setSelectionRange(f.q.length, f.q.length); }, 180); });
    root.querySelector("#person").addEventListener("change", (e) => { f.person = e.target.value; rerender(); });
    root.querySelector("#track").addEventListener("change", (e) => { f.track = e.target.value; rerender(); });
    root.querySelectorAll("#layout [data-v]").forEach((b) => b.addEventListener("click", () => { f.layout = b.dataset.v; rerender(); }));
    root.querySelector("#status").addEventListener("change", (e) => { f.status = e.target.value; rerender(); });
    root.querySelector("#newTask")?.addEventListener("click", () => editTask(null, { owners: f.person ? [f.person] : [], session: f.track !== "all" ? f.track : "" }));
    root.querySelector("#import")?.addEventListener("click", openImport);
  },
};
