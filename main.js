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

  /* ---------- Get Blueprint ----------
     One product since Nov 11: Blueprint Online, ₱349 (four modules plus a 15-minute résumé review).
     Every "Get Blueprint" button opens the sign-up form. /api/register saves it (ticket "online"), sets the amount
     itself, and emails the link to their payment page (GCash QR + reference number). The team sees it in /admin.
     Deep links: /?get opens the form · ?from=booth picks "Booth" for "How did you hear about Blueprint?" */
  const qs = new URLSearchParams(location.search);
  const fromBooth = qs.get("from") === "booth";
  const modal = document.getElementById("modal");
  const form = document.getElementById("regForm");
  const done = document.getElementById("done");
  const regError = document.getElementById("regError");
  const heard = document.getElementById("f-heard");
  const orgField = document.getElementById("f-org-field");

  /* "Which org?" only shows when "Student org" is picked */
  const syncOrg = () => { orgField.hidden = heard.value !== "Student org"; };
  heard.addEventListener("change", syncOrg);

  /* Mobile: lenient. 10–13 digits, spaces, dashes, and a leading + are fine (0917 123 4567, +63 917 123 4567). */
  const mobile = document.getElementById("f-mobile");
  const checkMobile = () => {
    const v = mobile.value.trim(), digits = v.replace(/\D/g, "");
    mobile.setCustomValidity(/^\+?[\d\s-]+$/.test(v) && digits.length >= 10 && digits.length <= 13 ? "" : "Please use a valid mobile number.");
  };
  mobile.addEventListener("input", checkMobile);

  /* Buying it for someone else: their name and email, both or neither (the tick box shows the two boxes) */
  const gift = document.getElementById("f-gift");
  const giftFields = document.getElementById("giftFields");
  const giftName = document.getElementById("f-gift-name");
  const giftEmail = document.getElementById("f-gift-email");
  const syncGift = () => {
    giftFields.hidden = !gift.checked;
    [giftName, giftEmail].forEach((el) => { el.required = gift.checked; });
    if (gift.checked) setTimeout(() => giftName.focus(), 30);
  };
  gift.addEventListener("change", syncGift);
  const checkGift = () => {
    const mine = document.getElementById("f-email").value.trim().toLowerCase();
    giftEmail.setCustomValidity(gift.checked && giftEmail.value.trim().toLowerCase() === mine ? "Use their own email." : "");
  };

  const openModal = () => {
    form.hidden = false;
    done.hidden = true;
    form.reset();
    form.querySelectorAll(".is-invalid").forEach((f) => f.classList.remove("is-invalid"));
    regError.hidden = true;
    if (fromBooth) heard.value = "Booth";
    syncOrg();
    syncGift();
    modal.showModal();
    setTimeout(() => form.querySelector("input")?.focus(), 60);
  };
  document.querySelectorAll("[data-register]").forEach((b) => b.addEventListener("click", openModal));
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.closest("[data-close]")) modal.close();
  });
  if (qs.has("get")) openModal();

  /* "Blueprint is now online": a small note that pops up in the corner after a moment.
     Hidden while the form is open and once you reach the final "Build yours" section; ✕ keeps it closed for this visit. */
  const pop = document.getElementById("hoPop");
  if (pop) {
    let gone = false;
    try { gone = sessionStorage.getItem("bp_pop") === "x"; } catch {}
    const final = document.getElementById("register");
    let nearEnd = false;
    const sync = () => {
      const show = !gone && !modal.open && !nearEnd;
      if (show && pop.hidden) { pop.hidden = false; requestAnimationFrame(() => pop.classList.add("is-in")); }
      else if (!show && !pop.hidden) { pop.classList.remove("is-in"); setTimeout(() => { if (!pop.classList.contains("is-in")) pop.hidden = true; }, 320); }
    };
    if (final) new IntersectionObserver(([e]) => { nearEnd = e.isIntersecting; sync(); }, { threshold: 0.15 }).observe(final);
    pop.querySelector(".ho-pop__x").addEventListener("click", () => {
      gone = true;
      try { sessionStorage.setItem("bp_pop", "x"); } catch {}
      sync();
    });
    modal.addEventListener("close", () => setTimeout(sync, 400));
    pop.querySelector("[data-register]").addEventListener("click", sync);
    setTimeout(sync, reduce ? 300 : 1800);
    /* On phones it sits over the page, so it tucks itself away after a while (it doesn't come back on this visit) */
    if (window.matchMedia("(max-width: 640px)").matches) setTimeout(() => { gone = true; sync(); }, 14000);
  }

  const validate = () => {
    checkMobile();
    checkGift();
    let ok = true;
    form.querySelectorAll(".field:not(.field--optional)").forEach((f) => {
      if (f.closest("[hidden]")) return; // the gift boxes, when it isn't a gift
      const input = f.querySelector("input, select");
      const valid = input.checkValidity() && (input.type === "checkbox" || input.value.trim() !== "");
      f.classList.toggle("is-invalid", !valid);
      if (!valid) ok = false;
    });
    return ok;
  };
  form.addEventListener("input", (e) => {
    const f = e.target.closest(".field");
    if (f && f.classList.contains("is-invalid") && e.target.checkValidity()) f.classList.remove("is-invalid");
  });

  /* the date on privacy.html; saved with each sign-up so we know which notice they agreed to */
  const PRIVACY_VERSION = "2026-11-12";

  /* the server saves it and emails their payment link (api/register.js). A new sign-up gets the link back. */
  const saveRegistration = async (row) => {
    const res = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(`Registration failed (${res.status})`), { code: out.error });
    return out;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate()) { form.querySelector(".is-invalid input, .is-invalid select")?.focus(); return; }
    const data = Object.fromEntries(new FormData(form));
    const isGift = gift.checked;
    const row = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      course: data.course.trim(),
      year: data.year,
      mobile: data.mobile.trim(),
      heard_from: data.heard_from,
      heard_org: data.heard_from === "Student org" ? (data.heard_org || "").trim() : "",
      consent: true,
      privacy_version: PRIVACY_VERSION,
      website: data.website || "",
      ticket: "online",
      gift_name: isGift ? data.gift_name.trim() : "",
      gift_email: isGift ? data.gift_email.trim().toLowerCase() : "",
    };
    const btn = form.querySelector("[type=submit]");
    btn.classList.add("is-loading");
    btn.disabled = true;
    regError.hidden = true;

    let out;
    try {
      out = await saveRegistration(row);
    } catch (err) {
      console.error(err);
      regError.textContent = err.code === "closed"
        ? "Sales closed on Sunday, Nov 15 at 10 PM. Questions? Ask us with the form under the FAQ."
        : err.code === "busy"
        ? "Lots of people are signing up right now. Try again in a minute."
        : err.code === "invalid"
        ? "Something’s missing. Check each box and try again."
        : "Something went wrong. Please check your connection and try again.";
      regError.hidden = false;
      return;
    } finally {
      btn.classList.remove("is-loading");
      btn.disabled = false;
    }
    document.getElementById("regName").textContent = isGift ? `For ${row.gift_name}` : row.name;
    document.getElementById("regMeta").textContent = isGift ? `From ${row.name}` : `${row.course} · ${row.year}`;
    document.getElementById("regStatus").textContent = out.pay ? "Status · Registered, awaiting payment" : "Status · Signed up before";
    /* signed up before with this email: the server only re-sends the email, so point them there */
    const payNow = document.getElementById("payNow");
    payNow.hidden = !out.pay;
    if (out.pay) payNow.href = out.pay;
    document.getElementById("stepAccess").innerHTML = isGift
      ? `<b>We email the access link to ${row.gift_name.replace(/[&<>"']/g, "")}</b> within 1 hour (8 AM to 10 PM).`
      : "<b>Get your access link by email</b> within 1 hour (8 AM to 10 PM).";
    document.getElementById("doneTitle").textContent = out.pay ? "Almost there." : "You’ve signed up before.";
    document.getElementById("doneText").textContent = out.pay
      ? "Three steps:"
      : `We emailed your payment link again to ${row.email}. Open it, then:`;
    document.getElementById("doneFine").textContent = out.pay
      ? "We also emailed you this link, so you can pay later. Can’t find the email? Check spam, or fill in the form again with the same email and we’ll resend it."
      : "Not in your inbox? Check spam. We resend it at most every 10 minutes, so wait a bit before trying again. Already paid? Your access link comes by email within 1 hour (8 AM to 10 PM).";
    form.hidden = true;
    done.hidden = false;
  });
  /* ---------- Ask us (under the FAQ) ----------
     Saved for the team's Questions page in /admin (api/ask.js). They answer by email. */
  const askForm = document.getElementById("askForm");
  const askDone = document.getElementById("askDone");
  const askError = document.getElementById("askError");
  const askCheck = () => {
    let ok = true;
    askForm.querySelectorAll(".field").forEach((f) => {
      const input = f.querySelector("input, textarea");
      const valid = input.checkValidity() && input.value.trim().length >= (input.minLength > 0 ? input.minLength : 1);
      f.classList.toggle("is-invalid", !valid);
      if (!valid) ok = false;
    });
    return ok;
  };
  askForm.addEventListener("input", (e) => {
    const f = e.target.closest(".field");
    if (f?.classList.contains("is-invalid") && e.target.checkValidity()) f.classList.remove("is-invalid");
  });
  askForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!askCheck()) { askForm.querySelector(".is-invalid input, .is-invalid textarea")?.focus(); return; }
    const data = Object.fromEntries(new FormData(askForm));
    const btn = askForm.querySelector("[type=submit]");
    btn.classList.add("is-loading");
    btn.disabled = true;
    askError.hidden = true;
    try {
      const res = await fetch("/api/ask", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name.trim(), email: data.email.trim().toLowerCase(), message: data.message.trim(), privacy_version: PRIVACY_VERSION, website: data.website || "" }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(`ask ${res.status}`), { code: out.error });
      document.getElementById("askDoneText").textContent = `We’ll email you at ${data.email.trim().toLowerCase()}, usually within 2 days. Check spam if you don’t see it.`;
      askForm.hidden = true;
      askDone.hidden = false;
      askForm.reset();
    } catch (err) {
      askError.textContent = err.code === "busy"
        ? "We got a lot of questions from you today. We’ll answer those first, so please wait for our email."
        : "Something went wrong. Please check your connection and try again.";
      askError.hidden = false;
    } finally {
      btn.classList.remove("is-loading");
      btn.disabled = false;
    }
  });
  document.getElementById("askAgain").addEventListener("click", () => { askDone.hidden = true; askForm.hidden = false; askForm.querySelector("textarea").focus(); });
})();
