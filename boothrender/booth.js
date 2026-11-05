// /boothrender — our half of a shared 3 × 3 m tent on Red Brick Road (LAS 50 bazaar).
// Metres. X = across the tent (our half is x 0 to 1.5, on the left). Z = depth (0 = aisle side, -3 = back). Y = up.
import { THREE, COL, canvasTexture, loadImage, tint, FONT, FONT_TEXT, mockQR, wrap } from '/render/stage.js';
import { mountPage } from '/render/page.js';

// ---------- sizes ----------
const HALF = 1.5;          // our width (official)
const DEPTH = 3;           // tent depth (official)
const EAVE = 2.0;          // eave height we ask for (Gelo's plan)
const PEAK = 3.05;         // assumed
const WALK = 0.6;          // walkway inside our half
const SQFT = 10.76391041671;
const tarpCost = (w, h) => [Math.round(w * h * SQFT * 15), Math.round(w * h * SQFT * 20)];

const T = { x0: 0, x1: 0.9, z0: -0.85, z1: -0.25, h: 0.75 };          // selling table
const BT = { x0: 0, x1: 0.6, z0: -2.2, z1: -1.75, h: 0.7 };            // back table

// ---------- the list ----------
const groups = [
  { code: 'tarp', label: 'Tarpaulins' },
  { code: 'board', label: 'Sintra boards' },
  { code: 'paper', label: 'Paper' },
  { code: 'fabric', label: 'Curtains' },
  { code: 'furniture', label: 'Furniture' },
  { code: 'home', label: 'From home' },
  { code: 'kit', label: 'Hanging kit' },
  { code: 'space', label: 'The space' },
];

const zoomTable = { az: 0.42, el: 0.6, tx: 0.45, ty: 0.86, tz: -0.55, size: 1.05, width: 1.5 };

