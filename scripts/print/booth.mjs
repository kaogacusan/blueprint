// Print files for /boothrender: every printed piece on the booth model, in three looks.
// Sizes in mm. `piece` is the id in boothrender/booth.js, so the list and the 3D model can find it.
// A version's html(i) returns page i. Keep the words from the live site (F in kit.mjs).
import { C, F, grid, word, mark, lockup, qr, sampleQR, sel } from './kit.mjs';

const TARP = 'Tarp. Print at 100 dpi or more. Ask the shop for a hem and grommets every 30 cm on the top edge.';
const SINTRA = 'Printed sintra board, 3 mm. Ask the shop to print to the edge.';
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
      note: 'Shows the price, like the site does now. People at the aisle know the cost before they ask.',
      html: () => `
        ${navy(900, 700, 20, 1)}
        ${at(70, 56, word(150, '#fff'))}
        ${at(64, 262, F.full, 'font-size:200mm', 'd nw gl')}
        ${at(70, 470, 'all four sessions,<br>or ₱699 a session', 'font-size:66mm;line-height:1.12;color:#fff;font-weight:600;letter-spacing:-0.03em', 'nw')}`,
    },
  ],
};

const banner = {
  id: 'banner', piece: 'banner', name: 'Roaming banner', size: '2 ft × 3 ft', mm: [610, 914], pages: ['Front'], print: 'Tarp. Print at 100 dpi or more. Ask for pole pockets on the left and right edges.',
  versions: [
    {
      id: 'v1',
      note: 'Same as the model. Dates and time fixed. All text is now 6 cm or more, so it reads across the road.',
      html: () => `
        ${gradBg}
        ${at(60, 56, mark(100, '#fff'))}
        ${at(60, 186, word(66, '#fff'))}
        ${at(56, 290, 'Career<br>workshop.', 'font-size:92mm;color:#fff;line-height:0.98', 'd nw')}
        ${at(60, 496, `${F.dates}<br>${F.time}<br>${F.room}`, 'font-size:56mm;color:#fff;font-weight:600;letter-spacing:-0.03em;line-height:1.12', 'nw')}
        ${at(60, 722, 'Sign up at<br>our booth →', `width:490mm;padding:16mm 26mm;background:#fff;border-radius:6mm;font-size:58mm;line-height:1.06;color:${C.core};font-weight:700;letter-spacing:-0.035em`, 'nw')}`,
    },
    {
      id: 'v2',
      note: 'Says where to go: our booth on Red Brick Road. The roamer points the way; the banner backs it up.',
      html: () => `
        ${paper(610, 914, 20, 1)}
        ${at(56, 56, lockup(100, { markColor: 'grad' }))}
        ${at(52, 228, `Sign up<br>at our<br>${sel('<span class="g">booth.</span>', { size: 'W 610 × H 914 mm' })}`, `font-size:124mm;color:${C.ink};line-height:1`, 'd nw')}
        ${at(56, 668, '<span>Red Brick Road</span><span style="font-family:Inter">→</span>', `width:498mm;display:flex;justify-content:space-between;align-items:center;font-size:60mm;font-weight:700;letter-spacing:-0.035em;color:${C.navy};border-top:1.6mm solid ${C.navy};padding-top:22mm`, 'nw')}
        ${at(56, 786, F.dates, `font-size:60mm;font-weight:600;letter-spacing:-0.03em;color:${C.ink2}`, 'nw')}`,
    },
    {
      id: 'v3',
      note: 'A big QR, so people can sign up on the spot, even before they reach the booth.',
      html: async () => `
        ${navy(610, 914, 20, 1)}
        ${at(60, 58, word(84, '#fff'))}
        ${at(54, 194, 'Scan to<br><span class="gl">sign up.</span>', 'font-size:124mm;color:#fff;line-height:1', 'd nw')}
        ${at(60, 470, tile(390, 26, await qr(undefined, 338)))}`,
    },
  ],
};

const regqr = {
  id: 'regqr', piece: 'regqr', name: 'Sign-up QR', size: 'A5, 148 × 210 mm', mm: [148, 210], pages: ['Front'], print: SINTRA,
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
  ],
};

