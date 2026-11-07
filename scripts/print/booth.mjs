// Print files for /boothrender: every printed piece on the booth model, in three looks.
// Sizes in mm. `piece` is the id in boothrender/booth.js, so the list and the 3D model can find it.
// A version's html(i) returns page i. Keep the words from the live site (F in kit.mjs).
import { C, F, CLEAN as K, LOOKS, margin, grid, word, mark, lockup, qr, sampleQR, sel } from './kit.mjs';
import * as V1 from './booth-v1.mjs';

const TARP = 'Tarp. Print at 100 dpi or more. Ask the shop for a hem and grommets every 30 cm on the top edge.';
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
const rows4 = ({ size, small, ink, sub, rule, pad = 2.6 }) => F.sessions.map((s) => `
  <div style="display:grid;grid-template-columns:${(small * 3).toFixed(1)}mm 1fr auto;align-items:baseline;padding:${pad}mm 0;border-top:0.3mm solid ${rule}">
    <span style="font-size:${small}mm;font-weight:600;color:${sub}">${s.n}</span>
    <span class="d nw" style="font-size:${size}mm;color:${ink}">${s.title}</span>
    <span class="nw" style="font-size:${small}mm;font-weight:600;color:${sub}">${s.day}</span></div>`).join('');
// the "Scan to sign up." back of the A6 cards (V6)
const scanBack = async (facts) => {
  const k = K.v6, m = margin(105, 148);
  return `
    ${flat('v6')}
    ${at(m, m, `Scan to<br><span style="color:${k.hi}">sign up.</span>`, `font-size:14mm;color:${k.ink};line-height:1`, 'd nw')}
    ${at(m, 42, wide(105 - 2 * m, 62, await qr(undefined, 62), 8))}
    ${atb(m, m, facts, `font-size:4.2mm;font-weight:600;color:${k.sub};line-height:1.45`, 'nw')}`;
};

