/* POST /api/course: the team's buttons on the workspace's Course page (Blueprint Online, migration 014).
   { action: "receipt", id }            the GCash screenshot for course order <id>, decrypted
   { action: "check", id, ok, note }    ok: the payment is real (paid). Not ok: rejected, those sessions lock again
                                        (unless another order or a workshop ticket covers them) and they get an email.
   Core team only, checked with their own login. Every action goes to the access log. */
import { send, body, db, teamName, readFile, unseal, logAccess } from "./_lib.js";
import { rejectEmail } from "./_learn.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  const who = await teamName(req);
  if (!who) return send(res, 403, { error: "not_on_team" });
  const { action, id, ok, note } = await body(req);
  if (!Number.isInteger(id)) return send(res, 400, { error: "id" });
  try {
    const [o] = await db(`course_orders?select=*&id=eq.${id}`);
    if (!o) return send(res, 404, { error: "not_found" });

    if (action === "receipt") {
      const f = o.proof_path && (await readFile(o.proof_path));
      if (!f) return send(res, 404, { error: "no_receipt" });
      await logAccess(who, "viewed course receipt", `course:${id}`);
      return send(res, 200, { image: `data:image/jpeg;base64,${unseal(f.data).toString("base64")}` });
    }

    if (action === "check") {
      // two teammates on the same receipt: the first answer counts
      if (o.status !== "pending") return send(res, 409, { error: "checked", row: o });
      const stamp = new Date().toISOString();
      if (ok === true) {
        const [next] = await db(`course_orders?id=eq.${id}`, { method: "PATCH", prefer: "return=representation", data: { status: "paid", checked_at: stamp, checked_by: who, note: "" } });
        // if instant unlock was off, this is when the sessions open
        const [l] = await db(`learners?select=id,unlocked&id=eq.${o.learner_id}`);
        const unlocked = [...new Set([...l.unlocked, ...o.sessions])].sort();
        if (unlocked.length !== l.unlocked.length) await db(`learners?id=eq.${l.id}`, { method: "PATCH", data: { unlocked } });
        await logAccess(who, "course payment ok", `course:${id}`);
        return send(res, 200, { row: next });
      }
      const [next] = await db(`course_orders?id=eq.${id}`, { method: "PATCH", prefer: "return=representation",
        data: { status: "rejected", checked_at: stamp, checked_by: who, note: String(note || "").slice(0, 500) } });
      // lock again what nothing else pays for
      const [[l], others] = await Promise.all([
        db(`learners?select=id,name,email,unlocked,via&id=eq.${o.learner_id}`),
        db(`course_orders?select=sessions&learner_id=eq.${o.learner_id}&status=neq.rejected`),
      ]);
      const covered = new Set([1, ...others.flatMap((x) => x.sessions), ...(l.via === "workshop" ? [1, 2, 3, 4] : [])]);
      const unlocked = l.unlocked.filter((n) => covered.has(n));
      await db(`learners?id=eq.${l.id}`, { method: "PATCH", data: { unlocked } });
      let emailed = true;
      try { await rejectEmail(l, next); } catch (e) { emailed = false; console.error("reject email failed", id, e.message); }
      await logAccess(who, "course payment rejected", `course:${id}`);
      return send(res, 200, { row: next, emailed });
    }
    return send(res, 400, { error: "action" });
  } catch (e) {
    console.error("course failed", e.message);
    return send(res, 500, { error: "server" });
  }
}
