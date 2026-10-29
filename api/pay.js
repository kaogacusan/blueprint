/* POST /api/pay: someone who paid types their email, personal code and GCash reference number.
   Both email and code have to match, so no one can submit for someone else. */
import { send, body, db, enc, cleanCode } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  const b = await body(req);
  const email = String(b.email || "").trim().toLowerCase();
  const code = cleanCode(b.code);
  const ref = String(b.ref || "").replace(/[\s-]/g, "");
  if (!email || !/^BP-[A-Z0-9]{4}$/.test(code)) return send(res, 400, { error: "nomatch" });
  if (!/^\d{8,20}$/.test(ref)) return send(res, 400, { error: "ref" });

  try {
    const [r] = await db(`registrations?select=id,name,status,gcash_ref&code=eq.${enc(code)}&email=eq.${enc(email)}`);
    if (!r) return send(res, 404, { error: "nomatch" });
    const name = r.name.trim().split(/\s+/)[0];
    if (r.status === "paid") return send(res, 200, { ok: true, status: "paid", name });
    if (r.status === "cancelled") return send(res, 409, { error: "cancelled" });
    await db(`registrations?id=eq.${r.id}`, { method: "PATCH", data: { gcash_ref: ref, ref_at: new Date().toISOString() } });
    return send(res, 200, { ok: true, status: r.status, name });
  } catch (e) {
    console.error("pay failed", e.message);
    return send(res, 500, { error: "server" });
  }
}
