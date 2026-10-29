/* Blueprint workspace: sign in, sidebar, pages, quick search. */
import { supa, isTeam } from "/admin/supa.js";
import { S, loadAll, live, onChange, tasksFor, isDone, isGuest, focusOf, focusName } from "/admin/store.js";
import { $, $$, esc, icon, avatar, closeDrawer, linkKind, openDrawer, toast } from "/admin/lib.js";
import { openTask, quickToggle } from "/admin/ui.js";
import { firstRun, startTour } from "/admin/tour.js";
import { startPatrol } from "/admin/patrol.js";
import overview from "/admin/views/overview.js";
import tasks from "/admin/views/tasks.js";
import schedule from "/admin/views/schedule.js";
import outreach, { openOrg } from "/admin/views/outreach.js";
import playbook from "/admin/views/playbook.js";
import budget from "/admin/views/budget.js";
import inquiries from "/admin/views/inquiries.js";
import questions from "/admin/views/questions.js";
import presentations from "/admin/views/presentations.js";
import team from "/admin/views/team.js";

const NAV = [
  ["Workspace", [overview, tasks, schedule, outreach, budget]],
  ["Resources", [playbook]],
  ["Program", [inquiries, questions, presentations]],
  ["", [team]],
];
const VIEWS = Object.fromEntries(NAV.flatMap(([, vs]) => vs).map((v) => [v.id, v]));
const allowed = (id) => !(["inquiries", "questions"].includes(id) && isGuest()); // guests never see sign-ups or questions
const ALIAS = { directory: ["playbook", { tab: "files" }] }; // old links still land somewhere useful
let current = "overview";

/* ---------- routing ---------- */
export function go(id, params = {}, { quiet = false } = {}) {
  if (ALIAS[id]) [id, params] = [ALIAS[id][0], { ...ALIAS[id][1], ...params }];
  if (!VIEWS[id] || !allowed(id)) id = "overview";
  const changed = id !== current;
  current = id;
  if (location.hash.slice(1) !== id) history.replaceState(null, "", `#${id}`);
  renderNav();
  const main = $("#main");
  if (changed && !quiet) { main.classList.remove("is-in"); void main.offsetWidth; }
  VIEWS[id].render(main, params);
  if (quiet) $$(".in", main).forEach((el) => el.classList.remove("in")); // live refresh: no replayed animation
  else main.classList.add("is-in");
  if (changed) window.scrollTo({ top: 0 });
  document.title = `${VIEWS[id].title} · Blueprint`;
  $("#app").classList.remove("nav-open");
}

/* "For you" first: the pages that matter most to this person, then everything else */
function renderNav() {
  const focus = focusOf(focusName() || S.me?.name).tabs.filter((id) => VIEWS[id] && allowed(id));
  const groups = [["For you", focus.map((id) => VIEWS[id])], ...NAV.map(([label, vs]) => [label, vs.filter((v) => !focus.includes(v.id) && allowed(v.id))])].filter(([, vs]) => vs.length);
  const item = (v, star) => { const b = v.badge?.(); return `<a href="#${v.id}" class="nav__item ${star ? "nav__item--focus" : ""} ${v.id === current ? "is-on" : ""}" data-view="${v.id}">${icon(v.icon)}<span>${v.title}</span>${b ? `<b class="nav__badge">${b}</b>` : ""}</a>`; };
  $("#nav").innerHTML = groups.map(([label, vs], gi) => `
    ${label ? `<p class="nav__label ${gi === 0 ? "nav__label--focus" : ""}">${label}</p>` : `<hr class="nav__hr" />`}
    ${vs.map((v) => item(v, gi === 0)).join("")}`).join("");
  // teammates see how many of their own tasks are still open
  if (!S.owner && S.me) {
    const n = tasksFor(S.me.name).filter((t) => !isDone(t)).length;
    const el = $('#nav [data-view="tasks"]');
    if (n && el && !el.querySelector(".nav__badge")) el.insertAdjacentHTML("beforeend", `<b class="nav__badge nav__badge--soft">${n}</b>`);
  }
}

