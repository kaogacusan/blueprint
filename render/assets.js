// Print files on /venuerender and /boothrender.
// loadArt() reads /assets/print/<page>/manifest.json (made by `npm run print`) and gives the 3D model one texture
// per printed piece. mountAssets() draws the list: pick a version, the model changes, download the files.
import { THREE } from './stage.js';

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: picks reset on reload */ } },
};

export async function loadArt(page) {
  let manifest = { page, looks: [], assets: [] };
  try {
    const r = await fetch(`/assets/print/${page}/manifest.json`, { cache: 'no-cache' });
    if (r.ok) manifest = await r.json();
  } catch { /* no print files: the model shows blank panels */ }
  manifest.assets = manifest.assets.filter((a) => a.versions.length);

  const key = `bp-print-${page}`;
  const byId = new Map(manifest.assets.map((a) => [a.id, a]));
  const saved = store.get(key) || {};
  const picks = {};
  manifest.assets.forEach((a) => { picks[a.id] = a.versions.some((v) => v.id === saved[a.id]) ? saved[a.id] : a.versions[0].id; });

  const version = (id) => { const a = byId.get(id); return a && (a.versions.find((v) => v.id === picks[id]) || a.versions[0]); };
  const images = new Map();
  const image = (src) => {
    if (!images.has(src)) images.set(src, new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }));
    return images.get(src);
  };

  const texs = [];
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => fn(picks));

  async function paint(t) {
    const v = version(t.id);
    if (!v) return;
    const im = await image(v.m[t.page] || v.m[0]);
    if (!im || version(t.id) !== v) return;   // failed, or a newer pick came in
    const g = t.tex.image.getContext('2d');
    const { width: w, height: h } = t.tex.image;
    g.clearRect(0, 0, w, h);
    if (t.draw) t.draw(g, im, w, h);
    else {
      const [cx, cy, cw, ch] = t.crop;
      g.drawImage(im, cx * im.width, cy * im.height, cw * im.width, ch * im.height, 0, 0, w, h);
    }
    t.tex.needsUpdate = true;
  }

  return {
    manifest, picks, version,
    get: (id) => byId.get(id),

    // A texture for one printed piece. page = which page of the file. crop = [x, y, w, h], 0 to 1.
    // draw(g, img, w, h) replaces the plain draw (for example a slide letterboxed on a screen).
    tex(id, { page = 0, crop = [0, 0, 1, 1], w = 1024, h, draw } = {}) {
      const a = byId.get(id);
      if (!h) h = a ? Math.round((w * a.mm[1] * crop[3]) / (a.mm[0] * crop[2])) : w;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      const t = { id, page, crop, draw, tex, done: null };
      t.done = paint(t);
      texs.push(t);
      return tex;
    },
    ready: () => Promise.all(texs.map((t) => t.done)),

    async pick(id, vid) {
      if (!byId.has(id) || picks[id] === vid) return;
      picks[id] = vid;
      store.set(key, picks);
      emit();
      await Promise.all(texs.filter((t) => t.id === id).map(paint));
      emit();
    },
    async pickAll(look) {
      manifest.assets.forEach((a) => { const v = a.versions.find((x) => (x.look || x.id) === look); if (v) picks[a.id] = v.id; });
      store.set(key, picks);
      emit();
      await Promise.all(texs.map(paint));
      emit();
    },
    onChange(fn) { listeners.add(fn); },
  };
}

