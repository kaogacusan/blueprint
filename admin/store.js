/* Workspace data: loads every table once, keeps it fresh with realtime,
   and works out the things nobody should have to type (deadlines, costs, agendas). */
import { supa } from "/admin/supa.js";
import { todayISO, addDays, workday, daysBetween, hhmm, fmtDate, fmtTime } from "/admin/lib.js";

export const S = {
  user: null,     // auth user
  me: null,       // team row of the signed-in person
  owner: false,   // only the owner can change anything
  viewAs: "",     // owner can preview someone's view
  data: {},
};

const TABLES = {
  team: ["*", "sort"],
  tasks: ["*", "sort"],
  sessions: ["*", "n"],
  milestones: ["*", "on_date"],
  orgs: ["*", "sort"],
  resources: ["*", "sort"],
  contacts: ["*", "sort"],
  guides: ["*", "sort"],
  scripts: ["*", "sort"],
  open_items: ["*", "sort"],
  settings: ["*", "key"],
  registrations: ["*", "created_at"],
  decks: ["slug, session_no, title, subtitle, slide_count, updated_at", "session_no"],
};
const PK = { sessions: "n", settings: "key", decks: "slug" };
const pk = (t) => PK[t] || "id";

const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
const emit = (table) => listeners.forEach((fn) => fn(table));

export async function reload(table) {
  const [cols, order] = TABLES[table];
  const { data, error } = await supa.from(table).select(cols).order(order, { ascending: table !== "registrations" });
  if (error) throw error;
  S.data[table] = data;
}
export async function loadAll() {
  await Promise.all(Object.keys(TABLES).map(reload));
}

/* live updates: when the owner changes something, everyone's page refreshes */
let pending = new Set(), timer = 0;
export function live() {
  supa.channel("workspace")
    .on("postgres_changes", { event: "*", schema: "public" }, (p) => {
      if (!TABLES[p.table]) return;
      pending.add(p.table);
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const tables = [...pending]; pending = new Set();
        await Promise.all(tables.map(reload)).catch(() => {});
        tables.forEach(emit);
      }, 350);
    })
    .subscribe();
}

/* ---------- writes (owner only; the database enforces it too) ---------- */
export async function create(table, values) {
  const { data, error } = await supa.from(table).insert(values).select().single();
  if (error) throw error;
  S.data[table].push(data);
  emit(table);
  return data;
}
export async function update(table, key, patch) {
  const { data, error } = await supa.from(table).update(patch).eq(pk(table), key).select().single();
  if (error) throw error;
  const list = S.data[table];
  list[list.findIndex((r) => r[pk(table)] === key)] = data;
  emit(table);
  return data;
}
export async function remove(table, key) {
  const { error } = await supa.from(table).delete().eq(pk(table), key);
  if (error) throw error;
  S.data[table] = S.data[table].filter((r) => r[pk(table)] !== key);
  emit(table);
}
/* sign-up status: anyone on the team can set it (database function checks the team list) */
export async function setRegStatus(id, status) {
  const { error } = await supa.rpc("set_registration_status", { reg_id: id, new_status: status });
  if (error) throw error;
  const r = S.data.registrations.find((x) => x.id === id);
  if (r) r.status = status;
  emit("registrations");
}
/* "paid" (sends the confirmation, or the waitlist email if the seats are full) and "resend":
   these send email, so they go through the site's server (api/signups.js), signed in as you */
