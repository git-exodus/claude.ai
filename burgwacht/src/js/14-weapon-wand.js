/*
 * Fire wand: fireballs that explode at the tapped point and set enemies on fire.
 */

const WAND_SOURCE = { weapon: 'wand', color: '#ffb36b' };
const WAND_DOT = { weapon: 'wand', dot: true };
const BURN_SHARE = 0.25;   // burn damage per second as a share of the wand's hit damage

/** Explosion: damages everything in `radius`; from lvl 5 it also sets enemies on fire. */
function explode(x, y, radius, damage, source) {
  areaDamage(x, y, radius, damage, source, e => {
    if (S.lv.wand >= 5) applyBurn(e, damageOf('wand') * BURN_SHARE);
  });
  addEffect(0.3, k => {
    const r = radius * (0.55 + 0.6 * k);
    const flash = ctx.createRadialGradient(x, y, 1, x, y, r);
    flash.addColorStop(0, `rgba(255,244,180,${0.95 * (1 - k)})`);
    flash.addColorStop(0.6, `rgba(255,140,40,${0.7 * (1 - k)})`);
    flash.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = flash;
    fillCircle(ctx, x, y, r);
  }, { cap: FX_CAP_RARE });
  if (world.particles.length < 200) puff(x, y, '#ff9a3c', 4);
}

/** A fireball arcs from the keep to (x, y) and explodes there. */
function throwFireball(x, y, radius, damage) {
  const startX = cx, startY = cy - 30 * U * CASTLE_SCALE;
  const flight = clamp(dist(startX, startY, x, y) / (420 * U), 0.12, 0.5);
  addEffect(flight, k => {
    const bx = startX + (x - startX) * k;
    const by = startY + (y - startY) * k - sin(k * PI) * 26 * U;
    ctx.fillStyle = 'rgba(255,150,40,.35)';
    fillCircle(ctx, bx, by, 10 * U);
    drawFlame(ctx, bx, by + 3 * U, 7 * U, k * 30);
  });
  after(flight, () => {
    explode(x, y, radius, damage, WAND_SOURCE);
    session.shake = Math.max(session.shake, 3);
  });
}

/** A burning line on the ground; enemies touching it burn and take `share` of the damage per tick. */
function fireLine(tag, limit, x1, y1, x2, y2, dur, width, share, damage) {
  if (zoneCount(tag) >= limit) return;
  const flames = Math.max(3, Math.round(dist(x1, y1, x2, y2) / (14 * U)));
  addZone({
    tag, dur, under: true, tick: 0.4,
    update(zone, dt) {
      zone.tick += dt;
      if (zone.tick < 0.4) return;
      zone.tick = 0;
      for (const e of world.enemies) {
        if (e.dead || distToSegment(e.x, e.y, x1, y1, x2, y2) >= width + e.r) continue;
        applyBurn(e, damage * BURN_SHARE);
        hurt(e, damage * share, WAND_DOT);
      }
    },
    draw(zone) {
      const alpha = zoneFade(zone, 5, 2);
      ctx.strokeStyle = `rgba(255,110,30,${0.4 * alpha})`;
      ctx.lineWidth = width * 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.globalAlpha = alpha;
      for (let i = 0; i <= flames; i++) {
        const q = i / flames;
        drawFlame(ctx, x1 + (x2 - x1) * q, y1 + (y2 - y1) * q, width * (0.7 + 0.25 * sin(zone.t * 9 + i * 2.1)), zone.t * 12 + i);
      }
      ctx.globalAlpha = 1;
    },
  });
}

/* ---------- Abilities ---------- */

