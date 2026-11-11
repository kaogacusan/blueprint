/* Shared code for Blueprint Online (/learn): who gets in, sign-in tokens, what a learner sees, and the course emails.
   Files starting with "_" are not routes. Tables: migrations 014 and 017.

   Since the Nov 11 night plan there is one product, Blueprint Online (₱349), bought through the site's sign-up form:
   register → pay by GCash → type the reference number on /pay → the team clicks Paid → accessEmail() sends the course link.
   Who gets in: a paid (or "refunded, free access") sign-up under that email. A gift goes to gift_email, not the buyer.
   Modules open in order: Module 2 after they finish Module 1's form, and so on. Module 4 done → the 1:1 booking link. */
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
   A module's video, slides and form are only sent once it's open: they bought it, and the module before is done.
   The 1:1 booking link only once Module 4 is done. */
export async function snapshot(l) {
  const [mods, work, { course = {} }] = await Promise.all([
    db("course_sessions?select=n,title,tagline,leave_with,minutes,page_text,credits,video_url,slides_url,form_url&order=n"),
    db(`course_work?select=session,completed_at&learner_id=eq.${l.id}`),
    settings("course"),
  ]);
  const paid = ALL.every((n) => l.unlocked.includes(n));
  const doneAt = Object.fromEntries(work.filter((w) => w.completed_at).map((w) => [w.session, w.completed_at]));
  const open = (n) => paid && (n === 1 || !!doneAt[n - 1]);
  const finished = ALL.every((n) => doneAt[n]);
  return {
    me: { name: l.name, first: first(l.name), email: l.email, paid, via: l.via },
    modules: mods.map((m) => ({
      n: m.n, title: m.title, tagline: m.tagline, leaveWith: m.leave_with, minutes: m.minutes, text: m.page_text, credits: m.credits,
      open: open(m.n), doneAt: doneAt[m.n] || null,
      ...(open(m.n) ? { video: m.video_url || "", slides: m.slides_url || "", form: m.form_url || "" } : {}),
    })),
    coaching: doneAt[4] ? { booking: course.booking || "", until: course.callsUntil || "Dec 5" } : null,
    finished,
  };
}

/* the course page before anyone signs in: titles, times, what you leave with. No forms, no videos. */
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
      p(`Hi ${esc(first(r.name))}! Thanks for registering for <b>Blueprint Online</b>: four short modules plus a 15-minute 1:1 with Thomas.${gift}`) +
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
    ? "Thank you for signing up for Blueprint last week, and sorry the workshops didn’t push through. We’ve moved Blueprint online, and you get it free: four short modules plus a 15-minute 1:1 with Thomas."
    : "Here’s your access to Blueprint.";
  const leadText = free
    ? "Thank you for signing up for Blueprint last week, and sorry the workshops didn't push through. We've moved Blueprint online, and you get it free: four short modules plus a 15-minute 1:1 with Thomas."
    : "You're in. Here's your access to Blueprint.";
  const giftLine = gift ? `${first(r.name)} got you Blueprint, a short online course on your résumé, LinkedIn and how you introduce yourself, plus a 15-minute 1:1 with Thomas.` : "";
  const html = shell({
    preview: gift ? `${first(r.name)} got you Blueprint. Start with Module 1.` : free ? "Blueprint is online now, and it's free for you." : "Here's your access to Blueprint. Start with Module 1.",
    kicker: gift ? "A gift for you" : free ? "Blueprint Online" : "Payment received",
    title: gift ? `${esc(first(r.name))} got you Blueprint` : "You’re in. Here’s Blueprint.",
    body:
      p(`Hi${name ? ` ${esc(first(name))}` : ""}! ${gift ? esc(giftLine) : lead}`) +
      btn(link, "Open Blueprint") +
      p(`Start with Module 1. It takes about 20 minutes. When you finish Module 4, you’ll get the link to book your 15-minute 1:1 with Thomas.`) +
      (free ? p(`If you know anyone graduating who’d want this, it’s ${peso(349)} until Sunday.`) : "") +
      p("The Blueprint Team") +
      h("Coming back later") +
      p(`The button above signs you in on this device. ${newDevice}`, "font-size:15px;color:#5b6378"),
  });
  const text = `Hi${name ? ` ${first(name)}` : ""}!\n\n${gift ? giftLine : leadText}\n\nHere's your access: ${link}\n\nStart with Module 1. It takes about 20 minutes. When you finish Module 4, you'll get the link to book your 15-minute 1:1 with Thomas.${free ? `\n\nIf you know anyone graduating who'd want this, it's ₱349 until Sunday.` : ""}\n\n${newDevice}\n\nThe Blueprint Team\n${askText}`;
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
