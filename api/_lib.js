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

const shell = (inner) => `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#101114">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
<p style="margin:0 0 20px;font-weight:800;font-size:20px;letter-spacing:-0.03em;color:#061a4d">blueprint</p>
<div style="background:#fff;border:1px solid rgba(6,26,77,.1);border-radius:16px;padding:24px">${inner}</div>
<p style="margin:16px 4px 0;color:#6b7387;font-size:12px;line-height:1.5">Blueprint is an LAS 50 student venture at Ateneo de Manila. We will never ask for your GCash MPIN or a one-time code (OTP). <a href="${SITE}/privacy.html" style="color:#6b7387">Privacy notice</a></p>
</div></body></html>`;
const p = (s) => `<p style="margin:0 0 14px;line-height:1.55;font-size:15px">${s}</p>`;
const h = (s) => `<p style="margin:22px 0 8px;font-weight:700;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#0646c8">${s}</p>`;
const btn = (href, label) => `<p style="margin:18px 0"><a href="${href}" style="display:inline-block;background:#0646c8;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">${label}</a></p>`;
const schedule = (c) => `<table style="border-collapse:collapse;width:100%;font-size:14px">${c.sessions.map((s) => `<tr><td style="padding:6px 12px 6px 0;color:#3b4255;white-space:nowrap;vertical-align:top">${esc(s.when)}</td><td style="padding:6px 0">${esc(s.what)}</td></tr>`).join("")}</table>${p(`<span style="color:#3b4255;font-size:14px">${esc(c.venue)}</span>`)}`;
const scheduleText = (c) => c.sessions.map((s) => `- ${s.when}: ${s.what}`).join("\n") + `\n${c.venue}`;

/* 1. right after signing up: how to pay */
export async function paymentEmail(r) {
  const c = await context();
  const qr = await qrAttachment(c.qrPath);
  const link = payLink(r);
  const html = shell(
    p(`Hi ${esc(first(r.name))}!`) +
    p(`Thanks for signing up for Blueprint. Your sign-up number is <b style="font-family:'SF Mono',Menlo,monospace;letter-spacing:.06em">${esc(r.code)}</b>. <b>Your slot isn't locked until payment is in.</b> There are only ${c.seats} slots, and they go to the first ${c.seats} people who pay.`) +
    h("1. Pay with GCash") +
    p(`Send <b>${peso(c.price)}</b> for all four sessions${c.gcashName ? ` to <b>${esc(c.gcashName)}</b>` : ""}.`) +
    (qr ? `<p style="margin:0 0 14px"><img src="cid:gcashqr" alt="Blueprint GCash QR code" width="240" style="width:240px;max-width:100%;border-radius:12px;border:1px solid rgba(6,26,77,.1)"></p>` : "") +
    p(`On your phone? Tap the button below. The page shows the QR too, so you can save it and use <b>Upload QR</b> in GCash.`) +
    h("2. Send us your receipt") +
    p(`Take a screenshot of the GCash receipt, then upload it here:`) +
    btn(link, "I've paid: upload my receipt") +
    p(`We check it and email your slot confirmation within 24 hours.`) +
    (c.salesClose ? p(`Sales close <b>${esc(c.salesClose)}</b>.`) : "") +
    h("The schedule") + schedule(c) +
    p(`Questions? Just reply to this email.`)
  );
  const text = `Hi ${first(r.name)}!\n\nThanks for signing up for Blueprint (sign-up number ${r.code}). Your slot isn't locked until payment is in. Only ${c.seats} slots.\n\n1. Send ${peso(c.price)} by GCash${c.gcashName ? ` to ${c.gcashName}` : ""}${qr ? " (QR attached)" : ""}.\n2. Screenshot the receipt and upload it here: ${link}\n\nWe'll email your slot confirmation within 24 hours.${c.salesClose ? `\nSales close ${c.salesClose}.` : ""}\n\nSchedule:\n${scheduleText(c)}\n\nQuestions? Just reply to this email.`;
  await mail({ to: r.email, subject: `Pay to lock your Blueprint slot (${r.code})`, html, text, attachments: qr ? [qr] : [] });
}

/* 2. after the team checks the screenshot and clicks Paid: slot confirmation + pre-work */
export async function confirmEmail(r) {
  const c = await context();
  const html = shell(
    p(`Hi ${esc(first(r.name))}!`) +
    p(`<b>Your slot is confirmed.</b> We got your ${peso(c.price)}, and you're in for all four Blueprint sessions.`) +
    `<p style="margin:0 0 14px;padding:12px 14px;border-radius:12px;background:#eef3ff;color:#061a4d;font-size:14px">Sign-up number <b style="font-family:'SF Mono',Menlo,monospace;letter-spacing:.06em">${esc(r.code)}</b> · Paid</p>` +
    h("The schedule") + schedule(c) +
    h("Before Session 1") +
    (c.prework.length
      ? p(`Please do the pre-work before the first session. It's short:`) + `<ul style="margin:0 0 14px;padding-left:20px;line-height:1.7">${c.prework.map((x) => `<li><a href="${esc(x.url)}" style="color:#0646c8;font-weight:600">${esc(x.label || "Pre-work")}</a></li>`).join("")}</ul>`
      : p(`We'll email you the short pre-work before the first session.`)) +
    h("What to bring") +
    p(`A laptop or phone for every session. For Session 2, bring your current résumé and your LinkedIn link.`) +
    p(`See you there! Reply to this email if anything comes up.`)
  );
  const text = `Hi ${first(r.name)}!\n\nYour slot is confirmed. We got your ${peso(c.price)}, and you're in for all four Blueprint sessions (sign-up number ${r.code}).\n\nSchedule:\n${scheduleText(c)}\n\n${c.prework.length ? `Pre-work (before Session 1):\n${c.prework.map((x) => `- ${x.label || "Pre-work"}: ${x.url}`).join("\n")}` : "We'll email you the short pre-work before the first session."}\n\nBring a laptop or phone to every session. For Session 2, bring your résumé and LinkedIn link.\n\nSee you there!`;
  await mail({ to: r.email, subject: `Your Blueprint slot is confirmed (${r.code})`, html, text });
}

/* 3. paid after the seats ran out */
export async function waitlistEmail(r) {
  const c = await context();
  const html = shell(
    p(`Hi ${esc(first(r.name))}!`) +
    p(`Thank you for paying for Blueprint. We're sorry: all ${c.seats} slots were taken before your payment came in, so you're <b>first in line on the waitlist</b>.`) +
    p(`If a slot opens up, we'll email you right away. If not, we'll refund your ${peso(c.price)} to the same GCash account. Reply to this email if you'd rather have the refund now.`)
  );
  const text = `Hi ${first(r.name)}!\n\nThank you for paying for Blueprint. All ${c.seats} slots were taken before your payment came in, so you're on the waitlist. If a slot opens, we'll email you. If not, we'll refund your ${peso(c.price)} to the same GCash account. Reply if you'd rather have the refund now.`;
  await mail({ to: r.email, subject: "Blueprint is full: you're on the waitlist", html, text });
}
