// /venuerender — FA Annex 104 (Fine Arts Annex, the old Communications Building, Seminary Road), set up for Blueprint.
// Metres. X = across the room (0 = window wall, W = hallway wall). Z = depth (-D = screen wall, 0 = back wall). Y = up.
// The room size is an ESTIMATE for a 30-seat classroom. Change W, D, H when the team measures it.
import { THREE, canvasTexture } from '/render/stage.js';
import { mountPage } from '/render/page.js';
import { loadArt, mountAssets } from '/render/assets.js';

const W = 7.5;            // room width, estimated
const D = 8;              // room depth, estimated
const H = 3.0;            // ceiling, estimated
const HALL = 2.5;         // hallway width, estimated
const DOOR_F = [-7.75, -6.85];  // front door (z range) on the hallway wall
const DOOR_B = [-1.55, -0.65];  // back door, used for sign-in

// ---------- the list ----------
const groups = [
  { code: 'in', label: 'Getting in' },
  { code: 'front', label: 'Front of the room' },
  { code: 'seats', label: 'Seats and groups' },
  { code: 'back', label: 'Back of the room' },
  { code: 'room', label: 'The room' },
  { code: 'bag', label: 'In the team bag' },
];

const zoomReg = { az: 0.95, el: 0.42, tx: 8.55, ty: 0.85, tz: -1.7, size: 2.9, width: 4.2 };
const zoomFront = { az: 0.35, el: 0.28, tx: 3.0, ty: 1.5, tz: -7.2, size: 3.6, width: 6 };
const zoomPod = { az: 0.6, el: 0.55, tx: 1.3, ty: 0.6, tz: -5.0, size: 2.6, width: 3.4 };

