// V1 for the booth: the original "as rendered" designs, refined, and used as the system for the newer pieces
// (the standing banner and the Red Flag Bingo card).
//
// The system, so every piece looks like one set:
//   Grounds   brand gradient (outward-facing: header, banner, flyer front, the bingo card's back), navy (table pieces:
//             skirt, calling card), paper + the site's grid (backdrop), white (things people use: the QR sign, the
//             sign-up sheet, the bingo card).
//   Margin    8% of the short edge, the same on all four sides (m()).
//   Type      Inter display for headlines (.d), Inter 600 for facts, JetBrains Mono caps for small labels (.m).
//   Colour    one accent per ground: core blue on light, ice/cyan on dark. No gradient text, no extra colours.
//   QR        on a white tile on dark grounds. Prices always show all three tickets, Barkada included.
// Sizes in mm. booth.mjs puts these in as V1 of each piece; pullup (the standing banner), regqr, card and bingo are V1 only.
import { C, F, word, mark, lockup, qr, grid } from './kit.mjs';

const m = (w, h) => Math.round(Math.min(w, h) * 0.08);
const at = (x, y, inner, style = '', cls = '') => `<div class="abs ${cls}" style="left:${x}mm;top:${y}mm;${style}">${inner}</div>`;
const atb = (x, y, inner, style = '', cls = '') => `<div class="abs ${cls}" style="left:${x}mm;bottom:${y}mm;${style}">${inner}</div>`;
const fill = (bg) => `<div class="fill" style="background:${bg}"></div>`;
const gradBg = '<div class="fill bg-grad"></div>';
const paperGrid = (w, h, step, width) => `${fill(C.paper)}${grid(w, h, { step, major: 1000, minor: 0.09, width })}`;
const navyGrid = (w, h, step, width) => `${fill(C.navy)}${grid(w, h, { step, major: 1000, color: C.ice, minor: 0.06, width })}`;
const tile = (size, pad, inner) => `<div style="width:${size}mm;height:${size}mm;padding:${pad}mm;background:#fff;border-radius:${(pad * 0.8).toFixed(1)}mm">${inner}</div>`;
const pill = (text, size, { bg = C.electric, ink = '#fff' } = {}) =>
  `<span class="nw" style="display:inline-block;font-size:${size}mm;font-weight:700;letter-spacing:-0.02em;line-height:1;color:${ink};background:${bg};padding:0.42em 0.7em;border-radius:99mm">${text}</span>`;

const DATES = F.datesShort;                     // Nov 10–13
const TIME = F.time.replace(' to ', '–');       // 5:30–7:00 PM
const TICKETS = [
  ['Full Pass', F.full, 'all four sessions'],
  ['Single', F.single, 'per session'],
  ['Barkada', F.barkada, '3 Full Passes'],
];
// the three tickets in a row. k = size of the price in mm; dark = on a dark ground
const tickets = (w, k, dark) => `<div style="display:grid;grid-template-columns:repeat(3,1fr);width:${w}mm">${TICKETS.map(([n, p, s], i) => `
  <div style="padding:0 ${(k * 0.35).toFixed(1)}mm;${i ? `border-left:${(k * 0.03).toFixed(2)}mm solid ${dark ? 'rgba(185,238,255,0.35)' : C.line}` : 'padding-left:0'}">
    <div class="m nw" style="font-size:${(k * 0.26).toFixed(2)}mm;color:${dark ? C.ice : C.ink3}">${n}</div>
    <div class="d nw" style="font-size:${k}mm;margin-top:${(k * 0.16).toFixed(1)}mm;color:${dark ? '#fff' : C.navy}">${p}</div>
    <div class="nw" style="font-size:${(k * 0.27).toFixed(2)}mm;margin-top:${(k * 0.14).toFixed(1)}mm;font-weight:500;color:${dark ? C.ice : C.ink2}">${s}</div></div>`).join('')}</div>`;