export async function signupAction(action, id) {
  const { data } = await supa.auth.getSession();
  const res = await fetch("/api/signups", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token || ""}` },
    body: JSON.stringify({ action, id }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || `signups ${res.status}`);
  const r = S.data.registrations.find((x) => x.id === id);
  if (r) Object.assign(r, out.row || {}, out.emailed_at ? { emailed_at: out.emailed_at } : {});
  emit("registrations");
  return out;
}
/* owner only: delete every sign-up once the program is over (the privacy notice promises it) */
export async function eraseRegistrations() {
  const { data, error } = await supa.rpc("erase_registrations");
  if (error) throw error;
  S.data.registrations = [];
  emit("registrations");
  return data;
}
export const setting = (key) => S.data.settings?.find((s) => s.key === key)?.value || {};
export async function saveSetting(key, value) {
  const { error } = await supa.from("settings").upsert({ key, value });
  if (error) throw error;
  const row = S.data.settings.find((s) => s.key === key);
  row ? (row.value = value) : S.data.settings.push({ key, value });
  emit("settings");
}

/* ---------- people ---------- */
export const people = () => S.data.team || [];
export const names = () => people().map((p) => p.name);
/* "Lorenz" → "Renz", "rojo" → "Rojo"; unknown names stay as written */
export function canon(name = "") {
  const n = name.trim().toLowerCase();
  const p = people().find((t) => t.name.toLowerCase() === n || (t.aliases || []).some((a) => a.toLowerCase() === n));
  return p ? p.name : name.trim();
}
export const personOf = (name) => people().find((p) => p.name === canon(name));
/* whose view are we showing: the person signed in, or who the owner is previewing */
export const focusName = () => (S.owner ? S.viewAs : S.me?.name) || "";

/* ---------- tasks ---------- */
export const isDone = (t) => t.status === "Completed";
export const isLate = (t) => !isDone(t) && t.due && t.due < todayISO();
export const tasksFor = (name) => (S.data.tasks || []).filter((t) => !name || t.owners.includes(name));

/* ---------- sessions → operations deadlines ---------- */
export function opsDeadlines(session) {
  const ops = setting("ops");
  if (!session?.date) return [];
  return (ops.rules || []).map((r) => ({
    ...r,
    date: r.workdays ? workday(session.date, -r.days) : addDays(session.date, -r.days),
    session: session.n,
  }));
}
export const sessionLabel = (s) => `S${s.n} ${s.title}`;

/* Everything with a date, in one list: tasks, key dates, sessions and their deadlines. */
export function agenda({ person = "", from = "", to = "", includeDone = false } = {}) {
  const items = [];
  const has = (who) => !person || who.includes(person) || who.includes("All");
  for (const t of S.data.tasks || []) {
    if (!t.due || (!includeDone && isDone(t)) || !has(t.owners)) continue;
    items.push({ kind: "task", date: t.due, time: hhmm(t.due_time), title: t.title, who: t.owners, done: isDone(t), ref: t });
  }
  const key = (t, d) => `${d}|${String(t).toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
  const taskKeys = new Set(items.map((x) => key(x.title, x.date)));
  for (const m of S.data.milestones || []) {
    if ((!includeDone && m.done) || !has(m.who) || taskKeys.has(key(m.title, m.on_date))) continue;
    items.push({ kind: "milestone", date: m.on_date, time: hhmm(m.at_time), title: m.title, who: m.who, done: m.done, ref: m, notes: m.notes });
  }
  for (const s of S.data.sessions || []) {
    if (!s.date) continue;
    if (has(["All"])) items.push({ kind: "session", date: s.date, time: hhmm(s.start_time), title: `Session ${s.n}: ${s.title}`, who: ["All"], ref: s });
    for (const d of opsDeadlines(s)) {
      if (!has([d.owner])) continue;
      items.push({ kind: "ops", date: d.date, time: "", title: `${d.label} · S${s.n}`, who: [d.owner], ref: s });
    }
  }
  return items
    .filter((x) => (!from || x.date >= from) && (!to || x.date <= to))
    .sort((a, b) => (a.date + (a.time || "99")).localeCompare(b.date + (b.time || "99")));
}

/* ---------- budget (same math as the costing sheet) ---------- */
export function costing() {
  const c = setting("costing");
  const P = c.prices || {};
  const priceUsed = (paper) => Number(P[paper]?.[c.printer]) || 0;
  const cut = priceUsed("Cutting fee per card");
  const copies = (it, people) => (it.perPerson > 0 ? Math.ceil(it.perPerson * (people + (c.spares || 0))) : 0) + (Number(it.fixed) || 0);
  const items = (c.items || []).map((it) => {
    const cb = copies(it, c.baseline || 0), cm = copies(it, c.max || 0), price = priceUsed(it.paper);
    return { ...it, copiesBase: cb, copiesMax: cm, price,
      costBase: cb * it.sides * price + (it.isCard ? cb * cut : 0),
      costMax: cm * it.sides * price + (it.isCard ? cm * cut : 0) };
  });
  const sessions = ["S1", "S2", "S3", "S4"].map((s) => {
    const x = c.extras?.[s] || {};
    const printBase = items.filter((i) => i.session === s).reduce((a, i) => a + i.costBase, 0);
    const printMax = items.filter((i) => i.session === s).reduce((a, i) => a + i.costMax, 0);
    const extra = (Number(x.venue) || 0) + (Number(x.supplies) || 0) + (Number(x.other) || 0);
    return { s, ...x, printBase, printMax, totalBase: printBase + extra, totalMax: printMax + extra };
  });
  const totalBase = sessions.reduce((a, s) => a + s.totalBase, 0);
  const totalMax = sessions.reduce((a, s) => a + s.totalMax, 0);
  const ticket = c.ticket || 0;
  const check = (c.printers || []).map((p) => {
    const g = (paper) => P[paper]?.[p];
    const known = ["A3 colour", "A5 card colour", "A4 B/W", "Cutting fee per card"].some((k) => g(k) != null && g(k) !== "");
    const model = known ? (Number(g("A3 colour")) || 0) * 48 + (Number(g("A5 card colour")) || 0) * 208 + (Number(g("Cutting fee per card")) || 0) * 104 : null;
    const quote = c.oldQuote?.[p];
    return { printer: p, model, quote, diff: model != null && quote != null ? model - quote : null };
  });
  const pricesIn = (c.papers || []).some((paper) => P[paper]?.[c.printer] != null && P[paper]?.[c.printer] !== "");
  return {
    c, items, sessions, totalBase, totalMax, ticket, check, pricesIn,
    revenueBase: (c.baseline || 0) * ticket, revenueMax: (c.max || 0) * ticket,
    perBase: c.baseline ? totalBase / c.baseline : 0, perMax: c.max ? totalMax / c.max : 0,
    breakEvenBase: ticket ? Math.ceil(totalBase / ticket) : 0, breakEvenMax: ticket ? Math.ceil(totalMax / ticket) : 0,
  };
}

/* ---------- outreach: fill the brackets in a message for one org ---------- */
export function sessionDatesText() {
  const s = (S.data.sessions || []).filter((x) => x.date);
  if (s.length < 4) return "";
  return s.map((x) => fmtDate(x.date, { weekday: undefined })).join(", ");
}
export function fillScript(body, { org, sender } = {}) {
  const out = setting("outreach");
  const sessions = S.data.sessions || [];
  const dates = sessionDatesText();
  const venues = [...new Set(sessions.map((s) => s.venue).filter(Boolean))].join(" / ");
  const times = sessions.filter((s) => s.date && s.start_time).map((s) => {
    const start = hhmm(s.start_time), end = hhmm(s.end_time);
    const shift = (t, mins) => { const [h, m] = t.split(":").map(Number); const d = h * 60 + m + mins; return `${String(Math.floor(d / 60)).padStart(2, "0")}:${String(d % 60).padStart(2, "0")}`; };
    return `- ${fmtDate(s.date, { weekday: "long", month: "long" })}, ${fmtTime(shift(start, -30))} to ${end ? fmtTime(shift(end, 30)) : "[end plus 30 min]"}`;
  });
  let t = body;
  if (sender) t = t.replace(/I'm \[Name\]/g, `I'm ${sender}`).replace(/I’m \[Name\]/g, `I’m ${sender}`);
  if (org) {
    t = t.replace(/\[(Org|Pub|Body)\]/g, org.name.replace(/\s*\([^)]*\)\s*$/, "").trim());
    if (org.replied_by) t = t.replace(/\[Name\]/g, org.replied_by.split(",")[0].trim());
    const line = out.groups?.[org.grp]?.line;
    if (line) t = t.replace(/\[Why your members[^\]]*\]/g, line);
  }
  if (dates) t = t.replace(/\[(dates|S1 to S4)\]/g, dates);
  if (venues) t = t.replace(/\[room\]/g, venues);
  if (out.signupUrl) t = t.replace(/\[link\]/g, out.signupUrl);
  if (times.length === 4) t = t.replace(/\[session times\]/g, times.join("\n"));
  return t;
}
/* which messages fit this org, in the order they're used */
export function scriptsForOrg(org) {
  const all = (S.data.scripts || []).filter((s) => s.category === "Outreach");
  const special = setting("outreach").firstMessage?.[org.grp];
  const first = special ? all.find((s) => s.title.startsWith(special.split(" (")[0])) : all.find((s) => s.title.startsWith("Message 1"));
  const rest = all.filter((s) => /^(Message [23]|Caption|Follow-up|After they post)/.test(s.title));
  return [first, ...rest].filter(Boolean);
}
export const followUpDate = (o) => o.follow_up || (o.dm_date && ["Sent"].includes(o.status) ? workday(o.dm_date, 2) : null);

export const daysLeft = (iso) => (iso ? daysBetween(todayISO(), iso) : null);

/* ---------- who can do what ---------- */
/* guests (e.g. a guest facilitator) see the workspace but not sign-ups */
export const isGuest = () => S.me?.access === "guest";
/* the owner edits any org; teammates log progress on the orgs assigned to them */
export const canLogOrg = (o) => S.owner || (!isGuest() && !!S.me?.name && o.owner === S.me.name);
export async function logOrg(id, patch) {
  const { data, error } = await supa.rpc("update_org_progress", { org_id: id, patch });
  if (error) throw error;
  const list = S.data.orgs;
  list[list.findIndex((o) => o.id === id)] = data;
  emit("orgs");
  return data;
}

/* ---------- focus: the pages that matter most to each person (settings → focus) ---------- */
export function focusOf(name) {
  const f = setting("focus")[name];
  if (f?.tabs?.length) return f;
  // nobody set one: guess from what they own
  const tabs = [];
  if ((S.data.orgs || []).some((o) => o.owner === name)) tabs.push("outreach");
  tabs.push("tasks", "schedule");
  return { tabs, why: "" };
}
