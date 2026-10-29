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
| `admin/` | Team workspace (`/admin`). Also the slide player (`present.js`, `present.css`). |
| `present/` | `/present/<deck>` opens a deck full screen. |
| `supabase/migrations/` | Database tables and access rules. |
| `scripts/upload-deck.mjs` | Uploads a deck from `private/decks/<name>/` to Supabase. |
| `scripts/add-login.mjs` | Makes a teammate's workspace login (or resets a password). |
| `assets/vendor/supabase.js` | The Supabase library (v2.45.4), served from our own site instead of a CDN. |

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
The form can't be sent without ticking the consent box. Each sign-up saves when they agreed and which privacy notice (`privacy_version`, the date on `privacy.html`). If you change `privacy.html`, change its date and `PRIVACY_VERSION` in `main.js` too.

**Data privacy (Data Privacy Act, RA 10173):** `privacy.html` tells sign-ups what we collect, why, who sees it, how long we keep it (deleted within 60 days after the last session) and how to reach us. In `/admin`, Sign-ups has the team's handling rules, only the owner can download the list, and the owner can **Erase all** when the program is over. Visitors who aren't signed in can only add a sign-up (`005_data_privacy.sql`).

Payment is manual for the pilot: the team emails payment details within 24 hours, and marks each person **registered / paid / waitlist / cancelled** in `/admin`. First 20 paid get the seats.

## Brand

- Colors: Ateneo Navy `#061A4D`, Core Blue `#0646C8`, Electric Blue `#006DFF`, Bright Cyan `#3DD9F2`, Ice Blue `#B9EEFF`, Soft White `#F8FAFC`, Near Black `#101114`
- Type: SF Pro Display (headlines) + SF Pro Text (body). Inter is the fallback on non-Apple devices. JetBrains Mono is only used on the register ticket.

## Workspace (`/admin`)

The team's hub, with the pages in a sidebar on the left. Each person's most important pages sit at the top under **For you** (set per person in the `focus` setting).

Who can do what:
- **Owner** (Keira): changes everything.
- **Team**: views everything, sets a sign-up's status (so Amber can mark "Paid"), and logs progress on the orgs assigned to them (status, who replied, next step).
- **Guest** (e.g. a guest facilitator): views the workspace but **never sees sign-ups or the People list** (outside contacts' emails and numbers).

### Logins

Public sign-up is switched off in Supabase Auth, so only people Keira makes a login for can get in.

```bash
node scripts/add-login.mjs Sam sam@email.com              # team
node scripts/add-login.mjs Lee lee@email.com guest          # guest
node scripts/add-login.mjs --reset sam@email.com          # forgot password
```

It prints a short starter password once (e.g. `Sam-4821`). Send it privately (not in the GC). It only works until their first sign-in: the workspace makes them pick their own password (10+ characters) before anything else. Anyone can change it later with the key button next to their name.

### First sign-in tour

After the new password, everyone gets a spotlight tour that walks through *their* pages (from the `focus` setting): what each button does and where things live. `settings → tour` set to `{ "<name>": "full" }` gives that person the tour of every page. The **?** next to your name replays it; Keira can preview anyone's tour by picking them in "Whole team" on the Overview, then pressing **?**. Tour stops are in `admin/tour.js`.

### Data safety

- Every table has Row Level Security: signed-out visitors can only add a registration; nothing can be read without a team login.
- Database functions can't be called by signed-out visitors (`supabase/migrations/004_security_and_outreach.sql`).
- `vercel.json` sends security headers. `/admin` and `/present` only run scripts from this site (plus the Excel reader from cdnjs). **If you edit the `<script type="importmap">` in `admin/index.html`, update its `sha256-` hash in `vercel.json`**, or the sign-in 3D stops loading.
- The service role key lives only in the gitignored `.env`. Never paste it into the site or the repo.

| Page | What it shows |
|---|---|
| Overview | Your focus pages as tiles (a number and the one thing to do), up next, the next 7 days, what's late, open questions and what's been decided. |
| Tasks | The project log: who, what, by when, with files. List or board. Owner can import the project log `.xlsx`. |
| Schedule | The four sessions and a calendar. Set a session date and its prep deadlines fill in (folded under "Prep deadlines"). Key dates. |
| Outreach | Your orgs as boxes by category (or by status). Each org: **Copy + open** (message filled in, their page opens) and **Sent**. Open one for the 3 steps and the reply log. |
| Budget | The costing sheet's math: the four totals, printer prices, session costs. Print list and notes are folded. |
| Playbook | Four doors: Guides (open in a reader), Messages (chat bubbles, one-click copy), Files (tiles) and People (contact cards). |
| Sign-ups | Everyone who registered: mobile, how they heard about Blueprint, status (registered / paid / waitlist / cancelled). First 20 paid get seats. |
| Decks / Team | Session decks to present, people and roles (roles are labels only). |

### Slack Patrol (Keira + Renz only)

A private joke between Keira and Renz: the **Slack Patrol** button above your name (siren icon in the top bar on phones). Report the other one and their screen goes full "code blue" with a siren until they press **I'm on it**. For 24 hours after a report, the reporter can **Shame** (words fly across their screen), **Fake crash**, and Keira can send **The General** (photo spam). **Preview** shows the alarm on your own screen first. If they're offline it plays when they next open the workspace.

Nobody else sees the button or the alerts: the database only lets those two send or read them (`006_slack_patrol.sql`, names in `is_patrol()` and `admin/patrol.js`). The photo is in the private `pranks` storage bucket (source copy in `private/fun/`), not in this public repo. Sounds are made in the browser, so there are no sound files. Browsers only play sound after you've clicked somewhere on the page once.

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
