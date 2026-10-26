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

## Workspace (`/admin`)

The team's hub. Keira is the **owner** and the only one who can change anything; everyone else on the team can **view** it all.
Add a teammate under **Team** with their email, then they open `/admin` and press **Create your account**.

| Page | What it shows |
|---|---|
| Overview | Up next (live countdown), the next 7 days, your tasks, open decisions, team pulse. Copy a GC update, add your dates to your calendar. |
| Tasks | The project log: who, what, by when, with files. List or board. Owner can import the project log `.xlsx`. |
| Schedule | The four sessions. Set a date and every venue, print and pre-work deadline fills in. Key dates. |
| Outreach | Every org, its owner and status. Open one to copy its messages with the brackets filled in. |
| Budget | The costing sheet's math: print list, printer prices, session costs, break-even. |
| Playbook | Guides and copy-ready scripts. |
| Directory | Folders, files and contacts. Also collects every file linked from a task. |
| Inquiries / Presentations / Team | Sign-ups, session decks, people and roles (roles are labels only). |

**Updating from Thomas's files:** Tasks → Import from Excel takes the project log or the costing sheet (`.xlsx`) and shows every change before saving.

Data lives in Supabase (project `blueprint`); rules are in `supabase/migrations`. Team content is never in this repo.

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
