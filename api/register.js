/* POST /api/register: the site's sign-up form. Since the Nov 11 night plan it sells one thing, Blueprint Online
   (ticket "online", ₱349, migration 017), with an optional gift: gift_name + gift_email get the access instead.
   Sales close Sun Nov 15, 10 PM (SALES_CLOSE in _lib.js). The older tickets below stay readable for last week's rows.
   Before that: Saves the sign-up with a sign-up number and a private
   payment link, and emails the GCash QR. Same checks as the database (migrations 001, 003, 005, 006, 007, 010).
   The ticket (Full Pass, Single Session with the sessions they picked, or Barkada with two friends) sets the amount here, never in the browser.
   A new paid sign-up gets its payment link back so the site can send them straight to /pay.
   A free Session 1 sign-up has nothing to pay: its seat is saved right away (or it waits in line if Session 1 is full). */
import { send, body, db, enc, settings, newCode, paymentEmail, freeEmail, ticketFor, seatsOf, startsAt, SALES_CLOSE } from "./_lib.js";
import { onlinePayEmail } from "./_learn.js";

const YEARS = ["1st year", "2nd year", "3rd year", "4th year", "Fresh grad", "Other"];
const HEARD = ["", "Booth", "Student org", "Friend", "Facebook", "Instagram", "Email", "Other"];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
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
  const tk = ticketFor(b.ticket, b.sessions, b.friends, row.email);
  const online = tk?.ticket === "online";
  // a gift: both or neither, and not their own email
  const gift = { gift_name: online ? str(b.gift_name, 120) : "", gift_email: online ? str(b.gift_email, 200).toLowerCase() : "" };
  if ((gift.gift_name || gift.gift_email) && (!gift.gift_name || !EMAIL.test(gift.gift_email) || gift.gift_email === row.email)) return send(res, 400, { error: "invalid" });
  if (online && Date.now() >= SALES_CLOSE) return send(res, 403, { error: "closed" });
  const digits = row.mobile.replace(/\D/g, "");
  if (!tk || !row.name || !row.course || !YEARS.includes(row.year) || !HEARD.includes(row.heard_from) || !row.consent || !row.privacy_version
    || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email) || !/^\+?[\d\s-]+$/.test(row.mobile) || digits.length < 10 || digits.length > 13) {
    return send(res, 400, { error: "invalid" });
  }

  const free = tk.ticket === "free";
  try {
    // one free and one paid sign-up per email (migration 012)
    const mine = await db(`registrations?select=id,name,email,code,status,emailed_at,pay_token,ticket,sessions,amount,friends&email=eq.${enc(row.email)}`);
    // Session 1 is already in their paid ticket: nothing to add
    if (free && mine.some((r) => r.ticket !== "free" && r.status !== "cancelled" && r.sessions?.includes(1))) return send(res, 200, { ok: true, again: true, has1: true });
    // already signed up: resend their email (at most every 10 minutes), say nothing else
    // (never hand back their link here: anyone can type someone else's email)
    const old = mine.find((r) => (r.ticket === "free") === free);
    if (old) {
      const quiet = old.emailed_at && Date.now() - Date.parse(old.emailed_at) < 10 * 60e3;
      const resend = old.ticket === "free" ? freeEmail : old.status !== "registered" ? null : old.ticket === "online" ? onlinePayEmail : paymentEmail;
      if (resend && old.code && !quiet) {
        await resend(old);
        await db(`registrations?id=eq.${old.id}`, { method: "PATCH", data: { emailed_at: new Date().toISOString() } });
      }
      return send(res, 200, { ok: true, again: true, free });
    }

    // sign-ups for a session stop when it starts (Manila time, from Schedule)
    const sessions = await db("sessions?select=n,date,start_time");
    if (!online && sessions.some((x) => tk.sessions.includes(x.n) && Date.now() >= startsAt(x))) return send(res, 403, { error: "closed" });

    // a flood of sign-ups in an hour is a bot, not a class: stop before Gmail blocks us
    const hourAgo = new Date(Date.now() - 3600e3).toISOString();
    const recent = await db(`registrations?select=id&created_at=gte.${enc(hourAgo)}`);
    if (recent.length >= 40) return send(res, 429, { error: "busy" });

    // free: the seat is saved now, while Session 1 has room (same count as api/signups.js)
    let seat = {};
    if (free) {
      const [{ costing }, paid] = await Promise.all([settings("costing"), db("registrations?select=ticket,sessions&status=eq.paid")]);
      const taken = paid.filter((x) => x.sessions.includes(1)).reduce((t, x) => t + seatsOf(x), 0);
      seat = taken >= (costing?.max || 20) ? { status: "waitlist" } : { status: "paid", paid_at: new Date().toISOString(), paid_by: "free" };
    }

    let saved;
    for (let i = 0; i < 5 && !saved; i++) {
      try { [saved] = await db("registrations", { method: "POST", data: { ...row, ...tk, ...gift, ...seat, code: newCode() }, prefer: "return=representation" }); }
      catch (e) {
        if (free && e.code === "23514") return send(res, 503, { error: "free_not_ready" }); // migration 012 not run yet
        if (e.code === "23505" && /email/.test(e.message)) return send(res, 200, { ok: true, again: true, free }); // sent twice at once
        if (e.code !== "23505") throw e; // same code picked twice: try another
      }
    }
    if (!saved) throw new Error("no code");

    try {
      await (free ? freeEmail : online ? onlinePayEmail : paymentEmail)(saved);
      await db(`registrations?id=eq.${saved.id}`, { method: "PATCH", data: { emailed_at: new Date().toISOString() } });
    } catch (e) {
      console.error("payment email failed", saved.id, e.message); // the team sees "email not sent" and can resend
    }
    if (free) return send(res, 200, { ok: true, free: true, status: saved.status });
    return send(res, 200, { ok: true, pay: `/pay?t=${saved.pay_token}`, amount: saved.amount });
  } catch (e) {
    console.error("register failed", e.message);
    return send(res, 500, { error: "server" });
  }
}
