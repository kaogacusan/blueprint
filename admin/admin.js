/* Blueprint admin: sign in, inquiries, presentations, team. */
import { supa, isTeam } from "/admin/supa.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const toastEl = $("#toast");
let toastTimer = 0;
const toast = (msg) => {
  toastEl.textContent = msg;
  toastEl.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 2400);
};

/* ---------- Sign in / create account ---------- */
const authView = $("#auth");
const appView = $("#app");
const form = $("#authForm");
const err = $("#authErr");
let creating = false;

const setMode = (create) => {
  creating = create;
  $("#authTitle").textContent = create ? "Create your account" : "Team sign in";
  $("#authSub").textContent = create
    ? "Use the email a teammate added to the team list, and pick a password."
    : "For the Blueprint team only.";
  $("#authBtn").textContent = create ? "Create account" : "Sign in";
  $("#authSwitchText").textContent = create ? "Already have an account?" : "First time here?";
  $("#authSwitch").textContent = create ? "Sign in" : "Create your account";
  $("#authPass").autocomplete = create ? "new-password" : "current-password";
  err.hidden = true;
};
$("#authSwitch").addEventListener("click", () => setMode(!creating));

const friendly = (e) => {
  const m = e?.message || "";
  if (/database error saving new user|not_on_team/i.test(m)) return "That email isn’t on the team list yet. Ask a teammate to add it under Team.";
  if (/invalid login credentials/i.test(m)) return "Wrong email or password.";
  if (/already registered/i.test(m)) return "That email already has an account. Sign in instead.";
  if (/password/i.test(m)) return "Your password needs at least 8 characters.";
  return m || "Something went wrong. Try again.";
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#authEmail").value.trim().toLowerCase();
  const password = $("#authPass").value;
  if (!email || password.length < 8) { err.textContent = "Enter your email and a password of at least 8 characters."; err.hidden = false; return; }
  const btn = $("#authBtn");
  btn.disabled = true;
  err.hidden = true;
  const { error } = creating
    ? await supa.auth.signUp({ email, password })
    : await supa.auth.signInWithPassword({ email, password });
  btn.disabled = false;
  if (error) { err.textContent = friendly(error); err.hidden = false; return; }
  start();
});

$("#signOut").addEventListener("click", async () => {
  await supa.auth.signOut();
  location.reload();
});

/* ---------- Tabs ---------- */
const showTab = (name) => {
  $$(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
  $$(".panel").forEach((p) => (p.hidden = p.dataset.panel !== name));
  history.replaceState(null, "", `#${name}`);
  if (name === "inquiries") loadInquiries();
  if (name === "presentations") loadDecks();
  if (name === "team") loadTeam();
};
$$(".tab").forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));

/* ---------- Inquiries ---------- */
const STATUSES = [
  ["new", "New"],
  ["emailed", "Emailed"],
  ["confirmed", "Confirmed"],
  ["archived", "Archived"],
];
let regs = [];

const fmtDate = (iso) => new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const filtered = () => {
  const q = $("#search").value.trim().toLowerCase();
  const st = $("#statusFilter").value;
  return regs.filter((r) =>
    (!st || r.status === st) &&
    (!q || [r.name, r.email, r.course, r.year, r.notes].join(" ").toLowerCase().includes(q))
  );
};

const renderStats = () => {
  const count = (s) => regs.filter((r) => r.status === s).length;
  const items = [["Total", regs.length, ""], ...STATUSES.slice(0, 3).map(([k, label]) => [label, count(k), k])];
  $("#stats").innerHTML = items
    .map(([label, n, k]) => `<button class="stat ${k && $("#statusFilter").value === k ? "is-on" : ""}" data-k="${k}"><b>${n}</b><span>${label}</span></button>`)
    .join("");
  const fresh = count("new");
  $("#newCount").hidden = !fresh;
  $("#newCount").textContent = fresh;
};

const renderRows = () => {
  const list = filtered();
  $("#rows").innerHTML = list
    .map((r) => `
      <tr data-id="${r.id}" class="st-${r.status}">
        <td class="t-date">${esc(fmtDate(r.created_at))}</td>
        <td class="t-name">${esc(r.name)}</td>
        <td><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></td>
        <td>${esc(r.course)}</td>
        <td class="t-year">${esc(r.year)}</td>
        <td><select class="pill pill--${r.status}" data-field="status">${STATUSES.map(([k, l]) => `<option value="${k}" ${k === r.status ? "selected" : ""}>${l}</option>`).join("")}</select></td>
        <td><input class="note" data-field="notes" value="${esc(r.notes)}" placeholder="Add a note" maxlength="2000" /></td>
        <td><button class="x" data-del title="Delete">✕</button></td>
      </tr>`)
    .join("");
  $("#empty").hidden = list.length > 0;
  $("#empty").textContent = regs.length ? "Nothing matches that search." : "No inquiries yet. When someone registers on the site, they show up here.";
  const emails = list.map((r) => r.email);
  $("#mailAll").href = emails.length ? `mailto:?bcc=${encodeURIComponent(emails.join(","))}` : "#";
};

async function loadInquiries() {
  const { data, error } = await supa.from("registrations").select("*").order("created_at", { ascending: false });
  if (error) { toast("Couldn’t load inquiries."); return; }
  regs = data;
  renderStats();
  renderRows();
}

const update = async (id, patch) => {
  const { error } = await supa.from("registrations").update(patch).eq("id", id);
  if (error) { toast("Couldn’t save. Try again."); return false; }
  Object.assign(regs.find((r) => r.id === id), patch);
  return true;
};

