// Print files for /venuerender: every printed piece in FA Annex 104 and the hallway, in six looks.
// V4 to V6 (at the bottom) are V1 to V3 cleaned up: same words, no grid, no box, one margin.
// Sizes in mm. `piece` is the id in venuerender/venue.js, so the list and the 3D model can find it.
// A version's html(i) returns page i. Keep the words from the live site (F in kit.mjs).
import { C, F, CLEAN, margin, grid, word, mark, lockup, sampleQR, sel } from './kit.mjs';

const PAPER = 'Paper. Print at 100% (no “fit to page”).';
const WELCOME = 'Welcome to Blueprint. Find your group number on your name tag.';
const navyGrid = (w, h, step = 10) => grid(w, h, { step, major: 5, color: C.cyan, minor: 0.04, majorOp: 0.09 });

// A solid arrow drawn as a shape. dir: 'right' | 'left' | 'up' | 'down'. w × h in mm (the box it fills).
function arrow(dir, w, h, color) {
  const horiz = dir === 'right' || dir === 'left';
  const L = horiz ? w : h, T = horiz ? h : w;   // length along the arrow, thickness across it
  const sw = T * 0.07, m = sw / 2;               // round the corners with a same-color stroke
  const s = T * 0.38, hl = Math.min(L * 0.5, T * 0.62);
  const a = [[m, (T - s) / 2], [L - hl, (T - s) / 2], [L - hl, m], [L - m, T / 2], [L - hl, T - m], [L - hl, (T + s) / 2], [m, (T + s) / 2]];
  const map = {
    right: ([x, y]) => [x, y],
    left: ([x, y]) => [L - x, y],
    down: ([x, y]) => [y, x],
    up: ([x, y]) => [y, L - x],
  }[dir];
  const pts = a.map(map).map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  return `<svg class="lg" style="width:${w}mm;height:${h}mm" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><polygon points="${pts}" fill="${color}" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round"/></svg>`;
}
const DIRS = ['right', 'left', 'up'];

// ---------- 1 direction signs (A4 landscape, 3 arrows) ----------
const signs = {
  id: 'signs', piece: 'signs', name: 'Direction signs', size: 'A4 landscape, 297 × 210 mm', mm: [297, 210],
  pages: ['Arrow right', 'Arrow left', 'Arrow up'], print: `${PAPER} Print 2 of each arrow.`,
  versions: [
    {
      id: 'v1',
      note: 'Same as the model: a blue arrow, the name, and the room. Now with a left and an up arrow too.',
      html: (i) => `
        <div class="fill" style="background:#fff"></div>
        <div class="abs" style="left:18mm;top:18mm">${arrow(DIRS[i], DIRS[i] === 'up' ? 64 : 104, DIRS[i] === 'up' ? 86 : 72, C.core)}</div>
        <div class="abs" style="left:18mm;top:124mm">${word(24, C.navy)}</div>
        <div class="abs d nw" style="left:17mm;top:160mm;font-size:30mm;color:${C.navy};letter-spacing:-0.035em">${F.room}</div>`,
    },
    {
      id: 'v2',
      note: 'The room number is now the biggest thing, since that is what people look for. The arrow sits in a circle on the side you walk to.',
      html: (i) => {
        const left = DIRS[i] === 'left';
        const circle = `<div class="abs" style="${left ? 'left' : 'right'}:18mm;top:50mm;width:110mm;height:110mm;border-radius:50%;background:${C.navy};display:flex;align-items:center;justify-content:center">
          ${arrow(DIRS[i], DIRS[i] === 'up' ? 48 : 66, DIRS[i] === 'up' ? 66 : 48, '#fff')}</div>`;
        const side = left ? 'right:18mm;text-align:right;align-items:flex-end' : 'left:20mm;align-items:flex-start';
        return `
        <div class="fill bg-paper"></div>
        ${grid(297, 210, { step: 10, major: 5 })}
        <div class="abs" style="${left ? 'right' : 'left'}:20mm;top:18mm">${lockup(15)}</div>
        ${circle}
        <div class="abs" style="${side};top:62mm;display:flex;flex-direction:column">
          <div class="m" style="font-size:5mm;color:${C.core};margin-bottom:5mm">Career workshop</div>
          <div class="d nw" style="font-size:30mm;color:${C.ink};letter-spacing:-0.035em">FA Annex</div>
          <div class="d nw" style="font-size:84mm;line-height:0.9;margin-top:4mm;color:${C.ink}">${sel('<span class="g">104</span>')}</div>
        </div>`;
      },
    },
    {
      id: 'v3',
      note: 'One big white arrow and the room, nothing else. Reads from the far end of the hallway.',
      html: (i) => {
        const d = DIRS[i];
        const a = d === 'up'
          ? `<div class="abs" style="left:18mm;top:16mm">${arrow('up', 92, 112, '#fff')}</div>`
          : `<div class="abs" style="${d === 'left' ? 'right' : 'left'}:18mm;top:20mm">${arrow(d, 200, 104, '#fff')}</div>`;
        return `
        <div class="fill bg-navy"></div>
        ${navyGrid(297, 210)}
        ${a}
        <div class="abs" style="${d === 'left' ? 'left' : 'right'}:18mm;top:${d === 'up' ? 22 : 20}mm">${word(12, '#fff')}</div>
        <div class="abs d nw" style="left:17mm;bottom:16mm;font-size:46mm;color:#fff;letter-spacing:-0.04em">FA Annex <span class="gl">104</span></div>`;
      },
    },
  ],
};

