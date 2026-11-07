// /boothrender — our half of a shared 3 × 3 m tent on Red Brick Road (LAS 50 bazaar).
// Metres. X = across the tent (our half is x 0 to 1.5, on the left). Z = depth (0 = aisle side, -3 = back). Y = up.
// Kept lean on purpose: only what the booth needs, plus a header and a skirt so it looks finished.
import { THREE, canvasTexture } from '/render/stage.js';
import { mountPage } from '/render/page.js';
import { loadArt, mountAssets } from '/render/assets.js';
import { SHOP, mountShop } from '/boothrender/shop.js';

// ---------- sizes ----------
const HALF = 1.5;          // our width (official)
const DEPTH = 3;           // tent depth (official)
const EAVE = 2.0;          // eave height we ask for (Gelo's plan)
const PEAK = 3.05;         // assumed

const T = { x0: 0, x1: 0.9, z0: -0.85, z1: -0.25, h: 0.75 };          // selling table
const PU = { x: -0.36, z: 0.36, rot: -0.55, w: 0.6, h: 1.6 };          // standing banner, just outside the front-left leg

// ---------- the list ----------
const groups = [
  { code: 'tarp', label: 'Tarps and banner' },
  { code: 'table', label: 'On the table' },
  { code: 'furniture', label: 'Table and seat' },
  { code: 'kit', label: 'Hanging kit' },
  { code: 'space', label: 'The space' },
];

const zoomTable = { az: 0.42, el: 0.6, tx: 0.45, ty: 0.86, tz: -0.55, size: 1.05, width: 1.5, hide: ['dims'] };
const PRINCE = 'Same as Prince’s booth: order together.';

