/* POST /api/signups: the team's buttons on the Sign-ups page.
   { action: "paid", id }   marks paid (or waitlist if one of their sessions is full) and sends that email.
                            For a paid Single Session waiting on an upgrade top-up (migration 011), it confirms the
                            top-up instead: the sign-up becomes a Full Pass and gets the "You're on the Full Pass" email.
                            Blueprint Online (ticket "online", Nov 11 night plan): no seat limit, Paid sends the course link
                            (to the gift's recipient if it's a gift).
   { action: "refunded", id } last week's workshop buyers: "Refunded, free access" (migration 017). Emails them the course free.
   { action: "resend", id } sends the last email again
   { action: "receipt", id } their receipt screenshot, decrypted (it's stored encrypted, see _lib.js)
   { action: "freeNews" }    emails "Session 1 is free" to everyone who signed up before, a few per call (the page calls
                             again until none are left). Each person gets it once. An unpaid single with Session 1 stops paying for it.
   Every action is written to the access log.
   Core team only: checked with the person's own login, not the service key. */
import { send, body, db, enc, settings, teamName, readFile, unseal, logAccess, paymentEmail, confirmEmail, waitlistEmail, freeEmail, freeNewsEmail, seatsOf, PRICE } from "./_lib.js";
import { onlinePayEmail, accessEmail, accessEmailOf } from "./_learn.js";

const COLS = "id,name,email,code,status,pay_token,proof_path,ticket,sessions,amount,friends,topup,gift_name,gift_email";
const ALL = [1, 2, 3, 4];

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  const who = await teamName(req);
  if (!who) return send(res, 403, { error: "not_on_team" });
  const { action, id } = await body(req);
  if (action === "freeNews") return freeNews(res, who);
  if (!Number.isInteger(id)) return send(res, 400, { error: "id" });

  try {
    const [r] = await db(`registrations?select=${COLS}&id=eq.${id}`);
    if (!r) return send(res, 404, { error: "not_found" });
    const stamp = new Date().toISOString();

    if (action === "receipt") {
      const f = r.proof_path && (await readFile(r.proof_path));
      if (!f) return send(res, 404, { error: "no_receipt" });
      await logAccess(who, "viewed receipt", id);
      return send(res, 200, { image: `data:image/jpeg;base64,${unseal(f.data).toString("base64")}` });
    }

    if (action === "paid" && r.ticket === "online") {
      if (r.status === "paid") return send(res, 200, { status: "paid", emailed: false });
      const [next] = await db(`registrations?id=eq.${id}`, { method: "PATCH", data: { status: "paid", paid_at: stamp, paid_by: who }, prefer: "return=representation" });
      let emailed = true;
      try { await accessEmail(next); await db(`registrations?id=eq.${id}`, { method: "PATCH", data: { emailed_at: stamp } }); }
      catch (e) { emailed = false; console.error("access email failed", id, e.message); }
      await logAccess(who, "marked paid (Blueprint Online)", id);
      return send(res, 200, { status: "paid", emailed, to: accessEmailOf(next), row: { ...next, emailed_at: emailed ? stamp : next.emailed_at } });
    }

    if (action === "refunded") {
      if (r.ticket === "free") return send(res, 400, { error: "free_ticket" });
      const [next] = await db(`registrations?id=eq.${id}`, { method: "PATCH", data: { status: "refunded" }, prefer: "return=representation" });
      let emailed = true;
      try { await accessEmail(next, { free: true }); await db(`registrations?id=eq.${id}`, { method: "PATCH", data: { emailed_at: stamp } }); }
      catch (e) { emailed = false; console.error("free access email failed", id, e.message); }
      await logAccess(who, "marked refunded, free access", id);
      return send(res, 200, { status: "refunded", emailed, to: accessEmailOf(next), row: { ...next, emailed_at: emailed ? stamp : next.emailed_at } });
    }

    if (action === "paid") {
      const upgrade = r.status === "paid" && r.topup > 0;
      if (r.status === "paid" && !upgrade) return send(res, 200, { status: "paid", emailed: false });
      // seats are per session: a Full Pass takes one in all four, a single only in the sessions picked, a Barkada three in all four
      const [{ costing }, paid] = await Promise.all([settings("costing"), db("registrations?select=id,ticket,sessions&status=eq.paid")]);
      const max = costing?.max || 20;
      const taken = (n) => paid.filter((x) => x.id !== r.id && x.sessions.includes(n)).reduce((t, x) => t + seatsOf(x), 0);

      if (upgrade) {
        // the sessions they'd add need a free seat each; if one is full, the upgrade can't happen: refund the top-up
        const adding = ALL.filter((n) => !r.sessions.includes(n));
        if (adding.some((n) => taken(n) + 1 > max)) {
          await db(`registrations?id=eq.${id}`, { method: "PATCH", data: { topup: 0, topup_at: null } });
          await logAccess(who, "upgrade refused (session full)", id);
          return send(res, 409, { error: "full", topup: r.topup });
        }
        const [next] = await db(`registrations?id=eq.${id}`, { method: "PATCH", prefer: "return=representation",
          data: { ticket: "full", sessions: ALL, amount: r.amount + r.topup, topup: 0, topup_at: null, paid_at: stamp, paid_by: who } });
        let emailed = true;
        try { await confirmEmail(next, { upgrade: r.topup }); await db(`registrations?id=eq.${id}`, { method: "PATCH", data: { emailed_at: stamp } }); }
        catch (e) { emailed = false; console.error("email failed", id, e.message); }
        await logAccess(who, "confirmed upgrade to Full Pass", id);
        return send(res, 200, { status: "paid", upgraded: true, emailed, row: { ...next, emailed_at: emailed ? stamp : next.emailed_at } });
      }

      const full = r.sessions.some((n) => taken(n) + seatsOf(r) > max);
      const patch = full ? { status: "waitlist" } : { status: "paid", paid_at: stamp, paid_by: who };
      const [next] = await db(`registrations?id=eq.${id}`, { method: "PATCH", data: patch, prefer: "return=representation" });
      let emailed = true;
      try { await (r.ticket === "free" ? freeEmail : full ? waitlistEmail : confirmEmail)(next); await db(`registrations?id=eq.${id}`, { method: "PATCH", data: { emailed_at: stamp } }); }
      catch (e) { emailed = false; console.error("email failed", id, e.message); }
      await logAccess(who, `marked ${next.status}`, id);
      return send(res, 200, { status: next.status, emailed, row: { ...next, emailed_at: emailed ? stamp : next.emailed_at } });
    }

    if (action === "resend") {
      const fn = r.status === "refunded" ? (x) => accessEmail(x, { free: true })
        : r.ticket === "online" ? { registered: onlinePayEmail, paid: accessEmail }[r.status]
        : r.ticket === "free" ? r.status !== "cancelled" && freeEmail : { registered: paymentEmail, paid: confirmEmail, waitlist: waitlistEmail }[r.status];
      if (!fn || !r.code) return send(res, 400, { error: "nothing_to_send" });
      await fn(r);
      await logAccess(who, "resent email", id);
      await db(`registrations?id=eq.${id}`, { method: "PATCH", data: { emailed_at: stamp } });
      return send(res, 200, { emailed: true, emailed_at: stamp });
    }
    return send(res, 400, { error: "action" });
  } catch (e) {
    console.error("signups failed", e.message);
    return send(res, 500, { error: "server" });
  }
}

