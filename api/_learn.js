/* Shared code for Blueprint Online (/learn): sign-in tokens, what a learner gets to see, and the course emails.
   Files starting with "_" are not routes. Tables: migration 014. */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { db, enc, settings, subKey, SITE, mail, shell, p, h, btn, esc, first, peso, askText } from "./_lib.js";

export const LEARN = `${SITE}/learn`;
export const YEARS = ["1st year", "2nd year", "3rd year", "4th year", "Fresh grad", "Other"];
export const HEARD = ["", "Booth", "Student org", "Friend", "Facebook", "Instagram", "Email", "Other"];
export const GOALS = ["", "internship", "job", "org", "scholarship", "explore"];
export const FIELDS = ["", "business", "creative", "scitech", "policy", "humanities", "other"];
export const STAGES = ["", "none", "rough", "applying"];
export const FREE = [1];
export const PAID = [2, 3, 4];
export const COLS = "id,name,email,year,heard_from,goal,field,stage,unlocked,via,token_ver,login_hash,login_expires,login_tries,login_sent_at";

/* ---------- sign-in token: "<payload>.<signature>", kept in their browser for 60 days ---------- */
const b64 = (buf) => Buffer.from(buf).toString("base64url");
const sig = (s) => b64(createHmac("sha256", subKey("learn-token")).update(s).digest());
export function signToken(l) {
  const body = b64(JSON.stringify({ i: l.id, v: l.token_ver, e: Date.now() + 60 * 864e5 }));
  return `${body}.${sig(body)}`;
}
export async function learnerFrom(token) {
  const [body, mac] = String(token || "").split(".");
  if (!body || !mac) return null;
  const want = Buffer.from(sig(body)), got = Buffer.from(mac);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  let t; try { t = JSON.parse(Buffer.from(body, "base64url").toString()); } catch { return null; }
  if (!Number.isInteger(t.i) || !(t.e > Date.now())) return null;
  const [l] = await db(`learners?select=${COLS}&id=eq.${t.i}`);
  return l && l.token_ver === t.v ? l : null;
}

/* ---------- 6-digit sign-in codes: only a hash is stored ---------- */
export const codeHash = (id, code) => createHash("sha256").update(subKey("learn-code")).update(`${id}:${code}`).digest("hex");
export const newLoginCode = () => String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));

/* ---------- prices: one session, or every paid session they don't have yet ---------- */
export async function prices() {
  const { course = {} } = await settings("course");
  return { single: Number(course.single) || 149, bundle: Number(course.bundle) || 349, instant: course.instant !== false };
}
/* "the rest": every paid session they don't have. Never more than buying them one by one, and never more than the
   bundle minus what they already paid: start with one session, and the rest is just the difference. */
export const restOf = (unlocked) => PAID.filter((n) => !unlocked.includes(n));
export const spentOn = (orders) => orders.filter((o) => o.status !== "rejected").reduce((t, o) => t + o.amount, 0);
export const restPrice = (pr, unlocked, spent = 0) => Math.max(1, Math.min(restOf(unlocked).length * pr.single, pr.bundle - spent));

/* someone who paid for the live workshop gets every session online too */
export async function workshopBuyer(email) {
  const rows = await db(`registrations?select=id&email=eq.${enc(email)}&status=eq.paid&ticket=neq.free&limit=1`);
  return rows.length > 0;
}

/* ---------- everything the course page needs, in one go ----------
   Locked sessions only send their title, what you make, and their step titles (so the preview can show what's coming).
   The lesson, the video and the step prompts are only sent once that session is open. */
