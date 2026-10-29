/* Shared server code for the payment flow. Files starting with "_" are not routes.
   Runs on Vercel with the Supabase service key and the Blueprint Gmail app password,
   both set as environment variables (never in the repo, never sent to the browser). */
import nodemailer from "nodemailer";

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
async function qrAttachment(path) {
  const f = await readFile(path);
  return f && { filename: "blueprint-gcash-qr.png", content: f.data, cid: "gcashqr" };
}
export const payLink = (r) => `${SITE}/pay?t=${enc(r.pay_token)}`;

/* ---------- email layout: tables + inline styles, because that's all Gmail and Outlook reliably keep ---------- */
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif";
const MONO = "'SF Mono',Menlo,Consolas,monospace";
const shell = ({ preview, kicker, title, body }) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#eef2f8;font-family:${FONT};color:#101114;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f8"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dde4f0;border-radius:18px;overflow:hidden">
  <tr><td style="height:6px;line-height:6px;font-size:0;background:#0646c8;background-image:linear-gradient(100deg,#0646c8 0%,#006dff 55%,#2bb8f0 100%)">&nbsp;</td></tr>
  <tr><td style="padding:26px 28px 0"><a href="${SITE}" style="text-decoration:none"><img src="${SITE}/assets/email-logo.png" width="148" height="44" alt="blueprint" style="display:block;border:0;width:148px;height:44px;font-weight:800;font-size:22px;color:#061a4d"></a></td></tr>
  <tr><td style="padding:26px 28px 6px">
    <p style="margin:0 0 8px;font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#0646c8">${kicker}</p>
    <h1 style="margin:0;font-size:26px;line-height:1.2;letter-spacing:-0.02em;font-weight:800;color:#061a4d">${title}</h1>
  </td></tr>
  <tr><td style="padding:16px 28px 30px">${body}</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td style="padding:18px 28px 0;color:#6b7387;font-size:12px;line-height:1.6;text-align:center">
  Blueprint is an LAS 50 student venture at Ateneo de Manila.<br>We will never ask for your GCash MPIN or a one-time code (OTP).<br>
  <a href="${SITE}" style="color:#6b7387">ateneoblueprint.vercel.app</a> · <a href="${SITE}/privacy.html" style="color:#6b7387">Privacy notice</a>