// the 4 sessions as rows
const sessions = (w, k, dark) => F.sessions.map((s) => `
  <div style="display:grid;grid-template-columns:${(k * 1.5).toFixed(1)}mm 1fr auto;align-items:baseline;width:${w}mm;padding:${(k * 0.42).toFixed(1)}mm 0;border-top:${(k * 0.03).toFixed(2)}mm solid ${dark ? 'rgba(185,238,255,0.3)' : C.line}">
    <span class="m" style="font-size:${(k * 0.42).toFixed(2)}mm;color:${dark ? C.cyan : C.core}">${s.n}</span>
    <span class="d nw" style="font-size:${k}mm;color:${dark ? '#fff' : C.navy}">${s.title}</span>
    <span class="m nw" style="font-size:${(k * 0.4).toFixed(2)}mm;color:${dark ? C.ice : C.ink3}">${s.day.replace(', ', ' ')}</span></div>`).join('');

// ===================================================================================
// 1 Header tarp, 1.4 × 0.6 m. Logo and the line from the site; what and when underneath.
export const header = {
  id: 'v1',
  note: 'The original layout: logo on the left, the two lines on the right. Now with what it is and when, under a thin rule.',
  html: () => {
    const M = m(1400, 600);   // 48
    return `
    ${gradBg}
    ${at(96, 120, mark(360, '#fff'))}
    ${at(410, 86, word(146, '#fff'))}
    ${at(412, 270, `${F.tagline[0]}<br>${F.tagline[1]}`, 'font-size:68mm;color:#fff;font-weight:600;letter-spacing:-0.03em;line-height:1.12', 'nw')}
    ${at(414, 446, `<span>Career workshop</span><span style="opacity:0.55">·</span><span>${DATES}</span><span style="opacity:0.55">·</span><span>${F.room}</span>`,
      `display:flex;gap:16mm;padding-top:22mm;border-top:1.4mm solid rgba(255,255,255,0.35);font-size:38mm;font-weight:600;letter-spacing:-0.02em;color:${C.ice};width:${1400 - 414 - M - 40}mm`, 'nw')}`;
  },
};

// 2 Backdrop tarp, 1.5 × 1.5 m, from the back bar. What Blueprint is, in big words. The navy strip sits above
// the table line (the table hides the bottom 250 mm), and carries the dates and the Barkada deal.
export const backdrop = {
  id: 'v1',
  note: 'The original layout on the site’s grid. The date strip moved up so the table no longer hides it, and now carries the Barkada deal.',
  html: () => {
    const M = 112;
    return `
    ${paperGrid(1500, 1500, 100, 1.9)}
    ${at(M, 96, lockup(140, { markColor: 'grad' }))}
    ${at(M - 4, 300, `<div style="color:${C.navy}">A hands-on</div><div style="color:${C.core}">career workshop.</div>`, 'font-size:140mm;line-height:0.98', 'd nw')}
    ${at(M, 640, 'Bring what you’ve already done.<br>Leave with a resume, LinkedIn,<br>and intro that show it.', `font-size:66mm;line-height:1.3;font-weight:600;letter-spacing:-0.03em;color:${C.navy}`, 'nw')}
    ${at(M, 1010, `<div style="display:flex;align-items:center;justify-content:space-between;height:100%;padding:0 56mm;color:#fff">
        <div class="nw"><div class="d" style="font-size:84mm">${DATES}</div><div style="font-size:40mm;font-weight:600;letter-spacing:-0.02em;color:${C.ice};margin-top:10mm">${TIME} · ${F.room}</div></div>
        <div class="nw" style="text-align:right"><div class="m" style="font-size:24mm;color:${C.ice}">Barkada of 3</div><div class="d" style="font-size:84mm;margin-top:8mm">${F.barkada}</div></div></div>`,
      `width:${1500 - 2 * M}mm;height:230mm;background:${C.navy}`)}`;
  },
};

// 3 Table skirt, 0.9 × 0.7 m. Knee height: logo, what, when, and the price to start.
export const skirt = {
  id: 'v1',
  note: 'The original: logo and what it is, centred on navy. Adds the room and a line with the prices.',
  html: () => `
    ${navyGrid(900, 700, 70, 1.5)}
    ${at(0, 120, word(140, '#fff', 'margin:0 auto'), 'width:900mm')}
    ${at(0, 352, `Career workshop<br><span style="color:${C.ice}">${DATES} · ${F.room}</span>`, 'width:900mm;text-align:center;font-size:60mm;font-weight:600;letter-spacing:-0.03em;line-height:1.18;color:#fff', 'nw')}
    ${at(0, 545, `<div style="display:flex;justify-content:center">${pill(`From ${F.single} · Barkada of 3: ${F.barkada}`, 34, { bg: C.electric })}</div>`, 'width:900mm')}`,
};

