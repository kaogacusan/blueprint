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

  /* Hero: the grid lights up around the mouse */
  const hero = document.getElementById("hero");
  if (hero && finePointer && !reduce) {
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--cx", `${e.clientX - r.left}px`);
      hero.style.setProperty("--cy", `${e.clientY - r.top}px`);
    });
  }

  /* Hero: the headline fades and lifts a little as you scroll away */
  if (hero && !reduce) {
    let ticking = false;
    const onScrollHero = () => {
      ticking = false;
      hero.style.setProperty("--sp", Math.min(1, window.scrollY / (hero.offsetHeight * 0.9)).toFixed(3));
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScrollHero); } }, { passive: true });
  }

  /* Hero: a design-app selection box hops between "paper." and "person."
     It shows the word's real size in px, like a design tool does. */
  const hl = document.getElementById("hl");
  const sel = document.getElementById("sel");
  const selSize = document.getElementById("selSize");
  const words = hl ? [...hl.querySelectorAll("[data-word]")] : [];
  if (hl && sel && words.length) {
    let on = 0;
    const place = (i) => {
      const box = hl.getBoundingClientRect(), r = words[i].getBoundingClientRect();
      const pad = Math.round(r.height * 0.02);
      sel.style.setProperty("--x", `${(r.left - box.left - pad).toFixed(1)}px`);
      sel.style.setProperty("--y", `${(r.top - box.top + r.height * 0.1).toFixed(1)}px`);
      sel.style.setProperty("--w", `${(r.width + pad * 2).toFixed(1)}px`);
      sel.style.setProperty("--h", `${(r.height * 0.8).toFixed(1)}px`);
      selSize.textContent = `${Math.round(r.width)} × ${Math.round(r.height * 0.8)}`;
      words.forEach((w, j) => w.classList.toggle("is-on", j === i));
    };
    // wait for the headline to land, then show the box on "paper."
    setTimeout(() => {
      sel.classList.add("no-anim");
      place(0);
      sel.offsetWidth; // apply the start spot before turning motion back on
      sel.classList.remove("no-anim");
      sel.classList.add("is-ready");
      if (!reduce) setInterval(() => { on = (on + 1) % words.length; place(on); }, 2800);
    }, reduce ? 0 : 1500);
    document.fonts?.ready.then(() => sel.classList.contains("is-ready") && place(on));
    window.addEventListener("resize", () => { sel.classList.add("no-anim"); place(on); requestAnimationFrame(() => sel.classList.remove("no-anim")); });
  }

  /* ---------- Sneak peek gallery ----------
     Desktop: the section pins and the cards slide sideways as you scroll down.
     Phone / touch: the row is a normal swipe (CSS). */
  const peek = document.getElementById("materials");
  const track = document.getElementById("peekTrack");
  const rail = peek ? peek.querySelector(".peek__rail") : null;
  const peekBar = document.getElementById("peekBar");
  const pinMQ = window.matchMedia("(min-width: 901px) and (pointer: fine)");
  if (peek && track) {
    const cards = [...track.querySelectorAll(".pk")];
    let travel = 0;

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
    };

    let ticking = false;
    const onScrollPeek = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); } };
    window.addEventListener("scroll", onScrollPeek, { passive: true });
    rail.addEventListener("scroll", onScrollPeek, { passive: true });
    window.addEventListener("resize", layout);
    pinMQ.addEventListener("change", layout);
    layout();

    // each card plays its animation when most of it is on screen, and resets when it leaves.
    // A "live" event tells a card's own script (like the AAA flip) to start or stop.
    const setLive = (el, on) => {
      if (el.classList.contains("is-live") === on) return;
      el.classList.toggle("is-live", on);
      el.dispatchEvent(new CustomEvent("live", { detail: on }));
    };
    const live = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.intersectionRatio >= 0.7) setLive(e.target, true);
        else if (e.intersectionRatio < 0.15) setLive(e.target, false);
      });
    }, { threshold: [0, 0.15, 0.7] });
    cards.forEach((c) => live.observe(c));
  }

  /* AAA card: flips by itself while it is on screen. Front → back → front, on a loop. */
  const flip = document.getElementById("flip");
  const aaaCard = flip?.closest(".pk");
  if (flip && aaaCard && !reduce) {
    let timer = 0;
    const turn = () => {
      const toBack = !flip.classList.contains("is-flipped");
      flip.classList.toggle("is-flipped", toBack);
      flip.classList.toggle("is-turning", !toBack);
      timer = setTimeout(turn, toBack ? 4200 : 3400);
    };
    aaaCard.addEventListener("live", (e) => {
      clearTimeout(timer);
      if (e.detail) timer = setTimeout(turn, 1800);
      else flip.classList.remove("is-flipped", "is-turning");
    });
  }

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
