// Shared 3D stage for /venuerender and /boothrender.
// Orthographic camera (like a technical drawing), metres, Y up.
// Drag to turn. View tabs tween the camera. Numbered pins and size labels are HTML on top of the canvas.
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';

export { THREE };

export const COL = {
  navy: 0x061a4d, core: 0x0646c8, electric: 0x006dff, cyan: 0x3dd9f2,
  ice: 0xb9eeff, paper: 0xf8fafc, ink: 0x101114, white: 0xffffff,
};

const ease = (t) => 1 - Math.pow(1 - t, 3);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class Stage {
  constructor(host, { shadowBox = 8, onHover, onSelect } = {}) {
    this.host = host;
    this.canvas = host.querySelector('canvas');
    this.overlay = host.querySelector('.stage__overlay');
    this.onHover = onHover;
    this.onSelect = onSelect;

    const r = (this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -200, 200);
    this.view = { az: 0.7, el: 0.6, tx: 0, ty: 0, tz: 0, size: 6, width: 6 };

    this.items = new Map();   // id -> { meshes, pins }
    this.labels = [];         // { el, pos, layer }
    this.layers = new Map();  // name -> { group, on }
    this.lineMats = new Set();
    this.edgeMat = this.lineMat(COL.navy, 1.1, 0.55);
    this.edgeMatHi = this.lineMat(COL.electric, 2.6, 1);
    this.dimMat = this.lineMat(COL.core, 1.3, 0.95);
    this.faintMat = this.lineMat(COL.navy, 1, 0.22);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xd9e2f2, 2.1));
    const sun = (this.sun = new THREE.DirectionalLight(0xffffff, 1.5));
    sun.position.set(-5, 11, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -shadowBox; sc.right = sc.top = shadowBox; sc.near = 0.1; sc.far = 40;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun, sun.target);

    this.raycaster = new THREE.Raycaster();
    this.hi = null;
    this.dirty = true;
    this.tween = null;

    this.bindPointer();
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
    const loop = (t) => { this.frame(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  // ---------- materials ----------
  lineMat(color, width, opacity) {
    const m = new LineMaterial({ color, linewidth: width, transparent: opacity < 1, opacity, depthTest: true });
    this.lineMats.add(m);
    return m;
  }

  mat(color, { opacity = 1, map = null, side = THREE.FrontSide, emissive = 0x000000 } = {}) {
    return new THREE.MeshLambertMaterial({
      color, map, side, emissive,
      transparent: opacity < 1, opacity, depthWrite: opacity >= 0.6,
    });
  }

  // ---------- layers (roof, sizes, people …) ----------
  layer(name) {
    if (!this.layers.has(name)) {
      const group = new THREE.Group();
      this.scene.add(group);
      this.layers.set(name, { group, on: true });
    }
    return this.layers.get(name).group;
  }

  // Dollhouse walls: hide an object when the camera looks at its outside face.
  autoHide(obj, normal) {
    (this.hiders || (this.hiders = [])).push({ obj, n: new THREE.Vector3(...normal).normalize() });
  }

  // Make an object that lives in another group follow this layer's on/off too.
  link(name, obj) {
    this.layer(name);
    const L = this.layers.get(name);
    (L.links || (L.links = [])).push(obj);
  }

  setLayer(name, on) {
    const L = this.layers.get(name);
    if (!L) return;
    L.on = on;
    L.group.visible = on;
    (L.links || []).forEach((o) => { o.visible = on; });
    this.labels.forEach((l) => { if (l.layer === name) l.el.hidden = !on; });
    this.dirty = true;
  }

  // ---------- geometry helpers ----------
  // Adds edges to a mesh so it reads like a drawing.
  edges(mesh, angle = 30, mat = this.edgeMat) {
    const eg = new THREE.EdgesGeometry(mesh.geometry, angle);
    const g = new LineSegmentsGeometry().setPositions(eg.attributes.position.array);
    const line = new LineSegments2(g, mat);
    line.userData.isEdge = true;
    line.userData.baseMat = mat;
    mesh.add(line);
    eg.dispose();
    return line;
  }

  // Box from min corner to max corner.
  box(x0, y0, z0, x1, y1, z1, material, { edges = true, cast = true, receive = true, angle } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), material);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.castShadow = cast;
    m.receiveShadow = receive;
    if (edges) this.edges(m, angle);
    return m;
  }

  // Printed panel (tarp, board). face = which way the print looks: '+z', '-z', '+x', '-x', '+y'.
  panel({ w, h, t = 0.006, face = '+z', map, back = 0xffffff, edges = true, cast = true }) {
    const geo = face === '+y' ? new THREE.BoxGeometry(w, t, h) : face === '+x' || face === '-x'
      ? new THREE.BoxGeometry(t, h, w) : new THREE.BoxGeometry(w, h, t);
    const plain = this.mat(back);
    const printed = this.mat(0xffffff, { map });
    // BoxGeometry material order: +x, -x, +y, -y, +z, -z
    const idx = { '+x': 0, '-x': 1, '+y': 2, '-y': 3, '+z': 4, '-z': 5 }[face];
    const mats = [plain, plain, plain, plain, plain, plain];
    mats[idx] = printed;
    const m = new THREE.Mesh(geo, mats);
    m.castShadow = cast;
    m.receiveShadow = true;
    if (edges) this.edges(m);
    return m;
  }

  cyl(x, y0, z, rad, y1, material, { seg = 18, edges = false, cast = true } = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, y1 - y0, seg), material);
    m.position.set(x, (y0 + y1) / 2, z);
    m.castShadow = cast;
    m.receiveShadow = true;
    if (edges) this.edges(m, 40);
    return m;
  }

  // A simple person for scale. Feet at (x, 0, z).
  person(x, z, { h = 1.75, color = 0xc9d6ee, opacity = 0.85, facing = 0 } = {}) {
    const g = new THREE.Group();
    const m = this.mat(color, { opacity });
    const headR = h * 0.065;
    const bodyH = h - headR * 2 - 0.04;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(h * 0.095, bodyH - h * 0.19, 6, 16), m);
    body.position.y = bodyH / 2;
    body.scale.z = 0.62;
    const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 20, 14), m);
    head.position.y = h - headR;
    [body, head].forEach((p) => { p.castShadow = true; g.add(p); this.edges(p, 60, this.faintMat); });
    g.position.set(x, 0, z);
    g.rotation.y = facing;
    return g;
  }

  // Straight line set (array of [x,y,z] pairs) in a given line material.
  lines(points, mat = this.faintMat) {
    const flat = points.flat();
    const g = new LineSegmentsGeometry().setPositions(flat);
    return new LineSegments2(g, mat);
  }

  // ---------- items, pins, labels ----------
  // Register a mesh/group as part of a numbered item, so it can glow and be picked.
  put(id, obj, parent = this.scene) {
    if (!this.items.has(id)) this.items.set(id, { meshes: [], pins: [] });
    const it = this.items.get(id);
    obj.traverse((o) => {
      if (o.isMesh && !o.userData.isEdge) {
        o.userData.item = id;
        // own material copy so one item can glow alone
        o.material = Array.isArray(o.material) ? o.material.map((mm) => mm.clone()) : o.material.clone();
        it.meshes.push(o);
      }
    });
    parent.add(obj);
    return obj;
  }

  add(obj, parent = this.scene) { parent.add(obj); return obj; }

  pin(id, num, pos, layer = 'pins') {
    const el = document.createElement('button');
    el.className = 'pin';
    el.type = 'button';
    el.textContent = num;
    el.dataset.item = id;
    el.setAttribute('aria-label', `Part ${num}`);
    el.addEventListener('mouseenter', () => this.setHi(id, 'pin'));
    el.addEventListener('mouseleave', () => this.setHi(null, 'pin'));
    el.addEventListener('focus', () => this.setHi(id, 'pin'));
    el.addEventListener('blur', () => this.setHi(null, 'pin'));
    el.addEventListener('click', () => this.onSelect && this.onSelect(id));
    this.overlay.appendChild(el);
    const l = { el, pos: new THREE.Vector3(...pos), layer };
    this.labels.push(l);
    if (this.items.has(id)) this.items.get(id).pins.push(el);
    else this.items.set(id, { meshes: [], pins: [el] });
    return el;
  }

  tag(pos, text, { cls = '', layer = 'tags' } = {}) {
    const el = document.createElement('span');
    el.className = `tag ${cls}`.trim();
    el.textContent = text;
    this.overlay.appendChild(el);
    this.labels.push({ el, pos: new THREE.Vector3(...pos), layer });
    return el;
  }

  // Size line from a to b, pushed out by `off`, with end ticks along `tick`.
  dim(a, b, text, { off = [0, 0, 0], tick = [0, 1, 0], layer = 'dims' } = {}) {
    const A = new THREE.Vector3(...a).add(new THREE.Vector3(...off));
    const B = new THREE.Vector3(...b).add(new THREE.Vector3(...off));
    const T = new THREE.Vector3(...tick).normalize().multiplyScalar(0.06);
    const pts = [
      [A.x, A.y, A.z], [B.x, B.y, B.z],
      [A.x - T.x, A.y - T.y, A.z - T.z], [A.x + T.x, A.y + T.y, A.z + T.z],
      [B.x - T.x, B.y - T.y, B.z - T.z], [B.x + T.x, B.y + T.y, B.z + T.z],
    ];
    const ext = [];
    if (off.some((v) => v !== 0)) ext.push(a, [A.x, A.y, A.z], b, [B.x, B.y, B.z]);
    const g = this.layer(layer);
    const line = this.lines(pts, this.dimMat);
    line.renderOrder = 5;
    g.add(line);
    if (ext.length) g.add(this.lines(ext, this.faintMat));
    const mid = A.clone().add(B).multiplyScalar(0.5);
    return this.tag([mid.x, mid.y, mid.z], text, { cls: 'tag--dim', layer });
  }

  // ---------- highlight ----------
  setHi(id, from = 'canvas') {
    if (id === this.hi) return;
    const prev = this.items.get(this.hi);
    if (prev) this.glow(prev, false);
    this.hi = id;
    const it = this.items.get(id);
    if (it) this.glow(it, true);
    this.canvas.style.cursor = id ? 'pointer' : '';
    if (this.onHover) this.onHover(id, from);
    this.dirty = true;
  }

  glow(it, on) {
    it.meshes.forEach((m) => {
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((mm) => {
        if (mm.emissive) mm.emissive.setHex(on ? 0x1d4fd8 : 0x000000);
        if (mm.emissiveIntensity !== undefined) mm.emissiveIntensity = on ? 0.32 : 1;
      });
      m.children.forEach((c) => { if (c.userData.isEdge) c.material = on ? this.edgeMatHi : c.userData.baseMat; });
    });
    it.pins.forEach((p) => p.classList.toggle('is-on', on));
  }

  // ---------- camera ----------
  setView(v, animate = true) {
    const to = { ...this.view, ...v };
    if (!animate) { this.view = to; this.dirty = true; return; }
    const from = { ...this.view };
    to.az = from.az + wrapAngle(to.az - from.az);
    this.tween = { from, to, t0: performance.now(), dur: 750 };
  }

  applyCamera() {
    const v = this.view;
    const w = this.host.clientWidth || 1;
    const h = this.host.clientHeight || 1;
    const aspect = w / h;
    const halfH = Math.max(v.size, (v.width || v.size) / aspect) / 2;
    const c = this.cam;
    c.left = -halfH * aspect; c.right = halfH * aspect; c.top = halfH; c.bottom = -halfH;
    c.updateProjectionMatrix();
    const R = 60;
    const el = clamp(v.el, 0.001, Math.PI / 2 - 0.0005);
    c.position.set(
      v.tx + R * Math.cos(el) * Math.sin(v.az),
      v.ty + R * Math.sin(el),
      v.tz + R * Math.cos(el) * Math.cos(v.az),
    );
    c.up.set(0, 1, 0);
    if (el > 1.55) c.up.set(-Math.sin(v.az), 0, -Math.cos(v.az));
    c.lookAt(v.tx, v.ty, v.tz);
    this.pxPerM = h / (halfH * 2);
    if (this.hiders) {
      const d = new THREE.Vector3(Math.cos(el) * Math.sin(v.az), Math.sin(el), Math.cos(el) * Math.cos(v.az));
      this.hiders.forEach((hd) => { hd.obj.visible = d.dot(hd.n) < 0.2; });
    }
  }

  resize() {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    const pr = this.renderer.getPixelRatio();
    this.lineMats.forEach((m) => m.resolution.set(w * pr, h * pr));
    this.dirty = true;
  }

  frame(now) {
    if (this.tween) {
      const { from, to, t0, dur } = this.tween;
      const k = ease(clamp((now - t0) / dur, 0, 1));
      for (const key of Object.keys(to)) {
        if (typeof to[key] === 'number' && typeof from[key] === 'number') this.view[key] = from[key] + (to[key] - from[key]) * k;
      }
      if (k >= 1) this.tween = null;
      this.dirty = true;
      if (this.onViewChange) this.onViewChange(this.view);
    }
    if (!this.dirty) return;
    this.dirty = false;
    this.applyCamera();
    this.renderer.render(this.scene, this.cam);
    this.placeLabels();
  }

  placeLabels() {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    const v = new THREE.Vector3();
    const shown = [];
    for (const l of this.labels) {
      if (l.el.hidden) continue;
      v.copy(l.pos).project(this.cam);
      l.x = (v.x * 0.5 + 0.5) * w;
      l.y = (-v.y * 0.5 + 0.5) * h;
      shown.push(l);
    }
    // push numbered pins apart a little so two numbers never sit on top of each other
    const pins = shown.filter((l) => l.layer !== 'dims' && l.el.classList.contains('pin'));
    const gap = 26;
    for (let k = 0; k < 4; k++) {
      for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) {
        const a = pins[i], b = pins[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d >= gap) continue;
        if (d < 0.01) { dx = 1; dy = 0; }
        const push = (gap - d) / 2 / (d || 1);
        a.x -= dx * push; a.y -= dy * push;
        b.x += dx * push; b.y += dy * push;
      }
    }
    for (const l of shown) {
      const off = l.x < -40 || l.x > w + 40 || l.y < -40 || l.y > h + 40;
      l.el.style.visibility = off ? 'hidden' : '';
      // position with `translate`; CSS centres with `transform`, so a pin can grow (scale) in place
      l.el.style.translate = `${l.x.toFixed(1)}px ${l.y.toFixed(1)}px`;
    }
  }

  // ---------- pointer ----------
  bindPointer() {
    const cv = this.canvas;
    let drag = null;
    let hoverQueued = false;
    let lastMove = null;

    cv.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, az: this.view.az, el: this.view.el, moved: false, id: e.pointerId };
      this.tween = null;
    });
    window.addEventListener('pointermove', (e) => {
      if (drag && e.pointerId === drag.id) {
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) > 4) {
          drag.moved = true;
          cv.setPointerCapture?.(e.pointerId);
          this.host.classList.add('is-dragging');
          if (this.onDragStart) this.onDragStart();
        }
        if (drag.moved) {
          this.view.az = drag.az - dx * 0.0085;
          this.view.el = clamp(drag.el + dy * 0.0065, 0.02, Math.PI / 2 - 0.001);
          this.dirty = true;
          if (this.onViewChange) this.onViewChange(this.view);
        }
        return;
      }
      if (e.target !== cv) return;
      lastMove = e;
      if (!hoverQueued) {
        hoverQueued = true;
        requestAnimationFrame(() => { hoverQueued = false; this.pick(lastMove); });
      }
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const wasClick = !drag.moved;
      drag = null;
      this.host.classList.remove('is-dragging');
      if (wasClick && e.type === 'pointerup') {
        const id = this.pick(e);
        if (id && this.onSelect) this.onSelect(id);
      }
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    cv.addEventListener('pointerleave', () => { if (!drag) this.setHi(null); });
  }

  pick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const p = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.applyCamera();
    this.raycaster.setFromCamera(p, this.cam);
    const meshes = [];
    this.items.forEach((it) => it.meshes.forEach((m) => { if (m.visible && isShown(m) && !m.userData.noPick) meshes.push(m); }));
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    const id = hit ? hit.object.userData.item : null;
    this.setHi(id);
    return id;
  }
}