// 4 Standing banner: a roll-up (pull-up) stand, 80 × 200 cm, the most common size, and the one the stand we found takes.
// Top to bottom: logo, headline (seen over heads), then the QR at chest height (about 1.1–1.4 m off the floor),
// then the line from the site, the 4 sessions, when and where, and the tickets. Roll-ups hide the bottom of the print
// in the base and grip the top in a rail, so nothing sits in the top 40 mm or the bottom 160 mm.
export const pullup = {
  id: 'pullup', piece: 'pullup', name: 'Standing banner (roll-up)', size: '80 × 200 cm, for a roll-up stand', mm: [800, 2000], pages: ['Front'],
  print: 'Tarp (or PP film if the shop has it: it curls less), 80 × 200 cm, for a roll-up stand: no grommets, no hem, cut exact. Measure the stand’s top rail first: if it is 85 cm, ask for an 85 × 200 file. The bottom 16 cm hides in the base.',
  versions: [{
    id: 'v1',
    note: 'Built from the roaming banner, re-laid for a roll-up: logo and headline up top, the QR at chest height, then the sessions, dates, and all three tickets.',
    html: async () => {
      const M = m(800, 2000), W = 800 - 2 * M;   // 64, 672
      return `
      ${fill(`linear-gradient(168deg, ${C.core} 0%, ${C.electric} 55%, ${C.sky} 100%)`)}
      ${at(M, 80, lockup(104, { markColor: '#fff', wordColor: '#fff' }))}
      ${at(M - 4, 250, 'A hands-on<br>career<br>workshop.', 'font-size:118mm;color:#fff;line-height:0.96', 'd nw')}
      ${at(M, 640, `<div style="display:flex;align-items:center;gap:36mm">${tile(270, 20, await qr(undefined, 230))}
          <div><div class="d nw" style="font-size:66mm;color:#fff;line-height:1">Scan to<br>sign up.</div>
          <div style="font-size:29mm;color:${C.ice};font-weight:600;margin-top:16mm;letter-spacing:-0.02em">It takes a minute.</div></div></div>`)}
      ${at(M, 990, `${F.tagline[0]}<br>${F.tagline[1]}`, `font-size:44mm;color:${C.ice};font-weight:600;letter-spacing:-0.03em;line-height:1.16`, 'nw')}
      ${at(M, 1150, sessions(W, 38, true))}
      ${at(M, 1470, `${DATES} · ${F.days}<br><span style="color:${C.ice}">${TIME} · ${F.room}</span>`, 'font-size:40mm;color:#fff;font-weight:650;letter-spacing:-0.025em;line-height:1.22', 'nw')}
      ${at(M, 1640, tickets(W, 46, true), `padding-top:22mm;border-top:1.6mm solid rgba(185,238,255,0.35)`)}`;
    },
  }],
};

// 5 Sign-up QR, A4, in the A4 acrylic stand (Thomas's list has one A4 standee). The QR is big enough to scan from
// about 1.3 m; the three tickets sit under it, since the workshop card is now the take-home calling card.
export const regqr = {
  id: 'regqr', piece: 'regqr', name: 'Sign-up QR sign', size: 'A4, 210 × 297 mm', mm: [210, 297], pages: ['Front'],
  print: 'Print shop: A4, colour, one side, card stock or photo paper. Slides into the A4 acrylic stand. Scan it with 2 phones before you leave the shop.',
  versions: [{
    id: 'v1',
    note: 'The original QR sign, made A4: logo, “Sign up”, a 13 cm QR, then all three tickets and the web address.',
    html: async () => {
      const M = m(210, 297), W = 210 - 2 * M;   // 17, 176
      return `
      ${fill('#fff')}
      ${at(0, 15, `<div style="display:flex;justify-content:center">${lockup(11)}</div>`, 'width:210mm')}
      ${at(0, 36, 'Sign up', `width:210mm;text-align:center;font-size:27mm;color:${C.navy}`, 'd nw')}
      ${at(40, 72, await qr(undefined, 130))}
      ${at(0, 209, 'It takes a minute.', `width:210mm;text-align:center;font-size:9mm;font-weight:600;letter-spacing:-0.02em;color:${C.core}`, 'nw')}
      ${at(M, 230, tickets(W, 10.5, false), `padding-top:6mm;border-top:0.4mm solid ${C.line}`)}
      ${atb(0, 11, F.url, `width:210mm;text-align:center;font-size:3.4mm;color:${C.ink3}`, 'm nw')}`;
    },
  }],
};

