# Blueprint — landing page (mockup)

One page. Plain HTML + CSS + JS. No build step, no installs.

## Run it

```bash
cd ~/blueprint
python3 -m http.server 5180
```

Open http://localhost:5180

Use the server. The 3D will not load if you double-click `index.html`.

## Files

| File | What it is |
|---|---|
| `index.html` | All the content and copy. Edit text here. |
| `styles.css` | All the design. Colors and fonts are at the top (`:root`). |
| `main.js` | Small interactions: scroll reveals, hero selection box that hops between "paper." and "person.", hero grid that lights up around the mouse, sneak peek gallery, AAA card that flips by itself, Send button, FAQ, register form. |
| `scene3d.js` | The 2 scroll-driven 3D pieces (see below). |
| `assets/` | Logo files and `vendor/` (three.js, stored locally so 3D works offline). |
| `config.js` | Public Supabase URL + anon key (safe to be public). |
| `admin/` | Team admin page: Inquiries, Presentations, Team. Also the slide player (`present.js`, `present.css`). |
| `present/` | `/present/<deck>` opens a deck full screen. |
| `supabase/migrations/` | Database tables and access rules. |
| `scripts/upload-deck.mjs` | Uploads a deck from `private/decks/<name>/` to Supabase. |

## 3D pieces

The 3D models do not follow the mouse. Scroll moves them. They have no box around them, so they sit right in the section.

1. **What is Blueprint:** a blueprint resume. It comes in rolled up, opens flat as you scroll to it, and turns away as you scroll past.
2. **Sessions:** 4 blocks rise one by one as you scroll, and the camera moves around them. Point at a session card and its block lifts and glows.

If a device cannot show 3D, the page shows a flat version instead.

## Sneak peek

On a computer, the section stops on screen and the 6 cards slide sideways as you scroll down. On a phone, you swipe the cards.
Each card plays a short animation when it comes into view. The AAA Card flips by itself. Press **Send** on the Outreach Card.

## Page order

Hero → Problem ("Sound familiar?" pills) → What is Blueprint → 4 sessions → What you'll do → Sneak peek → Take-home (with what each one is for) → FAQ → Final CTA → Footer

## Still placeholder (on purpose)

- **Sessions 3 and 4** show "Details coming soon." Add the real titles in `index.html` when they are final.
- **No socials / email in the footer.** Add them when they are confirmed.
- **No price anywhere.** This is on purpose (brief rule). The FAQ says fee details come by email after registering.

## Brand

- Colors: Ateneo Navy `#061A4D`, Core Blue `#0646C8`, Electric Blue `#006DFF`, Bright Cyan `#3DD9F2`, Ice Blue `#B9EEFF`, Soft White `#F8FAFC`, Near Black `#101114`
- Type: SF Pro Display (headlines) + SF Pro Text (body). Inter is the fallback on non-Apple devices. JetBrains Mono is only used on the register ticket.

## Admin (`/admin`)

Team-only. Sign in with email + password. Only emails on the team list can create an account:
add a teammate under **Team**, then they open `/admin` and press **Create your account**.

- **Inquiries:** everyone who registered on the site. Set a status (New → Emailed → Confirmed), add notes, copy the emails, or export a CSV.
- **Presentations:** opens a deck full screen at `/present/<deck>`.
- **Team:** who can get in.

Data lives in Supabase (project `blueprint`). The public site can only *add* a registration; reading anything needs a team login.

## Slide decks

The repo is public, so deck content is **not** in it. Decks live in `private/decks/<name>/` on your computer (gitignored) and in Supabase (team-only).

```
private/decks/s1/
  deck.json    { "slug": "s1", "session_no": 1, "title": "...", "subtitle": "..." }
  deck.html    the slides
  assets/      images, used in deck.html as asset:photo.jpg
```

Upload or update a deck (needs `.env` with the Supabase service key):

```bash
node scripts/upload-deck.mjs private/decks/s1
```

Slide format and animation options are explained at the top of `admin/present.js`.
Presenting: → / Space next, ← back, F full screen, T block timer, B black screen, ? shortcuts.
