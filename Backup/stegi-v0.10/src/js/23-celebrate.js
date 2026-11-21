/* 23-celebrate.js – birthday and good-night ritual (0.9).
 *   Birthday  every month on the day of the month he hatched (the last day of a shorter month if needed),
 *             from the first month on: cake with one candle per month (per year from the first birthday
 *             on), balloons, party hat. Tap the cake: one candle goes out; all out = he eats the cake.
 *   Good night when he falls asleep in front of the child (lights out or bedtime): a lullaby from the music
 *             box (once a night), a cuddly toy dino next to him, and the picture slowly gets darker. */

const BDAY_FOOD = 30, BDAY_LOVE = 10;

/** Birthday at time t: { months, years, candles, key } or null. */
function birthdayAt(t) {
  if (!hatched()) return null;
  const h = new Date(S.hatchDay * 864e5), hy = h.getUTCFullYear(), hm = h.getUTCMonth(), hd = h.getUTCDate();
  const d = new Date(t), y = d.getFullYear(), m = d.getMonth();
  const months = (y - hy) * 12 + (m - hm);
  const last = new Date(y, m + 1, 0).getDate();
  if (months < 1 || d.getDate() !== Math.min(hd, last)) return null;
  const years = Math.floor(months / 12);
  return { months, years, candles: years >= 1 ? years : months, key: y + '-' + (m + 1) };
}
const birthdayNow = () => birthdayAt(now());

/** This birthday's cake: candles blown out, eaten (kept in the save, new for every birthday). */
function bdayState() {
  const b = birthdayNow();
  if (!b) return null;
  if (!S.bday || S.bday.key !== b.key) S.bday = { key: b.key, out: 0, eaten: false };
  return S.bday;
}

const cakePos = () => ({ x: W * 0.2, y: standY + 30 * U });
/** Candle positions on the cake (screen), n candles. */
function candlePos(i, n) { const c = cakePos(), w = Math.min(80, 18 * n) * U; return { x: c.x - w / 2 + (n === 1 ? w / 2 : i * w / (n - 1)), y: c.y - 58 * U }; }

/** Tap on the cake: the next candle goes out; when all are out he eats the cake. Returns true if it was the cake. */
function cakeTap(x, y) {
  const b = birthdayNow(), st = bdayState();
  if (!b || !st || st.eaten || asleepNow() || S.walk) return false;
  const c = cakePos();
  if (Math.abs(x - c.x) > 62 * U || y < c.y - 90 * U || y > c.y + 10 * U) return false;
  const n = Math.min(b.candles, 12);
  if (st.out < n) {
    const p = candlePos(st.out, n);
    st.out++;
    sound('pop');
    for (let i = 0; i < 4; i++) addPart('dust', p.x, p.y - 8 * U, { vx: rnd(-10, 10) * U, vy: rnd(-50, -30) * U, size: 5, max: 1.2 });
    if (st.out >= n) { sound('fanfare'); confetti(); pet.jumpV = 220 * U; pet.giggleT = 1.4; game.cakeEatAt = game.t + 1.6; }
  }
  save();
  return true;
}

/** Called every frame: after the candles are out, he eats the cake. */
function updateBirthday() {
  const b = birthdayNow();
  if (b && game.screen === 'game' && game.trans >= 1 && !asleepNow()) { const st = bdayState(); if (!st.sung) { st.sung = true; sound('bday'); save(); } }
  if (game.cakeEatAt && game.t >= game.cakeEatAt) {
    game.cakeEatAt = 0;
    const st = bdayState();
    if (st && !st.eaten) { st.eaten = true; addNeed('food', BDAY_FOOD); addNeed('love', BDAY_LOVE); pet.eatT = 1.3; sound('munch'); save(); }
  }
}