// ---------- the list ----------
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function mountAssets(art, { pieces = [], stage = null } = {}) {
  const host = document.getElementById('assetList');
  if (!host) return;
  const { manifest } = art;
  const page = manifest.page;
  if (!manifest.assets.length) {
    host.innerHTML = '<p class="sec__sub">No print files yet. Run <code>npm run print</code>.</p>';
    return;
  }
  const byPiece = new Map(pieces.map((p) => [p.id, p]));
  const looks = new Map(manifest.looks.map((L) => [L.id, L]));
  const lookOf = (v) => looks.get(v.look || v.id) || { label: v.id.toUpperCase() };
  const shown = {};   // asset id -> page index on screen

  // one look for everything: a bar above the list, and a small copy in the 3D controls
  const bars = [...document.querySelectorAll('[data-looks]')];
  bars.forEach((bar) => {
    bar.innerHTML = manifest.looks.map((L) => `<button type="button" data-look="${L.id}" aria-pressed="false" title="${esc(L.label)}: ${esc(L.about)}"><b>${L.id.toUpperCase()}</b><span>${esc(L.label)}</span></button>`).join('');
    bar.addEventListener('click', (e) => { const b = e.target.closest('[data-look]'); if (b) art.pickAll(b.dataset.look); });
  });
  const about = document.getElementById('lookAbout');

  manifest.assets.forEach((a) => {
    const p = byPiece.get(a.piece);
    shown[a.id] = 0;
    const el = document.createElement('article');
    el.className = 'asset';
    el.dataset.asset = a.id;
    el.innerHTML = `
      <a class="asset__img" target="_blank" rel="noopener" title="Open full size"><img alt="" loading="lazy" decoding="async" /></a>
      ${a.pages.length > 1 ? `<div class="asset__pages" role="group" aria-label="Pages">${a.pages.map((n, i) => `<button type="button" data-pg="${i}" aria-pressed="${i === 0}">${esc(n)}</button>`).join('')}</div>` : ''}
      <div class="asset__body">
        <p class="asset__k">${p?.num ? `<i>${p.num}</i>` : ''}<span>${esc(a.size)}</span></p>
        <h3>${esc(a.name)}</h3>
        <div class="asset__vs" role="radiogroup" aria-label="Versions of ${esc(a.name)}">
          ${a.versions.map((v) => `<button type="button" class="vchip" role="radio" data-v="${v.id}" aria-checked="false">
            <img src="${v.t[0]}" alt="" loading="lazy" decoding="async" />
            <span><b>${v.id.toUpperCase()}</b> ${esc(lookOf(v).label)}</span></button>`).join('')}
        </div>
        <p class="asset__note"></p>
        <div class="asset__dl">
          <a class="btn btn--pri" data-dl="pdf">PDF<small></small></a>
          <a class="btn" data-dl="jpg">JPG<small></small></a>
          ${stage && p?.view ? '<button type="button" class="btn btn--ghost" data-show>See it on the model ↑</button>' : ''}
        </div>
        <p class="asset__print">${esc(a.print)}</p>
      </div>`;
    host.appendChild(el);

    el.querySelector('.asset__vs').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) art.pick(a.id, b.dataset.v); });
    el.querySelector('.asset__pages')?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pg]');
      if (!b) return;
      shown[a.id] = +b.dataset.pg;
      draw(a.id);
    });
    el.querySelector('[data-show]')?.addEventListener('click', () => {
      document.querySelectorAll('#viewTabs button').forEach((b) => b.setAttribute('aria-selected', 'false'));
      stage.setView(p.view);
      stage.setHi(a.piece, 'list');
      document.getElementById('stage').scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => stage.setHi(null, 'list'), 2400);
    });
  });

  function draw(id) {
    const a = art.get(id);
    const v = art.version(id);
    const el = host.querySelector(`[data-asset="${id}"]`);
    const i = Math.min(shown[id], v.t.length - 1);
    const name = `blueprint-${page}-${a.id}-${v.id}`;
    const img = el.querySelector('.asset__img img');
    if (img.getAttribute('src') !== v.t[i]) img.src = v.t[i];
    img.alt = `${a.name}, ${a.pages[i]}, ${v.id.toUpperCase()} ${lookOf(v).label}`;
    el.querySelector('.asset__img').href = v.jpg[i];
    el.querySelectorAll('.vchip').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.v === v.id)));
    el.querySelectorAll('[data-pg]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.pg === i)));
    el.querySelector('.asset__note').textContent = v.note;
    const pdf = el.querySelector('[data-dl="pdf"]');
    pdf.href = v.pdf; pdf.download = `${name}.pdf`;
    pdf.querySelector('small').textContent = `${a.pages.length > 1 ? `${a.pages.length} pages · ` : ''}${v.pdfKb} KB`;
    const jpg = el.querySelector('[data-dl="jpg"]');
    jpg.href = v.jpg[i]; jpg.download = `${name}${a.pages.length > 1 ? `-${i + 1}` : ''}.jpg`;
    jpg.querySelector('small').textContent = a.pages.length > 1 ? a.pages[i] : '';
  }

  function sync() {
    manifest.assets.forEach((a) => draw(a.id));
    const all = manifest.looks.find((L) => manifest.assets.every((a) => (art.version(a.id).look || art.version(a.id).id) === L.id));
    bars.forEach((bar) => bar.querySelectorAll('[data-look]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.look === all?.id))));
    if (about) about.textContent = all ? all.about : 'Mixed: each piece uses the version picked on its card.';
  }
  art.onChange(sync);
  sync();
}
