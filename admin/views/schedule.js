/* Schedule: the four sessions, every deadline that follows from their dates, key dates, room checklist. */
import { S, setting, opsDeadlines, update, names } from "/admin/store.js";
import { esc, icon, avatar, avatars, fmtDate, fmtTime, fmtWhen, todayISO, daysBetween, toast } from "/admin/lib.js";
import { dueChip, editRow, empty, ownerOnly } from "/admin/ui.js";

const SESSION_FIELDS = [
  { key: "title", label: "Title", full: true },
  { key: "date", label: "Date", type: "date", help: "Every deadline below fills in from this." },
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

export default {
  id: "schedule", title: "Schedule", icon: "calendar",
  render(root) {
    const ops = setting("ops");
    const sessions = S.data.sessions || [];
    const today = todayISO();
    const locked = sessions.filter((s) => s.date).length;
    const ms = [...(S.data.milestones || [])].sort((a, b) => (a.on_date + (a.at_time || "")).localeCompare(b.on_date + (b.at_time || "")));

    root.innerHTML = `
      <header class="ph">
        <div>
          <p class="ph__eyebrow">Operations</p>
          <h1 class="ph__title">Schedule</h1>
          <p class="ph__sub">${locked === 4 ? "All four dates are locked. Deadlines below update themselves." : `${locked} of 4 session dates locked. Once a date is set, its venue, printing and pre-work deadlines appear on everyone’s Overview.`}</p>
        </div>
        <div class="ph__actions">${ownerOnly(`<button class="btn btn--primary" id="addMs">${icon("plus")} Key date</button>`)}</div>
      </header>

      <section class="sessions">${sessions.map((s, i) => {
        const dl = opsDeadlines(s);
        const d = s.date ? daysBetween(today, s.date) : null;
        return `<article class="card sess stagger ${s.date ? "" : "is-tbd"}" style="--i:${i}">
          <header class="sess__h">
            <span class="sess__n">S${s.n}</span>
            ${ownerOnly(`<button class="iconbtn" data-edit-session="${s.n}" title="Edit">${icon("edit")}</button>`)}
          </header>
          <h3 class="sess__t">${esc(s.title)}</h3>
          <p class="sess__d">${s.date ? `${esc(fmtDate(s.date, { weekday: "long", month: "long" }))}${s.start_time ? ` · ${esc(fmtTime(s.start_time))}${s.end_time ? `–${esc(fmtTime(s.end_time))}` : ""}` : ""}` : `<span class="tbd">Date not locked</span>`}</p>
          <p class="sess__v">${icon("pin")}${s.venue ? esc(s.venue) : "No room yet"}<span class="vs vs--${s.venue_status.toLowerCase().replace(/ /g, "-")}">${esc(s.venue_status)}</span></p>
          ${d !== null ? `<p class="sess__cd">${d > 0 ? `<b>${d}</b> days to go` : d === 0 ? "<b>Today</b>" : "Done"}</p>` : ""}
          ${s.notes ? `<p class="sess__note">${esc(s.notes)}</p>` : ""}
          <ol class="steps">${(dl.length ? dl : (ops.rules || []).map((r) => ({ ...r, date: null }))).map((r) => `
            <li class="${r.date && r.date < today ? "is-past" : ""}">
              <span class="steps__dot"></span>
              <span class="steps__t">${esc(r.label)}${r.date ? "" : `<small>${r.days} ${r.workdays ? "working " : ""}day${r.days > 1 ? "s" : ""} before</small>`}</span>
              ${r.date ? dueChip(r.date) : ""}
              ${avatar(r.owner, "xs")}
            </li>`).join("")}</ol>
        </article>`;
      }).join("")}</section>

      <section class="cols cols--wide">
        <article class="card pad">
          <header class="ch"><h3>${icon("flag")} Key dates</h3><span class="count">${ms.length}</span></header>
          ${ms.length ? `<ol class="timeline">${ms.map((m) => `
            <li class="${m.done ? "is-done" : ""} ${m.on_date < today && !m.done ? "is-late" : ""}">
              <span class="timeline__d"><b>${esc(fmtDate(m.on_date, { weekday: undefined }))}</b><small>${esc(fmtDate(m.on_date, { month: undefined, day: undefined }))}${m.at_time ? ` · ${esc(fmtTime(m.at_time))}` : ""}</small></span>
              <span class="timeline__dot">${m.done ? icon("check") : ""}</span>
              <div class="timeline__b">
                <p>${esc(m.title)}</p>
                ${m.notes ? `<small>${esc(m.notes)}</small>` : ""}
              </div>
              ${m.who.includes("All") ? `<span class="tag">Everyone</span>` : avatars(m.who, "xs")}
              ${ownerOnly(`<span class="timeline__act"><button class="iconbtn" data-done="${m.id}" title="${m.done ? "Mark not done" : "Mark done"}">${icon("check")}</button><button class="iconbtn" data-edit-ms="${m.id}" title="Edit">${icon("edit")}</button></span>`)}
            </li>`).join("")}</ol>` : empty("No key dates yet.", "flag")}
        </article>

        <div class="stack">
          <article class="card pad">
            <header class="ch"><h3>${icon("pin")} What the room needs</h3></header>
            <ul class="checks">${(ops.checklist || []).map((c) => `<li>${icon("check")}<span>${esc(c)}</span></li>`).join("")}</ul>
          </article>
          <article class="card pad">
            <header class="ch"><h3>${icon("help")} Why the dates fall where they do</h3></header>
            <ul class="bullets">${(ops.why || []).map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
            <p class="hint">${esc(ops.datesOwner || "Thomas")} locks the dates.</p>
          </article>
        </div>
      </section>`;

    root.querySelectorAll("[data-edit-session]").forEach((b) => b.addEventListener("click", () => {
      const s = sessions.find((x) => x.n === Number(b.dataset.editSession));
      editRow({ table: "sessions", row: s, fields: SESSION_FIELDS, title: `Session ${s.n}` });
    }));
    root.querySelector("#addMs")?.addEventListener("click", () => editRow({ table: "milestones", fields: MILESTONE_FIELDS, title: "Key date", defaults: { who: [], done: false, on_date: today } }));
    root.querySelectorAll("[data-edit-ms]").forEach((b) => b.addEventListener("click", () => editRow({ table: "milestones", row: ms.find((m) => m.id === b.dataset.editMs), fields: MILESTONE_FIELDS, title: "Key date" })));
    root.querySelectorAll("[data-done]").forEach((b) => b.addEventListener("click", async () => {
      const m = ms.find((x) => x.id === b.dataset.done);
      try { await update("milestones", m.id, { done: !m.done }); toast(m.done ? "Marked not done" : "Marked done"); } catch { toast("Couldn’t save.", "bad"); }
    }));
  },
};