/** Lvl 40: a fire spirit circles the castle for 5 s; attacking again extends it. */
function wandSpirit(a) {
  const existing = findZone('fireSpirit');
  if (existing) { existing.dur = existing.t + 5; return; }
  addZone({
    tag: 'fireSpirit', dur: 5,
    update(zone) {
      const g = zone.t * 3.2;
      zone.x = cx + cos(g) * 78 * U;
      zone.y = cy + sin(g) * 78 * U * 0.85;
      for (const e of world.enemies) {
        if (e.dead || e.orbitCd > 0 || dist(zone.x, zone.y, e.x, e.y) >= 16 * U + e.r) continue;
        e.orbitCd = 0.35;
        applyBurn(e, a.damage * BURN_SHARE);
        hurt(e, a.damage * 0.6, WAND_SOURCE);
      }
    },
    draw(zone) {
      if (zone.x === undefined) return;
      ctx.globalAlpha = zoneFade(zone, 4, 3);
      drawFlame(ctx, zone.x, zone.y, 13 * U, zone.t * 16);
      ctx.fillStyle = INK;   // eyes
      ctx.beginPath();
      ctx.arc(zone.x - 3 * U, zone.y - 2 * U, 1.5 * U, 0, TAU);
      ctx.arc(zone.x + 3 * U, zone.y - 2 * U, 1.5 * U, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    },
  });
}

/** Lvl 50: a lava pool at the tap point burns and slows for 5 s (max. 4). */
function wandLavaPool(a) {
  if (zoneCount('lavaPool') >= 4) return;
  const { x, y } = a;
  addZone({
    tag: 'lavaPool', dur: 5, under: true, tick: 0,
    update(zone, dt) {
      zone.tick += dt;
      if (zone.tick < 0.5) return;
      zone.tick = 0;
      areaDamage(x, y, 48 * U, a.damage * 0.3, WAND_DOT, e => {
        e.slow = Math.max(e.slow, 1);
        applyBurn(e, a.damage * BURN_SHARE);
      });
    },
    draw(zone) {
      const alpha = zoneFade(zone, 4, 2);
      const lava = ctx.createRadialGradient(x, y, 2, x, y, 48 * U);
      lava.addColorStop(0, `rgba(255,220,90,${0.8 * alpha})`);
      lava.addColorStop(0.6, `rgba(240,90,20,${0.65 * alpha})`);
      lava.addColorStop(1, `rgba(90,20,10,${0.5 * alpha})`);
      ctx.fillStyle = lava;
      fillEllipse(ctx, x, y, 48 * U, 38 * U);
      ctx.fillStyle = `rgba(255,240,170,${0.7 * alpha})`;
      for (let i = 0; i < 5; i++) {   // bubbles
        const q = (zone.t * 0.9 + i * 0.21) % 1, g = i * 1.9;
        fillCircle(ctx, x + cos(g) * 26 * U, y + sin(g) * 18 * U, (1 - Math.abs(q - 0.5) * 2) * 5 * U);
      }
    },
  });
}

/** Lvl 60, every 2nd attack: a phoenix crosses the field at the tap height, alternating sides. */
function wandPhoenix(a) {
  if (world.projectiles.length >= PROJECTILE_LIMIT) return;
  const fromLeft = combat.attackCount % 4 === 0;
  addProjectile({
    kind: 'phoenix', x: fromLeft ? -30 : W + 30, y: a.y, angle: fromLeft ? 0 : PI, speed: 520 * U, r: 24 * U,
    dmg: a.damage * 2, life: 3, pierce: 99, heavy: true, source: WAND_SOURCE,
  });
}

/** Lvl 70: eight embers rain around the tap point. */
function wandEmberRain(a) {
  for (let i = 0; i < 8; i++) {
    after(0.15 + i * 0.11, () => {
      const g = rnd(TAU), spread = rnd(20, 90) * U;
      const x = a.x + cos(g) * spread, y = a.y + sin(g) * spread * 0.85;
      addEffect(0.2, k => drawFlame(ctx, x + (1 - k) * 40 * U, y - (1 - k) * 170 * U, 6 * U, k * 20), { cap: FX_CAP_RARE });
      after(0.2, () => explode(x, y, 22 * U, a.damage * 0.6, WAND_SOURCE));
    });
  }
}

/** Lvl 80: a fire tornado wanders towards enemies for 5 s (max. 2). */
function wandTornado(a) {
  if (zoneCount('fireTornado') >= 2) return;
  addZone({
    tag: 'fireTornado', dur: 5, tick: 0, x: a.x, y: a.y,
    update(zone, dt) {
      const target = nearestEnemy(zone.x, zone.y, 400 * U);
      if (target) {
        const d = dist(zone.x, zone.y, target.x, target.y) || 1;
        zone.x += (target.x - zone.x) / d * 60 * U * dt;
        zone.y += (target.y - zone.y) / d * 60 * U * dt;
      }
      zone.tick += dt;
      if (zone.tick < 0.3) return;
      zone.tick = 0;
      areaDamage(zone.x, zone.y, 30 * U, a.damage * 0.4, WAND_DOT, e => applyBurn(e, a.damage * BURN_SHARE));
    },
    draw(zone) {
      const alpha = zoneFade(zone, 4, 2);
      for (let i = 0; i < 6; i++) {   // stacked rings, wider towards the top
        const q = i / 5, width = (8 + q * 20) * U;
        ctx.fillStyle = `rgba(255,${190 - i * 20},${70 - i * 8},${0.45 * alpha})`;
        fillEllipse(ctx, zone.x + sin(zone.t * 9 + i * 1.3) * 5 * U, zone.y - q * 46 * U, width, width * 0.32);
      }
    },
  });
}

/** Lvl 90, every 3rd attack: a sun beam from the castle through the tap point to the screen edge. */
function wandSunBeam(a) {
  const length = 640 * U;
  const x1 = cx + cos(a.angle) * 16 * U, y1 = cy + sin(a.angle) * 16 * U;
  const x2 = x1 + cos(a.angle) * length, y2 = y1 + sin(a.angle) * length;
  for (const e of world.enemies) {
    if (e.dead || distToSegment(e.x, e.y, x1, y1, x2, y2) >= 18 * U + e.r) continue;
    applyBurn(e, a.damage * BURN_SHARE);
    hurt(e, a.damage * 2.5, WAND_SOURCE);
  }
  addEffect(0.35, k => {
    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(a.angle);
    ctx.globalAlpha = 1 - k * k;
    ctx.fillStyle = 'rgba(255,170,50,.55)';
    ctx.fillRect(0, -18 * U * (1 - k * 0.5), length, 36 * U * (1 - k * 0.5));
    ctx.fillStyle = '#fff6c8';
    ctx.fillRect(0, -6 * U * (1 - k), length, 12 * U * (1 - k));
    ctx.restore();
  });
}

/** Lvl 100, every 4th attack: after a short charge a supernova hits everything around the castle. */
function wandSupernova(a) {
  const reach = 330 * U;
  addEffect(0.6, k => {
    ctx.globalAlpha = k;
    drawFlame(ctx, cx, cy - 40 * U * CASTLE_SCALE, (10 + k * 26) * U, k * 30);
    ctx.globalAlpha = 1;
  });
  after(0.6, () => {
    areaDamage(cx, cy, reach, a.damage * 4, WAND_SOURCE, e => applyBurn(e, a.damage * BURN_SHARE, 4));
    session.shake = Math.max(session.shake, 14);
    addEffect(0.6, k => {
      const r = reach * k;
      const shell = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r + 1);
      shell.addColorStop(0, 'rgba(255,160,40,0)');
      shell.addColorStop(0.8, `rgba(255,200,90,${0.6 * (1 - k)})`);
      shell.addColorStop(1, 'rgba(255,255,220,0)');
      ctx.fillStyle = shell;
      fillCircle(ctx, cx, cy, r + 1);
    });
  });
}

