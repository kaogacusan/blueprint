/* Presentations: the session decks, opened full screen. */
import { S } from "/admin/store.js";
import { esc, icon, fmtDate } from "/admin/lib.js";

export default {
  id: "presentations", title: "Decks", icon: "play",
  render(root) {
    const decks = S.data.decks || [];
    const sessions = S.data.sessions || [];
    root.innerHTML = `
      <header class="ph">
        <div>
          <h1 class="ph__title">Decks</h1>
          <p class="ph__sub">Click a deck to present it full screen. Keys: <kbd>→</kbd> next · <kbd>←</kbd> back · <kbd>F</kbd> full screen · <kbd>T</kbd> timer</p>
        </div>
      </header>
      <section class="decks">${[1, 2, 3, 4].map((n, i) => {
        const d = decks.find((x) => x.session_no === n);
        const s = sessions.find((x) => x.n === n);
        return d ? `
          <a class="deck in" style="--i:${i}" href="/present/${esc(d.slug)}" target="_blank" rel="noopener">
                        <span class="deck__num">S${n}</span>
            <span class="deck__k">${d.slide_count} slides${s?.date ? ` · ${esc(fmtDate(s.date))}` : ""}</span>
            <span class="deck__t">${esc(d.title)}</span>
            <span class="deck__s">${esc(d.subtitle)}</span>
            <span class="deck__go">${icon("play")} Present</span>
          </a>` : `
          <div class="deck deck--soon in" style="--i:${i}">
            <span class="deck__num">S${n}</span>
            <span class="deck__k">Not uploaded yet</span>
            <span class="deck__t">${esc(s?.title || `Session ${n}`)}</span>
          </div>`;
      }).join("")}</section>`;
  },
};
