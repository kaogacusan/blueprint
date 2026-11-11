/* POST /api/learn: everything a learner does on /learn (Blueprint Online, migration 014).
   { action: "start", name, email, year, heard_from, consent, privacy_version }
        New email: their account is made and they're signed in right away (Session 1 is free). A paid workshop ticket
        under the same email opens every session. Known email: we email a sign-in code instead ({ needCode: true }).
   { action: "prices" }                  the prices, for the sign-up screen
   { action: "code", email }          emails a 6-digit sign-in code (says the same thing whether or not the email exists)
   { action: "verify", email, code }  the code → signed in
   { action: "me", token }            everything the page needs (api/_learn.js snapshot)
   { action: "save", token, session, answers, done, complete }   their worksheet, saved as they type
   { action: "pay", token }           our GCash QR, for the unlock screen
   { action: "buy", token, item: "single"|"rest", session, image }
        a GCash receipt (JPEG data URL, shrunk in the browser). Saved encrypted, like the workshop's. With "instant" on
        (settings "course"), the sessions open right away and the team checks the receipt after (api/course.js).
   The token is signed with our own key and checked against the database every time. */
import { send, body, db, enc, settings, newCode, readFile, saveFile, seal } from "./_lib.js";
import {
  YEARS, HEARD, COLS, PAID, signToken, learnerFrom, codeHash, newLoginCode, prices, restOf, restPrice, spentOn,
  workshopBuyer, snapshot, welcomeEmail, codeEmail, unlockEmail,
} from "./_learn.js";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const str = (v, max) => String(v ?? "").trim().slice(0, max);
const KEY = /^[a-z0-9][a-z0-9-]{0,59}$/;
const MAX_IMG = 3e6;

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  const b = await body(req);
  try {
    switch (b.action) {
      case "start": return await start(res, b);
      case "code": return await sendCode(res, b);
      case "verify": return await verify(res, b);
      case "prices": { const pr = await prices(); return send(res, 200, { single: pr.single, bundle: pr.bundle }); }
    }
    const l = await learnerFrom(b.token);
    if (!l) return send(res, 401, { error: "signin" });
    switch (b.action) {
      case "me":
        db(`learners?id=eq.${l.id}`, { method: "PATCH", data: { last_seen: new Date().toISOString() } }).catch(() => {});
        return send(res, 200, await snapshot(l));
      case "save": return await save(res, l, b);
      case "pay": return await payInfo(res);
      case "buy": return await buy(res, l, b);
    }
    return send(res, 400, { error: "action" });
  } catch (e) {
    console.error("learn failed", b.action, e.message);
    return send(res, 500, { error: "server" });
  }
}

const findByEmail = async (email) => (await db(`learners?select=${COLS}&email=eq.${enc(email)}`))[0] || null;

/* ---------- sign up / sign in ---------- */
async function start(res, b) {
  if (b.website) return send(res, 200, { ok: true }); // bots fill the hidden field
  const row = {
    name: str(b.name, 120), email: str(b.email, 200).toLowerCase(), year: b.year,
    heard_from: HEARD.includes(b.heard_from) ? b.heard_from : "", consent: b.consent === true, privacy_version: str(b.privacy_version, 20),
  };
  if (!row.name || !EMAIL.test(row.email) || !YEARS.includes(row.year) || !row.consent || !row.privacy_version) return send(res, 400, { error: "invalid" });

  const old = await findByEmail(row.email);
  if (old) { await mailCode(old); return send(res, 200, { needCode: true }); }

  // a flood of new accounts in an hour is a bot, not a booth: stop before Gmail blocks us
  const recent = await db(`learners?select=id&created_at=gte.${enc(new Date(Date.now() - 3600e3).toISOString())}`);
  if (recent.length >= 80) return send(res, 429, { error: "busy" });

  const workshop = await workshopBuyer(row.email);
  let l;
  try {
    [l] = await db("learners", { method: "POST", prefer: "return=representation",
      data: { ...row, unlocked: workshop ? [1, 2, 3, 4] : [1], via: workshop ? "workshop" : "" } });
  } catch (e) {
    if (e.code === "23505") { const again = await findByEmail(row.email); if (again) await mailCode(again); return send(res, 200, { needCode: true }); }
    throw e;
  }
  try { await welcomeEmail(l); } catch (e) { console.error("welcome email failed", l.id, e.message); }
  return send(res, 200, { token: signToken(l), ...(await snapshot(l)) });
}

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
  const l = await findByEmail(email);
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
  // a workshop ticket bought after they started the course still opens everything
  if (l.unlocked.length < 4 && (await workshopBuyer(l.email))) {
    [l.unlocked, l.via] = [[1, 2, 3, 4], "workshop"];
    await db(`learners?id=eq.${l.id}`, { method: "PATCH", data: { unlocked: l.unlocked, via: l.via } });
  }
  return send(res, 200, { token: signToken(l), ...(await snapshot(l)) });
}