const pieces = [
  // getting in
  { id: 'signs', num: 1, cat: 'in', name: 'Direction signs', size: 'A4, 4 to 6 pieces', where: 'Gate, building door, hallway corner',
    basis: 'print', note: 'FA Annex is on Seminary Road, next to the Sports Complex, away from the main buildings. Guests will not find it alone. Arrow + “Blueprint · FA Annex 104”.', view: zoomReg },
  { id: 'banner', num: 2, cat: 'in', name: 'Pull-up banner', size: 'About 0.85 m × 2 m, with its stand', where: 'Hallway, beside the back door. Inside by the screen after sign-in',
    basis: 'print', note: 'Logo, “Stand out on paper. Stand out in person.”, and the date. It is the photo spot too. Borrow a stand if you can.', view: zoomReg },
  { id: 'reg', num: 3, cat: 'in', name: 'Sign-in table', size: 'About 1.5 m × 0.6 m, 2 chairs, a navy cloth', where: 'Hallway, beside the back door',
    basis: 'borrow', note: 'Outside the room, so sign-in does not block the door. Ask the guard or CFMO if a table can be borrowed.', view: zoomReg },
  { id: 'signin', num: 4, cat: 'in', name: 'Sign-in kit', size: 'Sign-in sheet on a clipboard, attendance QR (A5), 30 name tags, 2 markers', where: 'On the sign-in table',
    basis: 'print', note: 'Each person signs in, writes a name tag, and gets a kit and a group number.', view: zoomReg },
  { id: 'doorsign', num: 5, cat: 'in', name: 'Door sign', size: 'A3', where: 'Outside face of the back door',
    basis: 'print', note: '“Blueprint · FA Annex 104 · Sign in here.” Ask first if tape is OK on the door.', view: zoomReg },
  { id: 'gate', num: null, cat: 'in', name: 'Approved request + guest list', size: 'Screenshot on a phone, and a printed copy', where: 'With the gate guide',
    basis: 'home', note: 'The approved request says: show the screenshot to the guard on duty. Guests from outside Ateneo also need CSMO (csmo@ateneo.edu).' },

  // front
  { id: 'screen', num: 6, cat: 'front', name: 'Screen', size: 'About 2.4 m × 1.8 m (room screen)', where: 'Front wall, centre',
    basis: 'cfmo', note: 'The booking sheet lists FA Annex 104 with “LCD & Screen”. Title slide on it while people come in.', view: zoomFront },
  { id: 'projector', num: 7, cat: 'front', name: 'Projector', size: 'Room LCD projector', where: 'Ceiling, about 3.5 m from the screen (assumed)',
    basis: 'cfmo', note: 'Test it at 5:00 with our laptop. If it is a portable unit, it needs a small table in the middle aisle and a 5 m HDMI cable.', view: zoomFront },
  { id: 'front', num: 8, cat: 'front', name: 'Front table: laptop, HDMI adapter, clicker', size: 'The room’s teacher table, about 1.2 m × 0.6 m', where: 'Front left, by the windows',
    basis: 'room', note: 'The tech sits here. Bring a USB-C to HDMI adapter, the charger, and a clicker. Slides saved offline too.', view: zoomFront },
  { id: 'board', num: 9, cat: 'front', name: 'Whiteboard + markers', size: 'Room board (not confirmed). 3 markers, 1 eraser', where: 'Front wall, beside the screen',
    basis: 'buy', note: 'For group answers and the timer. Bring our own markers. Room markers are often dry.', view: zoomFront },

  // seats
  { id: 'pods', num: 10, cat: 'seats', name: '6 group pods', size: '26 seats: 4 pods of 4, 2 pods of 5', where: 'Middle of the room, 3 across and 2 deep',
    basis: 'room', note: 'Made from the room’s own chairs. Pods fit the group activities. For talks, people turn their chairs to the screen. Toggle “Room as found” to see the rows.', view: zoomPod },
  { id: 'numbers', num: 11, cat: 'seats', name: 'Group number cards', size: 'A5 folded tent cards, 6 pieces', where: 'One per pod, on the chair nearest the aisle',
    basis: 'print', note: 'Group 1 to 6. The sign-in table gives each person a number, so friends mix.', view: zoomPod },
  { id: 'kits', num: 12, cat: 'seats', name: 'Worksheet kits', size: '30 kits (26 + 4 extra): worksheets, pen, sticky notes', where: 'One on each seat before doors open',
    basis: 'print', note: 'Print the sheets for this session only. Do not show the full set ahead (site rule).', view: zoomPod },

  // back
  { id: 'supplies', num: 13, cat: 'back', name: 'Supplies table', size: 'About 1.2 m × 0.6 m', where: 'Back left',
    basis: 'room', note: 'Extra kits, pens, sticky notes, tape, scissors, the extension cord, and a first-aid pouch.' },
  { id: 'snacks', num: 14, cat: 'back', name: 'Water and snacks', size: 'About 1.2 m × 0.6 m table', where: 'Back middle',
    basis: 'buy', note: 'Optional. Check first if food is allowed in the room. Keep it away from the kits.' },
  { id: 'camera', num: 15, cat: 'back', name: 'Camera on a tripod', size: 'Phone or camera, tripod at about 1.6 m', where: 'Back left corner',
    basis: 'home', note: 'Wide shot of the whole room for the report. The floater takes close shots on a phone.' },
  { id: 'trash', num: 16, cat: 'back', name: 'Trash bag', size: 'One large bag', where: 'Back left, beside the supplies table',
    basis: 'home', note: 'Leave the room clean at 7:30.' },

  // room
  { id: 'room', num: 17, cat: 'room', name: 'FA Annex 104', size: 'Classroom for 30. About 7.5 m × 8 m (estimate)', where: 'Fine Arts Annex (old Communications Building), Seminary Road',
    basis: 'room', note: 'Approved for Nov 10, 5:00 to 7:30 pm, 26 people. Aircon and projector are listed for this room.' },
  { id: 'aircon', num: 18, cat: 'room', name: 'Aircon and lights', size: 'Room units (type not known)', where: 'Walls and ceiling',
    basis: 'room', note: 'On at 5:00. If they are locked, ask the guard. Off when you leave.' },

  // bag (not in the model)
  { id: 'cord', num: null, cat: 'bag', name: 'Extension cord', size: '5 m, 3 sockets', where: 'Supplies table',
    basis: 'home', note: 'For the laptop and phones. Do not count on a free socket by the front table.' },
  { id: 'tape', num: null, cat: 'bag', name: 'Masking tape + scissors', size: '1 roll', where: 'Supplies table',
    basis: 'home', note: 'Only on surfaces where tape is allowed. Ask first.' },
  { id: 'timer', num: null, cat: 'bag', name: 'Timer', size: 'Phone, or a timer slide', where: 'Front table',
    basis: 'home', note: 'For the speed rounds.' },
  { id: 'feedback', num: null, cat: 'bag', name: 'Feedback QR', size: 'Last slide + A5 print', where: 'Screen at 7:15, and the sign-in table',
    basis: 'print', note: 'Collect it before people leave the room.' },
];

const views = [
  { id: 'corner', label: 'Corner', az: 0.62, el: 0.6, tx: 4.7, ty: 0.6, tz: -4.1, size: 8.2, width: 12 },
  { id: 'back', label: 'From the back', az: 0, el: 0.3, tx: 3.75, ty: 1.25, tz: -4.6, size: 5.4, width: 8.4 },
  { id: 'facil', label: 'From the screen', az: Math.PI, el: 0.3, tx: 3.9, ty: 1.1, tz: -3.8, size: 5.4, width: 9 },
  { id: 'top', label: 'Floor plan', az: 0, el: Math.PI / 2, tx: 4.9, ty: 0, tz: -4.1, size: 9, width: 11 },
  { id: 'signin', label: 'Sign-in', ...zoomReg },
];