$("#rows").addEventListener("change", async (e) => {
  const tr = e.target.closest("tr");
  const field = e.target.dataset.field;
  if (!tr || !field) return;
  const id = Number(tr.dataset.id);
  if (await update(id, { [field]: e.target.value })) {
    if (field === "status") { e.target.className = `pill pill--${e.target.value}`; tr.className = `st-${e.target.value}`; renderStats(); }
    toast("Saved");
  }
});
$("#rows").addEventListener("click", async (e) => {
  if (!e.target.closest("[data-del]")) return;
  const tr = e.target.closest("tr");
  const r = regs.find((x) => x.id === Number(tr.dataset.id));
  if (!confirm(`Delete ${r.name} (${r.email})? This can’t be undone.`)) return;
  const { error } = await supa.from("registrations").delete().eq("id", r.id);
  if (error) { toast("Couldn’t delete."); return; }
  regs = regs.filter((x) => x !== r);
  renderStats();
  renderRows();
  toast("Deleted");
});
$("#stats").addEventListener("click", (e) => {
  const b = e.target.closest(".stat");
  if (!b) return;
  $("#statusFilter").value = $("#statusFilter").value === b.dataset.k ? "" : b.dataset.k;
  renderStats();
  renderRows();
});
$("#search").addEventListener("input", renderRows);
$("#statusFilter").addEventListener("change", () => { renderStats(); renderRows(); });
$("#refresh").addEventListener("click", () => loadInquiries().then(() => toast("Up to date")));

$("#copyEmails").addEventListener("click", async () => {
  const emails = filtered().map((r) => r.email);
  if (!emails.length) return toast("No emails to copy.");
  await navigator.clipboard.writeText(emails.join(", "));
  toast(`Copied ${emails.length} email${emails.length > 1 ? "s" : ""}`);
});

$("#exportCsv").addEventListener("click", () => {
  const cols = ["created_at", "name", "email", "course", "year", "status", "notes"];
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.join(","), ...filtered().map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `blueprint-inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});

/* ---------- Presentations ---------- */
async function loadDecks() {
  const { data, error } = await supa.from("decks").select("slug, session_no, title, subtitle, slide_count, updated_at").order("session_no");
  if (error) { toast("Couldn’t load presentations."); return; }
  const bySession = new Map(data.map((d) => [d.session_no, d]));
  const extra = data.filter((d) => !(d.session_no >= 1 && d.session_no <= 4));
  const cards = [1, 2, 3, 4].map((n) => {
    const d = bySession.get(n);
    if (!d) return `
      <div class="deck deck--soon">
        <span class="deck__num">0${n}</span>
        <p class="deck__title">Session ${n}</p>
        <p class="deck__sub">Not uploaded yet.</p>
      </div>`;
    return deckCard(d, n);
  });
  $("#decks").innerHTML = cards.join("") + extra.map((d) => deckCard(d)).join("");
}
const deckCard = (d, n) => `
  <a class="deck" href="/present/${esc(d.slug)}" target="_blank" rel="noopener">
    <span class="deck__num">${n ? `0${n}` : "★"}</span>
    <p class="deck__kicker">Session ${n ?? "–"} · ${d.slide_count} slides</p>
    <p class="deck__title">${esc(d.title)}</p>
    <p class="deck__sub">${esc(d.subtitle)}</p>
    <span class="deck__go">Present <span aria-hidden="true">↗</span></span>
  </a>`;

/* ---------- Team ---------- */
let me = "";
async function loadTeam() {
  const { data, error } = await supa.from("team").select("*").order("added_at");
  if (error) { toast("Couldn’t load the team."); return; }
  $("#team").innerHTML = data
    .map((t) => `
      <li class="mate">
        <span class="mate__av">${esc((t.name || t.email)[0].toUpperCase())}</span>
        <span class="mate__who"><b>${esc(t.name || t.email.split("@")[0])}</b><span>${esc(t.email)}</span></span>
        ${t.email === me ? `<span class="mate__you">You</span>` : `<button class="x" data-email="${esc(t.email)}" title="Remove">✕</button>`}
      </li>`)
    .join("");
}
$("#addTeam").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#teamEmail").value.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast("Enter a valid email.");
  const { error } = await supa.from("team").insert({ email, name: $("#teamName").value.trim(), added_by: me });
  if (error) return toast(/duplicate/i.test(error.message) ? "Already on the team." : "Couldn’t add them.");
  e.target.reset();
  toast("Added. They can now create their account.");
  loadTeam();
});
$("#team").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-email]");
  if (!b || !confirm(`Remove ${b.dataset.email} from the team? They lose access right away.`)) return;
  const { error } = await supa.from("team").delete().eq("email", b.dataset.email);
  if (error) return toast("Couldn’t remove them.");
  toast("Removed");
  loadTeam();
});

/* ---------- Start ---------- */
async function start() {
  const { data } = await supa.auth.getSession();
  if (!data.session) { authView.hidden = false; appView.hidden = true; return; }
  if (!(await isTeam())) {
    await supa.auth.signOut();
    authView.hidden = false;
    appView.hidden = true;
    err.textContent = "That account isn’t on the team list anymore.";
    err.hidden = false;
    return;
  }
  // came here from a presentation link while signed out → go back to it
  const next = new URLSearchParams(location.search).get("next");
  if (next && next.startsWith("/present/")) { location.replace(next); return; }

  me = data.session.user.email;
  $("#meEmail").textContent = me;
  authView.hidden = true;
  appView.hidden = false;
  const tab = location.hash.slice(1);
  showTab(["inquiries", "presentations", "team"].includes(tab) ? tab : "inquiries");
}
start();