/* ---------- their worksheet ---------- */
function clean(answers) {
  const out = {};
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return out;
  for (const [k, v] of Object.entries(answers).slice(0, 80)) {
    if (!KEY.test(k)) continue;
    if (typeof v === "string") out[k] = v.slice(0, 3000);
    else if (Array.isArray(v)) out[k] = v.slice(0, 12).map((x) => String(x ?? "").slice(0, 1500));
  }
  return out;
}
async function save(res, l, b) {
  const n = Number(b.session);
  if (!l.unlocked.includes(n)) return send(res, 403, { error: "locked" });
  const done = Array.isArray(b.done) ? [...new Set(b.done.map(String).filter((x) => KEY.test(x)))].slice(0, 40) : [];
  const now = new Date().toISOString();
  const data = { learner_id: l.id, session: n, answers: clean(b.answers), done, updated_at: now };
  if (b.complete === true) {
    const [prev] = await db(`course_work?select=completed_at&learner_id=eq.${l.id}&session=eq.${n}`);
    data.completed_at = prev?.completed_at || now;
  }
  await db("course_work?on_conflict=learner_id,session", { method: "POST", data, prefer: "resolution=merge-duplicates" });
  return send(res, 200, { ok: true, at: now, completedAt: data.completed_at || null });
}

/* ---------- paying ---------- */
async function payInfo(res) {
  const { payment = {} } = await settings("payment");
  const qr = await readFile(payment.qrPath);
  return send(res, 200, { qr: qr ? `data:${qr.type};base64,${qr.data.toString("base64")}` : null, name: payment.gcashName || "", number: payment.gcashNumber || "" });
}

async function buy(res, l, b) {
  const pr = await prices();
  // what they're buying: one session, or every paid session they don't have yet
  let sessions, item, amount;
  if (b.item === "single") {
    const n = Number(b.session);
    if (!PAID.includes(n) || l.unlocked.includes(n)) return send(res, 409, { error: "have" });
    [sessions, item, amount] = [[n], "single", pr.single];
  } else if (b.item === "rest") {
    sessions = restOf(l.unlocked);
    if (!sessions.length) return send(res, 409, { error: "have" });
    const mine = await db(`course_orders?select=amount,status&learner_id=eq.${l.id}`);
    [item, amount] = [sessions.length === 1 ? "single" : "bundle", restPrice(pr, l.unlocked, spentOn(mine))];
  } else return send(res, 400, { error: "item" });

  // a receipt already waiting for the same session: don't take a second one
  const waiting = await db(`course_orders?select=sessions&learner_id=eq.${l.id}&status=eq.pending`);
  if (waiting.some((o) => o.sessions.some((n) => sessions.includes(n)))) return send(res, 409, { error: "waiting" });

  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.image || ""));
  const img = m && Buffer.from(m[1], "base64");
  if (!img || img.length < 2000 || img[0] !== 0xff || img[1] !== 0xd8) return send(res, 400, { error: "image" });
  if (img.length > MAX_IMG) return send(res, 413, { error: "big" });

  let o;
  for (let i = 0; i < 5 && !o; i++) {
    try { [o] = await db("course_orders", { method: "POST", prefer: "return=representation", data: { learner_id: l.id, code: newCode(), item, sessions, amount } }); }
    catch (e) { if (e.code !== "23505") throw e; }
  }
  if (!o) throw new Error("no code");
  const path = `course/${o.id}.enc`;
  try {
    await saveFile(path, seal(img), "application/octet-stream"); // locked with our key: only api/course.js opens it
    await db(`course_orders?id=eq.${o.id}`, { method: "PATCH", data: { proof_path: path, proof_at: new Date().toISOString() } });
  } catch (e) {
    // no receipt, no order: they can try again
    await db(`course_orders?id=eq.${o.id}`, { method: "DELETE" }).catch(() => {});
    throw e;
  }

  if (pr.instant) {
    l.unlocked = [...new Set([...l.unlocked, ...sessions])].sort();
    await db(`learners?id=eq.${l.id}`, { method: "PATCH", data: { unlocked: l.unlocked } });
  }
  try { await unlockEmail(l, o, pr.instant); } catch (e) { console.error("unlock email failed", o.id, e.message); }
  return send(res, 200, { ok: true, order: o.code, instant: pr.instant, ...(await snapshot(l)) });
}
