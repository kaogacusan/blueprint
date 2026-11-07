// /boothrender/prep: the booth's print, buy, and bring tables, ours next to Prince's. Not linked from the site.
// Data: ../prep-data.js. Ticks are saved in this browser only.
import { ASOF, BUDGET, SHOP, PRINT, BUY, BRING, totals } from '/boothrender/prep-data.js';

const SITE = 'https://ateneoblueprint.vercel.app';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const peso = (n) => `₱${Math.round(n).toLocaleString('en-PH')}`;
const range = ([a, b]) => (a === b ? peso(a) : `${peso(a)}–${peso(b).slice(1)}`);
const KEY = 'blueprint-booth-prep-v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode */ } };
const done = load();

const tick = (id) => `<label class="pt__tick"><input type="checkbox" data-tick="${id}"${done[id] ? ' checked' : ''} /><span aria-hidden="true"></span><span class="sr">Done</span></label>`;
const design = (d, who) => (d ? `<a class="pt__design" href="${esc(d.pdf)}" target="_blank" rel="noopener" title="Open ${who} PDF"><img src="${esc(d.img)}" alt="" loading="lazy" /><span>PDF ↓</span></a>` : '<span class="muted">—</span>');
const side = (d) => (d ? `<b>${esc(d.qty)}</b>${d.size ? `<span>${esc(d.size)}</span>` : ''}` : '<span class="muted">—</span>');

// ---------- print ----------
function printTable() {
  const groups = [
    ['Both booths: one order', PRINT.filter((r) => r.both)],
    ['Ours only', PRINT.filter((r) => !r.both && r.ours)],
    ['Prince only', PRINT.filter((r) => !r.ours)],
  ];
  const t = totals();
  return `<div class="table-wrap"><table class="mat pt">
    <thead><tr><th></th><th>What</th><th>Tell the shop</th><th>Keira’s booth</th><th>Prince’s booth</th><th>We pay</th><th>Our design</th><th>Prince’s design</th></tr></thead>
    ${groups.map(([label, rows]) => `<tbody><tr class="pt__group"><td colspan="8">${esc(label)}</td></tr>
      ${rows.map((r) => `<tr${r.optional ? ' class="pt__opt"' : ''}>
        <td>${tick(`print-${r.id}`)}</td>
        <td class="pt__what">${esc(r.name)}${r.optional ? '<em>if budget</em>' : ''}</td>
        <td class="pt__spec">${esc(r.spec)}</td>
        <td class="pt__side">${side(r.ours)}</td>
        <td class="pt__side">${side(r.prince)}</td>
        <td class="cost">${r.cost ? range(r.cost) : ''}${r.costNote ? `<small>${esc(r.costNote)}</small>` : ''}</td>
        <td>${design(r.ours, 'our')}</td>
        <td>${design(r.prince, 'Prince’s')}</td></tr>`).join('')}</tbody>`).join('')}
    <tfoot><tr><td colspan="5">Our printing</td><td class="cost">${range(t.print)}</td><td colspan="2"></td></tr></tfoot>
  </table></div>`;
}

function orderText() {
  const ours = PRINT.filter((r) => r.ours);
  const line = (r, i) => `${i + 1}. ${r.name}${r.ours.os ? `, ${r.ours.os}` : ''}: ${r.ours.qty} pc${r.ours.qty === '1' ? '' : 's'}. ${r.id === 'banner' ? 'Tarp or PP film, full colour, cut exact.' : r.spec}\n   File: ${SITE}${r.ours.pdf}`;
  return `Hi! Rush order for today, please, for two booths at Ateneo. Same-day pickup or Lalamove to Katipunan. Separate receipts for each booth, please.

BOOTH 1 (Blueprint):
${ours.map(line).join('\n')}

BOOTH 2 (profstopick) will send their own files in this chat: a 60 × 160 cm banner, pass cards (90 × 54 mm), flyers (A6), an A5 QR sign, and an A4 price list.

Can you send the total for each booth and when it will be ready? Thank you!`;
}