const card = {
  id: 'card', piece: 'card', name: 'Workshop card', size: 'A4, 210 × 297 mm', mm: [210, 297], pages: ['Front'], print: SINTRA,
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
      note: 'Shows the two tickets and the deadline. Big prices answer the first question people ask.',
      html: () => `
        ${navy(210, 297, 5, 0.15)}
        ${at(17, 17, mark(24, '#fff'))}
        ${at(17, 50, `Career workshop · ${F.dates}`, `font-size:4.2mm;color:${C.ice}`, 'm nw')}
        ${at(14, 66, F.full, 'font-size:54mm', 'd nw gl')}
        ${at(17, 124, F.fullLabel, 'font-size:7mm;color:#fff;font-weight:600;letter-spacing:-0.02em', 'nw')}
        ${at(14, 150, F.single, 'font-size:54mm;color:#fff', 'd nw')}
        ${at(17, 208, F.singleLabel, 'font-size:7mm;color:#fff;font-weight:600;letter-spacing:-0.02em', 'nw')}
        ${at(17, 236, F.regBy, `font-size:9mm;font-weight:700;letter-spacing:-0.025em;color:${C.navy};background:${C.cyan};padding:3mm 6mm;border-radius:10mm`, 'nw')}
        ${at(17, 272, `${F.time} · ${F.room}`, `font-size:4.2mm;color:${C.ice}`, 'm nw')}`,
    },
  ],
};

const gcash = {
  id: 'gcash', piece: 'gcash', name: 'GCash QR', size: 'A5, 148 × 210 mm', mm: [148, 210], pages: ['Front'], print: `${SINTRA} Put our real GCash QR and account name in first.`,
  versions: [
    {
      id: 'v1',
      note: 'Same as the model. The QR is a stand-in: put the QR from our GCash app in before you print.',
      html: () => `
        ${white}
        ${at(0, 16, 'Pay with GCash', `width:148mm;text-align:center;font-size:18mm;color:${C.navy}`, 'd nw')}
        ${at(24, 50, sampleQR(100))}
        ${at(0, 172, 'Account name here', `width:148mm;text-align:center;font-size:9mm;font-weight:600;letter-spacing:-0.02em;color:${C.ink3}`, 'nw')}`,
    },
    {
      id: 'v2',
      note: 'Adds the two prices, so the buyer knows what to send. The QR is a stand-in.',
      html: () => `
        ${paper(148, 210, 5, 0.15)}
        ${at(12, 12, lockup(13))}
        ${at(11, 32, 'Pay with <span class="g">GCash.</span>', `font-size:17mm;color:${C.ink}`, 'd nw')}
        ${at(32, 58, `<div style="padding:4mm;background:#fff;border:0.3mm solid ${C.line};border-radius:3mm">${sampleQR(76)}</div>`)}
        ${at(12, 160, `<div><b class="d" style="display:block;font-size:11mm;color:${C.ink}">${F.full}</b><span class="m" style="font-size:3.2mm;color:${C.ink3}">Full Pass</span></div>
          <div><b class="d" style="display:block;font-size:11mm;color:${C.ink}">${F.single}</b><span class="m" style="font-size:3.2mm;color:${C.ink3}">Single Session</span></div>`,
          `width:124mm;display:grid;grid-template-columns:1fr 1fr;border-top:0.4mm solid ${C.navy};padding-top:4mm`)}
        ${at(12, 190, 'Account name here', `font-size:4mm;color:${C.navy}`, 'm nw')}`,
    },
    {
      id: 'v3',
      note: 'One big word, then the QR on a white tile. The QR is a stand-in.',
      html: () => `
        ${navy(148, 210, 5, 0.15)}
        ${at(14, 14, 'GCash', 'font-size:42mm', 'd nw gl')}
        ${at(20, 66, `<div style="width:108mm;padding:8mm 8mm 15mm;background:#fff;border-radius:7mm">${sampleQR(92)}</div>`)}
        ${at(0, 188, 'Account name here', 'width:148mm;text-align:center;font-size:8mm;font-weight:600;letter-spacing:-0.02em;color:#fff', 'nw')}`,
    },
  ],
};