/* ---------- "Session 1 is free" to everyone who signed up before ---------- */
const NEWS = "emailed: Session 1 is free";
const BATCH = 6; // emails per call, so one call stays well under the time limit
const WENT_FREE = "free (was a Session 1 single)";

/* Session 1 is free now: an unpaid single that has it stops paying for it.
   Not if they already sent a receipt: the team checks those by hand (refund or not). */
async function dropSession1(r) {
  if (r.status !== "registered" || r.ticket !== "single" || !r.sessions.includes(1) || r.proof_path) return { r, lowered: false };
  const rest = r.sessions.filter((n) => n !== 1);
  const patch = rest.length
    ? { amount: rest.length * PRICE.single }
    : { ticket: "free", amount: 0, status: "paid", paid_at: new Date().toISOString(), paid_by: WENT_FREE }; // needs migration 012
  try {
    const [next] = await db(`registrations?id=eq.${r.id}`, { method: "PATCH", data: patch, prefer: "return=representation" });
    return { r: next, lowered: true };
  } catch (e) {
    console.error("free session 1 update failed", r.id, e.message);
    return { r, lowered: false };
  }
}

async function freeNews(res, who) {
  try {
    const [rows, done] = await Promise.all([
      db(`registrations?select=${COLS},paid_by&status=neq.cancelled&order=id`),
      db(`access_log?select=target&action=eq.${enc(NEWS)}`),
    ]);
    const sent = new Set(done.map((x) => x.target));
    // free sign-ups from the site already know (and so does anything else under their email);
    // a Session 1 single we made free still gets told
    const knows = new Set(rows.filter((r) => r.ticket === "free" && r.paid_by !== WENT_FREE).map((r) => r.email.toLowerCase()));
    const todo = rows.filter((r) => r.code && !sent.has(String(r.id)) && !knows.has(r.email.toLowerCase()) && (r.ticket !== "free" || r.paid_by === WENT_FREE));
    const changed = [];
    let n = 0;
    for (const old of todo.slice(0, BATCH)) {
      const { r, lowered } = await dropSession1(old);
      if (lowered) changed.push(r);
      try { await freeNewsEmail(r, { lowered }); await logAccess(who, NEWS, r.id); n++; }
      catch (e) { console.error("free news email failed", r.id, e.message); }
    }
    return send(res, 200, { sent: n, left: todo.length - n, changed });
  } catch (e) {
    console.error("free news failed", e.message);
    return send(res, 500, { error: "server" });
  }
}
