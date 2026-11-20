/* 22-training.js – training (0.8): choose a trick, trace its symbol on the board in the upper half,
 * and he does the trick – or, if the line was not good enough, flops onto his belly (funny, not sad).
 *   Rolle = circle, Hinterbeine = up-and-down zigzag, Vorderbeine = wave.
 * Tricks open one after the other: the next one shows "?" until the one before is learned (TRICK_LEARN).
 * Learned tricks he sometimes does by himself in idle moments (see updateIdle in 08-game.js).
 * game.train = { phase: 'pick' | 'draw' | 'show', trick, stroke: [{x, y}], drawing, demo } */

const trickLearned = id => S.tricks[id] >= TRICK_LEARN;
const trickOpen = i => i === 0 || trickLearned(TRICKS[i - 1].id);
const learnedTricks = () => TRICKS.filter(t => trickLearned(t.id)).map(t => t.id);

/** The board in the upper half of the screen (left of the button column, below the needs). */
function trainBoard() {
  const x = 14 * U, y = 74 * U, w = W - x - 66 * U;
  return { x, y, w, h: Math.max(170 * U, groundY - y + 6 * U) };
}

/** Shapes whose line ends where it starts (the order check wraps around for them). */
const CLOSED_SHAPES = ['circle', 'triangle', 'heart', 'star'];

/** A shape as points in a box from -1 to 1 (y down). Lines with corners are filled in every 1/12 of a side. */
function shapeUnit(shape) {
  const pts = [], fill = corners => { for (let i = 0; i + 1 < corners.length; i++) for (let k = 0; k < 12; k++) pts.push({ x: lerp(corners[i].x, corners[i + 1].x, k / 12), y: lerp(corners[i].y, corners[i + 1].y, k / 12) }); pts.push(corners[corners.length - 1]); };
  if (shape === 'circle') for (let i = 0; i <= 64; i++) { const a = -Math.PI / 2 + i / 64 * TAU; pts.push({ x: Math.cos(a), y: Math.sin(a) }); }
  else if (shape === 'zigzag') fill(Array.from({ length: 6 }, (_, i) => ({ x: i % 2 ? 1 : -1, y: lerp(-1, 1, i / 5) })));
  else if (shape === 'wave') for (let i = 0; i <= 64; i++) { const k = i / 64; pts.push({ x: lerp(-1, 1, k), y: -Math.sin(k * TAU * 1.5) }); }
  else if (shape === 'triangle') fill([{ x: 0, y: -1 }, { x: 0.95, y: 0.8 }, { x: -0.95, y: 0.8 }, { x: 0, y: -1 }]);
  else if (shape === 'spiral') for (let i = 0; i <= 80; i++) { const k = i / 80, r = 0.14 + 0.86 * k, a = k * TAU * 2; pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r }); }
  else if (shape === 'heart') for (let i = 0; i <= 64; i++) { const t = i / 64 * TAU; pts.push({ x: 16 * Math.sin(t) ** 3 / 17, y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 + 0.1 }); }
  else if (shape === 'star') fill(Array.from({ length: 11 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.42 : 1; return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.95 + 0.05 }; }));
  return pts;
}

/** The dotted line to trace for a shape, as screen points on the board. Round shapes keep their
 *  proportions; the zigzag is narrow and tall, the wave wide and flat. */
function trickGuide(shape) {
  const b = trainBoard(), p = 30 * U, cx = b.x + b.w / 2, cy = b.y + b.h / 2 + 8 * U;
  const hx = b.w / 2 - p, hy = (b.h - 16 * U) / 2 - p, s = Math.min(hx, hy);
  const sx = shape === 'zigzag' ? Math.min(b.w * 0.2, 54 * U) : shape === 'wave' ? hx : s;
  const sy = shape === 'zigzag' ? hy - 7 * U : shape === 'wave' ? hy * 0.75 : s;
  return shapeUnit(shape).map(q => ({ x: cx + q.x * sx, y: cy + q.y * sy }));
}

