/* POST /api/questions: the team answers a question from the site (admin → Questions).
   { action: "answer", id, answer }  emails the answer (signed "the Blueprint team") and marks it answered
   Core team only: checked with the person's own login, not the service key. Logged in the access log. */
import { send, body, db, teamName, logAccess, answerEmail } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  const who = await teamName(req);
  if (!who) return send(res, 403, { error: "not_on_team" });
  const { action, id, answer } = await body(req);
  if (!Number.isInteger(id)) return send(res, 400, { error: "id" });
  const text = String(answer ?? "").trim();
  if (action !== "answer") return send(res, 400, { error: "action" });
  if (text.length < 2 || text.length > 4000) return send(res, 400, { error: "answer" });

  try {
    const [q] = await db(`questions?select=id,name,email,message,status&id=eq.${id}`);
    if (!q) return send(res, 404, { error: "not_found" });
    try { await answerEmail(q, text); }
    catch (e) { console.error("answer email failed", id, e.message); return send(res, 502, { error: "email" }); }
    const [row] = await db(`questions?id=eq.${id}`, { method: "PATCH", data: { status: "answered", answer: text, answered_by: who, answered_at: new Date().toISOString() }, prefer: "return=representation" });
    await logAccess(who, "answered question", `q${id}`);
    return send(res, 200, { row });
  } catch (e) {
    console.error("questions failed", e.message);
    return send(res, 500, { error: "server" });
  }
}
