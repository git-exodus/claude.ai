/* 24-fun.js – more to do (0.10):
 *   Weather games  rain: puddles to jump into (fun, but muddy); snow: build a snowman (tap 3 times);
 *                  autumn (Sep–Nov) on grass: leaf piles to jump into.
 *   Seasons        grass places change with the month: spring blossoms fall, autumn leaves fall and the grass
 *                  turns golden, winter frost; summer as before.
 *   Toys           play menu: soap bubbles (tap them, he snaps), kite (drag it in the sky; not in rain/snow or
 *                  the cave), sandcastle (only on sand: tap 4 times to build, tap him and he stomps on it).
 *   Melody game    in the music game: he plays a few notes, the child plays them back; one note longer each time.
 *   Wishes         now and then he wishes for "3 berries" or "something red" (thought bubble); give exactly that. */

/* ---------- seasons ---------- */

/** 'spring' (Mar–May), 'summer' (Jun–Aug), 'autumn' (Sep–Nov), 'winter' (Dec–Feb). */
function seasonKind(t) { const m = new Date(t).getMonth(); return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter'; }
/** Places with grass are the ones that change with the seasons (and the way). */
const grassyPlace = id => fgOf(id).kind === 'grass';

/** Tint of the ground: golden in autumn, frosty in winter (drawn over the place's ground). */
function drawSeasonGround(c, placeId, L) {
  if (!grassyPlace(placeId)) return;
  const s = seasonKind(now());
  if (s === 'autumn') { c.fillStyle = 'rgba(214,150,50,0.2)'; c.fillRect(0, groundY, W, H - groundY); }
  else if (s === 'winter') { c.fillStyle = 'rgba(236,244,255,' + (0.3 * clamp(L + 0.3, 0, 1)).toFixed(2) + ')'; c.fillRect(0, groundY, W, H - groundY); }
}

/** In the air and on the grass: falling blossoms (spring), falling leaves (autumn), glittering frost (winter). */
function drawSeasonAir(c, placeId, time, L) {
  if (!grassyPlace(placeId)) return;
  const s = seasonKind(now()), e = { d: k => mix('#1d2a4a', k, clamp(L * 1.1, 0.25, 1)), L };
  if (s === 'spring') pFalling(c, e, '#f8bbd0', 14, time, 3.5, 18, 131);
  else if (s === 'autumn') { pFalling(c, e, '#ef6c00', 8, time, 5, 22, 132); pFalling(c, e, '#fbc02d', 6, time, 5, 18, 133); }
  else if (s === 'winter') {
    const r = mulberry(134);
    for (let i = 0; i < 30; i++) {
      const x = r() * W, y = groundY + 10 * U + r() * (H - groundY - 20 * U), a = 0.4 + 0.6 * Math.max(0, Math.sin(time * 2 + i));
      c.fillStyle = 'rgba(255,255,255,' + (a * 0.9).toFixed(2) + ')'; c.beginPath(); c.arc(x, y, 1.6 * U, 0, TAU); c.fill();
    }
  }
}

/* ---------- weather games ---------- */

/** Which weather game is on here and now: 'puddles' | 'snowman' | 'leaves' | null. */
function weatherGame() {
  if (!holidayHere() || asleepNow()) return null;
  const w = currentWeather();
  if (w === 'rain') return 'puddles';
  if (w === 'snow') return 'snowman';
  if (seasonKind(now()) === 'autumn' && grassyPlace(S.place)) return 'leaves';
  return null;
}
const puddlePos = i => [{ x: W * 0.12, y: standY + 36 * U }, { x: W * 0.88, y: standY + 30 * U }, { x: W * 0.68, y: standY + 58 * U }][i];
const leafPos = i => [{ x: W * 0.1, y: standY + 34 * U }, { x: W * 0.9, y: standY + 30 * U }][i];
const snowPos = () => ({ x: W * 0.84, y: standY + 26 * U });

/** The snowman of today (kept in the save): stage 0 = a pile of snow .. 3 = finished with hat and carrot. */
function snowmanState() { const d = dayIndex(now()); if (!S.snowman || S.snowman.day !== d) S.snowman = { day: d, stage: 0 }; return S.snowman; }

/** Tap on a puddle, a leaf pile or the snow. Returns true if it was one. */
function weatherGameTap(x, y) {
  const g = weatherGame();
  if (!g || game.jumpTo) return false;
  if (g === 'puddles' || g === 'leaves') {
    const n = g === 'puddles' ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const p = g === 'puddles' ? puddlePos(i) : leafPos(i);
      if (g === 'leaves' && game.leafGone && game.leafGone[i] > game.t) continue;
      if (dist(x, y, p.x, p.y) < 44 * U) { game.jumpTo = { kind: g, i, p }; pet.tx = clamp(p.x - W / 2, -W / 2 + 60 * U, W / 2 - 60 * U); sound('happy'); return true; }
    }
  } else if (g === 'snowman') {
    const p = snowPos(), st = snowmanState();
    if (st.stage < 3 && dist(x, y, p.x, p.y - 30 * U) < 50 * U) {
      st.stage++;
      sound(st.stage === 3 ? 'fanfare' : 'pop');
      for (let i = 0; i < 8; i++) addPart('sparkle', p.x + rnd(-30, 30) * U, p.y - rnd(0, 70) * U, { size: 7 });
      if (st.stage === 3) { earn('snowman'); addNeed('fun', 10); pet.jumpV = 200 * U; pet.giggleT = 1.2; }
      save();
      return true;
    }
  }
  return false;
}

