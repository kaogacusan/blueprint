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

On a computer, the section stops on screen and the 10 cards slide sideways as you scroll down. On a phone, you swipe the cards.
Each card plays a short animation when it comes into view. The AAA Card flips by itself. Press **Send** on the Outreach Card. Sessions 3–4 add Pillar Map, Four-Week Plan, Ship Card and Circle Card (Story Bank was left out to keep the row short).

## Page order

Hero → Problem ("If any of these sound like you:" pills) → What Blueprint is + details strip (sessions, dates, venue, length, seats, ₱1,999) → 4 sessions → What you'll do in the room → Sneak peek → Take-home → Who runs the sessions → FAQ → Final CTA → Footer

## Still placeholder (on purpose)

Search `index.html` for `PLACEHOLDER` to find each one.

- **Dates and venue** show "TBA" in the details strip and the "When and where?" FAQ. Thomas confirms.
- **Session 4 title** "Open House" is a working title.
- **Facilitator photos:** export them from the Canva Facilitator Profile and save as `assets/facilitators/thomas.jpg` and `assets/facilitators/kurt.jpg` (square). Until then the cards show initials.
- **Footer contact** (email or IG) for questions.

The price (₱1,999 for all four sessions) is shown in the details strip, FAQ, final call to action and the register form.

## Registration

The form saves name, email, course, year, mobile number, and how they heard about Blueprint (plus "Which org?" when they pick Student org) to the Supabase `registrations` table.
Payment is manual for the pilot: the team emails payment details within 24 hours, and marks each person **registered / paid / waitlist / cancelled** in `/admin`. First 20 paid get the seats.

## Brand

- Colors: Ateneo Navy `#061A4D`, Core Blue `#0646C8`, Electric Blue `#006DFF`, Bright Cyan `#3DD9F2`, Ice Blue `#B9EEFF`, Soft White `#F8FAFC`, Near Black `#101114`
- Type: SF Pro Display (headlines) + SF Pro Text (body). Inter is the fallback on non-Apple devices. JetBrains Mono is only used on the register ticket.

## Workspace (`/admin`)

The team's hub, with the pages in a sidebar on the left. Keira is the **owner** and the only one who can change things; everyone else on the team can **view** it all. The one exception: anyone on the team can set a sign-up's status (so Amber can mark people "Paid").
Add a teammate under **Team** with their email, then they open `/admin` and press **Create your account**.

| Page | What it shows |
|---|---|
| Overview | One screen: what's up next, four numbers, this week, late tasks, open decisions. Copy a GC update, add your dates to your calendar. |
| Tasks | The project log: who, what, by when, with files. List or board. Owner can import the project log `.xlsx`. |
| Schedule | The four sessions and a calendar. Set a session date and its prep deadlines fill in (folded under "Prep deadlines"). Key dates. |
| Outreach | Every org, its owner and status. Open one to copy its messages with the brackets filled in. |
| Budget | The costing sheet's math: the four totals, printer prices, session costs. Print list and notes are folded. |
| Playbook | Guides, copy-ready scripts, files (incl. every file linked from a task) and contacts. |
| Sign-ups | Everyone who registered: mobile, how they heard about Blueprint, status (registered / paid / waitlist / cancelled). First 20 paid get seats. |
| Decks / Team | Session decks to present, people and roles (roles are labels only). |

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
