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
| `assets/` | Logo files, facilitator photo (from the S1 deck), and `vendor/` (three.js, stored locally so 3D works offline). |

## 3D pieces

The 3D models do not follow the mouse. Scroll moves them. They have no box around them, so they sit right in the section.

1. **What is Blueprint:** a blueprint resume. It comes in rolled up, opens flat as you scroll to it, and turns away as you scroll past.
2. **Sessions:** 4 blocks rise one by one as you scroll, and the camera moves around them. Point at a session card and its block lifts and glows.

If a device cannot show 3D, the page shows a flat version instead.

## Sneak peek

On a computer, the section stops on screen and the 6 cards slide sideways as you scroll down. On a phone, you swipe the cards.
Each card plays a short animation when it comes into view. The AAA Card flips by itself. Press **Send** on the Outreach Card.

## Page order

Hero → Problem (+ "Show, don't claim") → What is Blueprint → 4 sessions (+ facilitator) → What you'll do → Sneak peek → Take-home → FAQ → Final CTA → Footer

## Still placeholder (on purpose)

- **Sessions 3 and 4** show "Details coming soon." Add the real titles in `index.html` when they are final.
- **Register form does not send anything yet.** It shows a success ticket only. To make it real, connect it in `main.js` (search for `MOCKUP`).
- **No socials / email in the footer.** Add them when they are confirmed.
- **No price anywhere.** This is on purpose (brief rule). The FAQ says fee details come by email after registering.

## Brand

- Colors: Ateneo Navy `#061A4D`, Core Blue `#0646C8`, Electric Blue `#006DFF`, Bright Cyan `#3DD9F2`, Ice Blue `#B9EEFF`, Soft White `#F8FAFC`, Near Black `#101114`
- Type: SF Pro Display (headlines) + SF Pro Text (body). Inter is the fallback on non-Apple devices. JetBrains Mono is only used on the register ticket.
