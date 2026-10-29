/* /pay?t=...: their private payment page (the link is in the sign-up email).
   Shows our GCash QR, then they upload a screenshot of the receipt (api/pay.js saves it). */
(() => {
  const $ = (id) => document.getElementById(id);
  const form = $("payForm"), err = $("payError"), file = $("f-proof");
  const t = new URLSearchParams(location.search).get("t") || "";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const peso = (n) => `₱${Number(n).toLocaleString("en-PH")}`;
  const when = (iso) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  let image = "";

  const done = (title, text) => {
    $("loading").hidden = form.hidden = true;
    $("doneTitle").textContent = title;
    if (text) $("doneText").textContent = text;
    $("payDone").hidden = false;
  };
  const MSG = {
    nomatch: "This payment link doesn’t work. Open the button in your Blueprint sign-up email (check spam too). Lost it? Register again with the same email and we’ll resend it.",
    cancelled: "This sign-up was cancelled. Ask us on the site (ateneoblueprint.vercel.app/#ask) and we’ll sort it out.",
    image: "That file didn’t work. Try a screenshot (PNG or JPG) of your GCash receipt.",
    big: "That image is too big. Try a plain screenshot instead.",
  };

  /* ---------- load their page ---------- */
  (async () => {
    if (!t) return done("Use the link in your email.", MSG.nomatch);
    try {
      const res = await fetch(`/api/pay?t=${encodeURIComponent(t)}`);
      const p = await res.json().catch(() => ({}));
      if (!res.ok) return done("Use the link in your email.", MSG[p.error] || "Something went wrong. Please refresh the page.");
      if (p.status === "paid") return done(`You’re in, ${p.name}.`, "Your slot is confirmed. Check your email for the schedule and pre-work.");
      if (p.status === "waitlist") return done(`You’re on the waitlist, ${p.name}.`, "All slots were taken before your payment came in. We’ll email you if one opens up, or refund you.");
      if (p.status === "cancelled") return done("This sign-up was cancelled.", MSG.cancelled);

      $("hello").innerHTML = `Hi ${esc(p.name)}! Your sign-up number is <span class="code">${esc(p.code)}</span>.`;
      $("amount").textContent = peso(p.price);
      $("payTo").textContent = [p.gcashName && `to ${p.gcashName}`, p.gcashNumber].filter(Boolean).join(" · ");
      if (p.qr) { $("qrImg").src = $("saveQr").href = p.qr; $("qrImg").hidden = $("saveQr").hidden = false; }
      else $("qrHelp").textContent = "Our GCash QR isn’t up yet. Please check back in a bit, or ask us on the site.";
      if (p.proofAt) sentNote(p.proofAt);
      $("loading").hidden = true;
      form.hidden = false;
    } catch {
      done("Couldn’t load.", "Please check your connection and refresh the page.");
    }
  })();

  function sentNote(at) {
    $("sent").innerHTML = `We got your receipt (${when(at)}). We’ll email your slot confirmation within 24 hours. Wrong screenshot? Upload a new one below.`;
    $("sent").hidden = false;
  }

  /* ---------- pick a screenshot: shrink it to a small JPEG (also drops the photo's hidden details) ---------- */
  const shrink = (f) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      const k = Math.min(1, 1800 / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(im.naturalWidth * k);
      c.height = Math.round(im.naturalHeight * k);
      const g = c.getContext("2d");
      g.fillStyle = "#fff";
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    im.src = url;
  });

  file.addEventListener("change", async () => {
    const f = file.files[0];
    err.hidden = true;
    if (!f) return;
    try {
      image = await shrink(f);
      $("preview").src = image;
      $("preview").hidden = false;
      $("dropText").innerHTML = "<small>Tap to choose a different one</small>";
    } catch {
      image = "";
      err.textContent = MSG.image;
      err.hidden = false;
    }
  });

  /* ---------- send it ---------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!image) { err.textContent = "Choose a screenshot of your GCash receipt first."; err.hidden = false; return; }
    const btn = form.querySelector("[type=submit]");
    btn.classList.add("is-loading");
    btn.disabled = true;
    err.hidden = true;
    try {
      const res = await fetch("/api/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t, image }) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(MSG[out.error] || "Something went wrong. Please check your connection and try again.");
      if (out.status === "paid") return done(`You’re already in, ${out.name}.`, "Your slot is confirmed. Check your email for the schedule and pre-work.");
      done(`Got it, ${out.name}.`);
    } catch (x) {
      err.textContent = x.message;
      err.hidden = false;
    } finally {
      btn.classList.remove("is-loading");
      btn.disabled = false;
    }
  });
})();
