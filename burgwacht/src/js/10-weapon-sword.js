/*
 * Sword: melee slashes at the tapped point.
 *
 * Every weapon file follows the same layout: helpers, one small function per
 * ability, then the attack function that calls the abilities unlocked at the
 * current level (they all stack), then the projectile kinds and kill hooks.
 */

const SWORD_SOURCE = { weapon: 'sword' };

/** White crescent that sweeps open and fades. */
function slashEffect(x, y, angle, radius, rgb = '255,255,255') {
  addEffect(0.28, k => {
    const sweep = Math.min(1, k * 3.2);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = 1 - k * k;
    ctx.fillStyle = `rgb(${rgb})`;
    ctx.shadowColor = `rgba(${rgb},.9)`;
    ctx.shadowBlur = 14 * U;
    ctx.beginPath();
    ctx.arc(-radius * 0.4, 0, radius * 1.2, -1.1, -1.1 + 2.2 * sweep);
    ctx.arc(-radius * 0.8, 0, radius * 1.38, (-1.1 + 2.2 * sweep) * 0.82, -1.1 * 0.82, true);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, { cap: FX_CAP_COMMON });
}

/** A sword drops from the sky onto (x, y); `onImpact` runs when it lands. */
function fallingSword(x, y, scale, delay, onImpact) {
  const length = 64 * U * scale, restY = y - 58 * U * scale;
  addEffect(delay, k => {
    ctx.fillStyle = `rgba(0,0,0,${0.12 + 0.2 * k})`;   // growing shadow on the ground
    fillEllipse(ctx, x, y, 22 * U * scale * k, 9 * U * scale * k);
    drawSword(ctx, x, restY - (1 - k * k) * 420 * U, PI / 2, length);
  });
  after(delay, () => {
    onImpact();
    addEffect(0.35, k => {
      ctx.globalAlpha = 1 - k;
      drawSword(ctx, x, restY, PI / 2, length);
      ctx.globalAlpha = 1;
    });
  });
}

/* ---------- Abilities ---------- */

/** Lvl 1/5/10: one, two or three slashes side by side. Lvl 70 freezes what they hit. */
function swordSlashes(a, x, y, angle, damageShare) {
  const count = a.level >= 10 ? 3 : a.level >= 5 ? 2 : 1;
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * a.radius * 1.05;
    const sx = x + cos(angle + PI / 2) * offset;
    const sy = y + sin(angle + PI / 2) * offset;
    slashEffect(sx, sy, angle + (i - (count - 1) / 2) * 0.35, a.radius, damageShare < 1 ? '190,225,255' : '255,255,255');
    areaDamage(sx, sy, a.radius, a.damage * damageShare, SWORD_SOURCE, e => {
      if (a.level >= 70) e.freeze = Math.max(e.freeze, 2);
    });
  }
}

/** The basic strike; from lvl 80 it is mirrored on the opposite side of the castle. */
function swordStrike(a, damageShare) {
  swordSlashes(a, a.x, a.y, a.angle, damageShare);
  if (a.level >= 80) swordSlashes(a, 2 * cx - a.x, 2 * cy - a.y, a.angle + PI, damageShare);
}

/** Lvl 25: three swords circle the castle for 3 s; attacking again extends them. */
function swordOrbit(a) {
  const existing = findZone('swordOrbit');
  if (existing) { existing.dur = existing.t + 3; return; }
  const bladeAngle = (zone, i) => zone.startAngle + zone.t * 4 + i * TAU / 3;
  addZone({
    tag: 'swordOrbit', dur: 3, startAngle: rnd(TAU),
    update(zone) {
      for (let i = 0; i < 3; i++) {
        const g = bladeAngle(zone, i);
        const x = cx + cos(g) * 92 * U, y = cy + sin(g) * 92 * U * 0.85;
        for (const e of world.enemies) {
          if (e.dead || e.orbitCd > 0 || dist(x, y, e.x, e.y) >= 20 * U + e.r) continue;
          e.orbitCd = 0.4;
          hurt(e, a.damage * 0.5, SWORD_SOURCE);
        }
      }
    },
    draw(zone) {
      ctx.globalAlpha = zoneFade(zone, 4, 3);
      for (let i = 0; i < 3; i++) {
        const g = bladeAngle(zone, i);
        drawSword(ctx, cx + cos(g) * 70 * U, cy + sin(g) * 70 * U * 0.85, g, 40 * U);
      }
      ctx.globalAlpha = 1;
    },
  });
}

/** Lvl 30: a crescent flies from the tap point to the screen edge through everything. */
function swordBladeWave(a) {
  addProjectile({
    kind: 'bladeWave', x: a.x, y: a.y, angle: a.angle, speed: 380 * U, r: 30 * U,
    dmg: a.damage * 0.8, life: 2, pierce: 99, heavy: true, source: { weapon: 'sword', color: '#bfe6ff' },
  });
}