</td></tr></table>
</td></tr></table></body></html>`;
const p = (s, extra = "") => `<p style="margin:0 0 14px;line-height:1.6;font-size:15px;color:#2a3042;${extra}">${s}</p>`;
const h = (s) => `<p style="margin:28px 0 12px;padding-top:22px;border-top:1px solid #e6ebf3;font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#0646c8">${s}</p>`;
const code = (s) => `<b style="font-family:${MONO};letter-spacing:.06em;color:#061a4d">${esc(s)}</b>`;
const chip = (inner) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 18px"><tr><td style="padding:10px 16px;border-radius:12px;background:#eef4ff;color:#061a4d;font-size:14px">${inner}</td></tr></table>`;
const btn = (href, label) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 16px"><tr><td style="border-radius:999px;background:#0646c8"><a href="${href}" style="display:inline-block;padding:14px 26px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;border-radius:999px">${label}</a></td></tr></table>`;
/* a numbered step: blue circle on the left, content on the right */
const step = (n, title, body) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px"><tr>
  <td width="40" valign="top" style="padding-top:1px"><div style="width:28px;height:28px;line-height:28px;border-radius:50%;background:#0646c8;color:#fff;text-align:center;font-weight:800;font-size:14px">${n}</div></td>
  <td valign="top"><p style="margin:3px 0 10px;font-weight:700;font-size:17px;color:#061a4d">${title}</p>${body}</td></tr></table>`;
/* the QR card: code, amount, who it goes to */
const payCard = (c, qr) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 14px;border:1px solid #dde4f0;border-radius:16px"><tr><td align="center" style="padding:22px 16px">
  ${qr ? `<img src="cid:gcashqr" alt="Blueprint GCash QR code" width="210" height="210" style="display:block;width:210px;height:210px;max-width:100%;border:0">` : ""}
  <p style="margin:${qr ? "14px" : "0"} 0 2px;font-size:28px;font-weight:800;letter-spacing:-0.02em;color:#061a4d">${peso(c.price)}</p>
  ${c.gcashName ? `<p style="margin:0;font-size:14px;color:#3b4255">to <b>${esc(c.gcashName)}</b></p>` : ""}
  ${c.gcashNumber ? `<p style="margin:2px 0 0;font-size:14px;color:#3b4255">GCash <span style="font-family:${MONO}">${esc(c.gcashNumber)}</span></p>` : ""}
</td></tr></table>`;
const schedule = (c) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${c.sessions.map((s, i) => `<tr>
  <td style="padding:10px 0;${i ? "border-top:1px solid #eef1f6;" : ""}vertical-align:top"><b style="color:#061a4d">${esc(s.what)}</b><br><span style="color:#5b6378">${esc(s.when)}</span></td></tr>`).join("")}</table>
  ${p(`📍 ${esc(c.venue)}`, "margin-top:10px;font-size:14px;color:#3b4255")}`;
const scheduleText = (c) => c.sessions.map((s) => `- ${s.when}: ${s.what}`).join("\n") + `\n${c.venue}`;

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
      chip(`Your sign-up number &nbsp;${code(r.code)}`) +
      step(1, "Pay with GCash",
        p(`Send <b>${peso(c.price)}</b> for all four sessions. Scan the QR in GCash, or send to the number below.`) +
        payCard(c, qr) +
        p(`On your phone? The button below shows the QR too. Save it, then in GCash tap <b>Pay QR</b> › <b>Upload QR</b>.`, "font-size:13px;color:#5b6378")) +
      step(2, "Upload your receipt",
        p(`Screenshot the GCash receipt, then upload it here:`) +
        btn(link, "I've paid: upload my receipt") +
        p(`We check it and email your slot confirmation within 24 hours.${c.salesClose ? ` Sales close <b>${esc(c.salesClose)}</b>.` : ""}`, "font-size:14px;color:#3b4255") +
        p(`Keep this email: the button is your own payment page, so you can pay later or upload a new screenshot. Lost it? Register again on the site with the same email and we'll send it again.`, "font-size:13px;color:#5b6378")) +
      h("The schedule") + schedule(c) +
      p(`Questions? Just reply to this email.`, "margin:18px 0 0"),
  });
  const text = `Hi ${first(r.name)}!\n\nThanks for signing up for Blueprint (sign-up number ${r.code}). Your slot isn't locked until payment is in. Only ${c.seats} slots.\n\n1. Send ${peso(c.price)} by GCash${to ? ` to ${to}` : ""}${qr ? " (QR attached)" : ""}.\n2. Screenshot the receipt and upload it here: ${link}\n\nWe'll email your slot confirmation within 24 hours.${c.salesClose ? `\nSales close ${c.salesClose}.` : ""}\n\nKeep this email: the link is your own payment page. Lost it? Register again on the site with the same email and we'll send it again.\n\nSchedule:\n${scheduleText(c)}\n\nQuestions? Just reply to this email.`;
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
      p(`Hi ${esc(first(r.name))}! We got your ${peso(c.price)}, and you're in for all four Blueprint sessions.`) +
      chip(`Sign-up number &nbsp;${code(r.code)} &nbsp;·&nbsp; <b style="color:#0a7a3e">Paid</b>`) +
      h("The schedule") + schedule(c) +
      h("Before Session 1") +
      (c.prework.length
        ? p(`Please do the pre-work before the first session. It's short:`) + `<ul style="margin:0 0 14px;padding-left:20px;line-height:1.8;font-size:15px">${c.prework.map((x) => `<li><a href="${esc(x.url)}" style="color:#0646c8;font-weight:600">${esc(x.label || "Pre-work")}</a></li>`).join("")}</ul>`
        : p(`We'll email you the short pre-work before the first session.`)) +
      h("What to bring") +
      p(`A laptop or phone for every session. For Session 2, bring your current résumé and your LinkedIn link.`) +
      p(`See you there! Reply to this email if anything comes up.`, "margin:18px 0 0"),
  });
  const text = `Hi ${first(r.name)}!\n\nYour slot is confirmed. We got your ${peso(c.price)}, and you're in for all four Blueprint sessions (sign-up number ${r.code}).\n\nSchedule:\n${scheduleText(c)}\n\n${c.prework.length ? `Pre-work (before Session 1):\n${c.prework.map((x) => `- ${x.label || "Pre-work"}: ${x.url}`).join("\n")}` : "We'll email you the short pre-work before the first session."}\n\nBring a laptop or phone to every session. For Session 2, bring your résumé and LinkedIn link.\n\nSee you there!`;
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
      p(`Hi ${esc(first(r.name))}! Thank you for paying for Blueprint. We're sorry: all ${c.seats} slots were taken before your payment came in, so you're <b>on the waitlist</b>.`) +
      p(`If a slot opens up, we'll email you right away. If not, we'll refund your ${peso(c.price)} to the same GCash account.`) +
      p(`Reply to this email if you'd rather have the refund now.`, "margin:18px 0 0"),
  });
  const text = `Hi ${first(r.name)}!\n\nThank you for paying for Blueprint. All ${c.seats} slots were taken before your payment came in, so you're on the waitlist. If a slot opens, we'll email you. If not, we'll refund your ${peso(c.price)} to the same GCash account. Reply if you'd rather have the refund now.`;
  await mail({ to: r.email, subject: "Blueprint is full: you're on the waitlist", html, text });
}
