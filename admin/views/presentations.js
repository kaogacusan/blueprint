/* Presentations: the session decks, opened full screen. */
import { S } from "/admin/store.js";
import { esc, icon, fmtDate } from "/admin/lib.js";

export default {
  id: "presentations", title: "Presentations", icon: "play",
  render(root) {
    const decks = S.data.decks || [];
    const sessions = S.data.sessions || [];
    root.innerHTML = `
      <header class="ph">
        <div>
          <p class="ph__eyebrow">Facilitation</p>
          <h1 class="ph__title">Presentations</h1>
          <p class="ph__sub">Opens full screen in a new tab. → or Space for next, ← for back, F for full screen, T for the block timer.</p>
        </div>
      </header>
      <section class="decks">${[1, 2, 3, 4].map((n, i) => {
        const d = decks.find((x) => x.session_no === n);
        const s = sessions.find((x) => x.n === n);
        return d ? `
          <a class="deck stagger" style="--i:${i}" href="/present/${esc(d.slug)}" target="_blank" rel="noopener">
            <span class="deck__grid" aria-hidden="true"></span>
            <span class="deck__num">0${n}</span>
            <span class="deck__k">Session ${n} · ${d.slide_count} slides</span>
            <span class="deck__t">${esc(d.title)}</span>
            <span class="deck__s">${esc(d.subtitle)}${s?.date ? ` · ${esc(fmtDate(s.date))}` : ""}</span>
            <span class="deck__go">${icon("play")} Present</span>
          </a>` : `
          <div class="deck deck--soon stagger" style="--i:${i}">
            <span class="deck__num">0${n}</span>
            <span class="deck__t">${esc(s?.title || `Session ${n}`)}</span>
            <span class="deck__s">Deck not uploaded yet.</span>
          </div>`;
      }).join("")}</section>`;
  },
};
