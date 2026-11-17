/*
 * Daggers: fast throws from the castle towards the tapped point, later with
 * poison, bounces and chain reactions.
 */

const DAGGER_COLOR = '#c9f7e4';
const POISON_SHARE = 0.35;   // poison damage per second as a share of the dagger's hit damage

/**
 * Throws one dagger.
 *   opts.share       damage multiplier
 *   opts.minor       a spawned dagger (split or chain): no pierce, split or boomerang
 *   opts.chain       spawned by the lvl-100 chain reaction: full size, bounces once
 *   opts.generation  chain depth, limits the chain reaction
 */
function throwDagger(x, y, angle, opts = {}) {
  const level = S.lv.dagger;
  const main = !opts.minor;
  return addProjectile({
    kind: 'dagger', x, y, angle, speed: 420 * U, r: 8 * U,
    dmg: (opts.share || 1) * damageOf('dagger'),
    life: opts.life || 1.4,
    pierce: main && level >= 15 ? 1 : 0,
    bounce: main ? (level >= 10 ? 2 : 0) : (opts.chain ? 1 : 0),
    splits: main && level >= 40,
    boomerang: main && level >= 50,
    homing: level >= 80,
    scale: main || opts.chain ? 1 : 0.7,
    source: { weapon: 'dagger', generation: opts.generation || 0, color: DAGGER_COLOR },
  });
}

/* ---------- Abilities ---------- */

/** Lvl 1/5: one dagger or a fan of three, thrown from the castle. */
function daggerVolley(angle, share) {
  const count = S.lv.dagger >= 5 ? 3 : 1;
  for (let i = 0; i < count; i++) {
    throwDagger(cx + cos(angle) * 16 * U, cy + sin(angle) * 16 * U, angle + (i - (count - 1) / 2) * 0.2, { share });
  }
}

/** Lvl 30: a shadow clone throws a second volley at the enemy closest to the castle. */
function daggerShadowClone(a) {
  after(0.25, () => {
    const target = nearestEnemy(cx, cy);
    const angle = target ? atan2(target.y - cy, target.x - cx) : a.angle + PI;
    daggerVolley(angle, 0.7);
    const x = cx + cos(angle) * 34 * U, y = cy + sin(angle) * 34 * U;
    addEffect(0.5, k => {
      ctx.fillStyle = `rgba(60,40,90,${0.7 * (1 - k)})`;
      fillCircle(ctx, x, y - 14 * U, 8 * U);
      ctx.beginPath();
      ctx.moveTo(x - 11 * U, y + 8 * U);
      ctx.quadraticCurveTo(x, y - 22 * U, x + 11 * U, y + 8 * U);
      ctx.fill();
    });
  });
}

/** Lvl 70: a dagger stuck in the ground at the tap point; the first enemy to step on it is hit hard. */
function daggerTrap(a) {
  const traps = world.zones.filter(zone => zone.tag === 'daggerTrap');
  if (traps.length >= 6) traps[0].t = Infinity;   // at most 6 traps: the oldest one goes
  const { x, y } = a;
  addZone({
    tag: 'daggerTrap', dur: 25, under: true,
    update(zone) {
      for (const e of world.enemies) {
        if (e.dead || dist(x, y, e.x, e.y) >= 14 * U + e.r) continue;
        if (a.level >= 25) applyPoison(e, a.damage * POISON_SHARE);
        hurt(e, a.damage * 2.5, { weapon: 'dagger', color: DAGGER_COLOR });
        ring(x, y, 30 * U, '201,247,228', 0.3);
        zone.t = Infinity;
        break;
      }
    },
    draw() {
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      fillEllipse(ctx, x, y + 2 * U, 9 * U, 4 * U);
      drawSword(ctx, x, y - 20 * U, PI / 2, 22 * U, DAGGER_BLADE, DAGGER_GRIP);
    },
  });
}

/** Lvl 90: a ring of spinning daggers at the tap point for 2 s (max. 3). */
function daggerWhirl(a) {
  if (zoneCount('daggerWhirl') >= 3) return;
  const { x, y } = a;
  addZone({
    tag: 'daggerWhirl', dur: 2, tick: 0.2,
    update(zone, dt) {
      zone.tick += dt;
      if (zone.tick < 0.2) return;
      zone.tick = 0;
      areaDamage(x, y, 58 * U, a.damage * 0.3, { weapon: 'dagger', color: DAGGER_COLOR }, e => {
        if (a.level >= 25) applyPoison(e, a.damage * POISON_SHARE);
      });
    },
    draw(zone) {
      ctx.globalAlpha = zoneFade(zone, 5, 3);
      for (let i = 0; i < 6; i++) {
        const g = zone.t * 11 + i * TAU / 6;
        drawSword(ctx, x + cos(g) * 40 * U, y + sin(g) * 40 * U * 0.85, g + PI / 2, 22 * U, DAGGER_BLADE, DAGGER_GRIP);
      }
      ctx.globalAlpha = 1;
    },
  });
}

