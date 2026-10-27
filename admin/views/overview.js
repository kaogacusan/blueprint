/* Overview: one screen. What's next, four numbers, then this week, what's late, and open decisions. */
import { S, agenda, tasksFor, isDone, isLate, people, focusName, update, setting } from "/admin/store.js";
import { esc, icon, avatars, fmtDate, fmtTime, todayISO, addDays, instant, countdown, greeting, countUps, ics, download, copy, toast } from "/admin/lib.js";
import { taskRow, empty, ownerOnly } from "/admin/ui.js";
import { go } from "/admin/app.js";

const KIND = { task: "Task", milestone: "Key date", ops: "Prep", session: "Session" };
const dayName = (iso, today) => (iso === today ? "Today" : iso === addDays(today, 1) ? "Tomorrow" : fmtDate(iso, { month: undefined, day: undefined, weekday: "long" }));

export default {
  id: "overview", title: "Overview", icon: "overview",
  render(root) {
    const who = focusName();
    const today = todayISO();
    const upcoming = agenda({ person: who, from: today }).filter((x) => !x.done && instant(x.date, x.time) > new Date());
    const next = upcoming[0];
    const mine = tasksFor(who);
    const done = mine.filter(isDone).length;
    const late = mine.filter(isLate).sort((a, b) => a.due.localeCompare(b.due));
    const decisions = (S.data.open_items || []).filter((o) => !o.resolved);
    const regs = (S.data.registrations || []).filter((r) => r.status !== "cancelled");
    const paid = regs.filter((r) => r.status === "paid").length;
    const seats = setting("costing").max || 20;
    const orgs = who ? (S.data.orgs || []).filter((o) => o.owner === who) : S.data.orgs || [];
    const sent = orgs.filter((o) => o.status !== "Not sent").length;
    const week = agenda({ person: who, from: today, to: addDays(today, 6) });
    const byDay = week.reduce((m, x) => ((m[x.date] ||= []).push(x), m), {});

    const stats = [
      ["tasks", who ? "Your tasks done" : "Tasks done", done, `of ${mine.length}`, mine.length ? done / mine.length : 0, ""],
      ["tasks", "Late", late.length, late.length ? "need a push" : "all on time", null, late.length ? "bad" : "good"],
      ["inquiries", "Sign-ups", regs.length, `${paid} paid · ${seats} seats`, paid / seats, ""],
      ["outreach", who ? "Your orgs messaged" : "Orgs messaged", sent, `of ${orgs.length}`, orgs.length ? sent / orgs.length : 0, ""],
    ];

    root.innerHTML = `
      <header class="ph">
        <div>
          <p class="ph__eyebrow">${esc(fmtDate(today, { weekday: "long", month: "long" }))}</p>
          <h1 class="ph__title">${greeting()}, ${esc(S.me?.name || "there")}.</h1>
        </div>
        <div class="ph__actions">
          ${ownerOnly(`<label class="viewas" title="See the workspace as one person">${icon("eye")}<select id="viewAs"><option value="">Whole team</option>${people().map((p) => `<option ${S.viewAs === p.name ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
          <button class="btn btn--ghost" id="gcUpdate" title="Copy a summary of this week to paste in the group chat">${icon("message")} Copy GC update</button>`)}
          <button class="btn btn--ghost" id="toCal" title="Download every upcoming date as a calendar file">${icon("calplus")} Add to calendar</button>
        </div>
      </header>

      <section class="ov-stats">
        <article class="next ${next?.kind === "task" ? "is-click" : ""}" ${next?.kind === "task" ? `data-task="${next.ref.id}"` : ""}>
          <p class="next__k">${icon("clock")} Up next${who ? ` for ${esc(who)}` : ""}</p>
          ${next ? `
            <h2 class="next__t">${esc(next.title)}</h2>
            <p class="next__when">${esc(fmtDate(next.date, { weekday: "short" }))}${next.time ? ` · ${esc(fmtTime(next.time))}` : ""} <span class="next__in" data-cd="${instant(next.date, next.time).toISOString()}">in ${countdown(instant(next.date, next.time))}</span></p>
            ${next.who.includes("All") ? "" : `<span class="next__who">${avatars(next.who, "sm")}</span>`}` : `<h2 class="next__t">Nothing scheduled.</h2>`}
        </article>
        ${stats.map(([to, k, n, sub, pct, tone]) => `
          <button class="stat stat--${tone}" data-go="${to}">
            <span class="stat__k">${esc(k)}</span>
            <span class="stat__n"><b data-count="${n}">0</b><small>${esc(sub)}</small></span>
            ${pct != null ? `<i class="meter"><i style="--w:${Math.min(100, pct * 100)}%"></i></i>` : ""}
          </button>`).join("")}
      </section>

      <section class="ov-cols">
        <article class="card ov-card">
          <header class="ch"><h3>${icon("calendar")} This week</h3><button class="link" data-go="schedule">Schedule ${icon("right")}</button></header>
          <div class="ov-scroll">${week.length ? Object.entries(byDay).map(([d, xs]) => `
            <div class="ag-day">
              <p class="ag-day__h ${d === today ? "is-today" : ""}">${esc(dayName(d, today))}<small>${esc(fmtDate(d, { weekday: undefined }))}</small></p>
              ${xs.map((x, i) => `
                <div class="ag in ${x.done ? "is-done" : ""}" style="--i:${i}" ${x.kind === "task" ? `data-task="${x.ref.id}" role="button" tabindex="0"` : ""}>
                  <span class="ag__time">${x.time ? esc(fmtTime(x.time)) : "All day"}</span>
                  <span class="ag__t"><b>${esc(x.title)}</b>${x.kind !== "task" ? `<small>${KIND[x.kind]}</small>` : ""}</span>
                  ${x.who.includes("All") ? `<span class="tag">Everyone</span>` : avatars(x.who, "xs")}
                </div>`).join("")}
            </div>`).join("") : empty("Nothing due this week.", "check")}</div>
        </article>

        <article class="card ov-card">
          <header class="ch"><h3>${icon("alert")} ${who ? "Your late tasks" : "Late tasks"} <span class="count ${late.length ? "count--bad" : ""}">${late.length}</span></h3><button class="link" data-go="tasks">All tasks ${icon("right")}</button></header>
          <div class="ov-scroll">${late.length ? `<div class="tlist">${late.map(taskRow).join("")}</div>` : empty("Nothing late. Nice.", "check")}</div>
        </article>

        <article class="card ov-card">
          <header class="ch"><h3>${icon("help")} Open decisions <span class="count">${decisions.length}</span></h3></header>
          <div class="ov-scroll">${decisions.length ? `<ul class="decisions">${decisions.map((o, i) => `
            <li class="in" style="--i:${i}">
              ${S.owner ? `<button class="tick" data-resolve="${o.id}" title="Mark decided">${icon("check")}</button>` : `<span class="tick tick--ro"></span>`}
              <span><p>${esc(o.question)}</p><small>${esc(o.owner)}${o.due_label ? ` · ${esc(o.due_label)}` : ""}</small></span>
            </li>`).join("")}</ul>` : empty("No open decisions.", "check")}</div>
        </article>
      </section>`;

    countUps(root);
    // live countdown on the "up next" card
    const iv = setInterval(() => {
      const el = root.querySelector("[data-cd]");
      if (!root.isConnected || !el) return clearInterval(iv);
      el.textContent = `in ${countdown(new Date(el.dataset.cd))}`;
    }, 30000);

    root.querySelector("#viewAs")?.addEventListener("change", (e) => { S.viewAs = e.target.value; go("overview"); });
    root.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
    root.querySelectorAll("[data-resolve]").forEach((b) => b.addEventListener("click", async () => {
      b.classList.add("is-on");
      const o = decisions.find((x) => x.id === b.dataset.resolve);
      try {
        await update("open_items", o.id, { resolved: true });
        toast("Marked as decided", "", { label: "Undo", run: () => update("open_items", o.id, { resolved: false }) });
      } catch { toast("Couldn’t save.", "bad"); }
    }));
    root.querySelector("#toCal").addEventListener("click", () => {
      const items = agenda({ person: who, from: today });
      if (!items.length) return toast("Nothing upcoming to add.");
      download(`blueprint${who ? "-" + who.toLowerCase() : ""}.ics`, ics(items.map((x) => ({ date: x.date, time: x.time, title: `Blueprint: ${x.title}`, notes: x.who.join(", ") })), `Blueprint${who ? " · " + who : ""}`), "text/calendar");
      toast(`${items.length} dates saved. Open the file to add them.`);
    });
    root.querySelector("#gcUpdate")?.addEventListener("click", () => copy(gcUpdate(), "GC update copied. Paste it in the group chat."));
  },
};

/* A ready-to-paste group chat message built from the next 7 days and open questions. */
function gcUpdate() {
  const today = todayISO();
  const items = agenda({ from: today, to: addDays(today, 7) });
  const byDay = {};
  items.forEach((x) => (byDay[x.date] ||= []).push(x));
  const lines = ["Hi team! Here’s what’s coming up this week:", ""];
  for (const [d, xs] of Object.entries(byDay)) {
    lines.push(fmtDate(d, { weekday: "short" }).toUpperCase());
    xs.forEach((x) => lines.push(`• ${x.time ? fmtTime(x.time) + " — " : ""}${x.title}${x.who.length && !x.who.includes("All") ? ` (${x.who.join(", ")})` : ""}`));
    lines.push("");
  }
  const late = (S.data.tasks || []).filter(isLate);
  if (late.length) { lines.push("STILL OPEN FROM BEFORE"); late.forEach((t) => lines.push(`• ${t.title} (${t.owners.join(", ")})`)); lines.push(""); }
  const q = (S.data.open_items || []).filter((o) => !o.resolved);
  if (q.length) { lines.push("WAITING ON A DECISION"); q.forEach((o) => lines.push(`• ${o.question} — ${o.owner}`)); lines.push(""); }
  lines.push(`Your tasks, links and scripts are all here: ${location.origin}/admin`);
  return lines.join("\n");
}
