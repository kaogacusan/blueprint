/* Slack Patrol: a private joke channel between Keira and Renz. Nobody else sees any of it;
   the database only lets those two send, read or receive (supabase/migrations/006_slack_patrol.sql).

   Report the other one → their screen goes full "code blue" with a siren until they press "I'm on it".
   Once you've reported them (last 24 hours) the troll buttons unlock:
     Shame        words fly across their screen, with the bell. Click as much as you like.
     The General  Keira only: stamps the photo all over Renz's screen (private "pranks" bucket, not in the repo)
     Fake crash   their workspace "crashes" and "sends their tasks to the group chat". Then: jk.
   If they're offline, it all plays the next time they open the workspace (up to 3 days later).
   Sounds are made in the browser (Web Audio), so there are no sound files. */
import { supa } from "/admin/supa.js";
import { S, onChange, tasksFor, isDone, isLate, personOf } from "/admin/store.js";
import { $, esc, icon, avatar, todayISO, daysBetween, toast } from "/admin/lib.js";

const PAIR = ["Keira", "Renz"];
const GENERAL_FROM = "Keira"; // only Keira gets the photo
export const inPatrol = () => PAIR.includes(S.me?.name);
const them = () => PAIR.find((n) => n !== S.me.name);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const clock = (iso) => new Date(iso).toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });
const daysWord = (n) => (n === 1 ? "day" : "days");

/* ---------- sound (browsers only allow it after the first click or key press on the page) ---------- */
let ac = null, out = null;
function audio() {
  ac ||= new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === "suspended") ac.resume();
  if (!out) {
    out = ac.createGain();
    out.gain.value = 0.9;
    out.connect(ac.createDynamicsCompressor()).connect(ac.destination);
  }
  return ac;
}
function tone({ type = "sine", f = 440, to = 0, at = 0, dur = 0.2, vol = 0.1, attack = 0.005, filter = 0 }) {
  const a = audio(), t = a.currentTime + at;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (filter) { node = a.createBiquadFilter(); node.frequency.value = filter; o.connect(node); }
  node.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}
function noise({ at = 0, dur = 0.2, vol = 0.08, f = 1200, q = 0.8 }) {
  const a = audio(), t = a.currentTime + at;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf;
  bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(out);
  src.start(t);
}
const SFX = {
  siren(cycles = 4) { // hi-lo, like an ambulance
    for (let i = 0; i < cycles * 2; i++) {
      const hi = i % 2 === 0;
      tone({ type: "sawtooth", f: hi ? 960 : 720, at: i * 0.42, dur: 0.4, vol: 0.07, attack: 0.02, filter: 2400 });
      tone({ type: "square", f: hi ? 480 : 360, at: i * 0.42, dur: 0.4, vol: 0.025, attack: 0.02, filter: 1200 });
    }
  },
  blip() { tone({ type: "square", f: rand(1500, 2100), dur: 0.03, vol: 0.022 }); },
  bell(vol = 0.16) { // the "shame" bell: a low church bell with a long tail
    [[1, 1], [2, 0.6], [2.76, 0.45], [5.4, 0.25], [8.93, 0.12]].forEach(([m, v]) => tone({ f: 196 * m, dur: 2.6 / Math.sqrt(m), vol: vol * v, attack: 0.003 }));
  },
  thud() { tone({ f: 150, to: 38, dur: 0.28, vol: 0.3, attack: 0.002 }); noise({ dur: 0.08, vol: 0.1, f: 900 }); },
  bugle() { // a few notes of reveille
    [[392, 0], [523, 0.16], [659, 0.32], [523, 0.48], [392, 0.64], [523, 0.8], [659, 0.96]].forEach(([f, at]) => tone({ type: "sawtooth", f, at, dur: 0.14, vol: 0.06, attack: 0.02, filter: 2200 }));
    tone({ type: "sawtooth", f: 784, at: 1.12, dur: 0.6, vol: 0.06, attack: 0.02, filter: 2200 });
  },
  buzzer() { tone({ type: "square", f: 110, dur: 0.5, vol: 0.08, filter: 900 }); tone({ type: "square", f: 116, dur: 0.5, vol: 0.06, filter: 900 }); },
  chime() { tone({ f: 880, dur: 0.35, vol: 0.09 }); tone({ f: 1318, at: 0.12, dur: 0.6, vol: 0.08 }); },
  launch() { tone({ type: "sawtooth", f: 180, to: 1400, dur: 0.35, vol: 0.05, filter: 3000 }); tone({ f: 1760, at: 0.3, dur: 0.25, vol: 0.05 }); },
  glitch() { for (let i = 0; i < 7; i++) noise({ at: i * 0.07 + rand(0, 0.03), dur: rand(0.02, 0.07), vol: 0.1, f: rand(300, 5000), q: 3 }); },
  powerDown() { tone({ type: "sawtooth", f: 900, to: 30, dur: 0.9, vol: 0.07, filter: 1800 }); },
};
const lastPlayed = {};
function play(name, { gap = 0, arg } = {}) {
  const now = performance.now();
  if (gap && now - (lastPlayed[name] || 0) < gap) return;
  lastPlayed[name] = now;
  try { SFX[name](arg); } catch { /* no audio yet: the page hasn't been clicked */ }
}

