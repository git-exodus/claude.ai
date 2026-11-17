/*
 * Projectiles: everything that flies and hits enemies on contact.
 *
 * The generic part (movement, lifetime, collision) is here. What a projectile
 * does when it hits, when it expires and how it looks is defined per kind in
 * PROJECTILE_KINDS; the weapon files register their kinds there:
 *   onHit(p, enemy)   after the damage was dealt; set p.dead = true to remove it
 *   onExpire(p)       lifetime, range or screen edge reached; default: remove
 *   draw(p, angle)    angle is the flight direction
 */
const PROJECTILE_KINDS = {};

/**
 * Adds a projectile. Required: kind, x, y, angle, speed, r (radius), dmg, source.
 * Common options: life (seconds), pierce (extra enemies it passes through),
 * heavy (big things like rolling balls: shield bearers cannot block them).
 * Further fields are kind-specific. `p.hit` holds the enemies already damaged.
 */
function addProjectile(spec) {
  const p = Object.assign({ life: 1.5, pierce: 0, dead: false, hit: new Set() }, spec);
  p.vx = cos(spec.angle) * spec.speed;
  p.vy = sin(spec.angle) * spec.speed;
  world.projectiles.push(p);
  return p;
}

/** Points the projectile at (x, y) without changing its speed. */
function aimProjectile(p, x, y) {
  const angle = atan2(y - p.y, x - p.x);
  p.vx = cos(angle) * p.speed;
  p.vy = sin(angle) * p.speed;
}

function expireProjectile(p) {
  const kind = PROJECTILE_KINDS[p.kind];
  if (kind.onExpire) kind.onExpire(p);
  else p.dead = true;
}

/** Shared "pierce, then bounce to the next enemy, then stop" behaviour of daggers and arrows. */
function pierceOrBounce(p, bounceRange, minLife) {
  if (p.pierce > 0) { p.pierce--; return true; }
  if (p.bounce > 0) {
    const target = nearestEnemy(p.x, p.y, bounceRange, p.hit);
    if (target) {
      p.bounce--;
      aimProjectile(p, target.x, target.y);
      p.life = Math.max(p.life, minLife);
      return true;
    }
  }
  return false;
}

const offScreen = p => p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40;

function updateProjectiles(dt) {
  const list = world.projectiles;
  // Index loop on purpose: hits may add new projectiles to the end of the list.
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (p.dead) continue;
    p.life -= dt;

    if (p.returning) {
      // boomerang daggers fly back to the castle and vanish there
      aimProjectile(p, cx, cy);
      if (dist(p.x, p.y, cx, cy) < 26 * U || p.life <= 0) { p.dead = true; continue; }
    } else if (p.homing) {
      steerTowardsEnemy(p, dt);
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.range !== undefined) {           // rolling balls stop after a distance
      p.travelled += p.speed * dt;
      if (p.travelled >= p.range) { expireProjectile(p); continue; }
    }
    if (!p.returning && (p.life <= 0 || offScreen(p))) {
      expireProjectile(p);
      if (p.dead) continue;
    }

    for (const e of world.enemies) {
      if (e.dead || p.hit.has(e) || dist(p.x, p.y, e.x, e.y) >= p.r + e.r) continue;
      p.hit.add(e);
      hurt(e, p.dmg, p.source, !p.heavy);
      const kind = PROJECTILE_KINDS[p.kind];
      if (kind.onHit) kind.onHit(p, e);
      if (p.dead) break;
    }
  }
}

/** Turns the projectile towards the nearest not-yet-hit enemy, at most 6 rad/s. */
function steerTowardsEnemy(p, dt) {
  const target = nearestEnemy(p.x, p.y, 170 * U, p.hit);
  if (!target) return;
  let heading = atan2(p.vy, p.vx);
  let turn = atan2(target.y - p.y, target.x - p.x) - heading;
  turn = atan2(sin(turn), cos(turn));   // normalise to -PI..PI
  heading += clamp(turn, -6 * dt, 6 * dt);
  p.vx = cos(heading) * p.speed;
  p.vy = sin(heading) * p.speed;
}

function drawProjectile(p) {
  PROJECTILE_KINDS[p.kind].draw(p, atan2(p.vy, p.vx));
}