/** Cake with candles (lit ones flicker), and three balloons floating above it. */
function drawBirthday(c, time) {
  const b = birthdayNow(), st = bdayState();
  if (!b) return;
  const cp = cakePos();
  // Balloons (all day, even after the cake).
  [['#ff5c8a', -38, 0], ['#3fa9f5', 0, 0.8], ['#ffcc33', 38, 1.6]].forEach(([col, ox, ph]) => {
    const bx = cp.x + ox * U + Math.sin(time * 1.2 + ph) * 6 * U, by = groundY - 40 * U + Math.sin(time * 1.6 + ph) * 5 * U;   // above his back
    c.strokeStyle = 'rgba(80,80,80,0.6)'; c.lineWidth = 1.2 * U;
    c.beginPath(); c.moveTo(bx, by + 22 * U); c.quadraticCurveTo(bx + 8 * U, (by + cp.y) / 2, cp.x + ox * 0.3 * U, cp.y - 50 * U); c.stroke();
    c.fillStyle = col; c.beginPath(); c.ellipse(bx, by, 17 * U, 22 * U, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.ellipse(bx - 6 * U, by - 8 * U, 4 * U, 7 * U, -0.4, 0, TAU); c.fill();
  });
  if (!st || st.eaten) return;
  // Cake: two layers with cream and sprinkles.
  c.save(); c.translate(cp.x, cp.y); c.scale(1.25, 1.25);
  c.fillStyle = '#f8bbd0'; c.fillRect(-46 * U, -22 * U, 92 * U, 22 * U);
  c.fillStyle = '#fff3e0'; c.fillRect(-36 * U, -42 * U, 72 * U, 20 * U);
  c.fillStyle = '#ffffff';
  for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(-36 * U + i * 14.4 * U, -42 * U, 7 * U, 0, Math.PI); c.fill(); c.beginPath(); c.arc(-46 * U + i * 18.4 * U, -22 * U, 8 * U, 0, Math.PI); c.fill(); }
  ['#e53935', '#43a047', '#1e88e5', '#ffca28'].forEach((col, i) => { c.fillStyle = col; for (let k = 0; k < 3; k++) c.fillRect((-30 + k * 26 + i * 6) * U, (-14 + (i % 2) * 6) * U, 4 * U, 2 * U); });
  c.restore();
  const n = Math.min(b.candles, 12);
  for (let i = 0; i < n; i++) {
    const p = candlePos(i, n);
    c.fillStyle = ['#42a5f5', '#ff7096', '#66bb6a', '#ffca28'][i % 4]; c.fillRect(p.x - 2.5 * U, p.y, 5 * U, 14 * U);
    if (i >= st.out) {   // flame
      const f = 1 + Math.sin(time * 14 + i) * 0.15;
      c.fillStyle = 'rgba(255,200,60,0.35)'; c.beginPath(); c.arc(p.x, p.y - 6 * U, 9 * U, 0, TAU); c.fill();
      c.fillStyle = '#ffb300'; c.beginPath(); c.ellipse(p.x, p.y - 6 * U, 3.5 * U, 6 * U * f, 0, 0, TAU); c.fill();
      c.fillStyle = '#fff59d'; c.beginPath(); c.ellipse(p.x, p.y - 5 * U, 1.6 * U, 3 * U * f, 0, 0, TAU); c.fill();
    }
  }
}

/* ---------- good night ---------- */

let wasAsleep = false;
/** Called every frame in the game: notices him falling asleep in front of the child. */
function updateGoodnight(dt) {
  const asleep = asleepNow(), inGame = game.screen === 'game' && game.trans >= 1;
  if (asleep && !wasAsleep && inGame) {
    game.goodnight = { t: 0 };
    const d = dayIndex(now());
    if (S.lullabyDay !== d) { S.lullabyDay = d; sound('lullaby'); save(); }
  }
  if (!asleep) game.goodnight = null;
  if (game.goodnight) game.goodnight.t += dt;
  wasAsleep = asleep;
}

/** Extra darkness while he falls asleep: grows over 5 s to 0.22 and stays while he sleeps. */
function goodnightDim() { return game.goodnight ? Math.min(0.22, game.goodnight.t / 5 * 0.22) : 0; }

/** A small pink cuddly dino lying next to his head while he sleeps. */
function drawTeddy(c) {
  const h = game.stegoInfo && game.stegoInfo.head;
  if (!h) return;
  const x = h.x + 34 * U, y = standY - 6 * U, s = U;
  c.save(); c.translate(x, y);
  c.fillStyle = '#f48fb1'; c.strokeStyle = '#ad5a78'; c.lineWidth = 1.5 * s;
  c.beginPath(); c.ellipse(0, -10 * s, 18 * s, 11 * s, 0, 0, TAU); c.fill(); c.stroke();
  c.beginPath(); c.arc(18 * s, -16 * s, 9 * s, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = '#ffd1e0'; for (const ox of [-8, 0, 8]) { c.beginPath(); c.moveTo(ox * s - 4 * s, -20 * s); c.lineTo(ox * s, -27 * s); c.lineTo(ox * s + 4 * s, -20 * s); c.fill(); }
  c.fillStyle = '#5d2c3c'; c.beginPath(); c.arc(21 * s, -18 * s, 1.6 * s, 0, TAU); c.fill();
  c.restore();
}
