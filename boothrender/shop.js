// The booth shopping list: what to get for each piece, where, the price, and a backup.
// booth.js uses `total` as the cost of a piece. mountShop() draws "Order it" and the shared order with Prince's booth.
// Prices are what we saw on the date in asOf. Check before paying: prices move.
const IM = 'https://intermatrix.com.ph/products/';
const LZ = 'https://www.lazada.com.ph/products/';
const ARKI = { where: 'Arkishop Citimall, Philcoa · open Sun 9:30–6:30 · (02) 922-0626', link: 'https://www.arkishop.com/corporate/diliman-quezon-city' };
const IMK = 'InterMatrix, across Ateneo, or the AShop in MVP (Mon 8 am)';
const PRINCE = 'Prince’s FB Marketplace seller';
const MAG = 'Robinsons Magnolia';

export const SHOP = {
  asOf: 'Sat, Nov 7, 2026',
  items: {
    header: { qty: '1', total: [136, 316],
      pick: { name: 'Tarp 1.4 × 0.6 m, hem + grommets every 30 cm', where: `${PRINCE}, if they print tarps`, eta: 'Ask when Prince sends the banner order', note: 'One order with the banner is cheapest' },
      backup: { name: 'Same tarp, walk-in', ...ARKI, price: [136, 316], unit: '≈9 sq ft at ₱15–35', eta: 'Call Sun morning' } },
    skirt: { qty: '1', total: [102, 237],
      pick: { name: 'Tarp 0.9 × 0.7 m, 4 corner grommets', where: `${PRINCE}, with the header`, eta: 'Same order' },
      backup: { name: 'Same tarp, walk-in', ...ARKI, price: [102, 237], unit: '≈7 sq ft', eta: 'Call Sun morning' } },
    pullup: { qty: '1 print + 1 stand', total: [650, 1300],
      pick: { name: 'Tarp 60 × 160 cm + a stand that takes it', where: PRINCE, price: [650, 1300], unit: 'print ₱350–700 (Prince’s quotes) + stand', eta: 'Same order as Prince’s banner' },
      backup: { name: 'X-banner stand 2 × 5 ft with tarp', where: IMK, link: `${IM}x-banner-stand`, price: 1200, unit: '61 × 152 cm: ask them to print 60 × 160', eta: 'Mon 9 am, ask for same day' } },
    regqr: { qty: '1 stand + 1 print', total: [139, 159],
      pick: { name: 'A5 acrylic sign stand', where: PRINCE, price: 119, unit: 'Prince’s price', eta: 'Order with Prince’s stand', note: 'Print the A5 sign in colour at any copy shop (₱20–40)' },
      backup: { name: 'Table-top sintra stand ≈A5, printed', where: IMK, link: `${IM}table-top-stands`, price: 66, eta: 'Mon 8 am' } },
    card: { qty: '1 stand + 1 print', total: [170, 260],
      pick: { name: 'A4 acrylic sign stand', where: PRINCE, eta: 'Ask for the A4 size with Prince’s order', note: 'Print the A4 card in colour at a copy shop (₱20–40)' },
      backup: { name: 'Table-top sintra stand 11 × 8 in, printed', where: IMK, link: `${IM}table-top-stands`, price: 132, eta: 'Mon 8 am' } },
    bingo: { qty: '60 cards (15 A4 sheets)', total: [150, 300],
      pick: { name: 'Print at home: colour, both sides, on A4 card stock, cut 4 per sheet', where: `Card stock from National Book Store, ${MAG}`, eta: 'Sun; print more mid-week if they run out', note: 'Same as Prince’s team, who print their flyers at home' },
      backup: { name: 'A6, back to back, 180 gsm, 4 per set', where: IMK, link: `${IM}flyers-brochures`, price: 80, unit: 'per set of 4 (₱1,200 for 60)', eta: 'Mon 8 am' } },
    signup: { qty: '5 sheets', total: [10, 25],
      pick: { name: 'Print at home, black and white', where: 'From home' },
      backup: { name: 'B&W A4, ₱5 a page', where: IMK, link: `${IM}document-printing`, price: 25, eta: 'Mon 8 am' } },
    cloth: { qty: '1', total: [105, 379],
      pick: { name: 'Tablecloth, navy or black, about 150 × 230 cm', where: PRINCE, eta: 'Order 2: one for each booth', note: 'Prince’s plan budgets ₱379' },
      backup: { name: 'Plain tablecloth 229 × 147 cm, royal blue', where: 'Monalisa Curtain (Lazada)', link: `${LZ}pdp-i3397671685.html`, price: 105, eta: 'Arrives Tue–Wed' } },
    kit: { qty: '1 set', total: [100, 200],
      pick: { name: '100 zip ties (8 in), 5–10 m rope, duct tape', where: 'Mr. DIY Katipunan (walk from Ateneo)', eta: 'Sun walk-in', note: 'Prince’s team is buying the same; split a pack' },
      backup: { name: 'Nylon cable ties, 8 in, 100 pcs', where: 'Niolin Industrial (Lazada)', link: `${LZ}pdp-i591918428.html`, price: 30, eta: 'Arrives Tue–Wed' } },
    table: { qty: '1', free: 'borrow',
      pick: { name: 'Borrow a 3 ft folding table. Ask the organiser first', where: 'From an org or home' } },
    stool: { qty: '1', free: 'from home', pick: { name: 'Any low stool or chair', where: 'From home' } },
    box: { qty: '1', free: 'from home', pick: { name: 'Any box, about 45 × 30 × 30 cm', where: 'From home' } },
  },
  extras: [],
  // The same things on both booths: one order from Prince's seller covers both.
  shared: [
    ['Standing banner print', '60 × 160 cm tarp, full colour, from our PDF', '1', '1'],
    ['Banner stand', 'Roll-up or X-stand that takes 60 × 160 cm', 'borrowed', '1'],
    ['Acrylic sign stand, A5', 'Clear, upright, for a 148 × 210 mm print', '1', '1'],
    ['Acrylic sign stand, A4', 'Clear, upright, for a 210 × 297 mm print', '—', '1'],
    ['Tablecloth', 'Navy or black, about 150 × 230 cm', '1', '1'],
    ['Zip ties + tape', '8 in zip ties (100), duct tape', '1', 'share'],
    ['Tarps (if they print them)', 'Header 1.4 × 0.6 m, skirt 0.9 × 0.7 m, grommets', '—', '2'],
  ],
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const peso = (n) => (Array.isArray(n) ? (n[0] === n[1] ? peso(n[0]) : `${peso(n[0])}–${peso(n[1]).slice(1)}`) : `₱${Math.round(n).toLocaleString('en-PH')}`);

function offer(o) {
  if (!o) return '';
  const link = o.link ? `<a href="${esc(o.link)}" target="_blank" rel="noopener">${esc(o.where)} ↗</a>` : esc(o.where);
  return `<b>${esc(o.name)}</b><span>${link}</span>${o.price != null ? `<span class="shop__price">${peso(o.price)}${o.unit ? ` <small>${esc(o.unit)}</small>` : ''}</span>` : ''}${o.eta ? `<span class="shop__eta">${esc(o.eta)}</span>` : ''}${o.note ? `<span class="shop__note">${esc(o.note)}</span>` : ''}`;
}

export function mountShop(pieces) {
  const host = document.getElementById('shopList');
  if (!host) return;
  const rows = [];
  pieces.forEach((p) => { const s = SHOP.items[p.id]; if (s) rows.push({ num: p.num, name: p.name, ...s }); });
  SHOP.extras.forEach((s) => rows.push({ num: null, ...s }));
  let lo = 0, hi = 0;
  rows.forEach((r) => { if (!r.total) return; const [a, b] = Array.isArray(r.total) ? r.total : [r.total, r.total]; lo += a; hi += b; });
  document.querySelectorAll('[data-shop-total]').forEach((el) => { el.textContent = peso([lo, hi]); });
  document.querySelectorAll('[data-shop-asof]').forEach((el) => { el.textContent = SHOP.asOf; });
  host.innerHTML = `<div class="table-wrap"><table class="mat shop">
    <thead><tr><th>Item</th><th>Qty</th><th>Get this</th><th>Backup</th><th>Budget</th></tr></thead>
    <tbody>${rows.map((r) => `<tr>
      <td>${r.num ? `<i>${r.num}</i>` : ''}${esc(r.name)}</td>
      <td>${esc(r.qty || '1')}</td>
      <td class="shop__o">${offer(r.pick)}</td>
      <td class="shop__o">${offer(r.backup)}</td>
      <td class="cost">${r.total ? peso(r.total) : esc(r.free || '')}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="4">Total to buy</td><td class="cost">${peso([lo, hi])}</td></tr></tfoot>
  </table></div>`;
  const shared = document.getElementById('sharedList');
  if (shared) shared.innerHTML = `<div class="table-wrap"><table class="mat shop shop--shared">
    <thead><tr><th>Item</th><th>Spec to send the seller</th><th>Prince’s booth</th><th>Our booth</th></tr></thead>
    <tbody>${SHOP.shared.map(([n, spec, them, us]) => `<tr><td>${esc(n)}</td><td>${esc(spec)}</td><td>${esc(them)}</td><td>${esc(us)}</td></tr>`).join('')}</tbody></table></div>`;
}
