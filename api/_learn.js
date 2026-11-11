/* Shared code for Blueprint Online (/learn): who gets in, sign-in tokens, what a learner sees, and the course emails.
   Files starting with "_" are not routes. Tables: migrations 014, 017 and 018.

   Since the Nov 11 night plan there is one product, Blueprint Online (₱349), bought through the site's sign-up form:
   register → pay by GCash → type the reference number on /pay → the team clicks Paid → accessEmail() sends the course link.
   Who gets in: a paid (or "refunded, free access") sign-up under that email. A gift goes to gift_email, not the buyer.
   Modules open in order: each ends with a worksheet on the page (Thomas's questions, migration 018); submitting it opens
   the next module. The 15-minute résumé review: they book a time on the site whenever they like (review_slots). */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { db, enc, settings, subKey, SITE, mail, shell, p, h, btn, esc, first, peso, askText, chip, step, payCard, qrAttachment, payLink } from "./_lib.js";

export const LEARN = `${SITE}/learn`;
export const YEARS = ["1st year", "2nd year", "3rd year", "4th year", "Fresh grad", "Other"];
export const ALL = [1, 2, 3, 4];
export const COLS = "id,name,email,year,heard_from,unlocked,via,token_ver,login_hash,login_expires,login_tries,login_sent_at";

/* ---------- sign-in token: "<payload>.<signature>", kept in their browser for 60 days ---------- */
const b64 = (buf) => Buffer.from(buf).toString("base64url");
const sig = (s, label = "learn-token") => b64(createHmac("sha256", subKey(label)).update(s).digest());
const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
export function signToken(l) {
  const body = b64(JSON.stringify({ i: l.id, v: l.token_ver, e: Date.now() + 60 * 864e5 }));
  return `${body}.${sig(body)}`;
}
export async function learnerFrom(token) {
  const [body, mac] = String(token || "").split(".");
  if (!body || !mac || !same(sig(body), mac)) return null;
  let t; try { t = JSON.parse(Buffer.from(body, "base64url").toString()); } catch { return null; }
  if (!Number.isInteger(t.i) || !(t.e > Date.now())) return null;
  const [l] = await db(`learners?select=${COLS}&id=eq.${t.i}`);
  return l && l.token_ver === t.v ? l : null;
}

/* ---------- the link in the access email: signs them straight in. Tied to the sign-up, so a cancelled one stops working. ---------- */
export function accessLink(r) {
  const body = b64(JSON.stringify({ r: r.id, e: accessEmailOf(r) }));
  return `${LEARN}?k=${body}.${sig(body, "learn-link")}`;
}
export function fromLink(k) {
  const [body, mac] = String(k || "").split(".");
  if (!body || !mac || !same(sig(body, "learn-link"), mac)) return null;
  try { const t = JSON.parse(Buffer.from(body, "base64url").toString()); return Number.isInteger(t.r) && t.e ? t : null; } catch { return null; }
}

/* ---------- 6-digit sign-in codes: only a hash is stored ---------- */
export const codeHash = (id, code) => createHash("sha256").update(subKey("learn-code")).update(`${id}:${code}`).digest("hex");
export const newLoginCode = () => String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));

/* ---------- who gets in ---------- */
const GRANTS = "id,name,email,year,heard_from,consent,privacy_version,ticket,status,gift_name,gift_email";
export const accessEmailOf = (r) => (r.gift_email || r.email).toLowerCase();
/* the sign-up that gives this email the course: their own (not a gift for someone else), or a gift to them.
   Paid or refunded-with-free-access; last week's workshop tickets count too. */
