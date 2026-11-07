// /boothrender — our half of a shared 3 × 3 m tent on Red Brick Road (LAS 50 bazaar).
// Metres. X = across the tent (our half is x 0 to 1.5, on the left). Z = depth (0 = aisle side, -3 = back). Y = up.
import { THREE, canvasTexture } from '/render/stage.js';
import { mountPage } from '/render/page.js';
import { loadArt, mountAssets } from '/render/assets.js';
import { SHOP, mountShop } from '/boothrender/shop.js';

// ---------- sizes ----------
const HALF = 1.5;          // our width (official)
const DEPTH = 3;           // tent depth (official)
const EAVE = 2.0;          // eave height we ask for (Gelo's plan)
const PEAK = 3.05;         // assumed
const SQFT = 10.76391041671;
const tarpCost = (w, h) => [Math.round(w * h * SQFT * 15), Math.round(w * h * SQFT * 20)];

const T = { x0: 0, x1: 0.9, z0: -0.85, z1: -0.25, h: 0.75 };          // selling table
const BT = { x0: 0, x1: 0.6, z0: -2.2, z1: -1.75, h: 0.7 };            // back table
const PU = { x: -0.49, z: 0.36, rot: -0.55, w: 0.84, h: 1.98 };          // pull-up banner, just outside the front-left leg
const BOARD_LEAN = 0.2;                                                 // boards lean back this much (rad)

// ---------- the list ----------
const groups = [
  { code: 'tarp', label: 'Tarps and the pull-up' },
  { code: 'board', label: 'Sintra boards' },
  { code: 'paper', label: 'Paper' },
  { code: 'decor', label: 'Cheap glow-up' },
  { code: 'fabric', label: 'Curtains' },
  { code: 'furniture', label: 'Furniture' },
  { code: 'home', label: 'From home' },
  { code: 'kit', label: 'Hanging kit' },
  { code: 'space', label: 'The space' },
];

const zoomTable = { az: 0.42, el: 0.6, tx: 0.45, ty: 0.86, tz: -0.55, size: 1.05, width: 1.5, hide: ['dims'] };

