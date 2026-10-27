/* First sign-in: pick your own password, then a spotlight tour of the workspace.
   The tour follows each person's focus pages (settings → focus), so everyone sees their own pages first.
   settings → tour: { "<name>": "full" } gives someone the tour of every page and button.
   Replay anytime with the ? button next to your name. Done/seen is kept on the login (user_metadata). */
import { supa } from "/admin/supa.js";
import { S, setting, focusOf, focusName, tasksFor, isDone, isGuest } from "/admin/store.js";
import { $, esc, icon, fmtWhen, toast } from "/admin/lib.js";
import { go } from "/admin/app.js";

/* ---------- context: the numbers that make a tour personal ---------- */
function ctx(name) {
  const orgs = (S.data.orgs || []).filter((o) => o.owner === name);
  const dl = tasksFor(name).find((t) => /^org outreach/i.test(t.title) && !isDone(t) && t.due);
  const open = tasksFor(name).filter((t) => !isDone(t)).length;
  return { name, orgs: orgs.length, due: dl ? fmtWhen(dl.due, dl.due_time) : "", open, focus: focusOf(name), guest: isGuest() && name === S.me?.name };
}

/* ---------- every stop the tour can make. el: first selector found wins; side: lives in the sidebar ---------- */
const STOPS = {
  nav: (c) => ({ el: "#nav", side: true, title: "Your pages, in order", text: `<b>For you</b> at the top has the pages you’ll use most${c.focus.why ? `: ${esc(c.focus.why.toLowerCase())}` : ""}. Everything else is underneath. Red numbers are things that are late or waiting.` }),
  search: () => ({ el: "#searchBtn", side: true, title: "Search anything", text: "An org, a task, a file, a message, a person. Type a few letters and press Enter. Shortcut: <kbd>⌘</kbd> <kbd>K</kbd> (or <kbd>Ctrl</kbd> <kbd>K</kbd>)." }),
  me: () => ({ el: ".side__me", side: true, title: "Your account", text: "The key changes your password. The arrow signs you out. The <b>?</b> plays this tour again whenever you want." }),

  "ov-focus": (c) => ({ view: "overview", el: ".focus", title: "Your pages, at a glance", text: "One tile per page that matters to you. Each shows a number and <b>the one thing to do there</b>. Orange means it needs you soon. Tap a tile to jump in." }),
  "ov-next": () => ({ view: "overview", el: ".ov2 .next", title: "Up next", text: "Your nearest deadline with a live countdown, then the few after it. If it’s a task, tap it for the notes and files." }),
  "ov-week": () => ({ view: "overview", el: ".week", title: "The next 7 days", text: "Everything with a date, one column per day. <b>Blue</b> is a task, <b>pink</b> a key date, <b>orange</b> prep, <b>navy</b> a session. Tap a task to open it." }),
  "ov-late": () => ({ view: "overview", el: ".ov3__late", title: "Catch up", text: "Anything past its due date. Open one to see what’s left. If it’s actually done, tell Keira so it gets ticked off." }),
  "ov-q": () => ({ view: "overview", el: ".ov3__q", title: "Open questions and decisions", text: "What the team is still waiting on, who’s finding out, and by when. <b>Decided</b> keeps the answers from meetings so nobody has to scroll the GC." }),
  "ov-cal": () => ({ view: "overview", el: "#toCal", title: "Put it in your calendar", text: "Downloads all your upcoming dates as one file. Open it and they land in Google or Apple Calendar." }),

  "o-hero": (c) => ({ view: "outreach", el: ".ohero", title: c.orgs > 1 ? `Your ${c.orgs} orgs` : c.orgs ? "Your org" : "Outreach progress", text: `How many you’ve messaged and what each one said${c.due ? `. Due <b>${esc(c.due)}</b>` : ""}. The bar fills as you go.` }),
  "o-go": () => ({ view: "outreach", el: [".otile [data-go]", ".otile"], title: "Copy + open", text: "One tap copies the first message with <b>the org’s name and your name already filled in</b>, and opens their Facebook page. Paste it in their inbox and send." }),
  "o-sent": () => ({ view: "outreach", el: [".otile [data-sent]", ".otile"], title: "Then tap Sent", text: "That logs today as the DM date. Two working days later the org shows <b>Follow up</b>, and a reminder appears at the top of this page." }),
  "o-tile": () => ({ view: "outreach", el: [".obox", ".oboxes"], title: "Boxed by category", text: "Orgs are grouped by the kind of message they get. The star means message these first. Tap an org for the 3 steps, the follow-up message, and a place to log <b>who replied and what they agreed to</b>." }),
  "o-status": () => ({ view: "outreach", el: ".obar-tools", title: "By status", text: "Switch to <b>By status</b> to see three lanes: to message, waiting on them, answered. Search finds an org by name." }),
  "o-who": () => ({ view: "outreach", el: "#who", title: "Everyone’s orgs", text: "Pick <b>Everyone</b> to see the whole team’s progress, person by person." }),

  "t-filters": () => ({ view: "tasks", el: [".filters", ".ph"], title: "Tasks: whose and which", text: "Starts on <b>your</b> tasks. Change the person, the session (S1 to S4, the report) or the status. Late ones are always on top." }),
  "t-layout": () => ({ view: "tasks", el: ['[data-v="board"]', ".seg"], title: "List or board", text: "<b>Board</b> shows columns by status (not started, in progress, blocked, done), handy for checking where a session stands." }),
  "t-row": () => ({ view: "tasks", el: [".trow", ".results"], title: "Open a task", text: "Tap any task for its notes, due date and time, and every file and link attached to it. Files open straight in Drive." }),

  "s-sessions": () => ({ view: "schedule", el: [".sessions", ".ph"], title: "The four sessions", text: "Each session’s date, time and room. Once a date is set, its prep deadlines (venue request, print files, pre-work form) fill in by themselves." }),
  "s-cal": () => ({ view: "schedule", el: [".calwrap", ".cal"], title: "The calendar", text: "Every task, key date, prep deadline and session on one month. Tap a day to see what’s on it on the right." }),
  "s-keydates": () => ({ view: "schedule", el: [".kd", ".card.fold"], title: "Key dates", text: "Milestones the whole team works toward, like Friday’s presentation and the workshop week." }),

  "b-stats": () => ({ view: "budget", el: [".stats", ".ph"], title: "The budget", text: "Same math as the costing sheet: total cost, cost per person, and how many seats we need to sell to break even." }),
  "b-prices": () => ({ view: "budget", el: [".table--prices", ".cols--budget", ".ph"], title: "Printer prices", text: "Where the printer quotes go, per page and paper type. Once prices are in, every session’s print cost works itself out." }),

  "p-doors": () => ({ view: "playbook", el: ".doors", title: "The playbook: four doors", text: "<b>Guides</b> are how we run things. <b>Messages</b> are ready to copy. <b>Files</b> are every doc, sheet and folder. <b>People</b> are who to ask. Search at the top looks through all of it." }),
  "p-guides": () => ({ view: "playbook", el: [".chapter", ".chapters"], title: "Guides", text: "Each card is one guide. Tap it to read; the chips jump to a section. “When they ask you something” is the one to keep open while messaging." }),

  "r-table": () => ({ view: "inquiries", el: [".table--regs", ".card.tablewrap", ".ph"], title: "Sign-ups", text: "Everyone who registered on the site, newest first. This is private: only the core team can see it." }),
  "r-status": () => ({ view: "inquiries", el: [".table--regs select", ".table--regs", ".ph"], title: "Mark who’s paid", text: "Set each person to <b>Paid</b> once their GCash reference number checks out, or <b>Waitlist</b> / <b>Cancelled</b>. The first 20 paid get seats." }),

  "d-deck": () => ({ view: "presentations", el: [".deck:not(.deck--soon)", ".decks"], title: "Session decks", text: "Tap a deck to present it full screen. <kbd>→</kbd> next, <kbd>←</kbd> back, <kbd>F</kbd> full screen, <kbd>T</kbd> timer, <kbd>B</kbd> black screen. A clicker works too." }),
  team: () => ({ view: "team", el: [".teamt", ".card"], title: "The team", text: "Who’s who, their role, and how many tasks each person has open or late. Tap someone to see their tasks." }),

  "k-viewas": () => ({ view: "overview", el: "#viewAs", title: "See it as anyone", text: "Pick a teammate to see exactly what they see, including their tour (press ? after picking)." }),
  "k-gc": () => ({ view: "overview", el: "#gcUpdate", title: "GC update", text: "Copies a ready-to-paste summary of the week, what’s late and what’s waiting on a decision." }),
  "k-import": () => ({ view: "tasks", el: ["#import", ".ph"], title: "Import from Excel", text: "Drop in Thomas’s project log or costing sheet. You see every change before it’s saved." }),
};

