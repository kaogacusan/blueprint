// V1 for the booth: the original "as rendered" designs, refined, and used as the system for the newer pieces
// (the standing banner and the Red Flag Bingo card).
//
// The system, so every piece looks like one set:
//   Grounds   brand gradient (outward-facing: header, banner, flyer front, the bingo card's back), navy (table pieces:
//             skirt, workshop card), paper + the site's grid (backdrop), white (things people use: the QR sign, the
//             resume-check sign, the sign-up sheet, the bingo card).
//   Margin    8% of the short edge, the same on all four sides (m()).
//   Type      Inter display for headlines (.d), Inter 600 for facts, JetBrains Mono caps for small labels (.m).
//   Colour    one accent per ground: core blue on light, ice/cyan on dark. No gradient text, no extra colours.
//   QR        on a white tile on dark grounds. Prices always show all three tickets, Barkada included.
// Sizes in mm. booth.mjs puts these in as V1 of each piece; pullup (the standing banner), bingo, check and guide are V1 only.
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

// The activity: a free 60-second resume check at the table. The sign, A4, in an acrylic stand.
const STEPS3 = [['01', 'Open your resume or LinkedIn on your phone.'], ['02', 'We read it the way a recruiter does.'], ['03', 'You leave with one fix you can make today.']];
export const check = {
  id: 'check', piece: 'check', name: 'Resume check sign', size: 'A4, 210 × 297 mm', mm: [210, 297], pages: ['Front'],
  print: 'Paper or card stock, colour, printed at a shop. Slides into an A4 acrylic stand.',
  versions: [{
    id: 'v1',
    note: 'The booth’s one activity: a free 60-second resume check. Three steps, and no sign-up needed.',
    html: () => {
      const M = m(210, 297), W = 210 - 2 * M;   // 17, 176
      return `
      ${fill('#fff')}
      ${at(M, M, lockup(10))}
      ${at(210 - M - 70, M + 3, 'At this table', `width:70mm;text-align:right;font-size:3.2mm;color:${C.core}`, 'm nw')}
      ${at(M - 1.5, 52, `Free<br>60-second<br><span style="color:${C.core}">resume check.</span>`, `font-size:31mm;color:${C.navy};line-height:0.98`, 'd nw')}
      ${at(M, 152, 'Show us your resume or LinkedIn on your phone. We’ll give you one fix you can make today.', `width:${W}mm;font-size:7.2mm;color:${C.ink2};font-weight:600;letter-spacing:-0.02em;line-height:1.3`)}
      ${at(M, 196, `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6mm;width:${W}mm;padding-top:7mm;border-top:0.4mm solid ${C.line}">
          ${STEPS3.map(([n, t]) => `<div><div class="m" style="font-size:3.6mm;color:${C.core}">${n}</div><div style="font-size:4.6mm;font-weight:600;color:${C.navy};line-height:1.3;margin-top:2mm;letter-spacing:-0.01em">${t}</div></div>`).join('')}</div>`)}
      ${atb(M, M, `<span>No sign-up needed.</span><span style="color:${C.ink3};font-weight:500">${DATES} · ${F.room}</span>`,
        `display:flex;justify-content:space-between;align-items:baseline;width:${W}mm;font-size:5.4mm;font-weight:700;letter-spacing:-0.02em;color:${C.navy};padding-top:5mm;border-top:0.4mm solid ${C.line}`, 'nw')}`;
    },
  }],
};

