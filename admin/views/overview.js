/* Overview: what's next, this week, your tasks, open decisions, team pulse. */
import { S, agenda, tasksFor, isDone, isLate, people, focusName, update, setting, costing } from "/admin/store.js";
import { esc, icon, avatars, avatar, fmtDate, fmtTime, fmtWhen, todayISO, addDays, instant, countdown, greeting, ring, countUps, ics, download, copy, toast, daysBetween } from "/admin/lib.js";
import { taskRow, empty, dueChip, ownerOnly } from "/admin/ui.js";
import { go } from "/admin/app.js";

const KIND = { task: ["tasks", "Task"], milestone: ["flag", "Key date"], ops: ["printer", "Ops"], session: ["play", "Session"] };

export default {
  id: "overview", title: "Overview", icon: "overview",
  render(root) {
    const who = focusName();
    const today = todayISO();
    const week = agenda({ person: who, from: today, to: addDays(today, 7) });
    const next = agenda({ person: who, from: today }).find((x) => !x.done && instant(x.date, x.time) > new Date());
    const mine = tasksFor(who);
    const open = mine.filter((t) => !isDone(t));
    const done = mine.filter(isDone).length;
    const late = mine.filter(isLate);
    const focus = open.filter((t) => t.due).sort((a, b) => (a.due + (a.due_time || "")).localeCompare(b.due + (b.due_time || ""))).slice(0, 6);
    const decisions = (S.data.open_items || []).filter((o) => !o.resolved);
    const regs = (S.data.registrations || []).length;
    const target = setting("costing").baseline || 12;
    const orgs = S.data.orgs || [];
    const orgsMine = who ? orgs.filter((o) => o.owner === who) : orgs;
    const sent = orgsMine.filter((o) => o.status !== "Not sent").length;
    const yes = orgsMine.filter((o) => o.status === "Yes").length;
    const me = people().find((p) => p.name === who);

    // group the week by day
    const days = [];
    for (const it of week) {
      let d = days.find((x) => x.date === it.date);
      if (!d) days.push((d = { date: it.date, items: [] }));
      d.items.push(it);
    }

    root.innerHTML = `
      <header class="ph">
        <div>
          <p class="ph__eyebrow">${esc(fmtDate(today, { weekday: "long", month: "long" }))}</p>
          <h1 class="ph__title">${greeting()}, ${esc(S.me?.name || "there")}.</h1>
          <p class="ph__sub">${who ? `${S.owner && S.viewAs ? `Previewing <b>${esc(who)}</b>’s view` : esc(me?.role_title || "Here’s what’s on")}${S.owner && S.viewAs ? "" : ""}` : "Everything across the team, in one place."}</p>
        </div>
        <div class="ph__actions">
          ${ownerOnly(`<label class="viewas">${icon("eye")}<select id="viewAs"><option value="">Whole team</option>${people().map((p) => `<option ${S.viewAs === p.name ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
          <button class="btn btn--ghost" id="gcUpdate">${icon("message")} Copy GC update</button>`)}
          <button class="btn btn--ghost" id="toCal">${icon("calplus")} Add to calendar</button>
        </div>
      </header>

      <section class="hero-grid">
        <article class="card next stagger" style="--i:0">
          <div class="next__grid" aria-hidden="true"></div>
          <p class="next__k">${icon("clock")} Up next${who ? ` for ${esc(who)}` : ""}</p>
          ${next ? `
            <h2 class="next__t">${esc(next.title)}</h2>
            <p class="next__when">${esc(fmtWhen(next.date, next.time))}</p>
            <div class="next__row">
              <span class="next__cd" data-countdown="${instant(next.date, next.time).toISOString()}">${countdown(instant(next.date, next.time))}</span>
              ${avatars(next.who.filter((w) => w !== "All"), "sm")}${next.who.includes("All") ? `<span class="next__all">Everyone</span>` : ""}
            </div>` : `<h2 class="next__t">Nothing scheduled.</h2><p class="next__when">You’re all caught up.</p>`}
        </article>

        <article class="card stat-ring stagger" style="--i:1">
          ${ring(mine.length ? done / mine.length : 0, 76, 8)}
          <div>
            <p class="k">${who ? "Your tasks" : "Team tasks"}</p>
            <p class="big"><span data-count="${done}">0</span><small>/${mine.length} done</small></p>
            <p class="sub">${open.length} open${late.length ? ` · <b class="bad">${late.length} late</b>` : ""}</p>
          </div>
        </article>

        <article class="card stat stagger" style="--i:2">
          <p class="k">${icon("inbox")} Sign-ups</p>
          <p class="big"><span data-count="${regs}">0</span><small>/${target} target</small></p>
          <div class="bar"><i style="--w:${Math.min(100, (regs / target) * 100)}%"></i></div>
          <p class="sub">${regs >= target ? "Target reached" : `${target - regs} more to the baseline`}</p>
        </article>

        <article class="card stat stagger" style="--i:3">
          <p class="k">${icon("send")} ${who ? "Your orgs" : "Org outreach"}</p>
          <p class="big"><span data-count="${sent}">0</span><small>/${orgsMine.length} messaged</small></p>
          <div class="bar"><i style="--w:${orgsMine.length ? (sent / orgsMine.length) * 100 : 0}%"></i></div>
          <p class="sub">${yes} said yes</p>
        </article>
      </section>

      <section class="cols">
        <article class="card pad stagger" style="--i:4">
          <header class="ch"><h3>${icon("calendar")} Next 7 days</h3><button class="link" data-go="schedule">Schedule ${icon("right")}</button></header>
          ${days.length ? `<ol class="agenda">${days.map((d) => `
            <li class="agenda__day">
              <p class="agenda__date ${d.date === today ? "is-today" : ""}"><b>${d.date === today ? "Today" : daysBetween(today, d.date) === 1 ? "Tomorrow" : esc(fmtDate(d.date, { weekday: "long", month: undefined, day: undefined }))}</b><span>${esc(fmtDate(d.date, { weekday: undefined }))}</span></p>
              <ul>${d.items.map((it) => `
                <li class="ag ag--${it.kind} ${it.done ? "is-done" : ""}" ${it.kind === "task" ? `data-task="${it.ref.id}"` : ""}>
                  <span class="ag__time">${it.time ? esc(fmtTime(it.time)) : "All day"}</span>
                  <span class="ag__ic" title="${KIND[it.kind][1]}">${icon(KIND[it.kind][0])}</span>
                  <span class="ag__t">${esc(it.title)}</span>
                  ${avatars(it.who.filter((w) => w !== "All"), "xs")}
                </li>`).join("")}</ul>
            </li>`).join("")}</ol>` : empty("Nothing due in the next 7 days.", "calendar")}
        </article>

        <div class="stack">
          <article class="card pad stagger" style="--i:5">
            <header class="ch"><h3>${icon("target")} ${who ? `${esc(who === S.me?.name ? "Your" : who + "’s")} focus` : "Needs attention"}</h3><button class="link" data-go="tasks">All tasks ${icon("right")}</button></header>
            ${(() => {
              const list = who ? focus : [...(S.data.tasks || []).filter(isLate), ...(S.data.tasks || []).filter((t) => t.status === "Blocked" && !isLate(t))].slice(0, 7);
              return list.length ? `<div class="tlist">${list.map(taskRow).join("")}</div>` : empty(who ? "No open tasks with a due date." : "Nothing late or blocked. Nice.", "check");
            })()}
          </article>

          <article class="card pad stagger" style="--i:6">
            <header class="ch"><h3>${icon("help")} Open decisions</h3><span class="count">${decisions.length}</span></header>
            ${decisions.length ? `<ul class="decisions">${decisions.map((o) => `
              <li>
                ${S.owner ? `<button class="tick" data-resolve="${o.id}" title="Mark decided">${icon("check")}</button>` : `<span class="dot"></span>`}
                <div><p>${esc(o.question)}</p><small>${esc(o.owner)}${o.due_label ? ` · ${esc(o.due_label)}` : ""}</small></div>
              </li>`).join("")}</ul>` : empty("No open decisions.", "check")}
          </article>
        </div>
      </section>

      <section class="card pad stagger" style="--i:7">
        <header class="ch"><h3>${icon("users")} Team pulse</h3><button class="link" data-go="team">Team ${icon("right")}</button></header>
        <div class="pulse">${people().map((p) => {
          const ts = tasksFor(p.name), op = ts.filter((t) => !isDone(t)), lt = ts.filter(isLate);
          const nx = op.filter((t) => t.due).sort((a, b) => a.due.localeCompare(b.due))[0];
          return `<button class="pulse__p" data-person="${esc(p.name)}">
            ${avatar(p.name, "lg")}
            <span class="pulse__who"><b>${esc(p.name)}</b><small>${esc(p.role_title || "Team")}</small></span>
            <span class="pulse__n"><b>${op.length}</b> open${lt.length ? ` · <em>${lt.length} late</em>` : ""}</span>
            <span class="pulse__next">${nx ? `${dueChip(nx.due, nx.due_time)}<span>${esc(nx.title)}</span>` : `<span class="muted">Nothing due</span>`}</span>
          </button>`;
        }).join("")}</div>
      </section>`;

    countUps(root);
    // live countdown
    const tick = () => root.querySelectorAll("[data-countdown]").forEach((el) => (el.textContent = countdown(new Date(el.dataset.countdown))));
    const iv = setInterval(() => (root.isConnected ? tick() : clearInterval(iv)), 30000);

    root.querySelector("#viewAs")?.addEventListener("change", (e) => { S.viewAs = e.target.value; go("overview"); });
    root.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
    root.querySelectorAll("[data-person]").forEach((b) => b.addEventListener("click", () => go("tasks", { person: b.dataset.person })));
    root.querySelectorAll("[data-resolve]").forEach((b) => b.addEventListener("click", async () => {
      b.classList.add("is-on");
      try { await update("open_items", b.dataset.resolve, { resolved: true }); toast("Marked as decided"); } catch { toast("Couldn’t save.", "bad"); }
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
