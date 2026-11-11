/* Shared server code for the payment flow. Files starting with "_" are not routes.
   Runs on Vercel with the Supabase service key and the Blueprint Gmail app password,
   both set as environment variables (never in the repo, never sent to the browser). */
import nodemailer from "nodemailer";
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const U = process.env.SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const SITE = process.env.SITE_URL || "https://ateneoblueprint.vercel.app";
const H = { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json" };

/* ---------- http ---------- */
export const send = (res, code, body) => res.status(code).json(body);
export async function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch { return {}; }
}

/* ---------- database (service key: bypasses row rules, so check everything here) ---------- */
export async function db(path, { method = "GET", data, prefer } = {}) {
  const r = await fetch(`${U}/rest/v1/${path}`, { method, headers: { ...H, ...(prefer ? { Prefer: prefer } : {}) }, body: data ? JSON.stringify(data) : undefined });
  const text = await r.text();
  const json = text ? JSON.parse(text) : null;
  if (!r.ok) { const e = new Error(json?.message || `db ${r.status}`); e.status = r.status; e.code = json?.code; throw e; }
  return json;
}
export const enc = encodeURIComponent;
export async function settings(...keys) {
  const rows = await db(`settings?select=key,value&key=in.(${keys.map(enc).join(",")})`);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
/* the signed-in team member's name, or null (core team only; guests get null) */
export async function teamName(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const r = await fetch(`${U}/rest/v1/rpc/my_name`, { method: "POST", headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}" });
  if (!r.ok) return null;
  return (await r.json()) || null;
}

/* ---------- tickets (migrations 010, 011, 012). The site shows the same prices (index.html, main.js PRICE). ----------
   Pilot pricing from Nov 7: Full Pass ₱799, Single Session ₱299 each, Barkada ₱1,999 (three Full Passes, one payer).
   From Nov 10, Session 1 is free: its own ticket, no payment. Singles are for Sessions 2 to 4. */
export const PRICE = { full: 799, single: 299, barkada: 1999, online: 349 };
/* From Nov 11 night the site sells one thing: Blueprint Online, ₱349 (migration 017). Sales close Sun Nov 15, 10 PM. */
export const SALES_CLOSE = Date.parse("2026-11-15T22:00:00+08:00");
const ALL = [1, 2, 3, 4];
export const FREE = 1;
const PAID = ALL.filter((n) => n !== FREE);
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/* what they picked on the site → what we save, or null if it doesn't add up.
   Picking all three paid singles gets them the Full Pass: it's cheaper and comes with the pre-work bundle.
   A Barkada needs two friends with a name and an email each, different from the payer's and each other's. */
export function ticketFor(ticket, sessions, friends, email = "") {
  if (ticket === "online") return { ticket: "online", sessions: ALL, amount: PRICE.online, friends: [] };
  if (ticket === "free") return { ticket: "free", sessions: [FREE], amount: 0, friends: [] };
  if (ticket === "full") return { ticket: "full", sessions: ALL, amount: PRICE.full, friends: [] };
  if (ticket === "barkada") {
    if (!Array.isArray(friends) || friends.length !== 2) return null;
    const f = friends.map((x) => ({ name: String(x?.name ?? "").trim().slice(0, 120), email: String(x?.email ?? "").trim().toLowerCase().slice(0, 200) }));
    const emails = new Set([email, ...f.map((x) => x.email)]);
    if (f.some((x) => !x.name || !EMAIL.test(x.email)) || emails.size !== 3) return null;
    return { ticket: "barkada", sessions: ALL, amount: PRICE.barkada, friends: f };
  }
  if (ticket !== "single" || !Array.isArray(sessions) || !sessions.length) return null;
  const s = [...new Set(sessions)].filter((n) => PAID.includes(n)).sort((a, b) => a - b);
  if (s.length !== sessions.length) return null;
  if (s.length === PAID.length) return ticketFor("full");
  return { ticket: "single", sessions: s, amount: s.length * PRICE.single, friends: [] };
}
/* a Single Session sign-up can move up to the Full Pass and pay the difference: ₱500 after one session, ₱201 after two.
   0 = nothing to upgrade (already all four, or three singles, which already cost more than the Full Pass). */
export const upgradeDue = (r) => (r.ticket === "single" ? Math.max(0, PRICE.full - (r.amount || 0)) : 0);
/* a session's start, Manila time. Sign-ups for it stop then (api/register.js). */
export const startsAt = (s) => (s.date ? Date.parse(`${s.date}T${(s.start_time || "00:00").slice(0, 5)}:00+08:00`) : Infinity);
/* a Barkada takes three seats in each session, everyone else one */
export const seatsOf = (r) => (r.ticket === "barkada" ? 3 : 1);
const and = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a.at(-1)}`);
const friendNames = (r) => (r.friends || []).map((f) => f.name.trim().split(/\s+/)[0]);
/* "the Full Pass (all four sessions)", "Session 2: Proof on Paper" (titles: { 2: "Proof on Paper" }),
   or "the Barkada ticket (all four sessions for you, Ana and Ben)" */
export const ticketLine = (r, titles = {}) => r.ticket === "single" || r.ticket === "free"
  ? and((r.sessions || []).map((n) => `Session ${n}${titles[n] ? `: ${titles[n]}` : ""}`)) + (r.ticket === "free" ? " (free)" : "")
  : r.ticket === "online" ? "Blueprint Online"
  : r.ticket === "barkada" ? `the Barkada ticket (all four sessions for ${and(["you", ...friendNames(r)])})`
  : "the Full Pass (all four sessions)";
export async function sessionTitles() {
  return Object.fromEntries((await db("sessions?select=n,title&order=n")).map((x) => [x.n, x.title]));
}

/* BP-7K2Q, their sign-up number: no 0/O or 1/I, so it reads cleanly off a phone */
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const newCode = () => "BP-" + Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => ALPHA[b % ALPHA.length]).join("");

/* ---------- email ---------- */
let mailer;
async function mail({ to, cc, subject, html, text, attachments }) {
  mailer ||= nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } });
  await mailer.sendMail({ from: `Blueprint <${process.env.GMAIL_USER}>`, to, cc, subject, html, text, attachments });
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const first = (name = "") => name.trim().split(/\s+/)[0] || "there";
const peso = (n) => `₱${Number(n || 0).toLocaleString("en-PH")}`;
const day = (iso, o = {}) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", ...o });
const time = (t) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };

/* what every email needs: their ticket, amount and sessions, and the payment setup */
async function context(r) {
  const [s, sessions] = await Promise.all([settings("payment"), db("sessions?select=n,title,date,start_time,end_time,venue,venue_status&order=n")]);
  const pay = s.payment || {};
  const picked = r.ticket === "single" || r.ticket === "free";
  const mine = picked ? r.sessions || [] : ALL;
  const lines = sessions.filter((x) => x.date && mine.includes(x.n)).map((x) => ({
    mon: day(x.date, { weekday: undefined, day: undefined }).toUpperCase(),
    dd: day(x.date, { weekday: undefined, month: undefined }),
    when: `${day(x.date)}, ${time(x.start_time)}–${time(x.end_time)}`,
    what: `Session ${x.n}: ${x.title}`,
  }));
  // the room shown on the site (FA Annex 104), from Schedule; the site and the emails should always agree
  const room = sessions.find((x) => mine.includes(x.n) && x.venue) || sessions.find((x) => x.venue);
  return {
    price: r.amount ?? PRICE.full,
    full: !picked,
    barkada: r.ticket === "barkada",
    friends: friendNames(r),
    mine,
    what: ticketLine(r, Object.fromEntries(sessions.map((x) => [x.n, x.title]))),
    gcashName: pay.gcashName || "",
    gcashNumber: pay.gcashNumber || "",
    qrPath: pay.qrPath || "",
    prework: (pay.prework || []).filter((p) => p?.url),
    sessions: lines,
    venue: room ? `${room.venue}, Ateneo de Manila` : "Ateneo de Manila (room to be confirmed, we'll email you)",
  };
}
/* ---------- private files (the "payment" bucket: our QR, and people's payment screenshots) ---------- */
const objectUrl = (path) => `${U}/storage/v1/object/payment/${path.split("/").map(enc).join("/")}`;
export async function readFile(path) {
  if (!path) return null;
  const r = await fetch(objectUrl(path), { headers: { apikey: K, Authorization: `Bearer ${K}` } });
  if (!r.ok) return null;
  return { type: r.headers.get("content-type") || "image/png", data: Buffer.from(await r.arrayBuffer()) };
}
export async function saveFile(path, data, type) {
  const r = await fetch(objectUrl(path), { method: "POST", headers: { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": type, "x-upsert": "true" }, body: data });
  if (!r.ok) throw new Error(`storage ${r.status}`);
}
/* ---------- encryption: receipt screenshots are locked with our own key (AES-256-GCM) before they're stored,
   on top of Supabase's disk encryption. A copy of the bucket is useless without DATA_ENCRYPTION_KEY, which only
   lives in Vercel's settings (and the owner's password manager). Lose the key and the receipts can't be opened. */
const SEALED = Buffer.from("BPE1");
function dataKey() {
  const k = Buffer.from(process.env.DATA_ENCRYPTION_KEY || "", "base64");
  if (k.length !== 32) throw new Error("DATA_ENCRYPTION_KEY missing");
  return k;
}
/* a separate key for one job (e.g. signing course logins), made from the data key so there's nothing new to set up */
export const subKey = (label) => createHmac("sha256", dataKey()).update(`blueprint:${label}`).digest();
export function seal(data) {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", dataKey(), iv);
  const out = Buffer.concat([c.update(data), c.final()]);
  return Buffer.concat([SEALED, iv, c.getAuthTag(), out]);
}
export function unseal(buf) {
  if (!buf.subarray(0, 4).equals(SEALED)) return buf; // saved before encryption was switched on
  const d = createDecipheriv("aes-256-gcm", dataKey(), buf.subarray(4, 16));
  d.setAuthTag(buf.subarray(16, 32));
  return Buffer.concat([d.update(buf.subarray(32)), d.final()]);
}

/* who opened or changed someone's details, for the owner to check after a mistake or a leak.
   Only ids and actions: no names, emails or messages in the log. */
export async function logAccess(who, action, target) {
  try { await db("access_log", { method: "POST", data: { who, action, target: String(target) } }); }
  catch (e) { console.error("access log failed", e.message); }
}

async function qrAttachment(path) {
  const f = await readFile(path);
  return f && { filename: "blueprint-gcash-qr.png", content: f.data, cid: "gcashqr" };
}
export const payLink = (r) => `${SITE}/pay?t=${enc(r.pay_token)}`;

/* ---------- email layout: tables + inline styles, because that's all Gmail and Outlook reliably keep ----------
   Every email: the Blueprint banner on top, then a kicker, a title, the body, and "ask us on the site" at the end.
   Questions go through the site's Ask form (api/ask.js), not replies to this inbox, so the whole team sees them. */
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif";
const MONO = "'SF Mono',Menlo,Consolas,monospace";
const INK = "#0b1640", TEXT = "#2a3042", MUTED = "#5b6378", BLUE = "#1f5fe0", LINE = "#e3e9f3", TINT = "#eff4fd";
export const ASK = `${SITE}/#ask`;
const PAD = "36px"; // lines the text up with the logo in the banner
const shell = ({ preview, kicker, title, body, end, ask = true }) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f1f4f9;font-family:${FONT};color:${INK};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f4f9"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e1e7f1;border-radius:20px;overflow:hidden">
  <tr><td style="padding:0;font-size:0;line-height:0"><a href="${SITE}" style="text-decoration:none"><img src="${SITE}/assets/email-header.jpg" width="560" alt="blueprint · Stand out on paper. Stand out in person." style="display:block;width:100%;max-width:560px;height:auto;border:0;font-size:20px;line-height:1.4;font-weight:800;color:${INK}"></a></td></tr>
  <tr><td style="padding:4px ${PAD} 0">
    <p style="margin:0 0 10px;font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:${BLUE}">${kicker}</p>
    <h1 style="margin:0;font-size:30px;line-height:1.15;letter-spacing:-0.025em;font-weight:800;color:${INK}">${title}</h1>
  </td></tr>
  <tr><td style="padding:14px ${PAD} 30px">${body}
    ${ask ? `<p style="margin:26px 0 0;padding-top:22px;border-top:1px solid ${LINE};line-height:1.6;font-size:15px;color:${INK}">${end ? `${end} ` : ""}Questions? <a href="${ASK}" style="color:${BLUE};font-weight:600">Ask us on our site</a> and we’ll email you back.</p>` : ""}
  </td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td style="padding:18px 28px 0;color:#6b7387;font-size:12px;line-height:1.6;text-align:center">
  Blueprint is an LAS50 student venture at Ateneo de Manila.<br>We will never ask for your GCash MPIN or a one-time code (OTP).<br>
  <a href="${SITE}" style="color:#6b7387">ateneoblueprint.vercel.app</a> · <a href="${SITE}/privacy.html" style="color:#6b7387">Privacy notice</a>
</td></tr></table>
</td></tr></table></body></html>`;
const askText = `Questions? Ask us on our site and we'll email you back: ${ASK}`;
const p = (s, extra = "") => `<p style="margin:0 0 14px;line-height:1.6;font-size:16px;color:${TEXT};${extra}">${s}</p>`;
const h = (s) => `<p style="margin:26px 0 14px;padding-top:24px;border-top:1px solid ${LINE};font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:${BLUE}">${s}</p>`;
const code = (s) => `<b style="font-family:${MONO};letter-spacing:.04em;color:${INK}">${esc(s)}</b>`;
/* "Sign-up number BP-4FB3 | ● Paid" */
const STATE = { paid: ["Paid", "#0f8a46"], unpaid: ["Not paid yet", "#c26a00"], waitlist: ["Waitlist", "#c26a00"], free: ["Free", "#0f8a46"] };
const chip = (c, state) => { const [word, color] = STATE[state]; return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;background:#f2f5fa;border-radius:12px"><tr>
  <td style="padding:12px 0 12px 18px;font-size:14px;color:${MUTED};white-space:nowrap">Sign-up number</td>
  <td style="padding:12px 16px;font-size:18px;font-weight:800;letter-spacing:.01em;color:${INK};white-space:nowrap">${esc(c)}</td>
  <td style="padding:12px 18px 12px 16px;border-left:1px solid #dfe5ee;font-size:15px;font-weight:700;color:${color};white-space:nowrap"><span style="color:${color};font-size:13px">●</span>&nbsp;${word}</td>
</tr></table>`; };
const btn = (href, label) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 16px"><tr><td style="border-radius:999px;background:${BLUE}"><a href="${href}" style="display:inline-block;padding:14px 26px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;border-radius:999px">${label}</a></td></tr></table>`;
/* a numbered step: blue circle on the left, content on the right */
const step = (n, title, body) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px"><tr>
  <td width="42" valign="top" style="padding-top:1px"><div style="width:30px;height:30px;line-height:30px;border-radius:50%;background:${BLUE};color:#fff;text-align:center;font-weight:800;font-size:14px">${n}</div></td>
  <td valign="top"><p style="margin:4px 0 10px;font-weight:700;font-size:18px;color:${INK}">${title}</p>${body}</td></tr></table>`;
/* the QR card: code, amount, who it goes to */
const payCard = (c, qr) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 14px;border:1px solid ${LINE};border-radius:16px"><tr><td align="center" style="padding:22px 16px">
  ${qr ? `<img src="cid:gcashqr" alt="Blueprint GCash QR code" width="210" height="210" style="display:block;width:210px;height:210px;max-width:100%;border:0">` : ""}
  <p style="margin:${qr ? "14px" : "0"} 0 2px;font-size:28px;font-weight:800;letter-spacing:-0.02em;color:${INK}">${peso(c.price)}</p>
  ${c.gcashName ? `<p style="margin:0;font-size:14px;color:#3b4255">to <b>${esc(c.gcashName)}</b></p>` : ""}
  ${c.gcashNumber ? `<p style="margin:2px 0 0;font-size:14px;color:#3b4255">GCash <span style="font-family:${MONO}">${esc(c.gcashNumber)}</span></p>` : ""}
</td></tr></table>`;
/* each session: a date tile (NOV / 10), then the title and the time */
const schedule = (c) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${c.sessions.map((s, i) => `<tr>
  <td width="72" valign="middle" style="padding:${i ? "14px" : "0"} 0 14px;${i ? `border-top:1px solid ${LINE};` : ""}">
    <table role="presentation" cellpadding="0" cellspacing="0" width="60" style="background:${TINT};border-radius:12px"><tr><td align="center" style="padding:9px 0 8px">
      <div style="font-size:12px;font-weight:700;letter-spacing:.06em;color:${BLUE};line-height:1">${esc(s.mon)}</div>
      <div style="margin-top:4px;font-size:24px;font-weight:800;color:${INK};line-height:1">${esc(s.dd)}</div>
    </td></tr></table></td>
  <td valign="middle" style="padding:${i ? "14px" : "0"} 0 14px 6px;${i ? `border-top:1px solid ${LINE};` : ""}">
    <p style="margin:0 0 4px;font-size:17px;font-weight:700;color:${INK};line-height:1.3">${esc(s.what)}</p>
    <p style="margin:0;font-size:15px;color:${MUTED}">${esc(s.when)}</p></td></tr>`).join("")}</table>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 0"><tr>
    <td width="32" valign="top" style="padding-top:1px"><img src="${SITE}/assets/email-pin.png" width="22" height="22" alt="" style="display:block;border:0"></td>
    <td style="font-size:15px;line-height:1.5;color:${INK}">${esc(c.venue)}</td></tr></table>`;
const scheduleText = (c) => c.sessions.map((s) => `- ${s.when}: ${s.what}`).join("\n") + `\n${c.venue}`;
/* the tinted box: an icon in a circle, a small heading, a line of text; rows split by a thin line */
const infoBox = (rows) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;background:${TINT};border-radius:16px">${rows.map(([icon, head, body], i) => `<tr><td style="padding:${i ? "0" : "22px"} 22px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${i ? `border-top:1px solid #dbe4f2;` : ""}"><tr>
    <td width="72" valign="top" style="padding:${i ? "20px" : "0"} 0 22px"><img src="${SITE}/assets/email-${icon}.png" width="56" height="56" alt="" style="display:block;border:0"></td>
    <td valign="top" style="padding:${i ? "20px" : "0"} 0 22px">
      <p style="margin:4px 0 6px;font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:${BLUE}">${head}</p>
      <div style="font-size:15px;line-height:1.55;color:${TEXT}">${body}</div></td></tr></table></td></tr>`).join("")}</table>`;
/* the pre-work bundle comes with the Full Pass; single-session people hear from us before their session */
const yours = (c) => (c.mine.length > 1 ? "your sessions" : "your session");
const prework = (c) => !c.full
  ? `We’ll email you what to prep before ${yours(c)}.`
  : c.prework.length
  ? `Do this short pre-work before the first session:<br>${c.prework.map((x) => `<a href="${esc(x.url)}" style="color:${BLUE};font-weight:600">${esc(x.label || "Pre-work")}</a>`).join("<br>")}`
  : "We’ll email you the full pre-work bundle before the first session.";
const preworkText = (c) => !c.full
  ? `We'll email you what to prep before ${yours(c)}.`
  : c.prework.length
  ? `Your pre-work bundle (before Session 1):\n${c.prework.map((x) => `- ${x.label || "Pre-work"}: ${x.url}`).join("\n")}`
  : "We'll email you the full pre-work bundle before the first session.";
const bring = (c) => (c.mine.length > 1 ? "A laptop or phone for every session." : "A laptop or phone.") + (c.mine.includes(2) ? " For Session 2, bring your current résumé and your LinkedIn link." : "");
const scheduleHead = (c) => (c.full ? "The schedule" : c.mine.length > 1 ? "Your sessions" : "Your session");

/* 1. right after signing up: how to pay */
export async function paymentEmail(r) {
  const c = await context(r);
  const qr = await qrAttachment(c.qrPath);
  const link = payLink(r);
  const to = [c.gcashName, c.gcashNumber && `GCash ${c.gcashNumber}`].filter(Boolean).join(", ");
  const html = shell({
    preview: `Send ${peso(c.price)} by GCash and upload your receipt to lock your slot.`,
    kicker: "You're signed up",
    title: "Pay to lock your slot",
    body:
      p(`Hi ${esc(first(r.name))}! Thanks for signing up for Blueprint. <b>Your slot isn't locked until payment is in.</b> Seats are limited, and they go to the first people who pay.`) +
      chip(r.code, "unpaid") +
      h("How to pay") +
      step(1, "Pay with GCash",
        p(`Send <b>${peso(c.price)}</b> for ${esc(c.what)}. Scan the QR in GCash, or send to the number below.`) +
        payCard(c, qr) +
        p(`On your phone? The button below shows the QR too. Save it, then in GCash tap <b>Pay QR</b> › <b>Upload QR</b>.`, `font-size:14px;color:${MUTED}`)) +
      step(2, "Upload your receipt",
        p(`Screenshot the GCash receipt, then upload it here:`) +
        btn(link, "I've paid: upload my receipt") +
        p(`We check it and email your slot confirmation within 24 hours.`, "font-size:15px") +
        p(`Keep this email: the button is your own payment page, so you can pay later or upload a new screenshot. Lost it? Register again on the site with the same email and we'll send it again.`, `font-size:14px;color:${MUTED}`)) +
      h(scheduleHead(c)) + schedule(c),
  });
  const text = `Hi ${first(r.name)}!\n\nThanks for signing up for Blueprint (sign-up number ${r.code}). Your slot isn't locked until payment is in. Seats are limited.\n\n1. Send ${peso(c.price)} by GCash for ${c.what}${to ? ` to ${to}` : ""}${qr ? " (QR attached)" : ""}.\n2. Screenshot the receipt and upload it here: ${link}\n\nWe'll email your slot confirmation within 24 hours.\n\nKeep this email: the link is your own payment page. Lost it? Register again on the site with the same email and we'll send it again.\n\n${scheduleHead(c)}:\n${scheduleText(c)}\n\n${askText}`;
  await mail({ to: r.email, subject: `Pay to lock your Blueprint slot (${r.code})`, html, text, attachments: qr ? [qr] : [] });
}

/* 2. after the team checks the screenshot and clicks Paid: slot confirmation (+ the pre-work bundle for the Full Pass and Barkada).
   upgrade: the top-up they just paid to move from Single Session to the Full Pass (api/signups.js).
   A Barkada's two friends are copied, so all three have the schedule and the pre-work. */
export async function confirmEmail(r, { upgrade = 0 } = {}) {
  const c = await context(r);
  const due = upgradeDue(r), link = payLink(r);
  const withFriends = c.barkada && c.friends.length ? `, with ${and(c.friends)}` : "";
  const got = upgrade
    ? `We got your ${peso(upgrade)} top-up, so you’re now on the <b>Full Pass</b>: all four Blueprint sessions.`
    : `We got your ${peso(c.price)}, and you’re in for ${c.full ? `all four Blueprint sessions${esc(withFriends)}` : esc(c.what)}.`;
  const copied = withFriends ? ` ${esc(and(c.friends))}, you’re copied on this email so you have the schedule too.` : "";
  const html = shell({
    preview: upgrade ? "You're on the Full Pass now. Here's the full schedule and pre-work."
      : c.full ? `You're in for all four Blueprint sessions${withFriends}. Here's the schedule and pre-work.` : `You're in for ${c.what}. Here's when and where.`,
    kicker: upgrade ? "Upgrade received" : "Payment received",
    title: upgrade ? "You’re on the Full Pass" : "Your slot is confirmed",
    body:
      p(`Hi ${esc(first(r.name))}! ${got}${copied}`) +
      chip(r.code, "paid") +
      h(scheduleHead(c)) + schedule(c) +
      infoBox([["doc", c.full ? "Your pre-work bundle" : `Before ${yours(c)}`, prework(c)], ["laptop", "What to bring", bring(c)]]) +
      (due ? h("Want all four?") +
        p(`Move up to the <b>Full Pass</b> for <b>${peso(due)} more</b>: every session, and the full pre-work bundle. Do it on your payment page, same QR.`) +
        btn(link, `Upgrade for ${peso(due)}`) : ""),
    end: "See you there!",
  });
  const gotText = upgrade ? `We got your ${peso(upgrade)} top-up, so you're now on the Full Pass: all four Blueprint sessions.`
    : `Your slot is confirmed. We got your ${peso(c.price)}, and you're in for ${c.full ? `all four Blueprint sessions${withFriends}` : c.what}.`;
  const text = `Hi ${first(r.name)}!\n\n${gotText}${withFriends ? ` ${and(c.friends)}, you're copied on this email so you have the schedule too.` : ""} Sign-up number ${r.code}.\n\n${scheduleHead(c)}:\n${scheduleText(c)}\n\n${preworkText(c)}\n\nWhat to bring: ${bring(c)}${due ? `\n\nWant all four? Move up to the Full Pass for ${peso(due)} more on your payment page: ${link}` : ""}\n\nSee you there! ${askText}`;
  const cc = c.barkada ? (r.friends || []).map((f) => f.email).filter(Boolean) : undefined;
  await mail({ to: r.email, cc, subject: upgrade ? `You're on the Blueprint Full Pass (${r.code})` : `Your Blueprint slot is confirmed (${r.code})`, html, text });
}

/* 3. paid after the seats ran out */
export async function waitlistEmail(r) {
  const c = await context(r);
  const html = shell({
    preview: `The seats filled up before your payment came in. You're first in line.`,
    kicker: "Waitlist",
    title: "You're first in line",
    body:
      p(`Hi ${esc(first(r.name))}! Thank you for paying for Blueprint. We’re sorry: the seats ${c.full ? "" : `for ${esc(c.what)} `}were all taken before your payment came in, so you’re <b>on the waitlist</b>.`) +
      chip(r.code, "waitlist") +
      h("What happens next") +
      p(`If a slot opens up, we’ll email you right away. If not, we’ll refund your ${peso(c.price)} to the same GCash account.`) +
      p(`Would you rather have the refund now? Ask us on the site and we’ll send it.`),
  });
  const text = `Hi ${first(r.name)}!\n\nThank you for paying for Blueprint. The seats ${c.full ? "" : `for ${c.what} `}were all taken before your payment came in, so you're on the waitlist (sign-up number ${r.code}). If a slot opens, we'll email you. If not, we'll refund your ${peso(c.price)} to the same GCash account. Would you rather have the refund now? Ask us on the site and we'll send it.\n\n${askText}`;
  await mail({ to: r.email, subject: "You're on the Blueprint waitlist", html, text });
}

/* 4. a free Session 1 sign-up: nothing to pay. Their seat is saved, or Session 1 is full and they're next in line. */
const restLink = `${SITE}/#tickets`;
export async function freeEmail(r) {
  const c = await context(r);
  const wait = r.status === "waitlist";
  const hi = wait
    ? "Session 1 filled up before you signed up. Come anyway: if someone doesn’t show up, their seat is yours."
    : "You’re in for Session 1. It’s free, so there’s nothing to pay.";
  const html = shell({
    preview: wait ? "Session 1 is full, but come anyway: you're next in line for a seat." : "Session 1 is free and your seat is saved. Here's when and where.",
    kicker: "Session 1 is free",
    title: wait ? "You’re next in line" : "Your seat is saved",
    body:
      p(`Hi ${esc(first(r.name))}! ${hi}`) +
      chip(r.code, wait ? "waitlist" : "free") +
      h("When and where") + schedule(c) +
      infoBox([["laptop", "What to bring", bring(c)]]) +
      h("Want the rest?") +
      p(`Sessions 2 to 4 are <b>${peso(PRICE.single)} each</b>. Pick the ones you want on our site.`) +
      btn(restLink, "Get Sessions 2 to 4"),
    end: "See you there!",
  });
  const text = `Hi ${first(r.name)}!\n\n${hi} (sign-up number ${r.code})\n\nWhen and where:\n${scheduleText(c)}\n\nWhat to bring: ${bring(c)}\n\nWant the rest? Sessions 2 to 4 are ${peso(PRICE.single)} each: ${restLink}\n\nSee you there! ${askText}`;
  await mail({ to: r.email, subject: wait ? `Session 1 is full: you're next in line (${r.code})` : `Your free Session 1 seat is saved (${r.code})`, html, text });
}

/* 5. "Session 1 is free" to everyone who signed up before (the team sends it once, from Sign-ups: api/signups.js).
   One line changes with their ticket: seat saved, what they still pay, or how to join Session 1. lowered: we took Session 1 off their bill. */
export async function freeNewsEmail(r, { lowered = false } = {}) {
  const [c, one] = await Promise.all([context(r), context({ ticket: "free", sessions: [FREE] })]);
  const has1 = c.mine.includes(FREE), unpaid = r.status === "registered";
  const joinLink = `${SITE}/?free=1#tickets`;
  const [line, link] =
    r.ticket === "free" ? ["You don’t need to pay anymore. Your seat in Session 1 is saved.", null]
    : has1 && !unpaid ? ["You already have your seat. Nothing changes for you.", null]
    : has1 ? [`Come to Session 1 even before you pay. ${lowered ? "We took Session 1 off your bill: to" : "To"} lock your other sessions, pay <b>${peso(c.price)}</b>.`, [payLink(r), "Pay for my other sessions"]]
    : ["Want to come to Session 1 too? Sign up for free on our site.", [joinLink, "Sign up free for Session 1"]];
  const plain = line.replace(/<[^>]+>/g, "");
  const html = shell({
    preview: `Session 1 is free for everyone. ${one.sessions[0]?.when || ""}`,
    kicker: "Good news",
    title: "Session 1 is free",
    body:
      p(`Hi ${esc(first(r.name))}! <b>Session 1 is now free for everyone.</b> ${line}`) +
      (link ? btn(link[0], link[1]) : "") +
      h("Session 1") + schedule(one) +
      infoBox([["question", "Bring a friend", `Anyone can sign up for Session 1 for free on <a href="${joinLink}" style="color:${BLUE};font-weight:600">our site</a>. Sessions 2 to 4 are ${peso(PRICE.single)} each.`]]),
    end: "See you there!",
  });
  const text = `Hi ${first(r.name)}!\n\nSession 1 is now free for everyone. ${plain}${link ? `\n${link[1]}: ${link[0]}` : ""}\n\nSession 1:\n${scheduleText(one)}\n\nBring a friend: anyone can sign up for Session 1 for free on our site: ${joinLink}\nSessions 2 to 4 are ${peso(PRICE.single)} each.\n\nSee you there! ${askText}`;
  await mail({ to: r.email, subject: "Blueprint Session 1 is free", html, text });
}

/* 6. the team's answer to a question sent from the site's Ask form (api/questions.js).
   Signed "the Blueprint team": the person who answered isn't named, to keep the team's own details private too. */
const paras = (s) => esc(s).split(/\n{2,}/).map((x) => p(x.replace(/\n/g, "<br>"))).join("");
export async function answerEmail(q, answer) {
  const html = shell({
    preview: answer.slice(0, 110),
    kicker: "Your question",
    title: "Here’s our answer",
    body:
      p(`Hi ${esc(first(q.name))}! Thanks for asking.`) +
      paras(answer) +
      p(`The Blueprint team`, `color:${MUTED}`) +
      infoBox([["question", "You asked", `<span style="color:${MUTED}">${esc(q.message).replace(/\n/g, "<br>")}</span>`]]),
  });
  const text = `Hi ${first(q.name)}! Thanks for asking.\n\n${answer}\n\nThe Blueprint team\n\nYou asked:\n${q.message.replace(/^/gm, "> ")}\n\n${askText}`;
  await mail({ to: q.email, subject: "Re: your question to Blueprint", html, text });
}

/* to our own inbox when someone asks: no names or messages in it, just a nudge to open the workspace */
export async function newQuestionPing() {
  await mail({ to: process.env.GMAIL_USER, subject: "New question on the Blueprint site", html: shell({ preview: "Someone asked a question on the site.", kicker: "Team", title: "Someone asked a question", ask: false, body: p(`Answer it in the workspace: <a href="${SITE}/admin/#questions" style="color:${BLUE};font-weight:600">Questions</a>. Their details stay there, not in this inbox.`) }), text: `Someone asked a question on the site. Answer it in the workspace: ${SITE}/admin/#questions` });
}

/* the email building blocks, for the course emails in api/_learn.js */
export { mail, shell, p, h, btn, esc, first, peso, askText, chip, step, payCard, qrAttachment };
