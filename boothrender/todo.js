// "Tomorrow": the one checklist for getting the booth made. Four groups (print at a shop, buy, print at home,
// bring), one row per thing, each with its spec, where, the price, and the file. Ticks are saved in this browser.
// Prices match shop.js (as seen Sun Nov 8, 2026). Files are the V1 PDFs from npm run print -- booth.
const PDF = (id) => `/assets/print/booth/${id}/v1.pdf`;
const SITE = 'https://ateneoblueprint.vercel.app';

export const TODO = {
  shop: {
    name: 'JJ Pick & Print', phone: '0918 595 9997', fb: 'https://www.facebook.com/JJPicknPrint', email: 'jewelle.printing.services@gmail.com',
    where: '20 Sto. Domingo St, Holy Spirit, QC (off Commonwealth)',
    hours: 'Its FB says open Sun 8 am–5 pm and does rush, same-day work. Waze says closed Sunday, so call before sending.',
    backup: 'YZA, 209 Prince David Condo, Katipunan (across Ateneo). Mon–Sat 8–5, closed Sunday. 0917 574 1449. Tarp ₱30 per sq ft, cards ₱600 for 120.',
  },
  groups: [
    {
      id: 'print', k: 'Most important · send by 8 am', title: 'Print at a shop',
      sub: 'One order, at one shop, for everything below. Prince’s banner, pass cards, and signs go in the same order; each booth pays its own share.',
      steps: [
        ['Call', 'At 8 am, call JJ Pick & Print. Ask: open today? Same-day? Lalamove to Katipunan?'],
        ['Send', 'Tap “Copy the order” below and paste it in Messenger or email. It has every size and file link.'],
        ['Pay', 'Get the total, pay by GCash, and screenshot the receipt.'],
        ['Collect', 'Pick up, or book a Lalamove to Ateneo. Check every size, the grommets, and scan the QRs.'],
      ],
      items: [
        { id: 'p-header', name: 'Header tarp', qty: '1', spec: ['1.4 × 0.6 m', 'tarp', 'hem + grommets every 30 cm'], price: '₱136–271', file: PDF('header'), piece: 1 },
        { id: 'p-backdrop', name: 'Backdrop tarp', qty: '1', spec: ['1.5 × 1.5 m', 'tarp', 'grommets every 30 cm on the top edge + 2 bottom corners'], price: '₱363–726', file: PDF('backdrop'), piece: 2 },
        { id: 'p-skirt', name: 'Table skirt tarp', qty: '1', spec: ['0.9 × 0.7 m', 'tarp', '4 corner grommets'], price: '₱102–203', file: PDF('skirt'), piece: 3 },
        { id: 'p-banner', name: 'Standing banner: the print only', qty: '1', spec: ['60 × 160 cm', 'tarp', 'finish to match the stand: see “The standing banner” below'], price: '₱155–310', file: PDF('pullup'), piece: 4,
          order: '60 × 160 cm, tarp. For an X-stand: 4 corner grommets. If you sell a 60 × 160 X-stand or roll-up, please fit the print to it',
          note: 'The stand is a separate purchase: it’s on the Buy list.' },
        { id: 'p-cards', name: 'Calling cards', qty: '100–150', spec: ['90 × 54 mm', '2 sides', '300 gsm matte', 'file has 3 mm bleed: trim to 90 × 54'], price: '₱250–750', file: PDF('card'), piece: 7 },
        { id: 'p-qr', name: 'Sign-up QR sign', qty: '1', spec: ['A5', 'colour', 'card stock'], price: '₱20–40', file: PDF('regqr'), piece: 6 },
        { id: 'p-check', name: 'Resume check sign', qty: '1', spec: ['A4', 'colour', 'card stock'], price: '₱20–40', file: PDF('check'), piece: 5 },
      ],
    },
    {
      id: 'buy', k: 'Sunday', title: 'Buy',
      sub: 'Things no printer makes. The banner stand is the big one.',
      items: [
        { id: 'b-stand', name: 'Banner stand', qty: '1', spec: ['X-stand or roll-up', 'must take 60 × 160 cm'], price: '₱100–1,300', piece: 4,
          where: 'Ask JJ first (it sells both, and can fit the print). Or the FB Marketplace X-stand below.', link: 'https://www.facebook.com/marketplace/item/2201167447130659/', linkText: 'X-stand ₱100, Marikina, fits 60 × 180: ask if it adjusts to 160' },
        { id: 'b-a5', name: 'A5 acrylic sign stand', qty: '1', spec: ['clear, upright', '148 × 210 mm'], price: '₱119', piece: 6, where: 'Where Prince got his ₱119 one: buy 2, one for each booth.' },
        { id: 'b-a4', name: 'A4 acrylic sign stand', qty: '1', spec: ['clear, upright', '210 × 297 mm'], price: '₱250', piece: 5,
          where: 'Prince’s A5 seller if they have A4. If not, National Book Store (Katipunan or Magnolia).', link: 'https://nationalbookstore.com/products/acrylic-holder-21x297mm-l-shape-vertical-home-office-supplies-brochure-holders', linkText: 'NBS acrylic holder A4, L-shape' },
        { id: 'b-cloth', name: 'Tablecloth', qty: '1', spec: ['navy or black', 'about 150 × 230 cm'], price: '₱190–379', piece: 11,
          where: 'FB Marketplace, Quezon City. Message to ask for navy or black, and get 2 (one for Prince).', link: 'https://www.facebook.com/marketplace/item/1050749884375587/', linkText: 'Tablecloth 142 × 218 cm, ₱190' },
        { id: 'b-kit', name: 'Zip ties, rope, duct tape', qty: '1 set', spec: ['100 zip ties, 8 in', '5–10 m rope', '1 roll duct tape'], price: '₱100–200', piece: 15, where: 'Mr. DIY Katipunan. Split the zip ties with Prince.' },
        { id: 'b-stock', name: 'A4 card stock', qty: '1 pack', spec: ['200 gsm or more', 'white'], price: '≈₱100–200', where: 'National Book Store. For the bingo cards, and the calling cards if no shop prints them.' },
      ],
    },
    {
      id: 'home', k: 'Sunday night', title: 'Print at home',
      sub: 'Each file is a full A4 sheet. Print both sides, flip on the long edge, at 100%, then cut.',
      items: [
        { id: 'h-flyers', name: 'Flyers', qty: '25 sheets = 100', spec: ['4 per A4', 'colour', 'both sides', 'paper or light card'], price: 'home ink', file: PDF('flyersheet'), piece: 9 },
        { id: 'h-bingo', name: 'Red Flag Bingo cards', qty: '15 sheets = 60', spec: ['4 per A4', 'colour', 'both sides', 'card stock'], price: 'home ink', file: PDF('bingosheet'), piece: 8 },
        { id: 'h-signup', name: 'Sign-up sheet', qty: '5 sheets', spec: ['A4', 'black and white'], price: 'home ink', file: PDF('signup'), piece: 10 },
        { id: 'h-guide', name: 'Resume check guide (team)', qty: '3 sheets', spec: ['A4', 'black and white', 'one per person on shift'], price: 'home ink', file: PDF('guide') },
        { id: 'h-cards', name: 'Calling cards (only if no shop)', qty: '10–15 sheets', spec: ['10 per A4', 'colour', 'both sides', 'card stock', 'cut on the marks'], price: 'home ink', file: PDF('cardsheet'), piece: 7, optional: true },
      ],
    },
    {
      id: 'bring', k: 'Monday morning', title: 'Bring or borrow',
      sub: 'Free. Pack it in the supply box Sunday night.',
      items: [
        { id: 'r-table', name: 'Folding table, 3 ft', qty: '1', spec: ['about 0.9 × 0.6 m'], where: 'Borrow. Ask the organiser first: they may provide one.', piece: 12 },
        { id: 'r-stool', name: 'Stool or chair', qty: '1', spec: ['any'], where: 'From home', piece: 13 },
        { id: 'r-step', name: 'Sturdy chair to stand on', qty: '1', spec: ['for hanging the header'], where: 'From home or the org room' },
        { id: 'r-box', name: 'Supply box', qty: '1', spec: ['about 45 × 30 × 30 cm'], where: 'From home', piece: 14 },
        { id: 'r-desk', name: 'Clipboard, 3 pens + a cup, scissors', qty: '1 set', spec: ['for the sign-up sheet and bingo'], where: 'From home' },
        { id: 'r-power', name: 'Phone + power bank', qty: '1', spec: ['the sign-up page open'], where: 'Whoever is on shift' },
      ],
    },
  ],
  // The standing banner is two purchases and a set-up.
  banner: [
    ['Buy the stand', 'Two kinds. An <b>X-stand</b> (₱100–350) is the cheapest: four arms hook into a grommet in each corner of the tarp. A <b>roll-up</b> (₱1,000–1,300 for the stand alone) hides the banner in a base and pulls it up; the tarp is taped to a roller, so the shop usually fits it. 60 × 160 cm is a standard X-stand size.'],
    ['Print the tarp', '60 × 160 cm from our PDF. Tell the shop which stand: for an X-stand, “4 corner grommets”; for a roll-up, “no grommets, please install it on my stand.” Easiest of all: ask JJ for a 60 × 160 X-stand with the tarp, fitted, as one item.'],
    ['Set it up', 'X-stand: open the legs, hook the 4 corners. Roll-up: open the feet, click the pole together, pull the banner up and hook it on top. Zip-tie the pole to the front-left tent leg, angled up the road. Bring it in every night.'],
  ],
};