/* ---------- which stops, for whom ---------- */
const PAGE_STOPS = {
  outreach: ["o-hero", "o-go", "o-sent", "o-tile", "o-status"],
  tasks: ["t-filters", "t-row"],
  schedule: ["s-sessions", "s-cal"],
  budget: ["b-prices"],
  inquiries: ["r-table", "r-status"],
  presentations: ["d-deck"],
  playbook: ["p-doors", "p-guides"],
  team: ["team"],
};
const FULL = ["nav", "search", "ov-focus", "ov-next", "ov-week", "ov-late", "ov-q", "ov-cal",
  "t-filters", "t-layout", "t-row", "s-sessions", "s-cal", "s-keydates",
  "o-hero", "o-go", "o-sent", "o-tile", "o-status", "o-who", "b-stats", "b-prices",
  "p-doors", "p-guides", "r-table", "r-status", "d-deck", "team", "me"];

function plan(name) {
  const c = ctx(name);
  const kind = setting("tour")[name] || (S.owner && name === S.me?.name ? "owner" : "");
  let keys;
  if (kind === "full") keys = FULL;
  else {
    keys = ["nav", "ov-focus", "ov-week"];
    for (const id of c.focus.tabs) if (!(id === "inquiries" && c.guest)) keys.push(...(PAGE_STOPS[id] || []));
    if (!keys.includes("p-doors")) keys.push("p-doors");
    if (kind === "owner") keys.splice(2, 0, "k-viewas", "k-gc"), keys.push("k-import");
    keys.push("search", "me");
  }
  return { c, kind, steps: keys.map((k) => STOPS[k](c)) };
}

