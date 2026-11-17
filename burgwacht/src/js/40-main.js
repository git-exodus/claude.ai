/*
 * Main loop, attacking, drawing the frame, input and start-up.
 */

/* ---------- Attacking ---------- */

/**
 * Attacks at (x, y) with the active weapon if its cooldown is over.
 * `tapped` is true for a fresh tap (not auto-fire): only then a blocked attack gives feedback.
 */
function attack(x, y, tapped) {
  if (session.paused) return;
  if (combat.cooldown > 0) {
    if (tapped) ring(cx, cy + 11 * U, 40 * U, '233,82,79', 0.25);   // red "not ready" pulse
    return;
  }
  if (!session.started) {
    session.started = true;
    $('hint').style.opacity = 0;
  }
  combat.attackCount++;
  combat.cooldownMax = cooldownOf(S.active);
  combat.cooldown = combat.cooldownMax;
  WEAPONS[S.active].attack(x, y);
  sound(...ATTACK_SOUNDS[S.active]);
}

function selectWeapon(id) {
  if (!owned(id)) {
    toast(WEAPONS[id].name + ' ist gesperrt', 'Im Shop nach einer Niederlage');
    return;
  }
  if (S.active === id) return;
  clearCooldownRings();
  S.active = id;
  // The running cooldown carries over; keep the ring's scale valid for it.
  combat.cooldownMax = Math.max(combat.cooldownMax, combat.cooldown, 0.01);
  renderHud();
  save();
}

/* ---------- Update ---------- */

/** Advances the game by `dt` seconds. Never called while paused. */
function update(dt) {
  session.time += dt;
  combat.cooldown -= dt;
  combat.chainBooms = 0;
  if (session.holdPoint && combat.cooldown <= 0) attack(session.holdPoint.x, session.holdPoint.y, false);   // auto-fire
  session.shake = Math.max(0, session.shake - dt * 40);
  castle.flash = Math.max(0, castle.flash - dt);

  runTimers(dt);
  updateWave(dt);
  updateEnemies(dt);
  updateCombo(dt);
  updateSoldiers(dt);
  updateArchers(dt);
  updateKnight(dt);
  updateProjectiles(dt);
  updateZones(dt);
  updateVisuals(dt);

  world.enemies = world.enemies.filter(e => !e.dead);
  world.projectiles = world.projectiles.filter(p => !p.dead);

  if (castle.fallen) handleDefeat();
  updateHudMeters();

  session.achievementTimer += dt;   // achievements are checked about once a second, not on every kill
  if (session.achievementTimer >= 1) {
    session.achievementTimer = 0;
    checkAchievements();
  }
}

function runTimers(dt) {
  // Index loop: a timer's callback may schedule further timers.
  for (let i = 0; i < world.timers.length; i++) {
    const timer = world.timers[i];
    timer.t -= dt;
    if (timer.t <= 0) {
      timer.done = true;
      timer.fn();
    }
  }
  world.timers = world.timers.filter(timer => !timer.done);
}

function updateCombo(dt) {
  if (combo.timer > 0) {
    combo.timer -= dt;
    if (combo.timer <= 0) combo.count = 0;
  }
  combo.punch = Math.max(0, combo.punch - dt * 5);
}

function updateZones(dt) {
  for (const zone of world.zones) {
    zone.t += dt;
    if (zone.t < zone.dur) zone.update(zone, dt);
  }
  world.zones = world.zones.filter(zone => zone.t < zone.dur);
}

function updateVisuals(dt) {
  for (const effect of world.effects) effect.t += dt;
  world.effects = world.effects.filter(effect => effect.t < effect.dur);

  for (const p of world.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 260 * U * dt;   // gravity
  }
  world.particles = world.particles.filter(p => p.life > 0);

  for (const text of world.texts) {
    text.t += dt;
    text.y -= 28 * U * dt;
  }
  world.texts = world.texts.filter(text => text.t < textLifetime(text));
}
const textLifetime = text => (text.big ? 1.4 : 0.7);

/* ---------- Draw ---------- */

function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (session.shake > 0 && !REDUCED_MOTION) {
    ctx.translate(rnd(-session.shake, session.shake) * 0.5, rnd(-session.shake, session.shake) * 0.5);
  }
  ctx.drawImage(ground, 0, 0, W, H);

  // ground layer
  for (const zone of world.zones) if (zone.under) zone.draw(zone);
  for (const effect of world.effects) if (effect.under) effect.draw(effect.t / effect.dur);

  drawActors();
  drawCooldownRing();
  drawAimLine();

  // air layer
  for (const p of world.projectiles) if (!p.dead) drawProjectile(p);
  for (const zone of world.zones) if (!zone.under) zone.draw(zone);
  for (const effect of world.effects) if (!effect.under) effect.draw(effect.t / effect.dur);
  drawParticles();
  drawTexts();
  drawCombo();
}

/** Castle, wall, enemies and soldiers, sorted by y so nearer things overlap farther ones. */
function drawActors() {
  const actors = [{ y: cy, draw() { drawWall(false); drawCastle(); drawWall(true); } }];
  for (const e of world.enemies) if (!e.dead) actors.push({ y: e.y, draw: () => drawEnemy(e) });
  for (const soldier of world.soldiers) actors.push({ y: soldier.y, draw: () => drawSoldier(soldier) });
  if (S.own.knight && knight.active) actors.push({ y: knight.y, draw: drawKnight });
  for (let i = 0; i < S.archers; i++) {
    const post = archerPost(i, S.archers);
    actors.push({ y: post.y + 6 * U, draw: () => drawArcher(post) });
  }
  actors.sort((a, b) => a.y - b.y);
  for (const actor of actors) actor.draw();
}