// 6 Calling card, 90 × 54 mm: the workshop card made small enough to take home. Same size as Prince's pass
// cards, so one shop can print both. Front: who, when, where, and the QR. Back: three resume fixes
// people can use tonight, then the pitch and the prices.
const cardFront = async () => {
  const M = 4.5;
  return `
  ${navyGrid(90, 54, 6, 0.06)}
  ${at(M, M, lockup(7.4, { markColor: '#fff', wordColor: '#fff' }))}
  ${at(90 - M - 40, M + 0.6, 'Career workshop', `width:40mm;text-align:right;font-size:2mm;color:${C.ice}`, 'm nw')}
  ${atb(M, M - 0.2, `<div class="d nw" style="font-size:9.6mm;color:#fff;margin-left:-0.5mm">${DATES}</div>
    <div class="nw" style="font-size:2.45mm;font-weight:600;letter-spacing:-0.01em;color:${C.ice};margin-top:1.8mm;line-height:1.35">${F.days} · ${TIME}<br>${F.room}</div>`)}
  ${atb(90 - M - 17.5, M, `<div class="m nw" style="font-size:1.9mm;color:${C.ice};text-align:center;margin-bottom:1.4mm">Sign up</div>${tile(17.5, 1.3, await qr(undefined, 14.9))}`)}`;
};
const CARD_FIXES = [
  ['01', 'Cut the objective.', 'One line on what you do goes on top.'],
  ['02', 'Start each bullet with a verb.', 'Led, built, ran, wrote.'],
  ['03', 'Add one number.', 'How many people, how much, how often.'],
];
const cardBack = () => {
  const M = 4.5, W = 90 - 2 * M;
  return `
  ${fill('#fff')}
  ${at(M, M, 'Fix these tonight.', `font-size:4.9mm;color:${C.navy}`, 'd nw')}
  ${at(90 - M - 30, M + 1.1, '3 resume fixes', `width:30mm;text-align:right;font-size:1.9mm;color:${C.core}`, 'm nw')}
  ${at(M, 12.6, CARD_FIXES.map(([n, a, b]) => `<div style="display:grid;grid-template-columns:5.2mm 1fr;align-items:baseline;padding:2.25mm 0;border-top:0.2mm solid ${C.line}">
      <span class="m" style="font-size:1.9mm;color:${C.core}">${n}</span>
      <span class="nw" style="font-size:2.45mm;line-height:1.25;letter-spacing:-0.01em;color:${C.ink2};font-weight:500"><b style="font-weight:700;color:${C.navy}">${a}</b> ${b}</span></div>`).join(''), `width:${W}mm`)}
  ${atb(M, M - 0.2, `<div style="display:flex;justify-content:space-between;align-items:baseline">
      <span class="nw" style="font-size:2.6mm;font-weight:700;letter-spacing:-0.015em;color:${C.navy}">The rest takes 4 sessions.</span>${word(2.5, C.navy)}</div>
    <div class="m nw" style="font-size:1.85mm;color:${C.ink3};margin-top:1.4mm">Full ${F.full} · Single ${F.single} · Barkada of 3 ${F.barkada}</div>`,
    `width:${W}mm;padding-top:1.8mm;border-top:0.25mm solid ${C.navy}`)}`;
};
export const card = {
  id: 'card', piece: 'card', name: 'Calling card', size: '90 × 54 mm, 2 sides', mm: [90, 54], bleed: 3, pages: ['Front', 'Back'],
  print: 'Print shop: calling card, 2 sides, 300 gsm or thicker, matte. 100–150 pcs. The PDF is 96 × 60 mm: 3 mm bleed on every side, trim to 90 × 54 (the same size as Prince’s pass cards).',
  versions: [{
    id: 'v1',
    note: 'The workshop card, small enough to keep. Front: logo, dates, time, room, and the QR. Back: three resume fixes people can use tonight, then the pitch and all three tickets.',
    html: async (i) => (i === 0 ? cardFront() : cardBack()),
  }],
};