const pieces = [
  { id: 'header', num: 1, cat: 'tarp', name: 'Header tarp', size: '1.4 m × 0.6 m', where: 'Front roof bar, above the eave, centred',
    cost: tarpCost(1.4, 0.6), basis: 'assumed',
    note: 'Logo and “Stand out on paper. Stand out in person.” Mount it above the bar. Hung under the bar, it hits heads. Grommets every 30 cm. Logo at least 15 cm tall, text at least 6 cm.',
    view: { az: 0.18, el: 0.12, tx: 0.75, ty: 2.15, tz: 0, size: 1.4, width: 2.1 } },
  { id: 'backdrop', num: 2, cat: 'tarp', name: 'Backdrop tarp', size: '1.5 m × 1.5 m', where: 'Back roof bar, behind the seller',
    cost: tarpCost(1.5, 1.5), basis: 'assumed',
    note: 'What Blueprint is, in four short lines, plus the date and room. At a 2.0 m eave, the bottom edge is 0.5 m off the floor. Grommets every 30 cm on the top edge.',
    view: { az: 0.05, el: 0.08, tx: 0.75, ty: 1.25, tz: -2.9, size: 1.9, width: 2.2 } },
  { id: 'skirt', num: 3, cat: 'tarp', name: 'Table skirt tarp', size: '0.9 m × 0.7 m', where: 'Aisle face of the table, cable-tied to the legs',
    cost: tarpCost(0.9, 0.7), basis: 'assumed',
    note: 'Hides the table legs and the stool. Logo plus “Career workshop · Nov 10”.',
    view: { az: 0.1, el: 0.1, tx: 0.45, ty: 0.45, tz: -0.25, size: 1.1, width: 1.5 } },
  { id: 'banner', num: 4, cat: 'tarp', name: 'Roaming banner', size: '2 ft × 3 ft', where: 'With the roamer in the aisle',
    cost: [90, 120], basis: 'listing',
    note: 'Top edge at the shoulder, about 1.4 m. It tells people where the booth is. It is not the booth wall.',
    view: { az: 0.25, el: 0.12, tx: 2.3, ty: 0.95, tz: 1.4, size: 1.7, width: 2 } },

  { id: 'regqr', num: 5, cat: 'board', name: 'Sign-up QR', size: 'A5 printed sintra, 3 mm. QR at least 10 cm', where: 'Table, back row, left',
    cost: [85, 173], basis: 'assumed',
    note: 'QR to the register form on the Blueprint site. A 10 cm QR scans from about 1 m. Test it on 2 phones before you print.', view: zoomTable },
  { id: 'card', num: 6, cat: 'board', name: 'Workshop card', size: 'A4 printed sintra, 3 mm', where: 'Table, back row, middle',
    cost: [85, 173], basis: 'listing',
    note: 'Nov 10 · 5:00–7:30 pm · FA Annex 104 · 26 seats. No price on it. The fee is told after sign-up (site rule).', view: zoomTable },
  { id: 'gcash', num: 7, cat: 'board', name: 'GCash QR', size: 'A5 printed sintra, 3 mm', where: 'Table, back row, right',
    cost: [85, 173], basis: 'assumed',
    note: 'Only if we take payment at the booth. QR from the GCash app, with the account name under it.', view: zoomTable },
  { id: 'easels', num: 8, cat: 'board', name: 'Easel backs', size: 'Three strips cut from one blank A4 sintra', where: 'Taped behind boards 5, 6, and 7',
    cost: [32, 50], basis: 'listing',
    note: 'A folded strip on the back so each board leans. A bought stand counts as a stand. Ask the team first.', view: zoomTable },

  { id: 'aaa', num: 9, cat: 'paper', name: 'AAA try-out cards + pens', size: 'A6 cards, one stack. 3 pens in a cup', where: 'Table, front row, left: the demo spot',
    basis: 'unquoted',
    note: 'The 1-minute demo. A visitor writes one resume bullet: Attention, Approach, Arrival. They keep the card.', view: zoomTable },
  { id: 'signup', num: 10, cat: 'paper', name: 'Sign-up sheet on a clipboard', size: 'A4 sheet: name, email, course, year', where: 'Table, front row, middle',
    basis: 'unquoted',
    note: 'For people who do not want to scan. Same fields as the site form. Clipboard from home.', view: zoomTable },
  { id: 'flyers', num: 11, cat: 'paper', name: 'Flyers', size: 'A6 stack (105 × 148 mm)', where: 'Table, front row, right. A handful with the roamer',
    basis: 'unquoted',
    note: 'Same four lines as the backdrop. Date and room on the back.', view: zoomTable },

  { id: 'side', num: 12, cat: 'fabric', name: 'Side curtain', size: 'About 3 m × 2 m cloth (a flat bedsheet)', where: 'Left wall, clipped to the left roof bar',
    basis: 'home',
    note: 'Plain white or navy. It hides the next tent and gives the booth a clean wall.' },
  { id: 'divider', num: 13, cat: 'fabric', name: 'Divider curtain', size: 'About 3 m × 1.5 m cloth', where: 'Between us and the other group, on a rope at 1.5 m',
    basis: 'home',
    note: 'The tent has no middle bar, so a rope carries it. Agree it with the other group first. They may bring it.' },

  { id: 'table', num: 14, cat: 'furniture', name: 'Selling table', size: '0.9 m × 0.6 m, 0.75 m high (3 ft folding)', where: 'Front left, 0.25 m in from the front',
    basis: 'borrow',
    note: 'No tables or chairs are given (Gelo’s plan: head organizer, 20 Oct, not confirmed). Not a 6 ft table. It eats the walkway.' },
  { id: 'backtable', num: 15, cat: 'furniture', name: 'Small back table', size: 'About 0.6 m × 0.45 m, 0.7 m high', where: 'Back left, supply box under it',
    basis: 'borrow',
    note: 'For the phone, power bank, kit, and extra flyers. It keeps the selling table clean. Wider than 0.6 m eats the walkway.' },
  { id: 'stool', num: 16, cat: 'furniture', name: 'Stool', size: 'About 0.3 m × 0.3 m, 0.45 m high', where: 'Behind the table. Out when it is quiet',
    basis: 'home',
    note: 'Low, so it slides out of the walkway. The booth runs 9 am to 4 pm.' },

  { id: 'box', num: 17, cat: 'home', name: 'Supply box', size: 'About 45 × 30 × 30 cm', where: 'Under the back table',
    basis: 'home',
    note: 'Extra flyers, AAA cards, pens, tape, and a spare sign-up sheet.' },
  { id: 'phone', num: 18, cat: 'home', name: 'Phone + power bank', size: 'A phone with the sign-up page open', where: 'Back table. In the seller’s hand to sign people up',
    basis: 'home',
    note: 'Do not count on a socket. Charge it from the power bank.' },
  { id: 'pouch', num: null, cat: 'home', name: 'Cash pouch', size: 'Belt bag', where: 'Worn by the seller',
    basis: 'home',
    note: 'Only if we take cash. Never on the selling table.' },

  { id: 'kit', num: 19, cat: 'kit', name: 'Hanging kit', size: '100 cable ties (8 in), 10 binder clips, 4 m rope, tape, scissors', where: 'In a pouch on the back table',
    cost: [30, 70], basis: 'listing',
    note: 'Ties for the three tarps, clips for the curtains, rope for the divider. Only the ties are a buy.' },

  { id: 'tent', num: 20, cat: 'space', name: 'Tent (our half)', size: '3 m × 3 m tent. Our half: 1.5 m × 3 m. Eave 2.0 m or more', where: 'Red Brick Road. Stall not given yet. We take one half',
    basis: 'provided',
    note: 'Two groups share one tent (official). Only the tent is given. Ask for the top leg setting: at a 1.8 m eave, a 5′9″ head has 2 cm.' },
];