/* ---------- the evidence: their open and overdue tasks ---------- */
function evidence(name) {
  const open = tasksFor(name).filter((t) => !isDone(t));
  const late = open.filter(isLate).map((t) => ({ title: t.title, d: daysBetween(t.due, todayISO()) })).sort((a, b) => b.d - a.d);
  return { open: open.length, late: late.length, worst: late.slice(0, 3), days: Math.max(1, late[0]?.d || 0) };
}

/* ---------- data ---------- */
let log = []; // pokes between the two of us, newest first
async function loadLog() {
  const { data, error } = await supa.from("pokes").select("*").order("created_at", { ascending: false }).limit(120);
  if (error) throw error;
  log = data;
}
async function send(kind, payload = {}) {
  const { data, error } = await supa.from("pokes").insert({ to_name: them(), kind, payload }).select().single();
  if (error) throw error;
  log.unshift(data);
  return data;
}
const failed = (e) => toast(/slow_down/.test(e?.message) ? "Easy. Give it a few seconds." : "Couldn’t send. Try again.", "bad");
/* the troll buttons work for 24 hours after you report them */
const reported = () => log.find((p) => p.kind === "slacking" && p.from_name === S.me.name && Date.now() - Date.parse(p.created_at) < 864e5);

/* spam clicks are counted and sent together (one row per ~0.4 s), so you can click as fast as you like */
const buf = { shame: 0, general: 0 }, sent = { shame: 0, general: 0 };
let flushTimer = 0;
function spam(kind) {
  buf[kind]++;
  sent[kind]++;
  flushTimer ||= setTimeout(flush, 400);
}
async function flush() {
  flushTimer = 0;
  for (const kind of Object.keys(buf)) {
    const n = Math.min(buf[kind], 60);
    buf[kind] = 0;
    if (n) await send(kind, { n }).catch(failed);
  }
  paintLog();
}

/* their screen tells ours it saw the poke */
const seenIds = new Set();
let seenTimer = 0;
function markSeen(id) {
  seenIds.add(id);
  clearTimeout(seenTimer);
  seenTimer = setTimeout(() => {
    const ids = [...seenIds];
    seenIds.clear();
    supa.from("pokes").update({ seen_at: new Date().toISOString() }).in("id", ids).then(() => {});
  }, 600);
}

/* ---------- receiving ---------- */
let chain = Promise.resolve(); // full-screen takeovers play one at a time
const queue = (fn) => (chain = chain.then(fn).catch(console.error));

function receive(p) {
  if (p.to_name !== S.me.name || log.some((x) => x.id === p.id)) return;
  log.unshift(p);
  markSeen(p.id);
  const n = Number(p.payload?.n) || 1;
  if (p.kind === "slacking") queue(() => alarm(p));
  else if (p.kind === "crash") queue(() => crash(p));
  else if (p.kind === "shame") shame(p.from_name, n);
  else if (p.kind === "general") general(p.from_name, n);
  else if (p.kind === "reply") { play("chime"); toast(`${p.from_name}: ${p.payload?.text || ""}`); }
  paintLog();
}