const pieces = [
  { id: 'header', num: 1, cat: 'tarp', name: 'Header tarp', size: '1.4 m × 0.6 m', where: 'Front roof bar, above the eave, centred',
    cost: tarpCost(1.4, 0.6), basis: 'assumed',
    note: 'Logo, “career glow-up workshop”, the dates, and a FREE CANDY sticker. Mount it above the bar. Hung under the bar, it hits heads. Grommets every 30 cm.',
    view: { az: 0.18, el: 0.12, tx: 0.75, ty: 2.15, tz: 0, size: 1.4, width: 2.1 } },
  { id: 'backdrop', num: 2, cat: 'tarp', name: 'Backdrop tarp', size: '1.5 m × 1.5 m', where: 'Back roof bar, behind the seller',
    cost: tarpCost(1.5, 1.5), basis: 'assumed',
    note: '“Your resume is giving Microsoft Word 2007.” A roasted resume on the right, where no one stands in front of it. Barkada deal on the navy strip. Bottom edge 0.5 m off the floor.',
    view: { az: 0.05, el: 0.08, tx: 0.75, ty: 1.25, tz: -2.9, size: 1.9, width: 2.2 } },
  { id: 'skirt', num: 3, cat: 'tarp', name: 'Table skirt tarp', size: '0.9 m × 0.7 m', where: 'Aisle face of the table, over the tablecloth, cable-tied to the legs',
    cost: tarpCost(0.9, 0.7), basis: 'assumed',
    note: '“Free candy. If you survive our Red Flag Bingo.” Knee height, read by people walking past.',
    view: { az: 0.1, el: 0.1, tx: 0.45, ty: 0.45, tz: -0.25, size: 1.1, width: 1.5 } },
  { id: 'pullup', num: 4, cat: 'tarp', name: 'Pull-up banner', size: '2.75 × 6.5 ft (84 × 198 cm), roll-up stand', where: 'Outside the booth, just left of the front-left tent leg, angled up the road',
    cost: [900, 1500], basis: 'assumed',
    note: '“Delulu is not a career plan. Blueprint is.” Replaces the roaming banner. It stands outside our half so it never hides the table or the backdrop; it takes about 0.7 m of the corner next to us, so tell that group. Cable-tie the pole to the tent leg: pull-ups tip over in wind. Keep it out of the e-jeep lane. Bring it in at 4 pm.',
    view: { az: -0.3, el: 0.1, tx: -0.3, ty: 1.05, tz: 0.3, size: 2.3, width: 2.6 } },

  { id: 'regqr', num: 5, cat: 'board', name: 'Sign-up QR', size: 'A5 printed sintra, 3 mm. QR at least 10 cm', where: 'Table, back row, left',
    cost: [85, 173], basis: 'assumed',
    note: '“Shoot your shot.” QR to the register form on the Blueprint site. A 10 cm QR scans from about 1 m. Test it on 2 phones before you print.', view: zoomTable },
  { id: 'card', num: 6, cat: 'board', name: 'Workshop card', size: 'A4 printed sintra, 3 mm', where: 'Table, back row, middle',
    cost: [85, 173], basis: 'listing',
    note: 'The 4 sessions, when and where, and all three tickets: Full Pass ₱799, Single ₱299, Barkada of 3 ₱1,999.', view: zoomTable },
  { id: 'gcash', num: 7, cat: 'board', name: 'GCash QR', size: 'A5 printed sintra, 3 mm', where: 'Table, back row, right',
    cost: [85, 173], basis: 'assumed',
    note: 'Only if we take payment at the booth. QR from the GCash app, with the account name under it.', view: zoomTable },
  { id: 'easels', num: 8, cat: 'board', name: 'Easel backs', size: 'One per board. InterMatrix’s table-top sintra stands come with them', where: 'Behind boards 5, 6, and 7',
    cost: [32, 50], basis: 'listing',
    note: 'A strip hinged about two-thirds up the back of each board, with its foot about 7 cm behind. Each board leans back about 11°.', view: { az: 2.3, el: 0.34, tx: 0.45, ty: 0.86, tz: -0.66, size: 0.6, width: 1.1, hide: ['people', 'dims', 'curtains'] } },

  { id: 'bingo', num: 9, cat: 'paper', name: 'Red Flag Bingo cards + pens', size: 'A6 cards, 2 sides, one stack. 3 pens in a cup', where: 'Table, front row, left: the game spot',
    cost: [450, 900], basis: 'assumed',
    note: 'Replaces the AAA try-out cards. People tick the resume red flags that are true for them. 3 in a row gets candy; 5 or more starts the chat. The back has the QR, so the card goes home as a flyer.', view: zoomTable },
  { id: 'signup', num: 10, cat: 'paper', name: 'Sign-up sheet on a clipboard', size: 'A4 sheet: name, email, mobile, course, ticket', where: 'Back table. The seller hands it over',
    cost: [10, 25], basis: 'assumed',
    note: 'For people who do not want to scan. Same fields as the site form, plus which ticket. Off the selling table so it stays clean.' },
  { id: 'flyers', num: 11, cat: 'paper', name: 'Flyers', size: 'A6 stack (105 × 148 mm), 2 sides', where: 'Table, front row, right. A handful with the roamer',
    cost: [500, 1000], basis: 'assumed',
    note: 'Front: “He’s a 10 but his resume is 3 pages.” Back: the 4 sessions, all three tickets, and the QR.', view: zoomTable },

  { id: 'cloth', num: 12, cat: 'decor', name: 'Tablecloth', size: 'About 150 × 230 cm, navy (or white)', where: 'Over the selling table, to the floor on the sides',
    cost: [150, 300], basis: 'assumed',
    note: 'The cheapest way to make a booth look done. Hides the table legs and the boxes. The skirt tarp goes on top at the front.' },
  { id: 'lights', num: 13, cat: 'decor', name: 'Fairy lights', size: '2 strings, 5 to 10 m, warm white, battery (AA)', where: 'Along the front bar and the back bar, clipped with binder clips',
    cost: [100, 300], basis: 'assumed',
    note: 'Subtle at noon under the tent, but they glow in the shade and in every photo, and they make it look like a place to hang out. Spare batteries in the supply box.' },
  { id: 'balloons', num: 14, cat: 'decor', name: 'Balloons', size: '12 in, blue + white, about 10 up at a time', where: 'Two bunches, tied at the front-left leg and at the front bar by the divider, floating out to the sides',
    cost: [100, 200], basis: 'assumed',
    note: 'Seen from far down the road, over people’s heads. Tie them tight at the bar. Bring the pump; blow up new ones each morning.' },
  { id: 'candy', num: 15, cat: 'decor', name: 'Candy jar + sign', size: 'Clear jar, about 200 pieces. A6 sign (print file)', where: 'Table, front row, middle',
    cost: [250, 450], basis: 'assumed',
    note: '“Free candy for your last 3 brain cells this sem.” The oldest booth trick because it works: people stop, then they read. Bingo winners get it first.', view: zoomTable },
  { id: 'frame', num: 16, cat: 'decor', name: 'Photo frame prop', size: '60 × 80 cm, print on tarp glued to carton (or 5 mm sintra), 38 cm circle cut out', where: 'Leans on the side curtain. The roamer uses it out front',
    cost: [400, 800], basis: 'assumed',
    note: 'A fake profile page: “Main Character ✓ · Not delulu. Has a plan.” People put their face in the #NOTDELULU ring, take a photo, and post it. Free reach.',
    view: { az: 1.25, el: 0.18, tx: 0.1, ty: 0.55, tz: -1.4, size: 1.2, width: 1.6 } },

  { id: 'side', num: 17, cat: 'fabric', name: 'Side curtain', size: 'About 3 m × 2 m cloth (a flat bedsheet)', where: 'Left wall, clipped to the left roof bar',
    basis: 'home',
    note: 'Plain white or navy. It hides the next tent and gives the booth a clean wall.' },
  { id: 'divider', num: 18, cat: 'fabric', name: 'Divider curtain', size: 'About 3 m × 1.5 m cloth', where: 'Between us and the other group, on a rope at 1.5 m',
    basis: 'home',
    note: 'The tent has no middle bar, so a rope carries it. Agree it with the other group first. They may bring it.' },

  { id: 'table', num: 19, cat: 'furniture', name: 'Selling table', size: '0.9 m × 0.6 m, 0.75 m high (3 ft folding)', where: 'Front left, 0.25 m in from the front',
    basis: 'borrow',
    note: 'No tables or chairs are given (Gelo’s plan: head organizer, 20 Oct, not confirmed). Not a 6 ft table. It eats the walkway.' },
  { id: 'backtable', num: 20, cat: 'furniture', name: 'Small back table', size: 'About 0.6 m × 0.45 m, 0.7 m high', where: 'Back left, supply box under it',
    basis: 'borrow',
    note: 'For the clipboard, phone, power bank, and kit. It keeps the selling table clean. Wider than 0.6 m eats the walkway.' },
  { id: 'stool', num: 21, cat: 'furniture', name: 'Stool', size: 'About 0.3 m × 0.3 m, 0.45 m high', where: 'Behind the table. Out when it is quiet',
    basis: 'home',
    note: 'Low, so it slides out of the walkway. The booth runs 9 am to 4 pm.' },

  { id: 'box', num: 22, cat: 'home', name: 'Supply box', size: 'About 45 × 30 × 30 cm', where: 'Under the back table',
    basis: 'home',
    note: 'Extra flyers, bingo cards, candy, pens, batteries, tape, and a spare sign-up sheet.' },
  { id: 'phone', num: 23, cat: 'home', name: 'Phone + power bank', size: 'A phone with the sign-up page open', where: 'Back table. In the seller’s hand to sign people up',
    basis: 'home',
    note: 'Do not count on a socket. Charge it from the power bank.' },
  { id: 'pouch', num: null, cat: 'home', name: 'Cash pouch', size: 'Belt bag', where: 'Worn by the seller',
    basis: 'home',
    note: 'Only if we take cash. Never on the selling table.' },

  { id: 'kit', num: 24, cat: 'kit', name: 'Hanging kit', size: '100 cable ties (8 in), 12 binder clips, 5 m rope, tape, scissors', where: 'In a pouch on the back table',
    cost: [30, 70], basis: 'listing',
    note: 'Ties for the tarps and the pull-up pole, clips for the curtains and the lights, rope for the divider.' },

  { id: 'tent', num: 25, cat: 'space', name: 'Tent (our half)', size: '3 m × 3 m tent. Our half: 1.5 m × 3 m. Eave 2.0 m or more', where: 'Red Brick Road. Stall not given yet. We take one half',
    basis: 'provided',
    note: 'Two groups share one tent (official). Only the tent is given. Ask for the top leg setting: at a 1.8 m eave, a 5′9″ head has 2 cm.' },
];

