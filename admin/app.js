/* Blueprint workspace: sign in, top tabs, pages, quick search. */
import { supa, isTeam } from "/admin/supa.js";
import { S, loadAll, live, onChange, isLate, agenda } from "/admin/store.js";
import { $, $$, esc, icon, avatar, closeDrawer, linkKind, todayISO, instant, countdownParts, pad2 } from "/admin/lib.js";
import { openTask, quickToggle } from "/admin/ui.js";
import overview from "/admin/views/overview.js";
import tasks from "/admin/views/tasks.js";
import schedule from "/admin/views/schedule.js";
import outreach, { openOrg } from "/admin/views/outreach.js";
import playbook from "/admin/views/playbook.js";
import budget from "/admin/views/budget.js";
import inquiries from "/admin/views/inquiries.js";
import presentations from "/admin/views/presentations.js";
import team from "/admin/views/team.js";

const PRIMARY = [overview, tasks, schedule, outreach, playbook];
const MORE = [budget, inquiries, presentations, team];
const VIEWS = Object.fromEntries([...PRIMARY, ...MORE].map((v) => [v.id, v]));
const ALIAS = { directory: ["playbook", { tab: "files" }] }; // old links still land somewhere useful
let current = "overview", enterT = 0;

/* ---------- routing ---------- */
export function go(id, params = {}, { quiet = false } = {}) {
  if (ALIAS[id]) [id, params] = [ALIAS[id][0], { ...ALIAS[id][1], ...params }];
  if (!VIEWS[id]) id = "overview";
  const changed = id !== current;
  current = id;
  if (location.hash.slice(1) !== id) history.replaceState(null, "", `#${id}`);
  renderNav();
  const main = $("#main");
  VIEWS[id].render(main, params);
  if (quiet) {
    // live refresh: redraw in place without replaying the entrance
    $$(".in", main).forEach((el) => el.classList.remove("in"));
  } else {
    main.classList.remove("is-enter");
    [...main.children].forEach((el, i) => el.style.setProperty("--k", i));
    void main.offsetWidth;
    main.classList.add("is-enter");
    clearTimeout(enterT);
    enterT = setTimeout(() => main.classList.remove("is-enter"), 1200); // later redraws only animate their rows
    if (changed) window.scrollTo({ top: 0 });
  }
  document.title = `${VIEWS[id].title} · Blueprint`;
  closeMenus();
}

const no = (v) => pad2(PRIMARY.indexOf(v) + 1);
function renderNav() {
  const badge = (v) => { const b = v.badge?.(); return b ? `<b class="tab__badge">${b}</b>` : ""; };
  $("#tabs").innerHTML = PRIMARY.map((v) => `<a href="#${v.id}" class="tab ${v.id === current ? "is-on" : ""}" data-view="${v.id}"><em>${no(v)}</em><span>${v.title}</span>${badge(v)}</a>`).join("") + `<i class="tabs__bar" id="tabBar"></i>`;
  const inMore = MORE.some((v) => v.id === current);
  $("#moreBtn").classList.toggle("is-on", inMore);
  $("#moreBtn span").textContent = inMore ? VIEWS[current].title : "More";
  // Playbook only shows here on phones, where the dock has room for four tabs
  $("#morePop").innerHTML = [playbook, ...MORE].map((v) => `<a href="#${v.id}" class="menu__item ${v === playbook ? "menu__item--m" : ""} ${v.id === current ? "is-on" : ""}" data-view="${v.id}">${icon(v.icon)}<span>${v.title}</span>${badge(v)}</a>`).join("");
  $("#dock").innerHTML = [...PRIMARY.slice(0, 4), { id: "_more", title: "More", icon: "more" }].map((v) => `<a href="#${v.id}" class="dock__item ${v.id === current || (v.id === "_more" && (inMore || current === "playbook")) ? "is-on" : ""}" data-view="${v.id}">${icon(v.icon)}<span>${v.title}</span></a>`).join("");
  requestAnimationFrame(moveBar);
}
let barReady = false;
function moveBar() {
  const bar = $("#tabBar"), on = $(".tab.is-on");
  if (!bar) return;
  if (!on) { bar.style.opacity = 0; return; }
  if (!barReady) bar.style.transition = "none";
  bar.style.opacity = 1;
  bar.style.transform = `translateX(${on.offsetLeft}px)`;
  bar.style.width = `${on.offsetWidth}px`;
  if (!barReady) { void bar.offsetWidth; bar.style.transition = ""; barReady = true; }
}
window.addEventListener("resize", moveBar);

