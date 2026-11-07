// The booth shopping list: what to get for each piece, where, the price, and a backup.
// booth.js uses `total` as the cost of a piece. mountShop() draws "Order it" and the shared order with Prince's booth.
// Prices are what we saw on the date in asOf. Check before paying: prices move.
const IM = 'https://intermatrix.com.ph/products/';
const LZ = 'https://www.lazada.com.ph/products/';
const IMK = 'InterMatrix, across Ateneo, or the AShop in MVP (Mon 8 am)';
const PRINCE = 'Where Prince gets his ₱119 A5 stand';
const MAG = 'Robinsons Magnolia';
// The rush shop for both booths, and the Monday walk-in across Ateneo (research, Sun Nov 8 early morning)
const JJ = { where: 'JJ Pick & Print, Holy Spirit QC. Its FB says open Sun 8–5 (Waze says closed): call first. 0918 595 9997', link: 'https://www.facebook.com/JJPicknPrint' };
const YZA = { where: 'YZA, Prince David Condo, across Ateneo. Mon–Sat 8–5, closed Sun. 0917 574 1449', link: 'http://www.yzacoloured.com/' };
const FB = 'https://www.facebook.com/marketplace/item/';

export const SHOP = {
  asOf: 'Sun, Nov 8, 2026',
  items: {
    header: { qty: '1', total: [136, 271],
      pick: { name: 'Tarp 1.4 × 0.6 m, hem + grommets every 30 cm', ...JJ, eta: 'Call Sun 8 am. Send both booths’ files on Messenger, ask for same day + Lalamove to Katipunan', note: 'One order with both banners and both card runs' },
      backup: { name: 'Same tarp, walk-in', ...YZA, price: 271, unit: '≈9 sq ft at ₱30', eta: 'Walk in Mon 8 am, ask for rush' } },
    backdrop: { qty: '1', total: [363, 726],
      pick: { name: 'Tarp 1.5 × 1.5 m, grommets every 30 cm on the top edge + 2 bottom corners', ...JJ, eta: 'Same order' },
      backup: { name: 'Same tarp, walk-in', ...YZA, price: 726, unit: '≈24 sq ft at ₱30', eta: 'Mon 8 am' } },
    skirt: { qty: '1', total: [102, 203],
      pick: { name: 'Tarp 0.9 × 0.7 m, 4 corner grommets', ...JJ, eta: 'Same order' },
      backup: { name: 'Same tarp, walk-in', ...YZA, price: 203, unit: '≈7 sq ft at ₱30', eta: 'Mon 8 am' } },
    pullup: { qty: '1 print + 1 stand', total: [410, 1300],
      pick: { name: 'Tarp 60 × 160 cm + an X-stand or roll-up that takes it', ...JJ, eta: 'Same order as Prince’s banner', note: 'JJ lists roll-up and X-stand banners; ask the price of each' },
      backup: { name: 'X-stand ₱100 (fits 60 × 180: ask if it adjusts to 160) + tarp at YZA (₱310)', where: 'FB Marketplace, Marikina', link: `${FB}2201167447130659/`, price: 410, eta: 'Message Sun; pickup or Lalamove' } },
    check: { qty: '1 stand + 1 print', total: [170, 290],
      pick: { name: 'A4 acrylic sign stand', where: 'Where Prince got his ₱119 A5 stand, if they have A4', eta: 'Ask Prince Sun morning', note: 'Print the A4 sign in colour with the cards, or at a copy shop (₱20–40)' },
      backup: { name: 'Acrylic holder A4, L-shape, vertical', where: 'National Book Store (Katipunan or Magnolia), walk-in', link: 'https://nationalbookstore.com/products/acrylic-holder-21x297mm-l-shape-vertical-home-office-supplies-brochure-holders', price: 250, eta: 'Sun walk-in' } },
    guide: { qty: '3 sheets', total: [5, 25],
      pick: { name: 'Print at home, black and white', where: 'From home', note: 'One for each person on shift' } },
    regqr: { qty: '1 stand + 1 print', total: [139, 159],
      pick: { name: 'A5 acrylic sign stand', where: PRINCE, price: 119, unit: 'Prince’s price', eta: 'Order with Prince’s stand', note: 'Print the A5 sign in colour at any copy shop (₱20–40)' },
      backup: { name: 'Table-top sintra stand ≈A5, printed', where: IMK, link: `${IM}table-top-stands`, price: 66, eta: 'Mon 8 am' } },
    card: { qty: '100–150, 2 sides', total: [250, 750],
      pick: { name: 'Calling cards 90 × 54 mm, 2 sides, 300 gsm matte, from the 96 × 60 mm PDF (3 mm bleed)', ...JJ, eta: 'Same order, with Prince’s pass cards', note: 'Also on FB Marketplace: 100 for ₱250, 250 gsm laminated, same-day Lalamove from Novaliches' },
      backup: { name: 'Business cards, back to back, 300 gsm', ...YZA, price: [600, 750], unit: '₱600 for 120, ₱750 for 150', eta: 'Mon 8 am. No shop in time? The 10-on-A4 file, on card stock at home' } },
    bingo: { qty: '60 cards (15 A4 sheets)', total: [150, 300],
      pick: { name: 'Print at home: colour, both sides, on A4 card stock, cut 4 per sheet', where: `Card stock from National Book Store, ${MAG}`, eta: 'Sun; print more mid-week if they run out', note: 'Same as Prince’s team, who print their flyers at home' },
      backup: { name: 'A6, back to back, 180 gsm, 4 per set', where: IMK, link: `${IM}flyers-brochures`, price: 80, unit: 'per set of 4 (₱1,200 for 60)', eta: 'Mon 8 am' } },
    flyers: { qty: '100 (25 A4 sheets)', total: [150, 300],
      pick: { name: 'Print at home: colour, both sides, cut 4 per sheet', where: 'Regular paper or light card stock', eta: 'Sun; print more mid-week if they run out', note: 'Same as Prince’s team, who print their flyers at home' },
      backup: { name: 'A6, back to back, 120 gsm, 4 per set', where: IMK, link: `${IM}flyers-brochures`, price: 60, unit: 'per set of 4 (₱1,500 for 100)', eta: 'Mon 8 am' } },
    signup: { qty: '5 sheets', total: [10, 25],
      pick: { name: 'Print at home, black and white', where: 'From home' },
      backup: { name: 'B&W A4, ₱5 a page', where: IMK, link: `${IM}document-printing`, price: 25, eta: 'Mon 8 am' } },
    cloth: { qty: '1', total: [190, 379],
      pick: { name: 'Rectangular tablecloth 142 × 218 cm: ask for navy or black', where: 'FB Marketplace, Quezon City', link: `${FB}1050749884375587/`, price: 190, eta: 'Message Sun; get 2, one for each booth', note: 'Prince’s plan budgets ₱379' },
      backup: { name: 'Plain tablecloth 229 × 147 cm, royal blue', where: 'Monalisa Curtain (Lazada)', link: `${LZ}pdp-i3397671685.html`, price: 105, eta: 'Arrives Tue–Wed: only for later in the week' } },
    kit: { qty: '1 set', total: [100, 200],
      pick: { name: '100 zip ties (8 in), 5–10 m rope, duct tape', where: 'Mr. DIY Katipunan (walk from Ateneo)', eta: 'Sun walk-in', note: 'Prince’s team is buying the same; split a pack' },
      backup: { name: 'Nylon cable ties, 8 in, 100 pcs', where: 'Niolin Industrial (Lazada)', link: `${LZ}pdp-i591918428.html`, price: 30, eta: 'Arrives Tue–Wed' } },
    table: { qty: '1', free: 'borrow',
      pick: { name: 'Borrow a 3 ft folding table. Ask the organiser first', where: 'From an org or home' } },
    stool: { qty: '1', free: 'from home', pick: { name: 'Any low stool or chair', where: 'From home' } },
    box: { qty: '1', free: 'from home', pick: { name: 'Any box, about 45 × 30 × 30 cm', where: 'From home' } },
  },
  extras: [],
  // The same things on both booths: one print shop and one order cover both.
  shared: [
    ['Standing banner print', '60 × 160 cm tarp, full colour, each booth’s own PDF', '1', '1'],
    ['Calling cards', '90 × 54 mm, 2 sides, 300 gsm. His are the pass cards with codes', '1 run', '100–150'],
    ['Colour prints', 'A5 QR sign each; A4: his price list, our resume check sign', 'A5 + A4', 'A5 + A4'],
    ['Banner stand', 'X-stand or roll-up that takes 60 × 160 cm', 'borrowed', '1'],
    ['Acrylic sign stand, A5', 'Clear, upright, for a 148 × 210 mm print', '1', '1'],
    ['Acrylic sign stand, A4', 'Clear, upright, for a 210 × 297 mm print', '—', '1'],
    ['Tablecloth', 'Navy or black, about 150 × 230 cm', '1', '1'],
    ['Zip ties + tape', '8 in zip ties (100), duct tape', '1', 'share'],
    ['Tarps (ours only)', 'Header 1.4 × 0.6 m, backdrop 1.5 × 1.5 m, skirt 0.9 × 0.7 m, with grommets', '—', '3'],
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
