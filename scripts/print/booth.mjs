// Print files for /boothrender: every printed piece on the booth model, in three looks.
// Sizes in mm. `piece` is the id in boothrender/booth.js, so the list and the 3D model can find it.
// A version's html(i) returns page i. Keep the words from the live site (F in kit.mjs).
import { C, F, CLEAN as K, LOOKS, margin, grid, word, mark, lockup, qr, sampleQR, sel } from './kit.mjs';
import * as V1 from './booth-v1.mjs';

const TARP = 'Tarp. Print at 100 dpi or more. Ask the shop for a hem and grommets every 30 cm on the top edge.';
const STAND = (a) => `Paper or card stock, colour, printed at a shop (home printers leave a white edge). Slides into an ${a} acrylic stand, the same kind as Prince’s booth.`;
const PAPER = 'Paper. Print at 100% (no “fit to page”).';

const header = {
  id: 'header', piece: 'header', name: 'Header tarp', size: '1.4 m × 0.6 m', mm: [1400, 600], pages: ['Front'], print: TARP,
  versions: [
    {
      id: 'v1',
      note: 'Same layout as the model: logo on the left, the two lines on the right.',
      html: () => `
        <div class="fill bg-grad"></div>
        <div class="abs" style="left:90mm;top:130mm">${mark(340, '#fff')}</div>
        <div class="abs" style="left:392mm;top:128mm">${word(160, '#fff')}</div>
        <div class="abs" style="left:392mm;top:338mm;color:#fff;font-weight:600;font-size:76mm;letter-spacing:-0.03em;line-height:1.12">${F.tagline[0]}<br>${F.tagline[1]}</div>`,
    },
    {
      id: 'v2',
      note: 'White tarp with the site’s grid. The selection box sits on “paper.”, like the site. Logo is a sharp vector shape.',
      html: () => `
        <div class="fill bg-paper"></div>
        ${grid(1400, 600, { step: 20, major: 5 })}
        <div class="abs" style="left:70mm;top:56mm">${lockup(150, { markColor: 'grad' })}</div>
        <div class="abs d" style="left:66mm;top:262mm;font-size:116mm;color:${C.ink};line-height:1.02">
          <div class="nw">Stand out on ${sel('paper.', { size: 'W 1400 × H 600 mm' })}</div>
          <div class="nw">Stand out in <span class="g">person.</span></div>
        </div>`,
    },
    {
      id: 'v3',
      note: 'The name fills the tarp, so it reads from far down the road. Adds what it is and when.',
      html: () => `
        <div class="fill bg-navy"></div>
        ${grid(1400, 600, { step: 20, major: 5, color: C.cyan, minor: 0.04, majorOp: 0.09 })}
        <div class="abs" style="left:100mm;top:64mm">${word(300, '#fff')}</div>
        <div class="abs d nw" style="left:104mm;top:428mm;font-size:80mm;color:#fff;letter-spacing:-0.035em">Career workshop · <span class="gl">${F.dates}</span></div>`,
    },
    {
      id: 'v4',
      note: 'V1 on a white tarp. The logo and the two lines sit in one clean row, and nothing else.',
      html: () => {
        const k = K.v4, m = margin(1400, 600);
        return `
        ${flat('v4')}
        <div class="abs" style="left:${m}mm;right:${m}mm;top:${m}mm;bottom:${m}mm;display:flex;align-items:center;gap:84mm">
          ${mark(400, k.mark)}
          <div>${word(170, k.word)}
            <div class="nw" style="margin-top:44mm;font-weight:600;font-size:96mm;letter-spacing:-0.03em;line-height:1.12;color:${k.ink}">${F.tagline[0]}<br><span style="color:${k.hi}">${F.tagline[1]}</span></div>
          </div>
        </div>`;
      },
    },
    {
      id: 'v5',
      note: 'V2 on solid blue. No grid and no box: just the logo and the two lines, big.',
      html: () => {
        const k = K.v5, m = margin(1400, 600);
        return `
        ${flat('v5')}
        ${at(m, m, logo('v5', 150))}
        ${atb(m, m, `<div>${F.tagline[0]}</div><div style="color:${k.hi}">${F.tagline[1]}</div>`, `font-size:116mm;color:${k.ink};line-height:1.02`, 'd nw')}`;
      },
    },
    {
      id: 'v6',
      note: 'V3 without the grid. The name is even bigger, and the date is the one light-blue word.',
      html: () => {
        const k = K.v6, m = margin(1400, 600);
        return `
        ${flat('v6')}
        ${at(m, m, word(320, k.word))}
        ${atb(m, m, `Career workshop · <span style="color:${k.hi}">${F.dates}</span>`, `font-size:80mm;color:${k.ink};letter-spacing:-0.035em`, 'd nw')}`;
      },
    },
  ],
};