/** Ring on the ground around the castle that fills up while the cooldown runs. */
function drawCooldownRing() {
  const ready = combat.cooldownMax ? 1 - Math.max(0, combat.cooldown) / combat.cooldownMax : 1;
  const ringPath = (from, to) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy + 11 * U, 32 * U, 14 * U, 0, from, to);
    ctx.stroke();
  };
  ctx.lineWidth = 4 * U;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(51,40,58,.35)';
  ringPath(0, TAU);
  ctx.strokeStyle = ready >= 1 ? '#f5b93a' : '#fff6df';
  ringPath(-PI / 2, -PI / 2 + TAU * ready);
  ctx.lineCap = 'butt';
}

/**
 * Dashed line from the castle through the finger to the screen edge, for
 * weapons that are thrown from the castle (WEAPONS[id].aimLine). Only while a
 * finger rests on the field.
 */
function aimLine() {
  const point = session.holdPoint;
  if (!point || !WEAPONS[S.active].aimLine) return null;
  const angle = atan2(point.y - cy, point.x - cx), reach = Math.max(W, H) * 1.5;
  return {
    x1: cx + cos(angle) * 16 * U, y1: cy + sin(angle) * 16 * U,
    x2: cx + cos(angle) * reach, y2: cy + sin(angle) * reach,
    fingerX: point.x, fingerY: point.y,
  };
}

function drawAimLine() {
  const line = aimLine();
  if (!line) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.setLineDash([7 * U, 7 * U]);
  ctx.lineDashOffset = -session.time * 40 * U;   // the dashes run away from the castle
  for (const [color, width] of [['rgba(20,24,33,.45)', 4.5], ['rgba(255,255,255,.85)', 2]]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width * U;
    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(255,255,255,.85)';   // small ring under the finger
  ctx.lineWidth = 2 * U;
  ctx.beginPath();
  ctx.arc(line.fingerX, line.fingerY, 9 * U, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawParticles() {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    fillCircle(ctx, p.x, p.y, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawTexts() {
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  for (const text of world.texts) {
    ctx.globalAlpha = Math.max(0, 1 - text.t / textLifetime(text));
    ctx.font = `${(text.big ? 19 : 14) * U}px ${DISPLAY_FONT}`;
    ctx.lineWidth = 3 * U;
    ctx.strokeStyle = INK;
    ctx.strokeText(text.text, text.x, text.y);
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, text.x, text.y);
  }
  ctx.globalAlpha = 1;
}

/** Kill streak counter ("×23") below the top bar, shown from 5 kills in a row. */
function drawCombo() {
  if (combo.count < 5) return;
  const label = '×' + combo.count, scale = 1 + combo.punch * 0.35;
  ctx.save();
  ctx.translate(cx, 182);
  ctx.scale(scale, scale);
  ctx.font = `${22 * U}px ${DISPLAY_FONT}`;
  ctx.globalAlpha = Math.min(1, combo.timer * 2);
  ctx.lineWidth = 4 * U;
  ctx.strokeStyle = INK;
  ctx.strokeText(label, 0, 0);
  ctx.fillStyle = combo.count >= 50 ? '#ff7a4a' : combo.count >= 20 ? '#ffd24a' : '#fff6df';
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

/* ---------- Input ---------- */

const pointerPos = ev => {
  const rect = canvas.getBoundingClientRect();
  return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
};

// Field: tap to attack, keep the finger down for auto-fire at the finger's position.
canvas.addEventListener('pointerdown', ev => {
  ev.preventDefault();
  if (session.paused) return;
  session.holdPoint = pointerPos(ev);
  attack(session.holdPoint.x, session.holdPoint.y, true);
});
canvas.addEventListener('pointermove', ev => {
  if (session.holdPoint) session.holdPoint = pointerPos(ev);
});
for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
  canvas.addEventListener(type, () => { session.holdPoint = null; });
}
game.addEventListener('contextmenu', ev => ev.preventDefault());   // no browser menu on long press

// Weapon buttons: tap selects, a long press (450 ms) opens the ability overview instead.
let longPressTimer = 0, longPressFired = false;
for (const button of document.querySelectorAll('.wp')) {
  const id = button.dataset.w;
  button.addEventListener('pointerdown', () => {
    longPressFired = false;
    clearTimeout(longPressTimer);
    longPressTimer = setTimeout(() => {
      longPressFired = true;
      openAbilities(id);
    }, 450);
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
    button.addEventListener(type, () => clearTimeout(longPressTimer));
  }
  button.addEventListener('click', () => {
    if (longPressFired) { longPressFired = false; return; }   // the click that ends a long press
    selectWeapon(id);
  });
}

/* ---------- Layout and start-up ---------- */

/** Recomputes the view metrics (see 01-core.js) and the ground for the current screen size. */
function resize() {
  const rect = game.getBoundingClientRect();
  W = Math.max(200, rect.width);
  H = Math.max(300, rect.height);
  DPR = Math.min(2.5, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  const barHeight = $('bar').offsetHeight || 80;
  U = clamp(Math.min(W, H - barHeight) / 400, 0.75, 1.7);
  cx = W / 2;
  cy = 96 + (H - barHeight - 112) / 2;   // centred between the top bar and the weapon bar
  makeGround();
}
addEventListener('resize', resize);

let lastFrameTime = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000 || 0);   // clamp long pauses (tab in background)
  lastFrameTime = now;
  // x2 speed runs the simulation twice per frame instead of doubling dt, which keeps collisions exact
  for (let i = 0; i < DB.opts.speed && !session.paused; i++) update(dt);
  draw();
  requestAnimationFrame(frame);
}

resize();
drawWeaponIcons();
buildWave();
renderHud();
showMenu();
setInterval(save, 5000);
requestAnimationFrame(frame);