function intro({ c, kind, steps }) {
  const lines = [];
  if (kind === "full") lines.push(`This is the <b>full tour</b>: every page, what each button does, and where things live. About 3 minutes.`);
  else lines.push(`A quick tour of the pages you’ll use most. About a minute.`);
  if (c.orgs) lines.push(`You have <b>${c.orgs} org${c.orgs > 1 ? "s" : ""} to message</b>${c.due ? `, due <b>${esc(c.due)}</b>` : ""}. You’ll see how to message one in two taps.`);
  else if (c.open) lines.push(`You have <b>${c.open} open task${c.open > 1 ? "s" : ""}</b>. You’ll see where they are and where their files live.`);
  if (c.guest) lines.push(`You’re on as a <b>guest</b>: sign-ups and participants’ details stay with the core team.`);
  return { title: `Hi ${esc(c.name)}! Welcome to the workspace.`, text: lines.join("<br><br>") + `<br><br><span class="muted">${steps.length} stops · <kbd>→</kbd> next · <kbd>Esc</kbd> to skip</span>` };
}

/* ---------- the spotlight ---------- */
let T = null;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const mobile = () => innerWidth <= 900;

export function startTour(name = focusName() || S.me?.name) {
  if (T) return;
  const p = plan(name);
  const steps = [{ center: true, ...intro(p) }, ...p.steps, { center: true, title: "That’s it!", text: `Press the <b>?</b> next to your name to see this again.${p.c.orgs ? " Start with your top-pick orgs (the ones with a star)." : ""}`, last: true }];
  const el = document.createElement("div");
  el.className = "tour";
  el.innerHTML = `<div class="tour__block"></div><div class="tour__spot"></div>
    <div class="tour__card" role="dialog" aria-live="polite">
      <p class="tour__k"></p><h3 class="tour__t"></h3><p class="tour__x"></p>
      <div class="tour__bar"><i></i></div>
      <footer><button class="btn btn--ghost btn--sm" data-skip>Skip tour</button><span class="grow"></span><button class="btn btn--ghost btn--sm" data-back>${icon("left")} Back</button><button class="btn btn--primary btn--sm" data-next>Next ${icon("right")}</button></footer>
    </div>`;
  document.body.appendChild(el);
  T = { el, steps, i: 0, mine: name === S.me?.name };
  el.querySelector("[data-next]").addEventListener("click", () => move(1));
  el.querySelector("[data-back]").addEventListener("click", () => move(-1));
  el.querySelector("[data-skip]").addEventListener("click", () => end());
  addEventListener("keydown", onKey, true);
  addEventListener("resize", place);
  requestAnimationFrame(() => el.classList.add("is-on"));
  show();
}
function onKey(e) {
  if (!T) return;
  if (["ArrowRight", "Enter"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); move(1); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); move(-1); }
  else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); end(); }
}
function move(d) {
  if (T.i + d >= T.steps.length) return end();
  T.i = Math.max(0, T.i + d);
  show();
}
let target = null;
async function show() {
  const s = T.steps[T.i], el = T.el, my = T.i;
  el.classList.add("is-moving");
  $("#app").classList.toggle("nav-open", !!(s.side && mobile()));
  if (s.view) { go(s.view); await wait(450); }
  else if (s.side && mobile()) await wait(380);
  if (!T || T.i !== my) return;
  target = s.center ? null : [s.el].flat().map((q) => document.querySelector(q)).find((x) => x && x.getClientRects().length);
  if (target && !s.side) {
    // phones: keep the target in the top part, the card sits at the bottom
    if (mobile()) scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + scrollY - 76), behavior: "smooth" });
    else target.scrollIntoView({ block: "center", behavior: "smooth" });
    await wait(420);
  }
  if (!T || T.i !== my) return;
  el.querySelector(".tour__k").textContent = T.i === 0 || s.last ? "Workspace tour" : `${T.i} of ${T.steps.length - 2}`;
  el.querySelector(".tour__t").innerHTML = s.title;
  el.querySelector(".tour__x").innerHTML = s.text;
  el.querySelector(".tour__bar i").style.width = `${(T.i / (T.steps.length - 1)) * 100}%`;
  el.querySelector("[data-back]").hidden = T.i === 0;
  el.querySelector("[data-next]").innerHTML = T.i === 0 ? `Show me ${icon("right")}` : s.last ? `Done ${icon("check")}` : `Next ${icon("right")}`;
  el.classList.toggle("is-center", !target);
  place();
  el.classList.remove("is-moving");
  el.querySelector("[data-next]").focus({ preventScroll: true });
}
function place() {
  if (!T) return;
  const spot = T.el.querySelector(".tour__spot"), card = T.el.querySelector(".tour__card");
  if (!target) { spot.style.cssText = `left:50%;top:50%;width:0;height:0;`; card.style.cssText = ""; card.classList.remove("is-top"); return; }
  const r = target.getBoundingClientRect(), pad = 8;
  const box = { x: Math.max(4, r.left - pad), y: Math.max(4, r.top - pad), w: Math.min(innerWidth - 8, r.width + pad * 2), h: Math.min(innerHeight - 8, r.height + pad * 2) };
  spot.style.cssText = `left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px;`;
  card.classList.toggle("is-top", mobile() && r.top + r.height / 2 > innerHeight * 0.55); // phones: dock away from the target
  if (mobile()) { card.style.cssText = ""; return; }
  const cw = Math.min(380, innerWidth - 32), ch = card.offsetHeight || 220, gap = 14;
  let x, y;
  if (box.x + box.w + gap + cw < innerWidth - 16) { x = box.x + box.w + gap; y = box.y; }         // right
  else if (box.y + box.h + gap + ch < innerHeight - 16) { x = box.x; y = box.y + box.h + gap; }     // below
  else if (box.y - gap - ch > 16) { x = box.x; y = box.y - gap - ch; }                               // above
  else if (box.x - gap - cw > 16) { x = box.x - gap - cw; y = box.y; }                               // left
  else { x = innerWidth - cw - 24; y = innerHeight - ch - 24; }                                      // corner
  x = Math.min(Math.max(16, x), innerWidth - cw - 16);
  y = Math.min(Math.max(16, y), innerHeight - ch - 16);
  card.style.cssText = `left:${x}px;top:${y}px;width:${cw}px;`;
}
async function end() {
  if (!T) return;
  const { el, mine } = T;
  T = null; target = null;
  removeEventListener("keydown", onKey, true);
  removeEventListener("resize", place);
  $("#app").classList.remove("nav-open");
  el.classList.remove("is-on");
  setTimeout(() => el.remove(), 300);
  go("overview");
  if (mine && !S.user.user_metadata?.toured) {
    const { data } = await supa.auth.updateUser({ data: { ...S.user.user_metadata, toured: true } });
    if (data?.user) S.user = data.user;
  }
}

