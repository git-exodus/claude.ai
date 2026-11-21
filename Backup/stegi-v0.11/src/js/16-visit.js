/* 16-visit.js – friends come to visit (0.3): at most one a day, at a random time between VISIT_FROM
 * and an hour before bedtime. If the app is closed then, the friend comes the next time the child
 * looks in (the same day, while he is awake). game.visit holds the visitor on screen. */

/** Plans today's visit once per day (random minute, kept in the save). */
function planVisit(t) {
  const d = dayIndex(t);
  if (S.visitDay === d) return;
  const from = VISIT_FROM, to = Math.max(from + 30, S.opts.sleep - 60);
  const day0 = new Date(t); day0.setHours(0, 0, 0, 0);
  S.visitDay = d; S.visitDone = false;
  S.visitAt = day0.getTime() + Math.round(rnd(from, to)) * 60000;
  save();
}

/** Visitor of a day (all five take turns, starting somewhere by the day number). */
const visitorOfDay = d => VISITORS[((d % VISITORS.length) + VISITORS.length) % VISITORS.length];

function updateVisit(dt, sleeping) {
  const t = now();
  if (!hatched() || !debugFlags.visit) return;
  planVisit(t);
  const v = game.visit;
  if (!v) {
    const ok = !S.visitDone && t >= S.visitAt && !sleeping && !isSleepy(t) && !S.walk &&
      game.screen === 'game' && game.trans >= 1 && game.mode === 'idle';
    if (ok) startVisit(visitorOfDay(dayIndex(t)));
    return;
  }
  v.t += dt;
  const box = game.stegoInfo ? game.stegoInfo.box : { x: W * 0.2, w: W * 0.6 };
  const side = v.side, walking = walkingNow();
  // 0.8.1: if he sets off on a walk, the friend walks along in front of him, at his hind legs.
  v.along = walking && v.phase !== 'out';
  // Along: at his hind legs; with a small stego further back (the friend is bigger than a baby and would hide him).
  const targetX = v.along ? box.x + box.w * 0.32 - (1 - growthAt(now())) * 70 * U
    : side > 0 ? Math.min(W - 45 * U, box.x + box.w + 40 * U) : Math.max(45 * U, box.x - 40 * U);
  // 0.8.1: a big stego steps a little aside (up to 12 % of the screen when grown), so the friend can be seen.
  if (game.mode === 'idle' && !sleeping) pet.tx = walking || v.phase === 'out' ? 0 : -side * W * 0.12 * growthAt(now());
  if (v.phase === 'in') {
    v.x += Math.sign(targetX - v.x) * Math.min(Math.abs(targetX - v.x), 110 * U * dt);
    v.walk += dt * 10;
    if (Math.abs(targetX - v.x) < 2 * U + 2) { v.phase = 'stay'; v.t = 0; sound('hello'); pet.giggleT = 1; v.present = friendArrives(v.kind); }   // 0.11: best friends bring a present
  } else if (v.phase === 'stay') {
    // Stay next to him (or at his hind legs while walking); follow when he moves.
    v.x += Math.sign(targetX - v.x) * Math.min(Math.abs(targetX - v.x), 160 * U * dt);
    if (v.along) v.walk += dt * 6;
    // Every 3 seconds both hop and hearts fly.
    if (Math.floor(v.t / 3) !== Math.floor((v.t - dt) / 3)) {
      v.hop = 0.5; if (pet.jump === 0 && game.mode === 'idle' && !walking) pet.jumpV = 150 * U;
      addPart('heart', (v.x + W / 2) / 2, standY - 140 * U, { size: 8 });
    }
    if (game.mode === 'idle' && !sleeping && !walking) pet.dir = side;   // he looks at his friend
    if (v.t >= VISIT_SECONDS || sleeping) {
      v.phase = 'out'; v.t = 0;
      addNeed('love', VISIT_LOVE); addNeed('fun', VISIT_FUN); friendVisited(v.kind); earn('visit'); save();
      sound('hello');
    }
  } else if (v.phase === 'out') {
    v.x += side * 110 * U * dt; v.walk += dt * 10; v.dir = side;
    if (v.x < -120 * U || v.x > W + 120 * U) game.visit = null;
  }
  if (v.hop > 0) v.hop = Math.max(0, v.hop - dt);
}

