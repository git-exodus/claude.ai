/*
 * Morning star: slow, heavy area hits at the tapped point.
 */

const STAR_SOURCE = { weapon: 'star', color: '#ffd9a0' };
const STAR_DOT = { weapon: 'star', dot: true };

/**
 * The impact itself, used by the attack and by the twin star.
 * Includes lvl 5 shockwave, lvl 15 stun and lvl 25 spikes. Returns the hit radius.
 */
function starSlam(x, y, share) {
  const level = S.lv.star;
  const damage = damageOf('star') * share;
  const radius = 60 * U * (1 + level * 0.003);

  addEffect(0.3, k => {
    ctx.globalAlpha = 1 - k * k;
    drawBall(ctx, x, y - 10 * U, 20 * U * (1.25 - 0.25 * Math.min(1, k * 4)), k * 2);
    ctx.globalAlpha = 1;
  });
  areaDamage(x, y, radius, damage, STAR_SOURCE, e => {
    if (level >= 15) e.stun = Math.max(e.stun, 1);
  });
  ring(x, y, radius, '255,217,160', 0.35, true);
  session.shake = Math.max(session.shake, 7);
  puff(x, y, '#c9a877', 10);

  if (level >= 5) {
    for (const e of world.enemies) {
      if (!e.dead && dist(x, y, e.x, e.y) < radius * 1.8 + e.r) knockback(e, 170);
    }
    ring(x, y, radius * 1.8, '255,255,255', 0.5, true);
  }
  if (level >= 25) {
    for (let i = 0; i < 8; i++) {
      addProjectile({
        kind: 'spike', x, y, angle: i * TAU / 8 + 0.39, speed: 330 * U, r: 7 * U,
        dmg: damage * 0.4, life: 0.7, pierce: 1, source: STAR_SOURCE,
      });
    }
  }
  return radius;
}

/** Ball that rolls a fixed distance through enemies; `splits` makes it break into three at the end. */
function rollBall(x, y, angle, { speed, r, dmg, range, splits }) {
  addProjectile({
    kind: 'ball', x, y, angle, speed, r, dmg, range, splits,
    travelled: 0, life: 5, pierce: 99, heavy: true, source: STAR_SOURCE,
  });
}

/* ---------- Abilities ---------- */

/** Lvl 60: a black hole pulls enemies to the impact point for 0.9 s (max. 3). */
function starBlackHole(a) {
  if (zoneCount('blackHole') >= 3) return;
  const { x, y } = a;
  addZone({
    tag: 'blackHole', dur: 0.9, under: true,
    update(zone, dt) {
      for (const e of world.enemies) {
        if (e.dead) continue;
        const d = dist(x, y, e.x, e.y);
        if (d >= 170 * U || d <= 6) continue;
        const step = (e.boss ? 35 : 110) * U * dt / d;
        e.x += (x - e.x) * step;
        e.y += (y - e.y) * step;
      }
    },
    draw(zone) {
      const alpha = zoneFade(zone, 6, 5);
      const hole = ctx.createRadialGradient(x, y, 2, x, y, 70 * U);
      hole.addColorStop(0, `rgba(20,8,40,${0.85 * alpha})`);
      hole.addColorStop(1, 'rgba(60,20,110,0)');
      ctx.fillStyle = hole;
      fillCircle(ctx, x, y, 70 * U);
      ctx.strokeStyle = `rgba(190,140,255,${0.7 * alpha})`;
      ctx.lineWidth = 2 * U;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x, y, (22 + i * 16) * U, zone.t * 9 + i * 2, zone.t * 9 + i * 2 + 2.2);
        ctx.stroke();
      }
    },
  });
}

/** Lvl 30: a second, wider impact; it waits for the black hole when that is unlocked. */
function starAftershock(a) {
  const { x, y } = a;
  after(a.level >= 60 ? 1 : 0.5, () => {
    areaDamage(x, y, a.radius * 1.3, a.damage * 0.5, STAR_SOURCE);
    ring(x, y, a.radius * 1.3, '255,190,120', 0.45, true);
    session.shake = Math.max(session.shake, 6);
    puff(x, y, '#c9a877', 8);
  });
}

