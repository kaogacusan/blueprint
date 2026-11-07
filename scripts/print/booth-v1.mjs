// V1 for the booth: the campaign look ("Delulu is not a career plan. Blueprint is.").
// Brand blues + two accents with one job each:
//   PEN (red)      = what is wrong. Red-pen notes on a bad resume, the red flags.
//   STICKER (yellow) = what you get. Free candy, limited seats, the punchline.
// Handwriting (Caveat) is the roast voice. Inter is the Blueprint voice. Times New Roman is the joke.
// Sizes in mm. booth.mjs puts these in as V1 of each piece; pullup, bingo, candy and frame are V1 only.
import { C, F, GRAD, word, mark, lockup, qr, sampleQR } from './kit.mjs';

export const PEN = '#ff3b30';
export const STICKER = '#ffd43b';
const HAND = 'font-family:Caveat,cursive;font-weight:700;letter-spacing:0;line-height:0.95';
const TIMES = "font-family:'Times New Roman',Times,serif;font-weight:400;letter-spacing:-0.01em";
const PX = 96 / 25.4;   // svg stroke widths below are in CSS px

// ---------- tiny layout helpers ----------
const at = (x, y, inner, style = '', cls = '') => `<div class="abs ${cls}" style="left:${x}mm;top:${y}mm;${style}">${inner}</div>`;
const fill = (bg) => `<div class="fill" style="background:${bg}"></div>`;
const tile = (size, pad, inner, r = pad * 0.9) => `<div style="width:${size}mm;height:${size}mm;padding:${pad}mm;background:#fff;border-radius:${r}mm">${inner}</div>`;

// ---------- hand-drawn marks (SVG, stretch to the box they sit in) ----------
const svgBox = (w, h, path, color, mm, extra = '') =>
  `<svg class="lg" style="width:${w}mm;height:${h}mm;overflow:visible" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <path d="${path}" fill="none" stroke="${color}" stroke-width="${(mm * PX).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" ${extra}/></svg>`;
// a loop drawn round something, overshooting where it closes
const LOOP = 'M10 58 C4 30 36 5 68 8 C94 11 101 42 92 68 C82 95 34 99 13 82 C1 71 4 44 26 24';
const UNDER = 'M1 60 C14 40 24 78 38 56 S62 36 76 58 S92 70 99 48';
const STRIKE = 'M0 56 C30 44 66 58 100 46';
export const circleAround = (w, h, color = PEN, mm = 1.2) => svgBox(w, h, LOOP, color, mm);
export const squiggle = (w, h, color = PEN, mm = 1.2) => svgBox(w, h, UNDER, color, mm);
export const strike = (w, h, color = PEN, mm = 1.2) => svgBox(w, h, STRIKE, color, mm);
// arrow from (x0,y0) to (x1,y1) inside a w × h box (mm), bending by `bend` mm
export function arrow(w, h, [x0, y0], [x1, y1], { color = PEN, mm = 1.2, bend = 0.25 } = {}) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const dx = x1 - x0, dy = y1 - y0;
  const cx = mx - dy * bend, cy = my + dx * bend;
  const a = Math.atan2(y1 - cy, x1 - cx), L = Math.max(w, h) * 0.08 + mm * 2;
  const h1 = [x1 - L * Math.cos(a - 0.45), y1 - L * Math.sin(a - 0.45)];
  const h2 = [x1 - L * Math.cos(a + 0.45), y1 - L * Math.sin(a + 0.45)];
  const f = (n) => n.toFixed(1);
  return `<svg class="lg" style="width:${w}mm;height:${h}mm;overflow:visible" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="${color}" stroke-width="${mm}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M${f(x0)} ${f(y0)} Q${f(cx)} ${f(cy)} ${f(x1)} ${f(y1)}"/><path d="M${f(h1[0])} ${f(h1[1])} L${f(x1)} ${f(y1)} L${f(h2[0])} ${f(h2[1])}"/></g></svg>`;
}
// a red flag. h = height in mm
export const flag = (h, color = PEN, pole = 'currentColor') =>
  `<svg class="lg" style="height:${h}mm;width:${(h * 0.8).toFixed(2)}mm" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="3" width="4" height="46" rx="2" fill="${pole}"/>
    <path d="M8 5 C16 1 22 9 30 6 C33 5 36 4 38 3 L38 27 C34 30 28 31 22 29 C16 27 12 27 8 29 Z" fill="${color}"/></svg>`;
