// V1 for the booth: the original "as rendered" designs, refined, and used as the system for the newer pieces
// (the standing banner and the Red Flag Bingo card).
//
// The system, so every piece looks like one set:
//   Grounds   brand gradient (outward-facing: header, banner, the bingo card's back), navy (table pieces: skirt,
//             workshop card), white (things people use: the QR sign, the sign-up sheet, the bingo card).
//   Margin    8% of the short edge, the same on all four sides (m()).
//   Type      Inter display for headlines (.d), Inter 600 for facts, JetBrains Mono caps for small labels (.m).
//   Colour    one accent per ground: core blue on light, ice/cyan on dark. No gradient text, no extra colours.
//   QR        on a white tile on dark grounds. Prices always show all three tickets, Barkada included.
// Sizes in mm. booth.mjs puts these in as V1 of each piece; pullup (the standing banner) and bingo are V1 only.
import { C, F, word, mark, lockup, qr, grid } from './kit.mjs';

const m = (w, h) => Math.round(Math.min(w, h) * 0.08);
const at = (x, y, inner, style = '', cls = '') => `<div class="abs ${cls}" style="left:${x}mm;top:${y}mm;${style}">${inner}</div>`;
const atb = (x, y, inner, style = '', cls = '') => `<div class="abs ${cls}" style="left:${x}mm;bottom:${y}mm;${style}">${inner}</div>`;
const fill = (bg) => `<div class="fill" style="background:${bg}"></div>`;
const gradBg = '<div class="fill bg-grad"></div>';
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

// 4 Standing banner, 60 × 160 cm: the same size as Prince's booth banner, so both can be printed by one seller.
// The roaming banner's look, stretched tall: logo and headline up top (seen over heads), the sessions,
// then the QR at chest height and the three tickets. Keep the bottom 120 mm clear for the stand.
export const pullup = {
  id: 'pullup', piece: 'pullup', name: 'Standing banner', size: '60 × 160 cm, on a stand', mm: [600, 1600], pages: ['Front'],
  print: 'Tarp, 60 × 160 cm, the same size as Prince’s banner: order both from one seller. Ask for the stand too (roll-up or X-stand that takes 60 × 160). The bottom 12 cm may sit in the stand.',
  versions: [{
    id: 'v1',
    note: 'Built from the roaming banner: logo, headline, the line from the site, the 4 sessions, then the QR and all three tickets at chest height.',
    html: async () => {
      const M = m(600, 1600), W = 600 - 2 * M;   // 48, 504
      return `
      ${fill(`linear-gradient(168deg, ${C.core} 0%, ${C.electric} 55%, ${C.sky} 100%)`)}
      ${at(M, 64, lockup(86, { markColor: '#fff', wordColor: '#fff' }))}
      ${at(M - 3, 214, 'A hands-on<br>career<br>workshop.', 'font-size:95mm;color:#fff;line-height:0.96', 'd nw')}
      ${at(M, 512, `${F.tagline[0]}<br>${F.tagline[1]}`, `font-size:36mm;color:${C.ice};font-weight:600;letter-spacing:-0.03em;line-height:1.16`, 'nw')}
      ${at(M, 646, sessions(W, 30, true))}
      ${at(M, 900, `${DATES} · ${F.days}<br><span style="color:${C.ice}">${TIME} · ${F.room}</span>`, 'font-size:31mm;color:#fff;font-weight:650;letter-spacing:-0.025em;line-height:1.22', 'nw')}
      ${at(M, 1026, `<div style="display:flex;align-items:center;gap:26mm">${tile(200, 15, await qr(undefined, 170))}
          <div><div class="d nw" style="font-size:50mm;color:#fff;line-height:1">Scan to<br>sign up.</div>
          <div style="font-size:22mm;color:${C.ice};font-weight:600;margin-top:12mm;letter-spacing:-0.02em">It takes a minute.</div></div></div>`)}
      ${at(M, 1268, tickets(W, 36, true))}`;
    },
  }],
};

