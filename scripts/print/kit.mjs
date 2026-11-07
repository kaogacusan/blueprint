// Shared look for the print files in /assets/print: brand colors, the facts, fonts, logos, grid, QR, selection box.
// Every size is in millimetres. A design is plain HTML + CSS that build.mjs prints to PDF and photographs to JPG.
import { readFileSync } from 'node:fs';
import QRCode from 'qrcode';

const here = (p) => new URL(p, import.meta.url);
const root = (p) => new URL(`../../${p}`, import.meta.url);

export const C = {
  navy: '#061a4d', core: '#0646c8', electric: '#006dff', sky: '#2bb8f0', cyan: '#3dd9f2', ice: '#b9eeff',
  paper: '#f8fafc', ink: '#101114', ink2: '#3b4255', ink3: '#6b7387', line: 'rgba(6,26,77,0.16)', warn: '#b4530a',
};
export const GRAD = `linear-gradient(100deg, ${C.core} 0%, ${C.electric} 55%, ${C.sky} 100%)`;

// The facts, word for word from the live site (index.html). Change them here and rebuild.
export const F = {
  tagline: ['Stand out on paper.', 'Stand out in person.'],
  what: 'A hands-on career workshop in 4 sessions.',
  promise: 'Bring what you’ve already done. Leave with a resume, LinkedIn, and intro that show it.',
  dates: 'Nov 10 to 13',
  datesShort: 'Nov 10–13',
  days: 'Tue to Fri',
  time: '5:30 to 7:00 PM',
  room: 'FA Annex 104',
  seats: 'Limited seats',
  regBy: 'Register by Nov 9',
  // pilot prices from Nov 7 (api/_lib.js PRICE)
  full: '₱799', fullLabel: 'Full Pass, all four sessions',
  single: '₱299', singleLabel: 'Single Session, per session',
  barkada: '₱1,999', barkadaLabel: 'Barkada: 3 Full Passes',
  pay: 'Sign up in a minute, then pay by GCash.',
  url: 'ateneoblueprint.vercel.app',
  sessions: [
    { n: '01', title: 'Sino Ka?', day: 'Tue, Nov 10', idea: 'Figure out what you want to be known for.' },
    { n: '02', title: 'Proof on Paper', day: 'Wed, Nov 11', idea: 'Show what you can do, on paper.' },
    { n: '03', title: 'Proof in Public', day: 'Thu, Nov 12', idea: 'Plan how people will see your work.' },
    { n: '04', title: 'Ako ’To', day: 'Fri, Nov 13', idea: 'Finish one post. Then show it to people.' },
  ],
  aaa: [
    ['Attention', 'The problem you faced.'],
    ['Approach', 'What you did about it.'],
    ['Arrival', 'What changed.'],
  ],
};
export const REGISTER_URL = `https://${F.url}/#register`;

// Three looks. Every asset has one version in each look, so the team can pick one look for the whole set.
export const LOOKS = [
  { id: 'v1', label: 'As rendered', about: 'The design on the 3D model now. Facts fixed to match the site.' },
  { id: 'v2', label: 'Drafting grid', about: 'Light paper, blue grid lines, and the selection box from the site’s first screen.' },
  { id: 'v3', label: 'Big type', about: 'Fewer words, bigger. Built to read from far away.' },
  { id: 'v4', label: 'Clean white', about: 'V1, cleaned up. White paper, navy type, one blue. No grid, no box.' },
  { id: 'v5', label: 'Solid blue', about: 'V2, cleaned up. Solid brand blue and white type. No grid, no box.' },
  { id: 'v6', label: 'Plain navy', about: 'V3, cleaned up. Navy, fewest words, one light-blue word.' },
];

// Colors for the clean looks (V4 to V6). No grid, no selection box, no gradient text, no mono labels.
// bg = page, ink = main text, sub = second text, hi = the one accent, rule = thin lines,
// mark / word = logo colors, arrow = arrows, tile = what a QR sits on.
export const CLEAN = {
  v4: { bg: '#fff', ink: C.navy, sub: C.ink2, hi: C.core, rule: 'rgba(6,26,77,0.18)', mark: 'grad', word: C.navy, arrow: C.core, tile: null },
  v5: { bg: C.core, ink: '#fff', sub: C.ice, hi: C.ice, rule: 'rgba(255,255,255,0.35)', mark: '#fff', word: '#fff', arrow: '#fff', tile: '#fff' },
  v6: { bg: C.navy, ink: '#fff', sub: C.ice, hi: C.cyan, rule: 'rgba(185,238,255,0.28)', mark: '#fff', word: '#fff', arrow: '#fff', tile: '#fff' },
};
// One margin for a whole piece: 8% of its short edge, in mm.
export const margin = (w, h) => Math.round(Math.min(w, h) * 0.08);

