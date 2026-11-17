/*
 * Enemies: spawning, damage, death, status effects and movement.
 *
 * Damage always goes through hurt(enemy, amount, source). `source` describes
 * where the damage came from:
 *   weapon   id of the weapon ('soldier' for soldiers)
 *   color    colour of the floating damage number
 *   dot      true for damage over time: no number is shown
 * plus weapon-specific flags that the kill hooks read (splinter, generation, chain).
 * Projectiles pass `viaProjectile`, which is what shield bearers block.
 */

/** Random point just outside the screen: from the castle along a random direction to the edge (+30 px). */
function spawnPoint() {
  const angle = rnd(TAU), dx = cos(angle), dy = sin(angle);
  const toSide = (W / 2 + 30) / Math.abs(dx || 1e-6);
  const toTopOrBottom = ((dy < 0 ? cy : H - cy) + 30) / Math.abs(dy || 1e-6);
  const reach = Math.min(toSide, toTopOrBottom);
  return { x: cx + dx * reach, y: cy + dy * reach };
}

/**
 * Puts one enemy of `type` on the field, scaled for the current world and wave.
 * `at` overrides the position, `mini` makes one of the two halves of a split slime.
 */
function spawnEnemy(type, { at = spawnPoint(), mini = false } = {}) {
  const base = ENEMY_TYPES[type];
  const worldDef = currentWorld(), waveNo = S.wave;
  let hp = worldDef.enemyHp(type, waveNo);
  if (mini) hp *= 0.3;

  const enemy = {
    type,
    boss: type === 'boss',
    shielded: !!base.shielded,
    ranged: !!base.ranged,
    mini,
    lava: S.world === 'lava',                 // selects the lava look in drawEnemy()
    x: at.x, y: at.y,
    r: base.r * U * CASTLE_SCALE * (mini ? 0.62 : 1),
    hp, max: hp,
    sp: base.sp * worldDef.speedFactor(waveNo),   // in U per second
    xp: base.xp * worldDef.xpMult * (mini ? 0.25 : 1),
    color: worldDef.colors[type] || base.color,
    shotCd: 2,                                // ranged only: seconds until the next shot once in range
    phase: rnd(TAU),                          // desynchronises the idle animation
    dead: false,
    flash: 0,                                 // white hit flash, seconds
    knockX: 0, knockY: 0,                     // knockback velocity, decays
    // status effects: remaining seconds
    stun: 0, freeze: 0, slow: 0, blocked: 0,
    poison: 0, poisonDps: 0, poisonTick: 0,
    burn: 0, burnDps: 0, burnTick: 0,
    orbitCd: 0,                               // re-hit delay for things that circle through enemies
    attackCd: 0,                              // delay between hits on a soldier
  };
  world.enemies.push(enemy);
  return enemy;
}

/** Closest living enemy to (x, y) within `maxDist`, skipping those in the `exclude` set. */
function nearestEnemy(x, y, maxDist = 1e9, exclude = null) {
  let best = null, bestDist = maxDist;
  for (const e of world.enemies) {
    if (e.dead || (exclude && exclude.has(e))) continue;
    const d = dist(x, y, e.x, e.y);
    if (d < bestDist) { bestDist = d; best = e; }
  }
  return best;
}

function hurt(enemy, amount, source, viaProjectile = false) {
  if (enemy.dead) return;
  if (enemy.shielded && viaProjectile) {
    amount *= SHIELD_BLOCK;
    if (world.effects.length < FX_CAP_COMMON) ring(enemy.x, enemy.y, enemy.r * 1.4, '200,215,255', 0.18);   // "clank"
  }
  enemy.hp -= amount;
  enemy.flash = 0.12;
  if (!source.dot && world.texts.length < TEXT_CAP) {
    floatText(enemy.x + rnd(-6, 6), enemy.y - enemy.r * 1.7, String(Math.max(1, Math.round(amount))), source.color || '#fff');
  }
  if (enemy.hp <= 0) kill(enemy, source);
}