// Quotes and order links (boothrender/shop.js) replace the guesses above.
pieces.forEach((p) => {
  const s = SHOP.items[p.id];
  if (s && s.total != null) { p.cost = Array.isArray(s.total) ? s.total : [s.total, s.total]; p.basis = 'quote'; }
});

const views = [
  { id: 'corner', label: 'Corner', az: 0.62, el: 0.5, tx: 0.95, ty: 1.15, tz: -1.2, size: 4.5, width: 5.6 },
  { id: 'aisle', label: 'From the aisle', az: 0, el: 0.09, tx: 1.3, ty: 1.4, tz: -1.5, size: 3.5, width: 4.6 },
  { id: 'side', label: 'Side', az: Math.PI / 2, el: 0.05, tx: 1.4, ty: 1.45, tz: -1.2, size: 3.6, width: 5.6 },
  { id: 'top', label: 'Top', az: 0, el: Math.PI / 2, tx: 1.3, ty: 0, tz: -1.15, size: 4.7, width: 4.6 },
  { id: 'table', label: 'Table setup', ...zoomTable },
  { id: 'easels', label: 'Easel backs', az: 2.3, el: 0.34, tx: 0.45, ty: 0.86, tz: -0.66, size: 0.6, width: 1.1, hide: ['people', 'dims', 'curtains'] },
];

