/*
 * What defends the castle besides the player's weapon:
 *   wall and castle   take the hits of enemies that get through (wallHit, castleHit)
 *   soldiers          walk out of the gate, hold enemies up, die after a few hits
 *   archers           stand on the wall ring and shoot on their own (up to 10)
 *   knight            rides around the castle and charges close enemies; immortal
 * All of them are bought in the shop (see 31-shop.js).
 */

/** An enemy reached the wall: it loses one hit point. */
function wallHit(x, y, damage = 1) {
  sound(160, 0.12, 'square', 0.05, -60);
  vibrate(25);
  S.wallHp = Math.max(0, S.wallHp - damage);
  session.shake = Math.max(session.shake, 4);
  puff(x, y, '#b9b4ad', 7);
  renderHud();
  if (S.wallHp <= 0) {
    puff(cx, wallCenterY(), '#b9b4ad', 30);
    toast('Die Mauer ist gefallen');
  }
}

/** An enemy reached the castle: it loses one life; at zero the battle is lost. */
function castleHit(damage = 1) {
  sound(90, 0.2, 'sawtooth', 0.07);
  vibrate(60);
  castle.hp = Math.max(0, castle.hp - damage);
  castle.flash = 0.3;
  session.shake = Math.max(session.shake, 10);
  puff(cx, cy, '#efe7d4', 8);
  renderHud();
  if (castle.hp <= 0) castle.fallen = true;   // handled at the end of update(), see 40-main.js
}

/* ---------- Soldiers ---------- */

const SOLDIER_RADIUS = () => 5.5 * U;
const SOLDIER_HIT_INTERVAL = 0.8;    // seconds between a soldier's hits
const ENEMY_HIT_INTERVAL = 1.2;      // seconds between an enemy's hits on a soldier

function spawnSoldier() {
  world.soldiers.push({
    x: cx, y: cy + 13 * U,           // the castle gate
    hp: soldierHp(), maxHp: soldierHp(),   // 3 hits, 5 with the armour upgrade
    attackCd: 0,
    flash: 0, swing: 0,              // hit flash and sword swing, seconds
    walking: false, facing: 1,       // facing: 1 = right, -1 = left
    phase: rnd(TAU),
    guardAngle: rnd(0.25, PI - 0.25),   // where he waits in front of the castle when idle
  });
}

/** Soldier damage is deliberately tiny: they are there to hold enemies up, not to kill. */
const soldierDamage = () => 2 * (1 + 0.15 * (S.wave - 1));

function updateSoldiers(dt) {
  if (S.own.soldier) {
    session.soldierTimer -= dt;
    if (session.soldierTimer <= 0) {
      session.soldierTimer = SOLDIER_INTERVALS[S.solLv];
      if (world.soldiers.length < soldierCap()) spawnSoldier();
    }
  }

  for (const soldier of world.soldiers) {
    soldier.flash -= dt;
    soldier.attackCd -= dt;
    soldier.swing -= dt;
    soldier.walking = false;

    const enemy = nearestEnemy(soldier.x, soldier.y, 260 * U);
    if (!enemy) {
      walkToGuardPost(soldier, dt);
      continue;
    }
    soldier.facing = enemy.x < soldier.x ? -1 : 1;
    const gap = dist(soldier.x, soldier.y, enemy.x, enemy.y);
    if (gap > enemy.r + SOLDIER_RADIUS() + 2 * U) {
      moveTowards(soldier, enemy.x, enemy.y, 48 * U * dt);
      continue;
    }
    // In contact: the enemy stops walking and trades blows with the soldier.
    if (enemy.freeze <= 0 && enemy.stun <= 0) {
      enemy.blocked = 0.15;   // refreshed every frame while in contact
      if (enemy.attackCd <= 0) {
        enemy.attackCd = ENEMY_HIT_INTERVAL;
        soldier.hp -= enemy.club ? 2 : 1;          // clubs hit twice as hard and throw the soldier back
        soldier.flash = 0.15;
        if (enemy.club) {
          const away = atan2(soldier.y - enemy.y, soldier.x - enemy.x);
          soldier.x += cos(away) * 14 * U;
          soldier.y += sin(away) * 14 * U;
        }
        puff(soldier.x, soldier.y - 6 * U, '#cfe3ff', 4);
      }
    }
    if (soldier.attackCd <= 0) {
      soldier.attackCd = SOLDIER_HIT_INTERVAL;
      soldier.swing = 0.2;
      hurt(enemy, soldierDamage(), { weapon: 'soldier', color: '#cfe3ff' });
    }
  }
  world.soldiers = world.soldiers.filter(soldier => soldier.hp > 0);
}

/* ---------- Archers on the wall ---------- */

const ARCHER_INTERVAL_S = 1.5;       // seconds between two shots of one archer
const ARCHER_DAMAGE_SHARE = 0.35;    // each shot: this share of a hit of the weapon in hand
const ARCHER_REACH = () => 300 * U;

