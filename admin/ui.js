/* UI pieces used on several pages: pills, due chips, task rows, the task panel. */
import { S, update, create, remove, names, isDone, isLate } from "/admin/store.js";
import { esc, icon, avatars, rel, fmtWhen, fmtDate, richText, linkKind, openDrawer, closeDrawer, formFields, readForm, wireForm, toast, confirmBox } from "/admin/lib.js";

export const TASK_STATUS = ["Not Started", "In Progress", "Blocked", "Completed"];
export const PRIORITY = ["Critical", "High", "Medium", "Low"];
export const TRACKS = [["", "General"], ["S1", "Session 1"], ["S2", "Session 2"], ["S3", "Session 3"], ["S4", "Session 4"], ["Report", "Business Prep Report"]];
export const trackName = (t) => (TRACKS.find(([k]) => k === t) || [, t || "General"])[1];
const slug = (s) => String(s).toLowerCase().replace(/[^a-z]+/g, "-");

export const statusPill = (s) => `<span class="pill pill--${slug(s)}"><i></i>${esc(s)}</span>`;
export const prioTag = (p) => `<span class="prio prio--${slug(p)}" title="${esc(p)} priority">${esc(p)}</span>`;
export const trackTag = (t) => (t ? `<span class="tag tag--${slug(t)}">${esc(t === "Report" ? "Report" : t)}</span>` : "");
export function dueChip(iso, time, done = false) {
  if (done) return `<span class="due due--done">${icon("check")}Done</span>`;
  if (!iso) return `<span class="due due--none">No date</span>`;
  const r = rel(iso);
  return `<span class="due due--${r.tone}" title="${esc(fmtWhen(iso, time))}">${icon(r.tone === "late" ? "alert" : "clock")}${esc(r.label)}${time && ["today", "soon"].includes(r.tone) ? ` · ${esc(fmtWhen("", time).replace(/^ · /, ""))}` : ""}</span>`;
}
export const linkBtn = (l) => {
  const [ic, kind] = linkKind(l.url);
  return `<a class="linkbtn" href="${esc(l.url)}" target="_blank" rel="noopener">${icon(ic)}<span><b>${esc(l.label || kind)}</b><small>${esc(kind)}</small></span>${icon("external", "linkbtn__go")}</a>`;
};
export const empty = (msg, ic = "sparkles") => `<div class="empty">${icon(ic)}<p>${esc(msg)}</p></div>`;
export const ownerOnly = (html) => (S.owner ? html : "");

/* one task as a row */
export function taskRow(t) {
  const n = (t.links?.length || 0) + (t.outputs?.length || 0);
  return `<button class="trow ${isDone(t) ? "is-done" : ""} ${isLate(t) ? "is-late" : ""}" data-task="${t.id}">
    <span class="trow__st st--${slug(t.status)}" title="${esc(t.status)}"></span>
    <span class="trow__main"><b>${esc(t.title)}</b><span class="trow__meta">${trackTag(t.session)}${t.priority === "Critical" || t.priority === "High" ? prioTag(t.priority) : ""}${n ? `<span class="trow__links">${icon("link")}${n}</span>` : ""}</span></span>
    ${avatars(t.owners, "sm")}
    ${dueChip(t.due, t.due_time, isDone(t))}
  </button>`;
}

/* ---------- task panel: everyone can read it; the owner can edit ---------- */
const TASK_FIELDS = () => [
  { key: "title", label: "Task", full: true, autofocus: true },
  { key: "session", label: "Track", type: "select", options: TRACKS },
  { key: "status", label: "Status", type: "select", options: TASK_STATUS },
  { key: "priority", label: "Priority", type: "select", options: PRIORITY },
  { key: "assigned_on", label: "Assigned", type: "date" },
  { key: "due", label: "Due date", type: "date" },
  { key: "due_time", label: "Due time", type: "time", help: "Optional" },
  { key: "owners", label: "Who", type: "people" },
  { key: "notes", label: "Notes", type: "textarea", rows: 8, help: "Lines starting with “- ” become bullets. Links work." },
  { key: "links", label: "Files / links", type: "links" },
  { key: "outputs", label: "Final output", type: "links" },
];