/** Lvl 40: the ground burns for 4 s (max. 6 patches). */
function starBurningGround(a) {
  if (zoneCount('burningGround') >= 6) return;
  const { x, y, radius } = a;
  addZone({
    tag: 'burningGround', dur: 4, under: true, tick: 0,
    update(zone, dt) {
      zone.tick += dt;
      if (zone.tick < 0.5) return;
      zone.tick = 0;
      areaDamage(x, y, radius, a.damage * 0.2, STAR_DOT);
    },
    draw(zone) {
      const alpha = zoneFade(zone, 4, 2);
      const glow = ctx.createRadialGradient(x, y, 2, x, y, radius);
      glow.addColorStop(0, `rgba(255,200,60,${0.55 * alpha})`);
      glow.addColorStop(0.7, `rgba(240,90,30,${0.4 * alpha})`);
      glow.addColorStop(1, 'rgba(240,90,30,0)');
      ctx.fillStyle = glow;
      fillEllipse(ctx, x, y, radius, radius * 0.8);
      for (let i = 0; i < 6; i++) {   // rising sparks
        const q = i * 1.05 + 1, rise = (zone.t * 1.6 + i * 0.37) % 1;
        ctx.fillStyle = `rgba(255,${150 + i * 15},40,${alpha * (1 - rise)})`;
        fillCircle(ctx, x + cos(q * 2.3) * radius * 0.6, y + sin(q * 1.7) * radius * 0.4 - rise * 22 * U, (5 - 3 * rise) * U);
      }
    },
  });
}

/** Lvl 50: the ball swings once around the castle on its chain. */
function starChainSwing(a) {
  addZone({
    dur: 0.8, struck: new Set(),
    update(zone) {
      zone.angle = a.angle + zone.t / zone.dur * TAU;
      zone.x = cx + cos(zone.angle) * 120 * U;
      zone.y = cy + sin(zone.angle) * 120 * U * 0.85;
      for (const e of world.enemies) {
        if (e.dead || zone.struck.has(e) || dist(zone.x, zone.y, e.x, e.y) >= 22 * U + e.r) continue;
        zone.struck.add(e);
        knockback(e, 140);
        hurt(e, a.damage, STAR_SOURCE);
      }
    },
    draw(zone) {
      if (zone.x === undefined) return;
      ctx.strokeStyle = '#59606e';
      ctx.lineWidth = 3 * U;
      ctx.setLineDash([5 * U, 4 * U]);
      ctx.beginPath();
      ctx.moveTo(cx, cy - 20 * U);
      ctx.lineTo(zone.x, zone.y);
      ctx.stroke();
      ctx.setLineDash([]);
      drawBall(ctx, zone.x, zone.y, 16 * U, zone.angle * 3);
    },
  });
}

/** Lvl 80: a fissure tears from the impact to the screen edge. */
function starFissure(a) {
  const { x, y, angle } = a;
  const length = 640 * U;
  const endX = x + cos(angle) * length, endY = y + sin(angle) * length;
  for (const e of world.enemies) {
    if (!e.dead && distToSegment(e.x, e.y, x, y, endX, endY) < 16 * U + e.r) hurt(e, a.damage * 1.2, STAR_SOURCE);
  }
  const zigzag = [];
  for (let i = 0; i <= 14; i++) zigzag.push(rnd(-9, 9) * U);
  addEffect(1.4, k => {
    const grown = Math.min(1, k * 6);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = 1 - k * k;
    ctx.lineJoin = 'round';
    for (const [color, width] of [[INK, 9], ['#ff9a3c', 3]]) {   // dark crack with a glowing core
      ctx.strokeStyle = color;
      ctx.lineWidth = width * U * (1 - k * 0.5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let i = 1; i <= 14 * grown; i++) ctx.lineTo(length * i / 14, zigzag[i]);
      ctx.stroke();
    }
    ctx.restore();
  }, { under: true });
}

/** Lvl 90: a second, slightly weaker slam on a random enemy. */
function starTwin(a) {
  after(0.25, () => {
    const alive = world.enemies.filter(e => !e.dead);
    const target = alive.length ? alive[Math.floor(rnd(alive.length))] : null;
    starSlam(target ? target.x : 2 * cx - a.x, target ? target.y : 2 * cy - a.y, 0.8);
  });
}

