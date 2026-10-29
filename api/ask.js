/* POST /api/ask: the "Ask us" form on the site. Saves the question for the team to answer from the
   workspace (admin → Questions, api/questions.js); the answer goes to their email.
   Nothing is emailed to the address they typed until a person on the team replies, so the form
   can't be used to send mail to strangers. Same checks as the database (migration 008). */
import { send, body, db, enc, newQuestionPing } from "./_lib.js";

const str = (v, max) => String(v ?? "").trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  const b = await body(req);
  if (b.website) return send(res, 200, { ok: true }); // bots fill the hidden field

  const row = { name: str(b.name, 120), email: str(b.email, 200).toLowerCase(), message: str(b.message, 2000), privacy_version: str(b.privacy_version, 20) };
  if (!row.name || row.message.length < 3 || !row.privacy_version || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email)) return send(res, 400, { error: "invalid" });

  try {
    // a flood is a bot: a few per person a day, and a cap for the whole site per hour
    const dayAgo = new Date(Date.now() - 864e5).toISOString(), hourAgo = new Date(Date.now() - 3600e3).toISOString();
    const [mine, recent] = await Promise.all([
      db(`questions?select=id&email=eq.${enc(row.email)}&created_at=gte.${enc(dayAgo)}`),
      db(`questions?select=id,created_at&created_at=gte.${enc(hourAgo)}`),
    ]);
    if (mine.length >= 5 || recent.length >= 30) return send(res, 429, { error: "busy" });

    await db("questions", { method: "POST", data: row });
    // nudge the team inbox, at most once every 15 minutes
    const quarter = Date.now() - 15 * 60e3;
    if (!recent.some((q) => Date.parse(q.created_at) > quarter)) await newQuestionPing().catch((e) => console.error("ping failed", e.message));
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error("ask failed", e.message);
    return send(res, 500, { error: "server" });
  }
}