/** Points along a finger line every ~4 U (so that fast and slow drawing count the same). */
function resample(stroke) {
  const out = [], step = 4 * U;
  for (let i = 0; i < stroke.length; i++) {
    if (!i) { out.push(stroke[0]); continue; }
    const a = stroke[i - 1], b = stroke[i], d = dist(a.x, a.y, b.x, b.y);
    for (let s = step; s < d; s += step) out.push({ x: lerp(a.x, b.x, s / d), y: lerp(a.y, b.y, s / d) });
    out.push(b);
  }
  return out;
}

/**
 * Is the finger line good enough for the shape? Generous for children of 5, but scribbling does not count:
 *   cover   share of the dotted line the finger came near (within TRACE_TOL)
 *   onLine  share of the finger line that stayed near the dotted line (within 1.2 x TRACE_TOL)
 *   order   share of the finger's steps that move along the dotted line in one direction
 *           (each finger point is matched to the nearest point of the dotted line; for the circle the
 *           matching wraps around). Start point and direction do not matter.
 *   len     length of the finger line / length of the dotted line (TRACE_LEN range)
 */
function judgeTrace(shape, stroke) {
  const guide = trickGuide(shape), pts = resample(stroke), tol = TRACE_TOL * U, n = guide.length;
  const fail = { ok: false, cover: 0, onLine: 0, order: 0, len: 0 };
  if (pts.length < 8) return fail;
  const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  const near = (p, list, t) => list.some(q => d2(p, q) < t * t);
  const cover = guide.filter(g => near(g, pts, tol)).length / n;
  const onLine = pts.filter(p => near(p, guide, tol * 1.2)).length / pts.length;
  const lenOf = l => l.reduce((s, p, i) => s + (i ? Math.sqrt(d2(p, l[i - 1])) : 0), 0);
  const len = lenOf(pts) / lenOf(guide);
  // Order: nearest guide index for every 3rd finger point, then the direction of the steps between them.
  const idx = pts.filter((_, i) => i % 3 === 0).map(p => { let best = 0, bd = Infinity; guide.forEach((g, i) => { const v = d2(p, g); if (v < bd) { bd = v; best = i; } }); return best; });
  let fwd = 0, back = 0;
  for (let i = 1; i < idx.length; i++) {
    let dlt = idx[i] - idx[i - 1];
    if (CLOSED_SHAPES.includes(shape)) { if (dlt > n / 2) dlt -= n; if (dlt < -n / 2) dlt += n; }
    if (Math.abs(dlt) > n / 4) { back++; continue; }   // a jump across the shape counts against it
    if (dlt > 0) fwd++; else if (dlt < 0) back++;
  }
  const steps = fwd + back, order = steps ? Math.max(fwd, back) / steps : 0;
  // 0.9: how far apart the two lines are on average (both ways) – tells similar shapes apart.
  const nearest = (p, list) => { let m = Infinity; for (const q of list) m = Math.min(m, d2(p, q)); return Math.sqrt(m); };
  const g2s = guide.map(g => nearest(g, pts)), s2g = pts.map(p => nearest(p, guide));
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length / U;
  const meanG = mean(g2s), meanS = mean(s2g), p90 = s2g.slice().sort((x, y) => x - y)[Math.floor(s2g.length * 0.9)] / U;
  const ok = cover >= TRACE_COVER && onLine >= TRACE_ON_LINE && order >= TRACE_ORDER && len >= TRACE_LEN[0] && len <= TRACE_LEN[1]
    && meanG <= TRACE_MEAN && meanS <= TRACE_MEAN && p90 <= TRACE_P90;
  return { ok, cover, onLine, order, len, meanG, meanS, p90 };
}

/* ---------- flow ---------- */

function startTrain() {
  game.mode = 'train'; game.modeT = 0;
  game.train = { phase: 'pick', trick: null, stroke: [], drawing: false, demo: 0 };
  buildTrainPick();
  refreshUI();
}