const views = [
  { id: 'corner', label: 'Corner', az: 0.62, el: 0.5, tx: 1.15, ty: 1.15, tz: -1.35, size: 4.4, width: 5.4 },
  { id: 'aisle', label: 'From the aisle', az: 0, el: 0.09, tx: 1.5, ty: 1.4, tz: -1.5, size: 3.5, width: 4.3 },
  { id: 'side', label: 'Side', az: Math.PI / 2, el: 0.05, tx: 1.4, ty: 1.45, tz: -1.2, size: 3.6, width: 5.6 },
  { id: 'top', label: 'Top', az: 0, el: Math.PI / 2, tx: 1.45, ty: 0, tz: -1.15, size: 4.7, width: 4.4 },
  { id: 'table', label: 'Table setup', ...zoomTable },
];

const layers = [
  { name: 'dims', label: 'Sizes', mobileOff: true },
  { name: 'roof', label: 'Roof' },
  { name: 'curtains', label: 'Curtains' },
  { name: 'people', label: 'People' },
];

// ---------- textures (the print on each piece) ----------
const NAVY = '#061a4d', CORE = '#0646c8', ELEC = '#006dff';

function brandGrad(g, w, h) {
  const gr = g.createLinearGradient(0, 0, w, h * 0.4);
  gr.addColorStop(0, CORE); gr.addColorStop(0.55, ELEC); gr.addColorStop(1, '#2bb8f0');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}

