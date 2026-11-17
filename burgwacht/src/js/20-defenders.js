/*
 * What defends the castle besides the player's weapon: the wall, the castle's
 * own lives and the little soldiers.
 */

/** An enemy reached the wall: it loses one hit point. */
function wallHit(x, y) {
  sound(160, 0.12, 'square', 0.05, -60);
  vibrate(25);
  S.wallHp--;
  session.shake = Math.max(session.shake, 4);
  puff(x, y, '#b9b4ad', 7);
  renderHud();
  if (S.wallHp <= 0) {
    puff(cx, wallCenterY(), '#b9b4ad', 30);
    toast('Die Mauer ist gefallen');
  }
}

/** An enemy reached the castle: it loses one life; at zero the battle is lost. */
function castleHit() {
  sound(90, 0.2, 'sawtooth', 0.07);
  vibrate(60);
  castle.hp--;
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
        soldier.hp--;
        soldier.flash = 0.15;
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

/* ---------- Tower archer ---------- */

const TOWER_INTERVAL = 1.5;          // seconds between shots
const TOWER_RANGE = () => 300 * U;

/** Shop upgrade: an archer on the keep shoots the nearest enemy on his own. */
function updateTowerArcher(dt) {
  if (!S.own.tower) return;
  session.towerTimer -= dt;
  if (session.towerTimer > 0) return;
  const target = nearestEnemy(cx, cy, TOWER_RANGE());
  if (!target) return;                       // stay ready and shoot as soon as someone comes close
  session.towerTimer = TOWER_INTERVAL;
  const fromY = cy - 50 * U * CASTLE_SCALE;
  addProjectile({
    kind: 'towerBolt', x: cx, y: fromY, angle: atan2(target.y - fromY, target.x - cx), speed: 520 * U, r: 6 * U,
    dmg: damageOf(S.active) * 0.5,           // half a hit of the weapon in hand, so he scales with the player
    life: 1.2, source: { weapon: 'tower', color: '#e8e0ff' },
  });
}

PROJECTILE_KINDS.towerBolt = {
  onHit(p) { p.dead = true; },
  draw(p, angle) { drawArrow(ctx, p.x, p.y, angle, 16 * U, '#d9ccff', '#eef4ff'); },
};

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