/** A trick tile was tapped (only open ones). */
function pickTrick(id) {
  const i = TRICKS.findIndex(t => t.id === id);
  if (i < 0 || !trickOpen(i) || !game.train) return;
  sound('tap');
  Object.assign(game.train, { phase: 'draw', trick: id, stroke: [], drawing: false, demo: 0 });
  refreshUI();
}

/** Back from the board to the choice of tricks. */
function trainBackToPick() {
  if (!game.train) return;
  Object.assign(game.train, { phase: 'pick', stroke: [], drawing: false });
  buildTrainPick();
  refreshUI();
}

/** The finger left the board: judge the line, then he does the trick or flops. */
function finishTrace() {
  const tr = game.train;
  tr.drawing = false;
  const t = TRICKS.find(x => x.id === tr.trick), res = judgeTrace(t.shape, tr.stroke);
  tr.result = res;
  tr.phase = 'show';
  const wasLearned = trickLearned(t.id);
  if (res.ok) { S.tricks[t.id]++; earn('trick'); }
  addNeed('fun', res.ok ? TRAIN_FUN_OK : TRAIN_FUN_FAIL);
  save();
  startTrick(t.id, res.ok, false);
  if (res.ok && !wasLearned && trickLearned(t.id)) tr.newlyLearned = true;
  refreshUI();
}

/** Starts the trick animation. ok = false: he tries and flops on his belly. idle = he does it by himself. */
function startTrick(id, ok, idle) {
  pet.idle = null;
  pet.trick = { kind: id, ok, idle, t: 0, dur: ok ? (id === 'roll' ? 1.6 : 2.0) : 2.4 };
}

/** Every frame (from updatePet): trick timing, sounds at the right moments, back to the board after. */
function updateTrick(dt) {
  const tr = pet.trick;
  if (!tr) return;
  const prev = tr.t;
  tr.t += dt;
  const at = s => prev < s && tr.t >= s;
  // 0.9: hearts for the kiss, sparkles for the pirouette.
  if (tr.ok && tr.kind === 'kiss' && at(tr.dur * 0.45)) { const h = game.stegoInfo ? game.stegoInfo.head : { x: W / 2, y: standY - 100 * U }; for (let i = 0; i < 6; i++) addPart('heart', h.x + rnd(-20, 40) * U, h.y - 10 * U, { size: 9, vy: -70 * U }); sound('happy'); }
  if (tr.ok && tr.kind === 'pirouette' && at(tr.dur * 0.4)) { const h = game.stegoInfo ? game.stegoInfo.head : { x: W / 2, y: standY - 100 * U }; for (let i = 0; i < 14; i++) addPart('sparkle', h.x + rnd(-120, 60) * U, h.y + rnd(-60, 60) * U, { size: 9 }); }
  if (tr.ok && at(tr.dur * 0.6)) { sound(tr.idle ? 'giggle' : 'applause'); const h = game.stegoInfo ? game.stegoInfo.head : { x: W / 2, y: standY - 100 * U }; for (let i = 0; i < 8; i++) addPart('star', h.x + rnd(-60, 60) * U, h.y + rnd(-40, 40) * U, { size: 8 }); }
  if (!tr.ok && at(0.55)) {
    sound('flop');
    for (let i = 0; i < 12; i++) addPart('dust', W / 2 + pet.x + rnd(-90, 90) * U, standY - rnd(0, 10) * U, { vx: rnd(-50, 50) * U, vy: rnd(-40, -10) * U, size: rnd(7, 13), max: 1.0 });
  }
  if (tr.t >= tr.dur) {
    pet.trick = null;
    if (game.mode === 'train' && game.train) {
      if (game.train.newlyLearned) { game.train.newlyLearned = false; sound('fanfare'); confetti(); }
      Object.assign(game.train, { phase: 'draw', stroke: [], demo: 0 });
      buildTrainPick();
      refreshUI();
    }
  }
}