// ---------- buy ----------
const offer = (o) => `<b>${esc(o.name)}</b><span>${o.link ? `<a href="${esc(o.link)}" target="_blank" rel="noopener">${esc(o.where)} ↗</a>` : esc(o.where)}</span><span class="pt__price">${esc(o.price)}</span>`;
function buyTable() {
  const t = totals();
  return `<div class="table-wrap"><table class="mat pt pt--buy">
    <thead><tr><th></th><th>What</th><th>Size, and what to check</th><th>For</th><th>Get this</th><th>Other options</th><th>We pay</th></tr></thead>
    <tbody>${BUY.map((r) => `<tr>
      <td>${tick(`buy-${r.id}`)}</td>
      <td class="pt__what">${esc(r.name)}</td>
      <td class="pt__spec">${esc(r.spec)}</td>
      <td class="pt__side"><b>${r.for === 'both' ? 'Both booths' : 'Keira’s booth'}</b><span>Prince: ${esc(r.prince)}</span></td>
      <td class="pt__o">${offer(r.pick)}</td>
      <td class="pt__o">${(r.alt || []).map((o) => `<div>${offer(o)}</div>`).join('')}</td>
      <td class="cost">${range(r.cost)}${r.id === 'kit' ? '<small>our half</small>' : ''}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="6">Our buying</td><td class="cost">${range(t.buy)}</td></tr></tfoot>
  </table></div>`;
}

// ---------- bring ----------
function bringTable() {
  return `<div class="table-wrap"><table class="mat pt pt--bring">
    <thead><tr><th></th><th>What</th><th>Who</th><th>Note</th></tr></thead>
    <tbody>${BRING.map((r) => `<tr><td>${tick(`bring-${r.id}`)}</td><td class="pt__what">${esc(r.name)}</td><td><b>${esc(r.who)}</b></td><td class="pt__spec">${esc(r.note)}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

// ---------- budget ----------
function budget() {
  const t = totals();
  const max = Math.max(t.all[1], BUDGET) * 1.05;
  const pct = (n) => `${((100 * n) / max).toFixed(1)}%`;
  return `<div class="bud">
    <div class="bud__bar"><i style="left:${pct(t.all[0])};width:calc(${pct(t.all[1])} - ${pct(t.all[0])})"></i><b style="left:${pct(BUDGET)}"><span>Budget ${peso(BUDGET)}</span></b></div>
    <div class="bud__row"><div><span>Our estimate, everything</span><b>${range(t.all)}</b></div><div><span>Without bingo cards</span><b>${range(t.must)}</b></div><div><span>Printing</span><b>${range(t.print)}</b></div><div><span>Buying</span><b>${range(t.buy)}</b></div></div>
    <p class="sec__sub">The low end fits ${peso(BUDGET)}; the high end doesn’t. Get the shop’s quote first. If it comes in high, cut in this order:</p>
    <ol class="bud__cuts"><li><b>Bingo cards</b> (Thomas: only if it fits): saves ₱150–450.</li><li><b>Flyers: 50, not 100</b>: saves ₱125–250.</li><li><b>Tablecloth</b>: a navy or black bedsheet from home: saves ₱190–379.</li><li><b>Table skirt tarp</b>: saves ₱102–203.</li></ol>
  </div>`;
}

// ---------- mount ----------
document.querySelectorAll('[data-asof]').forEach((el) => { el.textContent = ASOF; });
document.querySelectorAll('[data-est]').forEach((el) => { el.textContent = range(totals().all); });
document.getElementById('shop').innerHTML = `
  <div><b>${esc(SHOP.name)}</b> · <a href="tel:${SHOP.phone.replace(/\s/g, '')}">${esc(SHOP.phone)}</a> · <a href="${esc(SHOP.fb)}" target="_blank" rel="noopener">Messenger ↗</a> · ${esc(SHOP.email)}
    <br><span>${esc(SHOP.where)}. ${esc(SHOP.does)} ${esc(SHOP.hours)}</span>
    <br><span><b>If not:</b> ${esc(SHOP.backup.name)}, ${esc(SHOP.backup.where)}. ${esc(SHOP.backup.hours)}. ${esc(SHOP.backup.phone)}. ${esc(SHOP.backup.prices)}.</span></div>
  <button type="button" class="btn btn--pri" data-copy>Copy the order <small>both booths</small></button>`;
document.getElementById('printTable').innerHTML = printTable();
document.getElementById('buyTable').innerHTML = buyTable();
document.getElementById('bringTable').innerHTML = bringTable();
document.getElementById('budget').innerHTML = budget();

document.addEventListener('change', (e) => {
  const b = e.target.closest('[data-tick]');
  if (!b) return;
  done[b.dataset.tick] = b.checked;
  save(done);
});
const copyBtn = document.querySelector('[data-copy]');
copyBtn.addEventListener('click', async () => {
  const small = copyBtn.querySelector('small');
  const text = orderText();
  try { await navigator.clipboard.writeText(text); small.textContent = 'copied ✓'; } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(ta); ta.select();
    try { document.execCommand('copy'); small.textContent = 'copied ✓'; } catch { small.textContent = 'copy failed'; }
    ta.remove();
  }
  setTimeout(() => { small.textContent = 'both booths'; }, 2500);
});
export { orderText };