export async function grantFor(email) {
  const e = enc(email.toLowerCase());
  const ok = "status=in.(paid,refunded)&ticket=neq.free";
  const [own, gifts] = await Promise.all([
    db(`registrations?select=${GRANTS}&email=eq.${e}&${ok}&order=id`),
    db(`registrations?select=${GRANTS}&gift_email=eq.${e}&${ok}&order=id`),
  ]);
  return gifts[0] || own.find((r) => !r.gift_email) || null;
}
export const viaOf = (r) => (r.status === "refunded" ? "refunded" : r.ticket !== "online" ? "workshop" : r.gift_email ? "gift" : "online");
/* their learner row, made the first time they come in. A gift's recipient never filled in our form, so we only keep their name and email. */
export async function learnerForGrant(r, email) {
  const em = email.toLowerCase();
  const [old] = await db(`learners?select=${COLS}&email=eq.${enc(em)}`);
  if (old) {
    if (old.unlocked.length < 4) {
      const [next] = await db(`learners?id=eq.${old.id}`, { method: "PATCH", prefer: "return=representation", data: { unlocked: ALL, via: viaOf(r) } });
      return { ...old, ...next };
    }
    return old;
  }
  const gift = r.gift_email && r.gift_email.toLowerCase() === em;
  const row = {
    name: (gift ? r.gift_name : r.name).slice(0, 120) || em.split("@")[0], email: em, year: gift ? "Other" : YEARS.includes(r.year) ? r.year : "Other",
    heard_from: gift ? "" : ["Booth", "Student org", "Friend", "Facebook", "Instagram", "Email", "Other"].includes(r.heard_from) ? r.heard_from : "",
    consent: true, privacy_version: (r.privacy_version || "").slice(0, 20), unlocked: ALL, via: viaOf(r),
  };
  try { return (await db("learners", { method: "POST", prefer: "return=representation", data: row }))[0]; }
  catch (e) { if (e.code === "23505") return (await db(`learners?select=${COLS}&email=eq.${enc(em)}`))[0]; throw e; }
}

/* ---------- everything the course needs, in one go ----------
   A module's video, slides and worksheet are only sent once it's open: they bought it, and the module before is submitted.
   Their own answers come back for every module they've started. The review call: theirs, and the open times. */
export const CALLS_UNTIL = "Dec 5";
const HOUR = 36e5;
export async function snapshot(l) {
  const paid = ALL.every((n) => l.unlocked.includes(n));
  const [mods, work, review] = await Promise.all([
    db("course_sessions?select=n,title,tagline,leave_with,minutes,page_text,credits,video_url,slides_url,worksheet,confirm_text&order=n"),
    db(`course_work?select=session,answers,completed_at,updated_at&learner_id=eq.${l.id}`),
    paid ? reviewFor(l) : null,
  ]);
  const w = Object.fromEntries(work.map((x) => [x.session, x]));
  const doneAt = (n) => w[n]?.completed_at || null;
  const open = (n) => paid && (n === 1 || !!doneAt(n - 1));
  return {
    me: { name: l.name, first: first(l.name), email: l.email, paid, via: l.via },
    modules: mods.map((m) => ({
      n: m.n, title: m.title, tagline: m.tagline, leaveWith: m.leave_with, minutes: m.minutes, text: m.page_text, credits: m.credits,
      open: open(m.n), doneAt: doneAt(m.n), savedAt: w[m.n]?.updated_at || null, answers: paid ? w[m.n]?.answers || {} : {},
      ...(open(m.n) ? { video: m.video_url || "", slides: m.slides_url || "", worksheet: m.worksheet || [], confirm: m.confirm_text || "" } : {}),
    })),
    review,
    finished: ALL.every((n) => doneAt(n)),
  };
}

/* their review call (with the Meet link) and the open times: 12+ hours away, nobody on them. Change or cancel until 24 hours before. */
export async function reviewFor(l) {
  const soon = new Date(Date.now() + 12 * HOUR).toISOString();
  const [mine, open] = await Promise.all([
    db(`review_slots?select=id,starts_at,minutes,reviewer,meet_url&learner_id=eq.${l.id}`),
    db(`review_slots?select=id,starts_at,minutes,reviewer&learner_id=is.null&starts_at=gt.${enc(soon)}&order=starts_at,reviewer&limit=300`),
  ]);
  const s = mine[0];
  return {
    mine: s ? { id: s.id, startsAt: s.starts_at, minutes: s.minutes, reviewer: s.reviewer, meet: s.meet_url, canChange: Date.parse(s.starts_at) - Date.now() > 24 * HOUR } : null,
    open: open.map((o) => ({ id: o.id, startsAt: o.starts_at, minutes: o.minutes, reviewer: o.reviewer })),
    until: CALLS_UNTIL,
  };
}