// 5 Sign-up QR, A5, in an acrylic stand.
export const regqr = {
  id: 'v1',
  note: 'The original, with the logo on top and the web address under the QR, on the same margin as the rest.',
  html: async () => `
    ${fill('#fff')}
    ${at(0, 13, `<div style="display:flex;justify-content:center">${lockup(9)}</div>`, 'width:148mm')}
    ${at(0, 31, 'Sign up', `width:148mm;text-align:center;font-size:21mm;color:${C.navy}`, 'd nw')}
    ${at(24, 64, await qr(undefined, 100))}
    ${at(0, 172, 'It takes a minute.', `width:148mm;text-align:center;font-size:9.5mm;font-weight:600;letter-spacing:-0.02em;color:${C.core}`, 'nw')}
    ${at(0, 190, F.url, `width:148mm;text-align:center;font-size:3.2mm;color:${C.ink3}`, 'm nw')}`,
};

// 6 Workshop card, A4, in an acrylic stand. Dates big, then when and where, then the three tickets.
export const card = {
  id: 'v1',
  note: 'The original: dates big on navy. Adds the three tickets under the facts, and keeps “Limited seats”.',
  html: () => {
    const M = m(210, 297), W = 210 - 2 * M;   // 17, 176
    return `
    ${navyGrid(210, 297, 10, 0.25)}
    ${at(M, M, mark(26, '#fff'))}
    ${at(210 - M - 60, M + 6, `<div style="text-align:right">${pill(F.seats, 4.6)}</div>`, 'width:60mm')}
    ${at(M, 58, 'Career workshop', `font-size:4.2mm;color:${C.ice}`, 'm nw')}
    ${at(M - 2.5, 68, 'Nov 10<br>to 13', 'font-size:46mm;color:#fff;line-height:0.95', 'd nw')}
    ${at(M, 168, `${F.days}<br>${TIME}<br>${F.room}`, 'font-size:11.5mm;color:#fff;font-weight:600;letter-spacing:-0.025em;line-height:1.32', 'nw')}
    ${at(M, 226, tickets(W, 12.5, true), `padding-top:7mm;border-top:0.4mm solid rgba(185,238,255,0.35)`)}`;
  },
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
  id: 'bingo', piece: 'bingo', name: 'Red Flag Bingo card', size: 'A6, 105 × 148 mm', mm: [105, 148], pages: ['Front', 'Back'],
  print: 'Card stock, 2 sides. Print 4 on one A4 sheet, then cut. Pens on the table so people can tick boxes.',
  versions: [{
    id: 'v1',
    note: 'Replaces the AAA try-out card, in the same layout: a blue band, then nine resume red flags to tick. The back is the AAA back, with the QR.',
    html: async (i) => {
      const M = m(105, 148);   // 8
      return i === 0 ? `
      ${fill('#fff')}
      <div class="abs" style="left:0;top:0;width:105mm;height:27mm;background:${C.core}"></div>
      ${at(M, 6.4, 'Resume edition', `font-size:2.7mm;color:${C.ice}`, 'm nw')}
      ${at(M - 0.4, 11, 'Red Flag Bingo', 'font-size:10.4mm;color:#fff', 'd nw')}
      ${at(M, 32.5, 'Tick every one that’s true for you.', `font-size:3.3mm;color:${C.ink2};font-weight:600;letter-spacing:-0.01em`, 'nw')}
      ${at(M, 39, `<div style="display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:26.5mm;gap:1.5mm;width:${105 - 2 * M}mm">
        ${SQUARES.map((s) => s ? `<div style="border:0.35mm solid rgba(6,26,77,0.22);border-radius:1.4mm;display:flex;align-items:center;justify-content:center;text-align:center;padding:1.8mm;font-size:2.95mm;line-height:1.22;font-weight:600;color:${C.navy};letter-spacing:-0.01em">${s}</div>`
          : `<div style="background:${C.navy};border-radius:1.4mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff;padding:1.6mm"><div class="m" style="font-size:2.4mm;color:${C.cyan}">Free space</div><div style="font-size:3.1mm;font-weight:700;line-height:1.2;margin-top:1mm">No LinkedIn yet</div></div>`).join('')}</div>`)}
      ${atb(M, M - 1, `<span>3 in a row? We fix all of it<br>in 4 sessions. Ask us.</span>${word(4.4, C.navy)}`,
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