/** Where archer `i` of `n` stands: spread evenly on the wall ring, the first one in front of the gate. */
function archerPost(i, n) {
  const angle = PI / 2 + i * TAU / n;
  return { x: cx + cos(angle) * wallRadiusX() * 0.92, y: wallCenterY() + sin(angle) * wallRadiusY() * 0.92 - 6 * U, angle };
}

/** Archers bought in the shop shoot the enemy nearest to them on their own. */
function updateArchers(dt) {
  const n = S.archers, timers = session.archerTimers;
  // new archers start staggered so they do not all fire at once
  while (timers.length < n) timers.push(0.3 + (timers.length * ARCHER_INTERVAL_S) / Math.max(1, n));
  timers.length = n;
  for (let i = 0; i < n; i++) {
    timers[i] -= dt;
    if (timers[i] > 0) continue;
    const post = archerPost(i, n);
    const target = nearestEnemy(post.x, post.y, ARCHER_REACH());
    if (!target) continue;             // stay ready and shoot as soon as someone comes close
    timers[i] = ARCHER_INTERVAL_S;
    addProjectile({
      kind: 'archerArrow', x: post.x, y: post.y - 4 * U, angle: atan2(target.y - post.y, target.x - post.x), speed: 520 * U, r: 6 * U,
      dmg: damageOf(S.active) * ARCHER_DAMAGE_SHARE,   // scales with the player's weapon
      life: 1.2, source: { weapon: 'archer', color: '#e8e0ff' },
    });
  }
}

PROJECTILE_KINDS.archerArrow = {
  onHit(p) { p.dead = true; },
  draw(p, angle) { drawArrow(ctx, p.x, p.y, angle, 16 * U, '#d9ccff', '#eef4ff'); },
};

