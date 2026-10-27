/* First sign-in: pick your own password, then a short spotlight tour (10 screens max).
   Each stop = what it does (title) + one line. The tour follows each person's focus pages (settings → focus);
   settings → tour: { "<name>": "full" } gives someone the whole-workspace version (still 10 screens).
   The owner gets no tour; the ? button previews the teammate picked in "Whole team".
   Done/seen is kept on the login (user_metadata). */
import { supa } from "/admin/supa.js";
import { S, setting, focusOf, focusName, tasksFor, isDone } from "/admin/store.js";
import { $, esc, icon, fmtDate, fmtTime, toast } from "/admin/lib.js";
import { go } from "/admin/app.js";

const MAX = 10; // screens, welcome included

function ctx(name) {
  const orgs = (S.data.orgs || []).filter((o) => o.owner === name).length;
  const dl = tasksFor(name).find((t) => /^org outreach/i.test(t.title) && !isDone(t) && t.due);
  const due = dl ? `${fmtDate(dl.due, { month: undefined, day: undefined })}${dl.due_time ? " " + fmtTime(dl.due_time) : ""}` : "";
  return { name, orgs, due, focus: focusOf(name), guest: S.data.team?.find((p) => p.name === name)?.access === "guest" };
}

/* every stop: el = first selector found; side = it's in the sidebar */
const STOPS = {
  nav: () => ({ el: ".nav__label--focus, .nav__item--focus", union: true, side: true, title: "Your pages", text: "The ones you need most are at the top." }),
  "ov-focus": () => ({ view: "overview", el: ".focus", title: "Your to-dos", text: "Each card shows what needs you. Tap one to jump in." }),
  "ov-week": () => ({ view: "overview", el: ".week", title: "This week", text: "Every deadline for the next 7 days." }),
  "o-hero": (c) => ({ view: "outreach", el: ".ohero", title: "Your progress", text: c.orgs ? `${c.orgs} org${c.orgs > 1 ? "s" : ""}${c.due ? `, due ${esc(c.due)}` : ""}. This fills up as you go.` : "How many orgs have been messaged." }),
  "o-go": () => ({ view: "outreach", el: [".otile [data-go]", ".otile"], title: "Message an org", text: "Copies the message and opens their page. Just paste and send." }),
  "o-sent": () => ({ view: "outreach", el: [".otile [data-sent]", ".otile"], title: "Mark it sent", text: "Tap after sending. You’ll get a follow-up reminder." }),
  "o-tile": () => ({ view: "outreach", el: [".otile", ".obox"], title: "Got a reply?", text: "Tap the org to note who replied." }),
  "o-all": () => ({ view: "outreach", el: ["#who", ".ohero"], title: "Team outreach", text: "Pick Everyone to see the whole team’s progress." }),
  "t-row": () => ({ view: "tasks", el: [".trow", ".results"], title: "Your tasks", text: "Tap a task for its notes and files." }),
  "s-cal": () => ({ view: "schedule", el: [".calwrap", ".sessions"], title: "Schedule", text: "Sessions and deadlines on one calendar." }),
  "b-prices": () => ({ view: "budget", el: [".table--prices", ".cols--budget"], title: "Printer prices", text: "The printer quotes and what each session costs." }),
  "r-status": () => ({ view: "inquiries", el: [".table--regs select", ".table--regs", ".card.tablewrap"], title: "Mark who paid", text: "Set Paid once their GCash payment checks out." }),
  "d-deck": () => ({ view: "presentations", el: [".deck:not(.deck--soon)", ".decks"], title: "Present", text: "Tap a deck to present it full screen." }),
  "p-doors": () => ({ view: "playbook", el: ".doors", title: "Playbook", text: "Guides, messages, files and contacts." }),
  me: () => ({ el: "#tourBtn", side: true, title: "Need this again?", text: "Tap ? anytime. The key changes your password." }),
};
/* the stops for each focus page */
const PAGE = { outreach: ["o-hero", "o-go", "o-sent", "o-tile"], tasks: ["t-row"], schedule: ["s-cal"], budget: ["b-prices"], inquiries: ["r-status"], presentations: ["d-deck"], playbook: ["p-doors"] };
const FULL = ["nav", "ov-focus", "ov-week", "t-row", "s-cal", "o-all", "r-status", "d-deck", "me"];