// The team guide for the resume check, A4 paper. Not for the table: whoever runs the check keeps it.
const FIXES = [
  ['Objective statement', 'Cut it. One line on what you do goes at the top instead.'],
  ['Bullets start with “Responsible for”', 'Start with a verb: led, built, ran, wrote, organised.'],
  ['No numbers', 'Add one: how many people, how much money, how often.'],
  ['“Proficient in MS Word”', 'Cut basic tools. List what the role asks for.'],
  ['Email like xX_gamer_Xx', 'Use the school email or firstname.lastname.'],
  ['Two pages or more', 'One page. Cut the oldest and the least related first.'],
  ['LinkedIn headline “Student at ADMU”', 'Say what you do: course, plus the 2 things you want to be known for.'],
  ['LinkedIn photo cropped from a group pic', 'A clear photo of just you, face filling the frame.'],
];
export const guide = {
  id: 'guide', piece: 'guide', name: 'Resume check guide (team)', size: 'A4, 210 × 297 mm', mm: [210, 297], pages: ['Front'],
  print: 'Paper, black and white is fine. One for each person on shift. Not for the table.',
  versions: [{
    id: 'v1',
    note: 'How to run the 60-second check: what to say, the 8 most common fixes (the same red flags as the bingo card), the AAA rewrite, and the pitch. A tally at the bottom counts checks per day.',
    html: () => {
      const M = 14, W = 182;
      const h = (n, t) => `<div style="display:flex;align-items:baseline;gap:3mm;margin:0 0 2.4mm"><span class="m" style="font-size:3mm;color:${C.core}">${n}</span><span class="d" style="font-size:5.4mm;color:${C.navy}">${t}</span></div>`;
      const say = (t) => `<div style="font-size:3.8mm;line-height:1.4;color:${C.ink};font-weight:500;padding:2.4mm 3.4mm;background:${C.paper};border-left:0.8mm solid ${C.core};margin-bottom:5mm">“${t}”</div>`;
      return `
      ${fill('#fff')}
      ${at(M, M, lockup(8))}
      ${at(210 - M - 90, M + 1.5, 'For the team · not for the table', `width:90mm;text-align:right;font-size:2.7mm;color:${C.ink3}`, 'm nw')}
      ${at(M - 0.5, 28, 'Resume check. <span style="color:' + C.core + '">60 seconds.</span>', `font-size:11mm;color:${C.navy}`, 'd nw')}
      ${at(M, 42, 'One fix, one rewritten bullet, then the pitch. Keep it friendly and quick.', `font-size:3.8mm;color:${C.ink2};font-weight:500`, 'nw')}
      ${at(M, 54, `
        ${h('01', 'Ask')}${say('Want a free 60-second resume check? Open your resume or your LinkedIn on your phone.')}
        ${h('02', 'Read the top third, about 10 seconds')}
        <div style="font-size:3.6mm;color:${C.ink2};line-height:1.4;margin:-1mm 0 5mm">That is about how long a recruiter looks first. Then give <b>one</b> fix, the first one that applies:</div>
        <div style="display:grid;grid-template-columns:62mm 1fr;border-top:0.3mm solid ${C.line};margin-bottom:5mm">
          ${FIXES.map(([a, b]) => `<div style="font-size:3.4mm;font-weight:650;color:${C.navy};padding:1.8mm 3mm 1.8mm 0;border-bottom:0.3mm solid ${C.line}">${a}</div><div style="font-size:3.4mm;color:${C.ink2};padding:1.8mm 0;border-bottom:0.3mm solid ${C.line}">${b}</div>`).join('')}</div>
        ${h('03', 'Rewrite one bullet together, with AAA')}
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin-bottom:5mm">${F.aaa.map(([a, b]) => `<div style="border:0.3mm solid ${C.line};border-radius:1.6mm;padding:2.4mm 3mm"><div class="d" style="font-size:4.2mm;color:${C.core}">${a}</div><div style="font-size:3.3mm;color:${C.ink2};margin-top:1mm">${b}</div></div>`).join('')}</div>
        ${h('04', 'Close')}${say(`That was one bullet in a minute. In 4 sessions we do your whole resume, LinkedIn, and intro. Here’s a flyer, and the QR is right here. With friends? Barkada of 3 is ${F.barkada}, ${'₱666'} each.`)}`, `width:${W}mm`)}
      ${atb(M, M, `<div class="m" style="font-size:2.8mm;color:${C.ink3};margin-bottom:2mm">Tally: one line per check</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);border:0.3mm solid ${C.line};border-radius:1.6mm">${['Mon 9', 'Tue 10', 'Wed 11', 'Thu 12', 'Fri 13'].map((d, i) => `<div style="height:16mm;padding:1.6mm 2.4mm;${i ? `border-left:0.3mm solid ${C.line}` : ''}"><span class="m" style="font-size:2.6mm;color:${C.ink3}">${d}</span></div>`).join('')}</div>`, `width:${W}mm`)}`;
    },
  }],
};