/* opened the workspace after being reported? it all plays now */
function catchUp() {
  const missed = log.filter((p) => p.to_name === S.me.name && !p.seen_at && Date.now() - Date.parse(p.created_at) < 3 * 864e5).reverse();
  if (!missed.length) return;
  missed.forEach((p) => markSeen(p.id));
  const last = (k) => missed.filter((p) => p.kind === k).pop();
  const total = (k) => missed.filter((p) => p.kind === k).reduce((a, p) => a + (Number(p.payload?.n) || 1), 0);
  const from = them(), nShame = total("shame"), nGen = total("general");
  if (last("slacking")) queue(() => alarm(last("slacking")));
  if (last("crash")) queue(() => crash(last("crash")));
  if (nShame || nGen) queue(async () => {
    await sleep(300);
    const parts = [nShame && `shamed you ${nShame}×`, nGen && `sent the General ${nGen}×`].filter(Boolean).join(" and ");
    pill(`While you were away, ${from} ${parts}`, null, 6000);
    if (nShame) shame(from, Math.min(nShame, 14), { quietPill: true });
    if (nGen) general(from, Math.min(nGen, 10), { quietPill: true });
  });
  const reply = last("reply");
  if (reply) toast(`${reply.from_name}: ${reply.payload?.text || ""}`);
}