const backdrop = {
  id: 'backdrop', piece: 'backdrop', name: 'Backdrop tarp', size: '1.5 m × 1.5 m', mm: [1500, 1500], pages: ['Front'], print: TARP,
  versions: [
    {
      id: 'v1',
      note: 'Same layout as the model: what Blueprint is, in big words, with the date strip at the bottom.',
      html: () => `
        <div class="fill bg-paper"></div>
        ${grid(1500, 1500, { step: 100, major: 1000, minor: 0.1, width: 1.9 })}
        ${at(112, 100, lockup(150, { markColor: 'grad' }))}
        ${at(108, 312, `<div style="color:${C.navy}">A hands-on</div><div style="color:${C.core}">career workshop.</div>`, 'font-size:140mm;line-height:0.98', 'd nw')}
        ${at(112, 700, 'Bring what you’ve already done.<br>Leave with a resume, LinkedIn,<br>and intro that show it.', `font-size:72mm;line-height:1.34;font-weight:600;letter-spacing:-0.03em;color:${C.navy}`, 'nw')}
        ${at(112, 1162, `<div style="display:flex;align-items:center;justify-content:space-between;height:100%;padding:0 52mm;color:#fff">
            <div class="d nw" style="font-size:92mm">${F.dates}</div>
            <div class="nw" style="font-size:60mm;font-weight:600;letter-spacing:-0.03em;line-height:1.12;text-align:right">${F.time}<br>${F.room}</div></div>`,
          `width:1276mm;height:200mm;background:${C.navy}`)}`,
    },
    {
      id: 'v2',
      note: 'Shows all 4 sessions and their days. Logo and headline sit at the top, above the seller’s shoulders, so they stay in view.',
      html: () => `
        ${paper(1500, 1500, 20, 1)}
        ${at(90, 80, lockup(150, { markColor: 'grad' }))}
        ${at(0, 96, '4 sessions.', `width:1410mm;text-align:right;font-size:150mm;color:${C.ink}`, 'd nw')}
        ${at(84, 268, `One ${sel('<span class="g">blueprint.</span>', { size: 'W 1500 × H 1500 mm' })}`, `font-size:150mm;color:${C.ink}`, 'd nw')}
        ${at(90, 560, `<div style="display:grid;grid-template-columns:1fr 1fr;column-gap:80mm;row-gap:70mm">
          ${F.sessions.map((s) => `<div style="border-top:1.6mm solid ${C.navy};padding-top:26mm">
            <div class="m" style="font-size:60mm;color:${C.electric};letter-spacing:0.02em">${s.n}</div>
            <div class="d nw" style="font-size:86mm;margin-top:16mm;color:${C.ink}">${s.title}</div>
            <div class="m" style="font-size:60mm;margin-top:18mm;color:${C.ink2};letter-spacing:0.02em">${s.day}</div></div>`).join('')}
          </div>`, 'width:1320mm')}
        ${at(90, 1300, `<span>${F.time} · ${F.room}</span><span class="g" style="font-weight:700">${F.regBy}</span>`,
          `width:1320mm;display:flex;justify-content:space-between;font-size:62mm;font-weight:600;letter-spacing:-0.03em;color:${C.navy}`, 'nw')}`,
    },
    {
      id: 'v3',
      note: 'A 37 cm QR to the sign-up page. People can scan it from the aisle, about 3 m away, without walking in.',
      html: async () => `
        ${navy(1500, 1500, 20, 1)}
        ${at(100, 100, word(130, '#fff'))}
        ${at(94, 330, 'Scan to<br><span class="gl">sign up.</span>', 'font-size:200mm;color:#fff;line-height:1', 'd nw')}
        ${at(970, 100, tile(430, 30, await qr(undefined, 370)))}
        ${at(94, 890, F.dates, 'font-size:190mm', 'd nw gl')}
        ${at(100, 1120, `${F.time} · ${F.room}`, 'font-size:66mm;color:#fff;font-weight:600;letter-spacing:-0.03em', 'nw')}
        ${at(100, 1262, F.regBy, `font-size:66mm;font-weight:700;letter-spacing:-0.03em;color:${C.navy};background:${C.cyan};padding:18mm 34mm;border-radius:60mm`, 'nw')}`,
    },
    {
      id: 'v4',
      note: 'V1 on white. The navy date strip is now a plain line of text under a thin rule.',
      html: () => {
        const k = K.v4, m = margin(1500, 1500);
        return `
        ${flat('v4')}
        ${at(m, m, logo('v4', 150))}
        ${at(m, 360, `<div>A hands-on</div><div style="color:${k.hi}">career workshop.</div>`, `font-size:140mm;line-height:0.98;color:${k.ink}`, 'd nw')}
        ${at(m, 720, 'Bring what you’ve already done.<br>Leave with a resume, LinkedIn,<br>and intro that show it.', `font-size:72mm;line-height:1.3;font-weight:500;letter-spacing:-0.025em;color:${k.sub}`, 'nw')}
        ${atb(m, m, `<div style="font-weight:700;color:${k.ink}">${F.dates}</div><div style="color:${k.sub}">${F.time} · ${F.room}</div>`,
          `width:${1500 - 2 * m}mm;border-top:1.6mm solid ${k.rule};padding-top:40mm;font-size:72mm;font-weight:600;letter-spacing:-0.03em;line-height:1.25`, 'nw')}`;
      },
    },
    {
      id: 'v5',
      note: 'V2 on solid blue. Same 4 sessions, but no grid and no box, and every line starts on one edge.',
      html: () => {
        const k = K.v5, m = margin(1500, 1500);
        return `
        ${flat('v5')}
        ${at(m, m, logo('v5', 150))}
        ${at(m, 340, `<div>4 sessions.</div><div>One <span style="color:${k.hi}">blueprint.</span></div>`, `font-size:150mm;line-height:1;color:${k.ink}`, 'd nw')}
        ${at(m, 690, `<div style="display:grid;grid-template-columns:1fr 1fr;column-gap:80mm;row-gap:50mm">
          ${F.sessions.map((s) => `<div style="border-top:1.6mm solid ${k.rule};padding-top:24mm">
            <div class="nw" style="font-size:60mm;font-weight:600;letter-spacing:-0.02em;color:${k.sub}">${s.n} · ${s.day}</div>
            <div class="d nw" style="font-size:86mm;margin-top:14mm;color:${k.ink}">${s.title}</div></div>`).join('')}
          </div>`, `width:${1500 - 2 * m}mm`)}
        ${atb(m, m, `<div>${F.time} · ${F.room}</div><div style="color:${k.sub}">${F.regBy}</div>`,
          `font-size:60mm;font-weight:600;letter-spacing:-0.03em;line-height:1.25;color:${k.ink}`, 'nw')}`;
      },
    },
    {
      id: 'v6',
      note: 'V3 without the grid and the pill. The QR is still 37 cm, so people can scan it from the aisle.',
      html: async () => {
        const k = K.v6, m = margin(1500, 1500);
        return `
        ${flat('v6')}
        ${at(m, m, word(130, k.word))}
        ${at(1500 - m - 430, m, wide(430, 370, await qr(undefined, 370), 30))}
        ${at(m, 330, `Scan to<br><span style="color:${k.hi}">sign up.</span>`, `font-size:190mm;color:${k.ink};line-height:1`, 'd nw')}
        ${atb(m, m, `<div class="d" style="font-size:190mm;line-height:1;margin-bottom:44mm;color:${k.ink}">${F.dates}</div>
          <div style="color:${k.sub}">${F.time} · ${F.room}</div><div style="color:${k.ink}">${F.regBy}</div>`,
          'font-size:66mm;font-weight:600;letter-spacing:-0.03em;line-height:1.3', 'nw')}`;
      },
    },
  ],
};

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

