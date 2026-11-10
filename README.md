# Blueprint — landing page (mockup)

One page. Plain HTML + CSS + JS. No build step, no installs.

## Run it

```bash
cd ~/blueprint
python3 -m http.server 5180
```

Open http://localhost:5180

Use the server. The 3D will not load if you double-click `index.html`.

## Setup renders (for the team)

Two extra pages. They are not linked from the landing page.

- http://localhost:5180/venuerender/ — FA Annex 104 set up for the Nov 10 workshop (5:00–7:30 pm, 26 people): 3D room, numbered checklist, run sheet, who stands where, what to check.
- http://localhost:5180/boothrender/ — our half (1.5 × 3 m) of a shared 3 × 3 m tent on Red Brick Road for the LAS 50 bazaar: 3D booth (kept lean: header, backdrop and skirt tarps, an 80 × 200 cm roll-up banner, the sign-up QR in an A4 acrylic stand, calling cards, flyers, and Blend-In Bingo cards), numbered parts list, and the set-up steps. The ordering lives on the unlinked prep page.

Drag to turn. Tabs change the camera. Numbers on the model match the list. Add `?view=top` (or any tab id) to open a view.

| File | What it is |
|---|---|
| `venuerender/venue.js` | The room: sizes at the top (`W`, `D`, `H`), the checklist, run sheet, posts, and the 3D model. **The room size is an estimate.** Change `W`, `D`, `H` after you measure. |
| `boothrender/booth.js` | The booth: sizes at the top, the parts list with costs, and the 3D model. Costs come from `prep-data.js` when it has a price; otherwise they are guesses. |
| `boothrender/prep-data.js` | What each booth prints, buys, and brings (ours next to Prince's), with sizes, shops, links, and prices. The booth page's costs come from it (`costOf`). |
| `boothrender/prep/` | The prep page, `/boothrender/prep/`: the print table (Keira's booth and Prince's booth side by side, with both designs), the roll-up banner sizing, buy and bring tables, the ₱3,000 budget, and a “Copy the order” button for the print shop. Not linked from the site and `noindex`, but not password-locked. |
| `render/stage.js` | Shared 3D engine (camera, pins, size lines, highlight). |
| `render/page.js` | Shared page wiring (tabs, sliders, toggles, list, table). |
| `render/render.css` | Shared styles for both pages. |
| `render/assets.js` | The print files list on both pages, and the print on the 3D model. Pick a version and the model changes. Picks are saved in your browser only. |

### Print files

Every printed piece on the two models (tarps, banners, signs, cards, sheets, the title slide) has a print file in six versions:

- **V1 As rendered**: the design on the model, with the facts fixed to match the site. On the booth, V1 lives in `scripts/print/booth-v1.mjs`: the original designs refined into one system (one margin, one type scale, all three tickets). The booth's roll-up banner, A4 sign-up QR, calling card (90 × 54 mm), Blend-In Bingo card, and the 1.2 × 0.7 m table skirt are built on it and exist in V1 only. The calling card, flyer, and bingo card have 3 mm bleed for the print shop; the skirt and header tarps have 10 mm, so no white border shows.
- **V2 Drafting grid**: light paper, blue grid, the selection box from the site's first screen.
- **V3 Big type**: fewer words, bigger. Reads from far away.
- **V4 Clean white**: V1 cleaned up. White paper, navy type, one blue.
- **V5 Solid blue**: V2 cleaned up. Solid brand blue, white type.
- **V6 Plain navy**: V3 cleaned up. Navy, fewest words, one light-blue word.

V4 to V6 have no grid, no selection box, and no gradient text. They share one margin and the colors in `CLEAN` in `scripts/print/kit.mjs`.

Each version has a print **PDF** (vector, for the print shop) and a **JPG** (to share). A piece with `bleed` (mm) gets a PDF that much bigger on every side, with the background running into it, so the shop can trim without a white edge; its JPGs show the trimmed size. They are in `assets/print/venue/` and `assets/print/booth/`, and the pages list them in the "Print files" section.

To change a design, edit `scripts/print/venue.mjs` or `scripts/print/booth.mjs` (one entry per piece) and rebuild. The facts (dates, time, room, prices) are in `F` in `scripts/print/kit.mjs`. Change them there once.

```bash
npm install
npx playwright-core install chromium   # once
npm run print                     # both pages
npm run print -- booth header     # one piece
```

QR codes marked "Sample QR" (sign-in form, GCash) are stand-ins. Put the real QR in before you print. The sign-up QR on the booth pieces is real: it opens the register section of the site.

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

Hero → Problem ("If any of these sound like you:" pills) → What Blueprint is + details strip (4 sessions, Nov 10 to 13, 5:30 to 7:00 PM, FA Annex 104, limited seats, register by Nov 9, prices) → 4 sessions → What you'll do in the room → Sneak peek → Take-home → Who runs the sessions → FAQ → Tickets (final CTA) → Footer

## Still placeholder (on purpose)

Search `index.html` for `PLACEHOLDER` to find each one.

- **Facilitator photos:** export them from the Canva Facilitator Profile and save as `assets/facilitators/thomas.jpg` and `assets/facilitators/kurt.jpg` (square). Until then the cards show initials.
- **Footer contact** (email or IG) for questions.

## Tickets

Pilot prices from Nov 7. Session 1 is free from Nov 10. Four tickets, in the dark section at the bottom (`#tickets`). Every Register button on the page scrolls there; the ticket buttons open the form.

- **Session 1, free** (shown until Session 1 starts). No payment. The sign-up gets its seat right away (status paid, `paid_by` "free"), or waitlist if Session 1 is full, and a "your seat is saved" email.
- **Full Pass**, ₱799 (marked Best value): all four sessions, a locked seat for all four days and the full pre-work bundle.
- **Single Session**, ₱299 each, for Sessions 2 to 4 only, with a session picker. Picking 1 shows "Every session for ₱500 more", 2 shows "₱201 more"; picking all 3 gets the Full Pass (₱98 less).
- **Barkada**, ₱1,999 for three Full Passes (₱666 each). One person signs up and pays, and adds two friends' names and emails in the form. The slot confirmation and pre-work go to all three (the friends are copied). A Barkada takes 3 seats in every session.

**Session 1 is free pop-up:** every visit shows a pop-up until Session 1 starts. When it's closed, a bar stays at the bottom. The hero button says "Join Session 1 for free". After Session 1 starts, all of that hides by itself (`data-start` on the free card and on each session row in `index.html`). `/?free=1` opens the free sign-up form directly (the link in the emails).

**Sign-ups close per session**, when that session starts (Manila time, from Schedule). The old "Sales close" date is gone.

**Email: Session 1 is free** (button on the workspace's Sign-ups page): emails everyone who signed up before. Each person gets it once, so it's safe to click again. Unpaid singles with Session 1 stop paying for it (Session 1 only becomes a free ticket). Anyone who already sent a receipt is left alone: check those by hand. One email can have one free sign-up and one paid one, so Session 1 people can still buy Sessions 2 to 4 (`012_free_session.sql`). **Run that migration in Supabase**, or free sign-ups say "just come" instead of saving.

**Upgrades:** a Single Session sign-up can move up to the Full Pass on their own payment page (`/pay`). Not paid yet: the ticket just switches to the Full Pass. Paid already: they pay the difference with the same QR (₱500 after one session, ₱201 after two), upload that receipt, and the team confirms it on Sign-ups, which makes them a Full Pass and emails them (`011_pilot_pricing.sql`: `topup`, `topup_at`). The paid-single confirmation email offers the upgrade too.

The GCash amounts the team will see: ₱299, ₱598, ₱799, ₱1,999, and the ₱500 / ₱201 top-ups. One QR covers all of them; each person's page and email show their own amount.

Prices live in: the page copy (`index.html`), `PRICE` in `main.js` (what the picker and form show), `PRICE` in `api/_lib.js` (what people actually pay), `F` in `scripts/print/kit.mjs` (print files), the promo video (`private/video/video.html`), and Budget → Ticket price in `/admin` (break-even). The server works out each sign-up's `ticket`, `sessions`, `amount` and `friends` and saves them (`010_tickets.sql`, `011_pilot_pricing.sql`), so the payment page, emails and Sign-ups page all show that person's amount. Seats are counted per session: a Full Pass takes a seat in all four, a single only in the sessions picked, a Barkada three in all four.

## Registration

The form saves name, email, course, year, mobile number, and how they heard about Blueprint (plus "Which org?" when they pick Student org) to the Supabase `registrations` table.
The form can't be sent without ticking the consent box. Each sign-up saves when they agreed and which privacy notice (`privacy_version`, the date on `privacy.html`). If you change `privacy.html`, change its date and `PRIVACY_VERSION` in `main.js` too.

**Data privacy (Data Privacy Act, RA 10173):** `privacy.html` tells sign-ups what we collect, why, who sees it, how long we keep it (deleted within 60 days after the last session) and how to reach us. In `/admin`, Sign-ups has the team's handling rules, only the owner can download the list, and the owner can **Erase all** when the program is over. Visitors who aren't signed in can only add a sign-up (`005_data_privacy.sql`).

Payment is by GCash: each sign-up gets their own payment page with the QR and their amount, uploads a receipt, and the team marks them **paid** in `/admin` (or registered / waitlist / cancelled). Each session has `costing.max` seats (20); paying for a full session puts someone on the waitlist.

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
| Sign-ups | Everyone who registered: ticket and amount, mobile, how they heard about Blueprint, status (registered / paid / waitlist / cancelled). Seats taken per session (20 each). |
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