/** He reached the puddle / leaf pile: jump in! Then back to the middle. */
function updateWeatherGame(dt) {
  const j = game.jumpTo;
  if (!j) return;
  if (pet.moving) return;
  if (!j.jumped) {
    j.jumped = true; j.t = 0;
    pet.jumpV = 230 * U; pet.giggleT = 1;
    addNeed('fun', 5); earn('jump');
    if (j.kind === 'puddles') {
      sound('splash'); addNeed('clean', -8);   // muddy – a reason for a bath
      for (let i = 0; i < 16; i++) addPart('drop', j.p.x + rnd(-30, 30) * U, j.p.y - 6 * U, { vx: rnd(-150, 150) * U, vy: rnd(-260, -120) * U, g: 700, size: 7, max: 0.9 });
    } else {
      sound('scrub');
      for (let i = 0; i < 20; i++) addPart('crumb', j.p.x + rnd(-30, 30) * U, j.p.y - 10 * U, { vx: rnd(-160, 160) * U, vy: rnd(-280, -120) * U, g: 300, color: ['#ef6c00', '#fbc02d', '#d84315'][i % 3], size: 6, max: 1.6 });
      game.leafGone = game.leafGone || []; game.leafGone[j.i] = game.t + 10;   // the pile grows back after 10 s
    }
    save();
    return;
  }
  j.t += dt;
  if (j.t > 1.4) { game.jumpTo = null; pet.tx = 0; }
}