/* ---------- worksheet answers: only the questions in that module's worksheet, trimmed to size ---------- */
const TEXT = ["long", "short", "url", "choice"];
export function cleanAnswers(items, raw = {}) {
  const out = {};
  const str = (v, max) => (typeof v === "string" || typeof v === "number" ? String(v).slice(0, max) : "");
  for (const q of items || []) {
    if (!q.id || !(q.id in raw || `${q.id}_more` in raw)) continue;
    const v = raw[q.id];
    if (TEXT.includes(q.t)) {
      const s = str(v, q.t === "long" ? 5000 : 600);
      if (q.t === "choice" && s && !q.options.some((o) => o.v === s)) continue;
      out[q.id] = s;
      if (q.more) out[`${q.id}_more`] = str(raw[`${q.id}_more`], 200);
    } else if (q.t === "checks") {
      out[q.id] = Array.isArray(v) ? q.options.filter((o) => v.includes(o)) : [];
    } else if (q.t === "grid") {
      out[q.id] = Object.fromEntries(q.rows.map((r) => [r, Array.isArray(v?.[r]) ? q.cols.filter((c) => v[r].includes(c)) : []]));
    } else if (q.t === "tick") out[q.id] = v === true;
  }
  return out;
}
/* the questions still empty that need an answer before they can submit */
export const missing = (items, a) => (items || []).filter((q) => q.id && TEXT.includes(q.t) && !q.opt && !String(a[q.id] || "").trim()).map((q) => q.id);

/* the course page before anyone signs in: titles, times, what you leave with. No worksheets, no videos. */
export async function catalog() {
  const mods = await db("course_sessions?select=n,title,tagline,leave_with,minutes&order=n");
  return { modules: mods.map((m) => ({ n: m.n, title: m.title, tagline: m.tagline, leaveWith: m.leave_with, minutes: m.minutes })) };
}

/* ---------- emails ---------- */
const newDevice = `On another phone or laptop, open ateneoblueprint.vercel.app/learn and type this email. We’ll send you a 6-digit code to sign in.`;

/* 1. right after registering: pay ₱349, then type the GCash reference number on their payment page */
export async function onlinePayEmail(r) {
  const { payment: pay = {} } = await settings("payment");
  const c = { price: r.amount, gcashName: pay.gcashName || "", gcashNumber: pay.gcashNumber || "" };
  const qr = await qrAttachment(pay.qrPath);
  const link = payLink(r);
  const to = [c.gcashName, c.gcashNumber && `GCash ${c.gcashNumber}`].filter(Boolean).join(", ");
  const gift = r.gift_email ? ` We’ll send the access to <b>${esc(r.gift_name || r.gift_email)}</b> (${esc(r.gift_email)}).` : "";
  const giftText = r.gift_email ? ` We'll send the access to ${r.gift_name || r.gift_email} (${r.gift_email}).` : "";
  const html = shell({
    preview: `Send ${peso(c.price)} by GCash, then type the reference number on your payment page.`,
    kicker: "You're registered",
    title: "Two steps to get Blueprint",
    body:
      p(`Hi ${esc(first(r.name))}! Thanks for registering for <b>Blueprint Online</b>: four short modules plus a 15-minute review of your résumé and LinkedIn.${gift}`) +
      chip(r.code, "unpaid") +
      h("How to pay") +
      step(1, "Pay with GCash",
        p(`Send <b>${peso(c.price)}</b>. Scan the QR in GCash, or send to the number below.`) +
        payCard(c, qr) +
        p(`On your phone? The button below shows the QR too. Save it, then in GCash tap <b>Pay QR</b> › <b>Upload QR</b>.`, "font-size:14px;color:#5b6378")) +
      step(2, "Type your reference number",
        p(`Copy the reference number from your GCash receipt and type it on your payment page:`) +
        btn(link, "I've paid: enter my reference number") +
        p(`We check it and email the course link within 1 hour (8 AM to 10 PM).`, "font-size:15px") +
        p(`Keep this email: the button is your own payment page. Lost it? Register again on the site with the same email and we'll send it again.`, "font-size:14px;color:#5b6378")),
  });
  const text = `Hi ${first(r.name)}!\n\nThanks for registering for Blueprint Online (sign-up number ${r.code}).${giftText}\n\n1. Send ${peso(c.price)} by GCash${to ? ` to ${to}` : ""}${qr ? " (QR attached)" : ""}.\n2. Type the GCash reference number on your payment page: ${link}\n\nWe check it and email the course link within 1 hour (8 AM to 10 PM).\n\n${askText}`;
  await mail({ to: r.email, subject: `Pay ${peso(c.price)} to get Blueprint (${r.code})`, html, text, attachments: qr ? [qr] : [] });
}

