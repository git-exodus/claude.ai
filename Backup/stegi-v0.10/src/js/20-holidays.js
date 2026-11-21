/* 20-holidays.js – holidays by the phone's date (0.7), no internet needed:
 *   Christmas  18.12. – 6.1.: a decorated tree next to him (not in the cave, not on the cloud, not on the way);
 *              from 24.12. three presents under it: Christmas hat, reindeer antlers, a candy cane to eat.
 *   New Year   31.12. all day and 1.1. until noon: fireworks in the sky (soft by day, bright at night).
 *   Easter     Good Friday – Easter Monday: 5 coloured eggs hidden in the picture; all found = chocolate bunny.
 * Easter Sunday is computed with the Gauss/Meeus formula (easterSunday). */

const XMAS_GIFTS = ['santa', 'antlers', 'candy'];
/** Things to wear that come from holidays (shown in the wardrobe only once he has them). */
const WEAR_EXTRA = [{ id: 'santa', slot: 'head' }, { id: 'antlers', slot: 'head' }];
const TREAT_FOOD = 30;   // candy cane and chocolate bunny
const EASTER_EGGS = 5;

/** Easter Sunday of year y (Gregorian calendar), as a local Date at midnight. */
function easterSunday(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}

/** Which holiday things are on at time t. */
function seasonAt(t) {
  const d = new Date(t), mo = d.getMonth(), day = d.getDate(), y = d.getFullYear();
  const tree = (mo === 11 && day >= 18) || (mo === 0 && day <= 6);
  const gifts = (mo === 11 && day >= 24) || (mo === 0 && day <= 6);
  const fireworks = (mo === 11 && day === 31) || (mo === 0 && day === 1 && minuteOfDay(t) < 12 * 60);
  const e = dayIndex(easterSunday(y).getTime()), today = dayIndex(t);
  return { tree, gifts, fireworks, easter: today >= e - 2 && today <= e + 1, xmasYear: mo === 11 ? y : y - 1, year: y };
}
const seasonNow = () => seasonAt(now());

/** Holiday things are shown where he is, not on the way; the tree not in the cave or on the cloud. */
const holidayHere = () => hatched() && !S.walk;
const treeHere = () => holidayHere() && seasonNow().tree && !['cave', 'cloud'].includes(S.place);

/** This season's Christmas presents and this year's eggs (kept in the save, reset each year). */
function xmasState() {
  const y = seasonNow().xmasYear;
  if (!S.xmas || S.xmas.year !== y) S.xmas = { year: y, opened: [false, false, false] };
  return S.xmas;
}
function easterState() {
  const y = seasonNow().year;
  if (!S.easter || S.easter.year !== y) S.easter = { year: y, found: Array(EASTER_EGGS).fill(false), bunny: 'none' };
  return S.easter;
}

/* ---------- positions (screen) ---------- */

const treePos = () => ({ x: W * 0.13, y: standY - 4 * U });
const xmasBoxPos = i => ({ x: W * (0.06 + i * 0.1), y: standY + 14 * U });
/** Eggs: two at the sides in front, two further back, one in the grass in front of him. */
function eggPos(i) {
  return [[0.08, standY + 34 * U], [0.9, standY + 24 * U], [0.27, groundY + 46 * U], [0.74, groundY + 60 * U], [0.56, standY + 56 * U]]
    .map(([fx, y]) => ({ x: W * fx, y }))[i];
}
const bunnyPos = () => ({ x: W * 0.86, y: standY + 34 * U });

/* ---------- actions ---------- */

/** A tap at (x, y): Christmas box, Easter egg or the chocolate bunny. Returns true if it was one. */
function holidayTap(x, y) {
  if (!holidayHere() || asleepNow()) return false;
  const s = seasonNow();
  if (treeHere() && s.gifts) {
    const st = xmasState();
    for (let i = 0; i < 3; i++) {
      const p = xmasBoxPos(i);
      if (!st.opened[i] && dist(x, y, p.x, p.y - 16 * U) < 30 * U) { openXmasBox(i); return true; }
    }
  }
  if (s.easter) {
    const st = easterState();
    for (let i = 0; i < EASTER_EGGS; i++) {
      const p = eggPos(i);
      if (!st.found[i] && dist(x, y, p.x, p.y - 10 * U) < 32 * U) { findEgg(i); return true; }
    }
    const b = bunnyPos();
    if (st.bunny === 'shown' && dist(x, y, b.x, b.y - 22 * U) < 36 * U) { eatTreat('bunny'); st.bunny = 'eaten'; save(); return true; }
  }
  return false;
}