// ---------- small helpers ----------
const at = (x, y, inner, style = '', cls = '') => `<div class="abs ${cls}" style="left:${x}mm;top:${y}mm;${style}">${inner}</div>`;
const paper = (w, h, step, width) => `<div class="fill bg-paper"></div>${grid(w, h, { step, major: 5, width })}`;
const navy = (w, h, step, width) => `<div class="fill bg-navy"></div>${grid(w, h, { step, major: 5, width, color: C.cyan, minor: 0.04, majorOp: 0.09 })}`;
const white = '<div class="fill" style="background:#fff"></div>';
const gradBg = '<div class="fill bg-grad"></div>';
// a white tile that holds a QR on dark grounds
const tile = (size, pad, inner, extra = '') => `<div style="width:${size}mm;height:${size + extra}mm;padding:${pad}mm;background:#fff;border-radius:${(pad * 0.9).toFixed(1)}mm">${inner}</div>`;

// ---------- helpers for the clean looks (V4 to V6): one flat color, no grid, no box, no gradient text ----------
const flat = (v) => `<div class="fill" style="background:${K[v].bg}"></div>`;
const band = (v, w, h) => `<div class="abs" style="left:0;top:0;width:${w}mm;height:${h}mm;background:${K[v].bg}"></div>`;
const logo = (v, h) => lockup(h, { markColor: K[v].mark, wordColor: K[v].word });
// like at(), but y is the space under the block, so it sits on the bottom margin
const atb = (x, y, inner, style = '', cls = '') => `<div class="abs ${cls}" style="left:${x}mm;bottom:${y}mm;${style}">${inner}</div>`;
// a QR on a white tile as wide as the text column (w). q = QR size, py / pb = space above / below the QR.
const wide = (w, q, inner, py, pb = py) => `<div style="width:${w}mm;height:${(q + py + pb).toFixed(1)}mm;padding-top:${py}mm;display:flex;justify-content:center;background:#fff;border-radius:${Math.min(py * 0.6, 12).toFixed(1)}mm">${inner}</div>`;
// a row: text on the left, the wordmark on the right
const row = (w, left, logoHtml, style = '', cls = '') => `<div class="${cls}" style="width:${w}mm;display:flex;justify-content:space-between;align-items:flex-end;${style}"><span>${left}</span>${logoHtml}</div>`;
// the 4 sessions as rows, in plain type
const skirt = {
  id: 'skirt', piece: 'skirt', name: 'Table skirt tarp', size: '0.9 m × 0.7 m', mm: [900, 700], pages: ['Front'], print: 'Tarp. Print at 100 dpi or more. Ask for grommets in the 4 corners for the cable ties.',
  versions: [
    {
      id: 'v1',
      note: 'Same as the model: logo and what it is. The date is now Nov 10 to 13, on its own line so the text stays 6 cm tall.',
      html: () => `
        <div class="fill bg-navy"></div>
        ${grid(900, 700, { step: 70, major: 1000, color: C.ice, minor: 0.08, width: 1.5 })}
        ${at(0, 170, word(150, '#fff', 'margin:0 auto'), 'width:900mm')}
        ${at(0, 410, `Career workshop<br>${F.dates}`, `width:900mm;text-align:center;font-size:66mm;font-weight:600;letter-spacing:-0.03em;line-height:1.14;color:${C.ice}`, 'nw')}`,
    },
    {
      id: 'v2',
      note: 'The deadline is the biggest thing on it. It gives people a reason to sign up today.',
      html: () => `
        ${paper(900, 700, 20, 1)}
        ${at(66, 56, lockup(150, { markColor: 'grad' }))}
        ${at(60, 278, 'Register by', `font-size:120mm;color:${C.ink}`, 'd nw')}
        ${at(60, 410, sel('<span class="g">Nov 9.</span>', { size: 'W 900 × H 700 mm' }), `font-size:180mm;color:${C.ink}`, 'd nw')}`,
    },
    {
      id: 'v3',
      note: 'Shows the prices, like the site does now. People at the aisle know the cost before they ask.',
      html: () => `
        ${navy(900, 700, 20, 1)}
        ${at(70, 56, word(150, '#fff'))}
        ${at(64, 196, F.full, 'font-size:200mm', 'd nw gl')}
        ${at(70, 410, `all four sessions,<br>or ${F.single} a session.<br>Barkada of 3: ${F.barkada}`, 'font-size:62mm;line-height:1.14;color:#fff;font-weight:600;letter-spacing:-0.03em', 'nw')}`,
    },
    {
      id: 'v4',
      note: 'V1 on white, with the logo in the corner and the words at the bottom, so it is easy to read below the table edge.',
      html: () => {
        const k = K.v4, m = margin(900, 700);
        return `
        ${flat('v4')}
        ${at(m, m, logo('v4', 180))}
        ${atb(m, m, `<div class="d" style="font-size:96mm;color:${k.ink}">Career workshop</div>
          <div style="font-size:66mm;font-weight:600;letter-spacing:-0.03em;margin-top:26mm;color:${k.hi}">${F.dates}</div>`, '', 'nw')}`;
      },
    },
    {
      id: 'v5',
      note: 'V2 on solid blue. The deadline is still the biggest thing, now with no grid and no box.',
      html: () => {
        const k = K.v5, m = margin(900, 700);
        return `
        ${flat('v5')}
        ${at(m, m, logo('v5', 150))}
        ${atb(m, m, `<div>Register by</div><div style="font-size:180mm;color:${k.hi}">Nov 9.</div>`, `font-size:120mm;color:${k.ink};line-height:1`, 'd nw')}`;
      },
    },
    {
      id: 'v6',
      note: 'V3 without the grid. One big price in light blue, and the other two in plain lines under it.',
      html: () => {
        const k = K.v6, m = margin(900, 700);
        return `
        ${flat('v6')}
        ${at(m, m, word(150, k.word))}
        ${atb(m, m, `<div class="d" style="font-size:200mm;line-height:1;margin-bottom:26mm;color:${k.hi}">${F.full}</div><div>all four sessions,<br>or ${F.single} a session.<br>Barkada of 3: ${F.barkada}</div>`,
          `font-size:62mm;line-height:1.14;color:${k.ink};font-weight:600;letter-spacing:-0.03em`, 'nw')}`;
      },
    },
  ],
};