function drawWeatherGame(c, time) {
  const g = weatherGame();
  if (!g) return;
  if (g === 'puddles') for (let i = 0; i < 3; i++) {
    const p = puddlePos(i);
    c.fillStyle = 'rgba(70,120,170,0.75)'; c.beginPath(); c.ellipse(p.x, p.y, 40 * U, 11 * U, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1.5 * U;
    const k = (time * 0.8 + i * 0.37) % 1; c.beginPath(); c.ellipse(p.x + (i - 1) * 8 * U, p.y, 6 * U + k * 20 * U, (2 + k * 5) * U, 0, 0, TAU); c.globalAlpha = 1 - k; c.stroke(); c.globalAlpha = 1;
  }
  if (g === 'leaves') for (let i = 0; i < 2; i++) {
    if (game.leafGone && game.leafGone[i] > game.t) continue;
    const p = leafPos(i), r = mulberry(140 + i);
    c.fillStyle = '#b5651d'; c.beginPath(); c.ellipse(p.x, p.y, 38 * U, 18 * U, 0, Math.PI, TAU); c.fill();
    for (let k = 0; k < 26; k++) { c.fillStyle = ['#ef6c00', '#fbc02d', '#d84315', '#a1887f'][k % 4]; c.beginPath(); c.ellipse(p.x + (r() - 0.5) * 70 * U, p.y - r() * 16 * U, 6 * U, 3 * U, r() * 3, 0, TAU); c.fill(); }
  }
  if (g === 'snowman') {
    const p = snowPos(), st = snowmanState();
    c.fillStyle = '#ffffff'; c.strokeStyle = 'rgba(120,150,190,0.5)'; c.lineWidth = 1.5 * U;
    if (st.stage === 0) { c.beginPath(); c.ellipse(p.x, p.y, 34 * U, 14 * U, 0, Math.PI, TAU); c.fill(); c.stroke(); }
    const balls = [[0, -16, 22], [0, -48, 16], [0, -72, 11]];
    for (let i = 0; i < st.stage; i++) { const [ox, oy, r] = balls[i]; c.beginPath(); c.arc(p.x + ox * U, p.y + oy * U, r * U, 0, TAU); c.fill(); c.stroke(); }
    if (st.stage >= 3) {
      c.fillStyle = '#ff7043'; c.beginPath(); c.moveTo(p.x, p.y - 72 * U); c.lineTo(p.x - 16 * U, p.y - 70 * U); c.lineTo(p.x, p.y - 68 * U); c.fill();
      c.fillStyle = '#263238'; for (const ox of [-4, 4]) { c.beginPath(); c.arc(p.x + ox * U, p.y - 76 * U, 1.8 * U, 0, TAU); c.fill(); }
      c.fillRect(p.x - 10 * U, p.y - 84 * U, 20 * U, 3 * U); c.fillRect(p.x - 6 * U, p.y - 98 * U, 12 * U, 14 * U);
      c.strokeStyle = '#6d4c41'; c.lineWidth = 2.5 * U; c.beginPath(); c.moveTo(p.x - 14 * U, p.y - 50 * U); c.lineTo(p.x - 32 * U, p.y - 62 * U); c.moveTo(p.x + 14 * U, p.y - 50 * U); c.lineTo(p.x + 32 * U, p.y - 64 * U); c.stroke();
    }
  }
}

/* ---------- toys ---------- */

const SAND_PLACES = ['beach', 'island', 'lagoon', 'treasure', 'desert'];
const kiteOk = () => { const w = currentWeather(); return (w === 'sun' || w === 'clouds' || w === 'rainbow') && !placeById(S.walk ? 'meadow' : S.place).indoor; };
const castleOk = () => !S.walk && SAND_PLACES.includes(S.place);

function startToy(kind) {
  game.mode = kind; game.modeT = 0;
  if (kind === 'bubbles') game.bubbles = { list: [], next: 0 };
  if (kind === 'kite') game.kite = { x: W * 0.7, y: groundY * 0.4, tx: W * 0.7, ty: groundY * 0.4, fun: 0 };
  if (kind === 'castle') game.castle = { stage: 0 };
  refreshUI();
}

function updateToys(dt) {
  if (game.mode === 'bubbles') {
    const b = game.bubbles;
    b.next -= dt;
    if (b.next <= 0 && b.list.length < 8) { b.next = 0.8; b.list.push({ x: rnd(0.1, 0.9) * W, y: H - 120 * U, r: rnd(14, 24) * U, vy: -rnd(30, 55) * U, ph: rnd(0, 6) }); }
    for (const q of b.list) { q.y += q.vy * dt; q.x += Math.sin(game.t * 2 + q.ph) * 18 * U * dt; }
    b.list = b.list.filter(q => q.y > 40 * U);
  } else if (game.mode === 'kite') {
    const k = game.kite;
    k.x = lerp(k.x, k.tx, Math.min(1, dt * 3)) + Math.sin(game.t * 2.3) * 0.6 * U;
    k.y = lerp(k.y, k.ty, Math.min(1, dt * 3)) + Math.cos(game.t * 1.7) * 0.5 * U;
    k.fun += dt;
    if (k.fun >= 2) { k.fun = 0; addNeed('fun', 1); }
  }
}

/** Taps for the toys. Returns true if used. */
function toyTap(x, y) {
  if (game.mode === 'bubbles') {
    const b = game.bubbles, i = b.list.findIndex(q => dist(x, y, q.x, q.y) < q.r + 12 * U);
    if (i < 0) return true;
    const q = b.list.splice(i, 1)[0];
    sound('pop'); addNeed('fun', 2);
    pet.giggleT = 0.6; if (pet.jump === 0) pet.jumpV = 160 * U;
    pet.dir = q.x < W / 2 + pet.x ? -1 : 1;
    for (let k = 0; k < 8; k++) addPart('bubble', q.x, q.y, { vx: rnd(-80, 80) * U, vy: rnd(-80, 80) * U, size: 4, max: 0.5 });
    return true;
  }
  if (game.mode === 'castle') {
    const c = game.castle, p = { x: W * 0.8, y: standY + 34 * U };
    if (c.stage < 4 && dist(x, y, p.x, p.y - 30 * U) < 55 * U) {
      c.stage++; sound(c.stage === 4 ? 'fanfare' : 'scrub');
      for (let k = 0; k < 8; k++) addPart('crumb', p.x + rnd(-30, 30) * U, p.y - rnd(0, 40) * U, { vx: rnd(-60, 60) * U, vy: rnd(-120, -40) * U, g: 400, color: '#e2be72', size: 4, max: 0.7 });
      if (c.stage === 4) { earn('castle'); addNeed('fun', 10); pet.giggleT = 1; }
      return true;
    }
    if (c.stage === 4 && game.stegoInfo && inBox(x, y, game.stegoInfo.box)) {
      // He stomps on the finished castle – the best part.
      pet.tx = clamp(p.x - W / 2 - 60 * U, -W / 2 + 60 * U, W / 2 - 60 * U); pet.jumpV = 260 * U; c.stomp = 0.8;
      return true;
    }
  }
  return false;
}

/** The castle is flattened when he lands next to it after the stomp. */
function updateCastle(dt) {
  const c = game.castle;
  if (!c || !c.stomp) return;
  c.stomp -= dt;
  if (c.stomp <= 0) {
    c.stomp = 0; c.stage = 0; sound('flop'); addNeed('fun', 3); pet.giggleT = 1.2; pet.tx = 0;
    for (let k = 0; k < 18; k++) addPart('dust', W * 0.8 + rnd(-40, 40) * U, standY + 20 * U, { vx: rnd(-90, 90) * U, vy: rnd(-90, -20) * U, size: rnd(6, 11), max: 1 });
  }
}

/** The kite follows the finger in the upper part of the screen. */
function kiteDrag(x, y) { if (game.mode !== 'kite') return false; game.kite.tx = clamp(x, 30 * U, W - 30 * U); game.kite.ty = clamp(y, 70 * U, groundY + 20 * U); return true; }

function drawToys(c, time) {
  if (game.mode === 'bubbles') for (const q of game.bubbles.list) {
    const g = c.createRadialGradient(q.x - q.r * 0.3, q.y - q.r * 0.3, q.r * 0.1, q.x, q.y, q.r);
    g.addColorStop(0, 'rgba(255,255,255,0.7)'); g.addColorStop(0.7, 'rgba(180,220,255,0.25)'); g.addColorStop(1, 'rgba(255,170,230,0.6)');
    c.fillStyle = g; c.beginPath(); c.arc(q.x, q.y, q.r, 0, TAU); c.fill();
  }
  if (game.mode === 'kite') {
    const k = game.kite, m = game.stegoInfo ? game.stegoInfo.mouth : { x: W / 2, y: standY - 80 * U };
    c.strokeStyle = 'rgba(60,60,60,0.7)'; c.lineWidth = 1.2 * U;
    c.beginPath(); c.moveTo(m.x, m.y); c.quadraticCurveTo((m.x + k.x) / 2, Math.max(m.y, k.y) + 30 * U, k.x, k.y + 24 * U); c.stroke();
    c.save(); c.translate(k.x, k.y); c.rotate(Math.sin(time * 2) * 0.15);
    const cols = ['#e53935', '#ffca28', '#1e88e5', '#43a047'];
    const pts = [[0, -30], [22, 0], [0, 24], [-22, 0]];
    for (let i = 0; i < 4; i++) { c.fillStyle = cols[i]; c.beginPath(); c.moveTo(0, 0); c.lineTo(pts[i][0] * U, pts[i][1] * U); c.lineTo(pts[(i + 1) % 4][0] * U, pts[(i + 1) % 4][1] * U); c.fill(); }
    c.strokeStyle = '#555'; c.lineWidth = 1.5 * U; c.beginPath(); c.moveTo(0, 24 * U); for (let i = 1; i <= 4; i++) c.lineTo(Math.sin(time * 4 + i) * 6 * U, (24 + i * 12) * U); c.stroke();
    c.restore();
  }
  if (game.mode === 'castle') {
    const st = game.castle.stage, x = W * 0.8, y = standY + 34 * U;
    c.fillStyle = '#e2be72'; c.strokeStyle = '#b8914a'; c.lineWidth = 1.5 * U;
    if (st === 0) { c.beginPath(); c.ellipse(x, y, 34 * U, 10 * U, 0, Math.PI, TAU); c.fill(); }
    if (st >= 1) { c.fillRect(x - 32 * U, y - 22 * U, 64 * U, 22 * U); c.strokeRect(x - 32 * U, y - 22 * U, 64 * U, 22 * U); }
    if (st >= 2) for (let i = 0; i < 4; i++) c.fillRect(x - 32 * U + i * 18 * U, y - 30 * U, 10 * U, 8 * U);
    if (st >= 3) for (const ox of [-26, 26]) { c.fillRect(x + ox * U - 9 * U, y - 52 * U, 18 * U, 30 * U); c.strokeRect(x + ox * U - 9 * U, y - 52 * U, 18 * U, 30 * U); c.fillStyle = '#c9a25c'; c.beginPath(); c.moveTo(x + ox * U - 11 * U, y - 52 * U); c.lineTo(x + ox * U, y - 66 * U); c.lineTo(x + ox * U + 11 * U, y - 52 * U); c.fill(); c.fillStyle = '#e2be72'; }
    if (st >= 4) { c.strokeStyle = '#6d4c41'; c.beginPath(); c.moveTo(x + 26 * U, y - 66 * U); c.lineTo(x + 26 * U, y - 86 * U); c.stroke(); c.fillStyle = '#e53935'; c.beginPath(); c.moveTo(x + 26 * U, y - 86 * U); c.lineTo(x + 40 * U + Math.sin(time * 6) * 2 * U, y - 81 * U); c.lineTo(x + 26 * U, y - 76 * U); c.fill(); }
  }
}

/* ---------- melody game (in the music game) ---------- */

/** Notes of the first melody (0.12.3: 3, was 2); each one solved adds a note, up to 6. */
const MELODY_START = 3;

/** Starts (or restarts) the melody game: he plays `len` notes, then it is the child's turn. */
function startMelody(len) {
  const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 6));
  game.melody = { seq, len, phase: 'listen', i: 0, t: -0.6, pos: 0 };
  refreshUI();
}

