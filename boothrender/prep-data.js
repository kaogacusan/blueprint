// What to print, buy, and bring for the booth, side by side with Prince's booth. One source for both pages:
// /boothrender (costs on the parts list) and /boothrender/prep (the tables). Prices as seen on Sun Nov 8, 2026:
// quotes replace them. cost = what OUR booth pays, [low, high] in pesos.
export const ASOF = 'Sun, Nov 8, 2026';
export const BUDGET = 3000;

const OURS = (id, page = 1) => ({ pdf: `/assets/print/booth/${id}/v1.pdf`, img: `/assets/print/booth/${id}/v1-${page}.t.jpg` });
const HIS = (id) => ({ pdf: `https://profstopick-booth.vercel.app/assets/print/booth/${id}/v1.pdf`, img: `https://profstopick-booth.vercel.app/assets/print/booth/${id}/v1-1.t.jpg` });
const FB = (n) => `https://www.facebook.com/marketplace/item/${n}/`;

// One print shop for both booths. JJ's own FB lists everything we print; acrylic stands and cloth are bought.
export const SHOP = {
  name: 'JJ Pick & Print', where: '20 Sto. Domingo St, Holy Spirit, QC (off Commonwealth)', phone: '0918 595 9997',
  fb: 'https://www.facebook.com/JJPicknPrint', email: 'jewelle.printing.services@gmail.com',
  does: 'Tarps, roll-up and X-stand banners, calling cards, flyers, sticker on sintra. “One day process”, takes rush orders.',
  hours: 'Its FB says open Sun 8 am–5 pm; Waze says closed Sundays. Call first.',
  backup: { name: 'YZA', where: '209 Prince David Condo, Katipunan, across Ateneo', phone: '0917 574 1449', hours: 'Mon–Sat 8–5, closed Sun', prices: 'Tarp ₱30/sq ft · cards ₱600 for 120' },
};

// Printing. ours / prince: what each booth sends to the same shop.
export const PRINT = [
  { id: 'banner', piece: 'pullup', both: true, name: 'Standing banner',
    spec: 'Tarp (or PP film: curls less), full colour, cut exact. Finish to match the stand: a roll-up takes no grommets or hem; an X-stand needs 4 corner grommets.',
    ours: { qty: '1', size: '80 × 200 cm, roll-up: no grommets, no hem', os: '80 × 200 cm, for a roll-up stand (no grommets, no hem)', ...OURS('pullup') },
    prince: { qty: '1', size: '60 × 160 cm. Measure Atasha’s stand first', ...HIS('banner') },
    cost: [260, 520], costNote: '≈17 sq ft at ₱15–30' },
  { id: 'cards', piece: 'card', both: true, name: 'Business-size cards',
    spec: '90 × 54 mm, colour, 2 sides, 300 gsm matte. Our PDF has 3 mm bleed: trim to 90 × 54.',
    ours: { qty: '100–150', size: 'Calling card', ...OURS('card') },
    prince: { qty: 'His count', size: 'Pass cards. He sends his own file: it has the voucher codes', ...HIS('card') },
    cost: [250, 600], costNote: 'FB has 100 for ₱250; YZA ₱600 for 120' },
  { id: 'flyers', piece: 'flyers', both: true, name: 'Flyers',
    spec: 'A6 (105 × 148 mm), colour, 2 sides, 120–160 gsm. The shop prints 4 per A4 and trims.',
    ours: { qty: '100', size: '1 design. PDF has 3 mm bleed', ...OURS('flyer') },
    prince: { qty: 'Ask Prince', size: '7 designs (the hooks)', ...HIS('flyer') },
    cost: [250, 500], costNote: '25 A4 sheets, both sides' },
  { id: 'sign', piece: 'regqr', both: true, name: 'Table signs',
    spec: 'Colour, 1 side, card stock or photo paper. Goes in the acrylic stand.',
    ours: { qty: '1', size: 'A4: the sign-up QR', os: 'A4', ...OURS('regqr') },
    prince: { qty: '2', size: 'A5: QR sign · A4: price list', ...HIS('qr') },
    cost: [20, 40] },

  { id: 'header', piece: 'header', name: 'Header tarp', spec: '1.4 × 0.6 m tarp. Hem, grommets every 30 cm.',
    ours: { qty: '1', ...OURS('header') }, cost: [136, 271], costNote: '9 sq ft' },
  { id: 'backdrop', piece: 'backdrop', name: 'Backdrop tarp', spec: '1.5 × 1.5 m tarp. Grommets every 30 cm on the top edge, plus the 2 bottom corners.',
    ours: { qty: '1', ...OURS('backdrop') }, cost: [363, 726], costNote: '24 sq ft' },
  { id: 'skirt', piece: 'skirt', name: 'Table skirt tarp', spec: '0.9 × 0.7 m tarp. 4 corner grommets.',
    ours: { qty: '1', ...OURS('skirt') }, cost: [102, 203], costNote: '7 sq ft' },
  { id: 'bingo', piece: 'bingo', name: 'Red Flag Bingo cards', optional: true, spec: 'A6, colour, 2 sides, card stock 200 gsm or more. 4 per A4, trimmed. PDF has 3 mm bleed.',
    ours: { qty: '60', size: 'If the budget allows', ...OURS('bingo') }, cost: [150, 450], costNote: '15 A4 sheets' },
  { id: 'signup', piece: 'signup', name: 'Sign-up sheet', spec: 'A4, black and white, regular paper.',
    ours: { qty: '5', ...OURS('signup') }, cost: [25, 25] },

  { id: 'faq', name: 'Staff FAQ', spec: 'A4, black and white. For his team, behind the table.',
    prince: { qty: '1–2', ...HIS('faq') } },
];

