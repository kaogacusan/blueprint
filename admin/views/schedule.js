/* Schedule: a month calendar of everything with a date, the four sessions,
   and the deadline matrix that fills itself in from the session dates. */
import { S, setting, opsDeadlines, update, people, agenda, focusName } from "/admin/store.js";
import { esc, icon, avatar, avatars, fmtDate, fmtTime, todayISO, addDays, daysBetween, toast, ics, download } from "/admin/lib.js";
import { dueChip, editRow, empty, ownerOnly } from "/admin/ui.js";

const SESSION_FIELDS = [
  { key: "title", label: "Title", full: true },
  { key: "date", label: "Date", type: "date", help: "Every deadline fills in from this." },
  { key: "start_time", label: "Starts", type: "time" },
  { key: "end_time", label: "Ends", type: "time" },
  { key: "venue", label: "Venue / room" },
  { key: "venue_status", label: "Venue status", type: "select", options: ["Not requested", "Requested", "Confirmed"] },
  { key: "notes", label: "Notes", type: "textarea", rows: 3 },
];
const MILESTONE_FIELDS = [
  { key: "title", label: "What", full: true, autofocus: true },
  { key: "on_date", label: "Date", type: "date" },
  { key: "at_time", label: "Time", type: "time", help: "Optional" },
  { key: "who", label: "Who", type: "people" },
  { key: "notes", label: "Notes", type: "textarea", rows: 3 },
  { key: "done", label: "Done", type: "toggle", text: "This has happened" },
];
const KIND = { task: "Task", milestone: "Key date", ops: "Prep", session: "Session" };
const cal = { month: "", sel: "", person: null };
const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthName = (ym) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
const shiftMonth = (ym, n) => { const d = new Date(`${ym}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 7); };
const dow = (iso) => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0

export default {
  id: "schedule", title: "Schedule", icon: "calendar",
  render(root) {
    const today = todayISO();
    cal.month ||= today.slice(0, 7);
    cal.sel ||= today;
    if (cal.person === null) cal.person = focusName();
    const ops = setting("ops");
    const rules = ops.rules || [];
    const sessions = S.data.sessions || [];
    const items = agenda({ person: cal.person, includeDone: true });
    const on = (d) => items.filter((x) => x.date === d);
    const ms = [...(S.data.milestones || [])].sort((a, b) => (a.on_date + (a.at_time || "")).localeCompare(b.on_date + (b.at_time || "")));

    // month grid, Monday first, always whole weeks
    const first = `${cal.month}-01`;
    const start = addDays(first, -dow(first));
    const lastDay = addDays(shiftMonth(cal.month, 1) + "-01", -1);
    const end = addDays(lastDay, 6 - dow(lastDay));
    const cells = [];
    for (let d = start; d <= end; d = addDays(d, 1)) cells.push(d);

    const selItems = on(cal.sel);
    const after = items.filter((x) => x.date > cal.sel && !x.done).slice(0, 6);

    const locked = sessions.filter((s) => s.date).length;
    root.innerHTML = `
      <header class="ph">
        <div>
          <h1 class="ph__title">Schedule</h1>
          <p class="ph__sub">Click a day to see what’s on it.${S.owner ? " Set a session’s date and its prep deadlines fill in on their own." : ""}</p>
        </div>
        <div class="ph__actions">
          <label class="viewas" title="Show one person’s dates">${icon("users")}<select id="who"><option value="">Everyone</option>${people().map((p) => `<option ${cal.person === p.name ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
          <button class="btn btn--ghost" id="toCal">${icon("calplus")} Add to calendar</button>
          ${ownerOnly(`<button class="btn btn--primary" id="addMs">${icon("plus")} Key date</button>`)}
        </div>
      </header>

      <section class="sessions">${sessions.map((s, i) => {
        const d = s.date ? daysBetween(today, s.date) : null;
        return `<article class="card sess in ${s.date ? "" : "is-tbd"}" style="--i:${i}" ${s.date ? `data-day="${s.date}"` : ""}>
          <span class="sess__n">S${s.n}</span>
          <div class="sess__b">
            <b>${esc(s.title)}</b>
            <span>${s.date ? `${esc(fmtDate(s.date))}${s.start_time ? ` · ${esc(fmtTime(s.start_time))}` : ""}${d > 0 ? ` · in ${d} days` : d === 0 ? " · today" : ""}` : "Date to be decided"}</span>
            <span class="muted">${esc(s.venue || "Room to be decided")}${s.venue ? ` · ${esc(s.venue_status)}` : ""}</span>
          </div>
          ${ownerOnly(`<button class="iconbtn sess__edit" data-edit-session="${s.n}" title="Edit session">${icon("edit")}</button>`)}
        </article>`;
      }).join("")}</section>

      <section class="calwrap">
        <article class="card cal">
          <header class="ch">
            <h3>${esc(monthName(cal.month))}</h3>
            <div class="seg">
              <button data-month="-1" title="Previous month" aria-label="Previous month">${icon("left")}</button>
              <button data-month="0">Today</button>
              <button data-month="1" title="Next month" aria-label="Next month">${icon("right")}</button>
            </div>
          </header>
          <div class="cal__grid">
            ${WD.map((w) => `<span class="cal__wd">${w}</span>`).join("")}
            ${cells.map((d) => {
              const xs = on(d), open = xs.filter((x) => !x.done);
              return `<button class="cal__d ${d.slice(0, 7) !== cal.month ? "is-out" : ""} ${d === today ? "is-today" : ""} ${d === cal.sel ? "is-sel" : ""} ${d < today ? "is-past" : ""}" data-day="${d}">
                <span class="cal__n">${Number(d.slice(8))}</span>
                ${xs.slice(0, 2).map((x) => `<span class="cal__it cal__it--${x.kind} ${x.done ? "is-done" : ""}">${esc(x.title)}</span>`).join("")}
                ${xs.length > 2 ? `<span class="cal__more">+${xs.length - 2} more</span>` : ""}
                ${open.length ? `<i class="cal__dot" aria-hidden="true"></i>` : ""}
              </button>`;
            }).join("")}
          </div>
          <p class="legend">${Object.entries(KIND).map(([k, l]) => `<span><i class="cal__it--${k}"></i>${l}</span>`).join("")}</p>
        </article>

        <aside class="card day">
          <header class="ch"><h3>${cal.sel === today ? "Today" : esc(fmtDate(cal.sel))}</h3><span class="count">${selItems.length}</span></header>
          ${selItems.length ? `<ul class="dlist">${selItems.map((x, i) => item(x, i)).join("")}</ul>` : empty("Nothing on this day.", "calendar")}
          ${after.length ? `<p class="day__h">Coming up after</p><ul class="dlist dlist--soft">${after.map((x, i) => item(x, i + selItems.length, true)).join("")}</ul>` : ""}
        </aside>
      </section>

      <section class="card">
        <header class="ch ch--pad"><h3>${icon("flag")} Key dates <span class="count">${ms.length}</span></h3></header>
        ${ms.length ? `<ul class="kd">${ms.map((m, i) => `
          <li class="in ${m.done ? "is-done" : ""} ${m.on_date < today && !m.done ? "is-late" : ""}" style="--i:${i}">
            ${S.owner ? `<button class="tick ${m.done ? "is-on" : ""}" data-done="${m.id}" title="${m.done ? "Mark not done" : "Mark done"}">${icon("check")}</button>` : `<span class="tick tick--ro ${m.done ? "is-on" : ""}">${icon("check")}</span>`}
            <span class="kd__when">${esc(fmtDate(m.on_date))}${m.at_time ? `<small>${esc(fmtTime(m.at_time))}</small>` : ""}</span>
            <span class="kd__t"><b>${esc(m.title)}</b>${m.notes ? `<small>${esc(m.notes)}</small>` : ""}</span>
            ${m.who.includes("All") ? `<span class="tag">Everyone</span>` : avatars(m.who, "xs")}
            ${ownerOnly(`<button class="iconbtn" data-edit-ms="${m.id}" title="Edit">${icon("edit")}</button>`)}
          </li>`).join("")}</ul>` : empty("No key dates yet.", "flag")}
      </section>

      ${rules.length ? `<details class="card fold">
        <summary class="ch ch--pad"><h3>${icon("clock")} Prep deadlines for each session</h3><span class="muted">${locked ? `${locked} of 4 dates set` : "Fills in once session dates are set"}</span>${icon("down", "fold__chev")}</summary>
        <div class="tablewrap"><table class="table">
          <thead><tr><th>What</th><th>Who</th>${sessions.map((s) => `<th>Session ${s.n}</th>`).join("")}</tr></thead>
          <tbody>${rules.map((r) => `<tr>
            <td><b>${esc(r.label)}</b><small>${r.days} ${r.workdays ? "working days" : "days"} before</small></td>
            <td class="nowrap"><span class="who">${avatar(r.owner, "xs")}${esc(r.owner)}</span></td>
            ${sessions.map((s) => { const d = opsDeadlines(s).find((x) => x.key === r.key); return `<td>${d ? dueChip(d.date) : `<span class="muted">—</span>`}</td>`; }).join("")}
          </tr>`).join("")}</tbody>
        </table></div>
      </details>` : ""}

      <details class="card fold">
        <summary class="ch ch--pad"><h3>${icon("pin")} What the venue needs</h3>${icon("down", "fold__chev")}</summary>
        <div class="fold__cols">
          <div><p class="fold__k">The room needs</p><ul class="checks">${(ops.checklist || []).map((c) => `<li>${icon("check")}<span>${esc(c)}</span></li>`).join("")}</ul></div>
          <div><p class="fold__k">Why the deadlines fall where they do</p><ul class="bullets">${(ops.why || []).map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>
        </div>
      </details>`;

    const rerender = () => this.render(root);
    root.querySelectorAll("[data-day]").forEach((b) => b.addEventListener("click", () => { cal.sel = b.dataset.day; cal.month = cal.sel.slice(0, 7); rerender(); }));
    root.querySelectorAll("[data-month]").forEach((b) => b.addEventListener("click", () => {
      const n = Number(b.dataset.month);
      cal.month = n ? shiftMonth(cal.month, n) : today.slice(0, 7);
      if (!n) cal.sel = today;
      rerender();
    }));
    root.querySelector("#who").addEventListener("change", (e) => { cal.person = e.target.value; rerender(); });
    root.querySelector("#toCal").addEventListener("click", () => {
      const xs = agenda({ person: cal.person, from: today });
      if (!xs.length) return toast("Nothing upcoming to add.");
      download(`blueprint-schedule${cal.person ? "-" + cal.person.toLowerCase() : ""}.ics`, ics(xs.map((x) => ({ date: x.date, time: x.time, title: `Blueprint: ${x.title}`, notes: x.who.join(", ") }))), "text/calendar");
      toast(`${xs.length} dates saved. Open the file to add them.`);
    });
    root.querySelectorAll("[data-edit-session]").forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const s = sessions.find((x) => x.n === Number(b.dataset.editSession));
      editRow({ table: "sessions", row: s, fields: SESSION_FIELDS, title: `Session ${s.n}` });
    }));
    root.querySelector("#addMs")?.addEventListener("click", () => editRow({ table: "milestones", fields: MILESTONE_FIELDS, title: "Key date", defaults: { who: [], done: false, on_date: cal.sel } }));
    root.querySelectorAll("[data-edit-ms]").forEach((b) => b.addEventListener("click", () => editRow({ table: "milestones", row: ms.find((m) => m.id === b.dataset.editMs), fields: MILESTONE_FIELDS, title: "Key date" })));
    root.querySelectorAll("[data-done]").forEach((b) => b.addEventListener("click", async () => {
      const m = ms.find((x) => x.id === b.dataset.done);
      try { await update("milestones", m.id, { done: !m.done }); toast(m.done ? "Marked not done" : "Marked done"); } catch { toast("Couldn’t save.", "bad"); }
    }));
  },
};

function item(x, i, soft = false) {
  return `<li class="dl dl--${x.kind} in ${x.done ? "is-done" : ""}" style="--i:${i}" ${x.kind === "task" ? `data-task="${x.ref.id}" role="button" tabindex="0"` : ""}>
    <span class="dl__time">${soft ? esc(fmtDate(x.date, { weekday: undefined })) : x.time ? esc(fmtTime(x.time)) : "All day"}</span>
    <span class="dl__b"><b>${esc(x.title)}</b><small>${KIND[x.kind]}${x.notes ? ` · ${esc(x.notes)}` : ""}</small></span>
    ${x.who.includes("All") ? `<span class="tag">All</span>` : avatars(x.who, "xs")}
  </li>`;
}