function updateMelody(dt) {
  const m = game.melody;
  if (!m || game.mode !== 'music') { game.melody = null; return; }
  if (m.phase !== 'listen') return;
  m.t += dt;
  // A note every 0.65 s; after the last one the child may play 0.35 s later.
  if (m.t >= (m.i >= m.seq.length ? 0.35 : 0.65)) {
    m.t = 0;
    if (m.i < m.seq.length) {
      const k = m.seq[m.i++], el = $('mk-' + k);
      sound('xylo', k); pet.danceT = 0.5;
      if (el) { el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 300); }
    } else { m.phase = 'play'; m.pos = 0; refreshUI(); }
  }
}

/** A key pressed while the melody game waits for the child. */
function melodyKey(i) {
  const m = game.melody;
  if (!m || m.phase !== 'play' || i > 5) return;
  if (i === m.seq[m.pos]) {
    m.pos++;
    if (m.pos >= m.len) {
      m.phase = 'done'; earn('melody'); sound('applause'); addNeed('fun', 5); pet.danceT = 1.5;
      setTimeout(() => { if (game.melody === m) startMelody(Math.min(6, m.len + 1)); }, 1400);
    }
  } else {
    m.phase = 'wrong'; sound('refuse');
    setTimeout(() => { if (game.melody === m) Object.assign(m, { phase: 'listen', i: 0, t: -0.4, pos: 0 }); }, 1000);
  }
}