/* ---------- Attack ---------- */

WEAPONS.wand.attack = function (x, y) {
  const level = S.lv.wand;
  const a = { x, y, level, damage: damageOf('wand'), angle: atan2(y - cy, x - cx) };
  const radius = 44 * U * (1 + level * 0.003);
  // unit vector across the throwing direction, for the twin fireballs and the flame wall
  const sideX = cos(a.angle + PI / 2), sideY = sin(a.angle + PI / 2);

  if (level >= 10) {
    throwFireball(x + sideX * 26 * U, y + sideY * 26 * U, radius, a.damage);
    throwFireball(x - sideX * 26 * U, y - sideY * 26 * U, radius, a.damage);
  } else {
    throwFireball(x, y, radius, a.damage);
  }
  if (level >= 15) {   // fire trail from the castle to the tap point
    fireLine('fireTrail', 5, cx + cos(a.angle) * 30 * U, cy + sin(a.angle) * 30 * U, x, y, 2.5, 9 * U, 0.15, a.damage);
  }
  if (level >= 30) {   // flame wall across the tap point
    fireLine('flameWall', 4, x - sideX * 60 * U, y - sideY * 60 * U, x + sideX * 60 * U, y + sideY * 60 * U, 4, 11 * U, 0.3, a.damage);
  }
  if (level >= 40) wandSpirit(a);
  if (level >= 50) wandLavaPool(a);
  if (level >= 60 && combat.attackCount % 2 === 0) wandPhoenix(a);
  if (level >= 70) wandEmberRain(a);
  if (level >= 80) wandTornado(a);
  if (level >= 90 && combat.attackCount % 3 === 0) wandSunBeam(a);
  if (level >= 100 && combat.attackCount % 4 === 0) wandSupernova(a);
};

/* ---------- Projectile kind and kill hook ---------- */

PROJECTILE_KINDS.phoenix = {
  onHit(p, enemy) { applyBurn(enemy, damageOf('wand') * BURN_SHARE); },
  draw(p) {
    const dir = p.vx > 0 ? 1 : -1, flap = sin(session.time * 18) * 0.5;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(dir, 1);
    ctx.fillStyle = 'rgba(255,150,40,.85)';
    for (const side of [-1, 1]) {   // wings
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-8 * U, side * (18 + flap * 10) * U, -30 * U, side * (22 + flap * 14) * U);
      ctx.quadraticCurveTo(-12 * U, side * 6 * U, -22 * U, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    drawFlame(ctx, p.x, p.y + 4 * U, 13 * U, session.time * 20);
    ctx.fillStyle = 'rgba(255,170,60,.3)';   // trail
    fillEllipse(ctx, p.x - dir * 26 * U, p.y, 30 * U, 7 * U);
  },
};

/**
 * Lvl 25: burning enemies explode when they die. The explosion can ignite and
 * kill further enemies, so the chain is limited to 3 links and 10 per frame.
 */
KILL_HOOKS.push((enemy, source) => {
  if (enemy.burn <= 0 || S.lv.wand < 25) return;
  const link = source.chain || 0;
  if (link >= 3 || combat.chainBooms >= 10) return;
  combat.chainBooms++;
  const { x, y } = enemy;
  after(0.08, () => explode(x, y, 30 * U, damageOf('wand') * 0.5, { weapon: 'wand', chain: link + 1, color: '#ffb36b' }));
});