const pieces = [
  { id: 'header', num: 1, cat: 'tarp', name: 'Header tarp', size: '1.4 m × 0.6 m', where: 'Front roof bar, standing up above it, centred on our half',
    cost: [136, 316], basis: 'assumed',
    note: 'Logo, “Stand out on paper. Stand out in person.”, and what, when, where. Above the bar, not under it: under the bar it hangs to 1.4 m and hits heads. How to hang it is in “Set it up” below.',
    view: { az: 0.18, el: 0.12, tx: 0.75, ty: 2.15, tz: 0, size: 1.4, width: 2.1 } },
  { id: 'skirt', num: 2, cat: 'tarp', name: 'Table skirt tarp', size: '0.9 m × 0.7 m', where: 'Aisle face of the table, over the tablecloth',
    cost: [102, 237], basis: 'assumed',
    note: 'Logo, what and when, and the prices. Zip-tied to the front table legs through its 4 corner grommets.',
    view: { az: 0.1, el: 0.1, tx: 0.45, ty: 0.45, tz: -0.25, size: 1.1, width: 1.5 } },
  { id: 'pullup', num: 3, cat: 'tarp', name: 'Standing banner + stand', size: '60 × 160 cm, roll-up or X-stand', where: 'Outside the booth, just left of the front-left tent leg, angled up the road',
    cost: [650, 1300], basis: 'assumed', flag: PRINCE,
    note: `${PRINCE} Prince’s banner is 60 × 160 cm too, so one seller prints both; we also need a stand (theirs is borrowed). Zip-tie the stand’s pole to the tent leg: it tips over in wind. Keep it out of the e-jeep lane. Bring it in every night.`,
    view: { az: -0.3, el: 0.1, tx: -0.3, ty: 0.85, tz: 0.3, size: 1.9, width: 2.2 } },

  { id: 'regqr', num: 4, cat: 'table', name: 'Sign-up QR in an A5 acrylic stand', size: 'A5 print (148 × 210 mm) + A5 stand', where: 'Table, back row, left',
    cost: [139, 159], basis: 'assumed', flag: PRINCE,
    note: `${PRINCE} The stand is Prince’s ₱119 A5 acrylic stand. The QR opens the register form on the site, which takes the payment, so no GCash sign is needed. Test it on 2 phones.`, view: zoomTable },
  { id: 'card', num: 5, cat: 'table', name: 'Workshop card in an A4 acrylic stand', size: 'A4 print (210 × 297 mm) + A4 stand', where: 'Table, back row, right',
    cost: [170, 260], basis: 'assumed',
    note: 'Dates, time, room, and the three tickets: Full Pass ₱799, Single ₱299, Barkada of 3 ₱1,999. Ask the same seller for an A4 stand.', view: zoomTable },
  { id: 'bingo', num: 6, cat: 'table', name: 'Red Flag Bingo cards + pens', size: 'A6 cards, 2 sides, 4 per A4 sheet. 3 pens in a cup', where: 'Table, front row, left. The floater hands them out too',
    cost: [150, 300], basis: 'assumed',
    note: 'Replaces the AAA try-out cards and the flyers. People tick the resume red flags that are true for them; it starts the chat. The back has the dates, prices, and QR, so the card goes home as the flyer.', view: zoomTable },
  { id: 'signup', num: 7, cat: 'table', name: 'Sign-up sheet on a clipboard', size: 'A4 sheet: name, email, mobile, course, ticket', where: 'Table, front row, right',
    cost: [10, 25], basis: 'assumed',
    note: 'For people who do not want to scan. Same fields as the site form, plus which ticket. Clipboard from home.', view: zoomTable },

  { id: 'cloth', num: 8, cat: 'furniture', name: 'Tablecloth', size: 'About 150 × 230 cm, navy (or black)', where: 'Over the selling table, to the floor on the sides',
    cost: [105, 379], basis: 'assumed', flag: PRINCE,
    note: `${PRINCE} Prince’s booth wants navy or black too. It makes the table look finished, and hides the legs and the supply box.` },
  { id: 'table', num: 9, cat: 'furniture', name: 'Selling table', size: '0.9 m × 0.6 m, 0.75 m high (3 ft folding)', where: 'Front left, 0.25 m in from the front',
    basis: 'borrow',
    note: 'No tables or chairs are given (Gelo’s plan, not confirmed). Not a 6 ft table: it eats the walkway.' },
  { id: 'stool', num: 10, cat: 'furniture', name: 'Stool or chair', size: 'Any, low', where: 'Behind the table. Out when it is quiet',
    basis: 'home',
    note: 'Keep the walkway on the right clear.' },
  { id: 'box', num: 11, cat: 'furniture', name: 'Supply box', size: 'About 45 × 30 × 30 cm', where: 'Under the table, hidden by the cloth',
    basis: 'home',
    note: 'Spare bingo cards, sign-up sheets, pens, zip ties, tape, scissors, a power bank.' },
  { id: 'phone', num: null, cat: 'furniture', name: 'Phone + power bank', size: 'A phone with the sign-up page open', where: 'With the seller',
    basis: 'home',
    note: 'To sign people up on the spot. Do not count on a socket.' },

  { id: 'kit', num: 12, cat: 'kit', name: 'Hanging kit', size: '100 zip ties (8 in), 5 m rope, duct or masking tape, scissors', where: 'In the supply box',
    cost: [100, 200], basis: 'assumed', flag: PRINCE,
    note: `${PRINCE} Zip ties for the header, the skirt, and the banner pole; rope for the header’s top corners.` },

  { id: 'tent', num: 13, cat: 'space', name: 'Tent (our half)', size: '3 m × 3 m tent. Our half: 1.5 m × 3 m. Eave 2.0 m or more', where: 'Red Brick Road. Stall not given yet. We take one half',
    basis: 'provided',
    note: 'Two groups share one tent (official). Only the tent is given. Prince’s group paid ₱1,126.76 for theirs; check if we owe the same. Ask for the top leg setting: at a 1.8 m eave, a 5′9″ head has 2 cm.' },
];

// Quotes and order links (boothrender/shop.js) replace the guesses above.
pieces.forEach((p) => {
  const s = SHOP.items[p.id];
  if (s && s.total != null) { p.cost = Array.isArray(s.total) ? s.total : [s.total, s.total]; p.basis = 'quote'; }
});

const views = [
  { id: 'corner', label: 'Corner', az: 0.62, el: 0.5, tx: 0.95, ty: 1.0, tz: -1.2, size: 4.3, width: 5.4 },
  { id: 'aisle', label: 'From the aisle', az: 0, el: 0.09, tx: 1.2, ty: 1.35, tz: -1.5, size: 3.3, width: 4.4 },
  { id: 'side', label: 'Side', az: Math.PI / 2, el: 0.05, tx: 1.2, ty: 1.4, tz: -1.2, size: 3.5, width: 5.4 },
  { id: 'top', label: 'Top', az: 0, el: Math.PI / 2, tx: 1.3, ty: 0, tz: -1.15, size: 4.7, width: 4.6 },
  { id: 'table', label: 'Table setup', ...zoomTable },
];

const layers = [
  { name: 'dims', label: 'Sizes', mobileOff: true },
  { name: 'roof', label: 'Roof' },
  { name: 'people', label: 'People' },
];