// Buying: no printer makes these.
export const BUY = [
  { id: 'stand', piece: 'pullup', name: 'Roll-up banner stand', for: 'us', prince: 'Borrowed (Atasha’s)',
    spec: 'A roll-up (pull-up) stand holds the print at the top and the bottom; the print rolls into the base. 80 × 200 cm. Comes with a bag.',
    pick: { name: 'Roll Up Banner Stand 200 × 80 cm, complete set. New', where: 'FB Marketplace, Quezon City', link: FB(1077659547946343), price: '₱420' },
    alt: [
      { name: 'Roll up banner, new. Size not listed: ask', where: 'FB Marketplace, Quezon City', link: FB(1043575711793871), price: '₱420' },
      { name: 'Roll-up stand + print, rush, same-day release. 2.75 × 6.5 ft', where: 'FB Marketplace, Quezon City', link: FB(1514858010309756), price: '₱1,800 with print' },
    ],
    cost: [420, 700] },
  { id: 'a4', piece: 'regqr', name: 'A4 acrylic sign stand', for: 'us', prince: 'He has an A5 (₱119)',
    spec: 'Clear, upright, holds a 210 × 297 mm sheet, portrait. A T-type (2-sided) looks better than an L-type.',
    pick: { name: 'Acrylic display stand / menu holder. New, on hand. Ask for A4 portrait', where: 'FB Marketplace, Quezon City (Lalamove or pickup)', link: FB(1070631269179446), price: '₱270' },
    alt: [
      { name: 'Acrylic holder A4, L-shape, vertical', where: 'National Book Store, walk-in (open Sun)', link: 'https://nationalbookstore.com/products/acrylic-holder-21x297mm-l-shape-vertical-home-office-supplies-brochure-holders', price: '₱250' },
      { name: 'A4 acrylic menu stand, T-type, 2-sided', where: 'FB Marketplace, Pasig', link: FB(2242082256368134), price: '₱350' },
    ],
    cost: [250, 350] },
  { id: 'cloth', piece: 'cloth', name: 'Tablecloth', for: 'both', prince: '1 (he budgets ₱379)',
    spec: 'Navy or black. For a 4 ft table to reach the floor on the sides: about 150 × 270 cm (60 × 108 in, sold as “6 ft table” size).',
    pick: { name: 'Rectangular tablecloth 142 × 218 cm. Ask for navy or black; it drops 48 cm on the sides', where: 'FB Marketplace, Quezon City', link: FB(1050749884375587), price: '₱190' },
    alt: [{ name: 'Any navy or black flat bedsheet from home', where: 'Home', price: '₱0' }],
    cost: [190, 379] },
  { id: 'kit', piece: 'kit', name: 'Zip ties, rope, duct tape', for: 'both', prince: 'Split the zip ties',
    spec: '100 zip ties (8 in), 5–10 m rope, 1 roll of duct tape.',
    pick: { name: 'Walk-in', where: 'Mr. DIY Katipunan', price: '₱100–200' },
    cost: [50, 100] },
];

// Bringing or borrowing: free.
export const BRING = [
  { id: 'table', piece: 'table', name: 'Lifetime folding table', who: 'Thomas', note: 'Check it is the 4 ft one (122 × 61 cm). A 6 ft (183 cm) is wider than our half of the tent (150 cm).' },
  { id: 'chairs', piece: 'stool', name: 'Chairs, 1–2', who: 'Ask the organiser', note: 'If none are given, a member brings a folding chair or monobloc.' },
  { id: 'step', name: 'Sturdy chair to stand on', who: 'Same as the chairs', note: 'To hang the header and the backdrop.' },
  { id: 'clip', piece: 'signup', name: 'Clipboard', who: 'Members', note: 'For the sign-up sheet.' },
  { id: 'cup', piece: 'bingo', name: 'Cup + 3 pens', who: 'Members', note: 'For the bingo cards and the sign-up sheet.' },
  { id: 'scissors', name: 'Scissors', who: 'Members', note: 'For zip ties and tape.' },
  { id: 'phone', piece: 'phone', name: 'Phone + power bank', who: 'Whoever is on shift', note: 'The sign-up page open. Don’t count on a socket.' },
  { id: 'laptop', piece: 'phone', name: 'Laptop to demo the site', who: 'Members, if someone has one', note: 'Optional. On the back-right of the table, screen to the aisle.' },
  { id: 'box', piece: 'box', name: 'Supply box', who: 'Keira', note: 'About 45 × 30 × 30 cm, under the table.' },
];

// What our booth pays for one piece of the 3D model: every print and buy row for that piece.
export function costOf(piece) {
  let lo = 0, hi = 0, any = false;
  for (const r of [...PRINT, ...BUY]) if (r.piece === piece && r.cost) { lo += r.cost[0]; hi += r.cost[1]; any = true; }
  return any ? [lo, hi] : null;
}
export function totals() {
  const sum = (rows, f = () => true) => rows.filter((r) => r.cost && f(r)).reduce(([a, b], r) => [a + r.cost[0], b + r.cost[1]], [0, 0]);
  const print = sum(PRINT), buy = sum(BUY), must = sum([...PRINT, ...BUY], (r) => !r.optional);
  return { print, buy, all: [print[0] + buy[0], print[1] + buy[1]], must };
}