// ---------- logos ----------
const WORD_SVG = readFileSync(here('./wordmark.svg'), 'utf8');
const WORD_VB = WORD_SVG.match(/viewBox="([^"]+)"/)[1];
const WORD_G = WORD_SVG.slice(WORD_SVG.indexOf('<g'), WORD_SVG.lastIndexOf('</g>') + 4);
export const WORD_RATIO = (() => { const [, , w, h] = WORD_VB.split(' ').map(Number); return w / h; })();
const MARK_PNG = `data:image/png;base64,${readFileSync(root('assets/blueprint-mark.png')).toString('base64')}`;
export const MARK_RATIO = 272 / 400;

// The mark as one flat shape (for white or navy prints). Points measured from assets/blueprint-mark.png, corners rounded.
const MARK_PTS = [
  [122, -11, 30], [0, 65, 24], [0, 315, 26], [146, 404, 28], [270, 329, 24], [270, 187, 30],
  [133, 103, 8], [133, 202, 3], [229, 261.5, 5], [122, 326, 3],
];
const MARK_D = (() => {
  const n = MARK_PTS.length;
  const P = (i) => MARK_PTS[(i + n) % n];
  const f = (v) => +v.toFixed(2);
  let d = '';
  for (let i = 0; i < n; i++) {
    const [x, y, r] = P(i), [px, py] = P(i - 1), [nx, ny] = P(i + 1);
    const a = Math.hypot(px - x, py - y), b = Math.hypot(nx - x, ny - y);
    const ux = (px - x) / a, uy = (py - y) / a, vx = (nx - x) / b, vy = (ny - y) / b;
    const ang = Math.acos(Math.max(-1, Math.min(1, ux * vx + uy * vy)));
    const t = Math.min(r / Math.tan(ang / 2), a / 2, b / 2);
    const s = [x + ux * t, y + uy * t], e = [x + vx * t, y + vy * t];
    d += `${i ? 'L' : 'M'}${f(s[0])} ${f(s[1])}Q${f(x)} ${f(y)} ${f(e[0])} ${f(e[1])}`;
  }
  return `${d}Z`;
})();

// Wordmark, any flat color. h = height in mm.
export const word = (h, color = C.navy, style = '') =>
  `<svg class="lg" style="height:${h}mm;width:${(h * WORD_RATIO).toFixed(2)}mm;${style}" viewBox="${WORD_VB}" xmlns="http://www.w3.org/2000/svg">${WORD_G.replace('<g', `<g fill="${color}"`)}</svg>`;

// Mark. color = 'color' uses the real gradient art (PNG): fine up to about 4 cm tall.
// 'grad' draws the shape in the brand gradient: sharp at any size, use it on tarps.
// Any other value draws the flat shape in that color.
let gradN = 0;
export const mark = (h, color = 'color', style = '') => {
  const box = `class="lg" style="height:${h}mm;width:${(h * MARK_RATIO).toFixed(2)}mm;${style}"`;
  if (color === 'color') return `<img ${box} src="${MARK_PNG}" alt="" />`;
  let defs = '', fill = color;
  if (color === 'grad') {
    const id = `mg${++gradN}`;
    defs = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.sky}"/><stop offset="0.5" stop-color="${C.electric}"/><stop offset="1" stop-color="${C.core}"/></linearGradient></defs>`;
    fill = `url(#${id})`;
  }
  return `<svg ${box} viewBox="0 0 272 400" overflow="visible" xmlns="http://www.w3.org/2000/svg">${defs}<path fill="${fill}" d="${MARK_D}"/></svg>`;
};

// Mark + wordmark side by side, like the site nav. h = mark height.
export const lockup = (h, { markColor = 'color', wordColor = C.navy, style = '' } = {}) =>
  `<div class="lockup" style="gap:${(h * 0.22).toFixed(2)}mm;${style}">${mark(h, markColor)}${word(h * 0.5, wordColor)}</div>`;

// ---------- grid (vector lines, like the site's hero grid) ----------
export function grid(w, h, { step = 20, major = 5, color = C.core, minor = 0.07, majorOp = 0.16, width = 0.25, style = '' } = {}) {
  let l = '';
  for (let x = step, i = 1; x < w; x += step, i++) l += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke-opacity="${i % major ? minor : majorOp}"/>`;
  for (let y = step, i = 1; y < h; y += step, i++) l += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke-opacity="${i % major ? minor : majorOp}"/>`;
  return `<svg class="fill" style="${style}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><g stroke="${color}" stroke-width="${width}">${l}</g></svg>`;
}

