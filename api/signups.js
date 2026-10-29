/* POST /api/signups: the team's buttons on the Sign-ups page.
   { action: "paid", id }   marks paid (or waitlist if the seats are full) and sends that email
   { action: "resend", id } sends the last email again
   { action: "receipt", id } their receipt screenshot, decrypted (it's stored encrypted, see _lib.js)
   Every action is written to the access log.
   Core team only: checked with the person's own login, not the service key. */
import { send, body, db, settings, teamName, readFile, unseal, logAccess, paymentEmail, confirmEmail, waitlistEmail } from "./_lib.js";

const COLS = "id,name,email,code,status,pay_token,proof_path";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  const who = await teamName(req);
  if (!who) return send(res, 403, { error: "not_on_team" });
  const { action, id } = await body(req);
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

    if (action === "paid") {
      if (r.status === "paid") return send(res, 200, { status: "paid", emailed: false });
      const [{ costing }, paid] = await Promise.all([settings("costing"), db("registrations?select=id&status=eq.paid")]);
      const full = paid.length >= (costing?.max || 20);
      const patch = full ? { status: "waitlist" } : { status: "paid", paid_at: stamp, paid_by: who };
      const [next] = await db(`registrations?id=eq.${id}`, { method: "PATCH", data: patch, prefer: "return=representation" });
      let emailed = true;
      try { await (full ? waitlistEmail : confirmEmail)(next); await db(`registrations?id=eq.${id}`, { method: "PATCH", data: { emailed_at: stamp } }); }
      catch (e) { emailed = false; console.error("email failed", id, e.message); }
      await logAccess(who, `marked ${next.status}`, id);
      return send(res, 200, { status: next.status, emailed, row: { ...next, emailed_at: emailed ? stamp : next.emailed_at } });
    }

    if (action === "resend") {
      const fn = { registered: paymentEmail, paid: confirmEmail, waitlist: waitlistEmail }[r.status];
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