/** Damages every enemy touching the circle; `onEach(enemy)` runs before the damage. */
function areaDamage(x, y, radius, amount, source, onEach) {
  for (const e of world.enemies) {
    if (e.dead || dist(x, y, e.x, e.y) >= radius + e.r) continue;
    if (onEach) onEach(e);
    hurt(e, amount, source);
  }
}

/** Pushes an enemy away from the castle; bosses are three times heavier. */
function knockback(enemy, force) {
  const angle = atan2(enemy.y - cy, enemy.x - cx);
  const strength = force * U / (enemy.boss ? 3 : 1);
  enemy.knockX += cos(angle) * strength;
  enemy.knockY += sin(angle) * strength;
}

/* Status effects keep the stronger of the old and new value, they never stack. */
function applyBurn(enemy, dps, seconds = 3) {
  enemy.burn = Math.max(enemy.burn, seconds);
  enemy.burnDps = Math.max(enemy.burnDps, dps);
}
function applyPoison(enemy, dps) {
  enemy.poison = 4;
  enemy.poisonDps = Math.max(enemy.poisonDps, dps);
}

/*
 * Weapons register functions here that run whenever an enemy dies:
 * (enemy, source) => void. See the weapon files for the individual hooks.
 */
const KILL_HOOKS = [];

function kill(enemy, source) {
  enemy.dead = true;
  recordKill(enemy);

  // kill streak
  combo.count++;
  combo.timer = 1.5;
  combo.punch = 1;
  if (combo.count % 10 === 0 || enemy.boss) session.shake = Math.max(session.shake, enemy.boss ? 14 : 4);
  if (Math.abs(session.time - session.lastKillSound) > 0.05) {
    session.lastKillSound = session.time;
    sound(420 + Math.min(30, combo.count) * 18, 0.06, 'square', 0.025, 300);   // pitch rises with the streak
  }

  deathEffect(enemy);
  puff(enemy.x, enemy.y, enemy.color, enemy.boss ? 26 : 8);
  gainXp(S.active, enemy.xp);
  for (const hook of KILL_HOOKS) hook(enemy, source);
}