const regqr = {
  id: 'regqr', piece: 'regqr', name: 'Sign-up QR', size: 'A5, 148 × 210 mm', mm: [148, 210], pages: ['Front'], print: STAND('A5'),
  versions: [
    {
      id: 'v1',
      note: 'Same as the model, with a real QR to the sign-up section of the site. Test it on 2 phones before you print.',
      html: async () => `
        ${white}
        ${at(0, 15, 'Sign up', `width:148mm;text-align:center;font-size:21mm;color:${C.navy}`, 'd nw')}
        ${at(24, 50, await qr(undefined, 100))}
        ${at(0, 170, 'It takes a minute.', `width:148mm;text-align:center;font-size:10mm;font-weight:600;letter-spacing:-0.02em;color:${C.core}`, 'nw')}`,
    },
    {
      id: 'v2',
      note: 'Adds the web address under the QR, for phones that will not scan.',
      html: async () => `
        ${paper(148, 210, 5, 0.15)}
        ${at(12, 12, lockup(13))}
        ${at(11, 34, `Sign ${sel('<span class="g">up.</span>', { size: 'A5 · 148 × 210' })}`, `font-size:24mm;color:${C.ink}`, 'd nw')}
        ${at(26, 74, `<div style="padding:4mm;background:#fff;border:0.3mm solid ${C.line};border-radius:3mm">${await qr(undefined, 88)}</div>`)}
        ${at(0, 176, F.url, `width:148mm;text-align:center;font-size:4.6mm;color:${C.navy};letter-spacing:0.01em;text-transform:none`, 'm nw')}
        ${at(0, 188, `${F.regBy} · It takes a minute.`, `width:148mm;text-align:center;font-size:3.6mm;color:${C.ink3};text-transform:none;letter-spacing:0.01em`, 'm nw')}`,
    },
    {
      id: 'v3',
      note: 'Navy board with the QR on a white tile. Four words, big enough to read from the aisle.',
      html: async () => `
        ${navy(148, 210, 5, 0.15)}
        ${at(15, 14, 'Scan to<br><span class="gl">sign up.</span>', 'font-size:25mm;color:#fff;line-height:1', 'd nw')}
        ${at(20, 76, tile(108, 8, await qr(undefined, 92)))}
        ${at(0, 192, F.regBy, `width:148mm;text-align:center;font-size:7mm;font-weight:700;letter-spacing:-0.02em;color:${C.ice}`, 'nw')}`,
    },
    {
      id: 'v4',
      note: 'V1 with everything on one left edge. The QR is as wide as the card allows, so it scans faster.',
      html: async () => {
        const k = K.v4, m = margin(148, 210), cw = 148 - 2 * m;
        return `
        ${flat('v4')}
        ${at(m, m, 'Sign up', `font-size:21mm;color:${k.ink}`, 'd nw')}
        ${at(m, 44, await qr(undefined, cw))}
        ${atb(m, m, row(cw, 'It takes a minute.', word(6, k.word)), `font-size:10mm;font-weight:600;letter-spacing:-0.02em;color:${k.hi}`, 'nw')}`;
      },
    },
    {
      id: 'v5',
      note: 'V2 on solid blue. The web address is plain text now, not small code letters.',
      html: async () => {
        const k = K.v5, m = margin(148, 210), cw = 148 - 2 * m;
        return `
        ${flat('v5')}
        ${at(m, m, logo('v5', 13))}
        ${at(m, 32, `Sign <span style="color:${k.hi}">up.</span>`, `font-size:24mm;color:${k.ink}`, 'd nw')}
        ${at(m, 62, wide(cw, 92, await qr(undefined, 92), 9))}
        ${atb(m, m, `<div>${F.url}</div><div style="color:${k.sub}">${F.regBy} · It takes a minute.</div>`, `font-size:5mm;font-weight:600;letter-spacing:-0.01em;line-height:1.4;color:${k.ink}`, 'nw')}`;
      },
    },
    {
      id: 'v6',
      note: 'V3 without the grid. The white tile lines up with the words on both sides.',
      html: async () => {
        const k = K.v6, m = margin(148, 210), cw = 148 - 2 * m;
        return `
        ${flat('v6')}
        ${at(m, m, `Scan to<br><span style="color:${k.hi}">sign up.</span>`, `font-size:22mm;color:${k.ink};line-height:1`, 'd nw')}
        ${at(m, 64, wide(cw, 100, await qr(undefined, 100), 8))}
        ${atb(m, m, F.regBy, `font-size:7mm;font-weight:600;letter-spacing:-0.02em;color:${k.sub}`, 'nw')}`;
      },
    },
  ],
};