// 9 Red Flag Bingo, A6 card, 2 sides. Built like the AAA card it replaces: a blue band, white body, gradient back.
const SQUARES = [
  'Objective: “to obtain a challenging position”',
  'Proficient in MS Word',
  'Email is xX_gamer_Xx @yahoo.com',
  'Skill bars. Excel: ●●●○○',
  null,
  '“Very detail-oreinted”',
  'LinkedIn photo cropped from a group pic',
  'Hobbies: sleeping, eating',
  'Only connection is your tita',
];
export const bingo = {
  id: 'bingo', piece: 'bingo', name: 'Red Flag Bingo card', size: 'A6, 105 × 148 mm, 2 sides', mm: [105, 148], bleed: 3, pages: ['Front', 'Back'],
  print: 'Print shop: A6, colour, both sides, card stock (200 gsm or more), 60 pcs. The PDF has 3 mm bleed: the shop prints 4 per A4 and trims to 105 × 148. Pens on the table so people can tick.',
  versions: [{
    id: 'v1',
    note: 'Replaces the AAA try-out card, in the same layout: a blue band, then nine resume red flags to tick. 3 in a row sends them to the back: the workshop, the dates, and the QR.',
    html: async (i) => {
      const M = m(105, 148);   // 8
      return i === 0 ? `
      ${fill('#fff')}
      <div class="abs" style="left:-3mm;top:-3mm;width:111mm;height:30mm;background:${C.core}"></div>
      ${at(M, 6.4, 'Resume edition', `font-size:2.7mm;color:${C.ice}`, 'm nw')}
      ${at(M - 0.4, 11, 'Red Flag Bingo', 'font-size:10.4mm;color:#fff', 'd nw')}
      ${at(M, 32.5, 'Tick every one that’s true for you.', `font-size:3.3mm;color:${C.ink2};font-weight:600;letter-spacing:-0.01em`, 'nw')}
      ${at(M, 39, `<div style="display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:26.5mm;gap:1.5mm;width:${105 - 2 * M}mm">
        ${SQUARES.map((s) => s ? `<div style="border:0.35mm solid rgba(6,26,77,0.22);border-radius:1.4mm;display:flex;align-items:center;justify-content:center;text-align:center;padding:1.8mm;font-size:2.95mm;line-height:1.22;font-weight:600;color:${C.navy};letter-spacing:-0.01em">${s}</div>`
          : `<div style="background:${C.navy};border-radius:1.4mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff;padding:1.6mm"><div class="m" style="font-size:2.4mm;color:${C.cyan}">Free space</div><div style="font-size:3.1mm;font-weight:700;line-height:1.2;margin-top:1mm">No LinkedIn yet</div></div>`).join('')}</div>`)}
      ${atb(M, M - 1, `<span>3 in a row? Don’t panic.<br>Flip this card.</span>${word(4.4, C.navy)}`,
        `display:flex;justify-content:space-between;align-items:flex-end;width:${105 - 2 * M}mm;font-size:3.4mm;font-weight:650;letter-spacing:-0.015em;line-height:1.3;color:${C.navy}`, 'nw')}` : `
      ${gradBg}
      ${at(M + 1, 12, word(13, '#fff'))}
      ${at(M + 0.6, 38, 'A hands-on<br>career workshop<br>in 4 sessions.', 'font-size:10.4mm;color:#fff;line-height:1.08', 'd nw')}
      ${at(M + 1, 77, `${DATES} · ${F.days}<br>${TIME}<br>${F.room}`, 'font-size:4.4mm;color:#fff;font-weight:600;letter-spacing:-0.02em;line-height:1.35', 'nw')}
      ${atb(M + 1, M + 1, `${tile(30, 2.6, await qr(undefined, 24.8))}<div><div class="d nw" style="font-size:6mm;color:#fff;line-height:1.02">Scan to<br>sign up.</div>
          <div class="m nw" style="font-size:2.3mm;color:${C.ice};margin-top:2.2mm;line-height:1.5">${F.full} · ${F.single}<br>Barkada of 3 ${F.barkada}</div></div>`,
        'display:flex;align-items:flex-end;gap:4mm')}`;
    },
  }],
};