function openXmasBox(i) {
  const st = xmasState();
  st.opened[i] = true;
  const what = XMAS_GIFTS[i], p = xmasBoxPos(i);
  sound('fanfare');
  for (let k = 0; k < 30; k++) addPart('confetti', p.x, p.y - 20 * U, { vx: rnd(-160, 160) * U, vy: rnd(-300, -120) * U, g: 500, color: ['#e53935', '#43a047', '#ffd54f', '#ffffff'][k % 4], size: 8, max: 1.6 });
  if (what === 'candy') eatTreat('candy');
  else {
    if (!S.extraWear.includes(what)) S.extraWear.push(what);
    S.wear.head = what;   // put it on right away
    pet.jumpV = 200 * U; pet.giggleT = 1.2;
  }
  save();
}

function findEgg(i) {
  const st = easterState(), p = eggPos(i);
  st.found[i] = true;
  sound('pling');
  for (let k = 0; k < 10; k++) addPart('sparkle', p.x + rnd(-20, 20) * U, p.y - rnd(0, 30) * U, { size: 8 });
  if (st.found.every(Boolean)) { st.bunny = 'shown'; sound('fanfare'); confetti(); }
  save();
}

/** Candy cane or chocolate bunny: straight into his mouth. */
function eatTreat(kind) {
  addNeed('food', TREAT_FOOD); addNeed('love', 2);
  pet.eatT = 1.3; sound('munch');
  const m = game.stegoInfo ? game.stegoInfo.mouth : { x: W / 2, y: standY - 80 * U };
  for (let i = 0; i < 8; i++) addPart('crumb', m.x, m.y, { vx: rnd(-60, 60) * U, vy: rnd(-80, -20) * U, g: 400, color: kind === 'candy' ? (i % 2 ? '#e53935' : '#ffffff') : '#6d4c41', size: 4, max: 0.8 });
}

/* ---------- fireworks ---------- */

let lastBurst = -1;
/** Fireworks in the sky: a new rocket every 0.6 s, each burst lives 2 s, so 3–4 are in the sky at once.
 *  Each burst: two rings of sparks with glowing trails that fall a little. A bit softer by day. */
function drawFireworks(c, time, L) {
  const every = 0.6, life = 2.0, slot = Math.floor(time / every), cols = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#e040fb', '#ffffff', '#ff9100'];
  c.save();
  c.lineCap = 'round';
  for (let s = slot - Math.ceil(life / every); s <= slot; s++) {
    const r = mulberry(s * 31 + 7), age = time - s * every;
    if (age < 0 || age > life) continue;
    const x = W * (0.1 + r() * 0.8), y = groundY * (0.12 + r() * 0.45), col = cols[Math.floor(r() * cols.length)], col2 = cols[Math.floor(r() * cols.length)];
    const k = age / life, a = (1 - k * k) * lerp(1, 0.75, L);
    c.globalAlpha = a;
    if (age < 0.4) {   // the rocket going up with a little tail
      const q = age / 0.4, ry = lerp(groundY, y, smooth(q));
      c.strokeStyle = '#ffe9a8'; c.lineWidth = 3 * U;
      c.beginPath(); c.moveTo(x, ry); c.lineTo(x, ry + 18 * U); c.stroke();
      continue;
    }
    const q = smooth((age - 0.4) / 1.0), drop = k * k * 26 * U;
    // A soft glow in the middle right after the bang.
    if (age < 0.8) {
      const g = c.createRadialGradient(x, y, 0, x, y, 60 * U);
      g.addColorStop(0, col + 'aa'); g.addColorStop(1, col + '00');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, 60 * U, 0, TAU); c.fill();
    }
    for (const [n, rad, cc, w] of [[22, 80 * U, col, 3.4 * U], [12, 44 * U, col2, 2.8 * U]]) {
      c.strokeStyle = cc; c.fillStyle = cc; c.lineWidth = w;
      for (let i = 0; i < n; i++) {
        const an = i * TAU / n + s, d1 = rad * q, d0 = Math.max(0, d1 - 24 * U);
        const x1 = x + Math.cos(an) * d1, y1 = y + Math.sin(an) * d1 + drop;
        c.beginPath(); c.moveTo(x + Math.cos(an) * d0, y + Math.sin(an) * d0 + drop * 0.6); c.lineTo(x1, y1); c.stroke();
        c.beginPath(); c.arc(x1, y1, w * 0.9, 0, TAU); c.fill();
      }
    }
  }
  c.restore();
  // A soft bang for each new burst (only in the game, while he is awake); sometimes he looks up amazed.
  const burst = Math.floor((time - 0.4) / 0.6);
  if (burst !== lastBurst) {
    lastBurst = burst;
    if (game.screen === 'game' && game.trans >= 1 && !asleepNow()) {
      sound('firework');
      pet.blink = 0.2;
      if (game.mode === 'idle' && !pet.idle && Math.random() < 0.3) pet.idle = { kind: 'look', t: 0, dur: 2.2 };
    }
  }
}