// The text to paste to the shop: every shop item, its spec and its file link.
export function orderText() {
  const g = TODO.groups.find((x) => x.id === 'print');
  const lines = g.items.map((it, i) => `${i + 1}. ${it.name.replace(': the print only', '')}, ${it.qty} pc${it.qty === '1' ? '' : 's'}: ${it.order || it.spec.join(', ')}\n   File: ${SITE}${it.file}`);
  return `Hi! Rush order for today, please. Same-day pickup or Lalamove to Ateneo (Katipunan).\n\n${lines.join('\n')}\n\nAlso: a stand for the 60 × 160 banner (X-stand or roll-up). How much is each?\nMy friend’s booth will send theirs in the same order (another 60 × 160 banner, pass cards, an A5 and an A4 sign). We pay separately.\n\nCan you send the total and when it will be ready? Thank you!`;
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEY = 'blueprint-booth-todo-v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: ticks just don't persist */ } };

export function mountTodo() {
  const host = document.getElementById('todo');
  if (!host) return;
  const done = load();
  const S = TODO.shop;
  const row = (it) => `
    <li class="todo__row${it.optional ? ' todo__row--opt' : ''}">
      <label class="todo__tick"><input type="checkbox" data-todo="${it.id}"${done[it.id] ? ' checked' : ''} /><span class="todo__box" aria-hidden="true"></span>
        <span class="todo__name">${it.piece ? `<i>${it.piece}</i>` : ''}${esc(it.name)}</span></label>
      <div class="todo__spec"><span class="todo__qty">${/^\d+$/.test(it.qty) ? `× ${it.qty}` : esc(it.qty)}</span>${it.spec.map((x) => `<span>${esc(x)}</span>`).join('')}</div>
      ${it.where || it.note ? `<p class="todo__where">${esc(it.where || '')}${it.note ? ` <b>${esc(it.note)}</b>` : ''}${it.link ? ` <a href="${esc(it.link)}" target="_blank" rel="noopener">${esc(it.linkText || 'Link')} ↗</a>` : ''}</p>` : ''}
      <div class="todo__end">${it.price ? `<span class="todo__price">${esc(it.price)}</span>` : ''}${it.file ? `<a class="todo__file" href="${esc(it.file)}" target="_blank" rel="noopener" download>PDF ↓</a>` : ''}</div>
    </li>`;
  host.innerHTML = `
    <div class="todo__bar"><b data-todo-count></b><span class="todo__meter"><i data-todo-meter></i></span><button type="button" class="todo__reset" data-todo-reset>Clear ticks</button></div>
    ${TODO.groups.map((g, gi) => `
    <section class="todo__group todo__group--${g.id}">
      <header class="todo__head"><p class="when__k">${gi + 1} · ${esc(g.k)}</p><h3>${esc(g.title)} <span class="muted" data-todo-gcount="${g.id}"></span></h3><p>${esc(g.sub)}</p></header>
      ${g.id === 'print' ? `
      <div class="todo__shop">
        <div><b>${esc(S.name)}</b> · <a href="tel:${S.phone.replace(/\s/g, '')}">${esc(S.phone)}</a> · <a href="${esc(S.fb)}" target="_blank" rel="noopener">Messenger ↗</a> · ${esc(S.email)}<br><span>${esc(S.where)}. ${esc(S.hours)}</span><br><span><b>If not:</b> ${esc(S.backup)}</span></div>
        <button type="button" class="btn btn--pri" data-todo-copy>Copy the order <small>for the shop</small></button>
      </div>
      <ol class="todo__steps">${g.steps.map(([a, b]) => `<li><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join('')}</ol>` : ''}
      <ul class="todo__list">${g.items.map(row).join('')}</ul>
      ${g.id === 'buy' ? `
      <div class="todo__banner card"><h3>The standing banner is two parts: a stand you buy, and a print.</h3>
        <ol>${TODO.banner.map(([a, b]) => `<li><b>${esc(a)}.</b> ${b}</li>`).join('')}</ol></div>` : ''}
    </section>`).join('')}`;

  const boxes = [...host.querySelectorAll('[data-todo]')];
  const count = () => {
    const n = boxes.filter((b) => b.checked).length;
    host.querySelector('[data-todo-count]').textContent = `${n} of ${boxes.length} done`;
    host.querySelector('[data-todo-meter]').style.width = `${(100 * n) / boxes.length}%`;
    TODO.groups.forEach((g) => {
      const bs = boxes.filter((b) => g.items.some((it) => it.id === b.dataset.todo));
      host.querySelector(`[data-todo-gcount="${g.id}"]`).textContent = `${bs.filter((b) => b.checked).length}/${bs.length}`;
    });
  };
  host.addEventListener('change', (e) => {
    const b = e.target.closest('[data-todo]');
    if (!b) return;
    done[b.dataset.todo] = b.checked;
    save(done);
    count();
  });
  host.querySelector('[data-todo-reset]').addEventListener('click', () => {
    boxes.forEach((b) => { b.checked = false; done[b.dataset.todo] = false; });
    save(done);
    count();
  });
  const copyBtn = host.querySelector('[data-todo-copy]');
  copyBtn.addEventListener('click', async () => {
    const text = orderText();
    const small = copyBtn.querySelector('small');
    try {
      await navigator.clipboard.writeText(text);
      small.textContent = 'copied ✓';
    } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      document.body.append(ta); ta.select();
      try { document.execCommand('copy'); small.textContent = 'copied ✓'; } catch { small.textContent = 'copy failed'; }
      ta.remove();
    }
    setTimeout(() => { small.textContent = 'for the shop'; }, 2500);
  });
  count();
}
