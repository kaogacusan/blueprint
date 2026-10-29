/* Shared server code for the payment flow. Files starting with "_" are not routes.
   Runs on Vercel with the Supabase service key and the Blueprint Gmail app password,
   both set as environment variables (never in the repo, never sent to the browser). */
import nodemailer from "nodemailer";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

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

/* BP-7K2Q, their sign-up number: no 0/O or 1/I, so it reads cleanly off a phone */
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const newCode = () => "BP-" + Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => ALPHA[b % ALPHA.length]).join("");

/* ---------- email ---------- */
let mailer;
async function mail({ to, subject, html, text, attachments }) {
  mailer ||= nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } });
  await mailer.sendMail({ from: `Blueprint <${process.env.GMAIL_USER}>`, to, subject, html, text, attachments });
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const first = (name = "") => name.trim().split(/\s+/)[0] || "there";
const peso = (n) => `₱${Number(n || 0).toLocaleString("en-PH")}`;
const day = (iso, o = {}) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", ...o });
const time = (t) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };

/* what every email needs: price, sessions, payment setup */
async function context() {
  const [s, sessions] = await Promise.all([settings("payment", "costing"), db("sessions?select=n,title,date,start_time,end_time,venue,venue_status&order=n")]);
  const pay = s.payment || {};
  const lines = sessions.filter((x) => x.date).map((x) => ({
    mon: day(x.date, { weekday: undefined, day: undefined }).toUpperCase(),
    dd: day(x.date, { weekday: undefined, month: undefined }),
    when: `${day(x.date)}, ${time(x.start_time)}–${time(x.end_time)}`,
    what: `Session ${x.n}: ${x.title}`,
  }));
  const confirmed = sessions.find((x) => x.venue && x.venue_status === "Confirmed");
  return {
    price: s.costing?.ticket || 1999,
    seats: s.costing?.max || 20,
    gcashName: pay.gcashName || "",
    gcashNumber: pay.gcashNumber || "",
    qrPath: pay.qrPath || "",
    prework: (pay.prework || []).filter((p) => p?.url),
    salesClose: pay.salesClose ? day(pay.salesClose, { weekday: "long", month: "long" }) : "",
    sessions: lines,
    venue: confirmed ? `${confirmed.venue}, Ateneo de Manila` : "Ateneo de Manila (room to be confirmed, we'll email you)",
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
  Blueprint is an LAS 50 student venture at Ateneo de Manila.<br>We will never ask for your GCash MPIN or a one-time code (OTP).<br>
  <a href="${SITE}" style="color:#6b7387">ateneoblueprint.vercel.app</a> · <a href="${SITE}/privacy.html" style="color:#6b7387">Privacy notice</a>
</td></tr></table>
</td></tr></table></body></html>`;
const askText = `Questions? Ask us on our site and we'll email you back: ${ASK}`;
const p = (s, extra = "") => `<p style="margin:0 0 14px;line-height:1.6;font-size:16px;color:${TEXT};${extra}">${s}</p>`;
const h = (s) => `<p style="margin:26px 0 14px;padding-top:24px;border-top:1px solid ${LINE};font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:${BLUE}">${s}</p>`;
const code = (s) => `<b style="font-family:${MONO};letter-spacing:.04em;color:${INK}">${esc(s)}</b>`;
/* "Sign-up number BP-4FB3 | ● Paid" */
const STATE = { paid: ["Paid", "#0f8a46"], unpaid: ["Not paid yet", "#c26a00"], waitlist: ["Waitlist", "#c26a00"] };
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
const prework = (c) => c.prework.length
  ? `Do this short pre-work before the first session:<br>${c.prework.map((x) => `<a href="${esc(x.url)}" style="color:${BLUE};font-weight:600">${esc(x.label || "Pre-work")}</a>`).join("<br>")}`
  : "We’ll email you the short pre-work before the first session.";
const BRING = "A laptop or phone for every session. For Session 2, bring your current résumé and your LinkedIn link.";

/* 1. right after signing up: how to pay */
export async function paymentEmail(r) {
  const c = await context();
  const qr = await qrAttachment(c.qrPath);
  const link = payLink(r);
  const to = [c.gcashName, c.gcashNumber && `GCash ${c.gcashNumber}`].filter(Boolean).join(", ");
  const html = shell({
    preview: `Send ${peso(c.price)} by GCash and upload your receipt to lock your slot.`,
    kicker: "You're signed up",
    title: "Pay to lock your slot",
    body:
      p(`Hi ${esc(first(r.name))}! Thanks for signing up for Blueprint. <b>Your slot isn't locked until payment is in.</b> There are only ${c.seats} slots, and they go to the first ${c.seats} people who pay.`) +
      chip(r.code, "unpaid") +
      h("How to pay") +
      step(1, "Pay with GCash",
        p(`Send <b>${peso(c.price)}</b> for all four sessions. Scan the QR in GCash, or send to the number below.`) +
        payCard(c, qr) +
        p(`On your phone? The button below shows the QR too. Save it, then in GCash tap <b>Pay QR</b> › <b>Upload QR</b>.`, `font-size:14px;color:${MUTED}`)) +
      step(2, "Upload your receipt",
        p(`Screenshot the GCash receipt, then upload it here:`) +
        btn(link, "I've paid: upload my receipt") +
        p(`We check it and email your slot confirmation within 24 hours.${c.salesClose ? ` Sales close <b>${esc(c.salesClose)}</b>.` : ""}`, "font-size:15px") +
        p(`Keep this email: the button is your own payment page, so you can pay later or upload a new screenshot. Lost it? Register again on the site with the same email and we'll send it again.`, `font-size:14px;color:${MUTED}`)) +
      h("The schedule") + schedule(c),
  });
  const text = `Hi ${first(r.name)}!\n\nThanks for signing up for Blueprint (sign-up number ${r.code}). Your slot isn't locked until payment is in. Only ${c.seats} slots.\n\n1. Send ${peso(c.price)} by GCash${to ? ` to ${to}` : ""}${qr ? " (QR attached)" : ""}.\n2. Screenshot the receipt and upload it here: ${link}\n\nWe'll email your slot confirmation within 24 hours.${c.salesClose ? `\nSales close ${c.salesClose}.` : ""}\n\nKeep this email: the link is your own payment page. Lost it? Register again on the site with the same email and we'll send it again.\n\nSchedule:\n${scheduleText(c)}\n\n${askText}`;
  await mail({ to: r.email, subject: `Pay to lock your Blueprint slot (${r.code})`, html, text, attachments: qr ? [qr] : [] });
}

/* 2. after the team checks the screenshot and clicks Paid: slot confirmation + pre-work */
export async function confirmEmail(r) {
  const c = await context();
  const html = shell({
    preview: `You're in for all four Blueprint sessions. Here's the schedule and pre-work.`,
    kicker: "Payment received",
    title: "Your slot is confirmed",
    body:
      p(`Hi ${esc(first(r.name))}! We got your ${peso(c.price)}, and you’re in for all four Blueprint sessions.`) +
      chip(r.code, "paid") +
      h("The schedule") + schedule(c) +
      infoBox([["doc", "Before Session 1", prework(c)], ["laptop", "What to bring", BRING]]),
    end: "See you there!",
  });
  const text = `Hi ${first(r.name)}!\n\nYour slot is confirmed. We got your ${peso(c.price)}, and you're in for all four Blueprint sessions (sign-up number ${r.code}).\n\nSchedule:\n${scheduleText(c)}\n\n${c.prework.length ? `Pre-work (before Session 1):\n${c.prework.map((x) => `- ${x.label || "Pre-work"}: ${x.url}`).join("\n")}` : "We'll email you the short pre-work before the first session."}\n\nWhat to bring: ${BRING}\n\nSee you there! ${askText}`;
  await mail({ to: r.email, subject: `Your Blueprint slot is confirmed (${r.code})`, html, text });
}

/* 3. paid after the seats ran out */
export async function waitlistEmail(r) {
  const c = await context();
  const html = shell({
    preview: `All ${c.seats} slots filled before your payment came in. You're first in line.`,
    kicker: "Waitlist",
    title: "You're first in line",
    body:
      p(`Hi ${esc(first(r.name))}! Thank you for paying for Blueprint. We’re sorry: all ${c.seats} slots were taken before your payment came in, so you’re <b>on the waitlist</b>.`) +
      chip(r.code, "waitlist") +
      h("What happens next") +
      p(`If a slot opens up, we’ll email you right away. If not, we’ll refund your ${peso(c.price)} to the same GCash account.`) +
      p(`Would you rather have the refund now? Ask us on the site and we’ll send it.`),
  });
  const text = `Hi ${first(r.name)}!\n\nThank you for paying for Blueprint. All ${c.seats} slots were taken before your payment came in, so you're on the waitlist (sign-up number ${r.code}). If a slot opens, we'll email you. If not, we'll refund your ${peso(c.price)} to the same GCash account. Would you rather have the refund now? Ask us on the site and we'll send it.\n\n${askText}`;
  await mail({ to: r.email, subject: "Blueprint is full: you're on the waitlist", html, text });
}

/* 4. the team's answer to a question sent from the site's Ask form (api/questions.js).
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