// ---------- textures (the print on each piece) ----------
// The print comes from the print files (/assets/print/booth, made by `npm run print`).
// Pick a version in the list below the model and the texture changes.
const art = await loadArt('booth');

function makeTextures() {
  return {
    header: art.tex('header'),
    skirt: art.tex('skirt'),
    pullup: art.tex('pullup', { w: 512 }),
    regqr: art.tex('regqr', { w: 512 }),
    card: art.tex('card', { w: 512 }),
    bingo: art.tex('bingo', { w: 384 }),       // front of the card
    signup: art.tex('signup', { w: 512 }),
  };
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
  const tx = makeTextures();
  await art.ready();

  const L = { dims: S.layer('dims'), roof: S.layer('roof'), people: S.layer('people') };

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
  S.add(S.box(0, 0.002, -DEPTH, HALF, 0.008, 0, S.mat(0xf3f6fb, { opacity: 0.55 }), { edges: false, cast: false }));
  S.add(S.box(T.x1, 0.009, -DEPTH, HALF, 0.012, 0, S.mat(0xbfeff7, { opacity: 0.75 }), { edges: false, cast: false }));
  S.add(S.box(HALF, 0.002, -DEPTH, 3, 0.008, 0, S.mat(0xe4e9f2, { opacity: 0.62 }), { edges: false, cast: false }));
  S.tag([2.25, 0.02, -1.5], 'other group', { cls: 'tag--zone' });
  S.tag([1.2, 0.02, -2.55], 'walkway', { cls: 'tag--soft' });
  S.tag([1.5, 0.02, 1.95], 'aisle · Red Brick Road', { cls: 'tag--zone' });

  // tent frame (part 13)
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
    const [a, b] = dx < 0 ? [-3, 0] : [3, 6];
    [[a, 0], [b, 0], [b, -3], [a, -3]].forEach(([x, z]) => pts.push([x, 0, z], [x, EAVE, z]));
    pts.push([a, EAVE, 0], [b, EAVE, 0], [a, EAVE, -3], [b, EAVE, -3], [a, EAVE, 0], [a, EAVE, -3], [b, EAVE, 0], [b, EAVE, -3]);
    const pk = [(a + b) / 2, PEAK, -1.5];
    [[a, 0], [b, 0], [b, -3], [a, -3]].forEach(([x, z]) => pts.push([x, EAVE, z], pk));
    S.add(S.lines(pts, S.faintMat));
    S.tag([(a + b) / 2, 0.02, -2.6], 'next tent', { cls: 'tag--soft' });
  });

  // 1 header tarp, standing up above the front bar; its top corners tied back to the roof poles
  const header = S.panel({ w: 1.4, h: 0.6, map: tx.header });
  header.position.set(0.75, EAVE + 0.3, 0.02);
  S.put('header', header);
  const ropes = [[0.06, EAVE + 0.58, 0.01], [0.32, EAVE + 0.25, -0.3], [1.44, EAVE + 0.58, 0.01], [1.2, EAVE + 0.25, -0.3]];
  S.add(S.lines([ropes[0], ropes[1], ropes[2], ropes[3]], S.lineMat(0x3b4255, 1, 0.5)));

  // 9 selling table (under the cloth: only the top edge shows)
  const tableTop = S.mat(0xf4f1ea);
  const legM = S.mat(0x9aa3b5);
  const table = new THREE.Group();
  table.add(S.box(T.x0, T.h - 0.03, T.z0, T.x1, T.h, T.z1, tableTop));
  [[T.x0 + 0.04, T.z0 + 0.04], [T.x1 - 0.04, T.z0 + 0.04], [T.x0 + 0.04, T.z1 - 0.04], [T.x1 - 0.04, T.z1 - 0.04]]
    .forEach(([x, z]) => table.add(S.cyl(x, 0, z, 0.012, T.h - 0.03, legM)));
  S.put('table', table);
  // 8 tablecloth: top plus drop on all four sides, stopping 6 cm off the bricks
  const navyCloth = S.mat(0x0b2266);
  const cloth = new THREE.Group();
  const o = 0.012;
  cloth.add(S.box(T.x0 - o, T.h, T.z0 - o, T.x1 + o, T.h + 0.004, T.z1 + o, navyCloth, { cast: false }));
  cloth.add(S.box(T.x0 - o, 0.06, T.z1 + o - 0.004, T.x1 + o, T.h + 0.004, T.z1 + o, navyCloth));
  cloth.add(S.box(T.x0 - o, 0.06, T.z0 - o, T.x1 + o, T.h + 0.004, T.z0 - o + 0.004, navyCloth));
  cloth.add(S.box(T.x0 - o, 0.06, T.z0 - o, T.x0 - o + 0.004, T.h + 0.004, T.z1 + o, navyCloth));
  cloth.add(S.box(T.x1 + o - 0.004, 0.06, T.z0 - o, T.x1 + o, T.h + 0.004, T.z1 + o, navyCloth));
  S.put('cloth', cloth);
  const TOP = T.h + 0.004;   // things on the table sit on the cloth
  // 2 skirt, on the aisle face, over the cloth
  const skirt = S.panel({ w: 0.9, h: 0.7, map: tx.skirt });
  skirt.position.set(0.45, 0.05 + 0.35, T.z1 + o + 0.006);
  S.put('skirt', skirt);
  // 11 supply box, under the table (the cloth hides it)
  S.put('box', S.box(0.08, 0, -0.78, 0.53, 0.3, -0.48, S.mat(0xc79b6a)));

  // 4, 5 signs in clear acrylic stands: a clear foot, the print upright, a clear sheet each side
  const acrylic = S.mat(0xeef8ff, { opacity: 0.16 });
  const sign = (id, w, h, x, z, map) => {
    const g = new THREE.Group();
    g.add(S.box(-w / 2 - 0.01, 0, -0.04, w / 2 + 0.01, 0.012, 0.04, acrylic, { cast: false }));
    const up = new THREE.Group();
    const p = S.panel({ w, h, t: 0.0015, map, edges: false });
    p.position.y = h / 2 + 0.006;
    up.add(p);
    up.add(S.box(-w / 2 - 0.004, 0.006, 0.0015, w / 2 + 0.004, h + 0.012, 0.0045, acrylic, { cast: false }));
    up.add(S.box(-w / 2 - 0.004, 0.006, -0.0045, w / 2 + 0.004, h + 0.012, -0.0015, acrylic, { cast: false }));
    up.rotation.x = -0.12;
    up.position.y = 0.006;
    g.add(up);
    g.position.set(x, TOP, z);
    S.put(id, g);
  };
  sign('regqr', 0.148, 0.21, 0.2, -0.69, tx.regqr);
  sign('card', 0.21, 0.297, 0.62, -0.71, tx.card);

  // front row, flat
  const flat = (w, d, x, z, map, y = TOP, t = 0.003) => {
    const p = S.panel({ w, h: d, t, face: '+y', map });
    p.position.set(x, y + t / 2, z);
    return p;
  };
  // 6 bingo cards + pens
  const bingo = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const card = flat(0.105, 0.148, 0.12, -0.42, tx.bingo, TOP + i * 0.003, 0.003);
    card.rotation.y = (i - 1.5) * 0.04;
    bingo.add(card);
  }
  bingo.add(S.cyl(0.25, TOP, -0.33, 0.032, TOP + 0.1, S.mat(0x0646c8), { edges: true }));
  [[-0.012, 0.008, 0.12], [0.01, -0.01, -0.14], [0.004, 0.012, 0.05]].forEach(([dx, dz, tilt]) => {
    const pen = S.cyl(0, 0, 0, 0.005, 0.15, S.mat(0x101114));
    pen.position.set(0.25 + dx, TOP + 0.1, -0.33 + dz);
    pen.rotation.z = tilt;
    bingo.add(pen);
  });
  S.put('bingo', bingo);
  // 7 sign-up sheet on a clipboard
  const clip = new THREE.Group();
  clip.add(S.box(0.53, TOP, -0.6, 0.76, TOP + 0.004, -0.28, S.mat(0x8c6a4a)));
  clip.add(flat(0.21, 0.297, 0.645, -0.435, tx.signup, TOP + 0.004, 0.002));
  clip.add(S.box(0.61, TOP + 0.006, -0.6, 0.68, TOP + 0.02, -0.57, S.mat(0xb8c0cc)));
  clip.rotation.y = 0.05;
  S.put('signup', clip);

  // 10 stool
  const stool = new THREE.Group();
  stool.add(S.cyl(0.62, 0.42, -1.3, 0.15, 0.45, S.mat(0x0646c8), { edges: true }));
  [[-0.1, -0.1], [0.1, -0.1], [0.1, 0.1], [-0.1, 0.1]].forEach(([dx, dz]) => stool.add(S.cyl(0.62 + dx, 0, -1.3 + dz, 0.012, 0.42, legM)));
  S.put('stool', stool);

  // 3 standing banner, outside the front-left leg, turned to face up the road
  const pu = new THREE.Group();
  const alu = S.mat(0xc9d0db);
  pu.add(S.box(-PU.w / 2 - 0.01, 0, -0.09, PU.w / 2 + 0.01, 0.07, 0.03, alu));                       // base
  [-1, 1].forEach((s) => pu.add(S.box(s * 0.22 - 0.02, 0, -0.3, s * 0.22 + 0.02, 0.012, 0.16, alu))); // feet
  pu.add(S.cyl(0, 0.07, -0.055, 0.008, PU.h, alu));                                                   // pole
  const pf = S.panel({ w: PU.w, h: PU.h - 0.07, t: 0.003, map: tx.pullup });
  pf.position.set(0, 0.07 + (PU.h - 0.07) / 2, -0.03);
  pu.add(pf);
  pu.add(S.box(-PU.w / 2, PU.h, -0.04, PU.w / 2, PU.h + 0.016, -0.022, alu));                         // top rail
  pu.position.set(PU.x, 0, PU.z);
  pu.rotation.y = PU.rot;
  S.put('pullup', pu);

  // people: seller (5′9″) and the floater out in the aisle
  L.people.add(S.person(0.35, -1.22, { h: 1.7526 }));
  S.tag([0.35, 1.86, -1.22], 'seller, 5′9″', { cls: 'tag--soft', layer: 'people' });
  L.people.add(S.person(3.2, 0.9, { h: 1.7 }));
  L.people.add(S.box(3.14, 1.02, 0.98, 3.25, 1.024, 1.13, S.mat(0xffffff), { cast: false }));
  S.tag([3.2, 1.82, 0.9], 'floater, with bingo cards', { cls: 'tag--soft', layer: 'people' });

  // ---------- size lines ----------
  S.dim([0, 0, 0], [HALF, 0, 0], '1.5 m', { off: [0, 0, 0.32], tick: [0, 0, 1] });
  S.dim([3, 0, 0], [3, 0, -DEPTH], '3 m', { off: [0.32, 0, 0], tick: [1, 0, 0] });
  S.dim([3, 0, 0], [3, EAVE, 0], 'eave 2.0 m', { off: [0.3, 0, 0.3], tick: [1, 0, 0] });
  S.dim([3, 0, -1.5], [3, PEAK, -1.5], 'peak 3.05 m, assumed', { off: [0.75, 0, 0], tick: [1, 0, 0] });
  S.dim([0.05, EAVE + 0.6, 0.02], [1.45, EAVE + 0.6, 0.02], '1.4 m', { off: [0, 0.14, 0], tick: [0, 1, 0] });
  S.dim([1.45, EAVE, 0.02], [1.45, EAVE + 0.6, 0.02], '0.6 m', { off: [0.16, 0, 0], tick: [1, 0, 0] });
  S.dim([T.x1, 0.02, -2.75], [HALF, 0.02, -2.75], '0.6 m', { tick: [0, 0, 1] });
  S.dim([0, 0.01, 0], [0, 0.01, T.z1], '0.25 m', { off: [0.06, 0, 0], tick: [1, 0, 0] });

  // ---------- pins (numbers match the list) ----------
  const pins = {
    header: [1.25, EAVE + 0.45, 0.04], skirt: [0.78, 0.22, T.z1 + 0.03], pullup: [PU.x + 0.22, 1.35, PU.z + 0.16],
    regqr: [0.2, TOP + 0.26, -0.69], card: [0.62, TOP + 0.35, -0.71], bingo: [0.1, TOP + 0.05, -0.35], signup: [0.66, TOP + 0.04, -0.31],
    cloth: [0.05, 0.3, T.z1 + 0.02], table: [T.x1, 0.42, T.z0], stool: [0.78, 0.45, -1.3], box: [0.45, 0.2, T.z0 - 0.02],
    kit: [0.06, EAVE + 0.1, 0.02], tent: [3, EAVE - 0.25, 0],
  };
  pieces.forEach((p) => {
    if (!p.num || !pins[p.id]) return;
    S.pin(p.id, p.num, pins[p.id]);
  });
}

mountPage({ pieces, groups, views, layers, build, shadowBox: 6 }).then((stage) => {
  if (stage) art.onChange(() => { stage.dirty = true; });
  mountAssets(art, { pieces, stage });
});
mountShop(pieces);