const card = {
  id: 'card', piece: 'card', name: 'Workshop card', size: 'A4, 210 × 297 mm', mm: [210, 297], pages: ['Front'], print: STAND('A4'),
  versions: [
    {
      id: 'v1',
      note: 'Same as the model, with the right facts: Nov 10 to 13, 5:30 to 7:00 PM, and “Limited seats” like the site.',
      html: () => `
        <div class="fill bg-navy"></div>
        ${at(19, 19, mark(30, '#fff'))}
        ${at(19, 66, 'Career workshop', `font-size:9.5mm;color:${C.ice};font-weight:600;text-transform:uppercase;letter-spacing:0.02em`, 'nw')}
        ${at(16, 84, 'Nov 10<br>to 13', 'font-size:48mm;color:#fff;line-height:0.95', 'd nw')}
        ${at(19, 190, `${F.days}<br>${F.time}<br>${F.room}`, 'font-size:14.5mm;color:#fff;font-weight:600;letter-spacing:-0.025em;line-height:1.38', 'nw')}
        ${at(19, 255, F.seats, `font-size:13mm;color:#fff;font-weight:700;letter-spacing:-0.025em;background:${C.electric};padding:4mm 7mm`, 'nw')}`,
    },
    {
      id: 'v2',
      note: 'Lists the 4 sessions and their days, so people can pick the ones they need.',
      html: () => `
        ${paper(210, 297, 5, 0.15)}
        ${at(16, 16, lockup(15))}
        ${at(15, 44, `4 sessions.<br>One ${sel('<span class="g">blueprint.</span>', { size: 'A4 · 210 × 297' })}`, `font-size:22mm;color:${C.ink};line-height:1.02`, 'd nw')}
        ${at(16, 106, F.sessions.map((s) => `<div style="display:grid;grid-template-columns:20mm 1fr;align-items:baseline;padding:8.4mm 0;border-top:0.5mm solid ${C.navy}">
            <span class="d g" style="font-size:13mm">${s.n}</span>
            <span><span class="d nw" style="display:block;font-size:12.5mm;color:${C.ink}">${s.title}</span>
            <span class="m" style="display:block;font-size:4.2mm;margin-top:3mm;color:${C.ink3}">${s.day}</span></span></div>`).join(''), 'width:178mm')}
        ${at(16, 262, `<span>${F.time} · ${F.room}</span><span style="color:${C.core}">${F.regBy}</span>`, `width:178mm;display:flex;justify-content:space-between;font-size:3.8mm;color:${C.navy};border-top:0.5mm solid ${C.navy};padding-top:5mm`, 'm nw')}`,
    },
    {
      id: 'v3',
      note: 'Shows the three tickets and the deadline. Big prices answer the first question people ask.',
      html: () => `
        ${navy(210, 297, 5, 0.15)}
        ${at(17, 17, mark(24, '#fff'))}
        ${at(17, 50, `Career workshop · ${F.dates}`, `font-size:4.2mm;color:${C.ice}`, 'm nw')}
        ${at(14, 62, F.full, 'font-size:44mm', 'd nw gl')}
        ${at(17, 109, F.fullLabel, 'font-size:6.5mm;color:#fff;font-weight:600;letter-spacing:-0.02em', 'nw')}
        ${at(14, 124, F.single, 'font-size:44mm;color:#fff', 'd nw')}
        ${at(17, 171, F.singleLabel, 'font-size:6.5mm;color:#fff;font-weight:600;letter-spacing:-0.02em', 'nw')}
        ${at(14, 186, F.barkada, 'font-size:44mm;color:#fff', 'd nw')}
        ${at(17, 233, F.barkadaLabel, 'font-size:6.5mm;color:#fff;font-weight:600;letter-spacing:-0.02em', 'nw')}
        ${at(17, 249, F.regBy, `font-size:9mm;font-weight:700;letter-spacing:-0.025em;color:${C.navy};background:${C.cyan};padding:3mm 6mm;border-radius:10mm`, 'nw')}
        ${at(17, 272, `${F.time} · ${F.room}`, `font-size:4.2mm;color:${C.ice}`, 'm nw')}`,
    },
    {
      id: 'v4',
      note: 'V1 on white. “Limited seats” is the one blue line now, not a blue box.',
      html: () => {
        const k = K.v4, m = margin(210, 297);
        return `
        ${flat('v4')}
        ${at(m, m, logo('v4', 14))}
        ${at(m, 66, 'Career workshop', `font-size:14.5mm;font-weight:600;letter-spacing:-0.025em;color:${k.sub}`, 'nw')}
        ${at(m, 92, 'Nov 10<br>to 13', `font-size:48mm;color:${k.ink};line-height:0.95`, 'd nw')}
        ${atb(m, m, `<div>${F.days}</div><div>${F.time}</div><div>${F.room}</div><div style="color:${k.hi};font-weight:700;margin-top:6mm">${F.seats}</div>`,
          `font-size:14.5mm;color:${k.ink};font-weight:600;letter-spacing:-0.025em;line-height:1.3`, 'nw')}`;
      },
    },
    {
      id: 'v5',
      note: 'V2 on solid blue. Same 4 sessions, in plain type with no code letters.',
      html: () => {
        const k = K.v5, m = margin(210, 297), cw = 210 - 2 * m;
        return `
        ${flat('v5')}
        ${at(m, m, logo('v5', 15))}
        ${at(m, 46, `4 sessions.<br>One <span style="color:${k.hi}">blueprint.</span>`, `font-size:22mm;color:${k.ink};line-height:1.02`, 'd nw')}
        ${at(m, 106, F.sessions.map((s) => `<div style="display:grid;grid-template-columns:22mm 1fr;align-items:baseline;padding:7.5mm 0;border-top:0.5mm solid ${k.rule}">
            <span class="d" style="font-size:12.5mm;color:${k.sub}">${s.n}</span>
            <span><span class="d nw" style="display:block;font-size:12.5mm;color:${k.ink}">${s.title}</span>
            <span class="nw" style="display:block;font-size:5.5mm;font-weight:600;margin-top:3mm;color:${k.sub}">${s.day}</span></span></div>`).join(''), `width:${cw}mm`)}
        ${atb(m, m, `<span>${F.time} · ${F.room}</span><span>${F.regBy}</span>`,
          `width:${cw}mm;display:flex;justify-content:space-between;font-size:5.5mm;font-weight:600;color:${k.ink};border-top:0.5mm solid ${k.rule};padding-top:5mm`, 'nw')}`;
      },
    },
    {
      id: 'v6',
      note: 'V3 without the grid and the pill. Three big prices, and the deadline as plain text.',
      html: () => {
        const k = K.v6, m = margin(210, 297);
        return `
        ${flat('v6')}
        ${at(m, m, word(11, k.word))}
        ${at(m, 40, `Career workshop · ${F.dates}`, `font-size:7mm;font-weight:600;letter-spacing:-0.02em;color:${k.sub}`, 'nw')}
        ${at(m, 60, `<div class="d" style="font-size:42mm;line-height:1;color:${k.hi}">${F.full}</div><div style="margin-top:4mm">${F.fullLabel}</div>
          <div class="d" style="font-size:42mm;line-height:1;margin-top:10mm">${F.single}</div><div style="margin-top:4mm">${F.singleLabel}</div>
          <div class="d" style="font-size:42mm;line-height:1;margin-top:10mm">${F.barkada}</div><div style="margin-top:4mm">${F.barkadaLabel}</div>`,
          `font-size:7mm;font-weight:600;letter-spacing:-0.02em;color:${k.ink}`, 'nw')}
        ${atb(m, m, `<div style="font-weight:700;color:${k.ink}">${F.regBy}</div><div style="color:${k.sub}">${F.time} · ${F.room}</div>`,
          'font-size:7mm;font-weight:600;letter-spacing:-0.02em;line-height:1.4', 'nw')}`;
      },
    },
  ],
};

