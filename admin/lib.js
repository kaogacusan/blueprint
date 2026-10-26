/* Small helpers shared by every admin page: HTML, dates, icons, markdown, toast, drawer, forms. */

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const peso = (n, dp = 0) => `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

/* ---------- dates (everything is Manila time) ---------- */
const TZ = "Asia/Manila";
export const todayISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
export const weekday = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay();
/* like Excel's WORKDAY: n working days before (negative) or after a date */
export const workday = (iso, n) => {
  let d = iso, left = Math.abs(n);
  const step = n < 0 ? -1 : 1;
  while (left) { d = addDays(d, step); if (weekday(d) % 6 !== 0) left--; }
  return d;
};
export const fmtDate = (iso, opts = {}) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", ...opts }) : "");
export const hhmm = (t) => (t ? String(t).slice(0, 5) : "");
export const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = hhmm(t).split(":").map(Number);
  if (h === 12 && !m) return "12 NN";
  if (h === 0 && !m) return "12 MN";
  const ap = h < 12 ? "AM" : "PM", hh = h % 12 || 12;
  return m ? `${hh}:${String(m).padStart(2, "0")} ${ap}` : `${hh} ${ap}`;
};
export const fmtWhen = (iso, time) => [fmtDate(iso), fmtTime(time)].filter(Boolean).join(" · ");
export const instant = (iso, time) => new Date(`${iso}T${hhmm(time) || "23:59"}:00+08:00`);
export function rel(iso) {
  if (!iso) return { label: "No date", tone: "none" };
  const d = daysBetween(todayISO(), iso);
  if (d === 0) return { label: "Today", tone: "today" };
  if (d === 1) return { label: "Tomorrow", tone: "soon" };
  if (d === -1) return { label: "Yesterday", tone: "late" };
  if (d < 0) return { label: `${-d} days late`, tone: "late" };
  if (d < 7) return { label: `In ${d} days`, tone: "soon" };
  return { label: fmtDate(iso, { weekday: undefined }), tone: "later" };
}
export function countdown(target) {
  let ms = target - Date.now();
  if (ms <= 0) return "Now";
  const d = Math.floor(ms / 864e5); ms -= d * 864e5;
  const h = Math.floor(ms / 36e5); ms -= h * 36e5;
  const m = Math.floor(ms / 6e4);
  return d ? `${d}d ${h}h ${m}m` : h ? `${h}h ${m}m` : `${m}m`;
}
export const greeting = () => {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hour12: false }).format(new Date()));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

/* ---------- icons (Lucide, MIT) ---------- */
const P = {
  overview: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  tasks: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8M13 12h8M13 18h8"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  play: '<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  edit: '<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  doc: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8M16 17H8M10 9H8"/>',
  sheet: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18M12 3v18"/>',
  palette: '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.12-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
  sparkles: '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/>',
  list: '<path d="M3 12h.01M3 18h.01M3 6h.01M8 12h13M8 18h13M8 6h13"/>',
  board: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7v7M12 7v4M16 7v9"/>',
  calplus: '<path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18M10 16h4M12 14v4"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  menu: '<path d="M4 12h16M4 6h16M4 18h16"/>',
  pin: '<path d="M20 10c0 5-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  printer: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>',
  arrow: '<path d="M7 7h10v10M7 17 17 7"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
};
export const icon = (name, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ""}</svg>`;

/* which icon fits a link */
export const linkKind = (url = "") => {
  const u = url.toLowerCase();
  if (u.startsWith("mailto:")) return ["mail", "Email"];
  if (u.includes("drive.google.com/drive/folders")) return ["folder", "Drive folder"];
  if (u.includes("docs.google.com/spreadsheets")) return ["sheet", "Google Sheet"];
  if (u.includes("docs.google.com/document")) return ["doc", "Google Doc"];
  if (u.includes("drive.google.com/file")) return ["doc", "Drive file"];
  if (u.includes("canva")) return ["palette", "Canva"];
  if (u.includes("facebook.com")) return ["facebook", "Facebook"];
  return ["globe", "Website"];
};

