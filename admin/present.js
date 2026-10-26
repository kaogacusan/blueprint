/* Blueprint slide player.
   The deck (HTML + images) is stored in Supabase and only loads for signed-in team members.

   Deck format — any number of <section class="slide"> elements:
     data-label="02. WHO’S THAT FACI?"  top-right label
     data-timer="20"                    block timer in minutes (press T)
   Inside a slide:
     data-a="up|down|left|right|fade|scale|pop|blur|draw|grow|wipe|flip"  entrance animation
     style="--d:300"                    delay in ms
     data-step="1"                      hidden until the presenter clicks (1, 2, …)
     data-count="10"                    number counts up when it appears
   Images: write src="asset:photo.jpg" or url(asset:bg.jpg). They become signed links to the private bucket. */
import { supa } from "/admin/supa.js";

const $ = (s) => document.querySelector(s);
const stage = $("#stage");
const slidesEl = $("#slides");
const hud = $("#hud");
const loading = $("#loading");

const fail = (msg) => { $("#loadingText").textContent = msg; loading.classList.add("is-error"); };

/* ---------- fit the 1920×1080 stage to the window ---------- */
const fit = () => {
  const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  stage.style.setProperty("--s", s.toFixed(4));
};
window.addEventListener("resize", fit);
fit();

/* ---------- load ---------- */
const slug = new URLSearchParams(location.search).get("d") || location.pathname.split("/").filter(Boolean)[1] || "";

async function load() {
  const { data: { session } } = await supa.auth.getSession();
  if (!session) {
    location.replace(`/admin/?next=${encodeURIComponent(location.pathname + location.search)}`);
    return;
  }
  const { data: deck, error } = await supa.from("decks").select("*").eq("slug", slug).maybeSingle();
  if (error || !deck) return fail(error ? "Couldn’t load this deck." : "This deck doesn’t exist, or your account can’t see it.");
  document.title = `${deck.title} · Blueprint`;

  // swap asset:name for signed links to the private bucket
  let html = deck.html;
  const names = [...new Set([...html.matchAll(/asset:([\w./-]+)/g)].map((m) => m[1]))];
  if (names.length) {
    const { data: signed, error: sErr } = await supa.storage.from("decks").createSignedUrls(names.map((n) => `${slug}/${n}`), 60 * 60 * 12);
    if (sErr) return fail("Couldn’t load the slide images.");
    const map = new Map(signed.map((s, i) => [names[i], s.signedUrl]));
    html = html.replace(/asset:([\w./-]+)/g, (_, n) => map.get(n) || "");
    // wait for images so nothing pops in mid-animation (max 10s)
    await Promise.race([
      Promise.all(signed.map((s) => new Promise((r) => { const im = new Image(); im.onload = im.onerror = r; im.src = s.signedUrl; }))),
      new Promise((r) => setTimeout(r, 10000)),
    ]);
  }
  slidesEl.innerHTML = html;
  await document.fonts?.ready;
  init();
  loading.classList.add("is-done");
}

/* ---------- player ---------- */
let slides = [];
let idx = 0;
let step = 0;
const leaveTimers = new Map();

function init() {
  slides = [...slidesEl.querySelectorAll(".slide")];
  slides.forEach((sl) => {
    sl._anims = [...sl.querySelectorAll("[data-a]")];
    sl._anims.forEach((el) => {
      // an element shows at the highest data-step of itself and its parents
      let st = 0;
      for (let n = el; n && n !== sl; n = n.parentElement) if (n.dataset.step) st = Math.max(st, +n.dataset.step);
      el._step = st;
    });
    sl._steps = Math.max(0, ...sl._anims.map((el) => el._step));
  });
  const fromHash = parseInt(location.hash.slice(1), 10);
  go(Number.isFinite(fromHash) ? fromHash - 1 : 0, 0);
}