/** Pose and face during a trick (called from stegoLook; the trick wins over everything else). */
function applyTrickLook(o) {
  const tr = pet.trick, q = tr.t / tr.dur;
  const hold = smooth(Math.min(q, 1 - q) / 0.25);   // up, hold, back down
  const pivotFor = (kind, k) => kind === 'roll' ? { x: 0, y: null, a: TAU * k }
    : kind === 'stand' ? { x: -34, y: 0, a: -0.85 * k } : kind === 'hand' ? { x: 34, y: 0, a: 0.55 * k }
    : kind === 'sit' ? { x: -34, y: 0, a: -0.35 * k } : kind === 'kiss' ? { x: 34, y: 0, a: 0.16 * k } : { x: 0, y: null, a: 0.12 * k };
  // Lift (px) so that no part of him goes into the ground: half his length while rolling, a little for the handstand.
  const len = game.stegoInfo ? game.stegoInfo.box.w : 200 * U;
  o.headDown = 0;
  if (tr.ok) {
    o.eyes = 'happy'; o.mouth = 'open'; o.brow = 'happy'; o.wag = 1; o.wiggle = q > 0.5 ? 1 : 0;
    o.squash = 0;
    if (tr.kind === 'roll') { const k = smooth(clamp((q - 0.1) / 0.75, 0, 1)); o.pivot = pivotFor('roll', k); o.jump = Math.sin(Math.PI * clamp((q - 0.1) / 0.75, 0, 1)) * len * 0.42; }
    else if (tr.kind === 'sit') { o.pivot = pivotFor('sit', hold); o.squash = hold * 0.25; o.jump = 0; o.mouth = 'smile'; }
    else if (tr.kind === 'spin') { o.dir = Math.floor(q * 8) % 2 ? -1 : 1; o.jump = Math.abs(Math.sin(q * Math.PI * 4)) * len * 0.05; }
    else if (tr.kind === 'kiss') { o.pivot = pivotFor('kiss', hold); o.eyes = 'closed'; o.mouth = 'closed'; o.blush = true; o.jump = 0; }
    else if (tr.kind === 'pirouette') { o.dir = Math.floor(q * 12) % 2 ? -1 : 1; o.jump = Math.sin(Math.PI * q) * len * 0.3; o.squash = -Math.sin(Math.PI * q) * 0.5; }
    else { o.pivot = pivotFor(tr.kind, hold); o.jump = hold * len * (tr.kind === 'hand' ? 0.1 : 0.04); }
    return;
  }
  // Not good enough: a start of the trick (first 0.5 s), then plop on the belly, lie there, get up.
  if (tr.t < 0.5) {
    o.pivot = pivotFor(tr.kind, smooth(tr.t / 0.5) * (tr.kind === 'roll' ? 0.15 : 0.45));
    o.eyes = 'open'; o.mouth = 'open'; o.brow = 'up';
  } else if (q < 0.78) {
    o.pose = 'lie'; o.eyes = 'closed'; o.mouth = 'yawn';
    o.squash = Math.max(0, 1 - (tr.t - 0.5) / 0.35) * 0.9;
  } else {
    o.eyes = 'happy'; o.mouth = 'smile'; o.blush = true;
    o.dir = Math.sin(tr.t * 30) > 0 ? 1 : -1;   // shakes himself
  }
  o.jump = 0;
}

/* ---------- drawing ---------- */