// a round sticker, tilted. d = diameter in mm
export const sticker = (d, inner, { bg = STICKER, ink = C.navy, rot = -8, ring = true, style = '' } = {}) =>
  `<div style="width:${d}mm;height:${d}mm;border-radius:50%;background:${bg};color:${ink};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;transform:rotate(${rot}deg);${ring ? `box-shadow:inset 0 0 0 ${(d * 0.035).toFixed(1)}mm ${bg},inset 0 0 0 ${(d * 0.045).toFixed(1)}mm ${ink};` : ''}${style}">${inner}</div>`;
// a pill sticker
const pill = (inner, { bg = STICKER, ink = C.navy, rot = -3, pad = [3, 6], r = 99, style = '' } = {}) =>
  `<div style="display:inline-flex;align-items:center;gap:0.35em;background:${bg};color:${ink};padding:${pad[0]}mm ${pad[1]}mm;border-radius:${r}mm;transform:rotate(${rot}deg);${style}">${inner}</div>`;
// yellow highlighter behind words
const hl = (t, c = STICKER) => `<span style="background:linear-gradient(transparent 52%, ${c} 52%, ${c} 92%, transparent 92%);padding:0 0.08em;margin:0 -0.08em">${t}</span>`;
const check = (h, bg = C.core) => `<svg class="lg" style="height:${h}mm;width:${h}mm" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="12" fill="${bg}"/><path d="M6.5 12.5l3.6 3.6 7.4-8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ---------- copy ----------
const DAYS = `${F.datesShort} · ${F.days}`;
const WHEN = `${F.time} · ${F.room}`;
const TAG = 'career glow-up workshop';

// ===================================================================================
// 1 Header tarp, 1.4 × 0.6 m. Read from far down the road: who, what, when, and a reason to walk over now.
export const header = {
  id: 'v1',
  note: 'Logo, what it is, when, and a free-candy sticker that gives people a reason to walk over now.',
  html: () => `
    <div class="fill bg-grad"></div>
    ${at(84, 140, mark(320, '#fff'))}
    ${at(356, 122, word(150, '#fff'))}
    ${at(360, 328, TAG, 'font-size:60mm;color:#fff;font-weight:700;letter-spacing:-0.04em;line-height:1', 'nw')}
    ${at(362, 426, `${F.datesShort} · ${F.room}`, `font-size:48mm;color:${C.ice};font-weight:600;letter-spacing:-0.03em;line-height:1`, 'nw')}
    ${at(1092, 128, sticker(282, `
      <div class="dd" style="font-size:70mm;line-height:0.86;font-weight:850;letter-spacing:-0.05em">FREE<br>CANDY</div>
      <div style="${HAND};font-size:48mm;margin-top:8mm">come in ↓</div>`, { rot: 9 }))}`,
};

// 2 Backdrop tarp, 1.5 × 1.5 m. The roast: a bad resume with red-pen notes. People stop to read jokes.
// The seller stands in front of x 300–600 mm; the table hides the bottom 250 mm. So: headline on top, resume on the right.
// A resume line with an optional red-pen note to its right. mark = 'circle' | 'strike' | null.
const rLine = (t, { mark: m = null, w = 300, note = '', nx = 0, ny = -6, rot = -5, size = 54 } = {}) => `
  <div style="position:relative;${TIMES};font-size:27mm;line-height:1.3;color:#222">${t}
    ${m === 'circle' ? `<div class="abs" style="left:-9mm;top:-7mm">${circleAround(w, 46, PEN, 2.2)}</div>` : ''}
    ${m === 'strike' ? `<div class="abs" style="left:-4mm;top:8mm">${strike(w, 16, PEN, 2.4)}</div>` : ''}
    ${note ? `<div class="abs nw" style="left:${nx}mm;top:${ny}mm;${HAND};font-size:${size}mm;color:${PEN};transform:rotate(${rot}deg)">${note}</div>` : ''}</div>`;
const rHead = (t, extra = '') => `<div style="position:relative;${TIMES};font-weight:700;font-size:25mm;letter-spacing:0.08em;color:#111;margin-top:24mm;border-bottom:0.9mm solid #333;padding-bottom:2mm;margin-bottom:6mm">${t}${extra}</div>`;
export const backdrop = {
  id: 'v1',
  note: 'The resume roast. A bad resume with red-pen notes on the right, where nobody stands in front of it. The offer and dates sit above the table line.',
  html: () => `
    ${fill(C.paper)}
    ${at(84, 72, 'Your resume is giving', `font-size:114mm;color:${C.navy}`, 'd nw')}
    ${at(80, 196, `Microsoft Word <span style="position:relative;display:inline-block">2007.<span class="abs" style="left:-24mm;top:4mm">${circleAround(390, 168, PEN, 3)}</span></span>`, `${TIMES};font-size:150mm;color:${C.navy};line-height:1.05`, 'nw')}

    ${at(84, 470, 'We fix that.', `font-size:116mm;color:${C.core}`, 'd nw')}
    ${at(88, 618, `4 sessions. Leave with<br>a resume, LinkedIn &amp;<br>intro that ${hl('actually')}<br>get replies.`, `font-size:54mm;color:${C.navy};font-weight:650;letter-spacing:-0.03em;line-height:1.16`, 'nw')}

    ${at(800, 392, `
      <div style="width:630mm;height:622mm;background:#fff;border:1mm solid rgba(16,17,20,0.14);box-shadow:0 6mm 18mm rgba(6,26,77,0.16);transform:rotate(2deg);padding:26mm 40mm;position:relative">
        <div style="${TIMES};font-weight:700;font-size:44mm;text-align:center;color:#111;letter-spacing:0.02em">JUAN DELA CRUZ</div>
        <div style="${TIMES};font-size:20mm;text-align:center;color:#444;margin-top:2mm">xX_slayer_Xx@yahoo.com</div>
        ${rHead('OBJECTIVE', `<span class="abs nw" style="left:300mm;top:-14mm;${HAND};font-size:60mm;color:${PEN};letter-spacing:0;transform:rotate(-6deg)">be so fr</span>`)}
        ${rLine('To obtain a challenging position', { mark: 'strike', w: 420 })}
        ${rLine('where I can utilize my skills.', { mark: 'strike', w: 360 })}
        ${rHead('SKILLS')}
        ${rLine('• Proficient in MS Word', { mark: 'circle', w: 300, note: 'bestie…', nx: 330, ny: -10 })}
        ${rLine('• Hardworking team player', { note: '← says everyone', nx: 345, ny: -2, size: 44, rot: -3 })}
        ${rHead('REFERENCES')}
        ${rLine('Available upon request.', { mark: 'circle', w: 300, note: 'who asked??', nx: 320, ny: -12 })}
        ${rHead('HOBBIES')}
        ${rLine('Sleeping, eating, Netflix.', { note: 'ok relatable', nx: 335, ny: -4, size: 48, rot: -4 })}
      </div>`)}

    ${at(0, 1040, `<div style="display:flex;align-items:flex-start;justify-content:space-between;height:100%;padding:40mm 70mm 0 84mm;color:#fff">
        <div class="nw"><div class="d" style="font-size:80mm">${F.datesShort}</div><div style="font-size:40mm;font-weight:600;color:${C.ice};margin-top:8mm;letter-spacing:-0.02em">${WHEN}</div></div>
        <div style="text-align:center">${pill(`<span class="d" style="font-size:62mm">Barkada of 3: ${F.barkada}</span>`, { pad: [14, 30], rot: -3 })}
          <div style="${HAND};font-size:50mm;color:#fff;margin-top:8mm">drag your friends. ₱666 each.</div></div></div>`, `width:1500mm;height:460mm;background:${C.navy}`)}`,
};

// 3 Table skirt, 0.9 × 0.7 m. At knee height, read by people walking past: the freebie and the game.
export const skirt = {
  id: 'v1',
  note: 'Navy, to match a navy tablecloth. Says the two things that make people stop at a table: free candy, and a game.',
  html: () => `
    ${fill(C.navy)}
    ${at(60, 58, word(54, '#fff'))}
    ${at(54, 150, 'Free<br>candy.', `font-size:176mm;color:${STICKER};line-height:0.9;font-weight:800;letter-spacing:-0.055em`, 'nw')}
    ${at(478, 162, `if you survive our<br><span style="display:inline-flex;align-items:center;gap:6mm">${flag(50)}Red Flag</span><br>Bingo ↑`, `${HAND};font-size:58mm;color:#fff;line-height:1.02;transform:rotate(-4deg)`, 'nw')}
    ${at(60, 556, `${TAG} · ${F.datesShort}`, `font-size:42mm;color:${C.ice};font-weight:600;letter-spacing:-0.03em`, 'nw')}`,
};

// 4 Pull-up banner, 80 × 200 cm, outside the booth. Hook up top (seen over heads), QR at chest height, nothing in the bottom 15 cm.
export const pullup = {
  id: 'pullup', piece: 'pullup', name: 'Pull-up banner', size: '2.75 × 6.5 ft (84 × 198 cm), roll-up stand', mm: [840, 1980], pages: ['Front'],
  print: 'Roll-up (pull-up) banner, 2.75 × 6.5 ft, with stand and bag: the size InterMatrix and Jincos stock. For an 80 × 200 cm stand, ask the shop to fit to height. The bottom 15 cm sits in the stand.',
  versions: [{
    id: 'v1',
    note: 'The hook up top so it reads over heads, the punchline on yellow, the offer, a big QR, then where to go.',
    html: async () => `
      ${fill(`linear-gradient(172deg, ${C.core} 0%, ${C.electric} 58%, ${C.sky} 100%)`)}
      ${at(62, 80, 'Delulu<br>is not a<br>career<br>plan.', 'font-size:160mm;color:#fff;line-height:0.9;font-weight:780;letter-spacing:-0.06em', 'nw')}
      ${at(58, 690, `<div style="display:inline-flex;align-items:center;gap:22mm;background:${STICKER};padding:30mm 40mm 30mm 40mm;border-radius:14mm;transform:rotate(-2.5deg)">
          ${word(96, C.navy)}<span class="d" style="font-size:118mm;color:${C.navy};margin-top:-6mm">is.</span></div>`)}
      ${at(64, 1146, `From ${F.single} a session.<br>Barkada of 3: ${F.barkada}.`, `font-size:46mm;color:${STICKER};font-weight:750;letter-spacing:-0.035em;line-height:1.15`, 'nw')}
      ${at(64, 910, `A 4-session career workshop.<br><span style="color:${C.ice};font-weight:600">Leave with a resume, LinkedIn<br>&amp; intro that actually<br>get replies.</span>`, 'font-size:44mm;color:#fff;font-weight:700;letter-spacing:-0.03em;line-height:1.2', 'nw')}
      ${at(64, 1300, `<div style="display:flex;align-items:center;gap:34mm">${tile(280, 20, await qr(undefined, 240), 14)}
          <div class="d nw" style="font-size:76mm;color:#fff;line-height:0.98">Scan.<br><span style="color:${C.navy}">1-min</span><br><span style="color:${C.navy}">sign-up.</span></div></div>`)}
      ${at(64, 1616, `${DAYS}<br><span style="color:${C.navy}">${WHEN}</span>`, 'font-size:46mm;color:#fff;font-weight:700;letter-spacing:-0.03em;line-height:1.2', 'nw')}
      ${at(60, 1758, pill(`<span class="d" style="font-size:46mm">Free candy at our booth</span><span style="font-size:46mm;font-weight:800">→</span>`, { pad: [12, 26] }))}`,
  }],
};

// 5 Sign-up QR, A5 sintra. One job: get the scan.
export const regqr = {
  id: 'v1',
  note: 'One job: get the scan. A big QR, a nudge, and a joke that says how quick it is.',
  html: async () => `
    ${fill('#fff')}
    ${at(12, 12, lockup(9))}
    ${at(11, 29, `Shoot<br>your <span style="color:${C.core}">shot.</span>`, `font-size:22mm;color:${C.navy};line-height:0.92`, 'd nw')}
    ${at(98, 36, arrow(34, 40, [6, 4], [16, 36], { color: PEN, mm: 1.1, bend: -0.35 }))}
    ${at(26, 80, await qr(undefined, 96))}
    ${at(12, 182, `Takes 1 min. Shorter than<br>your last situationship.`, `${HAND};font-size:9.4mm;color:${PEN};line-height:1;text-align:center;width:124mm`, '')}`,
};

// 6 Workshop card, A4 sintra. Everything a "what is this?" needs, and why the Full Pass is the deal.
const sessionRow = (s, i) => `
  <div style="display:grid;grid-template-columns:15mm 1fr auto;align-items:baseline;padding:3.6mm 0;border-top:0.4mm solid rgba(185,238,255,0.28)">
    <span class="m" style="font-size:3.6mm;color:${C.cyan}">${s.n}</span>
    <span><span class="d nw" style="font-size:9mm;color:#fff">${s.title}</span><br><span style="font-size:3.9mm;color:${C.ice};font-weight:500;letter-spacing:-0.01em">${s.idea}</span></span>
    <span class="m nw" style="font-size:3.3mm;color:${C.ice}">${s.day.replace(', ', ' ')}</span></div>`;
const ticket = (k, price, quip, hot = false) => `
  <div style="${hot ? `background:${STICKER};color:${C.navy}` : 'border:0.5mm solid rgba(185,238,255,0.5);color:#fff'};border-radius:4mm;padding:5mm 5mm 5mm;height:100%">
    <div class="m nw" style="font-size:2.7mm;${hot ? '' : `color:${C.ice}`}">${k}</div>
    <div class="d nw" style="font-size:13mm;margin-top:2.2mm">${price}</div>
    <div style="${HAND};font-size:6mm;margin-top:2.4mm;line-height:1;${hot ? '' : `color:${C.ice}`}">${quip}</div></div>`;
export const card = {
  id: 'v1',
  note: 'The 4 sessions in plain words, when and where, and all three tickets. The Full Pass shows it works out to ₱200 a session.',
  html: () => `
    ${fill(C.navy)}
    ${at(16, 16, lockup(11, { markColor: '#fff', wordColor: '#fff' }))}
    ${at(15, 38, `4 sessions.<br><span class="gl">1 glow-up.</span>`, 'font-size:25mm;color:#fff;line-height:0.98', 'd nw')}
    ${at(148, 18, sticker(46, `<div class="dd" style="font-size:8.6mm;line-height:0.9">LIMITED<br>SEATS</div><div style="${HAND};font-size:5.4mm;margin-top:1mm">no cap</div>`, { rot: 10 }))}
    ${at(16, 94, F.sessions.map(sessionRow).join(''), 'width:178mm')}
    ${at(16, 190, `${F.days} · ${WHEN}`, 'font-size:5.2mm;color:#fff;font-weight:700;letter-spacing:-0.02em', 'nw')}
    ${at(16, 204, `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3.6mm;width:178mm">
        ${ticket('Full Pass · all 4', F.full, '₱200 a session.<br>the move.', true)}
        ${ticket('Single · pick 1', F.single, 'commitment<br>issues? valid.')}
        ${ticket('Barkada · 3 passes', F.barkada, '₱666 each.<br>bring the gc.')}</div>`)}
    ${at(16, 274, 'Ask us anything. We don’t bite.', `${HAND};font-size:8mm;color:${C.cyan}`, 'nw')}`,
};

// 7 GCash QR, A5 sintra.
export const gcash = {
  id: 'v1',
  note: 'Pay with GCash, big. Put our real QR and account name in before printing.',
  html: () => `
    ${fill('#fff')}
    ${at(12, 12, lockup(9))}
    ${at(11, 29, `Pay with<br><span style="color:${C.electric}">GCash.</span>`, `font-size:22mm;color:${C.navy};line-height:0.92`, 'd nw')}
    ${at(28, 76, sampleQR(92, { seed: 11 }))}
    ${at(12, 188, 'Send it. (The payment, not<br>the risky text.)', `${HAND};font-size:9mm;color:${PEN};line-height:1;text-align:center;width:124mm`, '')}`,
};

// 9 Red Flag Bingo, A6 card, 2 sides. The table game: tick what's true, 3 in a row wins candy, and the card goes home with a QR.
const SQUARES = [
  'Objective: “to obtain a challenging position”',
  'Proficient in MS Word',
  'Email is xX_gamer_Xx @yahoo.com',
  'Skill bars. Excel: ●●●○○',
  null,
  '“Very detail-oreinted”',
  'LinkedIn pic cropped from a group photo',
  'Hobbies: sleeping, eating',
  'Your only connection is your tita',
];
export const bingo = {
  id: 'bingo', piece: 'bingo', name: 'Red Flag Bingo card', size: 'A6, 105 × 148 mm', mm: [105, 148], pages: ['Front', 'Back'],
  print: 'Card stock, 2 sides. Print 4 on one A4 sheet, then cut. Pens on the table so people can tick boxes.',
  versions: [{
    id: 'v1',
    note: 'People tick the resume red flags that are true for them. 3 in a row gets candy. The back sends them to sign up.',
    html: async (i) => i === 0 ? `
      ${fill('#fff')}
      <div class="abs" style="left:0;top:0;width:105mm;height:31mm;background:${C.navy}"></div>
      ${at(7, 6.5, `<div style="display:flex;align-items:center;gap:2.6mm">${flag(17, PEN, '#fff')}<div><div class="d nw" style="font-size:7.4mm;color:#fff">Resume Red Flag</div><div class="dd nw" style="font-size:11.4mm;color:${STICKER};letter-spacing:0.02em;font-weight:850">BINGO</div></div></div>`)}
      ${at(7, 34.5, 'Tick every one that’s you. Be honest.', `font-size:3.3mm;color:${C.ink2};font-weight:600;letter-spacing:-0.01em`, 'nw')}
      ${at(7, 41, `<div style="display:grid;grid-template-columns:repeat(3,29.6mm);grid-auto-rows:26.6mm;gap:1.6mm">
        ${SQUARES.map((s) => s ? `<div style="border:0.45mm solid rgba(6,26,77,0.28);border-radius:1.6mm;display:flex;align-items:center;justify-content:center;text-align:center;padding:1.8mm;font-size:2.95mm;line-height:1.22;font-weight:600;color:${C.navy};letter-spacing:-0.01em">${s}</div>`
          : `<div style="background:${C.core};border-radius:1.6mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff;padding:1.6mm"><div class="m" style="font-size:2.6mm;color:${STICKER}">Free space</div><div style="font-size:3.1mm;font-weight:700;line-height:1.2;margin-top:1mm">No LinkedIn (yet)</div></div>`).join('')}</div>`)}
      ${at(7, 129.5, `<b style="font-weight:750;color:${C.navy}">3 in a row = free candy.</b>`, 'font-size:3.9mm;letter-spacing:-0.02em', 'nw')}
      ${at(7, 135, '5 or more? We need to talk.', `${HAND};font-size:6.4mm;color:${PEN}`, 'nw')}
      ${at(80, 138.6, word(4, C.navy))}` : `
      <div class="fill bg-grad"></div>
      ${at(9, 10, word(8.5, '#fff'))}
      ${at(8.5, 28, `Bingo?<br>Don’t panic.`, 'font-size:13.5mm;color:#fff;line-height:0.95', 'd nw')}
      ${at(9, 58, `We fix all of it in 4 sessions.<br>Resume, LinkedIn, intro. From ${F.single}.<br><span style="color:${STICKER}">Barkada of 3: ${F.barkada}.</span>`, `font-size:4.2mm;color:${C.ice};font-weight:600;letter-spacing:-0.015em;line-height:1.35`, 'nw')}
      ${at(9, 76, `<div style="display:flex;align-items:center;gap:5mm">${tile(46, 4, await qr(undefined, 38), 3)}<div class="d nw" style="font-size:7.6mm;color:#fff;line-height:1">Scan.<br><span style="color:${C.navy}">1 min.</span></div></div>`)}
      ${at(9, 129, `${DAYS}<br>${WHEN}`, 'font-size:3.6mm;color:#fff;font-weight:650;letter-spacing:-0.01em;line-height:1.35', 'nw')}`,
  }],
};

// 10 Sign-up sheet, A4 paper. For people who will not scan.
const COLS = [['Name', 44], ['Email', 54], ['Mobile', 28], ['Course & yr', 26], ['Full / S1–S4', 30]];
export const signup = {
  id: 'v1',
  note: 'Same fields as the site form, plus which ticket. A line at the bottom says what happens next.',
  html: () => {
    const rows = 14, rowH = 13.4, top = 76;
    const head = `<div style="display:grid;grid-template-columns:${COLS.map((c) => `${c[1]}mm`).join(' ')};background:${C.navy};color:#fff;border-radius:1.6mm 1.6mm 0 0">
      ${COLS.map((c) => `<div class="m" style="font-size:2.9mm;padding:3mm 2.4mm">${c[0]}</div>`).join('')}</div>`;
    const body = Array.from({ length: rows }, (_, r) => `<div style="display:grid;grid-template-columns:${COLS.map((c) => `${c[1]}mm`).join(' ')};height:${rowH}mm;border-bottom:0.3mm solid rgba(6,26,77,0.2);${r % 2 ? `background:${C.paper}` : ''}">
      ${COLS.map((_, i) => `<div style="border-left:${i ? '0.3mm solid rgba(6,26,77,0.12)' : 'none'}"></div>`).join('')}</div>`).join('');
    return `
      ${fill('#fff')}
      ${at(14, 14, lockup(10))}
      ${at(13, 32, 'Sign up,<br><span style="color:' + C.core + '">analog edition.</span>', `font-size:13mm;color:${C.navy};line-height:0.98`, 'd nw')}
      ${at(118, 40, 'for when the Wi-Fi<br>is being delulu', `${HAND};font-size:8mm;color:${PEN};transform:rotate(-4deg)`, 'nw')}
      ${at(14, top, head + body, 'width:182mm')}
      ${at(14, 275, `We’ll add you on the site. Watch your email for the payment link. · ${F.datesShort} · ${WHEN}`, `font-size:3mm;color:${C.ink2};font-weight:600`, 'nw')}`;
  },
};

// 11 Flyer, A6, 2 sides. Front: a joke that gets it kept. Back: all the facts and the QR.
export const flyer = {
  id: 'v1',
  note: 'Front: a joke people screenshot and send to a friend. Back: the 4 sessions, all three tickets, and the QR.',
  html: async (i) => i === 0 ? `
    <div class="fill bg-grad"></div>
    ${at(8, 9, word(8, '#fff'))}
    ${at(7.5, 27, `He’s a 10`, 'font-size:22mm;color:#fff', 'd nw')}
    ${at(8, 53, `but his resume<br>is <span style="position:relative;display:inline-block">3 pages.<span class="abs" style="left:-2mm;top:-1.2mm">${circleAround(42, 15, STICKER, 0.9)}</span></span>`, 'font-size:11.6mm;color:#fff;line-height:1.05', 'd nw')}
    ${at(52, 87, arrow(14, 10, [2, 8], [10, 1], { color: STICKER, mm: 0.7, bend: 0.3 }))}
    ${at(62, 90, 'be so fr', `${HAND};font-size:9.5mm;color:${STICKER};transform:rotate(-8deg)`, 'nw')}
    ${at(8, 110, `Delulu is not a career plan.<br><span style="background:${STICKER};color:${C.navy};padding:0.4mm 1.6mm;border-radius:1mm">Blueprint is.</span>`, 'font-size:4.6mm;color:#fff;font-weight:750;letter-spacing:-0.02em;line-height:1.5', 'nw')}
    ${at(8, 131, `${TAG} · ${F.datesShort}`, `font-size:3.5mm;color:${C.ice};font-weight:600`, 'nw')}` : `
    ${fill('#fff')}
    ${at(8, 8, `4 sessions. <span style="color:${C.core}">1 glow-up.</span>`, `font-size:7.6mm;color:${C.navy}`, 'd nw')}
    ${at(8, 20, F.sessions.map((s) => `<div style="display:grid;grid-template-columns:7mm 1fr auto;align-items:baseline;padding:1.7mm 0;border-top:0.3mm solid ${C.line}">
        <span class="m" style="font-size:2.4mm;color:${C.core}">${s.n}</span><span class="d" style="font-size:4.2mm;color:${C.navy}">${s.title}</span><span class="m" style="font-size:2.3mm;color:${C.ink3}">${s.day.replace(', ', ' ')}</span></div>`).join(''), 'width:89mm')}
    ${at(8, 57, `${WHEN}`, `font-size:3.4mm;font-weight:700;color:${C.navy}`, 'nw')}
    ${at(8, 65, `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:2mm;width:89mm">
        ${[['Full · all 4', F.full, true], ['Single · pick 1', F.single], ['Barkada · 3', F.barkada]].map(([k, v, hot]) => `<div style="${hot ? `background:${STICKER}` : `border:0.35mm solid ${C.line}`};border-radius:1.6mm;padding:2.2mm 2.4mm;color:${C.navy}"><div class="m nw" style="font-size:1.95mm;${hot ? '' : `color:${C.ink3}`}">${k}</div><div class="d nw" style="font-size:6.2mm;margin-top:0.8mm">${v}</div></div>`).join('')}</div>`)}
    ${at(8, 93, `<div style="display:flex;align-items:center;gap:4mm">${await qr(undefined, 36)}<div><div class="d nw" style="font-size:6mm;color:${C.navy};line-height:1">Scan to<br><span style="color:${C.core}">sign up.</span></div>
        <div style="${HAND};font-size:5.4mm;color:${PEN};margin-top:2mm;line-height:1">takes 1 min,<br>we timed it</div></div></div>`)}
    ${at(8, 136, word(4.4, C.navy))}
    ${at(52, 137, F.url, `font-size:2.6mm;color:${C.ink3};font-weight:600;text-align:right;width:45mm`, 'nw')}`,
};

// 15 Candy sign, A6 card, leans on the candy jar.
export const candy = {
  id: 'candy', piece: 'candy', name: 'Candy jar sign', size: 'A6, 105 × 148 mm', mm: [105, 148], pages: ['Front'],
  print: 'Card stock, 1 side. Print 2 (one spare). Tape it to the jar or lean it on the jar.',
  versions: [{
    id: 'v1',
    note: 'Yellow, like every freebie on the booth. Free candy is the oldest booth trick because it works.',
    html: () => `
      ${fill(STICKER)}
      ${at(9, 10, word(7, C.navy))}
      ${at(8, 28, 'Free<br>candy.', `font-size:27mm;color:${C.navy};line-height:0.88;font-weight:820;letter-spacing:-0.055em`, 'nw')}
      ${at(9, 84, 'for your last<br>3 brain cells<br>this sem.', `${HAND};font-size:11.5mm;color:${C.navy};line-height:0.98`, 'nw')}
      ${at(9, 130, 'Take one. Okay, two.', `font-size:4.2mm;font-weight:700;color:${C.navy};letter-spacing:-0.02em`, 'nw')}`,
  }],
};

// 16 Photo frame, 60 × 80 cm sintra with the circle cut out. A parody of a LinkedIn profile: people hold it up, take a photo, post it.
export const frame = {
  id: 'frame', piece: 'frame', name: 'Photo frame prop', size: '60 × 80 cm, 5 mm sintra, circle cut out', mm: [600, 800], pages: ['Front'],
  print: 'Cheap way (about ₱150): print it on tarp, glue it flat onto a big carton from the supermarket, and cut the circle with a cutter. Nicer way (about ₱1,100): 5 mm sintra; ask the shop to cut out the circle along the magenta dashed line (38 cm across).',
  versions: [{
    id: 'v1',
    note: 'A fake profile page with the photo circle cut out. People put their face in it. The ring says #NOTDELULU, like the open-to-work ring.',
    html: () => {
      const cx = 300, cy = 320, r = 190, ring = 46;
      const R = r + ring / 2;
      const a0 = (100 * Math.PI) / 180, a1 = (262 * Math.PI) / 180;
      const p = (a) => [cx + R * Math.cos(a), cy + R * Math.sin(a)].map((n) => n.toFixed(1)).join(' ');
      return `
      ${fill('#fff')}
      <div class="abs" style="left:0;top:0;width:600mm;height:250mm;background:${GRAD}"></div>
      ${at(36, 34, word(44, '#fff'))}
      ${at(420, 30, `<div class="m" style="font-size:13mm;color:#fff;opacity:0.85;text-align:right;width:144mm">${F.datesShort}</div>`)}
      <svg class="abs" style="left:0;top:0;width:600mm;height:800mm" viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="rg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${C.electric}"/><stop offset="1" stop-color="${C.cyan}"/></linearGradient>
          <path id="arc" d="M${p(a1)} A${R} ${R} 0 0 0 ${p(a0)}"/></defs>
        <circle cx="${cx}" cy="${cy}" r="${r + ring + 8}" fill="#fff"/>
        <path d="M${p(a0)} A${R} ${R} 0 0 1 ${p(a1)}" fill="none" stroke="url(#rg)" stroke-width="${ring}" stroke-linecap="round"/>
        <text font-family="Inter" font-weight="800" font-size="31" letter-spacing="4" fill="#fff" dy="11"><textPath href="#arc" startOffset="50%" text-anchor="middle">#NOTDELULU</textPath></text>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="#eef3fb"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ff00ff" stroke-width="1.2" stroke-dasharray="6 5"/>
        <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-family="JetBrains Mono" font-size="16" fill="#ff00ff">CUT OUT · 38 cm</text>
      </svg>
      ${at(40, 572, `<div style="display:flex;align-items:center;gap:12mm"><span class="d" style="font-size:52mm;color:${C.navy}">Main Character</span>${check(38)}</div>`, '', 'nw')}
      ${at(42, 640, 'Not delulu. Has a plan. · Blueprint ’26', `font-size:25mm;color:${C.ink};font-weight:550;letter-spacing:-0.02em`, 'nw')}
      ${at(42, 676, `Ateneo de Manila · <span style="color:${C.core};font-weight:700">500+ connections</span>`, `font-size:20mm;color:${C.ink3};font-weight:500;letter-spacing:-0.01em`, 'nw')}
      ${at(42, 716, `<div style="display:flex;gap:10mm">
          <span style="background:${C.core};color:#fff;border-radius:99mm;padding:9mm 26mm;font-size:22mm;font-weight:700;letter-spacing:-0.02em">Open to work</span>
          <span style="border:2mm solid ${C.core};color:${C.core};border-radius:99mm;padding:7mm 24mm;font-size:22mm;font-weight:700;letter-spacing:-0.02em">Sign up</span></div>`, '', 'nw')}`;
    },
  }],
};
