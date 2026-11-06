// Page wiring shared by /venuerender and /boothrender:
// view tabs, sliders, layer toggles, the numbered parts list, the materials table, and the reveal-on-scroll.
import { Stage } from './stage.js';

export const peso = (n) => `₱${Math.round(n).toLocaleString('en-PH')}`;

export function costText(p) {
  if (p.basis === 'home') return 'from home';
  if (p.basis === 'provided') return 'provided';
  if (p.basis === 'borrow') return 'borrow';
  if (p.basis === 'room') return 'in the room';
  if (p.basis === 'cfmo') return 'requested from CFMO';
  if (p.basis === 'print') return 'to print, not quoted yet';
  if (p.basis === 'buy') return 'to buy, not quoted yet';
  if (p.basis === 'unquoted' || !p.cost) return 'not quoted yet';
  const [lo, hi] = p.cost;
  return lo === hi ? `${peso(lo)}, ${p.basis}` : `${peso(lo)} to ${peso(hi)}, ${p.basis}`;
}

export function total(pieces) {
  let lo = 0, hi = 0;
  pieces.forEach((p) => { if (p.cost && (p.basis === 'assumed' || p.basis === 'listing')) { lo += p.cost[0]; hi += p.cost[1]; } });
  return [lo, hi];
}

export async function mountPage({ pieces, groups, views, layers = [], build, shadowBox }) {
  const host = document.getElementById('stage');
  const partsEl = document.getElementById('partsList');
  const tableEl = document.getElementById('matBody');
  const tip = host.querySelector('.stage__tip');
  const byId = new Map(pieces.map((p) => [p.id, p]));

  // ----- parts list (right column) -----
  groups.forEach((g) => {
    const list = pieces.filter((p) => p.cat === g.code);
    if (!list.length) return;
    const h = document.createElement('h3');
    h.textContent = g.label;
    const ol = document.createElement('ol');
    list.forEach((p) => {
      const li = document.createElement('li');
      li.className = 'part';
      li.dataset.item = p.id;
      li.tabIndex = 0;
      li.innerHTML = `
        <span class="part__num${p.num ? '' : ' part__num--none'}">${p.num ?? '·'}</span>
        <div>
          <b>${p.name}</b>
          <span>${p.size}</span>
          <span>${p.where}</span>
          <span class="part__cost">${costText(p)}</span>
          ${p.flag ? `<span class="part__flag">${p.flag}</span>` : ''}
        </div>`;
      ol.appendChild(li);
    });
    partsEl.append(h, ol);
  });

  // ----- materials table -----
  if (tableEl) {
    groups.forEach((g) => {
      const list = pieces.filter((p) => p.cat === g.code);
      if (!list.length) return;
      const gr = document.createElement('tr');
      gr.className = 'group';
      gr.innerHTML = `<td colspan="5">${g.label}</td>`;
      tableEl.appendChild(gr);
      list.forEach((p) => {
        const tr = document.createElement('tr');
        tr.dataset.item = p.id;
        tr.innerHTML = `<td>${p.num ? `<i>${p.num}</i>` : ''}${p.name}</td><td>${p.size}</td><td>${p.where}</td><td class="cost">${costText(p)}</td><td class="note">${p.note || ''}</td>`;
        tableEl.appendChild(tr);
      });
    });
    const [lo, hi] = total(pieces);
    document.querySelectorAll('[data-total]').forEach((el) => { el.textContent = `${peso(lo)} to ${peso(hi)}`; });
    document.querySelectorAll('[data-count]').forEach((el) => { el.textContent = pieces.length; });
  }

  // ----- reveal -----
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: 0, rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('.rise').forEach((el) => io.observe(el));

  // ----- 3D -----
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) {
    host.insertAdjacentHTML('beforeend', '<div class="stage__noGL">This device cannot show 3D. The full list is on the right and in the table below.</div>');
    return;
  }

  const rows = (id) => document.querySelectorAll(`[data-item="${CSS.escape(id)}"]:not(.pin)`);
  let lastPointer = null;

  const stage = new Stage(host, {
    shadowBox,
    onHover(id, from) {
      document.querySelectorAll('.part.is-on, tr.is-on').forEach((el) => el.classList.remove('is-on'));
      if (id) rows(id).forEach((el) => el.classList.add('is-on'));
      // tooltip only when the mouse is on the model
      if (id && from === 'canvas' && lastPointer) {
        const p = byId.get(id);
        const r = host.getBoundingClientRect();
        tip.textContent = p ? `${p.num ? p.num + ' · ' : ''}${p.name}` : id;
        tip.style.transform = `translate(${lastPointer.x - r.left + 14}px, ${lastPointer.y - r.top + 14}px)`;
        tip.classList.add('is-on');
      } else tip.classList.remove('is-on');
      // keep the list item in view inside the sticky column (not the page)
      if (id && from !== 'list') {
        const li = partsEl.querySelector(`.part[data-item="${CSS.escape(id)}"]`);
        const box = partsEl.closest('.parts');
        if (li && box && box.scrollHeight > box.clientHeight + 4) {
          const top = li.offsetTop - box.offsetTop;
          if (top < box.scrollTop || top + li.offsetHeight > box.scrollTop + box.clientHeight) {
            box.scrollTo({ top: top - box.clientHeight / 3, behavior: 'smooth' });
          }
        }
      }
    },
    onSelect(id) {
      const p = byId.get(id);
      if (p && p.view) { selectTab(null); stage.setView(p.view); }
    },
  });
  host.addEventListener('pointermove', (e) => { lastPointer = { x: e.clientX, y: e.clientY }; });

  // list -> model
  partsEl.addEventListener('mouseover', (e) => { const li = e.target.closest('.part'); if (li) stage.setHi(li.dataset.item, 'list'); });
  partsEl.addEventListener('mouseleave', () => stage.setHi(null, 'list'));
  partsEl.addEventListener('focusin', (e) => { const li = e.target.closest('.part'); if (li) stage.setHi(li.dataset.item, 'list'); });
  partsEl.addEventListener('click', (e) => {
    const li = e.target.closest('.part');
    if (!li) return;
    const p = byId.get(li.dataset.item);
    if (p && p.view) { selectTab(null); stage.setView(p.view); }
    if (window.matchMedia('(max-width: 1020px)').matches) host.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  if (tableEl) {
    tableEl.addEventListener('mouseover', (e) => { const tr = e.target.closest('tr[data-item]'); if (tr) stage.setHi(tr.dataset.item, 'list'); });
    tableEl.addEventListener('mouseleave', () => stage.setHi(null, 'list'));
  }

  // ----- view tabs -----
  const tabs = document.getElementById('viewTabs');
  const selectTab = (id) => tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === id)));
  views.forEach((v, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.role = 'tab';
    b.dataset.view = v.id;
    b.textContent = v.label;
    b.setAttribute('aria-selected', String(i === 0));
    b.addEventListener('click', () => { selectTab(v.id); stage.setView(v); });
    tabs.appendChild(b);
  });
  const params = new URLSearchParams(location.search);
  const startView = views.find((v) => v.id === params.get('view')) || views[0];
  selectTab(startView.id);
  stage.setView(startView, false);

  // ----- sliders -----
  const turn = document.getElementById('turn');
  const tilt = document.getElementById('tilt');
  const toDeg = (r) => Math.round((r * 180) / Math.PI);
  const syncSliders = (v) => {
    turn.value = ((toDeg(v.az) % 360) + 540) % 360 - 180;
    tilt.value = toDeg(v.el);
  };
  stage.onViewChange = syncSliders;
  syncSliders(stage.view);
  stage.onDragStart = () => { selectTab(null); host.classList.add('was-dragged'); };
  turn.addEventListener('input', () => { selectTab(null); stage.tween = null; stage.view.az = (turn.value * Math.PI) / 180; stage.dirty = true; });
  tilt.addEventListener('input', () => { selectTab(null); stage.tween = null; stage.view.el = Math.max(0.02, (tilt.value * Math.PI) / 180); stage.dirty = true; });

  // ----- layer toggles -----
  const tg = document.getElementById('toggles');
  layers.forEach((L) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'toggle';
    b.textContent = L.label;
    if (L.mobileOff && window.matchMedia('(max-width: 640px)').matches) L.on = false;
    b.setAttribute('aria-pressed', String(L.on !== false));
    b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      stage.setLayer(L.name, on);
      // a swap layer shows one of two states (for example "room as found" vs our setup)
      if (L.swap) stage.setLayer(L.swap, !on);
    });
    tg.appendChild(b);
  });

  await build(stage);
  layers.forEach((L) => { stage.setLayer(L.name, L.on !== false); if (L.swap) stage.setLayer(L.swap, L.on === false); });
  stage.resize();
  stage.dirty = true;
  host.classList.add('is-ready');
  window.__stage = stage;
  return stage;
}