// flyer back: the 4 sessions as rows
const sessionRows = ({ size, day, color = C.ink, sub = C.ink3, num = C.core, rule = C.line, pad = 2.6 }) => F.sessions.map((s) => `
  <div style="display:grid;grid-template-columns:9mm 1fr auto;align-items:baseline;padding:${pad}mm 0;border-top:0.3mm solid ${rule}">
    <span class="m" style="font-size:${day}mm;color:${num}">${s.n}</span>
    <span class="d nw" style="font-size:${size}mm;color:${color}">${s.title}</span>
    <span class="m nw" style="font-size:${day}mm;color:${sub}">${s.day}</span></div>`).join('');

const flyer = {
  id: 'flyer', piece: 'flyers', name: 'Flyer', size: 'A6, 105 × 148 mm, 2 sides', mm: [105, 148], bleed: 3, pages: ['Front', 'Back'],
  print: 'Print shop: A6, colour, both sides, 120–160 gsm, 100 pcs. The PDF has 3 mm bleed on every side: the shop prints 4 per A4 and trims to 105 × 148.',
  versions: [
    {
      id: 'v1',
      note: 'Same front as the model, dates fixed. The back lists the 4 sessions, the prices, and a QR to sign up.',
      html: async (i) => i === 0 ? `
        ${gradBg}
        ${at(9, 13, word(15, '#fff'))}
        ${at(8.4, 50, 'A hands-on<br>career<br>workshop.', 'font-size:14mm;color:#fff;line-height:1.08', 'd nw')}
        ${at(9, 118, `${F.dates}<br>${F.room}`, 'font-size:7mm;color:#fff;font-weight:600;letter-spacing:-0.02em;line-height:1.28', 'nw')}` : `
        ${white}
        ${at(9, 10, '4 sessions.', `font-size:10mm;color:${C.navy}`, 'd nw')}
        ${at(9, 25, sessionRows({ size: 4.6, day: 2.7 }), 'width:87mm')}
        ${at(9, 74, `${F.time} · ${F.room}`, `font-size:3.4mm;font-weight:600;color:${C.navy};letter-spacing:-0.01em`, 'nw')}
        ${at(9, 81, `<b>${F.full}</b> all four, or <b>${F.single}</b> a session<br><b>${F.barkada}</b> for a barkada of 3`, `font-size:3.4mm;font-weight:500;line-height:1.55;color:${C.ink2};letter-spacing:-0.01em`, 'nw')}
        ${at(9, 103, await qr(undefined, 34))}
        ${at(49, 106, `Scan to<br>sign up.`, `font-size:7.4mm;color:${C.core};line-height:1`, 'd nw')}
        ${at(49, 125, `${F.regBy}`, `font-size:3.2mm;font-weight:600;color:${C.navy}`, 'nw')}`,
    },
    {
      id: 'v2',
      note: 'The site’s two lines with the selection box on the front. Back: sessions, prices, and the web address.',
      html: async (i) => i === 0 ? `
        ${paper(105, 148, 5, 0.12)}
        ${at(9, 9, lockup(9))}
        ${at(8, 42, `Stand out<br>on paper.<br>Stand out<br>in ${sel('<span class="g">person.</span>', { size: 'A6 · 105 × 148' })}`, `font-size:13.5mm;color:${C.ink};line-height:1.02`, 'd nw')}
        ${at(9, 122, `<div>${F.dates} · ${F.time}</div><div>${F.room}</div>`, `width:87mm;font-size:3.1mm;line-height:1.6;color:${C.navy};border-top:0.35mm solid ${C.navy};padding-top:2.4mm`, 'm nw')}` : `
        ${paper(105, 148, 5, 0.12)}
        ${at(9, 9, '4 sessions.<br>One <span class="g">blueprint.</span>', `font-size:9mm;color:${C.ink};line-height:1.04`, 'd nw')}
        ${at(9, 31, sessionRows({ size: 4.4, day: 2.6, num: C.electric, rule: C.navy }), 'width:87mm')}
        ${at(9, 80, `<div><b class="d" style="display:block;font-size:6mm;color:${C.ink}">${F.full}</b><span class="m" style="font-size:2.2mm;color:${C.ink3}">Full Pass</span></div>
          <div><b class="d" style="display:block;font-size:6mm;color:${C.ink}">${F.single}</b><span class="m" style="font-size:2.2mm;color:${C.ink3}">One session</span></div>
          <div><b class="d" style="display:block;font-size:6mm;color:${C.ink}">${F.barkada}</b><span class="m" style="font-size:2.2mm;color:${C.ink3}">Barkada of 3</span></div>`,
          `width:87mm;display:grid;grid-template-columns:1fr 1fr 1fr;border-top:0.35mm solid ${C.navy};padding-top:2.6mm`)}
        ${at(9, 104, `<div style="padding:1.6mm;background:#fff;border:0.25mm solid ${C.line};border-radius:1.4mm">${await qr(undefined, 28)}</div>`)}
        ${at(44, 107, `<div class="d" style="font-size:6mm;color:${C.ink};line-height:1.05">Sign up<br>in a minute.</div>
          <div class="m" style="font-size:2.3mm;margin-top:3mm;color:${C.navy};text-transform:none;letter-spacing:0">${F.url}</div>
          <div class="m" style="font-size:2.3mm;margin-top:1.2mm;color:${C.core}">${F.regBy}</div>`)}`,
    },
    {
      id: 'v3',
      note: 'Fewest words, biggest type. The back is a QR plus the dates, nothing else.',
      html: async (i) => i === 0 ? `
        ${navy(105, 148, 5, 0.12)}
        ${at(9, 10, word(10, '#fff'))}
        ${at(8, 36, `Stand out<br><span class="gl">on paper.</span><br>Stand out<br><span class="gl">in person.</span>`, 'font-size:16mm;color:#fff;line-height:0.98', 'd nw')}
        ${at(9, 117, F.dates, 'font-size:9mm;color:#fff', 'd nw')}
        ${at(9, 129, F.room, `font-size:3.2mm;color:${C.ice}`, 'm nw')}` : `
        ${navy(105, 148, 5, 0.12)}
        ${at(9, 9, 'Scan to<br><span class="gl">sign up.</span>', 'font-size:14mm;color:#fff;line-height:1', 'd nw')}
        ${at(19.5, 43, tile(66, 6, await qr(undefined, 54)))}
        ${at(9, 118, `${F.dates} · ${F.time}<br>${F.room} · ${F.regBy}`, `font-size:3mm;color:${C.ice};line-height:1.6`, 'm nw')}`,
    },
    {
      id: 'v4',
      note: 'V1 on white. The back keeps the sessions, prices, and QR, with plain numbers and one left edge.',
      html: async (i) => {
        const k = K.v4, m = margin(105, 148), cw = 105 - 2 * m;
        return i === 0 ? `
        ${flat('v4')}
        ${at(m, m, logo('v4', 9))}
        ${at(m, 44, `A hands-on<br>career<br><span style="color:${k.hi}">workshop.</span>`, `font-size:14mm;color:${k.ink};line-height:1.06`, 'd nw')}
        ${atb(m, m, `${F.dates}<br>${F.room}`, `font-size:7mm;color:${k.ink};font-weight:600;letter-spacing:-0.02em;line-height:1.28`, 'nw')}` : `
        ${flat('v4')}
        ${at(m, m, '4 sessions.', `font-size:10mm;color:${k.ink}`, 'd nw')}
        ${at(m, 24, rows4({ size: 4.6, small: 3.4, ink: k.ink, sub: k.sub, rule: k.rule }), `width:${cw}mm`)}
        ${at(m, 70, `<div>${F.time} · ${F.room}</div><div style="color:${k.sub}"><b style="color:${k.ink}">${F.full}</b> all four, or <b style="color:${k.ink}">${F.single}</b> a session</div><div style="color:${k.sub}"><b style="color:${k.ink}">${F.barkada}</b> for a barkada of 3</div>`,
          `font-size:3.4mm;font-weight:600;line-height:1.6;color:${k.ink}`, 'nw')}
        ${atb(m, m, `${await qr(undefined, 34)}<div><div class="d" style="font-size:10mm;line-height:1;color:${k.hi}">Scan to<br>sign up.</div>
          <div style="margin-top:3mm;font-size:3.4mm;font-weight:600;color:${k.ink}">${F.regBy}</div></div>`, 'display:flex;align-items:flex-end;gap:6mm', 'nw')}`;
      },
    },
    {
      id: 'v5',
      note: 'V2 on solid blue, both sides. No grid and no box; the web address is plain text.',
      html: async (i) => {
        const k = K.v5, m = margin(105, 148), cw = 105 - 2 * m;
        return i === 0 ? `
        ${flat('v5')}
        ${at(m, m, logo('v5', 9))}
        ${at(m, 36, `Stand out<br>on paper.<br>Stand out<br><span style="color:${k.hi}">in person.</span>`, `font-size:13.5mm;color:${k.ink};line-height:1.02`, 'd nw')}
        ${atb(m, m, `<div>${F.dates} · ${F.time}</div><div>${F.room}</div>`,
          `width:${cw}mm;border-top:0.35mm solid ${k.rule};padding-top:2.6mm;font-size:3.6mm;font-weight:600;line-height:1.5;color:${k.ink}`, 'nw')}` : `
        ${flat('v5')}
        ${at(m, m, `4 sessions.<br>One <span style="color:${k.hi}">blueprint.</span>`, `font-size:9mm;color:${k.ink};line-height:1.04`, 'd nw')}
        ${at(m, 30, rows4({ size: 4.4, small: 3, ink: k.ink, sub: k.sub, rule: k.rule }), `width:${cw}mm`)}
        ${at(m, 76, `<div><b class="d" style="display:block;font-size:7mm">${F.full}</b><span style="color:${k.sub}">Full Pass</span></div>
          <div><b class="d" style="display:block;font-size:7mm">${F.single}</b><span style="color:${k.sub}">One session</span></div>
          <div><b class="d" style="display:block;font-size:7mm">${F.barkada}</b><span style="color:${k.sub}">Barkada of 3</span></div>`,
          `width:${cw}mm;display:grid;grid-template-columns:1fr 1fr 1fr;border-top:0.3mm solid ${k.rule};padding-top:3mm;font-size:3mm;font-weight:600;color:${k.ink}`)}
        ${atb(m, m, `${wide(34, 28, await qr(undefined, 28), 3)}<div><div class="d" style="font-size:4.4mm;line-height:1.1">Sign up<br>in a minute.</div>
          <div style="margin-top:2.4mm;color:${k.sub}">${F.url}</div><div style="color:${k.sub}">${F.regBy}</div></div>`,
          `display:flex;align-items:flex-end;gap:5mm;font-size:3mm;font-weight:600;line-height:1.4;color:${k.ink}`, 'nw')}`;
      },
    },
    {
      id: 'v6',
      note: 'V3 without the grid. One light-blue line on the front; the back is a QR and the dates.',
      html: async (i) => {
        const k = K.v6, m = margin(105, 148);
        return i === 0 ? `
        ${flat('v6')}
        ${at(m, m, word(10, k.word))}
        ${at(m, 34, `Stand out<br>on paper.<br>Stand out<br><span style="color:${k.hi}">in person.</span>`, `font-size:16mm;color:${k.ink};line-height:0.98`, 'd nw')}
        ${atb(m, m, `<div class="d" style="font-size:9mm;color:${k.ink}">${F.dates}</div><div style="margin-top:2.4mm;font-size:4.2mm;font-weight:600;color:${k.sub}">${F.room}</div>`, '', 'nw')}` : scanBack(`${F.dates} · ${F.time}<br>${F.room} · ${F.regBy}`);
      },
    },
  ],
};

// V1 is the original design, refined (booth-v1.mjs). It replaces the first version of each piece.
// The standing banner, the sign-up QR (A4 now), the calling card and the bingo card are V1 only.
for (const a of [header, backdrop, skirt, signup, flyer]) a.versions[0] = V1[a.id];

export default {
  page: 'booth',
  looks: LOOKS.map((L) => (L.id === 'v1' ? { ...L, about: 'The pick. The design on the 3D model, refined: one margin, one type scale, all three tickets. The banner and the bingo card follow it.' } : L)),
  assets: [header, backdrop, skirt, V1.pullup, V1.card, flyer, V1.regqr, V1.bingo, signup],
};
