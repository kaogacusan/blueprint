/* Blueprint — 3D scenes (three.js, loaded locally from assets/vendor).
   The models do not react to the mouse. Scroll drives them.
   1. "What is Blueprint": a curled blueprint resume. It unrolls and turns as you scroll past.
   2. Sessions: 4 blocks rise one by one as you scroll. Point at a session card to lift its block. */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/RoomEnvironment.js";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

/* ---------- shared helpers ---------- */

/* 0 when `el` first shows at the bottom of the screen, 1 when it has left at the top. */
function scrollProgress(el) {
  const r = el.getBoundingClientRect(), vh = window.innerHeight;
  return clamp((vh - r.top) / (vh + r.height), 0, 1);
}

function createStage(host, { fov = 28, position, target }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.className = "gl";
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
  camera.position.copy(position);
  camera.lookAt(target);

  scene.add(new THREE.HemisphereLight(0xdff1ff, 0x0a1d5c, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(3, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x6fd8ff, 1.6);
  rim.position.set(-5, 2, -4);
  scene.add(rim);

  // the canvas is bigger than its slot (no box around the model), so size from the canvas
  const resize = () => {
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(renderer.domElement);
  resize();

  const tasks = [];
  let visible = false, raf = 0, last = 0, time = 0;
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    time += dt;
    tasks.forEach((f) => f(dt, time));
    renderer.render(scene, camera);
    raf = visible ? requestAnimationFrame(loop) : 0;
  };
  // only render while on screen
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }, { rootMargin: "200px" }).observe(host);

  host.classList.add("has-gl");
  return { renderer, scene, camera, canvas: renderer.domElement, onFrame: (f) => tasks.push(f) };
}

/* Two-color gradient baked into vertex colors. `pick` returns 0..1 for a vertex. */
function paintGradient(geo, from, to, pick) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox, pos = geo.attributes.position;
  const a = new THREE.Color(from), b = new THREE.Color(to), c = new THREE.Color();
  const cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const nx = (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x || 1);
    const ny = (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y || 1);
    c.copy(a).lerp(b, clamp(pick(nx, ny), 0, 1)).toArray(cols, i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  return geo;
}