const layers = [
  { name: 'dims', label: 'Sizes', mobileOff: true },
  { name: 'walls', label: 'Walls' },
  { name: 'people', label: 'People' },
  { name: 'rows', label: 'Room as found', on: false, swap: 'pods' },
];

const runSheet = [
  ['Before Nov 10', 'Email CSMO', 'Tell csmo@ateneo.edu about the guests from outside. Send the guest list.'],
  ['Before Nov 10', 'Visit the room', 'Measure it. Check chairs or tables, the screen, the HDMI port, the sockets, and the aircon. Fix this model.'],
  ['4:15 pm', 'Team meets at FA Annex', 'Gate guide goes to the gate with the approved request and the guest list.'],
  ['4:30 pm', 'Hallway set-up', 'Sign-in table, pull-up banner, door sign, direction signs. The room may still have a class.'],
  ['5:00 pm', 'Room opens', 'Aircon and lights on. Laptop to projector. Title slide up. Chairs into 6 pods. A kit on each seat. Sign-in opens.'],
  ['5:15 pm', 'Start', 'Host opens. Move the pull-up banner inside, beside the screen.'],
  ['7:15 pm', 'Wrap up', 'Feedback QR on the screen. Group photo at the banner.'],
  ['7:30 pm', 'Out of the room', 'Chairs back in rows. Trash out. Aircon and lights off. Tell the guard.'],
];

const posts = [
  ['Gate guide · 1', 'At the gate from 4:30. Meets the guests. Shows the approved request to the guard. Walks them to FA Annex.'],
  ['Sign-in · 2', 'At the hallway table. Sign-in, name tag, kit, group number.'],
  ['Host · 1', 'Front of the room. Opens, keeps time, closes.'],
  ['Facilitator', 'Front, beside the screen. Not in front of the projector.'],
  ['Tech · 1', 'Front table. Slides, timer, music.'],
  ['Floaters · 2', 'Between the pods during group work. Extra kits and pens. Close-up photos.'],
  ['Documentation · 1', 'Back left, at the tripod.'],
];

const toCheck = [
  '<b>Room size and furniture.</b> No photo of FA Annex 104 was found online. The model is an estimate. Visit and measure.',
  '<b>Capacity is 30</b> (booking sheet). 26 participants leaves space for 4 more. Keep the rest of the team in the hallway.',
  '<b>A class before 5:00?</b> If yes, the room set-up starts at 5:00. Set up the hallway first.',
  '<b>CSMO reply</b> on the guests from outside.',
  '<b>Food</b> in the room: allowed or not.',
  '<b>Tape</b> on walls and doors: allowed or not. If not, put the signs on easels.',
  '<b>Projector:</b> ceiling unit or portable. Which cable: HDMI or VGA.',
];

const refs = [
  ['Room facts', 'FA Annex 104: classroom, aircon, “LCD & Screen”, capacity 30. FA 101 and 106 seat 35.', 'Ateneo LS reservations, venue capacity', 'https://sites.google.com/ateneo.edu/lsreservations/he-venues/venue-capacity'],
  ['What FA means', 'FA = Fine Arts. The Fine Arts Annex is the old Communications Building.', 'The GUIDON, 2011', 'https://theguidon.com/2011/06/building-renovations-ongoing-this-sy/'],
  ['Where it is', 'Old Communications Building, Seminary Road.', 'ateneo.edu directory (Tagpuan office)', 'https://www.ateneo.edu/directory/office/tagpuan'],
  ['Inside, 2012 photos', 'White walls, vinyl tile floor (blue in the hallway, cream in rooms), tube lights, wooden doors, louvered windows. Next to the Sports Complex.', 'The Rookies blog, 2012', 'https://therookies2012.wordpress.com/2012/08/27/fine-arts-annex-crafting-a-series-of-brand-new-horror-stories/'],
  ['Campus plan', 'In 2024 Ateneo said the FA Annex will get a new central admin building and dining spaces. The room is still listed for booking.', 'The GUIDON, 2024', 'https://theguidon.com/2024/05/ateneo-to-undergo-renovations-as-part-of-campus-master-plan/'],
  ['A similar Ateneo room (not FA Annex)', 'A workshop in another Ateneo classroom: pull-down screen, aircon, tables and white folding chairs.', 'ateneo.edu, Re-Fair 2024', 'https://www.ateneo.edu/news/2024/05/29/first-community-re-fair-welcomes-diverse-partners-ateneo'],
];