// ---------- 2 pull-up banner (850 × 2000, bottom 100 mm in the stand) ----------
const banner = {
  id: 'banner', piece: 'banner', name: 'Pull-up banner', size: '0.85 m × 2 m', mm: [850, 2000], pages: ['Front'],
  print: 'Pull-up banner print. 100 dpi or more. The bottom 10 cm goes into the stand.',
  versions: [
    {
      id: 'v1',
      note: 'Same layout as the model. Dates and time now match the site: Nov 10 to 13, 5:30 to 7:00 PM.',
      html: () => `
        <div class="fill bg-grad"></div>
        <div class="abs" style="left:88mm;top:120mm">${mark(220, '#fff')}</div>
        <div class="abs" style="left:88mm;top:420mm">${word(110, '#fff')}</div>
        <div class="abs d" style="left:86mm;top:650mm;font-size:118mm;color:#fff;line-height:1.08">Stand out<br>on paper.<br>Stand out<br>in person.</div>
        <div class="abs" style="left:88mm;top:1270mm;font-weight:600;font-size:52mm;line-height:1.35;letter-spacing:-0.025em;color:#e6f4ff">Career workshop<br>${F.dates}<br>${F.time}<br>${F.room}</div>
        <div class="abs" style="left:88mm;right:88mm;top:1700mm;height:150mm;background:#fff;border-radius:10mm;display:flex;align-items:center;gap:22mm;padding:0 48mm">
          <span class="d nw" style="font-size:60mm;color:${C.core};letter-spacing:-0.035em">Sign in here</span>${arrow('right', 70, 50, C.core)}
        </div>`,
    },
    {
      id: 'v2',
      note: 'Headline sits at eye level. No “Sign in here”, so it still works when it moves inside by the screen. The four sessions fill the middle. The bottom stays clear for the stand.',
      html: () => `
        <div class="fill bg-paper"></div>
        ${grid(850, 2000, { step: 25, major: 4 })}
        <div class="abs" style="left:80mm;top:110mm">${lockup(150, { markColor: 'grad' })}</div>
        <div class="abs m" style="left:84mm;top:345mm;font-size:18mm;color:${C.core}">Career workshop · 4 sessions</div>
        <div class="abs d" style="left:76mm;top:410mm;font-size:150mm;color:${C.ink};line-height:1">
          <div class="nw">Stand out</div>
          <div class="nw">on ${sel('paper.', { size: 'W 850 × H 2000 mm' })}</div>
          <div class="nw" style="margin-top:34mm">Stand out</div>
          <div class="nw">in <span class="g">person.</span></div>
        </div>
        <div class="abs" style="left:80mm;right:80mm;top:1110mm">
          <div class="d nw" style="font-size:52mm;color:${C.navy};letter-spacing:-0.035em">${F.dates} · ${F.room}</div>
          <div class="t nw" style="font-size:34mm;color:${C.ink2};margin-top:12mm">${F.time}</div>
        </div>
        <div class="abs" style="left:80mm;right:80mm;top:1310mm;color:${C.navy}">
          ${F.sessions.map((s) => `
          <div style="display:flex;align-items:center;gap:22mm;padding:15mm 0;border-top:0.6mm solid ${C.line}">
            <span class="d g" style="font-size:66mm;width:90mm">${s.n}</span>
            <span style="display:flex;flex-direction:column;gap:5mm">
              <span class="d nw" style="font-size:50mm;letter-spacing:-0.035em">${s.title}</span>
              <span class="m" style="font-size:15mm;color:${C.ink3}">${s.day}</span>
            </span>
          </div>`).join('')}
        </div>`,
    },
    {
      id: 'v3',
      note: 'Logo at the top, above head height, so it shows in group photos at the photo spot. Fewer words, bigger type.',
      html: () => `
        <div class="fill bg-navy"></div>
        ${navyGrid(850, 2000, 25)}
        <div class="abs" style="left:80mm;top:100mm">${lockup(190, { markColor: '#fff', wordColor: '#fff' })}</div>
        <div class="abs d" style="left:74mm;top:460mm;font-size:166mm;color:#fff;line-height:1.02">
          <div class="nw">Stand out</div><div class="nw gl">on paper.</div>
          <div class="nw" style="margin-top:16mm">Stand out</div><div class="nw gl">in person.</div>
        </div>
        <div class="abs" style="left:80mm;top:1300mm;width:690mm;border-top:0.8mm solid rgba(185,238,255,0.35);padding-top:50mm">
          <div class="m" style="font-size:20mm;color:${C.cyan}">Career workshop</div>
          <div class="d nw" style="font-size:112mm;color:#fff;margin-top:18mm;letter-spacing:-0.04em">${F.dates}</div>
          <div class="d nw" style="font-size:72mm;color:${C.ice};margin-top:18mm;letter-spacing:-0.035em">${F.room}</div>
          <div class="t nw" style="font-size:46mm;font-weight:600;color:${C.ice};opacity:0.8;margin-top:16mm">${F.time}</div>
        </div>`,
    },
  ],
};

// ---------- 3 sign-in QR (A5 standing card) ----------
const signinqr = {
  id: 'signinqr', piece: 'signin', name: 'Sign-in QR', size: 'A5, 148 × 210 mm', mm: [148, 210], pages: ['Front'],
  print: `${PAPER} Put the real sign-in form QR in first.`,
  versions: [
    {
      id: 'v1',
      note: 'Same as the model. The QR is a stand-in until we have the sign-in form link.',
      html: () => `
        <div class="fill" style="background:#fff"></div>
        <div class="abs d nw" style="left:0;right:0;top:16mm;text-align:center;font-size:20mm;color:${C.navy}">Sign in</div>
        <div class="abs" style="left:24mm;top:50mm">${sampleQR(100, { seed: 5 })}</div>
        <div class="abs nw" style="left:0;right:0;top:176mm;text-align:center;font-weight:600;font-size:8.5mm;letter-spacing:-0.015em;color:${C.core}">Scan, then get your kit</div>`,
    },
    {
      id: 'v2',
      note: 'Grid paper and the logo at the top, so the card matches the banner. The QR sits on a white card with a clear edge.',
      html: () => `
        <div class="fill bg-paper"></div>
        ${grid(148, 210, { step: 10, major: 5 })}
        <div class="abs" style="left:14mm;top:14mm">${lockup(12)}</div>
        <div class="abs d nw" style="left:13mm;top:38mm;font-size:30mm;color:${C.ink}">Sign <span class="g">in</span></div>
        <div class="abs" style="left:24mm;top:76mm;width:100mm;height:100mm;background:#fff;border:0.4mm solid ${C.line};border-radius:4mm;display:flex;align-items:center;justify-content:center">${sampleQR(84, { seed: 5 })}</div>
        <div class="abs t nw" style="left:14mm;top:188mm;font-size:7.5mm;font-weight:600;color:${C.navy}">Scan, then get your kit.</div>`,
    },
    {
      id: 'v3',
      note: 'Navy card with the QR on a white tile. The big “Sign in” reads from across the hallway.',
      html: () => `
        <div class="fill bg-navy"></div>
        ${navyGrid(148, 210)}
        <div class="abs d nw" style="left:11mm;top:14mm;font-size:42mm;color:#fff">Sign <span class="gl">in</span></div>
        <div class="abs" style="left:19mm;top:66mm;width:110mm;height:110mm;background:#fff;border-radius:5mm;display:flex;align-items:center;justify-content:center">${sampleQR(88, { seed: 5 })}</div>
        <div class="abs t nw" style="left:0;right:0;top:186mm;text-align:center;font-size:8mm;font-weight:600;color:${C.ice}">Scan, then get your kit.</div>`,
    },
  ],
};