/** The board with the dotted line, a demo hand at the start, the finger line and the trick's stars. */
function drawTrainBoard(c) {
  const tr = game.train;
  if (!tr || tr.phase !== 'draw') return;
  const b = trainBoard(), t = TRICKS.find(x => x.id === tr.trick), guide = trickGuide(t.shape);
  c.save();
  c.fillStyle = 'rgba(255,255,255,0.88)'; c.strokeStyle = 'rgba(60,90,120,0.25)'; c.lineWidth = 2 * U;
  c.beginPath(); c.moveTo(b.x + 18 * U, b.y); c.arcTo(b.x + b.w, b.y, b.x + b.w, b.y + b.h, 18 * U); c.arcTo(b.x + b.w, b.y + b.h, b.x, b.y + b.h, 18 * U);
  c.arcTo(b.x, b.y + b.h, b.x, b.y, 18 * U); c.arcTo(b.x, b.y, b.x + b.w, b.y, 18 * U); c.closePath(); c.fill(); c.stroke();
  // Stars: how often this trick worked (TRICK_LEARN = learned).
  for (let i = 0; i < TRICK_LEARN; i++) {
    const sx = b.x + b.w - 22 * U - i * 24 * U, sy = b.y + 20 * U, on = S.tricks[t.id] > TRICK_LEARN - 1 - i;
    c.fillStyle = on ? '#ffca28' : 'rgba(0,0,0,0.12)';
    c.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 4.5 * U : 10 * U, a = k * Math.PI / 5 - Math.PI / 2; c.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } c.fill();
  }
  // The dotted line and a green start point.
  c.strokeStyle = 'rgba(80,120,170,0.45)'; c.lineWidth = 12 * U; c.lineCap = 'round'; c.lineJoin = 'round';
  c.setLineDash([2 * U, 18 * U]);
  c.beginPath(); guide.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.stroke();
  c.setLineDash([]);
  const pulse = 1 + Math.sin(game.t * 5) * 0.15;
  c.fillStyle = '#5cc15a'; c.beginPath(); c.arc(guide[0].x, guide[0].y, 11 * U * pulse, 0, TAU); c.fill();
  // The finger line.
  if (tr.stroke.length > 1) {
    c.strokeStyle = '#ff7a3d'; c.lineWidth = 9 * U;
    c.beginPath(); tr.stroke.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.stroke();
  }
  // As long as nothing is drawn: a hand shows the way along the line (every 2.5 s).
  if (!tr.stroke.length) {
    const k = (game.t % 2.5) / 2, p = guide[Math.min(guide.length - 1, Math.floor(clamp(k, 0, 1) * (guide.length - 1)))];
    if (k <= 1) { c.globalAlpha = 0.8; drawHand(c, p.x + 6 * U, p.y + 16 * U, 36 * U); }
  }
  c.restore();
}

/** Small picture of a shape for the trick tiles. */
function drawShapeIcon(c, shape, w, h) {
  c.strokeStyle = '#4a7bd0'; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round';
  const r = Math.min(w, h) * 0.34, sx = shape === 'zigzag' ? r * 0.45 : r, sy = shape === 'wave' ? r * 0.55 : r;
  c.beginPath();
  shapeUnit(shape).forEach((q, i) => { const x = w / 2 + q.x * sx, y = h / 2 + q.y * sy; i ? c.lineTo(x, y) : c.moveTo(x, y); });
  c.stroke();
}

/** The choice of tricks: open ones with their shape and stars, the others with "?". */
function buildTrainPick() {
  const el = $('trainpick');
  el.innerHTML = TRICKS.map((t, i) => {
    const open = trickOpen(i), n = Math.min(S.tricks[t.id], TRICK_LEARN);
    return '<button class="ttile' + (open ? '' : ' locked') + '" id="tt-' + t.id + '" type="button" aria-label="' + (open ? t.name : 'Noch nicht') + '">' +
      (open ? '<canvas width="120" height="120"></canvas><span class="stars">' + '★'.repeat(n) + '<i>' + '★'.repeat(TRICK_LEARN - n) + '</i></span>' : '<b>?</b>') + '</button>';
  }).join('');
  TRICKS.forEach((t, i) => {
    const b = $('tt-' + t.id);
    if (trickOpen(i)) drawShapeIcon(b.querySelector('canvas').getContext('2d'), t.shape, 120, 120);
    b.addEventListener('click', () => { if (trickOpen(i)) pickTrick(t.id); else { sound('refuse'); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); } });
  });
}

/** Is the screen point on the board? */
function inTrainBoard(x, y) { const b = trainBoard(); return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }
