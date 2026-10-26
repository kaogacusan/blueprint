/* Import from Excel (owner only).
   Drop in the project log or the costing sheet Thomas sends. You see every change before it's saved. */
import { S, create, update, canon, people, setting, saveSetting } from "/admin/store.js";
import { esc, icon, openDrawer, closeDrawer, toast, fmtDate, plural } from "/admin/lib.js";

let XLSX = null;
const loadXLSX = () => XLSX ? Promise.resolve(XLSX) : new Promise((res, rej) => {
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
  s.onload = () => res((XLSX = window.XLSX));
  s.onerror = () => rej(new Error("Couldn’t load the Excel reader."));
  document.head.appendChild(s);
});

/* ---------- reading cells ---------- */
const cell = (ws, a) => ws?.[a];
const val = (ws, a) => { const c = cell(ws, a); return c == null ? null : c.v; };
const str = (ws, a) => { const v = val(ws, a); return v == null ? "" : String(v).trim(); };
const numOrNull = (ws, a) => { const v = val(ws, a); return v === "" || v == null || isNaN(Number(v)) ? null : Number(v); };
const serialToISO = (n) => new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 864e5).toISOString().slice(0, 10);
function dateOf(ws, a) {
  const v = val(ws, a);
  if (typeof v === "number") return serialToISO(v);
  if (typeof v === "string" && v.trim()) { const d = new Date(v); return isNaN(d) ? null : d.toISOString().slice(0, 10); }
  return null;
}
function timeOf(ws, a) {
  const v = val(ws, a);
  if (typeof v === "number") { const m = Math.round((v % 1) * 1440); return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; }
  const m = String(v || "").match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|nn)?/i);
  if (!m) return null;
  let h = Number(m[1]); const mi = Number(m[2] || 0), ap = (m[3] || "").toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}
const URL_RE = /https?:\/\/[^\s<>"')|]+/g;
const kindLabel = (u) => (/drive\.google\.com\/drive\/folders/.test(u) ? "Drive folder" : /document/.test(u) ? "Google Doc" : /spreadsheets/.test(u) ? "Google Sheet" : /drive\.google\.com\/file/.test(u) ? "Drive file" : /canva/.test(u) ? "Canva" : "Link");
function linksOf(ws, a) {
  const out = [], seen = new Set();
  for (const line of str(ws, a).split(/\n/)) {
    for (const m of line.matchAll(URL_RE)) {
      const url = m[0].replace(/[.,]+$/, "");
      const before = line.slice(0, m.index).trim().replace(/[:\s|-]+$/, "");
      if (!seen.has(url)) { seen.add(url); out.push({ label: before && before.length <= 40 ? before : kindLabel(url), url }); }
    }
  }
  const h = cell(ws, a)?.l?.Target;
  if (h && !seen.has(h)) out.push({ label: kindLabel(h), url: h });
  return out;
}
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const sessionOf = (title) => { const m = title.match(/^(?:S|Session )([1-4])\b/); return m ? `S${m[1]}` : ""; };

/* ---------- plans ---------- */
function planProjectLog(ws) {
  const unknown = new Set();
  const known = new Set(people().map((p) => p.name));
  const plan = { kind: "Project log", creates: [], updates: [], unknown };
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let r = 4; r <= range.e.r + 1; r++) {
    const title = str(ws, `A${r}`);
    if (!title) continue;
    const owners = str(ws, `E${r}`).split(/[,/&]/).map((x) => canon(x)).filter(Boolean);
    owners.forEach((o) => !known.has(o) && unknown.add(o));
    const row = {
      title, session: sessionOf(title), owners,
      priority: ["Critical", "High", "Medium", "Low"].includes(str(ws, `D${r}`)) ? str(ws, `D${r}`) : "Medium",
      status: ["Not Started", "In Progress", "Blocked", "Completed"].includes(str(ws, `F${r}`)) ? str(ws, `F${r}`) : "Not Started",
      assigned_on: dateOf(ws, `B${r}`), due: dateOf(ws, `C${r}`),
      notes: str(ws, `G${r}`), links: linksOf(ws, `H${r}`), outputs: linksOf(ws, `I${r}`),
    };
    const existing = (S.data.tasks || []).find((t) => norm(t.title) === norm(title));
    if (!existing) { plan.creates.push({ ...row, source: "project log", sort: r }); continue; }
    const patch = {}, changes = [];
    for (const k of ["status", "due", "owners", "priority", "assigned_on", "notes", "links", "outputs"]) {
      if (!same(existing[k], row[k])) { patch[k] = row[k]; changes.push(k === "status" ? `Status: ${existing.status} → ${row.status}` : k === "due" ? `Due: ${fmtDate(existing.due) || "none"} → ${fmtDate(row.due) || "none"}` : k === "owners" ? `Who: ${existing.owners.join(", ")} → ${row.owners.join(", ")}` : k[0].toUpperCase() + k.slice(1).replace("_", " ") + " updated"); }
    }
    if (changes.length) plan.updates.push({ id: existing.id, title, patch, changes });
  }
  return plan;
}

function planCosting(wb) {
  const plan = { kind: "Costing sheet", creates: [], updates: [], settings: null, sessions: [], unknown: new Set() };
  const c = structuredClone(setting("costing"));
  const before = JSON.stringify(c);
  const st = wb.Sheets["Settings"], pp = wb.Sheets["Printer Prices"], pl = wb.Sheets["Print List"], sc = wb.Sheets["Session Costs"];
  const changes = [];
  if (st) {
    for (const [k, a] of [["ticket", "B4"], ["baseline", "B5"], ["max", "B6"], ["spares", "B7"]]) { const v = numOrNull(st, a); if (v != null && v !== c[k]) { changes.push(`${k}: ${c[k]} → ${v}`); c[k] = v; } }
    const pr = str(st, "B8"); if (pr && pr !== c.printer) { changes.push(`Printer: ${c.printer} → ${pr}`); c.printer = pr; }
  }
  if (pp) {
    const printers = ["C", "D", "E"].map((col) => str(pp, `${col}4`)).filter(Boolean);
    if (printers.length) c.printers = printers;
    [5, 6, 7, 8].forEach((r) => {
      const paper = str(pp, `A${r}`); if (!paper) return;
      c.prices[paper] ||= {};
      ["C", "D", "E"].forEach((col, i) => {
        const p = printers[i], v = numOrNull(pp, `${col}${r}`);
        if (p && (c.prices[paper][p] ?? null) !== v) { if (v != null) changes.push(`${p} · ${paper}: ₱${v}`); c.prices[paper][p] = v; }
      });
    });
    ["C", "D", "E"].forEach((col, i) => { const p = printers[i], v = numOrNull(pp, `${col}10`); if (p) c.oldQuote[p] = v; });
  }
  if (pl) {
    const items = [];
    for (let r = 4; r < 40; r++) {
      const s = str(pl, `A${r}`); if (!/^S[1-4]$/.test(s)) continue;
      items.push({ session: s, item: str(pl, `B${r}`), paper: str(pl, `C${r}`), sides: numOrNull(pl, `D${r}`) || 0, perPerson: numOrNull(pl, `E${r}`) || 0, fixed: numOrNull(pl, `F${r}`) || 0, isCard: !!numOrNull(pl, `G${r}`), note: str(pl, `M${r}`) });
    }
    if (items.length && !same(items, c.items)) { changes.push(`Print list: ${plural(items.length, "item")}`); c.items = items; }
  }
  if (sc) {
    [4, 5, 6, 7].forEach((r) => {
      const s = str(sc, `A${r}`); if (!s) return;
      const x = (c.extras[s] ||= {});
      for (const [k, col] of [["venue", "D"], ["supplies", "E"], ["other", "F"]]) { const v = numOrNull(sc, `${col}${r}`); if ((x[k] ?? null) !== v) { if (v != null) changes.push(`${s} ${k}: ₱${v}`); x[k] = v; } }
    });
  }
  if (JSON.stringify(c) !== before) plan.settings = { value: c, changes: changes.length ? changes : ["Small changes"] };

  const ops = wb.Sheets["Ops Schedule"];
  if (ops) {
    [4, 5, 6, 7].forEach((r, i) => {
      const s = (S.data.sessions || []).find((x) => x.n === i + 1); if (!s) return;
      const patch = {}, ch = [];
      const date = dateOf(ops, `B${r}`), time = timeOf(ops, `C${r}`), venue = str(ops, `D${r}`);
      if (date && date !== s.date) { patch.date = date; ch.push(`Date: ${fmtDate(date)}`); }
      if (time && time !== String(s.start_time || "").slice(0, 5)) { patch.start_time = time; ch.push(`Starts ${time}`); }
      if (venue && venue !== s.venue) { patch.venue = venue; ch.push(`Venue: ${venue}`); }
      if (ch.length) plan.sessions.push({ n: s.n, title: `S${s.n} ${s.title}`, patch, changes: ch });
    });
  }

  const ot = wb.Sheets["Org Tracker"];
  if (ot) {
    const known = new Set(people().map((p) => p.name));
    const range = XLSX.utils.decode_range(ot["!ref"]);
    for (let r = 4; r <= range.e.r + 1; r++) {
      const name = str(ot, `B${r}`); if (!name) continue;
      const owner = canon(str(ot, `F${r}`));
      if (owner && !known.has(owner)) plan.unknown.add(owner);
      const row = {
        tier: numOrNull(ot, `A${r}`), cluster: str(ot, `C${r}`), page: str(ot, `D${r}`), why: str(ot, `E${r}`), owner,
        dm_date: dateOf(ot, `G${r}`), follow_up: dateOf(ot, `H${r}`),
        status: ["Not sent", "Sent", "Followed up", "Yes", "No", "No reply"].includes(str(ot, `I${r}`)) ? str(ot, `I${r}`) : "Not sent",
        replied_by: str(ot, `J${r}`), agreed: str(ot, `K${r}`), next_step: str(ot, `L${r}`),
      };
      const ex = (S.data.orgs || []).find((o) => norm(o.name) === norm(name));
      if (!ex) { plan.creates.push({ name, ...row, grp: "business", sort: r, _org: true }); continue; }
      const patch = {}, ch = [];
      for (const k of Object.keys(row)) if (!same(ex[k] ?? (typeof row[k] === "string" ? "" : null), row[k])) { patch[k] = row[k]; if (["status", "dm_date", "replied_by", "agreed", "next_step", "owner"].includes(k)) ch.push(k === "status" ? `${ex.status} → ${row.status}` : `${k.replace("_", " ")}: ${row[k] || "—"}`); }
      if (Object.keys(patch).length) plan.updates.push({ id: ex.id, title: name, patch, changes: ch.length ? ch : ["Details updated"], _org: true });
    }
  }
  return plan;
}

/* ---------- UI ---------- */
export function openImport() {
  openDrawer({
    eyebrow: "Import",
    title: "Update from Excel",
    body: `
      <p class="muted">Drop in the <b>project log</b> or the <b>costing sheet</b> (.xlsx). You’ll see every change before anything is saved. Download a Google Sheet with File → Download → Microsoft Excel.</p>
      <label class="drop" id="drop">
        <input type="file" accept=".xlsx,.xls" id="file" hidden />
        ${icon("upload")}
        <b>Drop an Excel file here</b>
        <span>or click to choose one</span>
      </label>
      <div id="plan"></div>`,
    onMount(root) {
      const drop = root.querySelector("#drop"), file = root.querySelector("#file");
      const handle = async (f) => {
        if (!f) return;
        root.querySelector("#plan").innerHTML = `<p class="muted">Reading ${esc(f.name)}…</p>`;
        try {
          await loadXLSX();
          const wb = XLSX.read(await f.arrayBuffer(), { cellDates: false, cellNF: false });
          const pl = Object.values(wb.Sheets).find((ws) => str(ws, "A2") === "Project");
          const plan = pl ? planProjectLog(pl) : wb.Sheets["Org Tracker"] || wb.Sheets["Printer Prices"] ? planCosting(wb) : null;
          if (!plan) { root.querySelector("#plan").innerHTML = `<div class="banner">${icon("alert")}<div>This doesn’t look like the project log or the costing sheet.</div></div>`; return; }
          showPlan(root.querySelector("#plan"), plan, f.name);
        } catch (e) { console.error(e); root.querySelector("#plan").innerHTML = `<div class="banner">${icon("alert")}<div>Couldn’t read that file.</div></div>`; }
      };
      file.addEventListener("change", () => handle(file.files[0]));
      drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("is-over"); });
      drop.addEventListener("dragleave", () => drop.classList.remove("is-over"));
      drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("is-over"); handle(e.dataTransfer.files[0]); });
    },
  });
}

