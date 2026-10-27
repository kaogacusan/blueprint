/* Sign-in illustration: a blueprint sheet rolled up on one side, a pale sheet under it,
   and three glass blocks on top. It idles on a slow loop: the blocks float, the roll breathes,
   a scan line crosses the drawing. Only runs while the sign-in screen is showing. */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/RoomEnvironment.js";

const FLAT = 2.7;     // flat part of the sheet
const ROLL = 3.3;     // paper that goes into the roll
const DEPTH = 2.05;   // sheet depth
const R = 0.3;        // outer roll radius
const GAP = 0.05;     // radius lost per turn
const X_ROLL = -1.25; // where the roll starts
const YAW = -0.22;    // turn the model so the roll runs corner to corner

function webglOK() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

/* the drawing on the sheet: canvas covers the whole strip, roll end on the left */
function blueprintTexture() {
  const W = 3072, H = Math.round(W * (DEPTH / (FLAT + ROLL)));
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#1d55dc"); g.addColorStop(0.55, "#2a68ef"); g.addColorStop(1, "#1747c9");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // fine grid everywhere
  for (let x = 0; x <= W; x += 22) { c.fillStyle = x % 110 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.11)"; c.fillRect(x, 0, 1.4, H); }
  for (let y = 0; y <= H; y += 22) { c.fillStyle = y % 110 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.11)"; c.fillRect(0, y, W, 1.4); }
  // the drawing sits on the flat part (right side of the canvas)
  const x0 = W * (ROLL / (FLAT + ROLL)) + 40, x1 = W - 46, y0 = 46, y1 = H - 46;
  const line = (a = 0.8, w = 3) => { c.strokeStyle = `rgba(235,245,255,${a})`; c.lineWidth = w; };
  line(0.85, 4); c.strokeRect(x0, y0, x1 - x0, y1 - y0);
  line(0.5, 2); c.strokeRect(x0 + 14, y0 + 14, x1 - x0 - 28, y1 - y0 - 28);
  const mx = x0 + (x1 - x0) * 0.47, my = y0 + (y1 - y0) * 0.5;
  line(0.8, 3);
  c.beginPath(); c.moveTo(mx, y0 + 14); c.lineTo(mx, y1 - 14); c.moveTo(x0 + 14, my); c.lineTo(x1 - 14, my); c.stroke();
  const pad = 34;
  // top-left: text rows
  line(0.65, 3);
  for (let i = 0; i < 7; i++) { const y = y0 + pad + 26 + i * 34; c.beginPath(); c.moveTo(x0 + pad + 10, y); c.lineTo(x0 + pad + 10 + (mx - x0 - pad * 2 - 20) * (i % 3 === 0 ? 0.55 : 0.9), y); c.stroke(); }
  // top-right: a table
  line(0.6, 2.4);
  const tx = mx + pad, ty = y0 + pad, tw = x1 - mx - pad * 2, tht = my - y0 - pad * 2;
  c.strokeRect(tx, ty, tw, tht);
  for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(tx, ty + (tht / 6) * i); c.lineTo(tx + tw, ty + (tht / 6) * i); c.stroke(); }
  for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(tx + (tw / 4) * i, ty); c.lineTo(tx + (tw / 4) * i, ty + tht); c.stroke(); }
  // bottom-left: boxes
  line(0.6, 2.4);
  const bx = x0 + pad, by = my + pad, bw = mx - x0 - pad * 2, bh = y1 - my - pad * 2;
  c.strokeRect(bx, by, bw * 0.45, bh * 0.55); c.strokeRect(bx + bw * 0.52, by, bw * 0.48, bh * 0.55);
  for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(bx, by + bh * 0.7 + i * 26); c.lineTo(bx + bw * (0.9 - i * 0.2), by + bh * 0.7 + i * 26); c.stroke(); }
  // bottom-right: grid with a target
  const gx = mx + pad, gy = my + pad, gw = x1 - mx - pad * 2, gh = y1 - my - pad * 2;
  line(0.35, 1.6);
  for (let i = 0; i <= 10; i++) { c.beginPath(); c.moveTo(gx + (gw / 10) * i, gy); c.lineTo(gx + (gw / 10) * i, gy + gh); c.stroke(); }
  for (let i = 0; i <= 6; i++) { c.beginPath(); c.moveTo(gx, gy + (gh / 6) * i); c.lineTo(gx + gw, gy + (gh / 6) * i); c.stroke(); }
  line(0.8, 3);
  const cx = gx + gw / 2, cy = gy + gh / 2;
  c.beginPath(); c.arc(cx, cy, gh * 0.3, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(cx, cy, gh * 0.12, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.moveTo(cx - gh * 0.42, cy); c.lineTo(cx + gh * 0.42, cy); c.moveTo(cx, cy - gh * 0.42); c.lineTo(cx, cy + gh * 0.42); c.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function paleTexture() {
  const W = 1024, H = 800, cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  c.fillStyle = "#cfe0ff"; c.fillRect(0, 0, W, H);
  c.strokeStyle = "rgba(60,110,220,0.35)"; c.lineWidth = 2;
  c.strokeRect(24, 24, W - 48, H - 48);
  c.lineWidth = 1;
  for (let x = 24; x < W - 24; x += 32) { c.beginPath(); c.moveTo(x, 24); c.lineTo(x, H - 24); c.stroke(); }
  for (let y = 24; y < H - 24; y += 32) { c.beginPath(); c.moveTo(24, y); c.lineTo(W - 24, y); c.stroke(); }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function radial(size, stops) {
  const s = 256, cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const c = cv.getContext("2d");
  const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  c.fillStyle = g; c.fillRect(0, 0, s, s);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

/* arc length → angle along the shrinking spiral of the roll */
const SPIRAL = (() => {
  const out = [[0, 0]];
  let s = 0, th = 0;
  while (s < ROLL + 1) { const r = Math.max(0.04, R - (GAP * th) / (2 * Math.PI)); th += 0.01; s += r * 0.01; out.push([s, th]); }
  return out;
})();
function thetaAt(s) {
  let lo = 0, hi = SPIRAL.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; SPIRAL[mid][0] < s ? (lo = mid) : (hi = mid); }
  const [s0, t0] = SPIRAL[lo], [s1, t1] = SPIRAL[hi];
  return t0 + ((s - s0) / (s1 - s0 || 1)) * (t1 - t0);
}

export function mount(host) {
  if (!host || !webglOK()) { host?.classList.add("no-gl"); return { stop() {} }; }
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;

  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 60);
  scene.add(new THREE.HemisphereLight(0xeef5ff, 0x2a4f9a, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-2.5, 6, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -3;
  key.shadow.camera.right = key.shadow.camera.top = 3;
  key.shadow.radius = 6;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  if ("intensity" in key.shadow) key.shadow.intensity = 0.45;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8cc4ff, 1.4);
  rim.position.set(4, 2.5, -4);
  scene.add(rim);

  const model = new THREE.Group();
  scene.add(model);

  // soft shadow and blue glow on the "floor"
  const shadow = radial(4.4, [[0, "rgba(6,26,77,0.2)"], [0.55, "rgba(6,26,77,0.07)"], [1, "rgba(6,26,77,0)"]]);
  shadow.position.set(0.15, -0.02, 0.1);
  const glow = radial(4.6, [[0, "rgba(40,110,255,0.42)"], [1, "rgba(40,110,255,0)"]]);
  glow.position.set(-0.9, -0.015, 0.7);
  model.add(shadow, glow);

  // pale sheet underneath
  const under = new THREE.Mesh(new THREE.PlaneGeometry(2.85, 2.1), new THREE.MeshStandardMaterial({ map: paleTexture(), roughness: 0.7, transparent: true, opacity: 0.92 }));
  under.rotation.set(-Math.PI / 2, 0, -0.07);
  under.position.set(0.32, -0.008, 0.28);
  under.receiveShadow = true;
  model.add(under);

  // the sheet with its roll
  const L = FLAT + ROLL;
  const geo = new THREE.PlaneGeometry(L, DEPTH, 360, 1);
  const base = geo.attributes.position.array.slice();
  const front = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: blueprintTexture(), roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4, side: THREE.FrontSide }));
  const back = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0x2b62e6, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.35, side: THREE.BackSide }));
  front.castShadow = back.castShadow = true;
  front.receiveShadow = back.receiveShadow = true;
  model.add(front, back);
  const shape = (flat) => {
    const p = geo.attributes.position.array;
    const xRight = X_ROLL + FLAT;
    for (let i = 0; i < base.length; i += 3) {
      const s = L / 2 - base[i];          // distance from the right edge
      const z = -base[i + 1];
      if (s <= flat) { p[i] = xRight - s; p[i + 1] = 0; p[i + 2] = z; continue; }
      const th = thetaAt(s - flat);
      const r = Math.max(0.04, R - (GAP * th) / (2 * Math.PI));
      const xr = xRight - flat;
      p[i] = xr - r * Math.sin(th);
      p[i + 1] = R - r * Math.cos(th);
      p[i + 2] = z;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
  };
  shape(FLAT);

  // a scan line that crosses the drawing
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(0.025, DEPTH * 0.96), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  scan.rotation.x = -Math.PI / 2;
  scan.position.y = 0.006;
  model.add(scan);

  // glass blocks
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xd6e6ff, transmission: 1, thickness: 0.9, roughness: 0.16, ior: 1.4,
    attenuationColor: new THREE.Color(0x5f9bff), attenuationDistance: 1.1,
    clearcoat: 1, clearcoatRoughness: 0.08, specularIntensity: 1, envMapIntensity: 1.4,
  });
  const edge = new THREE.LineBasicMaterial({ color: 0xf2f8ff, transparent: true, opacity: 0.75 });
  const blocks = [
    { s: [0.6, 0.36, 0.6], p: [0.72, 0.18, -0.36] },
    { s: [0.38, 0.46, 0.38], p: [0.6, 0.36 + 0.23, -0.5] },
    { s: [0.32, 0.3, 0.32], p: [1.12, 0.15, 0.02] },
  ].map((b) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(...b.s, 4, 0.03), glass);
    m.position.set(...b.p);
    m.castShadow = true;
    // crisp light edges, like cut glass
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(...b.s.map((v) => v - 0.012))), edge));
    model.add(m);
    return { m, y: b.p[1] };
  });

  model.rotation.y = YAW;
  model.position.set(0, 0, 0);

  const target = new THREE.Vector3(0.05, 0.12, 0.05);
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the whole model in frame on narrow slots
    const dist = 8.4 * Math.max(1, 1.25 / camera.aspect);
    camera.position.set(target.x + dist * 0.2, target.y + dist * 0.78, target.z + dist * 0.6);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  let raf = 0, t = 0, last = performance.now(), running = true;
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    if (!reduce) {
      model.rotation.y = YAW + Math.sin(t * 0.22) * 0.06;
      model.position.y = Math.sin(t * 0.55) * 0.025;
      blocks.forEach((b, i) => {
        b.m.position.y = b.y + 0.03 + Math.sin(t * 0.9 + i * 1.7) * 0.03;
        b.m.rotation.y = Math.sin(t * 0.35 + i) * 0.06;
      });
      shape(FLAT + Math.sin(t * 0.5) * 0.05);
      const k = (t % 7) / 7; // one pass every 7s, then rest
      const sweep = Math.min(1, k / 0.55);
      scan.position.x = X_ROLL + 0.1 + sweep * (FLAT - 0.2);
      scan.material.opacity = k < 0.55 ? Math.sin(sweep * Math.PI) * 0.35 : 0;
    }
    renderer.render(scene, camera);
    raf = running && !reduce ? requestAnimationFrame(frame) : 0;
  };
  raf = requestAnimationFrame(frame);
  // pause when the tab is hidden
  const vis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (running && !raf && !reduce) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  document.addEventListener("visibilitychange", vis);
  host.classList.add("has-gl");

  return {
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", vis);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