/* ---------- status strip: a live readout under the tabs ---------- */
const MNL = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const DAY = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", weekday: "short", day: "2-digit", month: "short", year: "numeric" });
let stripNext = null;
function renderStrip() {
  const today = todayISO();
  stripNext = agenda({ from: today }).find((x) => (x.kind === "milestone" || x.kind === "session") && !x.done && instant(x.date, x.time) > new Date()) || null;
  const late = (S.data.tasks || []).filter(isLate).length;
  $("#strip").innerHTML = `
    <span class="strip__live"><i></i>Live</span>
    <span class="strip__cell">${esc(DAY.format(new Date()).toUpperCase())}</span>
    <span class="strip__cell" id="stripClock">${MNL.format(new Date())} MNL</span>
    ${stripNext ? `<span class="strip__cell strip__next"><em>Next</em><b>${esc(stripNext.title)}</b><span id="stripCd"></span></span>` : ""}
    <span class="grow"></span>
    ${late ? `<a href="#tasks" class="strip__cell strip__late" data-view="tasks">${late} late</a>` : ""}
    <span class="strip__cell">${S.owner ? "Owner · can edit" : "View only"}</span>`;
  tickStrip();
}
function tickStrip() {
  const c = $("#stripClock");
  if (c) c.textContent = `${MNL.format(new Date())} MNL`;
  const cd = $("#stripCd");
  if (cd && stripNext) { const p = countdownParts(instant(stripNext.date, stripNext.time)); cd.textContent = `T−${p.d ? `${p.d}d ` : ""}${pad2(p.h)}:${pad2(p.m)}:${pad2(p.s)}`; }
}
setInterval(() => { if (!$("#app").hidden) tickStrip(); }, 1000);

/* ---------- menus ---------- */
function toggleMenu(id, open) {
  const m = $(`#${id}`), btn = m.querySelector("button");
  const on = open ?? !m.classList.contains("is-open");
  closeMenus();
  m.classList.toggle("is-open", on);
  btn.setAttribute("aria-expanded", on);
}
function closeMenus() { $$(".menu.is-open").forEach((m) => { m.classList.remove("is-open"); m.querySelector("button").setAttribute("aria-expanded", "false"); }); }

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
  closeMenus();
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

/* ---------- sign in ---------- */
let creating = false;
function setMode(create) {
  creating = create;
  $("#authTitle").textContent = create ? "Create your account" : "Welcome back";
  $("#authSub").textContent = create ? "Use the email Keira added to the team, and pick a password." : "Sign in to the Blueprint workspace.";
  $("#authBtn").textContent = create ? "Create account" : "Sign in";
  $("#authSwitchText").textContent = create ? "Already have an account?" : "First time here?";
  $("#authSwitch").textContent = create ? "Sign in" : "Create your account";
  $("#authPass").autocomplete = create ? "new-password" : "current-password";
  $("#authErr").hidden = true;
}
const friendly = (e) => {
  const m = e?.message || "";
  if (/database error saving new user|not_on_team/i.test(m)) return "That email isn’t on the team yet. Ask Keira to add it.";
  if (/invalid login credentials/i.test(m)) return "Wrong email or password.";
  if (/already registered/i.test(m)) return "That email already has an account. Sign in instead.";
  if (/password/i.test(m)) return "Your password needs at least 8 characters.";
  return m || "Something went wrong. Try again.";
};
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
  $("#me").innerHTML = `${avatar(S.me.name, "md")}<span class="me__t"><b>${esc(S.me.name)}</b><small>${S.owner ? "Owner" : "View only"}</small></span>${icon("down", "me__chev")}`;
  $("#mePop").innerHTML = `
    <p class="menu__head"><b>${esc(S.me.name)}</b><small>${esc(S.user.email)}</small><small>${esc(S.me.role_title || "")}</small></p>
    <a class="menu__item" href="/" target="_blank" rel="noopener">${icon("globe")}<span>Public site</span></a>
    <button class="menu__item" id="signOut">${icon("logout")}<span>Sign out</span></button>`;
  $("#signOut").addEventListener("click", async () => { await supa.auth.signOut(); location.replace("/admin/"); });
  live();
  renderStrip();
  // re-draw the page when data changes, unless someone is typing in it
  onChange(() => { renderStrip(); if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) renderNav(); else go(current, {}, { quiet: true }); });
  go(location.hash.slice(1) || "overview");
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
  const { error } = creating ? await supa.auth.signUp({ email, password }) : await supa.auth.signInWithPassword({ email, password });
  btn.disabled = false;
  btn.classList.remove("is-loading");
  if (error) { $("#authErr").textContent = friendly(error); $("#authErr").hidden = false; return; }
  $("#auth").hidden = true;
  $("#boot").hidden = false;
  start();
});
$("#authSwitch").addEventListener("click", () => setMode(!creating));
document.addEventListener("click", (e) => {
  const nav = e.target.closest("[data-view]");
  if (nav && nav.closest("#tabs, #morePop, #dock, #strip")) {
    e.preventDefault();
    if (nav.dataset.view === "_more") return toggleMenu("moreMenu", true);
    return go(nav.dataset.view);
  }
  if (e.target.closest("#moreBtn")) return toggleMenu("moreMenu");
  if (e.target.closest("#me")) return toggleMenu("meMenu");
  if (!e.target.closest(".menu__pop")) closeMenus();
  const q = e.target.closest("[data-quick]");
  if (q) return quickToggle(q.dataset.quick);
  // any task row anywhere opens the task panel
  const t = e.target.closest("[data-task]");
  if (t && !e.target.closest("a, [data-quick]")) openTask(t.dataset.task);
  if (e.target.closest("[data-close-drawer]")) closeDrawer();
});
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
  if (e.key === "Escape") { closeMenus(); closeDrawer(); }
  if (e.key === "Enter" && document.activeElement?.matches("[data-task]")) openTask(document.activeElement.dataset.task);
});

start();
