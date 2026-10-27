/* Overview: the pages that matter most to you (with what to do there), what's next, the week at a glance,
   what's late, and the questions still open. Everything else is one click away. */
import { S, agenda, tasksFor, isDone, isLate, people, focusName, focusOf, update, setting, costing, followUpDate, isGuest } from "/admin/store.js";
import { esc, icon, avatars, fmtDate, fmtTime, fmtWhen, todayISO, addDays, instant, countdown, greeting, countUps, ics, download, copy, toast, rel, plural } from "/admin/lib.js";
import { taskRow, empty, ownerOnly } from "/admin/ui.js";
import { go } from "/admin/app.js";


/* one tile per focus page: a number, and the one thing to do there */
function focusTile(id, who) {
  const today = todayISO();
  const mineT = tasksFor(who).filter((t) => !isDone(t));
  const T = {
    outreach() {
      const orgs = (S.data.orgs || []).filter((o) => !who || o.owner === who);
      const sent = orgs.filter((o) => o.status !== "Not sent").length;
      const fu = orgs.filter((o) => o.status === "Sent" && followUpDate(o) && followUpDate(o) <= today).length;
      const dl = tasksFor(who).find((t) => /^org outreach/i.test(t.title) && !isDone(t) && t.due);
      return { n: `${sent}/${orgs.length}`, k: "orgs messaged", pct: orgs.length ? sent / orgs.length : 0,
        todo: fu ? `${plural(fu, "follow-up")} due` : orgs.length - sent ? `${orgs.length - sent} to go` : "All done",
        due: dl, tone: fu ? "warn" : "" };
    },
    tasks() {
      const late = mineT.filter(isLate).length;
      const next = mineT.filter((t) => t.due && !isLate(t)).sort((a, b) => a.due.localeCompare(b.due))[0];
      return { n: mineT.length, k: who ? "open tasks" : "open tasks, whole team", todo: late ? `${late} late` : next ? `Next: ${next.title}` : "Nothing due", tone: late ? "bad" : "", due: next };
    },
    schedule() {
      const s = (S.data.sessions || []).filter((x) => x.date && x.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
      const set = (S.data.sessions || []).filter((x) => x.date).length;
      return s ? { n: fmtDate(s.date, { weekday: undefined }), k: `Session ${s.n}`, todo: s.venue || "Room not set yet", tone: s.venue ? "" : "warn" }
        : { n: `${set}/4`, k: "session dates set", todo: "Dates not set yet", tone: "warn" };
    },
    budget() {
      const c = costing();
      return { n: c.pricesIn ? `₱${Math.round(c.totalMax).toLocaleString()}` : "—", k: c.pricesIn ? "cost at 20 seats" : "no cost yet", todo: c.pricesIn ? `Break-even at ${c.breakEvenMax} seats` : "Printer prices missing", tone: c.pricesIn ? "" : "warn" };
    },
    inquiries() {
      const r = (S.data.registrations || []).filter((x) => x.status !== "cancelled");
      const waiting = r.filter((x) => x.status === "registered").length;
      return { n: r.length, k: `sign-ups · ${r.filter((x) => x.status === "paid").length} paid`, todo: waiting ? `${waiting} waiting to pay` : "Nobody waiting", tone: waiting ? "warn" : "", pct: r.filter((x) => x.status === "paid").length / (setting("costing").max || 20) };
    },
    presentations() {
      const d = (S.data.decks || []).length;
      return { n: `${d}/4`, k: "session decks ready", todo: d < 4 ? `${4 - d} still to come` : "All ready" };
    },
    playbook() {
      const g = (S.data.guides || [])[0];
      return { n: (S.data.guides || []).length, k: "guides", todo: g ? `Start with: ${g.title}` : "" };
    },
    team() { return { n: people().length, k: "people", todo: "Who does what" }; },
  }[id];
  if (!T) return "";
  const v = T(), view = { outreach: ["send", "Outreach"], tasks: ["tasks", "Tasks"], schedule: ["calendar", "Schedule"], budget: ["wallet", "Budget"], inquiries: ["inbox", "Sign-ups"], presentations: ["play", "Decks"], playbook: ["book", "Playbook"], team: ["users", "Team"] }[id];
  return `<button class="ftile ftile--${v.tone || "ok"}" data-go="${id}">
    <span class="ftile__h">${icon(view[0])}<span>${view[1]}</span>${icon("arrow", "ftile__go")}</span>
    <span class="ftile__n"><b>${esc(String(v.n))}</b><small>${esc(v.k)}</small></span>
    ${v.pct != null ? `<i class="meter"><i style="--w:${Math.min(100, v.pct * 100)}%"></i></i>` : ""}
    <span class="ftile__todo">${v.tone === "bad" || v.tone === "warn" ? icon("alert") : icon("right")}<span>${esc(v.todo)}</span></span>
    ${v.due?.due ? `<span class="ftile__due due--${rel(v.due.due).tone}">${esc(rel(v.due.due).label)}${v.due.due_time ? ` · ${esc(fmtTime(v.due.due_time))}` : ""}</span>` : ""}
  </button>`;
}

export default {
  id: "overview", title: "Overview", icon: "overview",
  render(root) {
    const who = focusName();
    const today = todayISO();
    const upcoming = agenda({ person: who, from: today }).filter((x) => !x.done && instant(x.date, x.time) > new Date());
    const next = upcoming[0];
    const late = tasksFor(who).filter(isLate).sort((a, b) => a.due.localeCompare(b.due));
    const open = (S.data.open_items || []).filter((o) => !o.resolved);
    const decided = (S.data.open_items || []).filter((o) => o.resolved && o.answer);
    const week = agenda({ person: who, from: today, to: addDays(today, 6) });
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
    const focus = focusOf(who || S.me?.name);
    const tabs = focus.tabs.filter((id) => !(id === "inquiries" && isGuest()));

    root.innerHTML = `<div class="page">
      <header class="ph">
        <div>
          <p class="kicker">${esc(fmtDate(today, { weekday: "long", month: "long" }))}</p>
          <h1 class="ph__title">${greeting()}, ${esc(S.me?.name || "there")}.</h1>
        </div>
        <div class="ph__actions">
          ${ownerOnly(`<label class="viewas" title="See the workspace as one person">${icon("eye")}<select id="viewAs"><option value="">Whole team</option>${people().map((p) => `<option ${S.viewAs === p.name ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
          <button class="btn btn--ghost" id="gcUpdate" title="Copy a summary of this week to paste in the group chat">${icon("message")} Copy GC update</button>`)}
          <button class="btn btn--ghost" id="toCal" title="Download every upcoming date as a calendar file">${icon("calplus")} Calendar</button>
        </div>
      </header>

      <section class="focus">
        <p class="kicker">${who ? `${esc(who === S.me?.name ? "Your" : who + "’s")} pages` : "Keira’s pages"}</p>
        <div class="focus__row" style="--n:${tabs.length}">${tabs.map((id) => focusTile(id, who)).join("")}</div>
      </section>

      <section class="ov2">
        <article class="next ${next?.kind === "task" ? "is-click" : ""}" ${next?.kind === "task" ? `data-task="${next.ref.id}"` : ""}>
          <p class="next__k">${icon("clock")} Up next${who ? ` for ${esc(who)}` : ""}</p>
          ${next ? `
            <h2 class="next__t">${esc(next.title)}</h2>
            <p class="next__when">${esc(fmtDate(next.date, { weekday: "short" }))}${next.time ? ` · ${esc(fmtTime(next.time))}` : ""} <span class="next__in" data-cd="${instant(next.date, next.time).toISOString()}">in ${countdown(instant(next.date, next.time))}</span></p>
            ${next.who.includes("All") ? "" : `<span class="next__who">${avatars(next.who, "sm")}</span>`}` : `<h2 class="next__t">Nothing scheduled.</h2>`}
          ${upcoming.length > 1 ? `<div class="next__then"><p class="kicker">Then</p>${upcoming.slice(1, 3).map((x) => `<p><b>${esc(x.title)}</b><small>${esc(fmtDate(x.date, { weekday: "short" }))}${x.time ? ` · ${esc(fmtTime(x.time))}` : ""}</small></p>`).join("")}</div>` : ""}
        </article>

        <article class="card week">
          <header class="ch"><h3>${icon("calendar")} Next 7 days</h3><button class="link" data-go="schedule">Calendar ${icon("right")}</button></header>
          <div class="week__days">${days.map((d) => {
            const xs = week.filter((x) => x.date === d);
            return `<div class="wday ${d === today ? "is-today" : ""} ${xs.length ? "" : "is-free"}">
              <p class="wday__h"><b>${d === today ? "Today" : esc(fmtDate(d, { month: undefined, day: undefined }))}</b><span>${esc(fmtDate(d, { weekday: undefined, month: undefined }))}</span></p>
              ${xs.slice(0, 4).map((x) => `<span class="wit wit--${x.kind} ${x.done ? "is-done" : ""}" ${x.kind === "task" ? `data-task="${x.ref.id}" role="button" tabindex="0"` : ""} title="${esc(x.title)}${x.who.length && !x.who.includes("All") ? " · " + esc(x.who.join(", ")) : ""}">
                ${x.time ? `<small>${esc(fmtTime(x.time))}</small>` : ""}<b>${esc(x.title)}</b></span>`).join("")}
              ${xs.length > 4 ? `<button class="wday__more" data-go="schedule">+${xs.length - 4} more</button>` : ""}
            </div>`;
          }).join("")}</div>
        </article>
      </section>

      <section class="ov3">
        ${late.length ? `<article class="card ov3__late">
          <header class="ch"><h3>${icon("alert")} ${who ? "Catch up" : "Late across the team"} <span class="count count--bad">${late.length}</span></h3><button class="link" data-go="tasks">All tasks ${icon("right")}</button></header>
          <div class="tlist">${late.slice(0, 5).map(taskRow).join("")}</div>
          ${late.length > 5 ? `<button class="morebtn" data-go="tasks">${late.length - 5} more late</button>` : ""}
        </article>` : `<article class="card ov3__late ov3__late--ok"><div class="empty">${icon("check")}<p>Nothing late${who ? " for you" : ""}. Nice.</p></div></article>`}

        <article class="card ov3__q">
          <details class="more more--card" ${S.owner ? "open" : ""}>
            <summary><h3>${icon("help")} Open questions <span class="count">${open.length}</span></h3>${icon("down", "fold__chev")}</summary>
            ${open.length ? `<ul class="qcards">${open.map((o, i) => `
              <li class="in" style="--i:${i}">
                ${S.owner ? `<button class="tick" data-resolve="${o.id}" title="Mark decided">${icon("check")}</button>` : ""}
                <p>${esc(o.question)}</p>
                <small>${esc(o.owner)}${o.due_label ? ` · <em>${esc(o.due_label)}</em>` : ""}</small>
                ${o.answer ? `<small class="qcards__a">So far: ${esc(o.answer)}</small>` : ""}
              </li>`).join("")}</ul>` : empty("No open questions.", "check")}
          </details>
          ${decided.length ? `<details class="more more--card">
            <summary><h3>${icon("check")} Decided <span class="count count--good">${decided.length}</span></h3>${icon("down", "fold__chev")}</summary>
            <ul class="decided">${decided.map((o) => `<li><b>${esc(o.answer)}</b><small>${esc(o.question)}</small></li>`).join("")}</ul>
          </details>` : ""}
        </article>
      </section></div>`;

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
      const o = open.find((x) => x.id === b.dataset.resolve);
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