function showPlan(el, plan, name) {
  const n = plan.creates.length + plan.updates.length + plan.sessions?.length + (plan.settings ? 1 : 0) || plan.creates.length + plan.updates.length;
  const nothing = !plan.creates.length && !plan.updates.length && !plan.settings && !plan.sessions?.length;
  const list = (items, fmt) => `<ul class="plan__list">${items.slice(0, 60).map(fmt).join("")}${items.length > 60 ? `<li class="muted">…and ${items.length - 60} more</li>` : ""}</ul>`;
  el.innerHTML = `
    <div class="plan">
      <p class="plan__h">${icon("doc")} ${esc(name)} <span class="tag">${esc(plan.kind)}</span></p>
      ${nothing ? `<div class="banner banner--ok">${icon("check")}<div>Everything already matches. Nothing to update.</div></div>` : ""}
      ${plan.unknown.size ? `<div class="banner">${icon("alert")}<div>Names not on the team: <b>${esc([...plan.unknown].join(", "))}</b>. Add them under Team (or as an “also called” name) so their tasks show up for them.</div></div>` : ""}
      ${plan.creates.length ? `<h4>New (${plan.creates.length})</h4>${list(plan.creates, (c) => `<li><b>${esc(c.title || c.name)}</b>${c.owners ? ` <span class="muted">${esc(c.owners.join(", "))}</span>` : ""}</li>`)}` : ""}
      ${plan.updates.length ? `<h4>Changed (${plan.updates.length})</h4>${list(plan.updates, (u) => `<li><b>${esc(u.title)}</b><small>${u.changes.map(esc).join(" · ")}</small></li>`)}` : ""}
      ${plan.sessions?.length ? `<h4>Sessions</h4>${list(plan.sessions, (u) => `<li><b>${esc(u.title)}</b><small>${u.changes.map(esc).join(" · ")}</small></li>`)}` : ""}
      ${plan.settings ? `<h4>Budget</h4>${list(plan.settings.changes, (c) => `<li>${esc(c)}</li>`)}` : ""}
      ${nothing ? "" : `<div class="plan__go"><button class="btn btn--primary" id="apply">${icon("check")} Apply ${plural(n, "change")}</button></div>`}
    </div>`;
  el.querySelector("#apply")?.addEventListener("click", async (e) => {
    e.target.disabled = true;
    e.target.textContent = "Saving…";
    const jobs = [
      ...plan.creates.map(({ _org, ...row }) => create(_org ? "orgs" : "tasks", row)),
      ...plan.updates.map((u) => update(u._org ? "orgs" : "tasks", u.id, u.patch)),
      ...(plan.sessions || []).map((s) => update("sessions", s.n, s.patch)),
      ...(plan.settings ? [saveSetting("costing", plan.settings.value)] : []),
    ];
    const res = await Promise.allSettled(jobs);
    const bad = res.filter((r) => r.status === "rejected");
    bad.forEach((r) => console.error(r.reason));
    closeDrawer();
    toast(bad.length ? `${jobs.length - bad.length} saved, ${bad.length} failed` : `Imported ${plural(jobs.length, "change")}`, bad.length ? "bad" : "");
  });
}