// AAA card front: word, the prompt from the site, and lines to write on
const aaaRows = ({ top, step, size, prompt, lineGap, lines = 2, color = C.navy, ruleColor = 'rgba(6,26,77,0.25)', left = 8, width = 89 }) =>
  F.aaa.map(([w, p], i) => at(left, top + i * step, `
    <div class="d nw" style="font-size:${size}mm;color:${color}">${w}</div>
    <div class="nw" style="font-size:${prompt}mm;margin-top:1.4mm;color:${C.ink3};font-weight:500;letter-spacing:-0.01em">${p}</div>
    ${Array.from({ length: lines }, () => `<div style="margin-top:${lineGap}mm;border-top:0.35mm solid ${ruleColor}"></div>`).join('')}`, `width:${width}mm`)).join('');

const aaa = {
  id: 'aaa', piece: 'aaa', name: 'AAA try-out card', size: 'A6, 105 × 148 mm', mm: [105, 148], pages: ['Front', 'Back'], print: 'Card stock, 2 sides. Print 4 on one A4 sheet, then cut.',
  versions: [
    {
      id: 'v1',
      note: 'Same as the model. Each A now has its prompt from the site and two lines to write on. The back says when and where.',
      html: (i) => i === 0 ? `
        ${white}
        <div class="abs" style="left:0;top:0;width:105mm;height:23mm;background:${C.core}"></div>
        ${at(8, 6.5, 'AAA Card', 'font-size:11.5mm;color:#fff', 'd nw')}
        ${aaaRows({ top: 33, step: 37, size: 8.6, prompt: 3.3, lineGap: 8.4 })}` : `
        ${gradBg}
        ${at(9, 13, word(14, '#fff'))}
        ${at(9, 44, 'A hands-on<br>career workshop<br>in 4 sessions.', 'font-size:11.5mm;color:#fff;line-height:1.08', 'd nw')}
        ${at(9, 96, `${F.dates}<br>${F.time}<br>${F.room}`, 'font-size:5.4mm;color:#fff;font-weight:600;letter-spacing:-0.02em;line-height:1.3', 'nw')}
        ${at(9, 127, F.regBy, `font-size:5mm;font-weight:700;letter-spacing:-0.02em;color:${C.core};background:#fff;padding:2.2mm 3.6mm;border-radius:1.4mm`, 'nw')}`,
    },
    {
      id: 'v2',
      note: 'The grid doubles as writing lines. The back has the site’s two lines and the dates.',
      html: (i) => i === 0 ? `
        ${paper(105, 148, 5, 0.12)}
        ${at(8, 8, lockup(7))}
        ${at(8, 19, '<span class="g">AAA</span> Card', `font-size:11mm;color:${C.ink}`, 'd nw')}
        ${aaaRows({ top: 38, step: 35, size: 7.6, prompt: 3.2, lineGap: 8.6, ruleColor: 'rgba(6,70,200,0.45)' })}` : `
        ${paper(105, 148, 5, 0.12)}
        ${at(9, 9, lockup(9))}
        ${at(8, 40, `Stand out<br>on paper.<br>Stand out<br>in <span class="g">person.</span>`, `font-size:12mm;color:${C.ink};line-height:1.02`, 'd nw')}
        ${at(9, 104, `<div>${F.dates}</div><div>${F.time}</div><div>${F.room}</div><div style="color:${C.core}">${F.regBy}</div>`, `width:87mm;font-size:3.4mm;line-height:1.75;color:${C.navy};border-top:0.35mm solid ${C.navy};padding-top:3mm`, 'm nw')}`,
    },
    {
      id: 'v3',
      note: 'Bigger words to write under. The back is one big QR, so the card leads straight to sign-up.',
      html: async (i) => i === 0 ? `
        ${white}
        <div class="abs" style="left:0;top:0;width:105mm;height:34mm;background:${C.navy}"></div>
        ${at(8, 7, '<span class="gl">AAA</span>', 'font-size:22mm', 'd nw')}
        ${at(54, 13, 'Write one<br>resume bullet.', `font-size:4.6mm;color:${C.ice};font-weight:600;letter-spacing:-0.01em;line-height:1.25`, 'nw')}
        ${aaaRows({ top: 41, step: 34, size: 10, prompt: 3.4, lineGap: 7.6 })}` : `
        ${navy(105, 148, 5, 0.12)}
        ${at(9, 9, 'Scan to<br><span class="gl">sign up.</span>', 'font-size:14mm;color:#fff;line-height:1', 'd nw')}
        ${at(19.5, 43, tile(66, 6, await qr(undefined, 54)))}
        ${at(9, 120, `${F.dates} · ${F.room}<br>${F.regBy}`, `font-size:3.4mm;color:${C.ice};line-height:1.6`, 'm nw')}`,
    },
  ],
};