// ---------- QR ----------
const qrCache = new Map();
// A real QR code. Default: the register section of the live site.
export async function qr(text = REGISTER_URL, size = 40, { color = C.navy, style = '' } = {}) {
  if (!qrCache.has(text)) qrCache.set(text, await QRCode.toString(text, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#000000ff', light: '#00000000' } }));
  const svg = qrCache.get(text).replace(/stroke="#000000"/g, `stroke="${color}"`).replace(/fill="#000000"/g, `fill="${color}"`);
  return `<div class="qr" style="width:${size}mm;height:${size}mm;${style}">${svg}</div>`;
}
// A stand-in QR for links we do not have yet. It says so on the print. Replace it before printing.
export function sampleQR(size = 40, { seed = 7, color = C.navy, label = 'Sample QR · replace before print', style = '' } = {}) {
  const n = 25, c = size / n;
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  let r = '';
  const inF = (i, j) => (i < 8 && j < 8) || (i > n - 9 && j < 8) || (i < 8 && j > n - 9);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (!inF(i, j) && rnd() > 0.52) r += `<rect x="${i}" y="${j}" width="1.02" height="1.02"/>`;
  const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
  return `<div class="qr qr--sample" style="width:${size}mm;height:${size}mm;${style}">
    <svg viewBox="0 0 ${n} ${n}" xmlns="http://www.w3.org/2000/svg"><g fill="${color}">${r}${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}</g></svg>
    <span class="qr__tag" style="font-size:${Math.max(2, c * 1.25).toFixed(2)}mm">${label}</span></div>`;
}

// ---------- the selection box from the site hero ----------
// Wraps a word. Everything scales with the word's font size. size = the small label under it, e.g. "W 412 × H 96".
export const sel = (text, { size = '', cls = '' } = {}) =>
  `<span class="sel ${cls}">${text}<i class="sel__h tl"></i><i class="sel__h tr"></i><i class="sel__h bl"></i><i class="sel__h br"></i>${size ? `<b class="sel__size">${size}</b>` : ''}</span>`;

// ---------- fonts + base CSS for every print page ----------
export const FONTS = 'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..800&family=JetBrains+Mono:wght@400;500;600&display=block';

export const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Inter,sans-serif;font-optical-sizing:auto;color:${C.ink};background:#fff;font-feature-settings:"kern","ss01","cv11"}
.pg{position:relative;overflow:hidden;break-after:page;page-break-after:always}
.pg:last-child{break-after:auto;page-break-after:auto}
.fill{position:absolute;inset:0;width:100%;height:100%}
.abs{position:absolute}
.lg{display:block;flex:none}
.lockup{display:flex;align-items:center}
.d{font-weight:700;letter-spacing:-0.045em;line-height:0.95}
.dd{font-weight:750;letter-spacing:-0.058em;line-height:0.92}
.t{font-weight:500;letter-spacing:-0.012em;line-height:1.3}
.m{font-family:"JetBrains Mono",monospace;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;line-height:1.2}
.g{background:${GRAD};-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:0.08em;margin-bottom:-0.08em}
.gl{background:linear-gradient(100deg,#6fb6ff,${C.cyan} 60%,${C.ice});-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:0.08em;margin-bottom:-0.08em}
.bg-grad{background:${GRAD}}
.bg-navy{background:${C.navy}}
.bg-paper{background:${C.paper}}
.nw{white-space:nowrap}
.qr{position:relative;flex:none}
.qr svg{display:block;width:100%;height:100%}
.qr--sample .qr__tag{position:absolute;left:50%;top:100%;transform:translate(-50%,35%);white-space:nowrap;font-family:"JetBrains Mono",monospace;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#fff;background:${C.warn};padding:0.25em 0.6em;border-radius:0.3em}
.sel{position:relative;display:inline-block;color:inherit}
.sel::before{content:"";position:absolute;inset:0.06em -0.06em -0.02em;border:0.016em solid ${C.electric};border-radius:0.03em;background:rgba(0,109,255,0.05)}
.sel__h{position:absolute;width:0.085em;height:0.085em;background:#fff;border:0.016em solid ${C.electric};border-radius:0.015em}
.sel__h.tl{left:-0.1em;top:0.02em}.sel__h.tr{right:-0.1em;top:0.02em}.sel__h.bl{left:-0.1em;bottom:-0.06em}.sel__h.br{right:-0.1em;bottom:-0.06em}
.sel__size{position:absolute;left:50%;top:calc(100% + 0.12em);transform:translateX(-50%);font:500 0.13em/1 "JetBrains Mono",monospace;letter-spacing:0.02em;color:#fff;background:${C.electric};padding:0.35em 0.7em;border-radius:0.4em;white-space:nowrap}
.sel--dark::before{background:rgba(255,255,255,0.06);border-color:${C.cyan}}
.sel--dark .sel__h{background:${C.navy};border-color:${C.cyan}}
.sel--dark .sel__size{background:${C.cyan};color:${C.navy}}
.rule{height:0;border-top:0.3mm dashed rgba(6,70,200,0.35)}
`;
