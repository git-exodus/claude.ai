/*
 * Bow: fast, precise arrows from the castle towards the tapped point.
 */

const BOW_COLOR = '#ffe9b0';
const BOW_SOURCE = { weapon: 'bow', color: BOW_COLOR };
const PROJECTILE_LIMIT = 260;   // arrows and phoenixes are not fired above this many projectiles

/**
 * Shoots one arrow from the castle.
 *   opts.share   damage multiplier
 *   opts.minor   automatic arrow (ghost archer, arrow storm): never critical, bouncing or explosive
 *   opts.giant   the lvl-90 giant arrow: big, flies through everything
 */
function shootArrow(angle, opts = {}) {
  if (world.projectiles.length > PROJECTILE_LIMIT) return;
  const level = S.lv.bow;
  const aimed = !opts.minor && !opts.giant;
  let critical = false;
  if (aimed) {
    combat.bowShots++;
    critical = level >= 15 && combat.bowShots % 4 === 0;   // Lvl 15: every 4th aimed arrow deals triple damage
  }
  addProjectile({
    kind: 'arrow',
    x: cx + cos(angle) * 14 * U, y: cy - 4 * U + sin(angle) * 14 * U,
    angle, speed: (opts.giant ? 520 : 640) * U, r: (opts.giant ? 18 : 6) * U,
    dmg: damageOf('bow') * (opts.share || 1) * (critical ? 3 : 1),
    life: 1.6,
    pierce: opts.giant ? 99 : (level >= 10 ? 2 : 0),
    bounce: aimed && level >= 60 ? 2 : 0,
    explosive: aimed && level >= 40,
    giant: !!opts.giant, heavy: !!opts.giant, critical,
    source: { weapon: 'bow', color: critical ? '#ffe14a' : BOW_COLOR },
  });
}

/* ---------- Abilities ---------- */

/** Lvl 1/30: one arrow or a fan of five. */
function bowVolley(a) {
  if (a.level >= 30) for (let i = -2; i <= 2; i++) shootArrow(a.angle + i * 0.13);
  else shootArrow(a.angle);
}

/** Lvl 50: ten arrows rain on the tap point over one second. */
function bowHail(a) {
  for (let i = 0; i < 10; i++) {
    after(0.1 + i * 0.09, () => {
      const g = rnd(TAU), spread = rnd(0, 50) * U;
      const x = a.x + cos(g) * spread, y = a.y + sin(g) * spread * 0.85;
      addEffect(0.18, k => drawArrow(ctx, x + (1 - k) * 30 * U, y - (1 - k) * 150 * U, 1.77, 20 * U), { cap: FX_CAP_RARE });
      after(0.18, () => {
        areaDamage(x, y, 15 * U, a.damage * 0.7, BOW_SOURCE, e => {
          if (a.level >= 70) e.slow = 2.5;
          if (a.level >= 25) applyBurn(e, a.damage * 0.2);
        });
        ring(x, y, 15 * U, '255,233,176', 0.2, true);
      });
    });
  }
}

/** Lvl 80: a ghost archer on the tower shoots the nearest enemy for 4 s; attacking again extends him. */
function bowGhostArcher() {
  const existing = findZone('ghostArcher');
  if (existing) { existing.dur = existing.t + 4; return; }
  addZone({
    tag: 'ghostArcher', dur: 4, tick: 0,
    update(zone, dt) {
      zone.tick += dt;
      if (zone.tick < 0.35) return;
      zone.tick = 0;
      const target = nearestEnemy(cx, cy, 330 * U);
      if (target) shootArrow(atan2(target.y - cy, target.x - cx), { minor: true, share: 0.6 });
    },
    draw(zone) {
      const alpha = 0.75 * zoneFade(zone, 4, 3);
      const x = cx, y = cy - 52 * U * CASTLE_SCALE - 10 * U;   // just above the keep's roof
      ctx.fillStyle = `rgba(170,220,255,${alpha})`;
      fillCircle(ctx, x, y - 7 * U, 4 * U);
      ctx.beginPath();
      ctx.moveTo(x - 5 * U, y + 6 * U);
      ctx.quadraticCurveTo(x, y - 10 * U, x + 5 * U, y + 6 * U);
      ctx.fill();
      ctx.globalAlpha = alpha;
      drawBow(ctx, x + 5 * U, y - U, 0, 6 * U);
      ctx.globalAlpha = 1;
    },
  });
}

/* ---------- Attack ---------- */

WEAPONS.bow.attack = function (x, y) {
  const level = S.lv.bow;
  const a = { x, y, level, damage: damageOf('bow'), angle: atan2(y - cy, x - cx) };

  bowVolley(a);
  if (level >= 5) after(0.09, () => bowVolley(a));                           // double shot
  if (level >= 50) bowHail(a);
  if (level >= 80) bowGhostArcher();
  if (level >= 90 && combat.attackCount % 3 === 0) shootArrow(a.angle, { giant: true, share: 3 });
  if (level >= 100) {
    for (let i = 0; i < 16; i++) shootArrow(a.angle + (i + 0.5) * TAU / 16, { minor: true, share: 0.7 });   // arrow storm
  }
  // Lvl 10 pierce, 15 critical, 25 fire, 40 explosive, 60 ricochet and 70 frost live in the projectile below.
};

/* ---------- Projectile kind ---------- */

PROJECTILE_KINDS.arrow = {
  onHit(p, enemy) {
    const level = S.lv.bow;
    if (level >= 25) applyBurn(enemy, p.dmg * 0.25);
    if (level >= 70) enemy.slow = 2.5;
    if (p.explosive && !p.hasExploded) {
      p.hasExploded = true;
      areaDamage(p.x, p.y, 30 * U, p.dmg * 0.6, p.source);
      ring(p.x, p.y, 30 * U, '255,200,120', 0.25);
    }
    if (pierceOrBounce(p, 200 * U, 0.5)) return;
    p.dead = true;
  },
  draw(p, angle) {
    const level = S.lv.bow;
    if (p.critical || p.giant) {
      ctx.shadowColor = p.critical ? '#ffe14a' : '#9fd8ff';
      ctx.shadowBlur = 10 * U;
    }
    drawArrow(ctx, p.x, p.y, angle, (p.giant ? 46 : 20) * U, level >= 25 ? '#ffb36b' : '#f3e3c0', level >= 70 ? '#bfe9ff' : '#dfe6ee');
    ctx.shadowBlur = 0;
  },
};