// ---------- textures ----------
// The print on each piece comes from the print files (/assets/print/venue, made by `npm run print`).
// Pick a version in the list below the model and the texture changes.
const art = await loadArt('venue');

function makeTextures() {
  const t = {};
  // title slide (16:9) on the 4:3 screen
  t.screen = art.tex('screen', {
    w: 1200, h: 900,
    draw: (g, im, w, h) => { g.fillStyle = '#e9edf3'; g.fillRect(0, 0, w, h); const sh = (w * 9) / 16; g.drawImage(im, 0, (h - sh) / 2, w, sh); },
  });
  t.banner = art.tex('banner');
  t.door = art.tex('doorsign');
  t.sign = art.tex('signs');
  t.qr = art.tex('signinqr', { w: 512 });
  // the tent card's front face is the bottom half of each A4 page
  t.nums = [0, 1, 2, 3, 4, 5].map((page) => art.tex('numbers', { page, crop: [0, 0.5, 1, 0.5], w: 512 }));
  t.kit = art.tex('kits', { w: 512 });
  // vinyl tile floor (cream in rooms), 0.3 m tiles, texture covers 1.2 m
  t.floor = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#e9e1cf'; g.fillRect(0, 0, w, h);
    let s = 9; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const n = 4, c = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = `hsl(42 ${22 + rnd() * 8}% ${85 + rnd() * 4}%)`;
      g.fillRect(i * c + 1, j * c + 1, c - 2, c - 2);
    }
    g.strokeStyle = 'rgba(120,100,70,0.18)'; g.lineWidth = 2;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * c, 0); g.lineTo(i * c, h); g.stroke(); g.beginPath(); g.moveTo(0, i * c); g.lineTo(w, i * c); g.stroke(); }
  });
  t.floor.wrapS = t.floor.wrapT = THREE.RepeatWrapping;
  // hallway vinyl (blue)
  t.hall = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#7393c9'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 2;
    for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(w, i * 128); g.stroke(); }
  });
  t.hall.wrapS = t.hall.wrapT = THREE.RepeatWrapping;
  // louvered window
  t.window = canvasTexture(320, 240, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#cfe8f7'); gr.addColorStop(1, '#a9d2ea');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 3;
    for (let y = 14; y < h; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = '#8a97a8'; g.lineWidth = 10; g.strokeRect(0, 0, w, h);
    g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
  });
  return t;
}

// ---------- furniture ----------
function armchair(S, mats, { kit = null, numTex = null } = {}) {
  // tablet-arm chair, facing +z, seat centre at origin
  const g = new THREE.Group();
  g.add(S.box(-0.23, 0.42, -0.22, 0.23, 0.46, 0.2, mats.wood, { angle: 40 }));
  g.add(S.box(-0.23, 0.5, -0.27, 0.23, 0.86, -0.23, mats.wood, { angle: 40 }));
  g.add(S.box(0.2, 0.68, -0.05, 0.46, 0.705, 0.36, mats.wood, { angle: 40 }));
  // four thin legs, and a post under the tablet arm
  [[-0.21, -0.2], [0.21, -0.2], [-0.21, 0.17], [0.21, 0.17]].forEach(([x, z]) => g.add(S.box(x - 0.012, 0, z - 0.012, x + 0.012, 0.42, z + 0.012, mats.metal, { edges: false })));
  g.add(S.box(0.32, 0.42, 0.08, 0.34, 0.68, 0.1, mats.metal, { edges: false }));
  if (kit) {
    const k = S.panel({ w: 0.2, h: 0.28, t: 0.01, face: '+y', map: kit, edges: false });
    k.position.set(0.33, 0.71, 0.155);
    k.rotation.y = 0.08;
    k.userData.kit = true;
    g.add(k);
  }
  if (numTex) {
    const card = new THREE.Group();
    const a = S.panel({ w: 0.21, h: 0.148, t: 0.003, map: numTex, edges: true });
    a.position.set(0, 0.07, 0.03); a.rotation.x = -0.35;
    const b = S.panel({ w: 0.21, h: 0.148, t: 0.003, map: numTex, face: '-z', edges: true });
    b.position.set(0, 0.07, -0.03); b.rotation.x = 0.35;
    card.add(a, b);
    card.position.set(0.33, 0.705, 0.0);
    card.userData.num = true;
    g.add(card);
  }
  return g;
}

function seated(S, mat) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.36, 6, 14), mat);
  torso.position.set(0, 0.78, -0.07);
  torso.scale.z = 0.65;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 12), mat);
  head.position.set(0, 1.2, -0.05);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.42), mat);
  legs.position.set(0, 0.52, 0.12);
  [torso, head, legs].forEach((m) => { m.castShadow = true; g.add(m); S.edges(m, 60, S.faintMat); });
  return g;
}