function plan(name) {
  const c = ctx(name);
  let keys;
  if (setting("tour")[name] === "full") keys = FULL;
  else {
    const pages = c.focus.tabs.filter((id) => !(id === "inquiries" && c.guest));
    keys = pages.includes("outreach") ? ["ov-focus"] : ["nav", "ov-focus", "ov-week"];
    pages.forEach((id) => keys.push(...(PAGE[id] || [])));
    keys = [...new Set(keys)].slice(0, MAX - 2);
    keys.push("me");
  }
  const steps = keys.map((k) => STOPS[k](c));
  const welcome = {
    center: true, title: `Hi ${esc(c.name)}!`,
    text: c.orgs > 1 ? `Your ${c.orgs} orgs${c.due ? ` are due ${esc(c.due)}` : ""}. Here’s how, in ${steps.length} quick steps.`
      : `Here’s your workspace in ${steps.length} quick steps.${c.guest ? " Sign-ups stay private to the core team." : ""}`,
  };
  return [welcome, ...steps].slice(0, MAX);
}

/* ---------- the spotlight ---------- */
let T = null, target = null;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const mobile = () => innerWidth <= 900;

export function startTour(name = focusName() || S.me?.name) {
  if (T) return;
  if (S.owner && name === S.me?.name) return toast("Pick a teammate under “Whole team” on the Overview, then press ? to preview their tour.");
  const steps = plan(name);
  const el = document.createElement("div");
  el.className = "tour";
  el.innerHTML = `<div class="tour__block"></div><div class="tour__spot"></div>
    <div class="tour__card" role="dialog" aria-live="polite">
      <p class="tour__k"></p><h3 class="tour__t"></h3><p class="tour__x"></p>
      <footer><button class="tour__skip" data-skip>Skip</button><span class="grow"></span><button class="btn btn--ghost btn--sm" data-back aria-label="Back">${icon("left")}</button><button class="btn btn--primary btn--sm" data-next>Next ${icon("right")}</button></footer>
    </div>`;
  document.body.appendChild(el);
  document.body.classList.add("touring");
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
async function show() {
  const s = T.steps[T.i], my = T.i, last = T.i === T.steps.length - 1;
  // switch page without its entrance animation, and only if we're not on it already
  if (s.view && location.hash.slice(1) !== s.view) { go(s.view, {}, { quiet: true }); scrollTo(0, 0); }
  const side = !!(s.side && mobile());
  $("#app").classList.toggle("nav-open", side);
  await (side ? wait(360) : frame());
  if (!T || T.i !== my) return;
  target = s.center ? null : s.union ? unionOf(s.el) : [s.el].flat().map((q) => document.querySelector(q)).find((x) => x && x.getClientRects().length);
  if (target && !s.side) {
    const r = target.getBoundingClientRect();
    if (r.top < 70 || r.bottom > innerHeight - (mobile() ? 220 : 20)) scrollTo(0, Math.max(0, scrollY + r.top - (mobile() ? 150 : Math.max(80, (innerHeight - r.height) / 2))));
  }
  T.el.querySelector(".tour__k").textContent = T.i === 0 ? "Quick tour" : `${T.i} of ${T.steps.length - 1}`;
  T.el.querySelector(".tour__t").innerHTML = s.title;
  T.el.querySelector(".tour__x").innerHTML = s.text;
  T.el.querySelector("[data-back]").hidden = T.i === 0;
  T.el.querySelector("[data-next]").innerHTML = T.i === 0 ? `Start ${icon("right")}` : last ? `Done ${icon("check")}` : `Next ${icon("right")}`;
  T.el.classList.toggle("is-center", !target);
  place();
  T.el.querySelector("[data-next]").focus({ preventScroll: true });
}
/* one box around several elements (e.g. the "For you" label and its pages) */
function unionOf(sel) {
  const els = [...document.querySelectorAll(sel)];
  if (!els.length) return null;
  return { getBoundingClientRect() {
    const rs = els.map((e) => e.getBoundingClientRect());
    const left = Math.min(...rs.map((r) => r.left)), top = Math.min(...rs.map((r) => r.top));
    const right = Math.max(...rs.map((r) => r.right)), bottom = Math.max(...rs.map((r) => r.bottom));
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  } };
}
function place() {
  if (!T) return;
  const spot = T.el.querySelector(".tour__spot"), card = T.el.querySelector(".tour__card");
  if (!target) { spot.style.cssText = "left:50%;top:50%;width:0;height:0;"; card.style.cssText = ""; card.classList.remove("is-top"); return; }
  const r = target.getBoundingClientRect(), pad = 6;
  const box = { x: Math.max(4, r.left - pad), y: Math.max(4, r.top - pad), w: Math.min(innerWidth - 8, r.width + pad * 2), h: Math.min(innerHeight - 8, r.height + pad * 2) };
  spot.style.cssText = `left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px;`;
  card.classList.toggle("is-top", mobile() && r.top + r.height / 2 > innerHeight * 0.55);
  if (mobile()) { card.style.cssText = ""; return; } // docked at the bottom (or top) on phones
  const cw = 320, ch = card.offsetHeight || 150, gap = 16;
  let x, y;
  if (box.x + box.w + gap + cw < innerWidth - 16) { x = box.x + box.w + gap; y = box.y + box.h / 2 - ch / 2; }   // right
  else if (box.y + box.h + gap + ch < innerHeight - 16) { x = box.x + box.w / 2 - cw / 2; y = box.y + box.h + gap; } // below
  else if (box.y - gap - ch > 16) { x = box.x + box.w / 2 - cw / 2; y = box.y - gap - ch; }                        // above
  else if (box.x - gap - cw > 16) { x = box.x - gap - cw; y = box.y + box.h / 2 - ch / 2; }                          // left
  else { x = innerWidth - cw - 24; y = innerHeight - ch - 24; }
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
  document.body.classList.remove("touring");
  $("#app").classList.remove("nav-open");
  el.classList.remove("is-on");
  setTimeout(() => el.remove(), 250);
  go("overview", {}, { quiet: true });
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
        <h3 class="tour__t">Pick your own password</h3>
        <p class="tour__x">At least 10 characters. A short phrase works.</p>
        <input type="email" autocomplete="username" value="${esc(S.user.email)}" hidden />
        <label class="fld"><span>New password</span><input id="opw1" type="password" autocomplete="new-password" minlength="10" required /></label>
        <label class="fld"><span>Type it again</span><input id="opw2" type="password" autocomplete="new-password" minlength="10" required /></label>
        <p class="tour__err" hidden></p>
        <footer><span class="grow"></span><button class="btn btn--primary" type="submit">${icon("lock")} Save</button></footer>
      </form>`;
    document.body.appendChild(el);
    const err = (m) => { const e = el.querySelector(".tour__err"); e.textContent = m; e.hidden = false; };
    el.querySelector("#opw1").focus();
    el.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const a = el.querySelector("#opw1").value, b = el.querySelector("#opw2").value;
      if (a.length < 10) return err("Use at least 10 characters.");
      if (a !== b) return err("The two don’t match.");
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

/* called once the workspace has loaded (the owner skips both) */
export async function firstRun() {
  if (S.owner) return;
  const meta = S.user.user_metadata || {};
  if (meta.temp_password) await ownPassword();
  if (!meta.toured) startTour(S.me?.name);
}