// 6 Calling card, 90 × 54 mm: the workshop card made small enough to take home. Same size as Prince's pass
// cards, so one shop can print both. Front: who, when, where, and the QR. Back: three resume fixes worth keeping
// (the top three from the resume check), then the pitch and the prices.
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
  print: 'Calling card, 2 sides, 300 gsm or thicker, matte. 100–200 pcs. The PDF is 96 × 60 mm: 3 mm bleed on every side, trim to 90 × 54 (the same size as Prince’s pass cards). No shop? The “10 on A4” file prints at home.',
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
  id: 'bingo', piece: 'bingo', name: 'Red Flag Bingo card', size: 'A6, 105 × 148 mm', mm: [105, 148], pages: ['Front', 'Back'],
  print: 'Card stock, 2 sides. Print 4 on one A4 sheet, then cut. Pens on the table so people can tick boxes.',
  versions: [{
    id: 'v1',
    note: 'Replaces the AAA try-out card, in the same layout: a blue band, then nine resume red flags to tick. It leads into the free resume check. The back is the AAA back, with the QR.',
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
      ${atb(M, M - 1, `<span>3 in a row? Get a free 60-second<br>resume check at our table.</span>${word(4.4, C.navy)}`,
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

// ---------- home-print sheets: several copies of a 2-sided piece on A4, ready for a home printer ----------
// The grid is centred and every copy is the same, so the backs line up when the printer flips on the long edge.
// Copies touch (one cut separates two). Pieces shrink a little if needed to keep 5 mm clear for the printer.
// Crop marks go in the margin when there is room for them.
const sheetOf = ({ id, piece, name, size, print, note, cell: [cw, ch], cols, rows, html }) => ({
  id, piece, name, size, mm: [210, 297], pages: ['Front', 'Back'], print,
  versions: [{
    id: 'v1', note,
    html: async (i) => {
      const one = await html(i);
      const k = Math.min(1, 200 / (cols * cw), 287 / (rows * ch));
      const w = cw * k, h = ch * k, x0 = (210 - cols * w) / 2, y0 = (297 - rows * h) / 2;
      let cells = '';
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        cells += `<div style="position:absolute;left:${x0 + c * w}mm;top:${y0 + r * h}mm;width:${w}mm;height:${h}mm;overflow:hidden">
          <div style="position:absolute;left:0;top:0;width:${cw}mm;height:${ch}mm;transform:scale(${k});transform-origin:0 0">${one}</div></div>`;
      }
      let marks = '';
      const t = (a, b, c, d) => { marks += `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}"/>`; };
      if (y0 >= 8) for (let c = 0; c <= cols; c++) { const x = x0 + c * w; t(x, y0 - 7, x, y0 - 2); t(x, 297 - y0 + 2, x, 297 - y0 + 7); }
      if (x0 >= 8) for (let r = 0; r <= rows; r++) { const y = y0 + r * h; t(x0 - 7, y, x0 - 2, y); t(210 - x0 + 2, y, 210 - x0 + 7, y); }
      return `${fill('#fff')}${cells}${marks ? `<svg class="fill" viewBox="0 0 210 297" xmlns="http://www.w3.org/2000/svg"><g stroke="#000" stroke-width="0.2">${marks}</g></svg>` : ''}`;
    },
  }],
});
const HOME = 'Both sides, flip on the long edge, at 100% (no “fit to page”).';

export const cardsheet = sheetOf({
  id: 'cardsheet', piece: 'card', name: 'Calling cards, 10 on A4 (home print)', size: 'A4, 2 sides, 10 cards', cell: [90, 54], cols: 2, rows: 5,
  print: `Only if no shop can print the calling cards in time. A4 card stock, 200 gsm or more. ${HOME} Cut on the crop marks: 3 cuts down, 6 across.`,
  note: 'The calling card, 2 across and 5 down, with crop marks.',
  html: (i) => (i === 0 ? cardFront() : cardBack()),
});
export const flyersheet = sheetOf({
  id: 'flyersheet', piece: 'flyers', name: 'Flyers, 4 on A4 (home print)', size: 'A4, 2 sides, 4 flyers', cell: [105, 148], cols: 2, rows: 2,
  print: `Regular paper or light card stock, colour. ${HOME} Trim the white edge, then cut once down and once across. 25 sheets = 100 flyers.`,
  note: 'The flyer, 4 to a sheet, slightly smaller than A6 so a home printer does not cut the edges off.',
  html: (i) => flyer.html(i),
});
export const bingosheet = sheetOf({
  id: 'bingosheet', piece: 'bingo', name: 'Bingo cards, 4 on A4 (home print)', size: 'A4, 2 sides, 4 cards', cell: [105, 148], cols: 2, rows: 2,
  print: `A4 card stock, colour. ${HOME} Trim the white edge, then cut once down and once across. 15 sheets = 60 cards.`,
  note: 'The Red Flag Bingo card, 4 to a sheet, slightly smaller than A6 so a home printer does not cut the edges off.',
  html: (i) => bingo.versions[0].html(i),
});
