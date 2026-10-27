/* Overview: what's next, the numbers, the week at a glance, what's late, who's carrying what. */
import { S, agenda, tasksFor, isDone, isLate, people, focusName, update, setting } from "/admin/store.js";
import { esc, icon, avatars, avatar, fmtDate, fmtTime, todayISO, addDays, instant, countdownParts, pad2, greeting, countUps, ics, download, copy, toast } from "/admin/lib.js";
import { taskRow, empty, ownerOnly } from "/admin/ui.js";
import { go } from "/admin/app.js";

const KIND = { task: "Task", milestone: "Key date", ops: "Ops", session: "Session" };
const dayHead = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "short", day: "2-digit" }).toUpperCase();
const shortWhen = (x) => `${dayHead(x.date)}${x.time ? ` · ${fmtTime(x.time)}` : ""}`;

export default {
  id: "overview", title: "Overview", icon: "overview",
  render(root) {
    const who = focusName();
    const today = todayISO();
    const upcoming = agenda({ person: who, from: today }).filter((x) => !x.done && instant(x.date, x.time) > new Date());
    const next = upcoming[0];
    const mine = tasksFor(who);
    const open = mine.filter((t) => !isDone(t));
    const done = mine.length - open.length;
    const late = mine.filter(isLate).sort((a, b) => a.due.localeCompare(b.due));
    const dueWeek = open.filter((t) => t.due && t.due >= today && t.due <= addDays(today, 6)).length;
    const decisions = (S.data.open_items || []).filter((o) => !o.resolved);
    const regs = (S.data.registrations || []).length;
    const target = setting("costing").baseline || 12;
    const orgs = who ? (S.data.orgs || []).filter((o) => o.owner === who) : S.data.orgs || [];
    const sent = orgs.filter((o) => o.status !== "Not sent").length;
    const yes = orgs.filter((o) => o.status === "Yes").length;
    const focus = who ? open.filter((t) => t.due).sort((a, b) => (a.due + (a.due_time || "")).localeCompare(b.due + (b.due_time || ""))).slice(0, 6) : late.slice(0, 6);

    // the next 7 days as columns
    const week = agenda({ person: who, from: today, to: addDays(today, 6) });
    const days = Array.from({ length: 7 }, (_, i) => { const date = addDays(today, i); return { date, items: week.filter((x) => x.date === date) }; });

    const readouts = [
      ["tasks", who ? "Your tasks done" : "Tasks done", done, `/${mine.length}`, mine.length ? done / mine.length : 0, ""],
      ["tasks", "Late", late.length, "", null, late.length ? "bad" : ""],
      ["schedule", "Due this week", dueWeek, "", null, ""],
      ["inquiries", "Sign-ups", regs, `/${target}`, regs / target, ""],
      ["outreach", who ? "Your orgs messaged" : "Orgs messaged", sent, `/${orgs.length}`, orgs.length ? sent / orgs.length : 0, ""],
      ["outreach", "Orgs said yes", yes, "", null, yes ? "good" : ""],
    ];

    root.innerHTML = `
      <header class="ph">
        <h1 class="ph__title">${greeting()}, ${esc(S.me?.name || "there")}.</h1>
        <div class="ph__actions">
          ${ownerOnly(`<label class="viewas" title="See the workspace as one person">${icon("eye")}<select id="viewAs"><option value="">Whole team</option>${people().map((p) => `<option ${S.viewAs === p.name ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
          <button class="btn btn--ghost" id="gcUpdate">${icon("message")} GC update</button>`)}
          <button class="btn btn--ghost" id="toCal" title="Download every upcoming date as a calendar file">${icon("calplus")} Calendar</button>
        </div>
      </header>

      <section class="ov-top">
        <article class="now">
          <div class="now__grid" aria-hidden="true"></div>
          <i class="now__scan" aria-hidden="true"></i>
          <p class="lbl lbl--ice">Up next${who ? ` · ${esc(who)}` : ""}</p>
          ${next ? `
            <h2 class="now__t" ${next.kind === "task" ? `data-task="${next.ref.id}"` : ""}>${esc(next.title)}</h2>
            <p class="now__when"><span class="now__kind">${KIND[next.kind]}</span>${esc(fmtDate(next.date, { weekday: "long", month: "long" }))}${next.time ? ` · ${esc(fmtTime(next.time))}` : ""}</p>
            <div class="now__row">
              <div class="cd" data-cd="${instant(next.date, next.time).toISOString()}">${cdCells(instant(next.date, next.time))}</div>
              ${next.who.includes("All") ? `<span class="now__all">Everyone</span>` : avatars(next.who, "sm")}
            </div>
            ${upcoming.length > 1 ? `<ol class="now__then">${upcoming.slice(1, 4).map((x) => `<li ${x.kind === "task" ? `data-task="${x.ref.id}"` : ""}><span>${esc(shortWhen(x))}</span><b>${esc(x.title)}</b></li>`).join("")}</ol>` : ""}` : `<h2 class="now__t">Nothing scheduled.</h2>`}
        </article>

        <div class="readouts">${readouts.map(([to, k, n, of, pct, tone]) => `
          <button class="ro ro--${tone}" data-go="${to}">
            <span class="lbl">${esc(k)}</span>
            <span class="ro__n"><b data-count="${n}">0</b>${of ? `<small>${of}</small>` : ""}</span>
            ${pct != null ? `<i class="meter"><i style="--w:${Math.min(100, pct * 100)}%"></i></i>` : `<i class="ro__arrow">${icon("arrow")}</i>`}
          </button>`).join("")}</div>
      </section>

      <section class="panel week">
        <header class="pnl"><h3>Next 7 days</h3><span class="ct">${week.length}</span><button class="pnl__more" data-go="schedule">Schedule ${icon("right")}</button></header>
        <div class="week__grid">${days.map((d, i) => `
          <div class="wkday ${d.date === today ? "is-today" : ""} ${weekdayOf(d.date) % 6 === 0 ? "is-weekend" : ""}">
            <p class="wkday__h"><b>${esc(dayHead(d.date).split(" ")[0])}</b><span>${esc(dayHead(d.date).split(" ")[1])}</span>${d.items.length ? `<em>${d.items.length}</em>` : ""}</p>
            <ul>${d.items.slice(0, 4).map((x, j) => `
              <li class="wk wk--${x.kind} in" style="--i:${i * 2 + j}" ${x.kind === "task" ? `data-task="${x.ref.id}"` : ""} title="${esc(x.title)}${x.who.length ? ` · ${esc(x.who.join(", "))}` : ""}">
                <span class="wk__t">${esc(x.title)}</span>
                <span class="wk__m">${x.time ? esc(fmtTime(x.time)) : KIND[x.kind]}${x.who.includes("All") ? " · All" : ""}</span>
              </li>`).join("")}
              ${d.items.length > 4 ? `<li class="wk wk--more" data-go="schedule">+${d.items.length - 4} more</li>` : ""}
            </ul>
          </div>`).join("")}</div>
      </section>

      <section class="ov-row">
        <article class="panel">
          <header class="pnl"><h3>${who ? "Your focus" : "Late"}</h3><span class="ct ${who ? "" : "ct--bad"}">${who ? open.length : late.length}</span><button class="pnl__more" data-go="tasks">All tasks ${icon("right")}</button></header>
          ${focus.length ? `<div class="tlist tlist--flush">${focus.map(taskRow).join("")}</div>` : empty(who ? "No open tasks with a due date." : "Nothing late.", "check")}
        </article>

        <article class="panel">
          <header class="pnl"><h3>Open decisions</h3><span class="ct">${decisions.length}</span></header>
          ${decisions.length ? `<ul class="decisions">${decisions.map((o, i) => `
            <li class="in" style="--i:${i}">
              ${S.owner ? `<button class="tick" data-resolve="${o.id}" title="Mark decided">${icon("check")}</button>` : `<span class="tick tick--ro"></span>`}
              <p>${esc(o.question)}</p>
              <small>${esc(o.owner)}${o.due_label ? `<em>${esc(o.due_label)}</em>` : ""}</small>
            </li>`).join("")}</ul>` : empty("No open decisions.", "check")}
        </article>
      </section>

      <section class="panel">
        <header class="pnl"><h3>Team load</h3><button class="pnl__more" data-go="team">Team ${icon("right")}</button></header>
        <div class="load">${people().map((p, i) => {
          const ts = tasksFor(p.name), op = ts.filter((t) => !isDone(t)).length, lt = ts.filter(isLate).length, dn = ts.length - op;
          const pc = (n) => (ts.length ? (n / ts.length) * 100 : 0);
          return `<button class="load__p in" style="--i:${i}" data-person="${esc(p.name)}">
            <span class="load__who">${avatar(p.name, "md")}<span><b>${esc(p.name)}</b><small>${esc(p.role_title || "Team")}</small></span></span>
            <span class="load__n"><span><b>${op}</b> open</span>${lt ? `<span class="bad"><b>${lt}</b> late</span>` : ""}<span><b>${dn}</b> done</span></span>
            <i class="stack"><i class="stack--done" style="--w:${pc(dn)}%"></i><i class="stack--open" style="--w:${pc(op - lt)}%"></i><i class="stack--late" style="--w:${pc(lt)}%"></i></i>
          </button>`;
        }).join("")}</div>
      </section>`;

    countUps(root);
    // live countdown, every second
    const tick = () => root.querySelectorAll("[data-cd]").forEach((el) => (el.innerHTML = cdCells(new Date(el.dataset.cd))));
    const iv = setInterval(() => (root.isConnected && root.querySelector("[data-cd]") ? tick() : clearInterval(iv)), 1000);

    root.querySelector("#viewAs")?.addEventListener("change", (e) => { S.viewAs = e.target.value; go("overview"); });
    root.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
    root.querySelectorAll("[data-person]").forEach((b) => b.addEventListener("click", () => go("tasks", { person: b.dataset.person })));
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

const weekdayOf = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay();
function cdCells(target) {
  const p = countdownParts(target);
  return [[p.d, "D"], [p.h, "H"], [p.m, "M"], [p.s, "S"]].map(([n, u]) => `<span><b>${pad2(n)}</b><small>${u}</small></span>`).join("");
}

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
