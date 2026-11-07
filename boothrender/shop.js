// The booth shopping list: one quote and one order link per item, so the team can buy everything in one go.
// booth.js uses `total` as the cost of a piece. mountShop() draws the "Order it" table on /boothrender.
// Prices are what the listing showed when we checked (asOf). Check the link before paying: prices move.
const IM = 'https://intermatrix.com.ph/products/';
const LZ = 'https://www.lazada.com.ph/products/';
const NBS = 'https://nationalbookstore.com/products/';
const ARKI = { where: 'Arkishop Citimall, Philcoa · Sun 9:30–6:30 · (02) 922-0626', link: 'https://www.arkishop.com/corporate/diliman-quezon-city' };
const IMK = 'InterMatrix, across Ateneo (Burgundy Place) or AShop in MVP';
const MAG = 'Robinsons Magnolia';
const MDIY = 'Mr. DIY Katipunan (walk from Ateneo)';
const ONLINE = 'Online: arrives Tue–Wed, for restocks';

export const SHOP = {
  asOf: 'Sat, Nov 7, 2026',
  plan: [
    '<b>Sun, 8–9 am: call.</b> Arkishop Citimall, Philcoa, (02) 922-0626, open Sundays: tarps 1–3 and the photo frame on tarp. Ask if they can do the pull-up the same day. Backup: Kodak Express Katipunan (open Sun 9–6). Send them the PDFs from “Print files” below.',
    '<b>Sun, daytime: one shopping trip.</b> Mr. DIY Katipunan (walk from Ateneo) for cable ties, rope, tape, fairy lights, batteries, and balloons. Then Robinsons Magnolia (open 10–10): National Book Store (pens, clipboard, clips, tape), Robinsons Supermarket (candy), Daiso (jar, tablecloth, lights), True Value (stool, table if we can’t borrow one).',
    '<b>Mon, 8 am: InterMatrix.</b> AShop inside Ateneo (MVP) opens 8 am; Katipunan branch 9 am. Sintra boards 5–7 (their table-top stands come with easel backs), the bingo cards, flyers, candy sign, and sign-up sheets. Roll-up ₱1,988: ask for same day. If not, order a Jincos rush roll-up before 11 am (₱2,250, ready 5 pm) and lean on the balloons and photo frame on day 1.',
    '<b>Online links</b> (Lazada) are cheaper but arrive Tue–Wed at the earliest. Use them only to restock candy, cards, or batteries mid-week.',
  ],
  items: {
    header: { qty: '1', total: [136, 316],
      pick: { name: 'Tarp 1.4 × 0.6 m, hem + eyelets every 30 cm', ...ARKI, price: [136, 316], unit: '≈9 sq ft at ₱15–35', eta: 'Call Sun AM; ask for same-day pickup' },
      backup: { name: 'Custom tarp, eyelets free', where: IMK, link: `${IM}tarpaulin`, eta: 'Mon 9 am, quote on the spot' } },
    backdrop: { qty: '1', total: [363, 847],
      pick: { name: 'Tarp 1.5 × 1.5 m, eyelets on top', ...ARKI, price: [363, 847], unit: '≈24 sq ft', eta: 'Same order as the header' },
      backup: { name: 'Tarp ₱15 / sq ft', where: 'AE Printing (Lazada)', link: `${LZ}affordable-and-cheap-price-tarpaulin-printing-high-quality-15-per-square-ft-i3173776870.html`, price: 363, eta: 'Arrives Nov 9–12: too late for day 1' } },
    skirt: { qty: '1', total: [102, 237],
      pick: { name: 'Tarp 0.9 × 0.7 m, 4 corner eyelets', ...ARKI, price: [102, 237], unit: '≈7 sq ft', eta: 'Same order as the header' },
      backup: { name: 'Custom tarp', where: IMK, link: `${IM}tarpaulin`, eta: 'Mon 9 am' } },
    pullup: { qty: '1', total: 1988,
      pick: { name: 'Roll-up stand 2.75 × 6.5 ft, 13 oz print, bag', where: IMK, link: `${IM}rollup-banner-stand`, price: 1988, eta: 'Mon 9 am. Ask for same day' },
      backup: { name: 'Rush roll-up, same day', where: 'Jincos, Panay Ave · Viber 0917 631 3951', link: 'https://www.jincos.com/Rush-Printing-Same-Day-Roll-Up-Banner-Stand-p625210504', price: 2250, unit: '₱1,900 + ₱350 rush', eta: 'Order Mon 8–11 am, ready 5 pm' } },
    regqr: { qty: '1', total: 66,
      pick: { name: 'Table-top sintra stand, 8 × 5.5 in (≈A5)', where: IMK, link: `${IM}table-top-stands`, price: 66, eta: 'Mon 8 am', note: 'Easel back included' },
      backup: { name: 'Sticker on 3 mm sintra with easel back', where: 'Kodak Express Katipunan · Sun 9–6', link: 'https://www.waze.com/live-map/directions/kodak-express-katipunan-pres-c.p.-garcia-ave-323-quezon-city?to=place.w.79364242.793445816.13768418', eta: 'Ask on Sunday; not confirmed they do sintra' } },
    card: { qty: '1', total: 132,
      pick: { name: 'Table-top sintra stand, 11 × 8 in, cut to A4', where: IMK, link: `${IM}table-top-stands`, price: 132, eta: 'Mon 8 am', note: 'Easel back included' },
      backup: { name: 'Sticker on 3 mm sintra with easel back', where: 'Kodak Express Katipunan · Sun 9–6', link: 'https://www.waze.com/live-map/directions/kodak-express-katipunan-pres-c.p.-garcia-ave-323-quezon-city?to=place.w.79364242.793445816.13768418', eta: 'Ask on Sunday' } },
    gcash: { qty: '1', total: 66,
      pick: { name: 'Table-top sintra stand, 8 × 5.5 in (≈A5)', where: IMK, link: `${IM}table-top-stands`, price: 66, eta: 'Mon 8 am', note: 'Only if we take payment at the booth. Put the real QR in first.' } },
    easels: { qty: '3', total: 0, free: 'included',
      pick: { name: 'Comes with the table-top stands', where: IMK, link: `${IM}table-top-stands` } },
    bingo: { qty: '100 cards (25 sheets)', total: 2000,
      pick: { name: 'A6, back to back, 180 gsm C2S, 4 per set', where: IMK, link: `${IM}flyers-brochures`, price: 80, unit: 'per set of 4', eta: 'Mon 8 am' },
      backup: { name: 'Print at home or a copy shop', where: 'Colour, both sides, on A4 card stock, then cut 4 per sheet', eta: 'Cheapest if someone has a colour printer' } },
    signup: { qty: '5 sheets + clipboard', total: 80,
      pick: { name: 'B&W A4, ₱5 a page', where: IMK, link: `${IM}document-printing`, price: 25, eta: 'Mon 8 am' },
      backup: { name: 'Best Buy clipboard, long, wooden', where: `National Book Store, ${MAG}`, link: `${NBS}best-buy-clipboard-long-wooden-bamboo-shan-school-office-supplies-filing`, price: 55, eta: 'Sun walk-in' } },
    flyers: { qty: '100 (25 sheets)', total: 1500,
      pick: { name: 'A6, back to back, 120 gsm glossy, 4 per set', where: IMK, link: `${IM}flyers-brochures`, price: 60, unit: 'per set of 4', eta: 'Mon 8 am', note: 'Cut from 200 to 100: the bingo card works as a flyer too' },
      backup: { name: 'Print at home or a copy shop', where: 'Colour, both sides, then cut 4 per sheet', eta: 'About ₱3–10 a flyer at copy shops (price guide)' } },
    cloth: { qty: '1', total: [105, 250],
      pick: { name: 'Plain tablecloth or a plain flat sheet, navy or white', where: `Daiso or Robinsons Dept Store, ${MAG}`, link: 'https://vmd.robinsonsmalls.com/list-of-malls/metro-manila/robinsons-magnolia', eta: 'Sun walk-in', note: 'Price not online; Daiso starts at ₱98' },
      backup: { name: 'Plain tablecloth 229 × 147 cm, royal blue or white', where: 'Monalisa Curtain (Lazada)', link: `${LZ}pdp-i3397671685.html`, price: 105, eta: ONLINE } },
    lights: { qty: '2 strings + 12 AA', total: [273, 420],
      pick: { name: 'Battery fairy lights, warm white, + AA batteries', where: `${MDIY}, or Daiso ${MAG}`, eta: 'Sun walk-in', note: 'AA: Best Buy 4-pack ₱55 at NBS' },
      backup: { name: '10 m battery fairy lights, warm white', where: 'Stella Mall (Lazada)', link: `${LZ}pdp-i4693591751.html`, price: 54, unit: 'each', eta: ONLINE } },
    balloons: { qty: '50 + pump + ribbon', total: [149, 300],
      pick: { name: '12 in balloons, blue + white, pump, ribbon', where: `${MDIY}, or Toys R Us / Daiso ${MAG}`, eta: 'Sun walk-in' },
      backup: { name: '50 × 12 in Prolatex (₱125) + pump (₱20) + ribbon (₱4)', where: '854 Partymania (Lazada)', link: `${LZ}pdp-i5103222168.html`, price: 149, eta: ONLINE } },
    candy: { qty: '≈200 pcs + jar + sign', total: [400, 500],
      pick: { name: 'Choc Nut, Snow Bear, Haw Flakes, Mentos + a clear jar', where: `Robinsons Supermarket + Daiso, ${MAG}`, link: `${LZ}pdp-i4438556716.html`, price: [380, 480], eta: 'Sun walk-in (supermarket opens 8 am)', note: 'Link = Choc Nut at Robinsons Supermarket, ₱55. Sign prints with the bingo cards.' },
      backup: { name: 'Choc Nut 24s ×2, Snow Bear 100s, Haw Flakes, + jar ₱59', where: '168grocers (Lazada)', link: `${LZ}pdp-i3543732873.html`, price: 381, eta: ONLINE } },
    frame: { qty: '1', total: [150, 250],
      pick: { name: 'Tarp 60 × 80 cm, glued onto a flat carton, circle cut by hand', ...ARKI, price: [80, 180], unit: '≈5 sq ft + free carton', eta: 'Same order as the tarps' },
      backup: { name: 'Sintra with die-cut (3 mm listed; ask for 5 mm)', where: IMK, link: `${IM}sintra-boards-stands`, price: 1116, unit: 'estimate: ₱1.50 / sq in', eta: 'Mon; get a quote' } },
    side: { qty: '1', free: 'from home',
      pick: { name: 'A plain flat sheet (king for the full 3 m)', where: 'From home' },
      backup: { name: 'Flat sheet, queen/king', where: 'Jin Quan Shop (Lazada)', link: `${LZ}pdp-i4462983361.html`, price: 100, eta: ONLINE } },
    divider: { qty: '1', free: 'from home',
      pick: { name: 'A plain flat sheet, or the other group’s', where: 'From home' },
      backup: { name: 'Flat sheet, queen/king', where: 'Jin Quan Shop (Lazada)', link: `${LZ}pdp-i4462983361.html`, price: 100, eta: ONLINE } },
    table: { qty: '1', free: 'borrow',
      pick: { name: 'Borrow a 3 ft folding table. Ask the organiser first', where: 'From an org or home' },
      backup: { name: 'Long monobloc table with cloth (rental)', where: 'Executive Gourmet, Cubao · 0961 769 6332', link: 'https://executivegourmet.ph/chairs-and-tables-rental/', price: 180, eta: 'Call: per day or per event is not stated' } },
    backtable: { qty: '1', free: 'borrow',
      pick: { name: 'Borrow, or use the supply box with a cloth on it', where: 'From home' },
      backup: { name: 'Folding table 60 × 40 × 70 cm', where: 'Forest Love (Lazada)', link: `${LZ}pdp-i4434354489.html`, price: 499, eta: 'Ships in 24 h, arrives in 2–3 days' } },
    stool: { qty: '1', free: 'from home',
      pick: { name: 'Any low stool', where: `From home, or ${MDIY} / True Value ${MAG}` },
      backup: { name: 'Foldable stool, small', where: 'K&B Plastic Ware (Lazada)', link: `${LZ}pdp-i3356996633.html`, price: 88, eta: ONLINE } },
    box: { qty: '1', free: 'from home',
      pick: { name: 'Any box with a lid, about 40 L', where: `From home, or ${MDIY}` },
      backup: { name: 'Edepot 40 L storage box', where: 'EdepotPH (Lazada)', link: `${LZ}pdp-i5214275668.html`, price: 255, eta: ONLINE } },
    kit: { qty: '1 set', total: [170, 290],
      pick: { name: '100 cable ties, 10 m rope, masking + double-sided tape, scissors', where: MDIY, eta: 'Sun walk-in' },
      backup: { name: '2 in binder clips, 12s (₱75); tapes ₱41–60; scissors ₱67', where: `National Book Store, ${MAG}`, link: `${NBS}best-buy-clip-foldback-5301-2in-50mm-12s-black-clips`, price: 75, eta: 'Sun walk-in' } },
  },
  extras: [
    { name: 'Pens (box of 12) + pen cup', qty: '1', total: [108, 150],
      pick: { name: 'Black ballpens + Olife transparent organizer (₱39)', where: `National Book Store, ${MAG}`, link: `${NBS}olife-desk-organizer-ts003t01-transparent-home-office-organizer`, eta: 'Sun walk-in' },
      backup: { name: 'FlexSTICK black, box of 12', where: 'A&J School and Office Supplies, QC (Lazada)', link: `${LZ}pdp-i277927736.html`, price: 69, eta: ONLINE } },
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
  if (!rows.length) { host.innerHTML = '<p class="sec__sub">Quotes are on the way.</p>'; return; }
  let lo = 0, hi = 0;
  rows.forEach((r) => { if (r.total == null) return; const [a, b] = Array.isArray(r.total) ? r.total : [r.total, r.total]; lo += a; hi += b; });
  document.querySelectorAll('[data-shop-total]').forEach((el) => { el.textContent = peso([lo, hi]); });
  document.querySelectorAll('[data-shop-asof]').forEach((el) => { el.textContent = SHOP.asOf; });
  const plan = document.getElementById('shopPlan');
  if (plan && SHOP.plan.length) plan.innerHTML = SHOP.plan.map((s) => `<li>${s}</li>`).join('');
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
}