/** Lvl 60: a poison cloud that lingers where a poisoned enemy died. */
function poisonCloud(x, y, dps) {
  if (world.zones.length > 40) return;
  const radius = 45 * U;
  addZone({
    dur: 3, under: true, tick: 0.5,
    update(zone, dt) {
      zone.tick += dt;
      if (zone.tick < 0.5) return;
      zone.tick = 0;
      areaDamage(x, y, radius, dps * 0.5, { weapon: 'dagger', dot: true }, e => applyPoison(e, dps));
    },
    draw(zone) {
      const alpha = 0.5 * zoneFade(zone, 5, 2);
      ctx.fillStyle = `rgba(140,210,70,${alpha * 0.5})`;
      for (let i = 0; i < 5; i++) {
        const g = i * 1.26 + zone.t * 0.6;
        fillCircle(ctx, x + cos(g) * radius * 0.4, y + sin(g) * radius * 0.3, radius * 0.6);
      }
    },
  });
}

/* ---------- Attack ---------- */

WEAPONS.dagger.attack = function (x, y) {
  const level = S.lv.dagger;
  const a = { x, y, level, damage: damageOf('dagger'), angle: atan2(y - cy, x - cx) };

  daggerVolley(a.angle, 1);
  if (level >= 30) daggerShadowClone(a);
  if (level >= 70) daggerTrap(a);
  if (level >= 90) daggerWhirl(a);
  // Lvl 10 bounce, 15 pierce, 25 poison, 40 split, 50 boomerang and 80 homing live in the projectile below.
};

/* ---------- Projectile kind and kill hooks ---------- */

PROJECTILE_KINDS.dagger = {
  onHit(p, enemy) {
    if (S.lv.dagger >= 25) applyPoison(enemy, p.dmg * POISON_SHARE);
    if (p.splits && !p.hasSplit) {
      // Lvl 40: the first hit splits off two small daggers
      p.hasSplit = true;
      const angle = atan2(p.vy, p.vx);
      for (const spread of [-0.6, 0.6]) {
        const child = throwDagger(p.x, p.y, angle + spread, { minor: true, share: 0.5, life: 0.5 });
        child.hit.add(enemy);
      }
    }
    if (p.returning) return;                 // on the way back it cuts through everything
    if (pierceOrBounce(p, 220 * U, 0.6)) return;
    expireProjectile(p);
  },
  onExpire(p) {
    if (p.boomerang && !p.returning) {
      // Lvl 50: fly back to the castle and hit everything again
      p.returning = true;
      p.hit.clear();
      p.life = 3;
      return;
    }
    p.dead = true;
  },
  draw(p, angle) {
    const back = 10 * U * p.scale;   // the sprite's origin is the hilt, the hit point is further forward
    drawSword(ctx, p.x - cos(angle) * back, p.y - sin(angle) * back, angle, 24 * U * p.scale, DAGGER_BLADE, DAGGER_GRIP);
  },
};

/** Lvl 25: poison jumps to two neighbours when its carrier dies. Lvl 60: it also leaves a cloud. */
KILL_HOOKS.push(enemy => {
  if (enemy.poison <= 0) return;
  const level = S.lv.dagger;
  if (level >= 25) {
    let spread = 0;
    for (const other of world.enemies) {
      if (spread >= 2) break;
      if (other.dead || other === enemy || dist(other.x, other.y, enemy.x, enemy.y) > 90 * U) continue;
      applyPoison(other, enemy.poisonDps);
      spread++;
    }
  }
  if (level >= 60) poisonCloud(enemy.x, enemy.y, enemy.poisonDps);
});

/** Lvl 100: every dagger kill throws a new dagger at the nearest enemy (up to 4 links deep). */
KILL_HOOKS.push((enemy, source) => {
  if (source.weapon !== 'dagger' || S.lv.dagger < 100) return;
  const generation = source.generation || 0;
  if (generation >= 4 || world.projectiles.length >= 70) return;
  const target = nearestEnemy(enemy.x, enemy.y, 400 * U);
  if (!target) return;
  throwDagger(enemy.x, enemy.y, atan2(target.y - enemy.y, target.x - enemy.x),
    { minor: true, chain: true, generation: generation + 1, share: 0.8, life: 1 });
});