/* ---------- quick search (⌘K) ---------- */
function paletteItems() {
  const items = Object.values(VIEWS).map((v) => ({ kind: "Page", ic: v.icon, title: v.title, run: () => go(v.id) }));
  (S.data.tasks || []).forEach((t) => items.push({ kind: "Task", ic: "tasks", title: t.title, sub: `${t.owners.join(", ")}${t.status ? " · " + t.status : ""}`, run: () => { go("tasks"); openTask(t.id); } }));
  (S.data.orgs || []).forEach((o) => items.push({ kind: "Org", ic: "send", title: o.name, sub: `${o.owner} · ${o.status}`, run: () => { go("outreach"); openOrg(o.id); } }));
  (S.data.resources || []).forEach((r) => items.push({ kind: "Link", ic: linkKind(r.url)[0], title: r.label, sub: r.category, run: () => window.open(r.url, "_blank", "noopener") }));
  (S.data.contacts || []).forEach((c) => items.push({ kind: "Contact", ic: "mail", title: c.name, sub: c.email || c.org, run: () => go("playbook", { tab: "contacts" }) }));
  (S.data.guides || []).forEach((g) => items.push({ kind: "Guide", ic: "book", title: g.title, sub: g.category, run: () => go("playbook", { tab: "guides", item: g.id }) }));
  (S.data.scripts || []).forEach((g) => items.push({ kind: "Script", ic: "message", title: g.title, sub: g.category, run: () => go("playbook", { tab: "scripts", item: g.id }) }));
  (S.data.team || []).forEach((p) => items.push({ kind: "Person", ic: "users", title: p.name, sub: p.role_title, run: () => go("tasks", { person: p.name }) }));
  return items;
}
let palIdx = 0, palResults = [];
function openPalette() {
  const p = $("#palette");
  p.hidden = false;
  requestAnimationFrame(() => p.classList.add("is-open"));
  const input = $("#palInput");
  input.value = "";
  runPalette("");
  input.focus();
}
function closePalette() { const p = $("#palette"); p.classList.remove("is-open"); setTimeout(() => (p.hidden = true), 180); }
function runPalette(q) {
  const all = paletteItems();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  palResults = (words.length ? all.filter((it) => words.every((w) => `${it.title} ${it.sub || ""} ${it.kind}`.toLowerCase().includes(w))) : all.filter((it) => it.kind === "Page")).slice(0, 40);
  palIdx = 0;
  paintPalette();
}
function paintPalette() {
  $("#palList").innerHTML = palResults.length ? palResults.map((it, i) => `<li class="${i === palIdx ? "is-on" : ""}" data-i="${i}">${icon(it.ic)}<span><b>${esc(it.title)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</span><em>${it.kind}</em></li>`).join("") : `<li class="pal__none">No matches</li>`;
  $("#palList .is-on")?.scrollIntoView({ block: "nearest" });
}

/* ---------- sign in (Keira makes every account; there's no public sign-up) ---------- */
const friendly = (e) => {
  const m = e?.message || "";
  if (/invalid login credentials/i.test(m)) return "Wrong email or password. Forgot it? Ask Keira for a new one.";
  if (/rate limit|too many/i.test(m)) return "Too many tries. Wait a few minutes, then try again.";
  return m || "Something went wrong. Try again.";
};

/* change your own password (the one Keira sent is only for the first sign-in) */
function changePassword() {
  openDrawer({
    eyebrow: "Your account",
    title: "Change your password",
    body: `<form class="form" id="pwForm" autocomplete="on">
      <input type="email" autocomplete="username" value="${esc(S.user.email)}" hidden />
      <label class="fld fld--full"><span>New password</span><input id="pw1" type="password" autocomplete="new-password" minlength="10" required /><small>At least 10 characters. A short sentence is easy to remember.</small></label>
      <label class="fld fld--full"><span>Type it again</span><input id="pw2" type="password" autocomplete="new-password" minlength="10" required /></label>
    </form>`,
    actions: `<span class="grow"></span><button class="btn btn--primary" data-save>${icon("check")} Save password</button>`,
    onMount(root) {
      root.querySelector("[data-save]").addEventListener("click", async () => {
        const a = root.querySelector("#pw1").value, b = root.querySelector("#pw2").value;
        if (a.length < 10) return toast("Use at least 10 characters.", "bad");
        if (a !== b) return toast("The two passwords don’t match.", "bad");
        const { error } = await supa.auth.updateUser({ password: a });
        if (error) return toast(/same|different/i.test(error.message) ? "That’s your current password. Pick a new one." : "Couldn’t save. Try again.", "bad");
        closeDrawer(); toast("Password changed");
      });
    },
  });
}
let scene3d = null;
function showAuth(msg = "") {
  $("#boot").hidden = true;
  $("#app").hidden = true;
  $("#auth").hidden = false;
  if (msg) { $("#authErr").textContent = msg; $("#authErr").hidden = false; }
  scene3d ||= import("/admin/login3d.js").then((m) => m.mount($("#authScene"))).catch((e) => console.warn("[3D]", e));
}