/* ---------- drawing ---------- */

/** Christmas tree with balls, lights (glowing at night) and a star. */
function drawXmasTree(c, L, time) {
  const { x, y } = treePos(), s = U * 1.15;
  c.save();
  c.fillStyle = '#6d4c41'; c.fillRect(x - 8 * s, y - 24 * s, 16 * s, 24 * s);
  const tiers = [[0, 62, 58], [-40, 50, 50], [-76, 38, 42]];
  c.fillStyle = mix('#1d2a4a', '#2e7d4f', clamp(L * 1.1, 0.35, 1));
  for (const [oy, w, h] of tiers) { c.beginPath(); c.moveTo(x - w * s, y - 20 * s + oy * s); c.lineTo(x, y - 20 * s + (oy - h) * s - 18 * s); c.lineTo(x + w * s, y - 20 * s + oy * s); c.fill(); }
  // Garland and balls.
  c.strokeStyle = '#ffd54f'; c.lineWidth = 2 * s;
  for (const [oy, w] of [[-14, 50], [-52, 38], [-86, 26]]) { c.beginPath(); c.moveTo(x - w * s, y + oy * s); c.quadraticCurveTo(x, y + (oy + 12) * s, x + w * s, y + (oy - 6) * s); c.stroke(); }
  const balls = [[-36, -24, '#e53935'], [24, -30, '#42a5f5'], [-12, -60, '#ffd54f'], [20, -70, '#e53935'], [-24, -92, '#ab47bc'], [10, -104, '#42a5f5'], [40, -12, '#ffd54f'], [-48, -8, '#ab47bc']];
  for (const [bx, by, col] of balls) {
    const glow = (1 - L) * (0.6 + 0.4 * Math.sin(time * 3 + bx));
    if (glow > 0.1) { const g = c.createRadialGradient(x + bx * s, y + by * s, 0, x + bx * s, y + by * s, 16 * s); g.addColorStop(0, col + 'aa'); g.addColorStop(1, col + '00'); c.fillStyle = g; c.beginPath(); c.arc(x + bx * s, y + by * s, 16 * s, 0, TAU); c.fill(); }
    c.fillStyle = col; c.beginPath(); c.arc(x + bx * s, y + by * s, 5.5 * s, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(x + bx * s - 1.8 * s, y + by * s - 1.8 * s, 1.6 * s, 0, TAU); c.fill();
  }
  // Star on top.
  const ty = y - 150 * s;
  c.fillStyle = '#ffd740';
  c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 6 * s : 14 * s, a = i * Math.PI / 5 - Math.PI / 2; c.lineTo(x + Math.cos(a) * r, ty + Math.sin(a) * r); } c.fill();
  c.restore();
}

