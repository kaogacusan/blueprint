#!/usr/bin/env node
/* Upload a deck to Supabase so the team can present it from /admin.

   node scripts/upload-deck.mjs private/decks/s1

   The folder needs:
     deck.json   { "slug", "session_no", "title", "subtitle" }
     deck.html   the slides (see admin/present.js for the format)
     assets/     images, referenced in deck.html as asset:name.ext

   Deck folders live in private/ (gitignored) because the repo is public.
   Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (gitignored). */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const dir = process.argv[2];
if (!dir || !existsSync(join(dir, "deck.json"))) {
  console.error("Usage: node scripts/upload-deck.mjs <deck folder with deck.json>");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(".env", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"); process.exit(1); }
const auth = { apikey: key, Authorization: `Bearer ${key}` };

const meta = JSON.parse(readFileSync(join(dir, "deck.json"), "utf8"));
const html = readFileSync(join(dir, "deck.html"), "utf8");
const TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".gif": "image/gif", ".mp4": "video/mp4" };

// 1. images → private "decks" bucket, under <slug>/
const assetsDir = join(dir, "assets");
const files = existsSync(assetsDir) ? readdirSync(assetsDir).filter((f) => TYPES[extname(f).toLowerCase()]) : [];
for (const f of files) {
  const res = await fetch(`${url}/storage/v1/object/decks/${meta.slug}/${f}`, {
    method: "POST",
    headers: { ...auth, "Content-Type": TYPES[extname(f).toLowerCase()], "x-upsert": "true", "Cache-Control": "3600" },
    body: readFileSync(join(assetsDir, f)),
  });
  if (!res.ok) { console.error(`✗ ${f}: ${res.status} ${await res.text()}`); process.exit(1); }
  console.log(`✓ ${f}`);
}

// warn about images the slides use but the folder doesn't have
const used = [...new Set([...html.matchAll(/asset:([\w./-]+)/g)].map((m) => m[1]))];
const missing = used.filter((n) => !files.includes(n));
if (missing.length) console.warn(`! deck.html uses images that aren't in assets/: ${missing.join(", ")}`);

// 2. slides → "decks" table
const row = { ...meta, html, slide_count: (html.match(/<section class="slide[\s"]/g) || []).length, updated_at: new Date().toISOString() };
const res = await fetch(`${url}/rest/v1/decks?on_conflict=slug`, {
  method: "POST",
  headers: { ...auth, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
  body: JSON.stringify(row),
});
if (!res.ok) { console.error(`✗ deck row: ${res.status} ${await res.text()}`); process.exit(1); }
console.log(`✓ ${meta.slug}: "${meta.title}" — ${row.slide_count} slides, ${files.length} images`);
