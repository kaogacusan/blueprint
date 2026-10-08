/* Blueprint landing page — small, dependency-free interactions. */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  requestAnimationFrame(() => document.documentElement.classList.add("is-loaded"));

  /* Nav: glass background once you scroll */
  const nav = document.getElementById("nav");
  const onScrollNav = () => nav.classList.toggle("is-scrolled", window.scrollY > 24);
  onScrollNav();
  window.addEventListener("scroll", onScrollNav, { passive: true });

  /* Reveal on scroll (staggered inside each parent) */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal") || c.classList.contains("quote"));
        const i = Math.max(0, siblings.indexOf(el));
        el.style.transitionDelay = `${Math.min(i, 6) * 70}ms`;
        el.classList.add("in");
        io.unobserve(el);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  document.querySelectorAll(".reveal, .quote").forEach((el) => io.observe(el));

  /* Problem quotes: tick each box one by one once they land — "yep, that's me" */
  const quotes = document.querySelectorAll(".quote");
  const qObs = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      quotes.forEach((q, i) => setTimeout(() => q.classList.add("is-checked"), 900 + i * 260));
      qObs.disconnect();
    },
    { threshold: 0.4 }
  );
  if (quotes.length) qObs.observe(document.getElementById("quotes"));

  /* Hero: drafting crosshair follows the mouse */
  const hero = document.getElementById("hero");
  if (hero && finePointer && !reduce) {
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--cx", `${e.clientX - r.left}px`);
      hero.style.setProperty("--cy", `${e.clientY - r.top}px`);
    });
  }

  /* Hero: the floating cards drift apart as you scroll (not the mouse) */
  const stack = document.getElementById("stack");
  const layers = stack ? [...stack.querySelectorAll("[data-depth]")] : [];
  if (layers.length && !reduce) {
    const drift = [[-1, -1], [1, -0.4], [-0.6, 1], [1, -1.2]];
    let ticking = false;
    const onScrollHero = () => {
      ticking = false;
      const y = Math.min(window.scrollY, window.innerHeight);
      layers.forEach((l, i) => {
        const d = parseFloat(l.dataset.depth);
        const [dx, dy] = drift[i] || [0, -1];
        l.style.setProperty("--tx", `${(dx * y * 0.06 * d).toFixed(1)}px`);
        l.style.setProperty("--ty", `${(dy * y * 0.08 * d - y * 0.12 * d).toFixed(1)}px`);
      });
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScrollHero); } }, { passive: true });
    onScrollHero();
  }

  /* Hero: typewriter inside the "career-brand statement" card */
  const typed = document.getElementById("typed");
  const phrases = ["showing, not claiming.", "turning chaos into plans.", "the story behind the work.", "making ideas real."];
  if (typed) {
    if (reduce) typed.textContent = phrases[0];
    else {
      let p = 0, c = 0, deleting = false;
      const tick = () => {
        const word = phrases[p];
        c += deleting ? -1 : 1;
        typed.textContent = word.slice(0, c);
        let wait = deleting ? 28 : 55;
        if (!deleting && c === word.length) { deleting = true; wait = 1800; }
        else if (deleting && c === 0) { deleting = false; p = (p + 1) % phrases.length; wait = 350; }
        setTimeout(tick, wait);
      };
      setTimeout(tick, 900);
    }
  }

  /* ---------- Sneak peek gallery ----------
     Desktop: the section pins and the cards slide sideways as you scroll down.
     Phone / touch: the row is a normal swipe (CSS). */
  const peek = document.getElementById("materials");
  const track = document.getElementById("peekTrack");
  const rail = peek ? peek.querySelector(".peek__rail") : null;
  const peekNow = document.getElementById("peekNow");
  const peekBar = document.getElementById("peekBar");
  const pinMQ = window.matchMedia("(min-width: 901px) and (pointer: fine)");
  if (peek && track) {
    const cards = [...track.querySelectorAll(".pk")];
    let travel = 0;

    const setCount = () => {
      // the card closest to the middle of the screen is "current"
      const mid = window.innerWidth / 2;
      let best = 0, bestD = Infinity;
      cards.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - mid);
        if (d < bestD) { bestD = d; best = i; }
      });
      if (peekNow) peekNow.textContent = String(Math.min(best + 1, 6)).padStart(2, "0");
    };

    const layout = () => {
      if (pinMQ.matches) {
        travel = Math.max(0, track.scrollWidth - window.innerWidth);
        peek.style.height = `${window.innerHeight + travel}px`;
      } else {
        travel = 0;
        peek.style.height = "";
        track.style.transform = "";
      }
      update();
    };
    const update = () => {
      let p;
      if (pinMQ.matches) {
        const r = peek.getBoundingClientRect();
        p = travel ? Math.min(1, Math.max(0, -r.top / travel)) : 0;
        track.style.transform = `translate3d(${(-p * travel).toFixed(1)}px, 0, 0)`;
      } else {
        const max = rail.scrollWidth - rail.clientWidth;
        p = max > 0 ? rail.scrollLeft / max : 0;
      }
      if (peekBar) peekBar.style.setProperty("--p", p.toFixed(3));
      setCount();
    };

    let ticking = false;
    const onScrollPeek = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); } };
    window.addEventListener("scroll", onScrollPeek, { passive: true });
    rail.addEventListener("scroll", onScrollPeek, { passive: true });
    window.addEventListener("resize", layout);
    pinMQ.addEventListener("change", layout);
    layout();

    // each card plays its animation when most of it is on screen, and resets when it leaves
    const live = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.intersectionRatio >= 0.7) e.target.classList.add("is-live");
        else if (e.intersectionRatio < 0.15) e.target.classList.remove("is-live");
      });
    }, { threshold: [0, 0.15, 0.7] });
    cards.forEach((c) => live.observe(c));
  }

  /* AAA card flip */
  const flip = document.getElementById("flip");
  if (flip) flip.addEventListener("click", () => flip.classList.toggle("is-flipped"));

  /* Outreach card: press Send */
  const outreach = document.getElementById("outreach");
  const send = document.getElementById("send");
  if (outreach && send) {
    send.addEventListener("click", () => {
      outreach.classList.add("is-sent");
      setTimeout(() => outreach.classList.remove("is-sent"), 2600);
    });
  }

  /* FAQ: only one open at a time */
  const qas = document.querySelectorAll(".qa");
  qas.forEach((d) => d.addEventListener("toggle", () => { if (d.open) qas.forEach((o) => o !== d && (o.open = false)); }));

  /* ---------- Registration modal ----------
     MOCKUP: the form does not send data anywhere yet.
     To go live, replace the setTimeout in onSubmit with a real request
     (Google Form, Tally, Formspree, Supabase, etc.). */
  const modal = document.getElementById("modal");
  const form = document.getElementById("regForm");
  const done = document.getElementById("done");

  const openModal = () => {
    form.hidden = false;
    done.hidden = true;
    form.reset();
    form.querySelectorAll(".is-invalid").forEach((f) => f.classList.remove("is-invalid"));
    modal.showModal();
    setTimeout(() => form.querySelector("input")?.focus(), 60);
  };
  document.querySelectorAll("[data-register]").forEach((b) => b.addEventListener("click", openModal));
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.closest("[data-close]")) modal.close();
  });

  const validate = () => {
    let ok = true;
    form.querySelectorAll(".field").forEach((f) => {
      const input = f.querySelector("input, select");
      const valid = input.checkValidity() && input.value.trim() !== "";
      f.classList.toggle("is-invalid", !valid);
      if (!valid) ok = false;
    });
    return ok;
  };
  form.addEventListener("input", (e) => {
    const f = e.target.closest(".field");
    if (f && f.classList.contains("is-invalid") && e.target.checkValidity()) f.classList.remove("is-invalid");
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate()) { form.querySelector(".is-invalid input, .is-invalid select")?.focus(); return; }
    const data = Object.fromEntries(new FormData(form));
    const btn = form.querySelector("[type=submit]");
    btn.classList.add("is-loading");
    btn.disabled = true;

    setTimeout(() => {
      btn.classList.remove("is-loading");
      btn.disabled = false;
      document.getElementById("regNo").textContent = `#${String(Math.floor(Math.random() * 900) + 100).padStart(4, "0")}`;
      document.getElementById("regName").textContent = data.name.trim();
      document.getElementById("regMeta").textContent = `${data.course} · ${data.year}`;
      form.hidden = true;
      done.hidden = false;
      console.info("[Blueprint mockup] registration captured locally:", data);
    }, 900);
  });
})();
