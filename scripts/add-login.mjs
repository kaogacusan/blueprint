// Give a teammate a workspace login, or reset a forgotten password.
// Public sign-up is switched off, so this is the only way accounts get made.
//
//   node scripts/add-login.mjs <Name> <email> [viewer|guest]   add the person (or their email) and make a login
//   node scripts/add-login.mjs --reset <email>                  new password for an existing login
//
// "viewer" = core team, sees everything incl. sign-ups. "guest" = sees the workspace but not sign-ups' personal data.
// Prints a short starter password once (e.g. Sam-482190). Send it privately. It's only for the first sign-in:
// the workspace makes them pick their own password before anything else.
// Needs .env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Never commit .env.
import fs from "node:fs";
import crypto from "node:crypto";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL_ = env.SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const cap = (w) => w[0].toUpperCase() + w.slice(1);
/* Name + digits, at least 10 characters (our Supabase minimum): Sam-482190, Robin-4821, Al-1234567 */
const password = (name) => {
  const first = cap(name.split(/\s+/)[0].split("@")[0]);
  const n = Math.max(4, 10 - first.length - 1);
  return `${first}-${crypto.randomInt(10 ** (n - 1), 10 ** n)}`;
};

async function api(path, opts = {}) {
  const r = await fetch(`${URL_}${path}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  const text = await r.text();
  const body = text ? JSON.parse(text) : null;
  if (!r.ok) throw new Error(`${r.status} ${body?.msg || body?.message || text}`);
  return body;
}
async function findUser(email) {
  for (let page = 1; ; page++) {
    const { users } = await api(`/auth/v1/admin/users?page=${page}&per_page=200`);
    const u = users.find((x) => x.email?.toLowerCase() === email);
    if (u || users.length < 200) return u;
  }
}

const args = process.argv.slice(2);
if (args[0] === "--reset") {
  const email = (args[1] || "").toLowerCase();
  const u = await findUser(email);
  if (!u) throw new Error(`No login for ${email}`);
  const [row] = await api(`/rest/v1/team?email=eq.${encodeURIComponent(email)}&select=name`);
  const pw = password(row?.name || email);
  await api(`/auth/v1/admin/users/${u.id}`, { method: "PUT", body: JSON.stringify({ password: pw, user_metadata: { ...u.user_metadata, temp_password: true } }) });
  console.log(`${email}\t${pw}`);
} else {
  const [name, rawEmail, access = "viewer"] = args;
  const email = (rawEmail || "").toLowerCase();
  if (!name || !email.includes("@") || !["viewer", "guest"].includes(access)) {
    console.log("Usage: node scripts/add-login.mjs <Name> <email> [viewer|guest]   |   --reset <email>");
    process.exit(1);
  }
  // team row: fill in the email on an existing person, or add them
  const [byEmail] = await api(`/rest/v1/team?email=eq.${encodeURIComponent(email)}&select=id,name`);
  const [byName] = await api(`/rest/v1/team?name=ilike.${encodeURIComponent(name)}&select=id,email,access`);
  if (!byEmail && byName) {
    if (byName.email && byName.email !== email) throw new Error(`${name} already has the login ${byName.email}`);
    await api(`/rest/v1/team?id=eq.${byName.id}`, { method: "PATCH", body: JSON.stringify({ email, ...(byName.access === "owner" ? {} : { access }) }) });
  } else if (!byEmail) {
    const [{ count }] = await api(`/rest/v1/team?select=count`);
    await api(`/rest/v1/team`, { method: "POST", body: JSON.stringify({ name, email, access, sort: count }) });
  }
  if (await findUser(email)) {
    console.log(`${email} already has a login. Use --reset to give them a new password.`);
  } else {
    const pw = password(name);
    await api(`/auth/v1/admin/users`, { method: "POST", body: JSON.stringify({ email, password: pw, email_confirm: true, user_metadata: { temp_password: true } }) });
    console.log(`${name}\t${email}\t${pw}`);
  }
}