function countUp(el) {
  const to = parseFloat(el.dataset.count);
  const delay = parseFloat(getComputedStyle(el).getPropertyValue("--d")) || 0;
  const t0 = performance.now() + delay;
  const dur = 900;
  el.textContent = "0";
  const tick = (now) => {
    const p = Math.min(1, Math.max(0, (now - t0) / dur));
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1 && el.classList.contains("on")) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function paint(sl, at) {
  sl.dataset.at = at;
  sl._anims.forEach((el) => {
    const show = el._step <= at;
    if (show && !el.classList.contains("on")) {
      el.classList.add("on");
      if (el.dataset.count) countUp(el);
    } else if (!show) el.classList.remove("on");
  });
}

function reset(sl) {
  sl.classList.add("no-anim");
  sl._anims.forEach((el) => el.classList.remove("on"));
  sl.dataset.at = 0;
  sl.offsetWidth; // apply the reset before turning motion back on
  sl.classList.remove("no-anim");
}

function go(i, s) {
  i = Math.max(0, Math.min(slides.length - 1, i));
  const changed = i !== idx || !slides[i].classList.contains("is-cur");
  if (changed) {
    const old = slides[idx];
    slides.forEach((sl, k) => {
      sl.classList.toggle("is-cur", k === i);
      sl.classList.toggle("is-past", k < i);
    });
    // reset the slide we left once it has faded out
    if (old && old !== slides[i]) {
      clearTimeout(leaveTimers.get(old));
      leaveTimers.set(old, setTimeout(() => { if (!old.classList.contains("is-cur")) reset(old); }, 800));
    }
    clearTimeout(leaveTimers.get(slides[i]));
    idx = i;
    setTimer(slides[i].dataset.timer);
    const label = $("#label");
    label.classList.remove("is-in");
    label.offsetWidth;
    label.innerHTML = (slides[i].dataset.label || "").replace(/\|/g, "<br>");
    label.classList.add("is-in");
  }
  step = Math.max(0, Math.min(slides[i]._steps, s));
  paint(slides[i], step);
  $("#count").textContent = `${idx + 1} / ${slides.length}`;
  $("#prog").style.transform = `scaleX(${(idx + 1) / slides.length})`;
  history.replaceState(null, "", `#${idx + 1}`);
}

const next = () => (step < slides[idx]._steps ? go(idx, step + 1) : idx < slides.length - 1 && go(idx + 1, 0));
const prev = () => (step > 0 ? go(idx, step - 1) : idx > 0 && go(idx - 1, slides[idx - 1]._steps));

/* ---------- block timer ---------- */
const timerEl = $("#timer");
const timerText = $("#timerText");
let tLeft = 0, tTotal = 0, tRun = false, tLast = 0, tRaf = 0;
const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
function setTimer(min) {
  cancelAnimationFrame(tRaf);
  tRun = false;
  tTotal = tLeft = (parseFloat(min) || 0) * 60;
  timerEl.hidden = !tTotal;
  $("#timerBtn").hidden = !tTotal;
  timerEl.className = "timer";
  timerText.textContent = fmt(tLeft);
}
function chime() {
  try {
    const ac = new AudioContext();
    [880, 1320].forEach((f, k) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = f; o.type = "sine";
      g.gain.setValueAtTime(0.0001, ac.currentTime + k * 0.18);
      g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + k * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + k * 0.18 + 1.2);
      o.connect(g).connect(ac.destination);
      o.start(ac.currentTime + k * 0.18); o.stop(ac.currentTime + k * 0.18 + 1.3);
    });
  } catch {}
}
function tick(now) {
  if (!tRun) return;
  tLeft = Math.max(0, tLeft - (now - tLast) / 1000);
  tLast = now;
  timerText.textContent = fmt(Math.ceil(tLeft));
  timerEl.classList.toggle("is-low", tLeft <= 60);
  if (tLeft <= 0) { tRun = false; timerEl.classList.add("is-done"); timerText.textContent = "Time!"; chime(); return; }
  tRaf = requestAnimationFrame(tick);
}
function toggleTimer() {
  if (!tTotal) return;
  if (tLeft <= 0) setTimer(tTotal / 60);
  tRun = !tRun;
  timerEl.classList.toggle("is-run", tRun);
  if (tRun) { tLast = performance.now(); tRaf = requestAnimationFrame(tick); }
}

/* ---------- input ---------- */
const help = $("#help");
const blackout = $("#blackout");
const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());

document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (!help.hidden) { help.hidden = true; e.preventDefault(); return; }
  const k = e.key;
  if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter", "n"].includes(k)) { e.preventDefault(); blackout.hidden = true; next(); }
  else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace", "p"].includes(k)) { e.preventDefault(); blackout.hidden = true; prev(); }
  else if (k === "Home") go(0, 0);
  else if (k === "End") go(slides.length - 1, 0);
  else if (k === "f" || k === "F") fullscreen();
  else if (k === "t" || k === "T") toggleTimer();
  else if (k === "r" || k === "R") setTimer(tTotal / 60);
  else if (k === "b" || k === "B" || k === ".") blackout.hidden = !blackout.hidden;
  else if (k === "?") help.hidden = false;
});

$("#vp").addEventListener("click", (e) => {
  if (e.target.closest("a, button")) return;
  blackout.hidden = true;
  e.clientX < window.innerWidth * 0.2 ? prev() : next();
});
$("#prev").addEventListener("click", prev);
$("#next").addEventListener("click", next);
$("#fs").addEventListener("click", fullscreen);
$("#timerBtn").addEventListener("click", toggleTimer);
$("#helpBtn").addEventListener("click", () => (help.hidden = false));
help.addEventListener("click", () => (help.hidden = true));

let touchX = 0;
document.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
document.addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
});

// controls show while the mouse moves, then fade away
let hudTimer = 0;
const wake = () => {
  hud.classList.add("is-on");
  document.body.classList.remove("is-idle");
  clearTimeout(hudTimer);
  hudTimer = setTimeout(() => { hud.classList.remove("is-on"); document.body.classList.add("is-idle"); }, 2200);
};
document.addEventListener("mousemove", wake);
wake();

load().catch((e) => { console.error(e); fail("Something went wrong loading this deck."); });