/** Lvl 40: a ghost sword stays at the tap point and slashes on its own for 3 s (max. 4). */
function swordGhost(a) {
  if (zoneCount('ghostSword') >= 4) return;
  const { x, y } = a, radius = a.radius * 0.9;
  addZone({
    tag: 'ghostSword', dur: 3, tick: 0.3,
    update(zone, dt) {
      zone.tick += dt;
      if (zone.tick < 0.6) return;
      zone.tick = 0;
      slashEffect(x, y, rnd(TAU), radius, '200,180,255');
      areaDamage(x, y, radius, a.damage * 0.5, SWORD_SOURCE);
    },
    draw(zone) {
      ctx.globalAlpha = 0.55 * Math.min(1, (zone.dur - zone.t) * 2);
      drawSword(ctx, x, y - 30 * U + sin(zone.t * 5) * 4 * U, PI / 2 + sin(zone.t * 9) * 0.5, 44 * U, '#d9ccff', '#6b55a8');
      ctx.globalAlpha = 1;
    },
  });
}

/** Lvl 50: a giant sword falls on the tap point. */
function swordGiant(a) {
  const { x, y } = a;
  fallingSword(x, y, 2.4, 0.45, () => {
    areaDamage(x, y, a.radius * 1.9, a.damage * 3, SWORD_SOURCE);
    ring(x, y, a.radius * 2.1, '255,255,255', 0.5);
    session.shake = Math.max(session.shake, 12);
    puff(x, y, '#e9e2d0', 16);
  });
}

/** Lvl 90, every 3rd attack: lightning jumps across up to 7 enemies. */
function swordLightning(a) {
  const points = [[a.x, a.y]], struck = new Set();
  let px = a.x, py = a.y;
  for (let i = 0; i < 7; i++) {
    const e = nearestEnemy(px, py, 170 * U, struck);
    if (!e) break;
    struck.add(e);
    points.push([e.x, e.y]);
    px = e.x;
    py = e.y;
    hurt(e, a.damage * 1.5, { weapon: 'sword', color: '#fff59a' });
  }
  if (points.length < 2) points.push([a.x + rnd(-40, 40) * U, a.y - 60 * U]);   // strike into the air
  addEffect(0.3, k => {
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = '#fff59a';
    ctx.shadowColor = '#ffe24a';
    ctx.shadowBlur = 16 * U;
    ctx.lineWidth = 3 * U;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i], [x2, y2] = points[i + 1];
      ctx.moveTo(x1, y1);
      for (let j = 1; j < 4; j++) {   // three jittered joints per jump, re-rolled every frame
        ctx.lineTo(x1 + (x2 - x1) * j / 4 + rnd(-9, 9) * U, y1 + (y2 - y1) * j / 4 + rnd(-9, 9) * U);
      }
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
    ctx.restore();
  });
}

/** Lvl 100: 14 swords rain down, mostly on enemies. */
function swordRain(a) {
  for (let i = 0; i < 14; i++) {
    after(i * 0.1, () => {
      const alive = world.enemies.filter(e => !e.dead);
      const target = alive.length && Math.random() < 0.7 ? alive[Math.floor(rnd(alive.length))] : null;
      const x = target ? target.x : rnd(30, W - 30);
      const y = target ? target.y : rnd(70, H - 110);
      fallingSword(x, y, 1, 0.3, () => {
        areaDamage(x, y, a.radius * 0.9, a.damage * 1.2, SWORD_SOURCE);
        ring(x, y, a.radius, '220,235,255', 0.3);
      });
    });
  }
}

/* ---------- Attack ---------- */

WEAPONS.sword.attack = function (x, y) {
  const level = S.lv.sword;
  // `a` bundles what the abilities need to know about this attack
  const a = { x, y, level, damage: damageOf('sword'), angle: atan2(y - cy, x - cx), radius: 50 * U * (1 + level * 0.004) };

  swordStrike(a, 1);
  if (level >= 15) after(0.35, () => swordStrike(a, 0.6));   // echo
  if (level >= 25) swordOrbit(a);
  if (level >= 30) swordBladeWave(a);
  if (level >= 40) swordGhost(a);
  if (level >= 50) swordGiant(a);
  if (level >= 90 && combat.attackCount % 3 === 0) swordLightning(a);
  if (level >= 100) swordRain(a);
};

/* ---------- Projectile kinds and kill hook ---------- */

PROJECTILE_KINDS.bladeWave = {
  draw(p, angle) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(190,230,255,.85)';
    ctx.shadowColor = '#8fd0ff';
    ctx.shadowBlur = 16 * U;
    ctx.beginPath();
    ctx.arc(-p.r * 0.6, 0, p.r * 1.2, -1.1, 1.1);
    ctx.arc(-p.r * 1.1, 0, p.r * 1.45, 0.86, -0.86, true);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
};

PROJECTILE_KINDS.swordSplinter = {
  onHit(p) { p.dead = true; },
  draw(p, angle) { drawSword(ctx, p.x, p.y, angle, 18 * U); },
};

/** Lvl 60: enemies killed by the sword burst into three small swords (which do not burst again). */
KILL_HOOKS.push((enemy, source) => {
  if (source.weapon !== 'sword' || source.splinter || S.lv.sword < 60) return;
  const startAngle = rnd(TAU);
  for (let i = 0; i < 3; i++) {
    addProjectile({
      kind: 'swordSplinter', x: enemy.x, y: enemy.y, angle: startAngle + i * TAU / 3, speed: 300 * U, r: 8 * U,
      dmg: damageOf('sword') * 0.4, life: 0.5, hit: new Set([enemy]),
      source: { weapon: 'sword', splinter: true, color: '#eaf2ff' },
    });
  }
});