/* Fine grain, like the texture on the logo. */
function grainTexture() {
  const s = 256, cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d"), img = ctx.createImageData(s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 222 + Math.random() * 33;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* A blueprint grid on the floor that fades out at the edges. */
function blueprintFloor(size = 8, color = "rgba(6,70,200,0.55)") {
  const s = 1024, cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d");
  ctx.strokeStyle = color;
  for (let i = 0; i <= 32; i++) {
    const p = (i / 32) * s;
    ctx.lineWidth = i % 4 === 0 ? 2 : 0.8;
    ctx.globalAlpha = i % 4 === 0 ? 0.9 : 0.45;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(s, p); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "destination-in";
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(0,0,0,0.9)");
  g.addColorStop(0.55, "rgba(0,0,0,0.35)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.55 })
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function softShadow(size = 3.2, alpha = 0.28) {
  const s = 256, cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, `rgba(6,26,77,${alpha})`);
  g.addColorStop(1, "rgba(6,26,77,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.002;
  return mesh;
}

/* ---------- 1. Curled blueprint resume ---------- */

function resumeTexture() {
  const W = 1024, H = 1325, cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#3a96ff"); g.addColorStop(0.5, "#0a52d8"); g.addColorStop(1, "#08308f");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // grid
  for (let x = 0; x <= W; x += 32) { c.fillStyle = x % 128 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.13)"; c.fillRect(x, 0, 1.5, H); }
  for (let y = 0; y <= H; y += 32) { c.fillStyle = y % 128 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.13)"; c.fillRect(0, y, W, 1.5); }
  const font = '-apple-system, "SF Pro Display", "Inter", system-ui, sans-serif';
  const bar = (x, y, w, h = 14, a = 0.6) => { c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.roundRect(x, y, w, h, h / 2); c.fill(); };
  // header
  c.strokeStyle = "rgba(255,255,255,0.85)"; c.lineWidth = 6;
  c.beginPath(); c.arc(150, 170, 62, 0, Math.PI * 2); c.stroke();
  c.fillStyle = "#fff"; c.font = `700 64px ${font}`; c.fillText("Your Name", 250, 165);
  c.font = `500 26px ui-monospace, Menlo, monospace`; c.fillStyle = "rgba(255,255,255,0.75)";
  c.fillText("STUDENT  ·  ATENEO DE MANILA", 252, 212);
  // sections
  const section = (y, title, rows) => {
    c.font = `500 24px ui-monospace, Menlo, monospace`; c.fillStyle = "rgba(185,238,255,0.95)";
    c.fillText(title, 90, y);
    c.fillStyle = "rgba(255,255,255,0.25)"; c.fillRect(90, y + 16, W - 180, 2);
    rows.forEach((r, i) => {
      const yy = y + 54 + i * 54;
      c.strokeStyle = "rgba(255,255,255,0.6)"; c.lineWidth = 3;
      c.beginPath(); c.roundRect(90, yy - 4, 26, 26, 6); c.stroke();
      bar(140, yy, r * (W - 240));
      bar(140, yy + 22, r * 0.55 * (W - 240), 10, 0.35);
    });
  };
  section(320, "EXPERIENCE", [0.85, 0.7, 0.78]);
  section(560, "PROJECTS", [0.8, 0.62]);
  section(740, "ORG WORK", [0.74, 0.58]);
  section(920, "SKILLS", [0.5]);
  // stamp
  c.save(); c.translate(W - 250, H - 170); c.rotate(-0.12);
  c.strokeStyle = "rgba(185,238,255,0.9)"; c.lineWidth = 4;
  c.beginPath(); c.roundRect(-20, -52, 230, 76, 12); c.stroke();
  c.fillStyle = "rgba(185,238,255,0.95)"; c.font = `700 40px ${font}`; c.fillText("blueprint", 0, 0);
  c.restore();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function curledPaper(host) {
  const st = createStage(host, { fov: 30, position: new THREE.Vector3(0, 0.2, 6), target: new THREE.Vector3(0, 0, 0) });
  const w = 2.1, h = w * (11 / 8.5);
  const geo = new THREE.PlaneGeometry(w, h, 80, 80);
  const base = geo.attributes.position.array.slice();
  const front = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: resumeTexture(), roughness: 0.55, clearcoat: 0.25, side: THREE.FrontSide }));
  const back = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xdcebff, roughness: 0.8, side: THREE.BackSide }));
  const paper = new THREE.Group();
  paper.add(front, back);
  st.scene.add(paper);

  // curl along a slightly diagonal line, from the bottom-right corner
  const dir = new THREE.Vector2(0.78, -0.62).normalize();
  let maxU = -Infinity;
  for (let i = 0; i < base.length; i += 3) maxU = Math.max(maxU, base[i] * dir.x + base[i + 1] * dir.y);
  const R = 0.3;
  const applyCurl = (amount) => {
    const pos = geo.attributes.position.array;
    const c0 = maxU - amount * 2.1;
    for (let i = 0; i < base.length; i += 3) {
      const x = base[i], y = base[i + 1];
      const u = x * dir.x + y * dir.y;
      if (u <= c0) { pos[i] = x; pos[i + 1] = y; pos[i + 2] = 0; continue; }
      const th = (u - c0) / R;
      const nu = c0 + R * Math.sin(th);
      pos[i] = x + dir.x * (nu - u);
      pos[i + 1] = y + dir.y * (nu - u);
      pos[i + 2] = R * (1 - Math.cos(th));
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
  };

  // scroll drives everything: rolled up when it comes in, flat in the middle, turning as it leaves
  let curl = 1.2, rx = -0.4, ry = 0.9, py = -0.3, p = 0;
  const onScroll = () => { p = scrollProgress(host); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  st.onFrame((dt, t) => {
    const open = clamp((p - 0.12) / 0.38, 0, 1);         // 0 → 1 while it scrolls up to the middle
    const leave = clamp((p - 0.62) / 0.38, 0, 1);        // 0 → 1 as it scrolls away
    const breathe = reduce ? 0 : Math.sin(t * 1.2) * 0.03;
    curl = damp(curl, clamp(1.25 - open * 1.1 + leave * 0.5 + breathe, 0.04, 1.35), 6, dt);
    applyCurl(curl);
    rx = damp(rx, -0.45 + open * 0.3 - leave * 0.2, 6, dt);
    ry = damp(ry, 0.95 - open * 0.75 - leave * 0.45, 6, dt);
    py = damp(py, -0.35 + open * 0.35 + leave * 0.35, 6, dt);
    paper.rotation.set(rx, ry, -0.14 + leave * 0.1);
    paper.position.y = py + (reduce ? 0 : Math.sin(t * 0.9) * 0.04);
  });
}

/* ---------- 2. Session blocks ---------- */

function labelTexture(num, word, dark) {
  const cv = document.createElement("canvas");
  cv.width = 512; cv.height = 256;
  const c = cv.getContext("2d");
  c.fillStyle = dark ? "#061a4d" : "#ffffff";
  c.font = '700 92px -apple-system, "SF Pro Display", "Inter", system-ui, sans-serif';
  c.fillText(num, 36, 120);
  c.font = '500 40px ui-monospace, Menlo, monospace';
  c.globalAlpha = 0.85;
  c.fillText(word.toUpperCase(), 40, 196);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function sessionBlocks(host) {
  const st = createStage(host, { fov: 25, position: new THREE.Vector3(2.6, 3.3, 7.6), target: new THREE.Vector3(0, 0.9, 0) });
  const grain = grainTexture();
  const floor = blueprintFloor(10);
  floor.position.y = 0;
  st.scene.add(floor, softShadow(6.5, 0.22));

  const data = [
    { n: "01", w: "Discover", h: 0.75, from: "#061a4d", to: "#1b48c4", dark: false },
    { n: "02", w: "Prove", h: 1.2, from: "#0646c8", to: "#2f86ff", dark: false },
    { n: "03", w: "Build", h: 1.65, from: "#0059e0", to: "#2fa8ff", dark: false },
    { n: "04", w: "Connect", h: 2.1, from: "#14a9e6", to: "#8fe3ff", dark: true },
  ];
  const cards = [...document.querySelectorAll("[data-session]")];
  const blocks = data.map((d, i) => {
    const geo = new RoundedBoxGeometry(1, d.h, 1, 5, 0.1);
    geo.translate(0, d.h / 2, 0);
    paintGradient(geo, d.from, d.to, (x, y) => y * 0.8 + x * 0.2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
      vertexColors: true, map: grain, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3, emissive: 0x2a7bff, emissiveIntensity: 0,
    }));
    const group = new THREE.Group();
    group.position.x = (i - 1.5) * 1.22;
    group.add(mesh);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.45),
      new THREE.MeshBasicMaterial({ map: labelTexture(d.n, d.w, d.dark), transparent: true, opacity: 0, depthWrite: false })
    );
    label.position.set(0.02, 0.3, 0.505);
    group.add(label);
    st.scene.add(group);
    mesh.userData.index = i;
    return { group, mesh, label, rise: reduce ? 1 : 0, lift: 0, lit: 0 };
  });

  // scroll drives the rise and the camera. The only pointer input is the session cards.
  let p = 0, cardHover = -1;
  const onScroll = () => { p = scrollProgress(host); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  cards.forEach((c, i) => {
    c.addEventListener("pointerenter", () => { cardHover = i; c.classList.add("is-lit"); });
    c.addEventListener("pointerleave", () => { if (cardHover === i) cardHover = -1; c.classList.remove("is-lit"); });
  });

  let camX = 4, camY = 4.2;
  st.onFrame((dt, t) => {
    blocks.forEach((b, i) => {
      // block i rises between 15% and 45% of the scroll pass, one after another
      const target = reduce ? 1 : clamp((p - 0.12 - i * 0.06) / 0.16, 0, 1);
      b.rise = damp(b.rise, target, 7, dt);
      b.lift = damp(b.lift, cardHover === i ? 1 : 0, 8, dt);
      b.group.scale.y = Math.max(0.001, b.rise);
      b.label.scale.y = 1 / Math.max(0.001, b.rise);
      b.label.material.opacity = clamp((b.rise - 0.85) * 6.6, 0, 1);
      b.group.position.y = b.lift * 0.3 + (reduce ? 0 : Math.sin(t * 1.4 + i) * 0.02);
      b.mesh.material.emissiveIntensity = b.lift * 0.4;
    });
    // camera swings from right to left as you scroll through
    camX = damp(camX, 4.2 - p * 3.6, 5, dt);
    camY = damp(camY, 4.4 - p * 1.6, 5, dt);
    // pull the camera back on narrow (phone) screens so all 4 blocks fit
    const camZ = st.camera.aspect < 1.2 ? 13 / st.camera.aspect : 7.6;
    st.camera.position.set(camX, camY * (camZ / 7.6) ** 0.5, camZ);
    st.camera.lookAt(0, 0.9, 0);
  });
}

/* ---------- boot ---------- */

function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}

if (webglOK()) {
  const run = (id, fn) => {
    const el = document.getElementById(id);
    if (!el) return;
    try { fn(el); } catch (err) { console.warn(`[3D] ${id} failed`, err); el.classList.add("no-gl"); }
  };
  run("paper3d", curledPaper);
  run("steps3d", sessionBlocks);
} else {
  document.querySelectorAll(".scene3d").forEach((el) => el.classList.add("no-gl"));
}