/* ---------- wishes ---------- */

/** Now and then (every 10–20 minutes of playing, when he is not full) a wish appears; it goes after 8 minutes.
 *  The wish is always "n times this food" (0.12.7: the colour wish was removed, children did not get it).
 *  If there is no room for at least 2 pieces, no wish this time. */
function updateWish() {
  if (!hatched() || asleepNow()) { S.wish = null; return; }
  if (S.wish && game.t > S.wish.until) S.wish = null;
  if (S.wish || game.mode !== 'idle' || game.screen !== 'game' || game.trans < 1) return;
  if (game.nextWish === undefined) game.nextWish = game.t + rnd(60, 180);
  if (game.t < game.nextWish || S.needs.food >= 80) return;
  game.nextWish = game.t + rnd(600, 1200);
  const f = FOODS[Math.floor(Math.random() * FOODS.length)], room = Math.floor((100 - S.needs.food) / f.value);
  if (room >= 2) S.wish = { type: 'count', food: f.id, n: Math.min(4, room), got: 0, until: game.t + 480 };
}

/** Called when he eats something (from eat()): does it fulfil the wish? */
function wishEat(id) {
  const w = S.wish;
  if (!w) return;
  if (id === w.food) w.got++;
  if (w.got >= w.n) {
    S.wish = null;
    earn('wish');
    addNeed('love', 10); addNeed('fun', 5);
    pet.danceT = 1.6; sound('applause');
    const h = game.stegoInfo ? game.stegoInfo.head : { x: W / 2, y: standY - 100 * U };
    for (let i = 0; i < 14; i++) addPart('star', h.x + rnd(-80, 80) * U, h.y + rnd(-60, 40) * U, { size: 9 });
  }
}

/** Thought bubble content: the wished food n times (eaten ones faded). */
function wishBubbleIcon(c, x, y, r) {
  const w = S.wish, n = w.n, s = r * (n > 3 ? 0.62 : 0.85);
  for (let i = 0; i < n; i++) {
    const ox = (i - (n - 1) / 2) * s * 0.85;
    c.globalAlpha = i < w.got ? 0.25 : 1;
    drawFood(c, w.food, x + ox, y, s);
  }
  c.globalAlpha = 1;
}