const layers = [
  { name: 'dims', label: 'Sizes', mobileOff: true },
  { name: 'roof', label: 'Roof' },
  { name: 'curtains', label: 'Curtains' },
  { name: 'decor', label: 'Glow-up' },
  { name: 'people', label: 'People' },
];

// ---------- textures (the print on each piece) ----------
// The print comes from the print files (/assets/print/booth, made by `npm run print`).
// Pick a version in the list below the model and the texture changes.
const art = await loadArt('booth');

function makeTextures() {
  return {
    header: art.tex('header'),
    backdrop: art.tex('backdrop'),
    skirt: art.tex('skirt'),
    pullup: art.tex('pullup', { w: 512 }),
    regqr: art.tex('regqr', { w: 512 }),
    card: art.tex('card', { w: 512 }),
    gcash: art.tex('gcash', { w: 512 }),
    bingo: art.tex('bingo', { w: 384 }),       // front of the card
    signup: art.tex('signup', { w: 512 }),
    flyer: art.tex('flyer', { w: 384 }),       // front of the flyer
    candy: art.tex('candy', { w: 384 }),
    // the frame, with its circle punched out (same circle as the print file: centre 300, 320 mm; r 190 mm on 600 × 800)
    frame: art.tex('frame', { w: 512, draw(g, im, w, h) {
      g.drawImage(im, 0, 0, w, h);
      g.globalCompositeOperation = 'destination-out';
      g.beginPath(); g.arc(w * 0.5, h * 0.4, w * (190 / 600), 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'source-over';
    } }),
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

// A board leaning back on its easel: where its easel leg goes. Board foot at (x, T.h, z), leaning back by BOARD_LEAN.
// The leg is hinged at 62% of the board's height on its back face, and its foot rests on the table behind.
function easelLeg(S, h, x, z, mat) {
  const c = Math.cos(BOARD_LEAN), s = Math.sin(BOARD_LEAN);
  const ly = h * 0.62, lz = -0.005;                    // hinge, in the board's own frame
  const hy = ly * c + lz * s, hz = -ly * s + lz * c;   // hinge, tilted (relative to the board foot)
  const a = 0.36;                                      // leg angle from vertical, leaning the other way
  const fz = hz - hy * Math.tan(a);                    // leg foot on the table
  const len = Math.hypot(hy, hz - fz);
  const g = new THREE.Group();
  const leg = S.box(-0.022, 0, -0.0015, 0.022, len, 0.0015, mat, { cast: false });
  g.add(leg);
  g.position.set(x, T.h, z + fz);
  g.rotation.x = a;
  // the hinge tab glued to the board's back
  const tab = S.box(-0.022, -0.03, -0.0015, 0.022, 0.0, 0.0015, mat, { cast: false, edges: false });
  const tg = new THREE.Group();
  tg.add(tab);
  tg.position.set(x, T.h + hy, z + hz);
  tg.rotation.x = -BOARD_LEAN;
  return [g, tg];
}

// ---------- the model ----------
async function build(S) {
  const tx = makeTextures();
  await art.ready();

  const L = { dims: S.layer('dims'), roof: S.layer('roof'), curtains: S.layer('curtains'), decor: S.layer('decor'), people: S.layer('people') };

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

  // tent frame (part 25)
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

  // 1 header tarp, above the front bar
  const header = S.panel({ w: 1.4, h: 0.6, map: tx.header });
  header.position.set(0.75, EAVE + 0.3, 0.02);
  S.put('header', header);
  // 2 backdrop tarp, from the back bar
  const backdrop = S.panel({ w: 1.5, h: 1.5, map: tx.backdrop });
  backdrop.position.set(0.75, EAVE - 0.75, -DEPTH + 0.03);
  S.put('backdrop', backdrop);
  S.autoHide(backdrop, [0, 0, -1]);   // seen from behind (its outside), it gets out of the way

  // 19 selling table (under the cloth: only the top edge and the feet show)
  const tableTop = S.mat(0xf4f1ea);
  const legM = S.mat(0x9aa3b5);
  const table = new THREE.Group();
  table.add(S.box(T.x0, T.h - 0.03, T.z0, T.x1, T.h, T.z1, tableTop));
  [[T.x0 + 0.04, T.z0 + 0.04], [T.x1 - 0.04, T.z0 + 0.04], [T.x0 + 0.04, T.z1 - 0.04], [T.x1 - 0.04, T.z1 - 0.04]]
    .forEach(([x, z]) => table.add(S.cyl(x, 0, z, 0.012, T.h - 0.03, legM)));
  S.put('table', table);
  // 12 tablecloth: top plus drop on all four sides, stopping 6 cm off the bricks
  const navyCloth = S.mat(0x0b2266);
  const cloth = new THREE.Group();
  const o = 0.012;
  cloth.add(S.box(T.x0 - o, T.h, T.z0 - o, T.x1 + o, T.h + 0.004, T.z1 + o, navyCloth, { cast: false }));
  cloth.add(S.box(T.x0 - o, 0.06, T.z1 + o - 0.004, T.x1 + o, T.h + 0.004, T.z1 + o, navyCloth));
  cloth.add(S.box(T.x0 - o, 0.06, T.z0 - o, T.x1 + o, T.h + 0.004, T.z0 - o + 0.004, navyCloth));
  cloth.add(S.box(T.x0 - o, 0.06, T.z0 - o, T.x0 - o + 0.004, T.h + 0.004, T.z1 + o, navyCloth));
  cloth.add(S.box(T.x1 + o - 0.004, 0.06, T.z0 - o, T.x1 + o, T.h + 0.004, T.z1 + o, navyCloth));
  S.put('cloth', cloth, L.decor);
  const TOP = T.h + 0.004;   // things on the table sit on the cloth
  // 3 skirt, on the aisle face, over the cloth
  const skirt = S.panel({ w: 0.9, h: 0.7, map: tx.skirt });
  skirt.position.set(0.45, 0.05 + 0.35, T.z1 + o + 0.006);
  S.put('skirt', skirt);

  // 5–7 boards in the back row, leaning back on easel legs (8)
  const easelMat = S.mat(0xa9b8cf);
  const easels = new THREE.Group();
  const board = (id, w, h, x, z, map) => {
    const g = new THREE.Group();
    const p = S.panel({ w, h, t: 0.004, map });
    p.position.y = h / 2;
    g.add(p);
    g.position.set(x, TOP, z);
    g.rotation.x = -BOARD_LEAN;
    S.put(id, g);
    easelLeg(S, h, x, z, easelMat).forEach((m) => { m.position.y += 0.004; easels.add(m); });
  };
  board('regqr', 0.148, 0.21, 0.15, -0.62, tx.regqr);
  board('card', 0.21, 0.297, 0.45, -0.64, tx.card);
  board('gcash', 0.148, 0.21, 0.75, -0.62, tx.gcash);
  S.put('easels', easels);

  // front row, flat
  const flat = (w, d, x, z, map, y = TOP, t = 0.003) => {
    const p = S.panel({ w, h: d, t, face: '+y', map });
    p.position.set(x, y + t / 2, z);
    return p;
  };
  // 9 bingo cards + pens
  const bingo = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const card = flat(0.105, 0.148, 0.12, -0.4, tx.bingo, TOP + i * 0.003, 0.003);
    card.rotation.y = (i - 1.5) * 0.04;
    bingo.add(card);
  }
  bingo.add(S.cyl(0.235, TOP, -0.31, 0.032, TOP + 0.1, S.mat(0x0646c8), { edges: true }));
  [[-0.012, 0.008, 0.12], [0.01, -0.01, -0.14], [0.004, 0.012, 0.05]].forEach(([dx, dz, tilt]) => {
    const pen = S.cyl(0, 0, 0, 0.005, 0.15, S.mat(0x101114));
    pen.position.set(0.235 + dx, TOP + 0.1, -0.31 + dz);
    pen.rotation.z = tilt;
    bingo.add(pen);
  });
  S.put('bingo', bingo);
  // 15 candy jar + sign, front row middle
  const jar = new THREE.Group();
  const JX = 0.47, JZ = -0.43, JR = 0.065, JH = 0.17;
  jar.add(S.cyl(JX, TOP, JZ, JR, TOP + JH, S.mat(0xeaf6ff, { opacity: 0.32 }), { seg: 28, edges: true, cast: false }));
  jar.add(S.cyl(JX, TOP + JH, JZ, JR * 0.9, TOP + JH + 0.022, S.mat(0x0646c8), { seg: 28 }));
  const candyCols = [0xffd43b, 0xff3b30, 0x3dd9f2, 0xffffff, 0x006dff, 0xff8fb1];
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * (JR - 0.016);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), S.mat(candyCols[i % candyCols.length]));
    ball.position.set(JX + Math.cos(a) * r, TOP + 0.014 + Math.floor(i / 8) * 0.019 + rnd() * 0.006, JZ + Math.sin(a) * r);
    jar.add(ball);
  }
  const sign = S.panel({ w: 0.105, h: 0.148, t: 0.002, map: tx.candy });
  const sg = new THREE.Group();
  sign.position.y = 0.074;
  sg.add(sign);
  sg.position.set(JX, TOP, JZ + JR + 0.035);
  sg.rotation.x = -0.25;
  jar.add(sg);
  S.put('candy', jar, L.decor);
  // 11 flyers
  const flyers = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const f = flat(0.105, 0.148, 0.78 + i * 0.002, -0.4, tx.flyer, TOP + i * 0.0025, 0.0025);
    f.rotation.y = -0.1 + i * 0.025;
    flyers.add(f);
  }
  S.put('flyers', flyers);

  // 20 back table + 22 supply box + 23 phone + 24 kit + 10 clipboard
  const bt = new THREE.Group();
  bt.add(S.box(BT.x0, BT.h - 0.03, BT.z0, BT.x1, BT.h, BT.z1, tableTop));
  [[BT.x0 + 0.03, BT.z0 + 0.03], [BT.x1 - 0.03, BT.z0 + 0.03], [BT.x0 + 0.03, BT.z1 - 0.03], [BT.x1 - 0.03, BT.z1 - 0.03]]
    .forEach(([x, z]) => bt.add(S.cyl(x, 0, z, 0.012, BT.h - 0.03, legM)));
  S.put('backtable', bt);
  S.put('box', S.box(0.06, 0, -2.15, 0.51, 0.3, -1.85, S.mat(0xc79b6a)));
  const clip = new THREE.Group();
  clip.add(S.box(0.03, BT.h, -2.17, 0.26, BT.h + 0.004, -1.85, S.mat(0x8c6a4a)));
  const sheet = flat(0.21, 0.297, 0.145, -2.005, tx.signup, BT.h + 0.004, 0.002);
  clip.add(sheet);
  clip.add(S.box(0.11, BT.h + 0.006, -2.17, 0.18, BT.h + 0.02, -2.14, S.mat(0xb8c0cc)));
  S.put('signup', clip);
  const phone = new THREE.Group();
  phone.add(S.box(0.31, BT.h, -1.95, 0.385, BT.h + 0.009, -1.79, S.mat(0x101114)));
  phone.add(S.box(0.43, BT.h, -1.94, 0.5, BT.h + 0.02, -1.8, S.mat(0x3b4255)));
  S.put('phone', phone);
  S.put('kit', S.box(0.31, BT.h, -2.17, 0.56, BT.h + 0.07, -2.02, S.mat(0x3dd9f2)));
  // 21 stool
  const stool = new THREE.Group();
  stool.add(S.cyl(0.74, 0.42, -1.3, 0.15, 0.45, S.mat(0x0646c8), { edges: true }));
  [[-0.1, -0.1], [0.1, -0.1], [0.1, 0.1], [-0.1, 0.1]].forEach(([dx, dz]) => stool.add(S.cyl(0.74 + dx, 0, -1.3 + dz, 0.012, 0.42, legM)));
  S.put('stool', stool);

  // 17 side curtain, 18 divider (see-through so the inside shows)
  const clothM = (op) => S.mat(0xf2f5ff, { opacity: op, side: THREE.DoubleSide });
  const sideC = S.put('side', S.box(0.005, 0, -DEPTH, 0.015, EAVE - 0.02, 0, clothM(0.3), { cast: false }), L.curtains);
  S.autoHide(sideC, [-1, 0, 0]);
  S.put('divider', S.box(HALF - 0.005, 0, -DEPTH, HALF + 0.005, 1.5, 0, clothM(0.26), { cast: false }), L.curtains);
  L.curtains.add(S.lines([[HALF, 1.5, 0], [HALF, 1.5, -DEPTH]], S.dimMat));

  // 16 photo frame, leaning on the side curtain between the two tables, print facing in
  const fr = S.panel({ w: 0.6, h: 0.8, t: 0.005, map: tx.frame });
  fr.material = fr.material.map((m) => { const k = m.clone(); k.transparent = true; k.alphaTest = 0.5; return k; });
  const frg = new THREE.Group();
  fr.position.y = 0.4;
  frg.add(fr);
  frg.position.set(0.03, 0, -1.42);
  frg.rotation.y = Math.PI / 2;
  frg.rotation.x = -0.1;
  S.put('frame', frg, L.decor);

  // 4 pull-up banner, outside the front-left leg, turned to face up the road
  const pu = new THREE.Group();
  const alu = S.mat(0xc9d0db);
  pu.add(S.box(-PU.w / 2 - 0.01, 0, -0.1, PU.w / 2 + 0.01, 0.075, 0.03, alu));                     // cassette
  [-1, 1].forEach((s) => pu.add(S.box(s * 0.3 - 0.02, 0, -0.32, s * 0.3 + 0.02, 0.012, 0.18, alu)));  // swing-out feet
  pu.add(S.cyl(0, 0.075, -0.06, 0.009, PU.h, alu));                                                  // pole
  const pf = S.panel({ w: PU.w, h: PU.h - 0.08, t: 0.003, map: tx.pullup });
  pf.position.set(0, 0.075 + (PU.h - 0.08) / 2, -0.035);
  pu.add(pf);
  pu.add(S.box(-PU.w / 2, PU.h, -0.045, PU.w / 2, PU.h + 0.018, -0.025, alu));                       // top rail
  pu.position.set(PU.x, 0, PU.z);
  pu.rotation.y = PU.rot;
  S.put('pullup', pu);

  // 13 fairy lights: warm bulbs on a swagged wire, along the front bar and the back bar
  const bulbs = [];
  const wire = [];
  const swag = (x0, x1, y, z, n, sag, per) => {
    for (let k = 0; k < n; k++) {
      const a = x0 + ((x1 - x0) * k) / n, b = x0 + ((x1 - x0) * (k + 1)) / n;
      let prev = null;
      for (let i = 0; i <= per; i++) {
        const t = i / per, x = a + (b - a) * t, yy = y - sag * 4 * t * (1 - t);
        const pt = [x, yy, z];
        if (prev) wire.push(prev, pt);
        prev = pt;
        if (i < per) bulbs.push([x, yy - 0.012, z]);
      }
    }
  };
  swag(0.02, 1.48, EAVE - 0.035, 0.03, 3, 0.11, 9);
  swag(0.02, 1.48, EAVE - 0.035, -DEPTH + 0.06, 3, 0.09, 9);
  const lights = new THREE.Group();
  const bulbGeo = new THREE.SphereGeometry(0.011, 10, 8);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  const inst = new THREE.InstancedMesh(bulbGeo, bulbMat, bulbs.length);
  const m4 = new THREE.Matrix4();
  bulbs.forEach((p, i) => inst.setMatrixAt(i, m4.makeTranslation(...p)));
  lights.add(inst);
  const glowTex = canvasTexture(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,214,120,0.85)'); gr.addColorStop(1, 'rgba(255,214,120,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, depthWrite: false, transparent: true });
  bulbs.forEach((p) => { const sp = new THREE.Sprite(glowMat); sp.position.set(...p); sp.scale.set(0.06, 0.06, 1); lights.add(sp); });
  lights.add(S.lines(wire, S.lineMat(0x3b4255, 1, 0.6)));
  S.put('lights', lights, L.decor);

  // 14 balloons: a bunch at the front-left leg and one at the front bar by the divider
  const balloons = new THREE.Group();
  const bCols = [0x0646c8, 0xffffff, 0x006dff, 0x3dd9f2, 0xffffff];
  const bunch = (bx, by, bz, seedOff, tie) => {
    const strings = [];
    [[0, 0.3, 0], [-0.17, 0.2, 0.06], [0.16, 0.22, -0.04], [-0.06, 0.1, -0.15], [0.08, 0.12, 0.15]].forEach(([dx, dy, dz], i) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 22, 16), S.mat(bCols[(i + seedOff) % bCols.length]));
      b.scale.y = 1.15;
      b.position.set(bx + dx, by + dy + 0.22, bz + dz);
      b.castShadow = true;
      balloons.add(b);
      strings.push([bx + dx, by + dy + 0.07, bz + dz], tie);
    });
    balloons.add(S.lines(strings, S.lineMat(0x3b4255, 1, 0.55)));
  };
  bunch(-0.3, EAVE + 0.12, 0.02, 0, [0, EAVE - 0.02, 0.02]);
  bunch(HALF + 0.28, EAVE + 0.12, 0.02, 2, [HALF, EAVE - 0.02, 0.02]);
  S.put('balloons', balloons, L.decor);

  // people: seller (5′9″) and the roamer out in the aisle with flyers
  L.people.add(S.person(0.45, -1.25, { h: 1.7526 }));
  S.tag([0.45, 1.86, -1.25], 'seller, 5′9″', { cls: 'tag--soft', layer: 'people' });
  L.people.add(S.person(3.2, 0.9, { h: 1.7 }));
  L.people.add(S.box(3.14, 1.02, 0.98, 3.25, 1.024, 1.13, S.mat(0xffffff), { cast: false }));
  S.tag([3.2, 1.82, 0.9], 'roamer, with flyers', { cls: 'tag--soft', layer: 'people' });

  // ---------- size lines ----------
  S.dim([0, 0, 0], [HALF, 0, 0], '1.5 m', { off: [0, 0, 0.32], tick: [0, 0, 1] });
  S.dim([3, 0, 0], [3, 0, -DEPTH], '3 m', { off: [0.32, 0, 0], tick: [1, 0, 0] });
  S.dim([3, 0, 0], [3, EAVE, 0], 'eave 2.0 m', { off: [0.3, 0, 0.3], tick: [1, 0, 0] });
  S.dim([3, 0, -1.5], [3, PEAK, -1.5], 'peak 3.05 m, assumed', { off: [0.75, 0, 0], tick: [1, 0, 0] });
  S.dim([0.05, EAVE + 0.6, 0.02], [1.45, EAVE + 0.6, 0.02], '1.4 m', { off: [0, 0.14, 0], tick: [0, 1, 0] });
  S.dim([1.45, EAVE, 0.02], [1.45, EAVE + 0.6, 0.02], '0.6 m', { off: [0.16, 0, 0], tick: [1, 0, 0] });
  S.dim([HALF, 0.5, -DEPTH + 0.03], [HALF, EAVE, -DEPTH + 0.03], '1.5 m', { off: [0.2, 0, 0], tick: [1, 0, 0] });
  S.dim([T.x1, 0.02, -2.75], [HALF, 0.02, -2.75], '0.6 m', { tick: [0, 0, 1] });
  S.dim([0, 0.01, 0], [0, 0.01, T.z1], '0.25 m', { off: [0.06, 0, 0], tick: [1, 0, 0] });

  // ---------- pins (numbers match the list) ----------
  const pins = {
    header: [1.25, EAVE + 0.45, 0.04], backdrop: [1.25, 1.75, -DEPTH + 0.05], skirt: [0.78, 0.22, T.z1 + 0.03],
    pullup: [PU.x + 0.3, 1.7, PU.z + 0.2], regqr: [0.15, TOP + 0.25, -0.66], card: [0.45, TOP + 0.33, -0.7], gcash: [0.75, TOP + 0.25, -0.66],
    easels: [0.6, TOP + 0.06, -0.8], bingo: [0.1, TOP + 0.05, -0.33], signup: [0.16, BT.h + 0.04, -1.9],
    flyers: [0.8, TOP + 0.05, -0.33], cloth: [0.05, 0.3, T.z1 + 0.02], lights: [0.55, EAVE - 0.2, 0.04], balloons: [-0.5, EAVE + 0.7, 0.05],
    candy: [0.47, TOP + 0.22, -0.43], frame: [0.06, 0.95, -1.42],
    side: [0.01, 0.55, -2.65], divider: [HALF, 1.25, -2.3],
    table: [T.x1, 0.42, T.z0], backtable: [0.58, BT.h, -1.78], stool: [0.88, 0.45, -1.3],
    box: [0.45, 0.3, -1.86], phone: [0.35, BT.h + 0.04, -1.84], kit: [0.5, BT.h + 0.1, -2.1], tent: [3, EAVE - 0.25, 0],
  };
  pieces.forEach((p) => {
    if (!p.num || !pins[p.id]) return;
    const layer = p.cat === 'fabric' ? 'curtains' : p.cat === 'decor' ? 'decor' : 'pins';
    S.pin(p.id, p.num, pins[p.id], layer);
  });
}

mountPage({ pieces, groups, views, layers, build, shadowBox: 6 }).then((stage) => {
  if (stage) art.onChange(() => { stage.dirty = true; });
  mountAssets(art, { pieces, stage });
});
mountShop(pieces);
