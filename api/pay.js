/* /api/pay: the private payment page (/pay?t=...) from the sign-up email.
   GET  ?t=token          their name, sign-up number, the price and our GCash QR
   POST { t, image }      a screenshot of their GCash receipt (a JPEG data URL, shrunk in the browser)
   The token is a random UUID only they got by email, so no one can see or upload for someone else. */
import { send, body, db, enc, settings, readFile, saveFile } from "./_lib.js";

const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX = 3e6; // bytes, after the browser shrinks it (usually ~300 KB)

async function find(t) {
  if (!TOKEN.test(String(t || ""))) return null;
  const [r] = await db(`registrations?select=id,name,code,status,proof_path,proof_at&pay_token=eq.${enc(t)}`);
  return r || null;
}
const first = (name) => name.trim().split(/\s+/)[0];

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const r = await find(req.query?.t);
      if (!r) return send(res, 404, { error: "nomatch" });
      const { payment = {}, costing = {} } = await settings("payment", "costing");
      const qr = r.status === "registered" ? await readFile(payment.qrPath) : null;
      return send(res, 200, {
        name: first(r.name), code: r.code, status: r.status, price: costing.ticket || 1999,
        gcashName: payment.gcashName || "",
        qr: qr ? `data:${qr.type};base64,${qr.data.toString("base64")}` : null,
        proofAt: r.proof_path ? r.proof_at : null,
      });
    }

    if (req.method !== "POST") return send(res, 405, { error: "method" });
    const b = await body(req);
    const r = await find(b.t);
    if (!r) return send(res, 404, { error: "nomatch" });
    if (r.status === "paid") return send(res, 200, { ok: true, status: "paid", name: first(r.name) });
    if (r.status === "cancelled") return send(res, 409, { error: "cancelled" });

    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.image || ""));
    const img = m && Buffer.from(m[1], "base64");
    if (!img || img.length < 2000 || img[0] !== 0xff || img[1] !== 0xd8) return send(res, 400, { error: "image" });
    if (img.length > MAX) return send(res, 413, { error: "big" });

    const path = `proofs/${r.id}.jpg`; // one per person: a new upload replaces the old one
    await saveFile(path, img, "image/jpeg");
    const proof_at = new Date().toISOString();
    await db(`registrations?id=eq.${r.id}`, { method: "PATCH", data: { proof_path: path, proof_at } });
    return send(res, 200, { ok: true, status: r.status, name: first(r.name), proofAt: proof_at });
  } catch (e) {
    console.error("pay failed", e.message);
    return send(res, 500, { error: "server" });
  }
}
