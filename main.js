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

  /* ---------- Tickets ----------
     Session 1 free (from Nov 10), Single Session for Sessions 2 to 4 with a session picker, Full Pass, or Barkada
     (three Full Passes, one payer). Every Register button scrolls to the tickets; a ticket button opens the sign-up form.
     The server works out the amount again (api/_lib.js PRICE). Pilot prices from Nov 7.
     Each session has a data-start time: once it starts, it can't be picked anymore (the server checks too). */
  const PRICE = { full: 799, single: 299, barkada: 1999 };
  const ALL = [1, 2, 3, 4];
  const peso = (n) => `₱${n.toLocaleString("en-PH")}`;
  const tickets = document.getElementById("tickets");
  const picker = document.getElementById("pickSessions");
  const boxes = [...picker.querySelectorAll("input")];
  const singleBtn = document.getElementById("singleBtn");
  const upsell = document.getElementById("upsell");
  const freeCard = document.getElementById("freeCard");
  const picked = () => boxes.filter((b) => b.checked).map((b) => Number(b.value));
  const box = (n) => boxes.find((b) => Number(b.value) === n);
  const titleOf = (n) => (n === 1 ? "Sino Ka?" : box(n).closest(".slot").querySelector(".slot__t").firstChild.textContent.trim());
  const dateOf = (n) => (n === 1 ? "Tue, Nov 10" : box(n).closest(".slot").querySelector("small").textContent.split(" · ")[0]);
  const started = (el) => Date.now() >= Date.parse(el.dataset.start);
  let ticket = { ticket: "free", sessions: [1] };

  /* sessions that already started: greyed out, can't be picked */
  boxes.forEach((b) => {
    const slot = b.closest(".slot");
    if (!started(slot)) return;
    b.disabled = true; b.checked = false;
    slot.classList.add("is-past");
    slot.querySelector("small").textContent += " · Started";
  });

  /* Session 1 is free until it starts: the pop-up on every visit, the bar at the bottom, the free card, the hero button */
  const freeOpen = !started(freeCard);
  document.documentElement.classList.toggle("free-open", freeOpen);
  freeCard.hidden = !freeOpen;

  const syncSingle = () => {
    const s = picked(), n = s.length, cost = n * PRICE.single, diff = PRICE.full - cost;
    picker.classList.remove("is-invalid");
    singleBtn.textContent = n === 0 ? "Pick your sessions"
      : n === boxes.length ? `Get the Full Pass · ${peso(PRICE.full)}`
      : n === 1 ? `Get Session ${s[0]} · ${peso(cost)}`
      : `Get ${n} sessions · ${peso(cost)}`;
    singleBtn.classList.toggle("btn--primary", n > 0);
    singleBtn.classList.toggle("btn--ghost", n === 0);
    /* any singles: show how close the Full Pass is (₱500 more after one, ₱201 after two, cheaper with all three) */
    upsell.hidden = n < 1;
    upsell.innerHTML = n === boxes.length ? `That’s all three, so it’s the Full Pass: <b>${peso(-diff)} less</b>, and every session.`
      : n >= 1 ? `Every session for <b>${peso(Math.abs(diff))} ${diff > 0 ? "more" : "less"}</b>. <button class="tix__switch" type="button" data-ticket="full">Get the Full Pass</button>`
      : "";
  };
  picker.addEventListener("change", syncSingle);
  syncSingle();

  const scrollToTickets = () => tickets.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  document.querySelectorAll("[data-register]").forEach((b) => b.addEventListener("click", scrollToTickets));

  /* ---------- Registration modal ----------
     Sends the sign-up to /api/register, which emails the link to their payment page (it has the GCash QR). The team sees it in /admin. */
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

  /* "Session 2: Proof on Paper" / "Sessions 2 and 3" */
  const sessionsLabel = (s) => (s.length === 1 ? `Session ${s[0]}: ${titleOf(s[0])}` : `Sessions ${s.slice(0, -1).join(", ")} and ${s.at(-1)}`);
  const amountOf = (t) => (t.ticket === "free" ? 0 : t.ticket === "single" ? t.sessions.length * PRICE.single : PRICE[t.ticket]);
  const crew = document.getElementById("crewFields");
  const paintTicket = () => {
    const full = ticket.ticket === "full", s = ticket.sessions, barkada = ticket.ticket === "barkada", free = ticket.ticket === "free";
    document.getElementById("mineName").textContent = free ? "Session 1 · Free" : barkada ? "Barkada" : full ? "Full Pass" : s.length === 1 ? "Single Session" : `${s.length} single sessions`;
    document.getElementById("mineMeta").textContent = barkada ? "Three Full Passes: you and two friends, Nov 10 to 13"
      : full ? "All four sessions, Nov 10 to 13"
      : s.map((n) => `Session ${n}: ${titleOf(n)}, ${dateOf(n)}`).join("\n");
    crew.hidden = !barkada;
    document.getElementById("minePrice").textContent = free ? "Free" : peso(amountOf(ticket));
    document.getElementById("regSub").textContent = free
      ? "It takes a minute. No payment: your seat is saved right away."
      : "It takes a minute. Then pay by GCash and upload your receipt to lock your slot.";
    document.getElementById("regFine").textContent = free
      ? "Free. No GCash, no receipt."
      : `No payment yet. Right after this form, you pay ${peso(amountOf(ticket))} by GCash.`;
  };
  document.getElementById("mineChange").addEventListener("click", () => { modal.close(); scrollToTickets(); });
  document.getElementById("getRest").addEventListener("click", () => { modal.close(); scrollToTickets(); });

  const openModal = () => {
    paintTicket();
    form.hidden = false;
    done.hidden = true;
    form.reset();
    form.querySelectorAll(".is-invalid").forEach((f) => f.classList.remove("is-invalid"));
    regError.hidden = true;
    syncOrg();
    modal.showModal();
    setTimeout(() => form.querySelector("input")?.focus(), 60);
  };
  /* ticket buttons anywhere on the page: the cards, the hero, the pop-up, the bar */
  const freePop = document.getElementById("freePop");
  const freeBar = document.getElementById("freeBar");
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ticket]");
    if (!b) return;
    if (b.dataset.ticket === "free") {
      if (!freeOpen) { scrollToTickets(); return; }
      if (freePop.open) freePop.close();
      ticket = { ticket: "free", sessions: [1] };
      openModal();
      return;
    }
    const s = picked();
    if (b.dataset.ticket === "single" && !s.length) {
      picker.classList.add("is-invalid");
      boxes.find((x) => !x.disabled)?.focus();
      return;
    }
    ticket = b.dataset.ticket === "barkada" ? { ticket: "barkada", sessions: ALL }
      : b.dataset.ticket === "full" || s.length === boxes.length ? { ticket: "full", sessions: ALL } : { ticket: "single", sessions: s };
    openModal();
  });
  [modal, freePop].forEach((m) => m.addEventListener("click", (e) => {
    if (e.target === m || e.target.closest("[data-close]")) m.close();
  }));
  /* after the pop-up closes, the bar at the bottom keeps saying it */
  freePop.addEventListener("close", () => { freeBar.hidden = !freeOpen; });

  if (freeOpen) {
    const manila = (d) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
    const today = manila(new Date(freeCard.dataset.start)) === manila(new Date());
    document.getElementById("freeWhen").textContent = today ? "Today · Tue, Nov 10" : "Tue, Nov 10";
    document.getElementById("freeBarWhen").textContent = today ? "Today, 5:30 PM" : "Tue, Nov 10, 5:30 PM";
    /* ?free=1 (the link in our emails) opens the free sign-up form; everyone else gets the pop-up */
    if (new URLSearchParams(location.search).has("free")) { ticket = { ticket: "free", sessions: [1] }; openModal(); freeBar.hidden = false; }
    else setTimeout(() => { if (!modal.open) freePop.showModal(); else freeBar.hidden = false; }, reduce ? 0 : 900);
  }

  /* Barkada: both friends need a name and their own email (not the payer's, not each other's) */
  const friendEmails = ["f-f1-email", "f-f2-email"].map((id) => document.getElementById(id));
  const checkFriends = () => {
    const mine = document.getElementById("f-email").value.trim().toLowerCase();
    friendEmails.forEach((el, i) => {
      const v = el.value.trim().toLowerCase(), taken = [mine, ...(i ? [friendEmails[0].value.trim().toLowerCase()] : [])];
      el.setCustomValidity(v && taken.includes(v) ? "Use their own email." : "");
    });
  };
  const validate = () => {
    checkMobile();
    checkFriends();
    crew.querySelectorAll("input").forEach((el) => { el.required = !crew.hidden; });
    let ok = true;
    form.querySelectorAll(".field:not(.field--optional)").forEach((f) => {
      if (f.closest("[hidden]")) return; // the Barkada's friends, when it isn't a Barkada
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

  /* the date on privacy.html; saved with each sign-up so we know which notice they agreed to */
  const PRIVACY_VERSION = "2026-11-07";

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
      ticket: ticket.ticket,
      sessions: ticket.sessions,
      ...(ticket.ticket === "barkada" ? { friends: [1, 2].map((n) => ({ name: data[`f${n}_name`].trim(), email: data[`f${n}_email`].trim().toLowerCase() })) } : {}),
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
        ? "That session has started, so sign-ups for it are closed. Pick another one."
        : err.code === "free_not_ready"
        ? "Online sign-up for the free session isn’t ready yet. Just come: FA Annex 104, 5:30 PM."
        : "Something went wrong. Please check your connection and try again.";
      regError.hidden = false;
      return;
    } finally {
      btn.classList.remove("is-loading");
      btn.disabled = false;
    }
    document.getElementById("regName").textContent = row.name;
    document.getElementById("regMeta").textContent = `${row.course} · ${row.year}`;
    /* free Session 1: nothing to pay, so no steps. The next thing to sell is Sessions 2 to 4. */
    const free = ticket.ticket === "free", wait = out.status === "waitlist";
    document.getElementById("nextSteps").hidden = free;
    document.getElementById("getRest").hidden = !free;
    document.getElementById("regStatus").textContent = !free ? "Status · Registered, awaiting payment"
      : out.again ? "Status · Signed up before" : wait ? "Status · Next in line" : "Status · Seat saved · Free";
    /* signed up before with this email: the server only re-sends the email, so point them there */
    const payNow = document.getElementById("payNow");
    payNow.hidden = !out.pay;
    if (out.pay) payNow.href = out.pay;
    /* a new sign-up: the amount the server saved. Signed up before: their first ticket stands (it's on their payment page) */
    document.getElementById("regTicket").textContent = `Blueprint · ${free ? "Session 1 · Free" : out.pay ? (ticket.ticket === "barkada" ? "Barkada of 3" : ticket.ticket === "full" ? "Full Pass" : sessionsLabel(ticket.sessions).replace(/:.*/, "")) : "Sign-up"}`;
    document.getElementById("stepPay").innerHTML = out.pay
      ? `<b>Pay ${peso(out.amount || amountOf(ticket))} by GCash</b> using the QR on your payment page.`
      : "<b>Pay by GCash</b> using the QR on your payment page. It shows your ticket and amount.";
    document.getElementById("doneTitle").textContent = free
      ? out.has1 ? "You already have Session 1." : out.again ? "You’ve signed up before." : wait ? "Session 1 is full." : "You’re in. It’s free."
      : out.pay ? "You’re on the list." : "You’ve signed up before.";
    document.getElementById("doneText").textContent = free
      ? out.has1 ? "It’s part of the ticket you signed up for. See you there!"
        : out.again ? `We emailed your Session 1 details again to ${row.email}.`
        : wait ? "Come anyway: if someone doesn’t show up, their seat is yours. We emailed you the details."
        : `Your seat in Session 1 is saved. We emailed you the details. Liked it? Sessions 2 to 4 are ${peso(PRICE.single)} each.`
      : out.pay
      ? "Your slot isn’t locked until you pay. Three steps:"
      : `We emailed your payment link again to ${row.email}. Open it, then:`;
    document.getElementById("doneFine").textContent = free
      ? "Can’t find the email? Check spam. Questions? Ask us with the form under the FAQ."
      : out.pay
      ? "We also emailed you this link, so you can pay later. Can’t find the email? Check spam, or register again with the same email and we’ll resend it."
      : "Not in your inbox? Check spam. We resend it at most every 10 minutes, so wait a bit before trying again. Still nothing, or want to switch tickets? Ask us with the form under the FAQ.";
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