export async function snapshot(l) {
  const [sessions, work, orders, pr, s] = await Promise.all([
    db("course_sessions?select=n,title,tagline,leave_with,minutes,lesson,steps,video_url&order=n"),
    db(`course_work?select=session,answers,done,completed_at,updated_at&learner_id=eq.${l.id}`),
    db(`course_orders?select=code,item,sessions,amount,status,created_at,note&learner_id=eq.${l.id}&order=id`),
    prices(),
    settings("payment"),
  ]);
  const open = (n) => l.unlocked.includes(n);
  return {
    me: { name: l.name, first: first(l.name), email: l.email, year: l.year, unlocked: l.unlocked, via: l.via, goal: l.goal || "", field: l.field || "", stage: l.stage || "", heard: l.heard_from || "" },
    sessions: sessions.map((x) => ({
      n: x.n, title: x.title, tagline: x.tagline, leaveWith: x.leave_with, minutes: x.minutes, open: open(x.n), free: FREE.includes(x.n),
      outline: (x.steps || []).map((st) => ({ id: st.id, title: st.title, feeds: st.feeds || [] })),
      ...(open(x.n) ? { lesson: x.lesson, steps: x.steps, video: x.video_url } : {}),
    })),
    work: Object.fromEntries(work.map((w) => [w.session, { answers: w.answers, done: w.done, completedAt: w.completed_at, updatedAt: w.updated_at }])),
    orders: orders.map((o) => ({ code: o.code, sessions: o.sessions, amount: o.amount, status: o.status, at: o.created_at, note: o.status === "rejected" ? o.note : "" })),
    prices: { single: pr.single, bundle: pr.bundle, rest: restPrice(pr, l.unlocked, spentOn(orders)), restSessions: restOf(l.unlocked), spent: spentOn(orders) },
    gcash: { name: s.payment?.gcashName || "", number: s.payment?.gcashNumber || "" },
  };
}

/* the course page before anyone signs in: what each session makes and its lesson titles. No prompts, no videos. */
export async function catalog() {
  const [sessions, pr] = await Promise.all([db("course_sessions?select=n,title,tagline,leave_with,minutes,steps&order=n"), prices()]);
  return {
    sessions: sessions.map((x) => ({ n: x.n, title: x.title, tagline: x.tagline, leaveWith: x.leave_with, minutes: x.minutes, free: FREE.includes(x.n), lessons: (x.steps || []).map((st) => st.title) })),
    prices: { single: pr.single, bundle: pr.bundle },
  };
}

