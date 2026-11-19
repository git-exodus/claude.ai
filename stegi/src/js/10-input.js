/* 10-input.js – touches on the canvas and on the food tray.
 * One finger at a time. A "tap" is a touch shorter than 0.35 s that moved less than 14 px;
 * everything else is a stroke/drag. */

const touch = { active: false, id: 0, x: 0, y: 0, sx: 0, sy: 0, st: 0, moved: 0, trail: [], ball: false };

/** Is the screen point near the stego or egg in the menu (generous for small fingers)? */
function menuHit(x, y) { return Math.abs(x - W / 2) < 140 * U && y > standY - 280 * U && y < standY + 60 * U; }
/** Is the point on the egg? */
function eggHit(x, y) { return Math.abs(x - W / 2) < 85 * U && y > eggTop() - 30 * U && y < standY + 25 * U; }

function onDown(e) {
  if (touch.active) return;
  unlockAudio();
  Object.assign(touch, { active: true, id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY,
    st: performance.now(), moved: 0, trail: [{ x: e.clientX, y: e.clientY, t: performance.now() }], ball: false });
  if (game.screen !== 'game' || game.trans < 1) return;
  if (game.mode === 'brush' && game.brush && !game.brush.done) { game.brush.x = e.clientX; game.brush.y = e.clientY; }
  if (game.mode === 'ball' && game.ball && !game.ball.carried) {
    touch.ball = dist(e.clientX, e.clientY, game.ball.x, ballY()) < 60 * U;
  }
}

function onMove(e) {
  if (game.held) {
    const h = game.held;
    h.x = e.clientX; h.y = e.clientY;
    if (dist(h.x, h.y, h.sx, h.sy) > 14) h.moved = true;   // small jitter still counts as a tap
    return;
  }
  if (!touch.active || e.pointerId !== touch.id) return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y, d = Math.hypot(dx, dy);
  touch.x = e.clientX; touch.y = e.clientY; touch.moved += d;
  touch.trail.push({ x: e.clientX, y: e.clientY, t: performance.now() });
  if (touch.trail.length > 8) touch.trail.shift();
  if (game.screen !== 'game' || game.trans < 1 || d === 0) return;
  game.rubX = e.clientX; game.rubY = e.clientY;
  if (!hatched()) { if (eggHit(e.clientX, e.clientY)) game.rubbing = 0.25; return; }
  if (asleepNow()) return;
  if (game.mode === 'brush' && game.brush && !game.brush.done) { game.brush.x = e.clientX; game.brush.y = e.clientY; game.rubbing = 0.25; return; }
  if (game.mode === 'bath') { game.rubbing = 0.25; return; }
  if (['ball', 'hide', 'music'].includes(game.mode)) return;
  if ((game.mode === 'idle' || game.mode === 'eat' || game.mode === 'play') && game.stegoInfo && inBox(e.clientX, e.clientY, game.stegoInfo.box)) strokeStego(d);
}

function onUp(e) {
  if (game.held) { dropHeld(); return; }
  if (!touch.active || e.pointerId !== touch.id) return;
  touch.active = false;
  const isTap = touch.moved < 14 && performance.now() - touch.st < 350;
  const x = touch.sx, y = touch.sy;
  if (game.screen === 'menu') {
    if (isTap && game.trans === 0 && menuHit(x, y) && $('settings').hidden && $('rest').hidden) enterGame();
    return;
  }
  if (game.trans < 1) return;
  if (game.mode === 'ball' && touch.ball) {
    // Throw speed from the last ~0.12 s of the finger's movement.
    const tr = touch.trail, last = tr[tr.length - 1];
    let first = tr[0];
    for (const p of tr) if (last.t - p.t <= 120) { first = p; break; }
    const dt = Math.max(0.016, (last.t - first.t) / 1000);
    throwBall((last.x - first.x) / dt, (last.y - first.y) / dt);
    return;
  }
  if (!isTap) return;
  if (!hatched()) {
    if (eggHit(x, y) && game.mode !== 'hatch') { eggFx.wobbleV += 1.2; sound(isNight(now()) ? 'murmur' : 'egg'); }
    return;
  }
  if (game.mode === 'hide') { const i = hideSpotAt(x, y); if (i >= 0) hideTap(i); return; }
  if (giftWaiting() && game.mode === 'idle' && !asleepNow() && !S.walk) {
    const gp = giftPos();
    if (dist(x, y, gp.x, gp.y - 25 * U) < 45 * U) { openGift(); return; }
  }
  for (let i = 0; i < S.poops.length; i++) {
    const p = poopPos(i);
    if (dist(x, y, p.x, p.y - 15 * U) < 38 * U) { removePoop(i); return; }
  }
  if ((game.mode === 'idle' || game.mode === 'eat') && game.stegoInfo && inBox(x, y, game.stegoInfo.box)) tapStego();
}

/** Food taken from the tray: dropped near the mouth or just tapped -> he eats it. */
function dropHeld() {
  const h = game.held;
  game.held = null;
  const m = game.stegoInfo && game.stegoInfo.mouth;
  if (!h.moved || (m && dist(h.x, h.y, m.x, m.y) < 90 * U) || (game.stegoInfo && inBox(h.x, h.y, game.stegoInfo.box))) offerFood(h.id, h.x, h.y);
}

function setupInput() {
  cv.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', e => { touch.active = false; game.held = null; });
  $('tray').addEventListener('pointerdown', e => {
    const b = e.target.closest('.food');
    if (!b || game.flying || pet.eatT > 0) return;
    e.preventDefault();
    unlockAudio();
    const r = b.getBoundingClientRect();
    game.held = { id: b.dataset.food, x: r.left + r.width / 2, y: r.top + r.height / 2, sx: e.clientX, sy: e.clientY, moved: false };
  });
  window.addEventListener('contextmenu', e => e.preventDefault());
}
