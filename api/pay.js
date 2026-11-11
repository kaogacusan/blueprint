/* /api/pay: the private payment page (/pay?t=...) from the sign-up email.
   GET  ?t=token            their name, sign-up number, their ticket and amount, and our GCash QR
   POST { t, ref, image }   their GCash reference number (Blueprint Online, Nov 11 night plan), and optionally a screenshot
                            of the receipt (a JPEG data URL, shrunk in the browser). Older tickets: the screenshot alone.
   POST { t, upgrade: true } Single Session → Full Pass (migration 011). Not paid yet: the ticket just switches and
                            the amount becomes the Full Pass price. Already paid: they owe the difference (topup,
                            ₱500 after one session, ₱201 after two), pay it with the same QR and upload that receipt;
                            the team confirms it on Sign-ups (api/signups.js).
   The token is a random UUID only they got by email, so no one can see or upload for someone else.
   The screenshot is encrypted before it's stored; the team opens it through api/signups.js ("receipt"). */
import { send, body, db, enc, settings, readFile, saveFile, seal, ticketLine, sessionTitles, upgradeDue, PRICE } from "./_lib.js";

const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX = 3e6; // bytes, after the browser shrinks it (usually ~300 KB)

async function find(t) {
  if (!TOKEN.test(String(t || ""))) return null;
  const [r] = await db(`registrations?select=id,name,code,status,proof_path,proof_at,ticket,sessions,amount,friends,topup,topup_at,gcash_ref,ref_at,gift_name,gift_email&pay_token=eq.${enc(t)}`);
  return r || null;
}
const first = (name) => name.trim().split(/\s+/)[0];
/* paid for Single Sessions, asked to move up to the Full Pass, and still owes the top-up */
const topping = (r) => r.status === "paid" && r.topup > 0;
/* can move up now: Single Session with something left to pay, and not while we're checking a receipt */
const canUpgrade = (r) => upgradeDue(r) > 0 && ((r.status === "registered" && !r.proof_path) || (r.status === "paid" && !r.topup));
/* a top-up receipt only counts if it came in after they asked to upgrade */
const sentAt = (r) => (r.ref_at && !topping(r) ? r.ref_at : topping(r) ? (r.proof_at && r.topup_at && Date.parse(r.proof_at) > Date.parse(r.topup_at) ? r.proof_at : null) : r.proof_path ? r.proof_at : null);

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const r = await find(req.query?.t);
      if (!r) return send(res, 404, { error: "nomatch" });
      const [{ payment = {} }, titles] = await Promise.all([settings("payment"), sessionTitles()]);
      const up = topping(r);
      const qr = r.status === "registered" || up ? await readFile(payment.qrPath) : null;
      return send(res, 200, {
        name: first(r.name), code: r.code, status: r.status, ticket: r.ticket, topup: up,
        price: up ? r.topup : r.amount, for: up ? "the upgrade to the Full Pass" : ticketLine(r, titles),
        upgrade: canUpgrade(r) ? { due: upgradeDue(r), full: PRICE.full } : null,
        gcashName: payment.gcashName || "", gcashNumber: payment.gcashNumber || "",
        qr: qr ? `data:${qr.type};base64,${qr.data.toString("base64")}` : null,
        proofAt: sentAt(r), ref: r.gcash_ref || "", online: r.ticket === "online",
        gift: r.gift_email ? { name: r.gift_name, email: r.gift_email } : null,
      });
    }

    if (req.method !== "POST") return send(res, 405, { error: "method" });
    const b = await body(req);
    const r = await find(b.t);
    if (!r) return send(res, 404, { error: "nomatch" });
    if (r.status === "cancelled") return send(res, 409, { error: "cancelled" });

    if (b.upgrade === true) {
      if (!canUpgrade(r)) return send(res, 409, { error: r.status === "registered" && r.proof_path ? "checking" : "noupgrade" });
      const data = r.status === "registered"
        ? { ticket: "full", sessions: [1, 2, 3, 4], amount: PRICE.full } // not paid yet: just a different ticket
        : { topup: upgradeDue(r), topup_at: new Date().toISOString() };  // paid: owes the difference
      await db(`registrations?id=eq.${r.id}&status=eq.${r.status}`, { method: "PATCH", data });
      return send(res, 200, { ok: true });
    }

    const up = topping(r);
    if ((r.status === "paid" || r.status === "refunded") && !up) return send(res, 200, { ok: true, status: "paid", name: first(r.name) });

    // the GCash reference number: digits only (GCash shows 13, with spaces)
    const ref = String(b.ref ?? "").replace(/[\s-]/g, "");
    if (b.ref !== undefined && !/^\d{6,20}$/.test(ref)) return send(res, 400, { error: "ref" });
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.image || ""));
    const img = m && Buffer.from(m[1], "base64");
    if (ref && !b.image) {
      const ref_at = new Date().toISOString();
      await db(`registrations?id=eq.${r.id}`, { method: "PATCH", data: { gcash_ref: ref, ref_at } });
      return send(res, 200, { ok: true, status: r.status, topup: up, name: first(r.name), proofAt: ref_at, ref });
    }
    if (!img || img.length < 2000 || img[0] !== 0xff || img[1] !== 0xd8) return send(res, 400, { error: "image" });
    if (img.length > MAX) return send(res, 413, { error: "big" });

    // one per person (a new upload replaces the old one); the upgrade receipt sits next to the first one
    const path = up ? `proofs/${r.id}-topup.enc` : `proofs/${r.id}.enc`;
    await saveFile(path, seal(img), "application/octet-stream"); // locked with our key: only api/signups.js opens it
    const proof_at = new Date().toISOString();
    await db(`registrations?id=eq.${r.id}`, { method: "PATCH", data: { proof_path: path, proof_at, ...(ref ? { gcash_ref: ref, ref_at: proof_at } : {}) } });
    return send(res, 200, { ok: true, status: r.status, topup: up, name: first(r.name), proofAt: proof_at, ref });
  } catch (e) {
    console.error("pay failed", e.message);
    return send(res, 500, { error: "server" });
  }
}