/** The three wrapped presents under the tree (not yet opened ones). */
function drawXmasBoxes(c, time) {
  const st = xmasState();
  for (let i = 0; i < 3; i++) {
    if (st.opened[i]) continue;
    const p = xmasBoxPos(i), cols = [['#e53935', '#ffd54f'], ['#43a047', '#e53935'], ['#1e88e5', '#ffffff']][i];
    const b = Math.abs(Math.sin(time * 3 + i)) * 4 * U;
    c.save(); c.translate(p.x, p.y - b);
    c.fillStyle = cols[0]; c.fillRect(-15 * U, -26 * U, 30 * U, 26 * U);
    c.fillStyle = cols[1]; c.fillRect(-3 * U, -26 * U, 6 * U, 26 * U); c.fillRect(-15 * U, -15 * U, 30 * U, 5 * U);
    c.beginPath(); c.ellipse(-6 * U, -30 * U, 6 * U, 4 * U, -0.4, 0, TAU); c.ellipse(6 * U, -30 * U, 6 * U, 4 * U, 0.4, 0, TAU); c.fill();
    c.restore();
  }
}

/** Easter eggs not found yet, and the chocolate bunny once all are found. */
function drawEaster(c, time) {
  const st = easterState(), cols = [['#f48fb1', '#fff59d'], ['#81d4fa', '#ffffff'], ['#c5e1a5', '#ce93d8'], ['#ffcc80', '#80cbc4'], ['#b39ddb', '#ffe082']];
  for (let i = 0; i < EASTER_EGGS; i++) {
    if (st.found[i]) continue;
    const p = eggPos(i), [a, b] = cols[i], wob = Math.sin(time * 2 + i) * 0.06;
    c.save(); c.translate(p.x, p.y); c.rotate(wob);
    c.fillStyle = a; c.beginPath(); c.ellipse(0, -11 * U, 9 * U, 12 * U, 0, 0, TAU); c.fill();
    c.strokeStyle = b; c.lineWidth = 2.5 * U;
    c.beginPath(); c.moveTo(-8 * U, -12 * U); c.lineTo(-4 * U, -15 * U); c.lineTo(0, -12 * U); c.lineTo(4 * U, -15 * U); c.lineTo(8 * U, -12 * U); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(-3 * U, -17 * U, 2.5 * U, 4 * U, -0.3, 0, TAU); c.fill();
    c.restore();
  }
  if (st.bunny === 'shown') {
    const p = bunnyPos(), hop = Math.abs(Math.sin(time * 3)) * 5 * U;
    c.save(); c.translate(p.x, p.y - hop); c.fillStyle = '#6d4c41';
    c.beginPath(); c.ellipse(0, -16 * U, 14 * U, 17 * U, 0, 0, TAU); c.fill();
    c.beginPath(); c.arc(0, -38 * U, 10 * U, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(-5 * U, -54 * U, 3.5 * U, 11 * U, -0.2, 0, TAU); c.ellipse(5 * U, -54 * U, 3.5 * U, 11 * U, 0.2, 0, TAU); c.fill();
    c.fillStyle = '#e53935'; c.fillRect(-12 * U, -29 * U, 24 * U, 4 * U);
    c.fillStyle = '#ffd54f'; c.beginPath(); c.arc(0, -27 * U, 3 * U, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-5 * U, -22 * U, 3 * U, 7 * U, 0.2, 0, TAU); c.fill();
    c.restore();
  }
}

/* ---------- test mode: jump to a holiday ---------- */

/** Jumps the test clock forward to the next month/day (or Easter Sunday) at 10:00. */
function devGoHoliday(which) {
  const t = now(), cur = new Date(t);
  let target;
  for (let y = cur.getFullYear(); y <= cur.getFullYear() + 1 && !target; y++) {
    const d = which === 'easter' ? easterSunday(y) : new Date(y, which[0] - 1, which[1]);
    d.setHours(10, 0, 0, 0);
    if (d.getTime() > t) target = d.getTime();
  }
  devJump((target - t) / 3600e3);
}