// 10 Sign-up sheet, A4 paper. Same fields as the site form, plus the ticket.
const COLS = [['Name', 46], ['Email', 54], ['Mobile', 28], ['Course & year', 26], ['Ticket', 28]];
export const signup = {
  id: 'v1',
  note: 'The original sheet, with the logo, a line saying what happens next, and a column for the ticket.',
  html: () => {
    const M = 14, rows = 15, rowH = 12.6;
    const cols = COLS.map((c) => `${c[1]}mm`).join(' ');
    const head = `<div style="display:grid;grid-template-columns:${cols};border-bottom:0.45mm solid rgba(6,26,77,0.4)">
      ${COLS.map((c) => `<div class="m" style="font-size:2.9mm;color:${C.ink3};padding:0 2mm 2.6mm">${c[0]}</div>`).join('')}</div>`;
    const body = Array.from({ length: rows }, () => `<div style="display:grid;grid-template-columns:${cols};height:${rowH}mm;border-bottom:0.3mm solid rgba(6,26,77,0.18)">
      ${COLS.map((_, i) => `<div style="border-left:${i ? '0.3mm solid rgba(6,26,77,0.1)' : 'none'}"></div>`).join('')}</div>`).join('');
    return `
      ${fill('#fff')}
      ${at(M, M, lockup(9))}
      ${at(210 - M - 90, M + 2, `Career workshop · ${DATES}`, `width:90mm;text-align:right;font-size:2.8mm;color:${C.ink3}`, 'm nw')}
      ${at(M - 0.6, 34, 'Sign-up sheet', `font-size:14mm;color:${C.navy}`, 'd nw')}
      ${at(M, 53, 'Prefer not to scan? Write it here. We add you on the site and email you the payment link.', `font-size:3.6mm;color:${C.ink2};font-weight:500`, 'nw')}
      ${at(M, 68, head + body, 'width:182mm')}
      ${at(M, 270, `Ticket: Full (${F.full}), Single + which session (${F.single} each), or Barkada (${F.barkada} for 3).`, `font-size:3.2mm;color:${C.ink2};font-weight:500`, 'nw')}
      ${at(M, 278, F.url, `font-size:2.8mm;color:${C.ink3}`, 'm nw')}`;
  },
};

// 11 Flyer, A6, 2 sides. The floater hands these out.
export const flyer = {
  id: 'v1',
  note: 'The original front, with the site’s line under the headline. The back lists the 4 sessions, all three tickets, and a QR.',
  html: async (i) => {
    const M = m(105, 148), W = 105 - 2 * M;   // 8, 89
    return i === 0 ? `
    ${gradBg}
    ${at(M + 1, 12, word(14, '#fff'))}
    ${at(M + 0.4, 44, 'A hands-on<br>career<br>workshop.', 'font-size:14mm;color:#fff;line-height:1.04', 'd nw')}
    ${at(M + 1, 94, `${F.tagline[0]}<br>${F.tagline[1]}`, `font-size:4.6mm;color:${C.ice};font-weight:600;letter-spacing:-0.02em;line-height:1.3`, 'nw')}
    ${atb(M + 1, M + 2, `${DATES} · ${F.days}<br>${F.room}`, `font-size:6mm;color:#fff;font-weight:650;letter-spacing:-0.02em;line-height:1.25;padding-top:3.6mm;border-top:0.35mm solid rgba(255,255,255,0.4);width:${W - 2}mm`, 'nw')}` : `
    ${fill('#fff')}
    ${at(M, M + 1, '4 sessions.', `font-size:9.4mm;color:${C.navy}`, 'd nw')}
    ${at(M, 22, sessions(W, 4.4, false))}
    ${at(M, 64, `${F.days} · ${TIME} · ${F.room}`, `font-size:3.3mm;font-weight:650;color:${C.navy};letter-spacing:-0.01em`, 'nw')}
    ${at(M, 73, tickets(W, 6.6, false), `padding-top:3mm;border-top:0.3mm solid ${C.line}`)}
    ${atb(M, M, `${await qr(undefined, 30)}<div><div class="d nw" style="font-size:7mm;color:${C.core};line-height:1">Scan to<br>sign up.</div><div class="m nw" style="font-size:2.3mm;color:${C.ink3};margin-top:2.4mm">${F.url}</div></div>`,
      'display:flex;align-items:flex-end;gap:5mm')}`;
  },
};