function simpleTable(S, mats, x0, z0, x1, z1, h = 0.75, top = mats.tableTop) {
  const g = new THREE.Group();
  g.add(S.box(x0, h - 0.03, z0, x1, h, z1, top));
  [[x0 + 0.05, z0 + 0.05], [x1 - 0.05, z0 + 0.05], [x0 + 0.05, z1 - 0.05], [x1 - 0.05, z1 - 0.05]]
    .forEach(([x, z]) => g.add(S.cyl(x, 0, z, 0.015, h - 0.03, mats.metal)));
  return g;
}

// ---------- the model ----------
async function build(S) {
  const tx = makeTextures();
  await art.ready();

  const L = { dims: S.layer('dims'), walls: S.layer('walls'), people: S.layer('people'), pods: S.layer('pods'), rows: S.layer('rows') };
  const mats = {
    wall: S.mat(0xf6f7f9),
    wallSee: S.mat(0xf6f7f9, { opacity: 0.16 }),
    wood: S.mat(0xc49a6c),
    door: S.mat(0x9b6b43),
    metal: S.mat(0x8f98a8),
    tableTop: S.mat(0xe9e4da),
    cloth: S.mat(0x061a4d),
    ghost: S.mat(0xc9d6ee, { opacity: 0.8 }),
    ghostChair: S.mat(0xd8c3a8, { opacity: 0.85 }),
  };

  // floor and hallway
  tx.floor.repeat.set(W / 1.2, D / 1.2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), S.mat(0xffffff, { map: tx.floor }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(W / 2, 0, -D / 2); floor.receiveShadow = true;
  S.put('room', floor);
  floor.userData.noPick = true;
  tx.hall.repeat.set(HALL / 0.6, (D + 2) / 0.6);
  const hall = new THREE.Mesh(new THREE.PlaneGeometry(HALL, D + 2), S.mat(0xffffff, { map: tx.hall }));
  hall.rotation.x = -Math.PI / 2; hall.position.set(W + 0.12 + HALL / 2, 0, -D / 2 + 1); hall.receiveShadow = true;
  S.add(hall);
  S.tag([W + 0.12 + HALL / 2, 0.02, -5.2], 'hallway', { cls: 'tag--zone' });

  // walls: window wall and screen wall full height; hallway wall see-through; back wall cut low
  const t = 0.12;
  // each solid wall is a group, so its windows and aircon hide with it when the camera is outside it
  const leftWall = new THREE.Group();
  const frontWall = new THREE.Group();
  L.walls.add(leftWall, frontWall);
  S.autoHide(leftWall, [-1, 0, 0]);
  S.autoHide(frontWall, [0, 0, -1]);
  const lw = S.put('room', S.box(-t, 0, -D - t, 0, H, 0, mats.wall), leftWall);
  const fw = S.put('room', S.box(-t, 0, -D - t, W + t, H, -D, mats.wall), frontWall);
  lw.userData.noPick = fw.userData.noPick = true;
  const hw = S.box(W, 0, -D, W + t, H, 0, mats.wallSee, { cast: false });
  hw.userData.noPick = true;
  L.walls.add(hw);
  S.add(S.box(-t, 0, 0, W + t, 0.18, t, mats.wall));             // back wall, cut low
  S.add(S.box(W + t + HALL, 0, -D - 1, W + 2 * t + HALL, 0.18, 1, mats.wall)); // far hallway wall, cut low
  // doors (wood), on both faces of the hallway wall
  [DOOR_F, DOOR_B].forEach(([z0, z1]) => {
    S.put('room', S.box(W - 0.02, 0, z0, W + t + 0.02, 2.1, z1, mats.door));
  });
  // windows on the window wall
  [-6.6, -4.0, -1.4].forEach((zc) => {
    const win = S.panel({ w: 1.7, h: 1.2, t: 0.02, face: '+x', map: tx.window });
    win.position.set(0.01, 1.0 + 0.6, zc);
    S.put('room', win, leftWall);
  });
  // aircon (type not known): two wall units on the window wall
  [-5.3, -2.7].forEach((zc) => S.put('aircon', S.box(0.0, 2.42, zc - 0.45, 0.24, 2.72, zc + 0.45, S.mat(0xfbfcfd)), leftWall));

  // front: whiteboard, screen, projector
  const wb = S.box(W / 2 - 1.9, 0.9, -D + 0.005, W / 2 + 1.9, 2.1, -D + 0.03, S.mat(0xffffff));
  S.put('board', wb, frontWall);
  const tray = S.box(W / 2 - 1.9, 0.88, -D + 0.03, W / 2 + 1.9, 0.9, -D + 0.09, mats.metal);
  S.put('board', tray, frontWall);
  const screen = S.panel({ w: 2.4, h: 1.8, t: 0.012, map: tx.screen });
  screen.position.set(W / 2, 0.95 + 0.9, -D + 0.12);
  S.put('screen', screen, frontWall);
  S.put('screen', S.box(W / 2 - 1.3, 2.75, -D + 0.06, W / 2 + 1.3, 2.85, -D + 0.18, S.mat(0xe2e6ec)), frontWall);
  const proj = new THREE.Group();
  proj.add(S.box(W / 2 - 0.17, 2.62, -D + 3.35, W / 2 + 0.17, 2.74, -D + 3.65, S.mat(0xf1f3f6)));
  proj.add(S.cyl(W / 2, 2.74, -D + 3.5, 0.02, H, mats.metal));
  S.put('projector', proj);
  // light from the projector to the screen
  const pj = [W / 2, 2.67, -D + 3.35];
  const sc = [[W / 2 - 1.2, 2.75], [W / 2 + 1.2, 2.75], [W / 2 - 1.2, 0.95], [W / 2 + 1.2, 0.95]];
  S.add(S.lines(sc.map(([x, y]) => [pj, [x, y, -D + 0.13]]).flat(), S.lineMat(0x006dff, 1, 0.25)));

  // front table (teacher table) with laptop
  const ft = simpleTable(S, mats, 0.45, -7.65, 1.65, -7.05);
  S.put('front', ft);
  const lap = new THREE.Group();
  lap.add(S.box(0.85, 0.75, -7.5, 1.2, 0.765, -7.25, S.mat(0xb8bfca)));
  const lid = S.box(0.85, 0.765, -7.51, 1.2, 0.99, -7.5, S.mat(0x3b4255));
  lap.add(lid);
  S.put('front', lap);
  S.put('front', S.box(0.55, 0, -7.0, 0.95, 0.45, -6.6, mats.metal));  // tech stool

  // the 6 pods (26 seats), in 3 columns and 2 rows
  const cols = [1.3, W / 2, W - 1.3];
  const rowsZ = [-5.05, -2.6];
  const counts = [5, 4, 4, 4, 4, 5];
  let pi = 0;
  const allChairs = new THREE.Group();
  const pplPods = new THREE.Group();
  const kits = new THREE.Group();
  const numCards = new THREE.Group();
  rowsZ.forEach((cz) => cols.forEach((cx) => {
    const n = counts[pi];
    const r = n === 5 ? 0.66 : 0.6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (n === 4 ? Math.PI / 4 : Math.PI / 5);
      const x = cx + r * Math.sin(a), z = cz + r * Math.cos(a);
      const ch = armchair(S, mats, { kit: tx.kit, numTex: i === 0 ? tx.nums[pi] : null });
      ch.position.set(x, 0, z);
      ch.rotation.y = a + Math.PI;
      // pull the kit and number card out so they can be their own list items
      ch.children.filter((c) => c.userData.kit || c.userData.num).forEach((c) => {
        ch.updateMatrixWorld(true);
        const wm = c.matrixWorld.clone();
        ch.remove(c);
        c.matrix.copy(wm); c.matrix.decompose(c.position, c.quaternion, c.scale);
        (c.userData.kit ? kits : numCards).add(c);
      });
      allChairs.add(ch);
      const p = seated(S, mats.ghost);
      p.position.set(x, 0, z); p.rotation.y = a + Math.PI;
      pplPods.add(p);
    }
    S.tag([cx, 0.02, cz], `G${pi + 1}`, { cls: 'tag--zone', layer: 'pods' });
    pi++;
  }));
  S.put('pods', allChairs, L.pods);
  S.put('kits', kits, L.pods);
  S.put('numbers', numCards, L.pods);
  L.pods.add(pplPods);
  S.link('people', pplPods);  // the People toggle hides them too

  // "room as found": 5 rows of 6 chairs facing the screen
  const rowChairs = new THREE.Group();
  for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) {
    const x = 0.95 + c * 0.75 + (c >= 3 ? 1.35 : 0);
    const z = -5.9 + r * 1.0;
    const ch = armchair(S, { ...mats, wood: mats.ghostChair });
    ch.position.set(x, 0, z);
    ch.rotation.y = Math.PI;
    rowChairs.add(ch);
  }
  S.put('pods', rowChairs, L.rows);
  S.tag([W / 2, 0.02, -0.75], 'room as found: rows (assumed)', { cls: 'tag--soft', layer: 'rows' });

  // back of the room
  const sup = simpleTable(S, mats, 0.4, -0.75, 1.6, -0.15);
  S.put('supplies', sup);
  const boxes = new THREE.Group();
  boxes.add(S.box(0.5, 0.75, -0.65, 0.9, 0.95, -0.3, S.mat(0xc79b6a)));
  boxes.add(S.box(1.0, 0.75, -0.62, 1.45, 0.83, -0.3, S.mat(0xffffff)));
  S.put('supplies', boxes);
  const snacks = simpleTable(S, mats, 2.8, -0.75, 4.0, -0.15);
  S.put('snacks', snacks);
  const water = new THREE.Group();
  water.add(S.cyl(3.05, 0.75, -0.45, 0.1, 1.05, S.mat(0x9fd8f5, { opacity: 0.85 }), { edges: true }));
  for (let i = 0; i < 5; i++) water.add(S.cyl(3.35 + i * 0.1, 0.75, -0.4, 0.035, 0.85, S.mat(0xffffff), { seg: 10 }));
  S.put('snacks', water);
  S.put('trash', S.cyl(0.2, 0, -1.05, 0.2, 0.55, S.mat(0x22262e), { edges: true }));
  // tripod + camera
  const tri = new THREE.Group();
  const tp = [0.35, 1.55, -0.35];
  [[0.15, -0.2], [0.55, -0.2], [0.35, -0.6]].forEach(([x, z]) => {
    const leg = S.lines([[x, 0, z], tp], S.lineMat(0x101114, 2, 0.9));
    tri.add(leg);
  });
  tri.add(S.box(0.27, 1.55, -0.42, 0.43, 1.66, -0.3, S.mat(0x101114)));
  S.put('camera', tri);

  // hallway: sign-in table, banner, door sign, direction sign
  const HX = W + t;                   // hallway starts here
  const reg = new THREE.Group();
  reg.add(S.box(HX + 1.1, 0.04, -3.16, HX + 1.7, 0.74, -3.15, mats.cloth));            // cloth, hallway end
  reg.add(S.box(HX + 1.09, 0.04, -3.16, HX + 1.1, 0.75, -1.64, mats.cloth));           // cloth, the side people walk up to
  reg.add(simpleTable(S, mats, HX + 1.1, -3.15, HX + 1.7, -1.65));
  [[-2.7], [-2.05]].forEach(([z]) => {
    const c = armchair(S, { ...mats, wood: S.mat(0xf2f2f2) });
    c.remove(c.children[c.children.length - 1], c.children[2]);  // a plain chair: no tablet arm, no arm post
    c.position.set(HX + 2.05, 0, z); c.rotation.y = -Math.PI / 2;
    reg.add(c);
  });
  S.put('reg', reg);
  const kitIn = new THREE.Group();
  const clip = S.box(HX + 1.2, 0.75, -2.0, HX + 1.5, 0.756, -1.75, S.mat(0x8c6a4a));
  kitIn.add(clip);
  const qr = S.panel({ w: 0.148, h: 0.21, t: 0.004, face: '-x', map: tx.qr });
  const qg = new THREE.Group(); qr.position.y = 0.105; qg.add(qr);
  qg.position.set(HX + 1.3, 0.75, -2.35); qg.rotation.z = -0.2;
  kitIn.add(qg);
  kitIn.add(S.box(HX + 1.2, 0.75, -2.98, HX + 1.55, 0.85, -2.7, S.mat(0x0646c8)));     // name tag box
  kitIn.add(S.box(HX + 1.22, 0.75, -2.62, HX + 1.52, 0.9, -2.45, S.mat(0xffffff)));     // kits stack
  S.put('signin', kitIn);
  // pull-up banner beside the back door, facing the hallway
  const pb = new THREE.Group();
  const bp = S.panel({ w: 0.85, h: 2.0, t: 0.01, face: '+x', map: tx.banner });
  bp.position.set(HX + 0.12, 0.08 + 1.0, -0.15);
  pb.add(bp);
  pb.add(S.box(HX + 0.05, 0, -0.62, HX + 0.25, 0.08, 0.32, S.mat(0xc8ced8)));
  S.put('banner', pb);
  // door sign on the back door (hallway face)
  const ds = S.panel({ w: 0.297, h: 0.42, t: 0.004, face: '+x', map: tx.door });
  ds.position.set(W + t + 0.03, 1.45, (DOOR_B[0] + DOOR_B[1]) / 2);
  S.put('doorsign', ds);
  // direction signs: on the hallway end wall and on a stand at the hallway corner
  const sg = new THREE.Group();
  const s1 = S.panel({ w: 0.42, h: 0.297, t: 0.004, face: '+z', map: tx.sign });
  s1.position.set(HX + HALL - 0.6, 1.4, 0.92);
  s1.material[5] = s1.material[4];   // printed on both sides
  const pole = S.cyl(HX + HALL - 0.6, 0, 0.92, 0.015, 1.25, mats.metal);
  sg.add(s1, pole);
  S.put('signs', sg);

  // people: facilitator, tech, sign-in team
  const fac = S.person(2.25, -7.05, { h: 1.7 });
  L.people.add(fac);
  S.tag([2.25, 1.82, -7.05], 'facilitator', { cls: 'tag--soft', layer: 'people' });
  const tech = seated(S, mats.ghost);
  tech.position.set(0.75, -0.0, -6.8); tech.rotation.y = Math.PI;
  L.people.add(tech);
  [[-2.7], [-2.05]].forEach(([z]) => {
    const p = seated(S, mats.ghost);
    p.position.set(HX + 2.05, 0, z); p.rotation.y = -Math.PI / 2;
    L.people.add(p);
  });
  S.tag([HX + 2.05, 1.4, -2.4], 'sign-in team', { cls: 'tag--soft', layer: 'people' });

  // ---------- sizes ----------
  S.dim([0, 0, 0], [W, 0, 0], '≈ 7.5 m', { off: [0, 0, 0.55], tick: [0, 0, 1] });
  S.dim([0, 0, 0], [0, 0, -D], '≈ 8 m', { off: [-0.5, 0, 0], tick: [1, 0, 0] });
  S.dim([0, 0, -D], [0, H, -D], '≈ 3 m', { off: [-0.45, 0, 0], tick: [1, 0, 0] });
  S.dim([W / 2 - 1.2, 2.75, -D + 0.12], [W / 2 + 1.2, 2.75, -D + 0.12], '2.4 m', { off: [0, 0.16, 0], tick: [0, 1, 0] });
  S.dim([W / 2, 0, -D], [W / 2, 0, -6.05], '≈ 1.9 m clear', { tick: [1, 0, 0] });
  S.dim([HX, 0, 0.6], [HX + HALL, 0, 0.6], '≈ 2.5 m', { tick: [0, 0, 1] });

  // ---------- pins ----------
  const P = {
    signs: [HX + HALL - 0.6, 1.75, 0.92], banner: [HX + 0.12, 2.0, -0.15], reg: [HX + 1.4, 0.5, -3.12],
    signin: [HX + 1.35, 0.98, -2.85], doorsign: [W + t + 0.04, 1.8, -1.1],
    screen: [W / 2 + 0.95, 2.45, -D + 0.14], projector: [W / 2, 2.6, -D + 3.5], front: [1.05, 1.05, -7.35], board: [W / 2 + 1.65, 1.9, -D + 0.05],
    pods: [cols[0] - 0.75, 0.85, rowsZ[0] + 0.5], numbers: [cols[1], 1.0, rowsZ[0]], kits: [cols[2], 0.95, rowsZ[1]],
    supplies: [1.0, 1.05, -0.45], snacks: [3.4, 1.15, -0.45], camera: [0.35, 1.85, -0.36], trash: [0.2, 0.7, -1.05],
    room: [W / 2 + 1.6, 0.05, -1.0], aircon: [0.12, 2.85, -5.3],
  };
  pieces.forEach((p) => {
    if (!p.num || !P[p.id]) return;
    const layer = ['pods', 'numbers', 'kits'].includes(p.id) ? 'pods' : 'pins';
    S.pin(p.id, p.num, P[p.id], layer);
  });
}