// sign-up sheet table: fields from the site form
const FIELDS = [['Name', 52], ['Email', 58], ['Mobile', 34], ['Course & year', 38]];
// left / width move and scale the table (the columns keep their ratio). numCls / numStyle set the look of the row numbers.
const sheet = ({ top, rows, rowH, head, line, num = false, numW = 0, left = 14, width = 182, numCls = 'm', numStyle = `font-size:3mm;color:${C.ink3}` }) => {
  const k = width / 182;
  const cols = `${num ? `${numW}mm ` : ''}${FIELDS.map(([, w]) => `${+(w * k - (num ? numW / 4 : 0)).toFixed(2)}mm`).join(' ')}`;
  let r = '';
  for (let i = 0; i < rows; i++) {
    r += `<div style="display:grid;grid-template-columns:${cols};height:${rowH}mm;border-bottom:${line}">${num ? `<span class="${numCls}" style="align-self:end;padding-bottom:1.6mm;${numStyle}">${String(i + 1).padStart(2, '0')}</span>` : ''}${FIELDS.map((_, j) => `<span style="${j ? `border-left:0.25mm solid ${C.line}` : ''}"></span>`).join('')}</div>`;
  }
  return at(left, top, `<div style="display:grid;grid-template-columns:${cols};${head}">${num ? '<span>#</span>' : ''}${FIELDS.map(([f], j) => `<span style="${j ? 'padding-left:2mm' : ''}">${f}</span>`).join('')}</div>${r}`, `width:${width}mm`);
};