export function openTask(id) {
  const t = S.data.tasks.find((x) => x.id === id);
  if (!t) return;
  openDrawer({
    eyebrow: `${trackName(t.session)}${t.source !== "manual" ? ` · from ${esc(t.source)}` : ""}`,
    title: esc(t.title),
    body: `
      ${S.owner ? `<div class="seg seg--status" role="group" aria-label="Status">${TASK_STATUS.map((s) => `<button class="${s === t.status ? "is-on" : ""}" data-status="${s}">${statusPill(s)}</button>`).join("")}</div>` : `<div class="dmeta">${statusPill(t.status)}</div>`}
      <dl class="facts">
        <div><dt>Who</dt><dd>${t.owners.length ? t.owners.map((o) => `<span class="who">${avatars([o], "sm")}${esc(o)}</span>`).join("") : "—"}</dd></div>
        <div><dt>Due</dt><dd>${t.due ? `${esc(fmtWhen(t.due, t.due_time))} ${dueChip(t.due, t.due_time, isDone(t))}` : "No date yet"}</dd></div>
        <div><dt>Priority</dt><dd>${prioTag(t.priority)}</dd></div>
        ${t.assigned_on ? `<div><dt>Assigned</dt><dd>${esc(fmtDate(t.assigned_on))}</dd></div>` : ""}
      </dl>
      ${t.notes ? `<section class="dsec"><h4>Notes</h4><div class="prose">${richText(t.notes)}</div></section>` : ""}
      ${t.links?.length ? `<section class="dsec"><h4>Files & links</h4><div class="linkbtns">${t.links.map(linkBtn).join("")}</div></section>` : ""}
      ${t.outputs?.length ? `<section class="dsec"><h4>Final output</h4><div class="linkbtns">${t.outputs.map(linkBtn).join("")}</div></section>` : ""}
      ${!S.owner ? `<p class="hint">${icon("lock")} View only. Ask Keira if something here needs to change.</p>` : ""}`,
    actions: S.owner ? `<button class="btn btn--ghost btn--danger-text" data-del>${icon("trash")} Delete</button><span class="grow"></span><button class="btn btn--primary" data-edit>${icon("edit")} Edit</button>` : "",
    onMount(root) {
      root.querySelectorAll("[data-status]").forEach((b) => b.addEventListener("click", async () => {
        try { await update("tasks", t.id, { status: b.dataset.status }); toast(`Marked ${b.dataset.status}`); openTask(t.id); }
        catch { toast("Couldn’t save.", "bad"); }
      }));
      root.querySelector("[data-edit]")?.addEventListener("click", () => editTask(t));
      root.querySelector("[data-del]")?.addEventListener("click", async () => {
        if (!(await confirmBox(`Delete “${t.title}”?`))) return;
        await remove("tasks", t.id); closeDrawer(); toast("Task deleted");
      });
    },
  });
}

export function editTask(t = null, preset = {}) {
  const fields = TASK_FIELDS();
  const v = t || { status: "Not Started", priority: "Medium", owners: [], links: [], outputs: [], ...preset };
  openDrawer({
    eyebrow: t ? "Edit task" : "New task",
    title: t ? esc(t.title) : "Add a task",
    body: formFields(fields, v, names()),
    actions: `<button class="btn btn--ghost" data-cancel>Cancel</button><span class="grow"></span><button class="btn btn--primary" data-save>${icon("check")} Save</button>`,
    onMount(root) {
      wireForm(root);
      root.querySelector("[data-cancel]").addEventListener("click", () => (t ? openTask(t.id) : closeDrawer()));
      root.querySelector("[data-save]").addEventListener("click", async () => {
        const vals = readForm(fields, root);
        if (!vals.title) return toast("Give the task a name.", "bad");
        try {
          const saved = t ? await update("tasks", t.id, vals) : await create("tasks", { ...vals, sort: Date.now() % 1e9 });
          toast(t ? "Saved" : "Task added");
          openTask(saved.id);
        } catch (e) { console.error(e); toast("Couldn’t save.", "bad"); }
      });
    },
  });
}

/* generic edit panel for simple rows (links, contacts, key dates, …) */
export function editRow({ table, row = null, fields, title, defaults = {}, after, transform = (v) => v }) {
  const v = row || defaults;
  openDrawer({
    eyebrow: row ? "Edit" : "Add",
    title: esc(title),
    body: formFields(fields, v, names()),
    actions: `${row ? `<button class="btn btn--ghost btn--danger-text" data-del>${icon("trash")} Delete</button>` : ""}<span class="grow"></span><button class="btn btn--ghost" data-cancel>Cancel</button><button class="btn btn--primary" data-save>${icon("check")} Save</button>`,
    onMount(root) {
      wireForm(root);
      root.querySelector("[data-cancel]").addEventListener("click", closeDrawer);
      root.querySelector("[data-save]").addEventListener("click", async () => {
        const vals = transform(readForm(fields, root));
        try {
          const pkv = table === "sessions" ? row.n : row?.id;
          row ? await update(table, pkv, vals) : await create(table, { ...defaults, ...vals });
          closeDrawer(); toast("Saved"); after?.();
        } catch (e) { console.error(e); toast(/duplicate|unique/i.test(e.message) ? "That’s already in the list." : /violates|invalid/i.test(e.message) ? "Check the fields and try again." : "Couldn’t save.", "bad"); }
      });
      root.querySelector("[data-del]")?.addEventListener("click", async () => {
        if (!(await confirmBox("Delete this? It can’t be undone."))) return;
        try { await remove(table, row.id); closeDrawer(); toast("Deleted"); after?.(); }
        catch { toast("Couldn’t delete.", "bad"); }
      });
    },
  });
}
