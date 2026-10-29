/* POST /api/register: the site's sign-up form. Saves the sign-up with a sign-up number and a private
   payment link, and emails the GCash QR. Same checks as the database (migrations 001, 003, 005, 006, 007).
   A new sign-up gets its payment link back so the site can send them straight to /pay. */
import { send, body, db, enc, settings, newCode, paymentEmail } from "./_lib.js";

const YEARS = ["3rd year", "4th year", "Fresh grad", "Other"];
const HEARD = ["", "Student org", "Friend", "Facebook", "Instagram", "Email", "Other"];
const str = (v, max) => String(v ?? "").trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  const b = await body(req);
  if (b.website) return send(res, 200, { ok: true }); // bots fill the hidden field

  const row = {
    name: str(b.name, 120), email: str(b.email, 200).toLowerCase(), course: str(b.course, 120),
    year: b.year, mobile: str(b.mobile, 40), heard_from: b.heard_from || "", heard_org: b.heard_from === "Student org" ? str(b.heard_org, 120) : "",
    consent: b.consent === true, privacy_version: str(b.privacy_version, 20),
  };
  const digits = row.mobile.replace(/\D/g, "");
  if (!row.name || !row.course || !YEARS.includes(row.year) || !HEARD.includes(row.heard_from) || !row.consent || !row.privacy_version
    || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email) || !/^\+?[\d\s-]+$/.test(row.mobile) || digits.length < 10 || digits.length > 13) {
    return send(res, 400, { error: "invalid" });
  }

  try {
    // already signed up: resend the payment email (at most every 10 minutes), say nothing else
    // (never hand back their link here: anyone can type someone else's email)
    const [old] = await db(`registrations?select=id,name,email,code,status,emailed_at,pay_token&email=eq.${enc(row.email)}`);
    if (old) {
      const quiet = old.emailed_at && Date.now() - Date.parse(old.emailed_at) < 10 * 60e3;
      if (old.status === "registered" && old.code && !quiet) {
        await paymentEmail(old);
        await db(`registrations?id=eq.${old.id}`, { method: "PATCH", data: { emailed_at: new Date().toISOString() } });
      }
      return send(res, 200, { ok: true, again: true });
    }

    // new sign-ups stop after the sales-close day (Manila time), set in Payment setup
    const { payment } = await settings("payment");
    if (payment?.salesClose && Date.now() > Date.parse(`${payment.salesClose}T23:59:59+08:00`)) return send(res, 403, { error: "closed" });

    // a flood of sign-ups in an hour is a bot, not a class: stop before Gmail blocks us
    const hourAgo = new Date(Date.now() - 3600e3).toISOString();
    const recent = await db(`registrations?select=id&created_at=gte.${enc(hourAgo)}`);
    if (recent.length >= 40) return send(res, 429, { error: "busy" });

    let saved;
    for (let i = 0; i < 5 && !saved; i++) {
      try { [saved] = await db("registrations", { method: "POST", data: { ...row, code: newCode() }, prefer: "return=representation" }); }
      catch (e) { if (e.code !== "23505") throw e; } // same code picked twice: try another
    }
    if (!saved) throw new Error("no code");

    try {
      await paymentEmail(saved);
      await db(`registrations?id=eq.${saved.id}`, { method: "PATCH", data: { emailed_at: new Date().toISOString() } });
    } catch (e) {
      console.error("payment email failed", saved.id, e.message); // the team sees "email not sent" and can resend
    }
    return send(res, 200, { ok: true, pay: `/pay?t=${saved.pay_token}` });
  } catch (e) {
    console.error("register failed", e.message);
    return send(res, 500, { error: "server" });
  }
}