/* ---------- first sign-in: make the password your own ---------- */
function ownPassword() {
  return new Promise((resolve) => {
    const el = document.createElement("div");
    el.className = "tour is-on is-center";
    el.innerHTML = `<div class="tour__block tour__block--dim"></div>
      <form class="tour__card tour__card--pw" autocomplete="on">
        <p class="tour__k">Welcome, ${esc(S.me?.name || "")}</p>
        <h3 class="tour__t">First, make your password yours</h3>
        <p class="tour__x">The one Keira sent is short and only meant for today. Pick one only you know: at least 10 characters. A short phrase works, like <i>blueprint tuesdays 4pm</i>.</p>
        <input type="email" autocomplete="username" value="${esc(S.user.email)}" hidden />
        <label class="fld"><span>New password</span><input id="opw1" type="password" autocomplete="new-password" minlength="10" required /></label>
        <label class="fld"><span>Type it again</span><input id="opw2" type="password" autocomplete="new-password" minlength="10" required /></label>
        <p class="tour__err" hidden></p>
        <footer><span class="grow"></span><button class="btn btn--primary" type="submit">${icon("lock")} Save and continue</button></footer>
      </form>`;
    document.body.appendChild(el);
    const err = (m) => { const e = el.querySelector(".tour__err"); e.textContent = m; e.hidden = false; };
    el.querySelector("#opw1").focus();
    el.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const a = el.querySelector("#opw1").value, b = el.querySelector("#opw2").value;
      if (a.length < 10) return err("Use at least 10 characters.");
      if (a !== b) return err("The two passwords don’t match.");
      const btn = el.querySelector("[type=submit]");
      btn.disabled = true;
      const { data, error } = await supa.auth.updateUser({ password: a, data: { ...S.user.user_metadata, temp_password: false } });
      btn.disabled = false;
      if (error) return err(/same|different/i.test(error.message) ? "That’s the one Keira sent. Pick a new one." : "Couldn’t save. Try again.");
      if (data?.user) S.user = data.user;
      toast("Password saved");
      el.remove();
      resolve();
    });
  });
}

/* called once the workspace has loaded */
export async function firstRun() {
  const meta = S.user.user_metadata || {};
  if (meta.temp_password) await ownPassword();
  if (!meta.toured) startTour(S.me?.name);
}