function gridLines(g, w, h, step, color) {
  g.strokeStyle = color; g.lineWidth = 1.5;
  for (let x = step; x < w; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let y = step; y < h; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
}

function drawImg(g, img, x, y, h) { const w = (img.width / img.height) * h; g.drawImage(img, x, y, w, h); return w; }

function makeTextures({ mark, markW, word, wordW }) {
  const t = {};
  // 1 header: 1.4 × 0.6 m → 1400 × 600 (1 px = 1 mm)
  t.header = canvasTexture(1400, 600, (g, w, h) => {
    brandGrad(g, w, h);
    const mw = drawImg(g, markW, 90, 130, 340);
    const x = 90 + mw + 70;
    drawImg(g, wordW, x, 120, 170);
    g.fillStyle = '#fff';
    g.font = `600 72px ${FONT}`;
    g.fillText('Stand out on paper.', x, 385);
    g.fillText('Stand out in person.', x, 470);
  });
  // 2 backdrop: 1.5 × 1.5 m → 1200 × 1200 (1 px = 1.25 mm)
  t.backdrop = canvasTexture(1200, 1200, (g, w, h) => {
    g.fillStyle = '#f8fafc'; g.fillRect(0, 0, w, h);
    gridLines(g, w, h, 80, 'rgba(6,70,200,0.10)');
    drawImg(g, mark, 90, 80, 120);
    drawImg(g, word, 190, 118, 60);
    g.fillStyle = NAVY;
    g.font = `700 112px ${FONT}`;
    g.fillText('A hands-on', 90, 360);
    g.fillStyle = CORE;
    g.fillText('career workshop.', 90, 470);
    g.font = `600 58px ${FONT}`;
    g.fillStyle = NAVY;
    const lines = ['Bring what you’ve already done.', 'Leave with a resume, LinkedIn,', 'and intro that show it.'];
    lines.forEach((l, i) => g.fillText(l, 90, 620 + i * 78));
    // date strip
    g.fillStyle = NAVY; g.fillRect(90, 930, 1020, 150);
    g.fillStyle = '#fff'; g.font = `700 62px ${FONT}`;
    g.fillText('Nov 10 · 5:00–7:30 pm · FA Annex 104', 130, 1028);
  });
  // 3 skirt: 0.9 × 0.7 → 900 × 700
  t.skirt = canvasTexture(900, 700, (g, w, h) => {
    g.fillStyle = NAVY; g.fillRect(0, 0, w, h);
    gridLines(g, w, h, 70, 'rgba(185,238,255,0.08)');
    const ww = (wordW.width / wordW.height) * 150;
    drawImg(g, wordW, (w - ww) / 2, 200, 150);
    g.fillStyle = '#b9eeff'; g.font = `600 54px ${FONT}`; g.textAlign = 'center';
    g.fillText('Career workshop · Nov 10', w / 2, 470);
  });
  // 4 banner: 2 × 3 ft → 610 × 914
  t.banner = canvasTexture(610, 914, (g, w, h) => {
    brandGrad(g, w, h);
    drawImg(g, markW, 60, 60, 120);
    drawImg(g, wordW, 60, 230, 86);
    g.fillStyle = '#fff';
    g.font = `700 64px ${FONT}`;
    ['Career', 'workshop.'].forEach((l, i) => g.fillText(l, 60, 420 + i * 70));
    g.font = `600 38px ${FONT}`;
    ['Nov 10 · 5–7:30 pm', 'FA Annex 104'].forEach((l, i) => g.fillText(l, 60, 620 + i * 50));
    g.fillStyle = '#fff'; g.fillRect(60, 760, w - 120, 90);
    g.fillStyle = CORE; g.font = `700 38px ${FONT}`;
    g.fillText('Sign up at our booth →', 84, 818);
  });
  // 5 sign-up QR: A5 → 444 × 630
  t.regqr = canvasTexture(444, 630, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.fillStyle = NAVY; g.font = `700 62px ${FONT}`; g.textAlign = 'center';
    g.fillText('Sign up', w / 2, 100);
    mockQR(g, 72, 150, 300, 11);
    g.fillStyle = CORE; g.font = `600 30px ${FONT_TEXT}`;
    g.fillText('It takes a minute.', w / 2, 540);
  });
  // 6 workshop card: A4 → 630 × 891
  t.card = canvasTexture(630, 891, (g, w, h) => {
    g.fillStyle = NAVY; g.fillRect(0, 0, w, h);
    drawImg(g, markW, 56, 56, 90);
    g.fillStyle = '#b9eeff'; g.font = `600 30px ${FONT}`;
    g.fillText('CAREER WORKSHOP', 56, 230);
    g.fillStyle = '#fff'; g.font = `700 150px ${FONT}`;
    g.fillText('Nov 10', 50, 390);
    g.font = `600 44px ${FONT}`;
    ['Tuesday', '5:00–7:30 pm', 'FA Annex 104'].forEach((l, i) => g.fillText(l, 56, 480 + i * 62));
    g.fillStyle = ELEC; g.fillRect(56, 720, 300, 84);
    g.fillStyle = '#fff'; g.font = `700 42px ${FONT}`;
    g.fillText('26 seats', 84, 776);
  });
  // 7 GCash QR: A5
  t.gcash = canvasTexture(444, 630, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.fillStyle = NAVY; g.font = `700 54px ${FONT}`; g.textAlign = 'center';
    g.fillText('Pay with GCash', w / 2, 96);
    mockQR(g, 72, 150, 300, 29);
    g.fillStyle = '#6b7387'; g.font = `600 28px ${FONT_TEXT}`;
    g.fillText('Account name here', w / 2, 540);
  });
  // 9 AAA card: A6 lying flat
  t.aaa = canvasTexture(315, 444, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.fillStyle = CORE; g.fillRect(0, 0, w, 70);
    g.fillStyle = '#fff'; g.font = `700 34px ${FONT}`; g.fillText('AAA Card', 24, 48);
    g.fillStyle = NAVY; g.font = `700 26px ${FONT}`;
    ['Attention', 'Approach', 'Arrival'].forEach((l, i) => {
      g.fillText(l, 24, 130 + i * 110);
      g.strokeStyle = 'rgba(6,26,77,0.25)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(24, 165 + i * 110); g.lineTo(w - 24, 165 + i * 110); g.stroke();
    });
  });
  // 10 sign-up sheet
  t.signup = canvasTexture(420, 594, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.fillStyle = NAVY; g.font = `700 30px ${FONT}`; g.fillText('Sign-up sheet', 28, 92);
    g.font = `600 15px ${FONT_TEXT}`; g.fillStyle = '#6b7387';
    ['Name', 'Email', 'Course', 'Year'].forEach((l, i) => g.fillText(l, 28 + i * 98, 140));
    g.strokeStyle = 'rgba(6,26,77,0.2)'; g.lineWidth = 2;
    for (let y = 170; y < h - 30; y += 36) { g.beginPath(); g.moveTo(28, y); g.lineTo(w - 28, y); g.stroke(); }
  });
  // 11 flyer
  t.flyer = canvasTexture(315, 444, (g, w, h) => {
    brandGrad(g, w, h);
    drawImg(g, wordW, 26, 40, 46);
    g.fillStyle = '#fff'; g.font = `700 40px ${FONT}`;
    wrap(g, 'A hands-on career workshop.', w - 52).forEach((l, i) => g.fillText(l, 26, 190 + i * 46));
    g.font = `600 22px ${FONT}`;
    g.fillText('Nov 10 · FA Annex 104', 26, 400);
  });
  return t;
}