const signup = {
  id: 'signup', piece: 'signup', name: 'Sign-up sheet', size: 'A4, 210 × 297 mm', mm: [210, 297], pages: ['Front'], print: PAPER,
  versions: [
    {
      id: 'v1',
      note: 'Same as the model. The columns now match the site form: name, email, mobile, course and year.',
      html: () => `
        ${white}
        ${at(14, 30, 'Sign-up sheet', `font-size:15mm;color:${C.navy}`, 'd nw')}
        ${sheet({ top: 62, rows: 16, rowH: 13, head: `font-size:4.2mm;font-weight:600;color:${C.ink3};padding-bottom:3mm;border-bottom:0.4mm solid rgba(6,26,77,0.35)`, line: '0.35mm solid rgba(6,26,77,0.2)' })}`,
    },
    {
      id: 'v2',
      note: 'Numbered rows, so you can count sign-ups at a glance. 20 rows on one sheet.',
      html: () => `
        ${paper(210, 297, 5, 0.15)}
        ${at(14, 14, lockup(12))}
        ${at(14, 34, 'Sign-up sheet', `font-size:13mm;color:${C.ink}`, 'd nw')}
        ${at(14, 50, `Career workshop · ${F.dates} · ${F.room}`, `font-size:3.4mm;color:${C.core}`, 'm nw')}
        ${sheet({ top: 62, rows: 20, rowH: 10.5, num: true, numW: 10, head: `font-family:'JetBrains Mono';text-transform:uppercase;letter-spacing:0.05em;font-size:3.1mm;color:#fff;background:${C.navy};padding:2.6mm 2mm`, line: `0.3mm solid rgba(6,26,77,0.28)` })}
        ${at(14, 282, `<span>${F.url}</span><span>${F.regBy}</span>`, `width:182mm;display:flex;justify-content:space-between;font-size:3mm;color:${C.ink3};text-transform:none;letter-spacing:0.01em`, 'm nw')}`,
    },
    {
      id: 'v3',
      note: 'Bigger rows and bigger headings. Easier to write on a clipboard while standing.',
      html: () => `
        ${white}
        <div class="abs" style="left:0;top:0;width:210mm;height:62mm;background:${C.navy}"></div>
        ${at(13, 14, 'Sign <span class="gl">up.</span>', 'font-size:30mm;color:#fff', 'd nw')}
        ${at(14, 47, `${F.dates} · ${F.room}`, `font-size:3.6mm;color:${C.ice}`, 'm nw')}
        ${sheet({ top: 72, rows: 13, rowH: 16, head: `font-size:5.2mm;font-weight:700;letter-spacing:-0.02em;color:${C.navy};padding-bottom:3mm;border-bottom:0.6mm solid ${C.navy}`, line: '0.4mm solid rgba(6,26,77,0.3)' })}`,
    },
    {
      id: 'v4',
      note: 'V1 with the title and table on one left edge and a small logo. 16 big rows.',
      html: () => {
        const k = K.v4, m = margin(210, 297), cw = 210 - 2 * m;
        return `
        ${flat('v4')}
        ${at(m, m, row(cw, 'Sign-up sheet', word(6, k.word), 'align-items:center'), `font-size:15mm;color:${k.ink}`, 'd nw')}
        ${sheet({ top: 52, rows: 16, rowH: 13, left: m, width: cw, head: `font-size:4.2mm;font-weight:600;color:${C.ink3};padding-bottom:3mm;border-bottom:0.4mm solid ${C.navy}`, line: `0.35mm solid ${k.rule}` })}`;
      },
    },
    {
      id: 'v5',
      note: 'V2 with a solid blue band on top. Plain numbers and headings, no code letters, no grid. 20 rows.',
      html: () => {
        const k = K.v5, m = margin(210, 297), cw = 210 - 2 * m;
        return `
        ${white}
        ${band('v5', 210, 50)}
        ${at(m, m, row(cw, 'Sign-up sheet', word(6, k.word), 'align-items:center'), `font-size:13mm;color:${k.ink}`, 'd nw')}
        ${at(m, 36, `Career workshop · ${F.dates} · ${F.room}`, `font-size:4.2mm;font-weight:600;color:${k.sub}`, 'nw')}
        ${sheet({ top: 60, rows: 20, rowH: 10, num: true, numW: 10, left: m, width: cw, numCls: '', numStyle: `font-size:3.4mm;font-weight:600;color:${C.ink3}`,
          head: `font-size:4.2mm;font-weight:700;color:${C.core};padding-bottom:2.6mm;border-bottom:0.5mm solid ${C.core}`, line: '0.3mm solid rgba(6,26,77,0.22)' })}
        ${atb(m, m, `<span>${F.url}</span><span>${F.regBy}</span>`, `width:${cw}mm;display:flex;justify-content:space-between;font-size:4.2mm;font-weight:600;color:${C.ink3}`, 'nw')}`;
      },
    },
    {
      id: 'v6',
      note: 'V3 without the gradient. Navy band on top and 12 tall rows, easy to write in while standing.',
      html: () => {
        const k = K.v6, m = margin(210, 297), cw = 210 - 2 * m;
        return `
        ${white}
        ${band('v6', 210, 70)}
        ${at(m, m, `<span class="d" style="font-size:30mm;color:${k.ink}">Sign <span style="color:${k.hi}">up.</span></span>${word(7, k.word)}`,
          `width:${cw}mm;display:flex;justify-content:space-between;align-items:flex-start`, 'nw')}
        ${at(m, 50, `${F.dates} · ${F.room}`, `font-size:5.2mm;font-weight:600;color:${k.sub}`, 'nw')}
        ${sheet({ top: 82, rows: 12, rowH: 15.5, left: m, width: cw, head: `font-size:5.2mm;font-weight:700;letter-spacing:-0.02em;color:${C.navy};padding-bottom:3mm;border-bottom:0.6mm solid ${C.navy}`, line: '0.4mm solid rgba(6,26,77,0.3)' })}`;
      },
    },
  ],
};

// V1 is the original design, refined (booth-v1.mjs). It replaces the first version of each piece.
// The standing banner and the Red Flag Bingo card are new and have V1 only.
for (const a of [header, skirt, regqr, card, signup]) a.versions[0] = V1[a.id];

export default {
  page: 'booth',
  looks: LOOKS.map((L) => (L.id === 'v1' ? { ...L, about: 'The pick. The design on the 3D model, refined: one margin, one type scale, all three tickets. The banner and the bingo card follow it.' } : L)),
  assets: [header, skirt, V1.pullup, regqr, card, V1.bingo, signup],
};