/* ---------- people avatars ---------- */
const HUES = ["#0646c8", "#0e8a7e", "#7c3aed", "#d9480f", "#c2255c", "#2f6f3e", "#5c6ac4", "#b7791f"];
export const hue = (name = "") => HUES[[...name.toLowerCase()].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];
export const avatar = (name, size = "") =>
  name ? `<span class="av ${size}" style="--h:${hue(name)}" title="${esc(name)}">${esc(name[0].toUpperCase())}</span>` : "";
export const avatars = (names = [], size = "") =>
  `<span class="avs">${names.filter(Boolean).map((n) => avatar(n, size)).join("")}</span>`;

/* ---------- text rendering ---------- */
const autolink = (s) =>
  s
    .replace(/(^|[\s(>])(https?:\/\/[^\s<]+[^\s<.,;:)])/g, (_, p, u) => `${p}<a href="${u}" target="_blank" rel="noopener">${u.length > 48 ? u.slice(0, 45) + "…" : u}</a>`)
    .replace(/(^|[\s(>])([\w.+-]+@[\w-]+\.[\w.-]*\w)/g, (_, p, e) => `${p}<a href="mailto:${e}">${e}</a>`);

function inline(s) {
  let t = esc(s)
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+|mailto:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  // autolink only outside existing tags
  return t.split(/(<a [^>]*>.*?<\/a>)/g).map((part, i) => (i % 2 ? part : autolink(part))).join("");
}

/* Markdown subset: ## headings, lists, > notes, | tables |, **bold**, *italic*, links */
export function md(src = "") {
  const lines = src.replace(/\r/g, "").split("\n");
  const out = [];
  let i = 0;
  const isSpecial = (l) => /^(#{1,3} |> |\||\s*[-*] |\s*\d+\. )/.test(l);
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(/^(#{1,3}) (.*)/))) { out.push(`<h${m[1].length + 2}>${inline(m[2])}</h${m[1].length + 2}>`); i++; continue; }
    if (l.startsWith("> ")) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith("> ")) buf.push(lines[i++].slice(2));
      out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
      continue;
    }
    if (l.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(rows[1] && /^\|[\s:|-]+\|?$/.test(rows[1]) ? 2 : 1).map(cells);
      out.push(`<div class="mdtable"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if (/^\s*[-*] /.test(l) || /^\s*\d+\. /.test(l)) {
      const ordered = /^\s*\d+\. /.test(l);
      const buf = [];
      while (i < lines.length && (ordered ? /^\s*\d+\. /.test(lines[i]) : /^\s*[-*] /.test(lines[i]))) buf.push(lines[i++].replace(/^\s*([-*]|\d+\.) /, ""));
      out.push(`<${ordered ? "ol" : "ul"}>${buf.map((b) => `<li>${inline(b)}</li>`).join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !isSpecial(lines[i])) buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return out.join("");
}

/* Plain notes: keep line breaks, turn "- " lines into bullets, link URLs */
export function richText(src = "") {
  const lines = String(src).replace(/\r/g, "").split("\n");
  let html = "", list = false;
  for (const l of lines) {
    const b = l.match(/^\s*-\s*(.*)/);
    if (b) { if (!list) { html += "<ul>"; list = true; } html += `<li>${inline(b[1])}</li>`; continue; }
    if (list) { html += "</ul>"; list = false; }
    html += l.trim() ? `<p>${inline(l)}</p>` : "";
  }
  return html + (list ? "</ul>" : "");
}

/* ---------- toast ---------- */
let toastTimer = 0;
export function toast(msg, tone = "") {
  const el = $("#toast");
  el.innerHTML = `${icon(tone === "bad" ? "alert" : "check")}<span>${esc(msg)}</span>`;
  el.className = `toast is-on ${tone}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-on"), 2600);
}
export async function copy(text, what = "Copied") {
  try { await navigator.clipboard.writeText(text); toast(what); }
  catch { toast("Couldn’t copy. Select the text and copy it.", "bad"); }
}
export function download(filename, text, type = "text/plain") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}

/* ---------- drawer (side panel) ---------- */
let onDrawerClose = null, drawerHide = 0;
export function openDrawer({ eyebrow = "", title = "", body = "", actions = "", wide = false, onMount, onClose }) {
  const d = $("#drawer");
  d.classList.toggle("is-wide", wide);
  $("#drawerBody").innerHTML = `
    <header class="dr__head">
      <div><p class="dr__eyebrow">${eyebrow}</p><h2 class="dr__title">${title}</h2></div>
      <button class="iconbtn" data-close-drawer aria-label="Close">${icon("x")}</button>
    </header>
    <div class="dr__body">${body}</div>
    ${actions ? `<footer class="dr__foot">${actions}</footer>` : ""}`;
  clearTimeout(drawerHide);
  d.hidden = false;
  requestAnimationFrame(() => d.classList.add("is-open"));
  d.querySelector(".dr__panel").scrollTop = 0;
  onDrawerClose = onClose || null;
  onMount?.($("#drawerBody"));
  setTimeout(() => $("#drawerBody [autofocus]")?.focus(), 250);
}
export function closeDrawer() {
  const d = $("#drawer");
  if (d.hidden) return;
  d.classList.remove("is-open");
  drawerHide = setTimeout(() => (d.hidden = true), 300);
  onDrawerClose?.();
  onDrawerClose = null;
}

/* ---------- confirm ---------- */
export function confirmBox(message, { ok = "Delete", tone = "bad" } = {}) {
  return new Promise((resolve) => {
    const m = $("#confirm");
    $("#confirmText").textContent = message;
    const okBtn = $("#confirmOk");
    okBtn.textContent = ok;
    okBtn.className = `btn ${tone === "bad" ? "btn--danger" : "btn--primary"}`;
    m.hidden = false;
    requestAnimationFrame(() => m.classList.add("is-open"));
    const done = (v) => { m.classList.remove("is-open"); setTimeout(() => (m.hidden = true), 200); okBtn.onclick = cancel.onclick = null; resolve(v); };
    const cancel = $("#confirmCancel");
    okBtn.onclick = () => done(true);
    cancel.onclick = () => done(false);
    okBtn.focus();
  });
}

/* ---------- forms ----------
   fields: [{ key, label, type: text|textarea|date|time|number|select|people|links|toggle|tags, options, full, help, placeholder }] */
export function formFields(fields, v = {}, people = []) {
  return `<div class="form">${fields.map((f) => {
    const val = v[f.key];
    const id = `f_${f.key}`;
    let input = "";
    switch (f.type) {
      case "textarea":
        input = `<textarea id="${id}" name="${f.key}" rows="${f.rows || 5}" placeholder="${esc(f.placeholder || "")}">${esc(val ?? "")}</textarea>`; break;
      case "select":
        input = `<select id="${id}" name="${f.key}">${f.options.map((o) => { const [ov, ol] = Array.isArray(o) ? o : [o, o || "—"]; return `<option value="${esc(ov)}" ${String(ov) === String(val ?? "") ? "selected" : ""}>${esc(ol)}</option>`; }).join("")}</select>`; break;
      case "people":
        input = `<div class="chips" id="${id}">${people.map((p) => `<label class="chip"><input type="checkbox" value="${esc(p)}" ${(val || []).includes(p) ? "checked" : ""} />${avatar(p, "sm")}<span>${esc(p)}</span></label>`).join("")}</div>`; break;
      case "links":
        input = `<div class="links-ed" id="${id}">${(val || []).map(linkRow).join("")}<button type="button" class="btn btn--ghost btn--xs" data-add-link>${icon("plus")} Add link</button></div>`; break;
      case "toggle":
        input = `<label class="switch"><input type="checkbox" id="${id}" ${val ? "checked" : ""} /><span></span>${esc(f.text || "")}</label>`; break;
      case "tags":
        input = `<input id="${id}" name="${f.key}" value="${esc((val || []).join(", "))}" placeholder="${esc(f.placeholder || "Comma separated")}" />`; break;
      default:
        input = `<input id="${id}" name="${f.key}" type="${f.type || "text"}" value="${esc(f.type === "time" ? hhmm(val) : val ?? "")}" placeholder="${esc(f.placeholder || "")}" ${f.step ? `step="${f.step}"` : ""} ${f.autofocus ? "autofocus" : ""} />`;
    }
    return `<div class="fld ${f.full || ["textarea", "people", "links"].includes(f.type) ? "fld--full" : ""}"><label for="${id}">${esc(f.label)}</label>${input}${f.help ? `<small>${esc(f.help)}</small>` : ""}</div>`;
  }).join("")}</div>`;
}
const linkRow = (l = {}) => `<div class="link-row"><input placeholder="Label" value="${esc(l.label || "")}" data-l="label" /><input placeholder="https://…" value="${esc(l.url || "")}" data-l="url" /><button type="button" class="iconbtn" data-del-link aria-label="Remove">${icon("x")}</button></div>`;
export function wireForm(root) {
  root.addEventListener("click", (e) => {
    if (e.target.closest("[data-add-link]")) e.target.closest("[data-add-link]").insertAdjacentHTML("beforebegin", linkRow());
    if (e.target.closest("[data-del-link]")) e.target.closest(".link-row").remove();
  });
}
export function readForm(fields, root) {
  const out = {};
  for (const f of fields) {
    const el = root.querySelector(`#f_${f.key}`);
    if (!el) continue;
    switch (f.type) {
      case "people": out[f.key] = $$("input:checked", el).map((i) => i.value); break;
      case "links": out[f.key] = $$(".link-row", el).map((r) => ({ label: $('[data-l="label"]', r).value.trim(), url: $('[data-l="url"]', r).value.trim() })).filter((l) => l.url); break;
      case "toggle": out[f.key] = el.checked; break;
      case "tags": out[f.key] = el.value.split(",").map((s) => s.trim()).filter(Boolean); break;
      case "number": out[f.key] = el.value === "" ? null : Number(el.value); break;
      case "date": case "time": out[f.key] = el.value || null; break;
      default: out[f.key] = el.value.trim();
    }
  }
  return out;
}

/* ---------- little animations ---------- */
export function countUps(root) {
  $$("[data-count]", root).forEach((el) => {
    const to = Number(el.dataset.count), fmt = el.dataset.fmt;
    const t0 = performance.now(), dur = 900;
    const show = (v) => (el.textContent = fmt === "peso" ? peso(v) : Math.round(v).toLocaleString());
    const tick = (now) => { const p = Math.min(1, (now - t0) / dur); show(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
}
export const ring = (pct, size = 92, stroke = 9) => {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring__bg"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring__fg" style="--c:${c};--o:${c * (1 - pct)}"/></svg>`;
};

/* ---------- calendar file ---------- */
export function ics(events, name = "Blueprint") {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const escI = (s) => String(s).replace(/[\\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Blueprint//Workspace//EN", `X-WR-CALNAME:${escI(name)}`, "CALSCALE:GREGORIAN"];
  events.forEach((e, i) => {
    const d = e.date.replace(/-/g, "");
    lines.push("BEGIN:VEVENT", `UID:bp-${d}-${i}-${e.title.length}@ateneoblueprint`, `DTSTAMP:${stamp}`);
    if (e.time) {
      const t = hhmm(e.time).replace(":", "") + "00";
      lines.push(`DTSTART;TZID=Asia/Manila:${d}T${t}`, `DURATION:PT30M`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${addDays(e.date, 1).replace(/-/g, "")}`);
    }
    lines.push(`SUMMARY:${escI(e.title)}`);
    if (e.notes) lines.push(`DESCRIPTION:${escI(e.notes)}`);
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