/** Lvl 100: a meteor hits 0.8 s later and leaves a burning crater (max. 4). */
function starMeteor(a) {
  const { x, y, radius } = a;
  addEffect(0.8, k => {
    const fall = k * k;
    const mx = x + (1 - fall) * 160 * U, my = y - (1 - fall) * 460 * U;
    ctx.fillStyle = `rgba(0,0,0,${0.3 * k})`;
    fillEllipse(ctx, x, y, radius * 2 * k, radius * 1.5 * k);
    ctx.strokeStyle = 'rgba(255,150,40,.7)';
    ctx.lineWidth = 20 * U;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(mx + 50 * U, my - 140 * U);
    ctx.lineTo(mx, my);
    ctx.stroke();
    ctx.lineCap = 'butt';
    drawBall(ctx, mx, my, 34 * U, k * 8);
  });
  after(0.8, () => {
    areaDamage(x, y, radius * 2.2, a.damage * 4, STAR_SOURCE);
    ring(x, y, radius * 2.4, '255,160,60', 0.7);
    ring(x, y, radius * 1.5, '255,255,255', 0.5);
    session.shake = Math.max(session.shake, 18);
    puff(x, y, '#ff9a3c', 24);
    if (zoneCount('crater') >= 4) return;
    addZone({
      tag: 'crater', dur: 5, under: true, tick: 0,
      update(zone, dt) {
        zone.tick += dt;
        if (zone.tick < 0.5) return;
        zone.tick = 0;
        areaDamage(x, y, radius * 1.7, a.damage * 0.3, STAR_DOT);
      },
      draw(zone) {
        const alpha = Math.min(1, zone.dur - zone.t);
        const glow = ctx.createRadialGradient(x, y, 2, x, y, radius * 1.7);
        glow.addColorStop(0, `rgba(40,20,20,${0.75 * alpha})`);
        glow.addColorStop(0.6, `rgba(200,70,20,${0.5 * alpha})`);
        glow.addColorStop(1, 'rgba(255,140,40,0)');
        ctx.fillStyle = glow;
        fillEllipse(ctx, x, y, radius * 1.7, radius * 1.35);
      },
    });
  });
}

/* ---------- Attack ---------- */

WEAPONS.star.attack = function (x, y) {
  const level = S.lv.star;
  const a = { x, y, level, damage: damageOf('star'), angle: atan2(y - cy, x - cx) };

  a.radius = starSlam(x, y, 1);
  if (level >= 60) starBlackHole(a);
  if (level >= 10) rollBall(x, y, a.angle, { speed: 210 * U, r: 18 * U, dmg: a.damage * 0.6, range: 230 * U, splits: level >= 70 });
  if (level >= 30) starAftershock(a);
  if (level >= 40) starBurningGround(a);
  if (level >= 50) starChainSwing(a);
  if (level >= 80) starFissure(a);
  if (level >= 90) starTwin(a);
  if (level >= 100) starMeteor(a);
};

/* ---------- Projectile kinds ---------- */

PROJECTILE_KINDS.spike = {
  onHit(p) {
    if (p.pierce > 0) p.pierce--;
    else p.dead = true;
  },
  draw(p, angle) {
    ctx.fillStyle = '#cfd6de';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5 * U;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(9 * U, 0);
    ctx.lineTo(-6 * U, -4 * U);
    ctx.lineTo(-6 * U, 4 * U);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },
};

PROJECTILE_KINDS.ball = {
  onHit(p, enemy) { knockback(enemy, 130); },
  onExpire(p) {
    if (p.splits) {
      // Lvl 70: break into three smaller balls that roll on
      const angle = atan2(p.vy, p.vx);
      for (const spread of [-0.7, 0, 0.7]) {
        rollBall(p.x, p.y, angle + spread, { speed: p.speed, r: p.r * 0.6, dmg: p.dmg * 0.6, range: 150 * U, splits: false });
      }
      puff(p.x, p.y, '#aab3c0', 8);
    }
    p.dead = true;
  },
  draw(p) {
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    fillEllipse(ctx, p.x, p.y + p.r * 0.7, p.r, p.r * 0.4);
    drawBall(ctx, p.x, p.y - p.r * 0.3, p.r * 0.8, p.travelled / p.r);
  },
};