function brickTexture() {
  // Red Brick Road: running bond, 200 × 100 mm bricks. Texture covers 1.6 m × 1.6 m.
  const tex = canvasTexture(1024, 1024, (g, w, h) => {
    g.fillStyle = '#c9b2a0'; g.fillRect(0, 0, w, h);
    const bw = 128, bh = 64, m = 4;
    let s = 3;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let r = 0; r < h / bh; r++) {
      const off = r % 2 ? bw / 2 : 0;
      for (let c = -1; c < w / bw + 1; c++) {
        const l = 34 + rnd() * 10;
        const hue = 9 + rnd() * 8;
        g.fillStyle = `hsl(${hue} 52% ${l}%)`;
        g.fillRect(c * bw + off + m / 2, r * bh + m / 2, bw - m, bh - m);
      }
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ---------- the model ----------
async function build(S) {
  await Promise.all([
    document.fonts.load(`700 40px ${FONT}`).catch(() => {}),
    document.fonts.load(`600 40px ${FONT}`).catch(() => {}),
    document.fonts.ready,
  ]);
  const [mark, word] = await Promise.all([loadImage('/assets/blueprint-mark.png'), loadImage('/assets/blueprint-wordmark.png')]);
  const art = { mark, word, markW: tint(mark, '#ffffff'), wordW: tint(word, '#ffffff') };
  const tx = makeTextures(art);

  const L = { dims: S.layer('dims'), roof: S.layer('roof'), curtains: S.layer('curtains'), people: S.layer('people') };

  // ground: Red Brick Road
  const bricks = brickTexture();
  const gw = 12, gd = 9;
  bricks.repeat.set(gw / 1.6, gd / 1.6);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(gw, gd), S.mat(0xffffff, { map: bricks }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(1.5, 0, -0.5);
  ground.receiveShadow = true;
  S.add(ground);
  // fade the far ground edges into the page
  const fade = canvasTexture(512, 512, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w * 0.5);
    gr.addColorStop(0, 'rgba(248,250,252,0)'); gr.addColorStop(1, 'rgba(244,248,255,1)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const fadeM = new THREE.Mesh(new THREE.PlaneGeometry(gw + 0.02, gd + 0.02), new THREE.MeshBasicMaterial({ map: fade, transparent: true, depthWrite: false }));
  fadeM.rotation.x = -Math.PI / 2;
  fadeM.position.set(1.5, 0.002, -0.5);
  S.add(fadeM);

  // our floor and the other group's floor
  const ours = S.box(0, 0.002, -DEPTH, HALF, 0.008, 0, S.mat(0xf3f6fb, { opacity: 0.55 }), { edges: false, cast: false });
  S.add(ours);
  const walk = S.box(T.x1, 0.009, -DEPTH, HALF, 0.012, 0, S.mat(0xbfeff7, { opacity: 0.75 }), { edges: false, cast: false });
  S.add(walk);
  const other = S.box(HALF, 0.002, -DEPTH, 3, 0.008, 0, S.mat(0xe4e9f2, { opacity: 0.62 }), { edges: false, cast: false });
  S.add(other);
  S.tag([2.25, 0.02, -1.5], 'other group', { cls: 'tag--zone' });
  S.tag([1.2, 0.02, -2.55], 'walkway', { cls: 'tag--soft' });
  S.tag([1.5, 0.02, 1.95], 'aisle · Red Brick Road', { cls: 'tag--zone' });

  // tent frame (part 20)
  const steel = S.mat(0xe9edf3);
  const frame = new THREE.Group();
  const leg = 0.035;
  [[0, 0], [3, 0], [3, -3], [0, -3]].forEach(([x, z]) => frame.add(S.box(x - leg / 2, 0, z - leg / 2, x + leg / 2, EAVE, z + leg / 2, steel)));
  const bar = 0.03;
  frame.add(S.box(0, EAVE - bar, -bar / 2, 3, EAVE, bar / 2, steel));
  frame.add(S.box(0, EAVE - bar, -3 - bar / 2, 3, EAVE, -3 + bar / 2, steel));
  frame.add(S.box(-bar / 2, EAVE - bar, -3, bar / 2, EAVE, 0, steel));
  frame.add(S.box(3 - bar / 2, EAVE - bar, -3, 3 + bar / 2, EAVE, 0, steel));
  S.put('tent', frame);
  // roof canopy
  const P = [1.5, PEAK, -1.5];
  const c = [[0, EAVE, 0], [3, EAVE, 0], [3, EAVE, -3], [0, EAVE, -3]];
  const tri = [];
  for (let i = 0; i < 4; i++) tri.push(...c[i], ...c[(i + 1) % 4], ...P);
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3));
  rg.computeVertexNormals();
  const roof = new THREE.Mesh(rg, S.mat(0xffffff, { opacity: 0.2, side: THREE.DoubleSide }));
  roof.userData.noPick = true;
  S.edges(roof, 10);
  L.roof.add(roof);

  // neighbour tents, as faint frames, so the row reads
  [-3, 3].forEach((dx) => {
    const pts = [];
    const cx = dx < 0 ? [-3, 0] : [3, 6];
    const [a, b] = cx;
    [[a, 0], [b, 0], [b, -3], [a, -3]].forEach(([x, z]) => pts.push([x, 0, z], [x, EAVE, z]));
    pts.push([a, EAVE, 0], [b, EAVE, 0], [a, EAVE, -3], [b, EAVE, -3], [a, EAVE, 0], [a, EAVE, -3], [b, EAVE, 0], [b, EAVE, -3]);
    const pk = [(a + b) / 2, PEAK, -1.5];
    [[a, 0], [b, 0], [b, -3], [a, -3]].forEach(([x, z]) => pts.push([x, EAVE, z], pk));
    S.add(S.lines(pts, S.faintMat));
    S.tag([(a + b) / 2, 0.02, -1.5], 'next tent', { cls: 'tag--soft' });
  });

  // 1 header tarp, above the front bar
  const header = S.panel({ w: 1.4, h: 0.6, map: tx.header });
  header.position.set(0.75, EAVE + 0.3, 0.02);
  S.put('header', header);
  // 2 backdrop tarp, from the back bar
  const backdrop = S.panel({ w: 1.5, h: 1.5, map: tx.backdrop });
  backdrop.position.set(0.75, EAVE - 0.75, -DEPTH + 0.03);
  S.put('backdrop', backdrop);

  // 14 selling table
  const tableTop = S.mat(0xf4f1ea);
  const legM = S.mat(0x9aa3b5);
  const table = new THREE.Group();
  table.add(S.box(T.x0, T.h - 0.03, T.z0, T.x1, T.h, T.z1, tableTop));
  [[T.x0 + 0.04, T.z0 + 0.04], [T.x1 - 0.04, T.z0 + 0.04], [T.x0 + 0.04, T.z1 - 0.04], [T.x1 - 0.04, T.z1 - 0.04]]
    .forEach(([x, z]) => table.add(S.cyl(x, 0, z, 0.012, T.h - 0.03, legM)));
  S.put('table', table);
  // 3 skirt, on the aisle face
  const skirt = S.panel({ w: 0.9, h: 0.7, map: tx.skirt });
  skirt.position.set(0.45, 0.05 + 0.35, T.z1 + 0.012);
  S.put('skirt', skirt);

  // table items: upright boards in the back row
  const board = (id, w, h, x, z, map) => {
    const g = new THREE.Group();
    const p = S.panel({ w, h, t: 0.004, map });
    p.position.y = h / 2;
    g.add(p);
    g.position.set(x, T.h, z);
    g.rotation.x = -0.2;
    S.put(id, g);
    return g;
  };
  board('regqr', 0.148, 0.21, 0.15, -0.68, tx.regqr);
  board('card', 0.21, 0.297, 0.45, -0.72, tx.card);
  board('gcash', 0.148, 0.21, 0.75, -0.68, tx.gcash);
  // 8 easel backs: thin strips behind each board
  const easels = new THREE.Group();
  [[0.15, -0.68, 0.16], [0.45, -0.72, 0.22], [0.75, -0.68, 0.16]].forEach(([x, z, hh]) => {
    const s = S.box(-0.03, 0, -0.004, 0.03, hh, 0.004, S.mat(0xe9eef6), { cast: false });
    const g = new THREE.Group();
    s.position.y = hh / 2;
    s.position.z = 0;
    g.add(s);
    g.position.set(x, T.h, z - 0.075);
    g.rotation.x = 0.45;
    easels.add(g);
  });
  S.put('easels', easels);

  // front row, flat
  const flat = (w, d, x, z, map, y = T.h, t = 0.003) => {
    const p = S.panel({ w, h: d, t, face: '+y', map });
    p.position.set(x, y + t / 2, z);
    return p;
  };
  const aaa = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const card = flat(0.105, 0.148, 0.14, -0.41, tx.aaa, T.h + i * 0.003, 0.003);
    card.rotation.y = (i - 1.5) * 0.04;
    aaa.add(card);
  }
  const cup = S.cyl(0.26, T.h, -0.36, 0.035, T.h + 0.1, S.mat(0x0646c8), { edges: true });
  aaa.add(cup);
  [[-0.012, 0.008, 0.12], [0.01, -0.01, -0.14], [0.004, 0.012, 0.05]].forEach(([dx, dz, tilt]) => {
    const pen = S.cyl(0, 0, 0, 0.005, 0.15, S.mat(0x101114));
    pen.position.set(0.26 + dx, T.h + 0.1, -0.36 + dz);
    pen.rotation.z = tilt;
    aaa.add(pen);
  });
  S.put('aaa', aaa);
  const clip = new THREE.Group();
  clip.add(S.box(0.33, T.h, -0.6, 0.56, T.h + 0.004, -0.28, S.mat(0x8c6a4a)));
  const sheet = flat(0.21, 0.297, 0.445, -0.435, tx.signup, T.h + 0.004, 0.002);
  clip.add(sheet);
  clip.add(S.box(0.41, T.h + 0.006, -0.6, 0.48, T.h + 0.02, -0.57, S.mat(0xb8c0cc)));
  clip.rotation.y = 0.06;
  S.put('signup', clip);
  const flyers = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const f = flat(0.105, 0.148, 0.76 + i * 0.002, -0.42, tx.flyer, T.h + i * 0.0025, 0.0025);
    f.rotation.y = -0.1 + i * 0.025;
    flyers.add(f);
  }
  S.put('flyers', flyers);

  // 15 back table + 17 supply box + 18 phone + 19 kit
  const bt = new THREE.Group();
  bt.add(S.box(BT.x0, BT.h - 0.03, BT.z0, BT.x1, BT.h, BT.z1, tableTop));
  [[BT.x0 + 0.03, BT.z0 + 0.03], [BT.x1 - 0.03, BT.z0 + 0.03], [BT.x0 + 0.03, BT.z1 - 0.03], [BT.x1 - 0.03, BT.z1 - 0.03]]
    .forEach(([x, z]) => bt.add(S.cyl(x, 0, z, 0.012, BT.h - 0.03, legM)));
  S.put('backtable', bt);
  S.put('box', S.box(0.06, 0, -2.15, 0.51, 0.3, -1.85, S.mat(0xc79b6a)));
  const phone = new THREE.Group();
  phone.add(S.box(0.08, BT.h, -2.05, 0.155, BT.h + 0.009, -1.89, S.mat(0x101114)));
  phone.add(S.box(0.19, BT.h, -2.06, 0.26, BT.h + 0.02, -1.92, S.mat(0x3b4255)));
  S.put('phone', phone);
  S.put('kit', S.box(0.33, BT.h, -2.1, 0.52, BT.h + 0.07, -1.95, S.mat(0x3dd9f2)));
  // 16 stool
  const stool = new THREE.Group();
  stool.add(S.cyl(0.74, 0.42, -1.3, 0.15, 0.45, S.mat(0x0646c8), { edges: true }));
  [[-0.1, -0.1], [0.1, -0.1], [0.1, 0.1], [-0.1, 0.1]].forEach(([dx, dz]) => stool.add(S.cyl(0.74 + dx, 0, -1.3 + dz, 0.012, 0.42, legM)));
  S.put('stool', stool);

  // 12 side curtain, 13 divider (see-through so the inside shows)
  const cloth = (op) => S.mat(0xf2f5ff, { opacity: op, side: THREE.DoubleSide });
  const side = S.box(0.005, 0, -DEPTH, 0.015, EAVE - 0.02, 0, cloth(0.3), { cast: false });
  side.userData.noPick = false;
  S.put('side', side, L.curtains);
  const div = S.box(HALF - 0.005, 0, -DEPTH, HALF + 0.005, 1.5, 0, cloth(0.26), { cast: false });
  S.put('divider', div, L.curtains);
  L.curtains.add(S.lines([[HALF, 1.5, 0], [HALF, 1.5, -DEPTH]], S.dimMat));

  // people: seller (5′9″) and roamer with the banner
  const seller = S.person(0.45, -1.25, { h: 1.7526 });
  L.people.add(seller);
  S.tag([0.45, 1.86, -1.25], 'seller, 5′9″', { cls: 'tag--soft', layer: 'people' });
  const roamer = S.person(2.3, 1.15, { h: 1.7 });
  L.people.add(roamer);
  S.tag([2.3, 1.82, 1.15], 'roamer', { cls: 'tag--soft', layer: 'people' });
  // 4 banner, carried in front of the roamer
  const bannerW = 2 * 0.3048, bannerH = 3 * 0.3048;
  const banner = S.panel({ w: bannerW, h: bannerH, map: tx.banner });
  banner.position.set(2.3, 1.4 - bannerH / 2, 1.42);
  S.put('banner', banner);
  const poles = new THREE.Group();
  [-1, 1].forEach((sgn) => poles.add(S.cyl(2.3 + sgn * (bannerW / 2 + 0.01), 1.4 - bannerH - 0.05, 1.43, 0.008, 1.45, S.mat(0x8c6a4a))));
  S.put('banner', poles);

  // ---------- size lines ----------
  S.dim([0, 0, 0], [HALF, 0, 0], '1.5 m', { off: [0, 0, 0.32], tick: [0, 0, 1] });
  S.dim([0, 0, 0], [0, 0, -DEPTH], '3 m', { off: [-0.32, 0, 0], tick: [1, 0, 0] });
  S.dim([0, 0, 0], [0, EAVE, 0], 'eave 2.0 m', { off: [-0.3, 0, 0.3], tick: [1, 0, 0] });
  S.dim([3, 0, -1.5], [3, PEAK, -1.5], 'peak 3.05 m, assumed', { off: [0.75, 0, 0], tick: [1, 0, 0] });
  S.dim([0.05, EAVE + 0.6, 0.02], [1.45, EAVE + 0.6, 0.02], '1.4 m', { off: [0, 0.14, 0], tick: [0, 1, 0] });
  S.dim([1.45, EAVE, 0.02], [1.45, EAVE + 0.6, 0.02], '0.6 m', { off: [0.16, 0, 0], tick: [1, 0, 0] });
  S.dim([0, 0.5, -DEPTH + 0.03], [0, EAVE, -DEPTH + 0.03], '1.5 m', { off: [-0.2, 0, 0], tick: [1, 0, 0] });
  S.dim([T.x1, 0.02, -2.75], [HALF, 0.02, -2.75], '0.6 m', { tick: [0, 0, 1] });
  S.dim([0, 0.01, 0], [0, 0.01, T.z1], '0.25 m', { off: [0.06, 0, 0], tick: [1, 0, 0] });

  // ---------- pins (numbers match the list) ----------
  const pins = {
    header: [1.25, EAVE + 0.45, 0.04], backdrop: [1.25, 1.75, -DEPTH + 0.05], skirt: [0.78, 0.22, T.z1 + 0.03],
    banner: [2.52, 1.25, 1.45], regqr: [0.15, T.h + 0.25, -0.7], card: [0.45, T.h + 0.33, -0.76], gcash: [0.75, T.h + 0.25, -0.7],
    easels: [0.3, T.h + 0.08, -0.86], aaa: [0.12, T.h + 0.05, -0.33], signup: [0.47, T.h + 0.04, -0.33],
    flyers: [0.8, T.h + 0.05, -0.33], side: [0.01, 0.55, -2.65], divider: [HALF, 1.25, -2.3],
    table: [T.x1, 0.42, T.z0], backtable: [0.55, BT.h, -1.78], stool: [0.88, 0.45, -1.3],
    box: [0.45, 0.3, -1.86], phone: [0.12, BT.h + 0.04, -1.97], kit: [0.42, BT.h + 0.1, -2.02], tent: [3, EAVE - 0.25, 0],
  };
  pieces.forEach((p) => {
    if (!p.num || !pins[p.id]) return;
    const layer = p.cat === 'fabric' ? 'curtains' : 'pins';
    S.pin(p.id, p.num, pins[p.id], layer);
  });
}

mountPage({ pieces, groups, views, layers, build, shadowBox: 6 });