/* ---------- start ---------- */
async function start() {
  const { data: { session } } = await supa.auth.getSession();
  if (!session) return showAuth();
  if (!(await isTeam())) { await supa.auth.signOut(); return showAuth("That account isn’t on the team anymore."); }
  const next = new URLSearchParams(location.search).get("next");
  if (next && next.startsWith("/present/")) return location.replace(next);

  S.user = session.user;
  try { await loadAll(); } catch (e) { console.error(e); $("#boot").innerHTML = `<p>Couldn’t load the workspace. Refresh to try again.</p>`; return; }
  S.me = S.data.team.find((p) => p.email === S.user.email) || { name: S.user.email.split("@")[0], role_title: "" };
  S.owner = S.me.access === "owner";

  $("#auth").hidden = true;
  $("#boot").hidden = true;
  $("#app").hidden = false;
  scene3d?.then((s) => s?.stop?.());
  document.body.classList.toggle("is-owner", S.owner);
  const access = S.owner ? `${icon("sparkles")}Owner` : isGuest() ? "Guest" : "Team member";
  $("#me").innerHTML = `${avatar(S.me.name, "md")}<span><b>${esc(S.me.name)}</b><small>${access}</small></span>`;
  live();
  startPatrol(); // Keira and Renz only
  // re-draw the page when data changes, unless someone is typing in it
  onChange(() => { if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) renderNav(); else go(current, {}, { quiet: true }); });
  go(location.hash.slice(1) || "overview");
  firstRun(); // first sign-in: own password, then the tour
}

/* ---------- events ---------- */
$("#authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#authEmail").value.trim().toLowerCase(), password = $("#authPass").value;
  if (!email || password.length < 8) { $("#authErr").textContent = "Enter your email and a password of at least 8 characters."; $("#authErr").hidden = false; return; }
  const btn = $("#authBtn");
  btn.disabled = true;
  btn.classList.add("is-loading");
  $("#authErr").hidden = true;
  const { error } = await supa.auth.signInWithPassword({ email, password });
  btn.disabled = false;
  btn.classList.remove("is-loading");
  if (error) { $("#authErr").textContent = friendly(error); $("#authErr").hidden = false; return; }
  $("#auth").hidden = true;
  $("#boot").hidden = false;
  start();
});
document.addEventListener("click", (e) => {
  const nav = e.target.closest("[data-view]");
  if (nav && nav.closest("#nav")) { e.preventDefault(); return go(nav.dataset.view); }
  const q = e.target.closest("[data-quick]");
  if (q) return quickToggle(q.dataset.quick);
  // any task row anywhere opens the task panel
  const t = e.target.closest("[data-task]");
  if (t && !e.target.closest("a, [data-quick]")) openTask(t.dataset.task);
  if (e.target.closest("[data-close-drawer]")) closeDrawer();
});
$("#pwBtn").addEventListener("click", changePassword);
$("#tourBtn").addEventListener("click", () => startTour());
$("#signOut").addEventListener("click", async () => { await supa.auth.signOut(); location.replace("/admin/"); });
$("#menuBtn").addEventListener("click", () => $("#app").classList.add("nav-open"));
$("#scrim").addEventListener("click", () => $("#app").classList.remove("nav-open"));
$("#searchBtn").addEventListener("click", openPalette);
window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (h && h !== current && (VIEWS[h] || ALIAS[h])) go(h); });

$("#palInput").addEventListener("input", (e) => runPalette(e.target.value));
$("#palList").addEventListener("click", (e) => { const li = e.target.closest("[data-i]"); if (li) { closePalette(); palResults[li.dataset.i].run(); } });
$("#palette").addEventListener("click", (e) => { if (e.target.id === "palette") closePalette(); });
document.addEventListener("keydown", (e) => {
  if ($("#app").hidden) return;
  const pal = !$("#palette").hidden;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal ? closePalette() : openPalette(); return; }
  if (e.key === "/" && !pal && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); openPalette(); return; }
  if (pal) {
    if (e.key === "Escape") closePalette();
    if (e.key === "ArrowDown") { palIdx = Math.min(palResults.length - 1, palIdx + 1); paintPalette(); e.preventDefault(); }
    if (e.key === "ArrowUp") { palIdx = Math.max(0, palIdx - 1); paintPalette(); e.preventDefault(); }
    if (e.key === "Enter" && palResults[palIdx]) { closePalette(); palResults[palIdx].run(); }
    return;
  }
  if (e.key === "Escape") { closeDrawer(); $("#app").classList.remove("nav-open"); }
  if (e.key === "Enter" && document.activeElement?.matches("[data-task]")) openTask(document.activeElement.dataset.task);
});

start();