/* ---------- 1. the alarm (full screen, until they press "I'm on it") ---------- */
function alarm(p, { preview = false } = {}) {
  return new Promise((done) => {
    const pl = p.payload || {}, days = Math.max(1, Math.min(999, Number(pl.days) || 1));
    const target = p.to_name, from = p.from_name;
    const tape = `<span>Slack alert</span>${icon("alert")}<span>Code blue</span>${icon("alert")}`.repeat(10);
    const el = document.createElement("div");
    el.className = "alarm";
    el.setAttribute("role", "alertdialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "alarmH");
    el.innerHTML = `
      <div class="alarm__strobe"></div><div class="alarm__grid"></div><div class="alarm__scan"></div>
      <div class="alarm__tape"><div>${tape}</div></div>
      <section class="alarm__body">
        <p class="alarm__k"><i></i>Incident #${String(p.id).padStart(4, "0")} · filed by ${esc(from)} · ${clock(p.created_at)}${preview ? " · preview" : ""}</p>
        <h1 class="alarm__h" id="alarmH"><span>${esc(target)}</span> has been slacking for</h1>
        <p class="alarm__n"><b data-n>0</b><span>${daysWord(days)}</span></p>
        <pre class="alarm__log" data-log></pre>
        <div class="alarm__act">
          <button class="alarm__btn alarm__btn--go" data-ack disabled>I’m on it <small data-lock>3</small></button>
          <button class="alarm__btn" data-appeal>Appeal</button>
        </div>
      </section>
      <div class="alarm__tape alarm__tape--bot"><div>${tape}</div></div>`;
    document.body.append(el);
    document.body.classList.add("is-alarmed");

    // grab attention if they're on another tab
    const title = document.title;
    const blink = setInterval(() => { document.title = document.title.startsWith("⚠") ? title : `⚠ SLACK ALERT · ${target}`; }, 900);

    play("siren", { arg: 4 });
    let sirens = 1;
    const again = setInterval(() => { if (sirens++ < 3) play("siren", { arg: 3 }); }, 6500);

    // the number counts up, then the "report" types out
    const nEl = el.querySelector("[data-n]");
    const steps = Math.min(days, 24);
    (async () => {
      for (let i = 1; i <= steps; i++) { nEl.textContent = Math.round((days * i) / steps); play("blip"); await sleep(calm() ? 0 : 900 / steps); }
      const dots = (k, v) => `${k} ${".".repeat(Math.max(3, 30 - k.length - String(v).length))} ${v}`;
      const lines = [
        `> scanning task log for ${target.toUpperCase()} ... done`,
        `> ${dots("open tasks", pl.open ?? "?")}`,
        `> ${dots("overdue", pl.late ?? "?")}`,
        ...(pl.worst || []).slice(0, 2).map((w) => `> worst: “${String(w.title).slice(0, 48)}” (${w.d}d late)`),
        ...(pl.note ? [`> note from ${from.toUpperCase()}: “${String(pl.note).slice(0, 120)}”`] : []),
        `> verdict: SLACKING. report to your tasks immediately.`,
      ];
      await typeLines(el.querySelector("[data-log]"), lines);
    })();

    // "I'm on it" unlocks after 3 seconds, so nobody dismisses it by accident
    const ack = el.querySelector("[data-ack]"), lock = el.querySelector("[data-lock]");
    let left = 3;
    const tick = setInterval(() => {
      if (--left > 0) return (lock.textContent = left);
      clearInterval(tick);
      lock.remove();
      ack.disabled = false;
      ack.focus();
    }, 1000);

    const close = () => {
      [blink, again, tick].forEach(clearInterval);
      document.title = title;
      el.classList.add("is-out");
      document.body.classList.remove("is-alarmed");
      setTimeout(() => { el.remove(); done(); }, 350);
    };
    ack.addEventListener("click", () => {
      play("chime");
      if (!preview) send("reply", { re: p.id, text: "I’m on it." }).catch(() => {});
      close();
    });
    el.querySelector("[data-appeal]").addEventListener("click", (e) => {
      const b = e.currentTarget;
      play("buzzer");
      b.textContent = "Appeal denied";
      b.disabled = true;
      b.classList.add("is-denied");
      el.querySelector(".alarm__body").animate([{ transform: "translateX(0)" }, { transform: "translateX(-10px)" }, { transform: "translateX(8px)" }, { transform: "translateX(0)" }], { duration: 260 });
      if (!preview) send("reply", { re: p.id, text: "tried to appeal. Appeal denied." }).catch(() => {});
    });
  });
}
async function typeLines(pre, lines) {
  for (const line of lines) {
    const row = document.createElement("span");
    pre.append(row);
    if (calm()) { row.textContent = line + "\n"; continue; }
    for (let i = 0; i < line.length; i += 2) {
      row.textContent = line.slice(0, i + 2);
      if (i % 6 === 0) play("blip");
      await sleep(14);
    }
    row.textContent = line + "\n";
    await sleep(120);
  }
}

/* ---------- 2. shame: words fly across their screen ---------- */
const SHAME = ["Shame", "Shame", "Shame", "Shame!", "Slacker", "Lock in", "Do your tasks", "We saw that", "Not very Blueprint of you", "The tasks miss you", "Get to work", "Chat is this real", "Zero aura", "−1000 aura", "Touch your tasks", "Deadlines are real", "Open the Tasks tab"];
let fxEl = null;
function fx() {
  if (!fxEl?.isConnected) {
    fxEl = document.createElement("div");
    fxEl.className = "fx";
    fxEl.setAttribute("aria-hidden", "true");
    document.body.append(fxEl);
  }
  return fxEl;
}
function flashEdges() {
  const f = fx();
  f.classList.remove("is-flash");
  void f.offsetWidth;
  f.classList.add("is-flash");
}
function cap(selector, max) {
  const all = fx().querySelectorAll(selector);
  for (let i = 0; i < all.length - max; i++) all[i].remove();
}
function shame(from, n, { quietPill = false } = {}) {
  const ev = evidence(S.me.name);
  const extra = [ev.open && `${ev.open} open tasks`, ev.late && `${ev.late} overdue`, `${S.me.name} pls`].filter(Boolean);
  if (!quietPill) pill(`${from} is shaming you`, n);
  play("bell");
  flashEdges();
  for (let i = 0; i < n; i++) setTimeout(() => {
    const w = document.createElement("span");
    const tag = Math.random() < 0.18;
    w.className = `fx__w ${tag ? "fx__w--tag" : pick(["", "", "fx__w--cyan", "fx__w--ice"])}`;
    w.textContent = Math.random() < 0.15 ? pick(extra) : pick(SHAME);
    w.style.cssText = `--x:${rand(12, 88)}%;--y:${rand(14, 86)}%;--r:${rand(-14, 14)}deg;--s:${Math.round(innerWidth < 640 ? rand(26, 54) : rand(34, 104))}px`;
    fx().append(w);
    cap(".fx__w", 40);
    setTimeout(() => w.remove(), 2600);
    if (i) play("bell", { gap: 180, arg: 0.07 });
  }, i * 110);
}

/* ---------- 3. the General: Keira stamps the photo on Renz's screen ---------- */
let photo = null; // object URL of the private photo, fetched once
const photoUrl = () => (photo ||= supa.storage.from("pranks").download("general.jpg").then(({ data, error }) => {
  if (error) throw error;
  return URL.createObjectURL(data);
}).catch((e) => { photo = null; throw e; }));
const ORDERS = ["The General is watching", "Report for duty", "The General is disappointed", "Atten-tion!", "Dismissed? No.", "Tasks. Now."];
async function general(from, n, { quietPill = false } = {}) {
  let src;
  try { src = await photoUrl(); } catch { return; }
  if (!quietPill) pill(`${from} deployed the General`, n, 3500, "medal");
  play("bugle", { gap: 4000 });
  const app = $("#app");
  for (let i = 0; i < n; i++) setTimeout(() => {
    const g = document.createElement("figure");
    const small = innerWidth < 640;
    g.className = "fx__g";
    g.style.cssText = `--x:${rand(6, 94)}%;--y:${rand(10, 90)}%;--r:${rand(-18, 18)}deg;--w:${Math.round(small ? rand(110, 170) : rand(150, 270))}px`;
    g.innerHTML = `<img src="${src}" alt="" />${Math.random() < 0.4 ? `<figcaption>${esc(pick(ORDERS))}</figcaption>` : ""}`;
    fx().append(g);
    cap(".fx__g", 26);
    setTimeout(() => g.remove(), 6500);
    play("thud", { gap: 90 });
    if (!calm()) app?.animate([{ transform: "translate(0,0)" }, { transform: `translate(${rand(-5, 5)}px,${rand(-4, 4)}px)` }, { transform: "translate(0,0)" }], { duration: 140 });
  }, i * 170);
}

/* a small counter at the top while the spam is coming in */
let pillEl = null, pillTimer = 0, pillKey = "", pillN = 0;
function pill(text, n = null, ms = 3500, ic = "bell") {
  if (!pillEl?.isConnected) {
    pillEl = document.createElement("div");
    pillEl.className = "fx__pill";
    pillEl.setAttribute("role", "status");
    document.body.append(pillEl);
  }
  pillN = text === pillKey && n != null ? pillN + n : n || 0;
  pillKey = text;
  pillEl.innerHTML = `${icon(ic)}<span>${esc(text)}</span>${n != null ? `<b>×${pillN}</b>` : ""}`;
  pillEl.classList.add("is-on");
  clearTimeout(pillTimer);
  pillTimer = setTimeout(() => { pillEl.classList.remove("is-on"); pillKey = ""; }, ms);
}

/* ---------- 4. fake crash ---------- */
function crash(p) {
  return new Promise(async (done) => {
    const me = S.me.name, ev = evidence(me);
    const el = document.createElement("div");
    el.className = "crash is-glitch";
    el.setAttribute("role", "alertdialog");
    el.setAttribute("aria-label", "System crash");
    el.innerHTML = `<pre class="crash__log" data-log></pre><div class="crash__send" hidden><p data-what></p><div class="crash__bar"><i></i></div></div>
      <div class="crash__jk" hidden><b>jk.</b><p>Nothing was sent. Now go do your tasks.<small>— ${esc(p.from_name)}</small></p><button class="alarm__btn alarm__btn--go" data-ok>Okay okay</button></div>`;
    document.body.append(el);
    play("glitch");
    play("powerDown");
    setTimeout(() => el.classList.remove("is-glitch"), 700);
    await sleep(500);
    const pre = el.querySelector("[data-log]");
    const lines = [
      ["BLUEPRINT OS — fatal exception in workspace.exe", "hi"],
      ["ERR   productivity.dll not found", "err"],
      ["WARN  motivation at 3% (critical)", ""],
      [`ERR   ${ev.late || "some"} overdue task${ev.late === 1 ? "" : "s"} detected for user ${me.toUpperCase()}`, "err"],
      ["WARN  aura levels dropping", ""],
      ["dumping memory to /dev/groupchat …", "hi"],
    ];
    for (const [i, [line, cls]] of lines.entries()) {
      const s = document.createElement("span");
      s.className = cls;
      s.textContent = `${i ? `[ ${(performance.now() / 1000).toFixed(4)}] ` : ""}${line}\n`;
      pre.append(s);
      play("blip");
      await sleep(calm() ? 60 : 260);
    }
    const box = el.querySelector(".crash__send"), bar = el.querySelector(".crash__bar i"), what = el.querySelector("[data-what]");
    box.hidden = false;
    for (let pct = 0; pct <= 100; pct += 4) {
      what.textContent = `Sending ${me}’s task list to the group chat … ${pct}%`;
      bar.style.width = `${pct}%`;
      if (pct % 12 === 0) play("blip");
      await sleep(pct > 80 ? 160 : 70);
    }
    await sleep(400);
    play("chime");
    el.querySelector(".crash__jk").hidden = false;
    const ok = el.querySelector("[data-ok]");
    ok.focus();
    ok.addEventListener("click", () => { el.classList.add("is-out"); setTimeout(() => { el.remove(); done(); }, 300); });
  });
}

/* ---------- the console (only Keira and Renz have the button) ---------- */
let pc = null;
function openConsole() {
  if (pc) return;
  audio();
  const t = them(), ev = evidence(t), role = personOf(t)?.role_title || "";
  pc = document.createElement("div");
  pc.className = "pc";
  pc.innerHTML = `<div class="pc__bg" data-pc-close></div>
    <section class="pc__win" role="dialog" aria-modal="true" aria-label="Slack Patrol">
      <header class="pc__bar"><span class="pc__dots"><i></i><i></i><i></i></span><b>slack-patrol</b><small>only you and ${esc(t)} can see this</small><button class="pc__x" data-pc-close aria-label="Close">${icon("x")}</button></header>
      <div class="pc__body">
        <section class="pc__target">
          ${avatar(t, "md")}
          <span class="pc__who"><small>Target</small><b>${esc(t)}</b><em>${esc(role)}</em></span>
          <dl class="pc__stats"><div><dt>Open</dt><dd>${ev.open}</dd></div><div><dt>Overdue</dt><dd class="${ev.late ? "is-bad" : ""}">${ev.late}</dd></div><div><dt>Worst</dt><dd>${ev.worst[0] ? `${ev.worst[0].d}d` : "—"}</dd></div></dl>
        </section>
        ${ev.worst.length ? `<ul class="pc__late">${ev.worst.map((w) => `<li><span>${esc(w.title)}</span><em>${w.d}d late</em></li>`).join("")}</ul>` : `<p class="pc__clean">No overdue tasks. Suspiciously clean.</p>`}

        <h3 class="pc__h"><span>01</span>Report</h3>
        <div class="pc__form">
          <label class="pc__days"><span>Slacking for</span>
            <span class="pc__step"><button type="button" data-step="-1" aria-label="One day less">−</button><input type="number" min="1" max="999" value="${ev.days}" data-days aria-label="Days" /><button type="button" data-step="1" aria-label="One day more">+</button></span>
            <span>days</span></label>
          <label class="pc__note"><span>Note</span><input maxlength="120" placeholder="Optional. It types out on their screen." data-note /></label>
        </div>
        <div class="pc__fire">
          <button class="pc__alarm" data-alarm>${icon("siren")}<span>Sound the alarm on ${esc(t)}</span></button>
          <button class="pc__ghost" data-preview title="See it on your own screen first">Preview</button>
        </div>

        <div data-troll></div>

        <h3 class="pc__h"><span>03</span>Log</h3>
        <ol class="pc__log" data-log></ol>
      </div>
    </section>`;
  document.body.append(pc);
  requestAnimationFrame(() => pc?.classList.add("is-on"));
  paintTroll();
  paintLog();
  play("blip");
  pc.addEventListener("click", onConsoleClick);
  pc.querySelector("[data-days]").addEventListener("change", (e) => { e.target.value = Math.max(1, Math.min(999, Math.round(Number(e.target.value)) || 1)); });
}
function closeConsole() {
  if (!pc) return;
  const el = pc;
  pc = null;
  el.classList.remove("is-on");
  setTimeout(() => el.remove(), 220);
}
function paintTroll() {
  const box = pc?.querySelector("[data-troll]");
  if (!box) return;
  const t = them(), on = !!reported(), dis = on ? "" : "disabled";
  box.innerHTML = `
    <h3 class="pc__h"><span>02</span>Troll ${on ? `<em class="is-armed">armed</em>` : `<em>locked</em>`}</h3>
    ${on ? "" : `<p class="pc__lock">${icon("lock")} Report ${esc(t)} first. These unlock for 24 hours after.</p>`}
    <div class="pc__tb ${on ? "" : "is-locked"}">
      <button class="tb tb--shame" data-spam="shame" ${dis}>${icon("bell")}<b>Shame</b><small>Words fly across their screen. Click as much as you like.</small><em data-count="shame">${sent.shame ? `×${sent.shame}` : ""}</em></button>
      ${S.me.name === GENERAL_FROM ? `<button class="tb tb--general" data-spam="general" ${dis}><span class="tb__photo"><img data-photo alt="" /></span><b>The General</b><small>Stamps his face all over ${esc(t)}’s screen. Unlimited.</small><em data-count="general">${sent.general ? `×${sent.general}` : ""}</em></button>` : ""}
      <button class="tb tb--crash" data-crash ${dis}>${icon("zap")}<b>Fake crash</b><small>Their workspace “crashes”. Then: jk.</small></button>
    </div>`;
  const img = box.querySelector("[data-photo]");
  if (img) photoUrl().then((u) => (img.src = u)).catch(() => {});
}
const LABEL = {
  slacking: (p) => `Slacking alert · ${p.payload?.days || 1} ${daysWord(Number(p.payload?.days) || 1)}`,
  shame: (p, n) => `Shame ×${n}`,
  general: (p, n) => `The General ×${n}`,
  crash: () => "Fake crash",
  reply: (p) => `“${p.payload?.text || ""}”`,
};
function paintLog() {
  const ol = pc?.querySelector("[data-log]");
  if (!ol) return;
  // back-to-back spam from the same person shows as one row
  const rows = [];
  for (const p of log) {
    const prev = rows[rows.length - 1];
    const n = Number(p.payload?.n) || 1;
    if (prev && ["shame", "general"].includes(p.kind) && prev.p.kind === p.kind && prev.p.from_name === p.from_name) { prev.n += n; continue; }
    rows.push({ p, n });
    if (rows.length > 14) break;
  }
  ol.innerHTML = rows.slice(0, 14).map(({ p, n }) => {
    const mine = p.from_name === S.me.name;
    return `<li class="${mine ? "is-mine" : ""}"><time>${clock(p.created_at)}</time><span class="pc__dir">${mine ? `You → ${esc(p.to_name)}` : `${esc(p.from_name)} → You`}</span><span class="pc__what">${esc(LABEL[p.kind]?.(p, n) || p.kind)}</span>${mine && p.kind !== "reply" ? `<em>${p.seen_at ? "seen" : "sent"}</em>` : "<em></em>"}</li>`;
  }).join("") || `<li class="pc__none">Nothing yet. Peaceful. For now.</li>`;
  const sh = pc.querySelector('[data-count="shame"]'), ge = pc.querySelector('[data-count="general"]');
  if (sh) sh.textContent = sent.shame ? `×${sent.shame}` : "";
  if (ge) ge.textContent = sent.general ? `×${sent.general}` : "";
}
function payload() {
  const t = them(), ev = evidence(t);
  return {
    days: Math.max(1, Math.min(999, Math.round(Number(pc.querySelector("[data-days]").value)) || 1)),
    note: pc.querySelector("[data-note]").value.trim().slice(0, 120),
    open: ev.open, late: ev.late, worst: ev.worst.map((w) => ({ title: w.title.slice(0, 80), d: w.d })),
  };
}
async function onConsoleClick(e) {
  const b = e.target.closest("button, [data-pc-close]");
  if (!b) return;
  if (b.matches("[data-pc-close]")) return closeConsole();
  if (b.dataset.step) {
    const inp = pc.querySelector("[data-days]");
    inp.value = Math.max(1, Math.min(999, (Number(inp.value) || 1) + Number(b.dataset.step)));
    return play("blip");
  }
  if (b.matches("[data-preview]")) {
    const p = { id: 0, from_name: S.me.name, to_name: them(), payload: payload(), created_at: new Date().toISOString() };
    closeConsole();
    return queue(() => alarm(p, { preview: true }));
  }
  if (b.matches("[data-alarm]")) {
    b.disabled = true;
    try {
      await send("slacking", payload());
      play("launch");
      toast(`Alarm sent. ${them()}’s screen is going off.`);
      b.classList.add("is-sent");
      b.querySelector("span").textContent = "Alarm sent";
      paintTroll();
      paintLog();
    } catch (err) { failed(err); }
    setTimeout(() => { if (!b.isConnected) return; b.disabled = false; b.classList.remove("is-sent"); b.querySelector("span").textContent = `Sound the alarm on ${them()}`; }, 4000);
    return;
  }
  if (b.dataset.spam) {
    spam(b.dataset.spam);
    b.classList.remove("is-hit");
    void b.offsetWidth;
    b.classList.add("is-hit");
    play(b.dataset.spam === "shame" ? "bell" : "thud", { gap: 120, arg: b.dataset.spam === "shame" ? 0.05 : undefined });
    return paintLog();
  }
  if (b.matches("[data-crash]")) {
    b.disabled = true;
    try { await send("crash"); play("glitch"); toast(`Crash deployed on ${them()}’s screen.`); paintLog(); } catch (err) { failed(err); }
    setTimeout(() => b.isConnected && (b.disabled = false), 6000);
  }
}

/* ---------- the button: in the sidebar (and the top bar on phones) ---------- */
function paintButton() {
  const sub = $("#patrolBtn [data-sub]");
  if (!sub) return;
  const t = them(), ev = evidence(t);
  sub.textContent = ev.late ? `${t} · ${ev.late} overdue` : `${t} · ${ev.open} open`;
  $("#patrolBtn").classList.toggle("is-hot", ev.late > 0);
}
function mountButton() {
  const t = them();
  $(".side__me").insertAdjacentHTML("beforebegin", `<button class="patrol" id="patrolBtn" title="Slack Patrol: only you and ${esc(t)} have this">
    <span class="patrol__ic">${icon("siren")}</span>
    <span class="patrol__t"><b>Slack Patrol</b><small data-sub></small></span>
    <span class="patrol__led" aria-hidden="true"></span></button>`);
  $(".topbar").insertAdjacentHTML("beforeend", `<button class="iconbtn patrol-top" id="patrolTop" aria-label="Slack Patrol">${icon("siren")}<i></i></button>`);
  $("#patrolBtn").addEventListener("click", openConsole);
  $("#patrolTop").addEventListener("click", openConsole);
  paintButton();
}

export async function startPatrol() {
  if (!inPatrol()) return;
  // sound needs one click or key press on the page first
  ["pointerdown", "keydown"].forEach((ev) => addEventListener(ev, () => { try { audio(); } catch {} }, { once: true, capture: true }));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && pc) closeConsole(); });
  mountButton();
  onChange((table) => table === "tasks" && paintButton());
  try { await loadLog(); } catch (e) { return console.warn("[patrol]", e); }
  supa.channel("patrol")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "pokes", filter: `to_name=eq.${S.me.name}` }, ({ new: p }) => receive(p))
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pokes", filter: `from_name=eq.${S.me.name}` }, ({ new: p }) => {
      const i = log.findIndex((x) => x.id === p.id);
      if (i < 0) return;
      const first = !log[i].seen_at && p.seen_at;
      log[i] = p;
      if (first && p.kind === "slacking") { play("blip"); toast(`${p.to_name} saw your alarm.`); }
      paintLog();
    })
    .subscribe();
  catchUp();
  photoUrl().catch(() => {}); // ready before the first stamp
}