/* ---------- emails ---------- */
const and = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a.at(-1)}`);
const sessionWords = (ns) => (ns.length === 1 ? `Session ${ns[0]}` : `Sessions ${and(ns.map(String))}`);
const newDevice = `On a new phone or laptop, open the course and type this email. We’ll send you a 6-digit code to sign in.`;

export async function welcomeEmail(l) {
  const all = l.unlocked.length === 4;
  const html = shell({
    preview: all ? "Your workshop ticket comes with the whole online course. Start whenever you're ready." : "Session 1 is free and open now. Pick up where you left off any time.",
    kicker: "Blueprint Online",
    title: all ? "All four sessions are open" : "You’re in. Session 1 is open.",
    body:
      p(`Hi ${esc(first(l.name))}! ${all
        ? "Because you got a workshop ticket, the whole online course is yours: every lesson, every step, and your Blueprint at the end."
        : "Welcome to Blueprint. Session 1 is free: watch the lesson, do the steps, and watch your Blueprint fill in as you go."}`) +
      btn(LEARN, all ? "Open my course" : "Continue Session 1") +
      h("Coming back later") +
      p(`Your answers save as you type. ${newDevice}`, "font-size:15px"),
  });
  const text = `Hi ${first(l.name)}!\n\n${all ? "Your workshop ticket comes with the whole online course." : "Welcome to Blueprint. Session 1 is free and open now."}\n\nOpen it here: ${LEARN}\n\nYour answers save as you type. ${newDevice}\n\n${askText}`;
  await mail({ to: l.email, subject: all ? "Your Blueprint course is open" : "Blueprint: Session 1 is open", html, text });
}

export async function codeEmail(l, code) {
  const html = shell({
    preview: `Your Blueprint sign-in code is ${code}. It works once and expires in 15 minutes.`,
    kicker: "Sign in",
    title: "Your sign-in code",
    ask: false,
    body:
      p(`Hi ${esc(first(l.name))}! Type this on the Blueprint course page to sign in:`) +
      `<p style="margin:8px 0 18px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:38px;font-weight:800;letter-spacing:.22em;color:#0b1640">${esc(code)}</p>` +
      p(`It works once and expires in 15 minutes. Only type it at <b>ateneoblueprint.vercel.app/learn</b>. We’ll never ask you for it in a message or a call.`, "font-size:15px") +
      p(`Didn’t ask for this? You can ignore it. Nobody can sign in without the code.`, "font-size:14px;color:#5b6378"),
  });
  const text = `Hi ${first(l.name)}!\n\nYour Blueprint sign-in code: ${code}\n\nIt works once and expires in 15 minutes. Only type it at ateneoblueprint.vercel.app/learn. We'll never ask you for it in a message or a call.\n\nDidn't ask for this? Ignore it.`;
  await mail({ to: l.email, subject: `${code} is your Blueprint sign-in code`, html, text });
}

export async function unlockEmail(l, o, instant) {
  const what = sessionWords(o.sessions);
  const html = shell({
    preview: instant ? `${what} ${o.sessions.length > 1 ? "are" : "is"} open. We'll double-check your receipt.` : `We got your receipt for ${what}.`,
    kicker: "Payment received",
    title: instant ? `${what} ${o.sessions.length > 1 ? "are" : "is"} open` : "We got your receipt",
    body:
      p(`Hi ${esc(first(l.name))}! Thanks for paying <b>${peso(o.amount)}</b> for ${what} (order <b>${esc(o.code)}</b>).`) +
      p(instant
        ? "You can start right now. We’ll double-check your GCash receipt within a day, and only email you again if something doesn’t match."
        : "We’ll check your GCash receipt within a day and email you as soon as it’s open.") +
      btn(LEARN, instant ? `Open ${what}` : "Back to my course"),
  });
  const text = `Hi ${first(l.name)}!\n\nThanks for paying ${peso(o.amount)} for ${what} (order ${o.code}). ${instant ? "It's open now. We'll double-check your receipt within a day and only email again if something doesn't match." : "We'll check your receipt within a day and email you when it's open."}\n\n${LEARN}\n\n${askText}`;
  await mail({ to: l.email, subject: instant ? `Blueprint: ${what} ${o.sessions.length > 1 ? "are" : "is"} open (${o.code})` : `Blueprint: we got your receipt (${o.code})`, html, text });
}

export async function rejectEmail(l, o) {
  const what = sessionWords(o.sessions);
  const html = shell({
    preview: `We couldn't match your GCash receipt for ${what}.`,
    kicker: "Payment",
    title: "We couldn’t match your receipt",
    body:
      p(`Hi ${esc(first(l.name))}! We checked the receipt you sent for ${what} (order <b>${esc(o.code)}</b>, ${peso(o.amount)}), and it didn’t match a payment we got.`) +
      (o.note ? p(`<b>Our note:</b> ${esc(o.note)}`) : "") +
      p(`So ${what} ${o.sessions.length > 1 ? "are" : "is"} locked again for now. Your answers are all still saved. If you did pay, upload the right screenshot on the course page and we’ll check it again.`) +
      btn(LEARN, "Upload the right receipt"),
  });
  const text = `Hi ${first(l.name)}!\n\nWe checked the receipt you sent for ${what} (order ${o.code}, ${peso(o.amount)}) and it didn't match a payment we got.${o.note ? `\nOur note: ${o.note}` : ""}\n\n${what} ${o.sessions.length > 1 ? "are" : "is"} locked again for now. Your answers are still saved. If you did pay, upload the right screenshot: ${LEARN}\n\n${askText}`;
  await mail({ to: l.email, subject: `Blueprint: we couldn't match your receipt (${o.code})`, html, text });
}
