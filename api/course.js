/* POST /api/course: the team's buttons on the workspace's Course page (Blueprint Online, migrations 014 and 018).
   { action: "receipt", id }            the GCash screenshot for course order <id>, decrypted
   { action: "check", id, ok, note }    ok: the payment is real (paid). Not ok: rejected, those sessions lock again
                                        (unless another order or a workshop ticket covers them) and they get an email.
   Review calls (review_slots):
   { action: "slotsAdd", date, from, to, reviewer, meet }   open times on that day (Manila time), one every 15 minutes
   { action: "slotRemove", id }         takes away an open time (not a booked one)
   { action: "slotCancel", id }         cancels someone's booking; they get an email asking them to pick another time
   Core team only, checked with their own login. Every action goes to the access log. */
import { send, body, db, teamName, readFile, unseal, logAccess } from "./_lib.js";
import { rejectEmail, reviewCancelledEmail, CALLS_UNTIL } from "./_learn.js";

export const REVIEWERS = ["Thomas Santos", "Kurt Boquiren"];
const LAST_CALL = Date.parse("2026-12-05T23:59:00+08:00"); // the calls run until Dec 5 (CALLS_UNTIL)

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  const who = await teamName(req);
  if (!who) return send(res, 403, { error: "not_on_team" });
  const b = await body(req);
  const { action, id, ok, note } = b;
  try {
    if (action === "slotsAdd") return await slotsAdd(res, who, b);
    if (action === "slotRemove" || action === "slotCancel") return await slotChange(res, who, action, id);
  } catch (e) {
    console.error("course slots failed", action, e.message);
    return send(res, 500, { error: "server" });
  }
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

/* ---------- review calls ---------- */
async function slotsAdd(res, who, b) {
  const date = String(b.date || ""), from = String(b.from || ""), to = String(b.to || "");
  const reviewer = REVIEWERS.includes(b.reviewer) ? b.reviewer : null;
  const meet = String(b.meet || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to) || !reviewer) return send(res, 400, { error: "invalid" });
  if (meet && !/^https:\/\/\S{4,290}$/i.test(meet)) return send(res, 400, { error: "meet" });
  const start = Date.parse(`${date}T${from}:00+08:00`), end = Date.parse(`${date}T${to}:00+08:00`);
  if (!(end > start) || end - start > 12 * 36e5) return send(res, 400, { error: "range" });
  if (start < Date.now()) return send(res, 400, { error: "past" });
  if (start > LAST_CALL) return send(res, 400, { error: "late", until: CALLS_UNTIL });
  const rows = [];
  for (let t = start; t + 15 * 60e3 <= end; t += 15 * 60e3) rows.push({ starts_at: new Date(t).toISOString(), minutes: 15, reviewer, meet_url: meet, added_by: who });
  if (!rows.length) return send(res, 400, { error: "range" });
  // the same reviewer at the same time is skipped, so adding a block twice is harmless
  const made = await db("review_slots?on_conflict=reviewer,starts_at", { method: "POST", prefer: "resolution=ignore-duplicates,return=representation", data: rows });
  await logAccess(who, "added review times", `${reviewer} ${date} ${from}-${to}`);
  return send(res, 200, { added: made.length, asked: rows.length });
}

async function slotChange(res, who, action, id) {
  if (!Number.isInteger(id)) return send(res, 400, { error: "id" });
  const [s] = await db(`review_slots?select=*&id=eq.${id}`);
  if (!s) return send(res, 404, { error: "not_found" });
  if (action === "slotRemove") {
    if (s.learner_id) return send(res, 409, { error: "booked" });
    await db(`review_slots?id=eq.${id}&learner_id=is.null`, { method: "DELETE" });
    return send(res, 200, { ok: true });
  }
  if (!s.learner_id) return send(res, 200, { ok: true, emailed: false });
  await db(`review_slots?id=eq.${id}`, { method: "PATCH", data: { learner_id: null, booked_at: null } });
  const [l] = await db(`learners?select=id,name,email&id=eq.${s.learner_id}`);
  let emailed = false;
  if (l && Date.parse(s.starts_at) > Date.now()) {
    try { await reviewCancelledEmail(l, s); emailed = true; } catch (e) { console.error("review cancel email failed", id, e.message); }
  }
  await logAccess(who, "cancelled a review call", `review:${id}`);
  return send(res, 200, { ok: true, emailed });
}