function isShown(o) {
  for (let p = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

// ---------- textures ----------
export function canvasTexture(wpx, hpx, draw) {
  const c = document.createElement('canvas');
  c.width = wpx;
  c.height = hpx;
  const g = c.getContext('2d');
  draw(g, wpx, hpx);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
}

// Recolor a dark logo (like the wordmark) to any flat color.
export function tint(img, color) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

export const FONT = '"SF Pro Display", -apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif';
export const FONT_TEXT = '"SF Pro Text", -apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif';

// Draw a mock QR (finder squares + random modules). Not scannable. It only shows where the real QR goes.
export function mockQR(g, x, y, size, seed = 7, color = '#061a4d') {
  const n = 25;
  const cell = size / n;
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  g.fillStyle = '#fff';
  g.fillRect(x - cell * 2, y - cell * 2, size + cell * 4, size + cell * 4);
  g.fillStyle = color;
  const finder = (fx, fy) => {
    g.fillRect(x + fx * cell, y + fy * cell, cell * 7, cell * 7);
    g.fillStyle = '#fff'; g.fillRect(x + (fx + 1) * cell, y + (fy + 1) * cell, cell * 5, cell * 5);
    g.fillStyle = color; g.fillRect(x + (fx + 2) * cell, y + (fy + 2) * cell, cell * 3, cell * 3);
  };
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const inF = (i < 8 && j < 8) || (i > n - 9 && j < 8) || (i < 8 && j > n - 9);
    if (!inF && rnd() > 0.52) g.fillRect(x + i * cell, y + j * cell, cell + 0.5, cell + 0.5);
  }
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
}

// Wrap text into lines that fit maxW.
export function wrap(g, text, maxW) {
  const words = text.split(' ');
  const out = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}