/** Small archer figure in green with a bow, facing outwards. */
function drawArcher(post) {
  const u = U * 0.75, side = cos(post.angle) >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(post.x, post.y);
  ctx.scale(side, 1);
  ctx.lineWidth = 1.5 * u;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#3f8f52';          // tunic
  ctx.beginPath();
  ctx.roundRect(-4.5 * u, -3 * u, 9 * u, 8 * u, 2.5 * u);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd9b3';          // head
  fillCircle(ctx, 0, -7 * u, 3.8 * u);
  ctx.beginPath();
  ctx.arc(0, -7 * u, 3.8 * u, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = '#2f6f3f';          // hood
  ctx.beginPath();
  ctx.arc(0, -7.6 * u, 4.2 * u, PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  drawBow(ctx, post.x + side * 5 * u, post.y - 2 * u, side > 0 ? 0 : PI, 6 * u);
}

/* ---------- Knight on horseback ---------- */

/*
 * The knight (shop, 300 gold) rides circles around the castle. When an enemy
 * comes close to the castle he charges it, tramples everything in his way and
 * returns to his circle. He never leaves the castle's surroundings and cannot
 * be hurt.
 */
const KNIGHT = {
  circle: 78,        // radius of his patrol circle, in U
  alarm: 150,        // enemies closer than this to the castle are charged
  leash: 175,        // he never rides further from the castle than this
  patrolSpeed: 95,   // U per second
  chargeSpeed: 230,
  hitRadius: 15,
  hitDelay: 0.6,     // seconds before the same enemy can be trampled again
  damageShare: 1.2,  // per trample: this share of a hit of the weapon in hand
};
const knight = { x: 0, y: 0, angle: PI / 2, facing: 1, hops: 0, charging: false, active: false };

function resetKnight() {
  knight.angle = PI / 2;
  knight.x = cx;
  knight.y = cy + KNIGHT.circle * U * 0.85;
  knight.active = false;
}

function updateKnight(dt) {
  if (!S.own.knight) return;
  if (!knight.active) { resetKnight(); knight.active = true; }
  const target = nearestEnemyToCastle(KNIGHT.alarm * U);
  let goalX, goalY, speed;
  if (target) {
    goalX = target.x; goalY = target.y; speed = KNIGHT.chargeSpeed;
  } else {
    // patrol: keep moving the point on the circle ahead of him
    knight.angle += KNIGHT.patrolSpeed / KNIGHT.circle * dt;
    goalX = cx + cos(knight.angle) * KNIGHT.circle * U;
    goalY = cy + sin(knight.angle) * KNIGHT.circle * U * 0.85;
    speed = KNIGHT.patrolSpeed;
  }
  knight.charging = !!target;
  const d = dist(knight.x, knight.y, goalX, goalY);
  if (d > 1) {
    const step = Math.min(d, speed * U * dt);
    knight.facing = goalX < knight.x ? -1 : 1;
    knight.x += (goalX - knight.x) / d * step;
    knight.y += (goalY - knight.y) / d * step;
  }
  // stay on the leash
  const fromCastle = dist(knight.x, knight.y, cx, cy), leash = KNIGHT.leash * U;
  if (fromCastle > leash) {
    knight.x = cx + (knight.x - cx) / fromCastle * leash;
    knight.y = cy + (knight.y - cy) / fromCastle * leash;
  }
  if (!target) knight.angle = atan2((knight.y - cy) / 0.85, knight.x - cx);   // rejoin the circle where he is
  knight.hops += dt * (knight.charging ? 16 : 10);
  trample();
}

/** Closest living enemy to the castle within `range`. */
function nearestEnemyToCastle(range) {
  let best = null, bestDist = range;
  for (const e of world.enemies) {
    if (e.dead) continue;
    const d = dist(e.x, e.y, cx, cy);
    if (d < bestDist) { bestDist = d; best = e; }
  }
  return best;
}

function trample() {
  const damage = damageOf(S.active) * KNIGHT.damageShare;
  for (const e of world.enemies) {
    if (e.dead || e.knightCd > session.time || dist(knight.x, knight.y, e.x, e.y) >= KNIGHT.hitRadius * U + e.r) continue;
    e.knightCd = session.time + KNIGHT.hitDelay;
    knockback(e, 160);
    hurt(e, damage, { weapon: 'knight', color: '#ffe9b0' });
  }
}

/** Knight in silver armour with a red plume on a brown horse, galloping. */
function drawKnight() {
  const u = U * 0.9, gallop = sin(knight.hops), x = knight.x, y = knight.y - Math.abs(gallop) * 2 * u;
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  fillEllipse(ctx, knight.x, knight.y + 8 * u, 15 * u, 4 * u);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(knight.facing, 1);
  ctx.lineWidth = 1.6 * u;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // legs
  ctx.strokeStyle = '#5a3a22';
  ctx.lineWidth = 2.4 * u;
  ctx.beginPath();
  for (const [lx, ph] of [[-8, 1], [-5, -1], [6, -1], [9, 1]]) {
    ctx.moveTo(lx * u, 2 * u);
    ctx.lineTo(lx * u + gallop * ph * 3 * u, 9 * u);
  }
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6 * u;
  // horse body, neck, head, tail
  ctx.fillStyle = '#8a5a34';
  ctx.beginPath();
  ctx.ellipse(0, 0, 12 * u, 5.5 * u, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8 * u, -2 * u);
  ctx.lineTo(13 * u, -10 * u);
  ctx.lineTo(18 * u, -8 * u);
  ctx.lineTo(16 * u, -5 * u);
  ctx.lineTo(11 * u, 2 * u);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3a2618';
  ctx.beginPath();
  ctx.moveTo(-11 * u, -2 * u);
  ctx.quadraticCurveTo(-17 * u, -1 * u + gallop * 2 * u, -16 * u, 6 * u);
  ctx.lineTo(-12 * u, 1 * u);
  ctx.fill();
  ctx.fillRect(10 * u, -11 * u, 3 * u, 6 * u);   // mane
  // rider: armour, helmet, plume, lance
  ctx.fillStyle = '#c9d1dc';
  ctx.beginPath();
  ctx.roundRect(-4 * u, -14 * u, 8 * u, 10 * u, 2.5 * u);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -17 * u, 4 * u, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.fillRect(0.5 * u, -18 * u, 3.5 * u, 1.2 * u);   // visor slit
  ctx.fillStyle = '#e2574c';
  ctx.beginPath();
  ctx.moveTo(-1 * u, -21 * u);
  ctx.quadraticCurveTo(-7 * u, -24 * u, -8 * u, -17 * u);
  ctx.quadraticCurveTo(-4 * u, -20 * u, -1 * u, -19 * u);
  ctx.fill();
  ctx.strokeStyle = '#7a5530';
  ctx.lineWidth = 2 * u;
  ctx.beginPath();
  const lance = knight.charging ? 0.05 : -0.45;
  ctx.moveTo(-2 * u, -8 * u);
  ctx.lineTo(-2 * u + cos(lance) * 26 * u, -8 * u + sin(lance) * 26 * u);
  ctx.stroke();
  ctx.fillStyle = '#e2574c';   // shield
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6 * u;
  ctx.beginPath();
  ctx.arc(-4 * u, -8 * u, 3.6 * u, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function walkToGuardPost(soldier, dt) {
  const postX = cx + cos(soldier.guardAngle) * 64 * U;
  const postY = cy + 20 * U + sin(soldier.guardAngle) * 34 * U;
  if (dist(soldier.x, soldier.y, postX, postY) <= 3 * U) return;
  soldier.facing = postX < soldier.x ? -1 : 1;
  moveTowards(soldier, postX, postY, 40 * U * dt);
}

function moveTowards(soldier, x, y, step) {
  const d = dist(soldier.x, soldier.y, x, y) || 1;
  soldier.x += (x - soldier.x) / d * step;
  soldier.y += (y - soldier.y) / d * step;
  soldier.walking = true;
}
