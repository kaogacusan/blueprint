/* POST /api/learn: everything a learner does on /learn (Blueprint Online, migrations 014 and 017).
   { action: "catalog" }              the course page before sign-in: module titles, times, what you leave with
   { action: "link", k }              the button in their access email (api/_learn.js accessLink) → signed in
   { action: "code", email }          emails a 6-digit sign-in code if that email has Blueprint (same answer either way)
   { action: "verify", email, code }  the code → signed in
   { action: "me", token }            everything the page needs (api/_learn.js snapshot)
   { action: "done", token, module }  "I've sent my Module N form": marks it done, which opens the next one
   Who gets in: a paid (or refunded, free access) Blueprint sign-up under that email, or a gift to it (api/_learn.js grantFor).
   The token is signed with our own key and checked against the database every time. */
import { send, body, db, enc } from "./_lib.js";
import { COLS, ALL, catalog, signToken, learnerFrom, codeHash, newLoginCode, grantFor, learnerForGrant, fromLink, accessEmailOf, snapshot, codeEmail } from "./_learn.js";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const str = (v, max) => String(v ?? "").trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  const b = await body(req);
  try {
    switch (b.action) {
      case "catalog": return send(res, 200, await catalog());
      case "link": return await link(res, b);
      case "code": return await sendCode(res, b);
      case "verify": return await verify(res, b);
    }
    const l = await learnerFrom(b.token);
    if (!l) return send(res, 401, { error: "signin" });
    switch (b.action) {
      case "me":
        db(`learners?id=eq.${l.id}`, { method: "PATCH", data: { last_seen: new Date().toISOString() } }).catch(() => {});
        return send(res, 200, await snapshot(l));
      case "done": return await done(res, l, b);
    }
    return send(res, 400, { error: "action" });
  } catch (e) {
    console.error("learn failed", b.action, e.message);
    return send(res, 500, { error: "server" });
  }
}

const findByEmail = async (email) => (await db(`learners?select=${COLS}&email=eq.${enc(email)}`))[0] || null;
const signedIn = async (res, l) => send(res, 200, { token: signToken(l), ...(await snapshot(l)) });

/* ---------- the access email's button ---------- */
async function link(res, b) {
  const t = fromLink(b.k);
  if (!t) return send(res, 400, { error: "badlink" });
  const [r] = await db(`registrations?select=id,name,email,year,heard_from,consent,privacy_version,ticket,status,gift_name,gift_email&id=eq.${t.r}`);
  if (!r || !["paid", "refunded"].includes(r.status) || accessEmailOf(r) !== t.e) return send(res, 400, { error: "badlink" });
  return signedIn(res, await learnerForGrant(r, t.e));
}

/* ---------- email → 6-digit code ---------- */
async function mailCode(l) {
  // one code a minute at most, so nobody can flood an inbox
  if (l.login_sent_at && Date.now() - Date.parse(l.login_sent_at) < 45e3) return;
  const code = newLoginCode();
  await db(`learners?id=eq.${l.id}`, { method: "PATCH", data: {
    login_hash: codeHash(l.id, code), login_expires: new Date(Date.now() + 15 * 60e3).toISOString(), login_tries: 0, login_sent_at: new Date().toISOString(),
  } });
  await codeEmail(l, code);
}

async function sendCode(res, b) {
  const email = str(b.email, 200).toLowerCase();
  if (!EMAIL.test(email)) return send(res, 400, { error: "invalid" });
  let l = await findByEmail(email);
  if (!l) {
    // bought it (or got it as a gift) but never opened the course: their account is made now
    const r = await grantFor(email);
    if (r) l = await learnerForGrant(r, email);
  }
  if (l) await mailCode(l);
  return send(res, 200, { ok: true });
}

async function verify(res, b) {
  const email = str(b.email, 200).toLowerCase(), code = String(b.code || "").replace(/\D/g, "");
  const l = EMAIL.test(email) && (await findByEmail(email));
  if (!l || !l.login_hash || !l.login_expires || Date.parse(l.login_expires) < Date.now() || l.login_tries >= 5) return send(res, 400, { error: "expired" });
  if (code.length !== 6 || codeHash(l.id, code) !== l.login_hash) {
    await db(`learners?id=eq.${l.id}`, { method: "PATCH", data: { login_tries: l.login_tries + 1 } });
    return send(res, 400, { error: "wrong", left: Math.max(0, 4 - l.login_tries) });
  }
  await db(`learners?id=eq.${l.id}`, { method: "PATCH", data: { login_hash: "", login_expires: null, login_tries: 0 } });
  // paid after they first signed in: everything opens now
  if (l.unlocked.length < 4) {
    const r = await grantFor(l.email);
    if (r) return signedIn(res, await learnerForGrant(r, l.email));
  }
  return signedIn(res, l);
}

/* ---------- "I've sent my form" ---------- */
async function done(res, l, b) {
  const n = Number(b.module);
  if (!ALL.includes(n)) return send(res, 400, { error: "invalid" });
  if (!ALL.every((x) => l.unlocked.includes(x))) return send(res, 403, { error: "locked" });
  // in order: the module before has to be done first
  const work = await db(`course_work?select=session,completed_at&learner_id=eq.${l.id}`);
  const doneSet = new Set(work.filter((w) => w.completed_at).map((w) => w.session));
  if (n > 1 && !doneSet.has(n - 1)) return send(res, 409, { error: "order" });
  if (!doneSet.has(n)) {
    const now = new Date().toISOString();
    await db("course_work?on_conflict=learner_id,session", { method: "POST", prefer: "resolution=merge-duplicates",
      data: { learner_id: l.id, session: n, completed_at: now, updated_at: now } });
  }
  return send(res, 200, await snapshot(l));
}