// ---------- page text that is not in the model ----------
document.getElementById('venueCaption').textContent =
  'Orthographic, in metres. No photo of room 104 was found online, so the size (about 7.5 m × 8 m, for a 30-seat room) and the chairs are an estimate. Measure it when you visit. The hallway wall is see-through so you can see the sign-in table.';
document.getElementById('runSheet').innerHTML = runSheet.map(([time, title, text]) => `<li><time>${time}</time><div><b>${title}</b><span>${text}</span></div></li>`).join('');
document.getElementById('posts').innerHTML = posts.map(([who, text]) => `<li><time>${who.split(' · ')[1] ? '×' + who.split(' · ')[1] : '×1'}</time><div><b>${who.split(' · ')[0]}</b><span>${text}</span></div></li>`).join('');
document.getElementById('toCheck').innerHTML = toCheck.map((x) => `<li>${x}</li>`).join('');
document.getElementById('refList').innerHTML = refs.map(([title, text, src, url]) => `
  <div class="card"><h3>${title}</h3><p class="sec__sub" style="margin:0 0 12px">${text}</p><a class="src" href="${url}" target="_blank" rel="noopener">${src} ↗</a></div>`).join('');

mountPage({ pieces, groups, views, layers, build, shadowBox: 9 }).then((stage) => {
  if (stage) art.onChange(() => { stage.dirty = true; });
  mountAssets(art, { pieces, stage });
});