// sign-up sheet table: fields from the site form
const FIELDS = [['Name', 52], ['Email', 58], ['Mobile', 34], ['Course & year', 38]];
const sheet = ({ top, rows, rowH, head, line, num = false, numW = 0 }) => {
  const cols = `${num ? `${numW}mm ` : ''}${FIELDS.map(([, w]) => `${num ? w - numW / 4 : w}mm`).join(' ')}`;
  let r = '';
  for (let i = 0; i < rows; i++) {
    r += `<div style="display:grid;grid-template-columns:${cols};height:${rowH}mm;border-bottom:${line}">${num ? `<span class="m" style="align-self:end;padding-bottom:1.6mm;font-size:3mm;color:${C.ink3}">${String(i + 1).padStart(2, '0')}</span>` : ''}${FIELDS.map((_, j) => `<span style="${j ? `border-left:0.25mm solid ${C.line}` : ''}"></span>`).join('')}</div>`;
  }
  return at(14, top, `<div style="display:grid;grid-template-columns:${cols};${head}">${num ? '<span>#</span>' : ''}${FIELDS.map(([f], j) => `<span style="${j ? 'padding-left:2mm' : ''}">${f}</span>`).join('')}</div>${r}`, 'width:182mm');
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
  ],
};

// flyer back: the 4 sessions as rows
const sessionRows = ({ size, day, color = C.ink, sub = C.ink3, num = C.core, rule = C.line, pad = 2.6 }) => F.sessions.map((s) => `
  <div style="display:grid;grid-template-columns:9mm 1fr auto;align-items:baseline;padding:${pad}mm 0;border-top:0.3mm solid ${rule}">
    <span class="m" style="font-size:${day}mm;color:${num}">${s.n}</span>
    <span class="d nw" style="font-size:${size}mm;color:${color}">${s.title}</span>
    <span class="m nw" style="font-size:${day}mm;color:${sub}">${s.day}</span></div>`).join('');

const flyer = {
  id: 'flyer', piece: 'flyers', name: 'Flyer', size: 'A6, 105 × 148 mm', mm: [105, 148], pages: ['Front', 'Back'], print: 'Paper or card stock, 2 sides. Print 4 on one A4 sheet, then cut.',
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
        ${at(9, 82, `<b>${F.full}</b> all four, or <b>${F.single}</b> a session`, `font-size:3.4mm;font-weight:500;color:${C.ink2};letter-spacing:-0.01em`, 'nw')}
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
        ${at(9, 80, `<div><b class="d" style="display:block;font-size:7mm;color:${C.ink}">${F.full}</b><span class="m" style="font-size:2.4mm;color:${C.ink3}">Full Pass · all four</span></div>
          <div><b class="d" style="display:block;font-size:7mm;color:${C.ink}">${F.single}</b><span class="m" style="font-size:2.4mm;color:${C.ink3}">Single Session</span></div>`,
          `width:87mm;display:grid;grid-template-columns:1fr 1fr;border-top:0.35mm solid ${C.navy};padding-top:2.6mm`)}
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
  ],
};

export default {
  page: 'booth',
  assets: [header, backdrop, skirt, banner, regqr, card, gcash, aaa, signup, flyer],
};