function startVisit(kind) {
  const side = Math.random() < 0.5 ? -1 : 1;
  game.visit = { kind, side, x: side > 0 ? W + 90 * U : -90 * U, dir: -side, phase: 'in', t: 0, walk: 0, hop: 0 };
  S.visitDone = true;
  save();
}

/** Draws the visitor (and lets the click on it count as a little hello). */
function drawVisitor(c, v, time) {
  const hop = v.hop > 0 ? Math.sin(v.hop / 0.5 * Math.PI) * 26 * U : 0;
  // Walking along: in front of him (a bit lower = closer), facing the way he walks (right).
  const y = standY - hop + (v.along ? 12 * U : 0), step = Math.sin(v.walk) * 4 * U;
  c.save(); c.translate(v.x, y); c.scale(v.along ? 1 : v.phase === 'out' ? v.side : -v.side, 1);
  c.lineWidth = 2.4 * U; c.lineJoin = 'round'; c.lineCap = 'round';
  const s = U;
  const eye = (x, yy, r) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(x, yy, r, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#222'; c.beginPath(); c.arc(x + r * 0.25, yy, r * 0.55, 0, TAU); c.fill(); };
  const shadow = () => { c.fillStyle = 'rgba(30,60,20,0.18)'; c.beginPath(); c.ellipse(0, hop + 2 * s, 40 * s, 6 * s, 0, 0, TAU); c.fill(); };
  if (v.kind === 'trex') {
    shadow();
    c.strokeStyle = '#8a3b12'; c.fillStyle = '#ff8a4c';
    c.beginPath(); c.moveTo(-20 * s, -30 * s); c.quadraticCurveTo(-55 * s, -30 * s, -62 * s, -20 * s); c.quadraticCurveTo(-45 * s, -18 * s, -18 * s, -16 * s); c.fill(); c.stroke();
    for (const lx of [-8, 8]) { c.beginPath(); c.rect(lx * s - 6 * s + (lx > 0 ? step : -step), -22 * s, 12 * s, 22 * s); c.fill(); c.stroke(); }
    c.beginPath(); c.ellipse(0, -36 * s, 24 * s, 22 * s, 0, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(22 * s, -66 * s, 22 * s, 18 * s, 0, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(16 * s, -38 * s); c.lineTo(26 * s, -34 * s); c.moveTo(14 * s, -32 * s); c.lineTo(23 * s, -26 * s); c.stroke();
    eye(26 * s, -72 * s, 5.5 * s);
    c.beginPath(); c.moveTo(28 * s, -56 * s); c.quadraticCurveTo(36 * s, -52 * s, 42 * s, -58 * s); c.stroke();
    c.fillStyle = '#ffd0b0'; c.beginPath(); c.ellipse(4 * s, -30 * s, 12 * s, 14 * s, 0, 0, TAU); c.fill();
  } else if (v.kind === 'ptero') {
    c.translate(0, -150 * s + Math.sin(time * 3) * 10 * s);
    const flap = Math.sin(time * 9) * 0.6;
    c.strokeStyle = '#4a2f6b'; c.fillStyle = '#b388ff';
    for (const sd of [-1, 1]) { c.save(); c.scale(1, 1); c.rotate(sd * 0 + (sd < 0 ? -flap : flap) * 0.6); c.beginPath(); c.moveTo(0, 0); c.lineTo(sd * 60 * s, -18 * s); c.lineTo(sd * 40 * s, 8 * s); c.closePath(); c.fill(); c.stroke(); c.restore(); }
    c.beginPath(); c.ellipse(0, 0, 16 * s, 9 * s, 0, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(16 * s, -8 * s, 10 * s, 8 * s, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#ffca28'; c.beginPath(); c.moveTo(24 * s, -9 * s); c.lineTo(44 * s, -4 * s); c.lineTo(24 * s, -3 * s); c.fill(); c.stroke();
    c.fillStyle = '#b388ff'; c.beginPath(); c.moveTo(10 * s, -12 * s); c.lineTo(-6 * s, -24 * s); c.lineTo(14 * s, -15 * s); c.fill(); c.stroke();
    eye(18 * s, -10 * s, 3.5 * s);
  } else if (v.kind === 'trike') {
    shadow();
    c.strokeStyle = '#3d2a63'; c.fillStyle = '#9575cd';
    c.beginPath(); c.moveTo(-34 * s, -24 * s); c.lineTo(-56 * s, -18 * s); c.lineTo(-34 * s, -12 * s); c.fill(); c.stroke();
    for (const lx of [-22, -6, 10, 24]) { c.beginPath(); c.rect(lx * s - 6 * s + ((lx / 2) % 2 ? step : -step), -18 * s, 12 * s, 18 * s); c.fill(); c.stroke(); }
    c.beginPath(); c.ellipse(-2 * s, -30 * s, 38 * s, 20 * s, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#ffab91'; c.beginPath(); c.arc(34 * s, -40 * s, 24 * s, Math.PI * 0.9, Math.PI * 2.1); c.fill(); c.stroke();
    c.fillStyle = '#9575cd'; c.beginPath(); c.ellipse(42 * s, -30 * s, 18 * s, 14 * s, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#fff8e1';
    for (const [hx, hy, l] of [[38, -44, 20], [50, -42, 20], [58, -28, 10]]) { c.beginPath(); c.moveTo(hx * s - 3 * s, hy * s); c.lineTo(hx * s + l * 0.5 * s, hy * s - l * s); c.lineTo(hx * s + 3 * s, hy * s); c.fill(); c.stroke(); }
    eye(42 * s, -34 * s, 4.5 * s);
  } else if (v.kind === 'turtle') {
    shadow();
    c.strokeStyle = '#2e5d2e'; c.fillStyle = '#9ccc65';
    for (const lx of [-18, 16]) { c.beginPath(); c.ellipse(lx * s + (lx > 0 ? step : -step), -4 * s, 8 * s, 6 * s, 0, 0, TAU); c.fill(); c.stroke(); }
    c.beginPath(); c.ellipse(34 * s, -16 * s, 12 * s, 10 * s, 0, 0, TAU); c.fill(); c.stroke();
    eye(38 * s, -19 * s, 3.5 * s);
    c.fillStyle = '#6d9b3a'; c.beginPath(); c.ellipse(0, -14 * s, 32 * s, 22 * s, 0, Math.PI, TAU); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#4e7a2a'; c.beginPath(); c.moveTo(-14 * s, -14 * s); c.lineTo(-8 * s, -30 * s); c.lineTo(8 * s, -30 * s); c.lineTo(14 * s, -14 * s); c.stroke();
  } else if (v.kind === 'butterflies') {
    for (let i = 0; i < 3; i++) {
      const bx = Math.sin(time * 1.3 + i * 2) * 30 * s + (i - 1) * 25 * s, by = -110 * s - i * 20 * s + Math.cos(time * 1.7 + i) * 18 * s;
      const fl = Math.abs(Math.sin(time * 12 + i));
      c.fillStyle = ['#ff8a65', '#4fc3f7', '#ffd54f'][i];
      c.beginPath(); c.ellipse(bx - 6 * s * fl, by, 8 * s * fl + 1, 10 * s, -0.4, 0, TAU); c.ellipse(bx + 6 * s * fl, by, 8 * s * fl + 1, 10 * s, 0.4, 0, TAU); c.fill();
      c.fillStyle = '#333'; c.fillRect(bx - 1.2 * s, by - 8 * s, 2.4 * s, 16 * s);
    }
  }
  c.restore();
}