// ---------- 4 name tags (A4, 8 tags of 90 × 60) ----------
const TAG = { w: 90, h: 60, x0: 15, y0: 28.5 };
function tagSheet(tag, { cut = 'rgba(6,26,77,0.28)', bg = '#fff' } = {}) {
  let out = `<div class="fill" style="background:${bg}"></div>`;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) {
    out += `<div class="abs" style="left:${TAG.x0 + c * TAG.w}mm;top:${TAG.y0 + r * TAG.h}mm;width:${TAG.w}mm;height:${TAG.h}mm;overflow:hidden">${tag}</div>`;
  }
  // cut lines run edge to edge
  const xs = [0, 1, 2].map((c) => TAG.x0 + c * TAG.w), ys = [0, 1, 2, 3, 4].map((r) => TAG.y0 + r * TAG.h);
  out += `<svg class="fill" viewBox="0 0 210 297" xmlns="http://www.w3.org/2000/svg"><g stroke="${cut}" stroke-width="0.25" stroke-dasharray="2 1.5">
    ${xs.map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="297"/>`).join('')}${ys.map((y) => `<line x1="0" y1="${y}" x2="210" y2="${y}"/>`).join('')}</g></svg>`;
  out += `<div class="abs m" style="left:15mm;top:16mm;font-size:3mm;color:${C.ink3}">Name tags · cut on the dashed lines</div>`;
  return out;
}
const nametags = {
  id: 'nametags', piece: 'signin', name: 'Name tags', size: 'A4 sheet, 8 tags of 90 × 60 mm', mm: [210, 297], pages: ['Sheet'],
  print: `${PAPER} Card stock is best. Print 4 sheets for 30 tags, then cut.`,
  versions: [
    {
      id: 'v1',
      note: 'A plain tag in the model’s style: a blue band with the logo, a line for the name, a box for the group.',
      html: () => tagSheet(`
        <div class="abs" style="left:0;right:0;top:0;height:14mm;background:${C.core}"></div>
        <div class="abs" style="left:6mm;top:4mm">${word(6, '#fff')}</div>
        <div class="abs m" style="left:6mm;top:21mm;font-size:2.8mm;color:${C.ink3}">Name</div>
        <div class="abs" style="left:6mm;right:6mm;top:40mm;border-top:0.35mm solid rgba(6,26,77,0.35)"></div>
        <div class="abs m" style="left:6mm;top:46mm;font-size:2.8mm;color:${C.ink3};display:flex;align-items:center;gap:3mm">Group
          <span style="display:inline-block;width:12mm;height:9mm;border:0.35mm solid rgba(6,26,77,0.35);border-radius:1.2mm"></span></div>`),
    },
    {
      id: 'v2',
      note: 'Grid paper with the logo in the corner. The group box is bigger and blue, so the number is easy to spot.',
      html: () => tagSheet(`
        <div class="fill bg-paper"></div>
        ${grid(90, 60, { step: 5, major: 4 })}
        <div class="abs" style="left:6mm;top:6mm">${lockup(6)}</div>
        <div class="abs m" style="left:6mm;top:19mm;font-size:2.8mm;color:${C.core}">Name</div>
        <div class="abs" style="left:6mm;right:30mm;top:44mm;border-top:0.35mm solid ${C.navy}"></div>
        <div class="abs" style="right:6mm;top:19mm;width:19mm;height:25mm;border:0.5mm solid ${C.electric};border-radius:2mm;background:#fff"></div>
        <div class="abs m" style="right:6mm;width:19mm;top:47mm;text-align:center;font-size:2.8mm;color:${C.core}">Group</div>`),
    },
    {
      id: 'v3',
      note: 'Most of the tag is space for the name, so it can be written big and read across a pod. Group sits in a navy strip.',
      html: () => tagSheet(`
        <div class="fill" style="background:#fff"></div>
        <div class="abs m" style="left:6mm;top:6mm;font-size:2.8mm;color:${C.ink3}">Name</div>
        <div class="abs" style="right:6mm;top:5.5mm">${word(4.2, C.navy)}</div>
        <div class="abs" style="left:0;right:0;bottom:0;height:17mm;background:${C.navy};display:flex;align-items:center;justify-content:space-between;padding:0 6mm">
          <span class="d" style="font-size:7mm;color:#fff">Group</span>
          <span style="width:20mm;height:11mm;background:#fff;border-radius:1.5mm"></span>
        </div>`, { cut: 'rgba(6,26,77,0.35)' }),
    },
  ],
};

// ---------- 5 sign-in sheet (A4) ----------
// x = left and right margin; the columns stretch to fit. mono: false = plain Inter heads and numbers.
function table(rows, { top, rowH, head = C.ink3, line = 'rgba(6,26,77,0.18)', zebra = '', x = 12, mono = true, rule = C.navy, num = C.ink3 }) {
  const s = (210 - 2 * x) / 186;
  const cols = [['#', 12], ['Name', 70], ['Email', 76], ['Group', 28]].map(([t, w]) => [t, +(w * s).toFixed(2)]);
  const cell = (w, txt, extra = '') => `<span style="width:${w}mm;flex:none;padding-left:2.5mm;${extra}">${txt}</span>`;
  let h = `<div class="abs" style="left:${x}mm;right:${x}mm;top:${top}mm">`;
  h += `<div class="${mono ? 'm' : 't'}" style="display:flex;font-size:${mono ? 2.8 : 3.2}mm;${mono ? '' : 'font-weight:600;'}color:${head};padding-bottom:2.5mm;border-bottom:0.45mm solid ${rule}">${cols.map(([t, w]) => cell(w, t)).join('')}</div>`;
  for (let r = 1; r <= rows; r++) {
    h += `<div style="display:flex;align-items:center;height:${rowH}mm;border-bottom:0.25mm solid ${line};${zebra && r % 2 === 0 ? `background:${zebra};` : ''}">
      ${cell(cols[0][1], r, mono ? `font-family:'JetBrains Mono',monospace;font-size:2.8mm;color:${C.ink3}` : `font-size:3mm;font-weight:500;color:${num}`)}
      ${cols.slice(1).map(([, w], i) => cell(w, '', i < 2 ? `height:100%;border-right:0.25mm solid ${line}` : '')).join('')}</div>`;
  }
  return `${h}</div>`;
}
const signinsheet = {
  id: 'signinsheet', piece: 'signin', name: 'Sign-in sheet', size: 'A4, 210 × 297 mm', mm: [210, 297], pages: ['Sheet'],
  print: `${PAPER} Print 2.`,
  versions: [
    {
      id: 'v1',
      note: 'Plain sheet like the one on the model: title, then name, email, and group on 30 lines.',
      html: () => `
        <div class="fill" style="background:#fff"></div>
        <div class="abs d nw" style="left:12mm;top:14mm;font-size:12mm;color:${C.navy}">Sign-in sheet</div>
        <div class="abs t nw" style="left:12mm;top:30mm;font-size:3.6mm;color:${C.ink3}">Blueprint · ${F.room} · Date: ________________</div>
        ${table(30, { top: 44, rowH: 7.7 })}`,
    },
    {
      id: 'v2',
      note: 'Logo and grid paper so it matches the set. Every other line is tinted, so names do not run into each other.',
      html: () => `
        <div class="fill bg-paper"></div>
        ${grid(210, 297, { step: 10, major: 5, minor: 0.05, majorOp: 0.1 })}
        <div class="abs" style="left:12mm;top:12mm">${lockup(10)}</div>
        <div class="abs m" style="right:12mm;top:15mm;font-size:3mm;color:${C.core}">${F.room} · Date: __________</div>
        <div class="abs d nw" style="left:11.5mm;top:28mm;font-size:13mm;color:${C.ink}">Sign <span class="g">in</span></div>
        ${table(30, { top: 48, rowH: 7.5, head: C.core, zebra: 'rgba(0,109,255,0.05)' })}`,
    },
    {
      id: 'v3',
      note: 'Navy top band and bigger rows: 26 lines, one for each seat. Easier to write in on a clipboard.',
      html: () => `
        <div class="fill" style="background:#fff"></div>
        <div class="abs bg-navy" style="left:0;right:0;top:0;height:46mm"></div>
        ${`<div class="abs" style="left:0;right:0;top:0;height:46mm;overflow:hidden">${navyGrid(210, 46)}</div>`}
        <div class="abs d nw" style="left:11mm;top:12mm;font-size:22mm;color:#fff">Sign <span class="gl">in</span></div>
        <div class="abs" style="right:12mm;top:14mm">${word(7, '#fff')}</div>
        <div class="abs m" style="right:12mm;top:28mm;font-size:3mm;color:${C.ice}">Date: __________</div>
        ${table(26, { top: 56, rowH: 8.9 })}`,
    },
  ],
};

// ---------- 6 door sign (A3 portrait) ----------
const doorsign = {
  id: 'doorsign', piece: 'doorsign', name: 'Door sign', size: 'A3, 297 × 420 mm', mm: [297, 420], pages: ['Front'], print: PAPER,
  versions: [
    {
      id: 'v1',
      note: 'Same as the model: navy band with the logo, the room, and “Sign in here”.',
      html: () => `
        <div class="fill" style="background:#fff"></div>
        <div class="abs bg-navy" style="left:0;right:0;top:0;height:120mm"></div>
        <div class="abs" style="left:26mm;top:42mm">${word(38, '#fff')}</div>
        <div class="abs d" style="left:24mm;top:160mm;font-size:62mm;color:${C.navy};line-height:1">FA Annex<br>104</div>
        <div class="abs" style="left:26mm;top:320mm;display:flex;align-items:center;gap:8mm">
          <span class="d nw" style="font-size:30mm;color:${C.core};letter-spacing:-0.035em">Sign in here</span>${arrow('down', 22, 30, C.core)}
        </div>`,
    },
    {
      id: 'v2',
      note: 'People are already at the door, so “Sign in here.” is now the biggest line. The room number moves to the top.',
      html: () => `
        <div class="fill bg-paper"></div>
        ${grid(297, 420, { step: 10, major: 5 })}
        <div class="abs" style="left:26mm;top:26mm">${lockup(30)}</div>
        <div class="abs d nw" style="right:26mm;top:32mm;font-size:14mm;letter-spacing:-0.03em;color:${C.navy}">${F.room}</div>
        <div class="abs d" style="left:24mm;top:111mm;font-size:86mm;color:${C.ink};line-height:1.02">
          <div class="nw">Sign in</div><div class="nw">${sel('<span class="g">here.</span>', { size: 'A3 · 297 × 420 mm' })}</div>
        </div>
        <div class="abs" style="left:26mm;top:362mm;display:flex;align-items:center;gap:8mm">
          ${arrow('down', 18, 26, C.navy)}<span class="m" style="font-size:7mm;color:${C.navy}">Career workshop · ${F.dates}</span>
        </div>`,
    },
    {
      id: 'v3',
      note: 'Navy, with the name and “Sign in here.” as big as the sheet allows. Reads from the end of the hallway.',
      html: () => `
        <div class="fill bg-navy"></div>
        ${navyGrid(297, 420)}
        <div class="abs" style="left:24mm;top:28mm">${word(48, '#fff')}</div>
        <div class="abs d" style="left:22mm;top:136mm;font-size:84mm;color:#fff;line-height:1">
          <div class="nw">Sign in</div><div class="nw gl">here.</div>
        </div>
        <div class="abs" style="left:24mm;right:24mm;top:332mm;border-top:0.8mm solid rgba(185,238,255,0.35);padding-top:12mm;display:flex;align-items:center;justify-content:space-between">
          <span class="d nw" style="font-size:30mm;color:${C.ice};letter-spacing:-0.035em">${F.room}</span>${arrow('down', 22, 32, '#fff')}
        </div>`,
    },
  ],
};

// ---------- 7 title slide (16:9, one per session) ----------
// Largest size (mm) that keeps a session name on one line inside the slide's 298 mm text width.
const fit = (t) => Math.min(62, Math.floor(298 / (t.length * 0.5)));
const screen = {
  id: 'screen', piece: 'screen', name: 'Title slide', size: '16:9 slide, one per session', mm: [338.67, 190.5],
  pages: ['Session 01', 'Session 02', 'Session 03', 'Session 04'],
  print: 'Not for print. Put it on the screen while people come in. The JPG is 2400 px wide.',
  versions: [
    {
      id: 'v1',
      note: 'Same as the model. The top corner now names the session and the day, so there is one slide for each of the four days.',
      html: (i) => {
        const s = F.sessions[i];
        return `
        <div class="fill" style="background:linear-gradient(115deg,#f4f8ff,#d6e6ff)"></div>
        <div class="abs" style="left:17mm;top:15mm">${lockup(15)}</div>
        <div class="abs" style="right:17mm;top:19mm;font-weight:700;font-size:6mm;letter-spacing:0.01em;color:${C.core}">SESSION ${s.n} · ${s.day.toUpperCase()} · ${F.room.toUpperCase()}</div>
        <div class="abs d" style="left:16mm;top:66mm;font-size:30mm;line-height:1.12">
          <div class="nw" style="color:${C.ink}">${F.tagline[0]}</div><div class="nw" style="color:${C.core}">${F.tagline[1]}</div>
        </div>
        <div class="abs t nw" style="left:17mm;top:150mm;font-size:8.6mm;font-weight:600;color:${C.ink2}">${WELCOME}</div>`;
      },
    },
    {
      id: 'v2',
      note: 'The site’s first screen on the big screen: grid lines and the selection box on “paper.”. Session and day in the top corner.',
      html: (i) => {
        const s = F.sessions[i];
        return `
        <div class="fill" style="background:#fff"></div>
        ${grid(338.67, 190.5, { step: 8, major: 5 })}
        <div class="abs" style="left:18mm;top:15mm">${lockup(14, { markColor: 'grad' })}</div>
        <div class="abs m" style="right:18mm;top:19mm;font-size:4.6mm;color:${C.core}">Session ${s.n} · ${s.title} · ${s.day}</div>
        <div class="abs d" style="left:0;right:0;top:56mm;text-align:center;font-size:36mm;line-height:1.08;color:${C.ink}">
          <div class="nw">Stand out on ${sel('paper.')}</div>
          <div class="nw">Stand out in <span class="g">person.</span></div>
        </div>
        <div class="abs t nw" style="left:0;right:0;top:152mm;text-align:center;font-size:7.6mm;color:${C.ink2}">${WELCOME}</div>`;
      },
    },
    {
      id: 'v3',
      note: 'Each day shows its own session name big, so people know they are in the right room on the right day.',
      html: (i) => {
        const s = F.sessions[i];
        return `
        <div class="fill bg-navy"></div>
        ${navyGrid(338.67, 190.5, 8)}
        <div class="abs" style="left:20mm;top:18mm">${word(10, '#fff')}</div>
        <div class="abs m" style="right:20mm;top:20mm;font-size:4.6mm;color:${C.cyan}">${s.day} · ${F.room}</div>
        <div class="abs m" style="left:20mm;top:50mm;font-size:6mm;color:${C.ice}">Session ${s.n}</div>
        <div class="abs d nw" style="left:18mm;top:${62 + (62 - fit(s.title)) * 0.55}mm;font-size:${fit(s.title)}mm;color:#fff"><span class="gl">${s.title}</span></div>
        <div class="abs t nw" style="left:20mm;top:128mm;font-size:10mm;font-weight:600;color:#fff;letter-spacing:-0.02em">${s.idea}</div>
        <div class="abs t nw" style="left:20mm;bottom:16mm;font-size:6mm;color:${C.ice}">${WELCOME}</div>`;
      },
    },
  ],
};

// ---------- 8 group number tent cards (A4, folds at 148.5 mm) ----------
const FW = 210, FH = 148.5;
function tent(face, { fold = 'rgba(6,26,77,0.3)' } = {}) {
  return `
    <div class="abs" style="left:0;top:0;width:${FW}mm;height:${FH}mm;overflow:hidden;transform:rotate(180deg)">${face}</div>
    <div class="abs" style="left:0;top:${FH}mm;width:${FW}mm;height:${FH}mm;overflow:hidden">${face}</div>
    <svg class="fill" viewBox="0 0 210 297" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="${FH}" x2="210" y2="${FH}" stroke="${fold}" stroke-width="0.3" stroke-dasharray="3 2"/></svg>`;
}
const numbers = {
  id: 'numbers', piece: 'numbers', name: 'Group number cards', size: 'A4, folds into an A5 tent card', mm: [210, 297],
  pages: ['Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5', 'Group 6'],
  print: `${PAPER} Card stock. Fold on the middle line so the number shows on both sides.`,
  css: `.sel--thin::before{border-width:0.012em}.sel--thin .sel__h{width:0.05em;height:0.05em;border-width:0.012em}
    .sel--thin .sel__h.tl,.sel--thin .sel__h.bl{left:-0.085em}.sel--thin .sel__h.tr,.sel--thin .sel__h.br{right:-0.085em}
    .sel--thin .sel__h.tl,.sel--thin .sel__h.tr{top:0.035em}.sel--thin .sel__h.bl,.sel--thin .sel__h.br{bottom:-0.045em}`,
  versions: [
    {
      id: 'v1',
      note: 'Same as the model: navy card, “GROUP”, and the number. Printed twice on one sheet so it shows on both sides of the fold.',
      html: (i) => tent(`
        <div class="fill bg-navy"></div>
        <div class="abs" style="left:20mm;top:20mm;font-weight:600;font-size:16mm;letter-spacing:0.02em;color:${C.ice}">GROUP</div>
        <div class="abs d" style="left:16mm;top:44mm;font-size:100mm;line-height:0.85;color:#fff">${i + 1}</div>
        <div class="abs" style="right:18mm;bottom:18mm">${word(10, 'rgba(185,238,255,0.6)')}</div>`, { fold: 'rgba(255,255,255,0.5)' }),
    },
    {
      id: 'v2',
      note: 'Grid paper and a gradient number in the selection box. Matches the slides and the banner.',
      html: (i) => tent(`
        <div class="fill bg-paper"></div>
        ${grid(FW, FH, { step: 10, major: 5 })}
        <div class="abs m" style="left:18mm;top:18mm;font-size:7mm;color:${C.core}">Group</div>
        <div class="abs" style="left:18mm;bottom:18mm">${lockup(14)}</div>
        <div class="abs d" style="right:34mm;top:20mm;font-size:110mm;line-height:1">${sel(`<span class="g">${i + 1}</span>`, { cls: 'sel--thin' })}</div>`),
    },
    {
      id: 'v3',
      note: 'The number fills the card, so each pod is easy to find from the door.',
      html: (i) => tent(`
        <div class="fill bg-navy"></div>
        ${navyGrid(FW, FH)}
        <div class="abs m" style="left:16mm;top:16mm;font-size:6mm;color:${C.cyan}">Group</div>
        <div class="abs" style="left:16mm;bottom:16mm">${word(8, '#fff')}</div>
        <div class="fill" style="display:flex;align-items:center;justify-content:center"><span class="dd gl" style="font-size:148mm;line-height:0.74;padding:0;margin:0">${i + 1}</span></div>`, { fold: 'rgba(255,255,255,0.5)' }),
    },
  ],
};

// ---------- 9 kit cover (A4) ----------
const field = (label, w, { color = C.navy, line = 'rgba(6,26,77,0.4)', size = 3.4, mono = true } = {}) =>
  `<div style="width:${w}mm"><div class="${mono ? 'm' : 't'}" style="font-size:${size}mm;color:${color}${mono ? '' : ';font-weight:600'}">${label}</div><div style="height:14mm;border-bottom:0.4mm solid ${line}"></div></div>`;
const kits = {
  id: 'kits', piece: 'kits', name: 'Kit cover', size: 'A4, 210 × 297 mm', mm: [210, 297], pages: ['Cover'],
  print: `${PAPER} Print 30. It goes on top of each worksheet kit.`,
  versions: [
    {
      id: 'v1',
      note: 'Same as the model: blue band with the logo on a white sheet. Adds the two lines and a place for the name and group.',
      html: () => `
        <div class="fill" style="background:#fff"></div>
        <div class="abs" style="left:0;right:0;top:0;height:54mm;background:${C.core}"></div>
        <div class="abs" style="left:16mm;top:18mm">${word(18, '#fff')}</div>
        <div class="abs d" style="left:15mm;top:100mm;font-size:19mm;line-height:1.12;color:${C.navy}">
          <div class="nw">${F.tagline[0]}</div><div class="nw" style="color:${C.core}">${F.tagline[1]}</div>
        </div>
        <div class="abs" style="left:16mm;right:16mm;top:206mm;display:flex;gap:10mm">${field('Name', 130)}${field('Group', 38)}</div>
        <div class="abs m" style="left:16mm;bottom:14mm;font-size:3mm;color:${C.ink3}">Career workshop · ${F.room}</div>`,
    },
    {
      id: 'v2',
      note: 'Grid paper with the selection box on “paper.”, like the site. Name and group sit at the bottom in a clear row.',
      html: () => `
        <div class="fill bg-paper"></div>
        ${grid(210, 297, { step: 10, major: 5 })}
        <div class="abs" style="left:16mm;top:18mm">${lockup(16)}</div>
        <div class="abs m" style="right:16mm;top:24mm;font-size:3.2mm;color:${C.core}">Career workshop</div>
        <div class="abs d" style="left:15mm;top:82mm;font-size:21mm;line-height:1.1;color:${C.ink}">
          <div class="nw">Stand out on ${sel('paper.')}</div>
          <div class="nw">Stand out in <span class="g">person.</span></div>
        </div>
        <div class="abs t" style="left:16mm;width:150mm;top:144mm;font-size:5.2mm;color:${C.ink2}">${F.promise}</div>
        <div class="abs" style="left:16mm;right:16mm;top:226mm;display:flex;gap:10mm">${field('Name', 130, { color: C.core })}${field('Group', 38, { color: C.core })}</div>
        <div class="abs m" style="left:16mm;bottom:14mm;font-size:3mm;color:${C.ink3}">${F.dates} · ${F.room}</div>`,
    },
    {
      id: 'v3',
      note: 'Navy cover, so every seat looks the same when people walk in. Name and group go in a white box that is easy to write on.',
      html: () => `
        <div class="fill bg-navy"></div>
        ${navyGrid(210, 297)}
        <div class="abs" style="left:16mm;top:18mm">${word(14, '#fff')}</div>
        <div class="abs d" style="left:14mm;top:62mm;font-size:30mm;line-height:1.02;color:#fff">
          <div class="nw">Stand out</div><div class="nw gl">on paper.</div>
          <div class="nw" style="margin-top:4mm">Stand out</div><div class="nw gl">in person.</div>
        </div>
        <div class="abs" style="left:16mm;right:16mm;top:226mm;height:44mm;background:#fff;border-radius:4mm;padding:0 10mm 4mm;display:flex;align-items:center;gap:8mm">
          ${field('Name', 112)}${field('Group', 34)}
        </div>`,
    },
  ],
};

// ---------- V4 to V6: V1 to V3 cleaned up ----------
// Same words and job as the old version. Flat color, no grid, no selection box, no gradient text,
// one margin (8% of the short edge) that every line starts on. Colors from CLEAN in kit.mjs.
const [K4, K5, K6] = [CLEAN.v4, CLEAN.v5, CLEAN.v6];
const flat = (k) => `<div class="fill" style="background:${k.bg}"></div>`;
const logo = (k, h) => lockup(h, { markColor: k.mark, wordColor: k.word });
const LINE = CLEAN.v4.rule;            // thin lines on white
const WRITE = 'rgba(6,26,77,0.4)';     // lines people write on

signs.versions.push(
  {
    id: 'v4',
    note: 'V1 cleaned up: the arrow sits on the side you walk to, and the room starts on the same edge every time.',
    html: (i) => {
      const d = DIRS[i], m = margin(297, 210), k = K4, aSide = d === 'right' ? 'right' : 'left';
      return `${flat(k)}
        <div class="abs" style="${aSide}:${m}mm;top:${m}mm">${d === 'up' ? arrow('up', 72, 96, k.arrow) : arrow(d, 120, 80, k.arrow)}</div>
        <div class="abs" style="${aSide === 'right' ? 'left' : 'right'}:${m}mm;top:${m}mm">${logo(k, 14)}</div>
        <div class="abs d nw" style="left:${m}mm;bottom:${m}mm;font-size:40mm;color:${k.ink};letter-spacing:-0.035em">FA Annex <span style="color:${k.hi}">104</span></div>`;
    },
  },
  {
    id: 'v5',
    note: 'V2 cleaned up: solid blue, no grid, no box. The room number is still the biggest thing.',
    html: (i) => {
      const d = DIRS[i], m = margin(297, 210), k = K5, left = d === 'left';
      return `${flat(k)}
        <div class="abs" style="left:${m}mm;top:${m}mm">${logo(k, 14)}</div>
        <div class="abs" style="left:${m}mm;right:${m}mm;bottom:${m}mm;display:flex;align-items:flex-end;justify-content:space-between;flex-direction:${left ? 'row-reverse' : 'row'}">
          <div style="display:flex;flex-direction:column;align-items:${left ? 'flex-end' : 'flex-start'}">
            <div class="d nw" style="font-size:30mm;color:${k.sub};letter-spacing:-0.035em">FA Annex</div>
            <div class="d nw" style="font-size:88mm;line-height:0.86;margin-top:5mm;color:${k.ink}">104</div>
          </div>
          <div style="padding-bottom:4mm">${d === 'up' ? arrow('up', 70, 96, k.arrow) : arrow(d, 104, 72, k.arrow)}</div>
        </div>`;
    },
  },
  {
    id: 'v6',
    note: 'V3 cleaned up: no grid lines. One big arrow and the room, nothing else.',
    html: (i) => {
      const d = DIRS[i], m = margin(297, 210), k = K6, aSide = d === 'right' ? 'right' : 'left';
      return `${flat(k)}
        <div class="abs" style="${aSide}:${m}mm;top:${m}mm">${d === 'up' ? arrow('up', 88, 108, k.arrow) : arrow(d, 190, 100, k.arrow)}</div>
        <div class="abs" style="${aSide === 'right' ? 'left' : 'right'}:${m}mm;top:${m}mm">${word(12, k.word)}</div>
        <div class="abs d nw" style="left:${m}mm;bottom:${m}mm;font-size:44mm;color:${k.ink};letter-spacing:-0.04em">FA Annex <span style="color:${k.hi}">104</span></div>`;
    },
  },
);

{
  const m = margin(850, 2000), low = 100 + m;   // the bottom 10 cm goes into the stand
  banner.versions.push(
    {
      id: 'v4',
      note: 'V1 cleaned up: white, one blue line for “Sign in here”, and no box around it.',
      html: () => `${flat(K4)}
        <div class="abs" style="left:${m}mm;top:${m}mm">${logo(K4, 160)}</div>
        <div class="abs d" style="left:${m}mm;top:420mm;font-size:140mm;color:${K4.ink};line-height:1.02">
          <div class="nw">Stand out</div><div class="nw">on paper.</div><div class="nw">Stand out</div><div class="nw">in person.</div></div>
        <div class="abs t" style="left:${m}mm;top:1240mm;font-size:54mm;font-weight:600;line-height:1.3;letter-spacing:-0.025em;color:${K4.sub}">Career workshop<br>${F.dates}<br>${F.time}<br>${F.room}</div>
        <div class="abs" style="left:${m}mm;right:${m}mm;bottom:${low}mm;padding-top:44mm;border-top:0.8mm solid ${K4.rule};display:flex;align-items:center;gap:22mm">
          <span class="d nw" style="font-size:54mm;color:${K4.hi};letter-spacing:-0.035em">Sign in here</span>${arrow('right', 64, 46, K4.arrow)}</div>`,
    },
    {
      id: 'v5',
      note: 'V2 cleaned up: solid blue, no grid, no box. Headline at eye level, the four sessions below.',
      html: () => `${flat(K5)}
        <div class="abs" style="left:${m}mm;top:${m}mm">${logo(K5, 150)}</div>
        <div class="abs d" style="left:${m}mm;top:330mm;font-size:150mm;color:${K5.ink};line-height:1">
          <div class="nw">Stand out</div><div class="nw">on paper.</div>
          <div class="nw" style="margin-top:34mm">Stand out</div><div class="nw">in person.</div></div>
        <div class="abs" style="left:${m}mm;right:${m}mm;top:1060mm;font-weight:600;letter-spacing:-0.03em">
          <div class="d nw" style="font-size:52mm;color:${K5.ink}">${F.dates}</div>
          <div class="nw" style="font-size:36mm;margin-top:14mm;color:${K5.sub}">${F.room} · ${F.time}</div></div>
        <div class="abs" style="left:${m}mm;right:${m}mm;bottom:${low}mm">
          ${F.sessions.map((s) => `<div style="display:flex;align-items:baseline;gap:30mm;padding:22mm 0;border-top:0.8mm solid ${K5.rule}">
            <span class="nw" style="width:50mm;font-size:36mm;font-weight:600;color:${K5.sub}">${s.n}</span>
            <span class="d nw" style="flex:1;font-size:52mm;color:${K5.ink};letter-spacing:-0.035em">${s.title}</span>
            <span class="nw" style="font-size:36mm;font-weight:600;letter-spacing:-0.02em;color:${K5.sub}">${s.day}</span></div>`).join('')}
        </div>`,
    },
    {
      id: 'v6',
      note: 'V3 cleaned up: no grid, one light-blue line. Logo stays at the top for photos.',
      html: () => `${flat(K6)}
        <div class="abs" style="left:${m}mm;top:${m}mm">${logo(K6, 190)}</div>
        <div class="abs d" style="left:${m}mm;top:440mm;font-size:160mm;color:${K6.ink};line-height:1.02">
          <div class="nw">Stand out</div><div class="nw">on paper.</div>
          <div class="nw" style="margin-top:16mm">Stand out</div><div class="nw" style="color:${K6.hi}">in person.</div></div>
        <div class="abs" style="left:${m}mm;right:${m}mm;bottom:${low}mm;border-top:0.8mm solid ${K6.rule};padding-top:56mm">
          <div class="d nw" style="font-size:116mm;color:${K6.ink};letter-spacing:-0.04em">${F.dates}</div>
          <div class="nw" style="margin-top:30mm;font-size:56mm;font-weight:600;line-height:1.3;letter-spacing:-0.03em;color:${K6.sub}">${F.room}<br>${F.time}</div>
        </div>`,
    },
  );
}

{
  const m = margin(148, 210);
  const tileQR = (k, top, h) => `<div class="abs" style="left:${m}mm;right:${m}mm;top:${top}mm;height:${h}mm;background:${k.tile};border-radius:3mm;display:flex;justify-content:center;padding-top:12mm">${sampleQR(h - 30, { seed: 5 })}</div>`;
  signinqr.versions.push(
    {
      id: 'v4',
      note: 'V1 cleaned up: everything starts on one edge, and the QR is as wide as the text.',
      html: () => `${flat(K4)}
        <div class="abs d nw" style="left:${m}mm;top:${m}mm;font-size:22mm;color:${K4.ink}">Sign in</div>
        <div class="abs" style="left:${m}mm;top:37mm">${sampleQR(124, { seed: 5 })}</div>
        <div class="abs t nw" style="left:${m}mm;bottom:${m}mm;font-size:8mm;font-weight:600;color:${K4.hi}">Scan, then get your kit.</div>`,
    },
    {
      id: 'v5',
      note: 'V2 cleaned up: solid blue, no grid. The QR sits on a plain white tile.',
      html: () => `${flat(K5)}
        <div class="abs" style="left:${m}mm;top:${m}mm">${logo(K5, 10)}</div>
        <div class="abs d nw" style="left:${m}mm;top:28mm;font-size:22mm;color:${K5.ink}">Sign in</div>
        ${tileQR(K5, 56, 122)}
        <div class="abs t nw" style="left:${m}mm;bottom:${m}mm;font-size:8mm;font-weight:600;color:${K5.sub}">Scan, then get your kit.</div>`,
    },
    {
      id: 'v6',
      note: 'V3 cleaned up: no grid, and the white tile lines up with the words.',
      html: () => `${flat(K6)}
        <div class="abs d nw" style="left:${m}mm;top:${m}mm;font-size:38mm;color:${K6.ink}">Sign <span style="color:${K6.hi}">in</span></div>
        ${tileQR(K6, 58, 120)}
        <div class="abs t nw" style="left:${m}mm;bottom:${m}mm;font-size:8mm;font-weight:600;color:${K6.sub}">Scan, then get your kit.</div>`,
    },
  );
}

{
  const m = margin(TAG.w, TAG.h);
  const label = (txt, color, style = '') => `<div class="abs t" style="font-size:3mm;font-weight:600;color:${color};${style}">${txt}</div>`;
  nametags.versions.push(
    {
      id: 'v4',
      note: 'V1 cleaned up: no blue band, so there is more room to write the name.',
      html: () => tagSheet(`${flat(K4)}
        <div class="abs" style="left:${m}mm;top:${m}mm">${logo(K4, 7)}</div>
        ${label('Name', K4.sub, `left:${m}mm;top:18mm`)}
        <div class="abs" style="left:${m}mm;right:${m}mm;top:40mm;border-top:0.35mm solid ${WRITE}"></div>
        <div class="abs t" style="left:${m}mm;bottom:${m}mm;font-size:3mm;font-weight:600;color:${K4.sub};display:flex;align-items:center;gap:3mm">Group
          <span style="display:inline-block;width:14mm;height:9mm;border:0.35mm solid ${WRITE};border-radius:1mm"></span></div>`),
    },
    {
      id: 'v5',
      note: 'V2 cleaned up: a blue tag with two plain white boxes, one for the name and one for the group.',
      html: () => tagSheet(`${flat(K5)}
        <div class="abs" style="left:${m}mm;top:${m}mm">${logo(K5, 6)}</div>
        <div class="abs" style="left:${m}mm;top:15mm;width:56mm;height:40mm;background:${K5.tile};border-radius:1.5mm"></div>
        ${label('Name', K5.bg, `left:${m + 3}mm;top:17.5mm`)}
        <div class="abs" style="right:${m}mm;top:15mm;width:21mm;height:40mm;background:${K5.tile};border-radius:1.5mm"></div>
        ${label('Group', K5.bg, `right:${m}mm;width:21mm;top:17.5mm;text-align:center`)}`, { cut: 'rgba(6,26,77,0.35)' }),
    },
    {
      id: 'v6',
      note: 'V3 cleaned up: the logo moves into the navy strip, so the top is only space for the name.',
      html: () => tagSheet(`<div class="fill" style="background:${K6.tile}"></div>
        ${label('Name', K6.bg, `left:${m}mm;top:${m}mm`)}
        <div class="abs" style="left:0;right:0;bottom:0;height:16mm;background:${K6.bg};display:flex;align-items:center;justify-content:space-between;padding:0 ${m}mm">
          ${word(4.2, K6.word)}
          <span style="display:flex;align-items:center;gap:3mm"><span class="d" style="font-size:5mm;color:${K6.ink}">Group</span><span style="width:18mm;height:10mm;background:${K6.tile};border-radius:1mm"></span></span>
        </div>`, { cut: 'rgba(6,26,77,0.35)' }),
    },
  );
}

{
  const m = margin(210, 297);
  signinsheet.versions.push(
    {
      id: 'v4',
      note: 'V1 cleaned up: the logo goes top right, and the table lines up with the title.',
      html: () => `${flat(K4)}
        <div class="abs d nw" style="left:${m}mm;top:${m}mm;font-size:12mm;color:${K4.ink}">Sign-in sheet</div>
        <div class="abs" style="right:${m}mm;top:${m + 1}mm">${logo(K4, 9)}</div>
        <div class="abs t nw" style="left:${m}mm;top:${m + 15}mm;font-size:3.6mm;font-weight:500;color:${K4.sub}">${F.room} · Date: ________________</div>
        ${table(30, { top: 44, rowH: 7.5, x: m, mono: false, head: K4.sub, num: K4.sub, line: LINE, rule: K4.ink })}`,
    },
    {
      id: 'v5',
      note: 'V2 cleaned up: a solid blue top, no grid. Every other line is still tinted so names do not run together.',
      html: () => `<div class="fill" style="background:${K5.tile}"></div>
        <div class="abs" style="left:0;right:0;top:0;height:44mm;background:${K5.bg}"></div>
        <div class="abs d nw" style="left:${m}mm;top:15mm;font-size:14mm;color:${K5.ink}">Sign in</div>
        <div class="abs" style="right:${m}mm;top:15mm">${logo(K5, 9)}</div>
        <div class="abs t nw" style="right:${m}mm;top:29mm;font-size:3.4mm;font-weight:500;color:${K5.sub}">${F.room} · Date: __________</div>
        ${table(30, { top: 54, rowH: 7.3, x: m, mono: false, head: K5.bg, num: K5.bg, line: LINE, rule: K5.bg, zebra: 'rgba(6,70,200,0.05)' })}`,
    },
    {
      id: 'v6',
      note: 'V3 cleaned up: no grid in the navy top. Still 26 big lines, one for each seat.',
      html: () => `<div class="fill" style="background:${K6.tile}"></div>
        <div class="abs" style="left:0;right:0;top:0;height:46mm;background:${K6.bg}"></div>
        <div class="abs d nw" style="left:${m}mm;top:13mm;font-size:20mm;color:${K6.ink}">Sign <span style="color:${K6.hi}">in</span></div>
        <div class="abs" style="right:${m}mm;top:15mm">${word(7, K6.word)}</div>
        <div class="abs t nw" style="right:${m}mm;top:27mm;font-size:3.4mm;font-weight:500;color:${K6.sub}">Date: __________</div>
        ${table(26, { top: 56, rowH: 8.3, x: m, mono: false, head: K6.bg, num: C.ink3, line: LINE, rule: K6.bg })}`,
    },
  );
}

{
  const m = margin(297, 420);
  doorsign.versions.push(
    {
      id: 'v4',
      note: 'V1 cleaned up: no navy band. The room number is the biggest thing, and “Sign in here” is the one blue line.',
      html: () => `${flat(K4)}
        <div class="abs" style="left:${m}mm;top:${m}mm">${logo(K4, 30)}</div>
        <div class="abs d" style="left:${m}mm;top:128mm;color:${K4.ink}">
          <div class="nw" style="font-size:58mm;letter-spacing:-0.035em">FA Annex</div>
          <div class="nw" style="font-size:124mm;line-height:0.86;margin-top:6mm">104</div></div>
        <div class="abs" style="left:${m}mm;bottom:${m}mm;display:flex;align-items:center;gap:8mm">
          <span class="d nw" style="font-size:30mm;color:${K4.hi};letter-spacing:-0.035em">Sign in here</span>${arrow('down', 22, 30, K4.arrow)}</div>`,
    },
    {
      id: 'v5',
      note: 'V2 cleaned up: solid blue, no grid, no box. “Sign in here.” is still the biggest line.',
      html: () => `${flat(K5)}
        <div class="abs" style="left:${m}mm;top:${m}mm">${logo(K5, 30)}</div>
        <div class="abs d nw" style="right:${m}mm;top:${m + 9}mm;font-size:12mm;letter-spacing:-0.03em;color:${K5.ink}">${F.room}</div>
        <div class="abs d" style="left:${m}mm;top:120mm;font-size:84mm;color:${K5.ink};line-height:1.02"><div class="nw">Sign in</div><div class="nw">here.</div></div>
        <div class="abs" style="left:${m}mm;bottom:${m}mm;display:flex;align-items:center;gap:8mm">${arrow('down', 18, 26, K5.arrow)}
          <span class="t nw" style="font-size:12mm;font-weight:600;letter-spacing:-0.02em;color:${K5.sub}">Career workshop · ${F.dates}</span></div>`,
    },
    {
      id: 'v6',
      note: 'V3 cleaned up: no grid, and the room and arrow line up with the words above.',
      html: () => `${flat(K6)}
        <div class="abs" style="left:${m}mm;top:${m}mm">${word(44, K6.word)}</div>
        <div class="abs d" style="left:${m}mm;top:140mm;font-size:84mm;color:${K6.ink};line-height:1.02"><div class="nw">Sign in</div><div class="nw" style="color:${K6.hi}">here.</div></div>
        <div class="abs" style="left:${m}mm;right:${m}mm;bottom:${m}mm;border-top:0.8mm solid ${K6.rule};padding-top:14mm;display:flex;align-items:center;justify-content:space-between">
          <span class="d nw" style="font-size:30mm;color:${K6.sub};letter-spacing:-0.035em">${F.room}</span>${arrow('down', 22, 32, K6.arrow)}</div>`,
    },
  );
}

{
  const m = margin(338.67, 190.5);
  screen.versions.push(
    {
      id: 'v4',
      note: 'V1 cleaned up: plain white, no fade. The session line is calm, not in capitals.',
      html: (i) => {
        const s = F.sessions[i];
        return `${flat(K4)}
        <div class="abs" style="left:${m}mm;top:${m}mm">${logo(K4, 14)}</div>
        <div class="abs t nw" style="right:${m}mm;top:${m + 3.5}mm;font-size:8mm;font-weight:600;letter-spacing:-0.02em;color:${K4.sub}">Session ${s.n} · ${s.day} · ${F.room}</div>
        <div class="abs d" style="left:${m}mm;top:62mm;font-size:32mm;line-height:1.12">
          <div class="nw" style="color:${K4.ink}">${F.tagline[0]}</div><div class="nw" style="color:${K4.hi}">${F.tagline[1]}</div></div>
        <div class="abs t nw" style="left:${m}mm;bottom:${m}mm;font-size:8mm;font-weight:600;letter-spacing:-0.02em;color:${K4.sub}">${WELCOME}</div>`;
      },
    },
    {
      id: 'v5',
      note: 'V2 cleaned up: solid blue, no grid, no box. Lines start on the left edge, like the other pieces.',
      html: (i) => {
        const s = F.sessions[i];
        return `${flat(K5)}
        <div class="abs" style="left:${m}mm;top:${m}mm">${logo(K5, 14)}</div>
        <div class="abs t nw" style="right:${m}mm;top:${m + 3.5}mm;font-size:8mm;font-weight:600;letter-spacing:-0.02em;color:${K5.sub}">Session ${s.n} · ${s.title} · ${s.day}</div>
        <div class="abs d" style="left:${m}mm;top:58mm;font-size:35mm;line-height:1.08;color:${K5.ink}">
          <div class="nw">Stand out on paper.</div><div class="nw">Stand out in <span style="color:${K5.hi}">person.</span></div></div>
        <div class="abs t nw" style="left:${m}mm;bottom:${m}mm;font-size:8mm;font-weight:600;letter-spacing:-0.02em;color:${K5.sub}">${WELCOME}</div>`;
      },
    },
    {
      id: 'v6',
      note: 'V3 cleaned up: no grid, and the session name is one flat light blue.',
      html: (i) => {
        const s = F.sessions[i], f = fit(s.title);
        return `${flat(K6)}
        <div class="abs" style="left:${m}mm;top:${m}mm">${word(10, K6.word)}</div>
        <div class="abs t nw" style="right:${m}mm;top:${m + 1.5}mm;font-size:6mm;font-weight:600;color:${K6.sub}">${s.day} · ${F.room}</div>
        <div class="abs t nw" style="left:${m}mm;top:48mm;font-size:10mm;font-weight:600;color:${K6.sub}">Session ${s.n}</div>
        <div class="abs d nw" style="left:${m}mm;top:${64 + (62 - f) * 0.55}mm;font-size:${f}mm;color:${K6.hi}">${s.title}</div>
        <div class="abs t nw" style="left:${m}mm;top:130mm;font-size:10mm;font-weight:600;letter-spacing:-0.02em;color:${K6.ink}">${s.idea}</div>
        <div class="abs t nw" style="left:${m}mm;bottom:${m}mm;font-size:6mm;font-weight:500;color:${K6.sub}">${WELCOME}</div>`;
      },
    },
  );
}

{
  const m = margin(FW, FH), wf = { fold: 'rgba(255,255,255,0.5)' };
  const grp = (k, size = 12) => `<div class="abs t" style="left:${m}mm;top:${m}mm;font-size:${size}mm;font-weight:600;letter-spacing:-0.02em;color:${k.sub}">Group</div>`;
  numbers.versions.push(
    {
      id: 'v4',
      note: 'V1 cleaned up: white card, a big blue number, and the logo in the corner.',
      html: (i) => tent(`${flat(K4)}${grp(K4)}
        <div class="abs d" style="left:${m - 2}mm;top:30mm;font-size:112mm;line-height:0.85;color:${K4.hi}">${i + 1}</div>
        <div class="abs" style="right:${m}mm;bottom:${m}mm">${logo(K4, 12)}</div>`),
    },
    {
      id: 'v5',
      note: 'V2 cleaned up: solid blue, no grid, no box. A big white number on the right.',
      html: (i) => tent(`${flat(K5)}${grp(K5)}
        <div class="abs" style="left:${m}mm;bottom:${m}mm">${logo(K5, 14)}</div>
        <div class="abs d" style="right:${m}mm;top:0;bottom:0;display:flex;align-items:center;font-size:120mm;line-height:0.8;color:${K5.ink}">${i + 1}</div>`, wf),
    },
    {
      id: 'v6',
      note: 'V3 cleaned up: no grid. The number still fills the card, in one flat light blue.',
      html: (i) => tent(`${flat(K6)}${grp(K6, 8)}
        <div class="abs" style="left:${m}mm;bottom:${m}mm">${word(8, K6.word)}</div>
        <div class="fill" style="display:flex;align-items:center;justify-content:center"><span class="dd" style="font-size:148mm;line-height:0.74;color:${K6.hi}">${i + 1}</span></div>`, wf),
    },
  );
}

{
  const m = margin(210, 297);
  const fields = (k, color, line, w = [128, 38]) => `${field('Name', w[0], { mono: false, color, line })}${field('Group', w[1], { mono: false, color, line })}`;
  kits.versions.push(
    {
      id: 'v4',
      note: 'V1 cleaned up: no blue band. Logo, two lines, a place for the name, all on one edge.',
      html: () => `${flat(K4)}
        <div class="abs" style="left:${m}mm;top:${m}mm">${logo(K4, 16)}</div>
        <div class="abs d" style="left:${m}mm;top:96mm;font-size:20mm;line-height:1.12;color:${K4.ink}">
          <div class="nw">${F.tagline[0]}</div><div class="nw" style="color:${K4.hi}">${F.tagline[1]}</div></div>
        <div class="abs" style="left:${m}mm;right:${m}mm;top:206mm;display:flex;gap:10mm">${fields(K4, K4.sub, WRITE)}</div>
        <div class="abs t nw" style="left:${m}mm;bottom:${m}mm;font-size:3.4mm;font-weight:600;color:${K4.sub}">Career workshop · ${F.room}</div>`,
    },
    {
      id: 'v5',
      note: 'V2 cleaned up: solid blue on top, plain white at the bottom to write the name on.',
      html: () => `${flat(K5)}
        <div class="abs" style="left:0;right:0;bottom:0;height:86mm;background:${K5.tile}"></div>
        <div class="abs" style="left:${m}mm;top:${m}mm">${logo(K5, 16)}</div>
        <div class="abs t nw" style="right:${m}mm;top:${m + 5}mm;font-size:3.6mm;font-weight:600;color:${K5.sub}">Career workshop</div>
        <div class="abs d" style="left:${m}mm;top:82mm;font-size:20mm;line-height:1.1;color:${K5.ink}">
          <div class="nw">Stand out on paper.</div><div class="nw">Stand out in <span style="color:${K5.hi}">person.</span></div></div>
        <div class="abs t" style="left:${m}mm;width:150mm;top:136mm;font-size:5.2mm;font-weight:500;color:${K5.sub}">${F.promise}</div>
        <div class="abs" style="left:${m}mm;right:${m}mm;top:228mm;display:flex;gap:10mm">${fields(K5, K5.bg, WRITE)}</div>
        <div class="abs t nw" style="left:${m}mm;bottom:${m}mm;font-size:3.4mm;font-weight:600;color:${K5.bg}">${F.dates} · ${F.room}</div>`,
    },
    {
      id: 'v6',
      note: 'V3 cleaned up: no grid, one light-blue line. The white box lines up with the words.',
      html: () => `${flat(K6)}
        <div class="abs" style="left:${m}mm;top:${m}mm">${word(14, K6.word)}</div>
        <div class="abs d" style="left:${m}mm;top:62mm;font-size:30mm;line-height:1.02;color:${K6.ink}">
          <div class="nw">Stand out</div><div class="nw">on paper.</div>
          <div class="nw" style="margin-top:4mm">Stand out</div><div class="nw" style="color:${K6.hi}">in person.</div></div>
        <div class="abs" style="left:${m}mm;right:${m}mm;bottom:${m}mm;height:44mm;background:${K6.tile};border-radius:3mm;padding:0 10mm 4mm;display:flex;align-items:center;gap:8mm">
          ${fields(K6, K6.bg, WRITE, [112, 36])}</div>`,
    },
  );
}

export default {
  page: 'venue',
  assets: [signs, banner, signinqr, nametags, signinsheet, doorsign, screen, numbers, kits],
};