/** The body is flung away from the castle, spins, flattens and fades. */
function deathEffect(enemy) {
  if (world.effects.length >= 220) return;
  const angle = atan2(enemy.y - cy, enemy.x - cx) + rnd(-0.6, 0.6);
  const speed = rnd(110, 210) * U, spin = rnd(-8, 8);
  const { x, y, r, color } = enemy;
  addEffect(0.4, k => {
    ctx.save();
    ctx.translate(x + cos(angle) * speed * k * 0.4, y + sin(angle) * speed * k * 0.4 - sin(k * PI) * 20 * U);
    ctx.rotate(spin * k);
    ctx.globalAlpha = 1 - k * k;
    ctx.scale(1 + k * 0.6, 1 - k * 0.6);
    ctx.fillStyle = color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5 * U;
    ctx.beginPath();
    ctx.arc(0, 0, r * (1 - k * 0.3), 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
  ring(enemy.x, enemy.y, enemy.r * 2.4, '255,255,255', 0.22);
}

/** One frame of status effects, movement and castle contact for all enemies. */
function updateEnemies(dt) {
  for (const e of world.enemies) {
    if (e.dead) continue;
    e.flash -= dt;
    e.orbitCd -= dt;
    e.attackCd -= dt;
    e.blocked -= dt;
    e.slow -= dt;
    tickDamageOverTime(e, dt);
    if (e.dead) continue;

    // knockback slides the enemy and fades out
    e.x += e.knockX * dt;
    e.y += e.knockY * dt;
    const decay = Math.exp(-5 * dt);
    e.knockX *= decay;
    e.knockY *= decay;

    // frozen, stunned or held up by a soldier: no walking (or shooting) this frame
    if (e.freeze > 0) e.freeze -= dt;
    else if (e.stun > 0) e.stun -= dt;
    else if (e.blocked <= 0) {
      if (e.ranged && dist(e.x, e.y, cx, cy) <= ARCHER_RANGE * U) shootAtCastle(e, dt);
      else walkToCastle(e, dt);
    }

    e.x = clamp(e.x, -60, W + 60);
    e.y = clamp(e.y, -60, H + 60);
    checkCastleContact(e);
  }
}

function tickDamageOverTime(e, dt) {
  if (e.poison > 0) {
    e.poison -= dt;
    e.poisonTick += dt;
    if (e.poisonTick >= 0.5) {
      e.poisonTick = 0;
      hurt(e, e.poisonDps * 0.5, { weapon: 'dagger', dot: true });
    }
  }
  if (e.burn > 0 && !e.dead) {
    e.burn -= dt;
    e.burnTick += dt;
    if (e.burnTick >= 0.5) {
      e.burnTick = 0;
      hurt(e, e.burnDps * 0.5, { weapon: 'wand', dot: true });
    }
  }
}

function walkToCastle(e, dt) {
  const angle = atan2(cy - e.y, cx - e.x);
  const speed = e.sp * U * (e.slow > 0 ? 0.5 : 1);
  const weave = e.type === 'bat' ? sin(session.time * 4 + e.phase) * 0.7 : 0;   // bats fly in a wavy line
  e.x += (cos(angle) - sin(angle) * weave) * speed * dt;
  e.y += (sin(angle) + cos(angle) * weave) * speed * dt;
}

/** Archers in range stand still and fire a bolt at the castle every ARCHER_INTERVAL seconds. */
function shootAtCastle(e, dt) {
  e.shotCd -= dt;
  if (e.shotCd > 0) return;
  e.shotCd = ARCHER_INTERVAL;
  const fromX = e.x, fromY = e.y - e.r;
  // the bolt lands on the wall while it stands, otherwise on the castle
  const angle = atan2(e.y - wallCenterY(), e.x - cx);
  const toX = S.wallHp > 0 ? cx + cos(angle) * wallRadiusX() : cx;
  const toY = S.wallHp > 0 ? wallCenterY() + sin(angle) * wallRadiusY() : cy - 10 * U;
  const flight = 0.4;
  addEffect(flight, k => {
    const x = fromX + (toX - fromX) * k, y = fromY + (toY - fromY) * k - sin(k * PI) * 14 * U;
    drawArrow(ctx, x, y, atan2(toY - fromY, toX - fromX), 12 * U, '#5b4636', '#33283a');
  });
  after(flight, () => {
    if (S.wallHp > 0) wallHit(toX, toY);
    else castleHit();
  });
}

/** Lava world: a slime that dies breaks into two small ones (which do not split again). */
KILL_HOOKS.push(enemy => {
  if (enemy.type !== 'slime' || enemy.mini || !currentWorld().splitSlimes) return;
  if (world.enemies.length >= MAX_ENEMIES_ALIVE + 60) return;
  for (const side of [-1, 1]) {
    spawnEnemy('slime', { at: { x: enemy.x + side * enemy.r * 0.7, y: enemy.y + rnd(-3, 3) * U }, mini: true });
  }
});

/** An enemy that reaches the wall (while it stands) or the castle deals 1 damage and is gone. */
function checkCastleContact(e) {
  if (S.wallHp > 0) {
    const nx = (e.x - cx) / (wallRadiusX() + e.r);
    const ny = (e.y - wallCenterY()) / (wallRadiusY() + e.r);
    if (nx * nx + ny * ny >= 1) return;
    e.dead = true;
    puff(e.x, e.y, e.color, 6);
    wallHit(e.x, e.y);
  } else if (dist(e.x, e.y, cx, cy) < castleRadius() + e.r) {
    e.dead = true;
    puff(e.x, e.y, e.color, 6);
    castleHit();
  }
}