/* 2. the team clicked Paid: "You're in. Here's Blueprint." To the gift's recipient instead when it's a gift.
   free: last week's workshop buyers (refunded, free access), Thomas's doc 03 message. */
export async function accessEmail(r, { free = false } = {}) {
  const gift = !!r.gift_email;
  const name = gift ? r.gift_name || "" : r.name;
  const link = accessLink(r);
  const lead = free
    ? "Thank you for signing up for Blueprint last week, and sorry the workshops didn’t push through. We’ve moved Blueprint online, and you get it free: four short modules plus a 15-minute review of your résumé and LinkedIn."
    : "Here’s your access to Blueprint.";
  const leadText = free
    ? "Thank you for signing up for Blueprint last week, and sorry the workshops didn't push through. We've moved Blueprint online, and you get it free: four short modules plus a 15-minute review of your résumé and LinkedIn."
    : "You're in. Here's your access to Blueprint.";
  const giftLine = gift ? `${first(r.name)} got you Blueprint, a short online course on your résumé, LinkedIn and how you introduce yourself, plus a 15-minute one-on-one review on Google Meet.` : "";
  const html = shell({
    preview: gift ? `${first(r.name)} got you Blueprint. Start with Module 1.` : free ? "Blueprint is online now, and it's free for you." : "Here's your access to Blueprint. Start with Module 1.",
    kicker: gift ? "A gift for you" : free ? "Blueprint Online" : "Payment received",
    title: gift ? `${esc(first(r.name))} got you Blueprint` : "You’re in. Here’s Blueprint.",
    body:
      p(`Hi${name ? ` ${esc(first(name))}` : ""}! ${gift ? esc(giftLine) : lead}`) +
      btn(link, "Open Blueprint") +
      p(`Start with Module 1. It takes about 20 minutes. You can also pick a time for your 15-minute résumé review now, on the course page. Your reviewer reads your worksheets before the call.`) +
      (free ? p(`If you know anyone graduating who’d want this, it’s ${peso(349)} until Sunday.`) : "") +
      p("The Blueprint Team") +
      h("Coming back later") +
      p(`The button above signs you in on this device. ${newDevice}`, "font-size:15px;color:#5b6378"),
  });
  const text = `Hi${name ? ` ${first(name)}` : ""}!\n\n${gift ? giftLine : leadText}\n\nHere's your access: ${link}\n\nStart with Module 1. It takes about 20 minutes. You can also pick a time for your 15-minute résumé review now, on the course page. Your reviewer reads your worksheets before the call.${free ? `\n\nIf you know anyone graduating who'd want this, it's ₱349 until Sunday.` : ""}\n\n${newDevice}\n\nThe Blueprint Team\n${askText}`;
  await mail({ to: accessEmailOf(r), subject: gift ? `${first(r.name)} got you Blueprint` : "You're in. Here's Blueprint.", html, text });
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

/* the old per-session receipts (course_orders, before the Nov 11 night plan). api/course.js still uses it for any leftover order. */
export async function rejectEmail(l, o) {
  const html = shell({
    preview: "We couldn't match your GCash receipt.",
    kicker: "Payment",
    title: "We couldn’t match your receipt",
    body:
      p(`Hi ${esc(first(l.name))}! We checked the receipt you sent (order <b>${esc(o.code)}</b>, ${peso(o.amount)}), and it didn’t match a payment we got.`) +
      (o.note ? p(`<b>Our note:</b> ${esc(o.note)}`) : ""),
  });
  const text = `Hi ${first(l.name)}!\n\nWe checked the receipt you sent (order ${o.code}, ${peso(o.amount)}) and it didn't match a payment we got.${o.note ? `\nOur note: ${o.note}` : ""}\n\n${askText}`;
  await mail({ to: l.email, subject: `Blueprint: we couldn't match your receipt (${o.code})`, html, text });
}

/* ---------- the review call ---------- */
const TZ = "Asia/Manila";
export const callTime = (iso) => new Date(iso).toLocaleString("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const gstamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
/* "Add to Google Calendar" for their call */
export function calLink(s) {
  const start = Date.parse(s.starts_at), end = start + (s.minutes || 15) * 60e3;
  const q = new URLSearchParams({ action: "TEMPLATE", text: "Blueprint résumé review", dates: `${gstamp(start)}/${gstamp(end)}`,
    details: `Your 15-minute résumé review with ${s.reviewer}.${s.meet_url ? ` Join: ${s.meet_url}` : ""} Change it on ${LEARN}#/review (up to 24 hours before).`, location: s.meet_url || "Google Meet" });
  return `https://calendar.google.com/calendar/render?${q}`;
}
const REVIEW_PAGE = `${LEARN}#/review`;

/* booked or moved: the time, who, the Meet link, and what to do before */
export async function reviewEmail(l, s, { moved = false } = {}) {
  const when = callTime(s.starts_at);
  const html = shell({
    preview: `${when} (Manila time), 15 minutes on Google Meet with ${s.reviewer}.`,
    kicker: moved ? "Review call moved" : "Review call booked",
    title: `${esc(when)}`,
    body:
      p(`Hi ${esc(first(l.name))}! Your 15-minute résumé review is ${moved ? "now " : ""}on <b>${esc(when)}</b> (Manila time) with <b>${esc(s.reviewer)}</b>, on Google Meet.`) +
      (s.meet_url ? btn(s.meet_url, "Google Meet link") : p(`We’ll email the Google Meet link before the call.`)) +
      p(`<a href="${esc(calLink(s))}" style="color:#0646c8;font-weight:600">Add it to Google Calendar</a>`, "font-size:15px") +
      h("Before the call") +
      p(`Finish all four worksheets on the course page. ${esc(first(s.reviewer))} reads them before your call, so the 15 minutes go to your résumé bullets, your LinkedIn or your intro, and your next step.`) +
      p(`Have your résumé and LinkedIn open.`) +
      p(`Need another time? Change it on the <a href="${REVIEW_PAGE}" style="color:#0646c8;font-weight:600">course page</a> up to 24 hours before. A missed call without notice isn’t rebooked.`, "font-size:15px;color:#5b6378"),
  });
  const text = `Hi ${first(l.name)}!\n\nYour 15-minute résumé review is ${moved ? "now " : ""}on ${when} (Manila time) with ${s.reviewer}, on Google Meet.\n${s.meet_url ? `Google Meet: ${s.meet_url}\n` : ""}Add to Google Calendar: ${calLink(s)}\n\nBefore the call: finish all four worksheets on the course page. ${first(s.reviewer)} reads them before your call. Have your résumé and LinkedIn open.\n\nNeed another time? Change it at ${REVIEW_PAGE} up to 24 hours before. A missed call without notice isn't rebooked.\n\nThe Blueprint Team\n${askText}`;
  await mail({ to: l.email, subject: `Your Blueprint résumé review: ${when}`, html, text });
}

/* the team had to cancel their time: pick another */
export async function reviewCancelledEmail(l, s) {
  const when = callTime(s.starts_at);
  const html = shell({
    preview: `We had to cancel your review call on ${when}. Pick another time.`,
    kicker: "Review call",
    title: "Please pick another time",
    body:
      p(`Hi ${esc(first(l.name))}! Sorry, we had to cancel your résumé review on <b>${esc(when)}</b>.`) +
      btn(REVIEW_PAGE, "Pick another time") +
      p(`Your worksheets are still saved, and your reviewer still reads them before the call.`, "font-size:15px;color:#5b6378"),
  });
  const text = `Hi ${first(l.name)}!\n\nSorry, we had to cancel your résumé review on ${when}. Pick another time here: ${REVIEW_PAGE}\n\nYour worksheets are still saved.\n\nThe Blueprint Team\n${askText}`;
  await mail({ to: l.email, subject: "Blueprint: please pick another time for your review", html, text });
}
