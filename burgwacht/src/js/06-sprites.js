/*
 * Everything that is drawn as a picture: weapon shapes, castle, wall, enemies,
 * soldiers and the pre-rendered ground. All art is drawn with canvas calls,
 * there are no image files.
 *
 * Functions taking `c` draw on any 2D context (they are reused for the weapon
 * icons); the others draw on the game canvas `ctx`.
 */

const INK = '#33283a';          // outline colour of all sprites
const DISPLAY_FONT = '"Lilita One","Trebuchet MS",system-ui,sans-serif';

/* ---------- Weapon shapes ---------- */

/** Sword pointing along `angle`, hilt at (x, y). Also used for daggers with other colours. */
function drawSword(c, x, y, angle, len, blade = '#eef4ff', grip = '#8a5a3c') {
  const w = len * 0.075;
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.lineJoin = 'round';
  c.lineWidth = Math.max(1, len * 0.035);
  c.strokeStyle = INK;
  // blade
  c.fillStyle = blade;
  c.beginPath();
  c.moveTo(0, -w);
  c.lineTo(len * 0.74, -w);
  c.lineTo(len * 0.9, 0);
  c.lineTo(len * 0.74, w);
  c.lineTo(0, w);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = 'rgba(120,150,190,.45)';
  c.fillRect(len * 0.04, 0, len * 0.72, w * 0.8);
  // grip, guard, pommel
  c.fillStyle = grip;
  c.fillRect(-len * 0.2, -w * 0.6, len * 0.2, w * 1.2);
  c.strokeRect(-len * 0.2, -w * 0.6, len * 0.2, w * 1.2);
  c.fillStyle = '#f5b93a';
  c.fillRect(-len * 0.035, -len * 0.15, len * 0.07, len * 0.3);
  c.strokeRect(-len * 0.035, -len * 0.15, len * 0.07, len * 0.3);
  c.beginPath();
  c.arc(-len * 0.22, 0, w * 0.9, 0, TAU);
  c.fill();
  c.stroke();
  c.restore();
}
const DAGGER_BLADE = '#dff3ff', DAGGER_GRIP = '#2f8f7a';

/** Spiked ball of the morning star. */
function drawBall(c, x, y, r, rotation = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(rotation);
  c.strokeStyle = INK;
  c.lineWidth = Math.max(1, r * 0.12);
  c.lineJoin = 'round';
  c.fillStyle = '#cfd6de';
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8;
    c.beginPath();
    c.moveTo(cos(a - 0.22) * r * 0.9, sin(a - 0.22) * r * 0.9);
    c.lineTo(cos(a) * r * 1.5, sin(a) * r * 1.5);
    c.lineTo(cos(a + 0.22) * r * 0.9, sin(a + 0.22) * r * 0.9);
    c.closePath();
    c.fill();
    c.stroke();
  }
  const metal = c.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  metal.addColorStop(0, '#aab3c0');
  metal.addColorStop(1, '#59606e');
  c.fillStyle = metal;
  c.beginPath();
  c.arc(0, 0, r, 0, TAU);
  c.fill();
  c.stroke();
  c.restore();
}

function drawBow(c, x, y, angle, r) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const [color, width] of [[INK, r * 0.3], ['#b9793f', r * 0.17]]) {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.arc(0, 0, r, -1.25, 1.25);
    c.stroke();
  }
  // string
  c.strokeStyle = '#eef4ff';
  c.lineWidth = r * 0.06;
  c.beginPath();
  c.moveTo(cos(-1.25) * r, sin(-1.25) * r);
  c.lineTo(-r * 0.25, 0);
  c.lineTo(cos(1.25) * r, sin(1.25) * r);
  c.stroke();
  c.restore();
}

function drawArrow(c, x, y, angle, len, shaft = '#f3e3c0', tip = '#dfe6ee') {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.lineCap = 'round';
  for (const [color, width] of [[INK, len * 0.16], [shaft, len * 0.08]]) {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(-len * 0.5, 0);
    c.lineTo(len * 0.4, 0);
    c.stroke();
  }
  c.fillStyle = tip;
  c.strokeStyle = INK;
  c.lineWidth = len * 0.05;
  c.beginPath();
  c.moveTo(len * 0.55, 0);
  c.lineTo(len * 0.28, -len * 0.13);
  c.lineTo(len * 0.28, len * 0.13);
  c.closePath();
  c.fill();
  c.stroke();
  // fletching
  c.fillStyle = '#e2574c';
  c.beginPath();
  c.moveTo(-len * 0.5, 0);
  c.lineTo(-len * 0.62, -len * 0.12);
  c.lineTo(-len * 0.4, 0);
  c.lineTo(-len * 0.62, len * 0.12);
  c.closePath();
  c.fill();
  c.restore();
}

/** Flame with its base at (x, y); `t` wobbles the tip. */
function drawFlame(c, x, y, r, t = 0) {
  const glow = c.createRadialGradient(x, y, r * 0.1, x, y, r);
  glow.addColorStop(0, '#fff3b0');
  glow.addColorStop(0.45, '#ffb03a');
  glow.addColorStop(1, 'rgba(255,80,20,0)');
  c.fillStyle = glow;
  c.beginPath();
  c.moveTo(x - r * 0.7, y + r * 0.3);
  c.quadraticCurveTo(x - r * 0.9, y - r * 0.5, x + sin(t) * r * 0.2, y - r * 1.5);
  c.quadraticCurveTo(x + r * 0.9, y - r * 0.5, x + r * 0.7, y + r * 0.3);
  c.arc(x, y + r * 0.3, r * 0.7, 0, PI);
  c.fill();
}

/** Paints the 72x72 icon canvases of the weapon bar. */
function drawWeaponIcons() {
  for (const id of WEAPON_IDS) {
    const g = $('wp-' + id).querySelector('canvas').getContext('2d');
    g.clearRect(0, 0, 72, 72);
    if (id === 'sword') {
      drawSword(g, 16, 56, -PI / 4, 58);
    } else if (id === 'dagger') {
      drawSword(g, 10, 44, -0.5, 36, DAGGER_BLADE, DAGGER_GRIP);
      drawSword(g, 24, 62, -0.9, 36, DAGGER_BLADE, DAGGER_GRIP);
    } else if (id === 'star') {
      g.strokeStyle = '#8f97a6';
      g.lineWidth = 4;
      g.setLineDash([6, 4]);
      g.beginPath();
      g.moveTo(10, 64);
      g.lineTo(38, 32);
      g.stroke();
      g.setLineDash([]);
      drawBall(g, 44, 26, 15, 0.3);
    } else if (id === 'bow') {
      drawBow(g, 30, 36, -PI / 4, 26);
      drawArrow(g, 36, 36, -PI / 4, 50);
    } else {
      g.lineCap = 'round';
      for (const [color, width] of [[INK, 9], ['#8a5a3c', 5]]) {
        g.strokeStyle = color;
        g.lineWidth = width;
        g.beginPath();
        g.moveTo(14, 62);
        g.lineTo(44, 26);
        g.stroke();
      }
      drawFlame(g, 48, 24, 15);
    }
  }
}

/* ---------- Castle and wall ---------- */

/** Radius within which an enemy counts as having reached the castle. */
const castleRadius = () => 24 * U * CASTLE_SCALE;

function drawCastle() {
  const s = U * CASTLE_SCALE;
  const hit = castle.flash > 0;
  const squash = hit ? 1 - castle.flash * 0.25 : 1;
  const stone = hit ? '#ffd0c8' : '#efe7d4';
  const roof = '#e2574c';
  const outline = '#4a3b42';

  ctx.fillStyle = 'rgba(0,0,0,.24)';
  fillEllipse(ctx, cx + 4 * s, cy + 20 * s, 50 * s, 15 * s);

  // From here on coordinates are in castle design units, origin at the gate's base.
  ctx.save();
  ctx.translate(cx, cy + 18 * s);
  ctx.scale(s * (2 - squash), s * squash);
  ctx.translate(0, -18);
  ctx.lineWidth = 2;
  ctx.strokeStyle = outline;
  ctx.lineJoin = 'round';

  const block = (x, y, w, h) => {
    ctx.fillStyle = stone;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(74,59,66,.12)';     // shaded right side for depth
    ctx.fillRect(x + w * 0.6, y, w * 0.4, h);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 2);
    ctx.stroke();
  };
  const cone = (x1, x2, baseY, tipY) => {
    const mid = (x1 + x2) / 2;
    const path = (fromX) => {
      ctx.beginPath();
      ctx.moveTo(fromX, baseY);
      ctx.lineTo(x2, baseY);
      ctx.lineTo(mid, tipY);
      ctx.closePath();
    };
    ctx.fillStyle = roof;
    path(x1);
    ctx.fill();
    ctx.fillStyle = 'rgba(74,59,66,.14)';
    path(mid);
    ctx.fill();
    path(x1);
    ctx.stroke();
  };
  const windowAt = (x, y) => {
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.roundRect(x - 3, y, 6, 10, [3, 3, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#ffd978';
    ctx.fillRect(x - 1.5, y + 3, 3, 6);
  };

  // keep with flag
  block(-14, -46, 28, 48);
  cone(-19, 19, -46, -74);
  windowAt(0, -36);
  ctx.strokeStyle = outline;
  ctx.beginPath();
  ctx.moveTo(0, -74);
  ctx.lineTo(0, -92);
  ctx.stroke();
  const wave_ = sin(session.time * 5) * 3;
  ctx.fillStyle = '#f5b93a';
  ctx.beginPath();
  ctx.moveTo(0, -92);
  ctx.quadraticCurveTo(9, -90 + wave_, 17, -86);
  ctx.quadraticCurveTo(9, -83 - wave_, 0, -81);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // front wall with battlements
  block(-24, -8, 48, 26);
  for (let i = 0; i < 5; i++) block(-24 + i * 10.4, -15, 6.4, 8);
  // side towers
  block(-42, -26, 20, 44);
  cone(-46, -18, -26, -50);
  windowAt(-32, -16);
  block(22, -26, 20, 44);
  cone(18, 46, -26, -50);
  windowAt(32, -16);
  // gate
  ctx.fillStyle = '#8a5a3c';
  ctx.beginPath();
  ctx.roundRect(-8, 0, 16, 18, [8, 8, 0, 0]);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 18);
  ctx.stroke();
  ctx.fillStyle = '#f5b93a';
  fillCircle(ctx, 3, 10, 1.4);
  ctx.restore();
}

/* The wall is an ellipse of stone blocks around the castle. */
const wallRadiusX = () => 44 * U;
const wallRadiusY = () => 23 * U;
const wallCenterY = () => cy + 5 * U;
const WALL_BLOCKS = 26;

/** Draws the back half (front = false, before the castle) or the front half of the wall. */
function drawWall(front) {
  const max = wallMax();
  if (!max) return;
  const standing = Math.ceil(WALL_BLOCKS * S.wallHp / max);   // damaged blocks turn into rubble
  ctx.lineWidth = 1.3 * U;
  ctx.strokeStyle = '#4a3b42';
  ctx.lineJoin = 'round';
  for (let i = 0; i < WALL_BLOCKS; i++) {
    const angle = i / WALL_BLOCKS * TAU + 0.12;
    if ((sin(angle) > 0) !== front) continue;
    const x = cx + cos(angle) * wallRadiusX();
    const y = wallCenterY() + sin(angle) * wallRadiusY();
    const up = (i * 7) % WALL_BLOCKS < standing;       // i*7 spreads the damage around the ring
    const height = up ? (i % 2 ? 9 : 7) * U : 3 * U;
    ctx.fillStyle = up ? (i % 2 ? '#d8d2c6' : '#c4bdb0') : '#8f897f';
    ctx.beginPath();
    ctx.roundRect(x - 5.6 * U, y - height, 11.2 * U, height + 2 * U, 1.5 * U);
    ctx.fill();
    ctx.stroke();
    if (up) {
      ctx.fillStyle = 'rgba(74,59,66,.14)';
      ctx.fillRect(x + U, y - height + U, 3.6 * U, height);
    }
  }
}

/* ---------- Enemies ---------- */

function drawEnemy(e) {
  const t = session.time;
  const bob = sin(t * 8 + e.phase);
  const r = e.r;
  const flyHeight = e.type === 'bat' ? r * 1.1 + bob * 2 * U : 0;
  const x = e.x, y = e.y - flyHeight;
  const moving = e.freeze <= 0 && e.stun <= 0;
  const squash = moving ? 1 + bob * 0.08 : 1;

  ctx.fillStyle = 'rgba(0,0,0,.22)';
  fillEllipse(ctx, e.x, e.y + r * 0.75, r * (flyHeight ? 0.7 : 1), r * 0.35);

  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 2 * U;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.fillStyle = e.flash > 0 ? '#fff' : e.freeze > 0 ? '#bfe9ff' : e.slow > 0 ? '#9fd0ee' : e.color;

  // newer enemy types bring their own complete drawing (body, eyes, weapon)
  const customDraw = ENEMY_DRAWERS[e.type];
  if (customDraw) {
    customDraw(e, r, squash, moving, t);
    ctx.restore();
    drawEnemyStatus(e, x, y);
    return;
  }

  if (e.type === 'bat') {
    const flap = moving ? sin(t * 22 + e.phase) * 0.6 : 0;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * r * 0.5, 0);
      ctx.lineTo(side * r * 2.1, -r * (0.9 + flap));
      ctx.lineTo(side * r * 1.7, r * 0.1);
      ctx.lineTo(side * r * 1.2, -r * 0.1);
      ctx.lineTo(side * r * 0.9, r * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // ears
    ctx.beginPath();
    for (const side of [-1, 1]) {
      ctx.moveTo(side * r * 0.6, -r * 0.6);
      ctx.lineTo(side * r * 0.45, -r * 1.25);
      ctx.lineTo(side * r * 0.1, -r * 0.8);
    }
    ctx.fill();
    ctx.stroke();
  } else if (e.type === 'ogre') {
    ctx.scale(2 - squash, squash);
    ctx.beginPath();
    ctx.roundRect(-r * 0.95, -r * 1.1, r * 1.9, r * 2, r * 0.6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#efe7d4';   // horns
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * r * 0.5, -r * 1.05);
      ctx.lineTo(side * r * 0.95, -r * 1.7);
      ctx.lineTo(side * r * 0.85, -r * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(51,40,58,.25)';
    ctx.fillRect(-r * 0.6, r * 0.35, r * 1.2, r * 0.18);
    if (e.lava) drawLavaCracks(r);   // lava golem
  } else if (e.type === 'shield') {
    drawShieldBearerBody(e, r, squash);
  } else if (e.type === 'archer') {
    drawArcherBody(e, r, squash);
  } else {
    // slime, and the boss as a crowned slime (in the lava world: a dragon with wings)
    if (e.boss && e.lava) drawDragonWings(r, moving ? sin(t * 9 + e.phase) * 0.35 : 0);
    ctx.scale(2 - squash, squash);
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.8);
    ctx.bezierCurveTo(-r * 1.25, -r * 0.9, r * 1.25, -r * 0.9, r, r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.15, r * 0.22, r * 0.13, -0.5, 0, TAU);
    ctx.fill();
    if (e.boss) {
      ctx.fillStyle = '#f5b93a';
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.45);
      ctx.lineTo(-r * 0.55, -r * 1.05);
      ctx.lineTo(-r * 0.25, -r * 0.75);
      ctx.lineTo(0, -r * 1.15);
      ctx.lineTo(r * 0.25, -r * 0.75);
      ctx.lineTo(r * 0.55, -r * 1.05);
      ctx.lineTo(r * 0.5, -r * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // eyes
  const eyeY = e.type === 'ogre' || e.type === 'shield' ? -r * 0.25 : e.type === 'bat' || e.type === 'archer' ? -r * 0.1 : r * 0.15;
  const eyeX = r * 0.36;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-eyeX, eyeY, r * 0.24, 0, TAU);
  ctx.arc(eyeX, eyeY, r * 0.24, 0, TAU);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(-eyeX, eyeY + r * 0.05, r * 0.12, 0, TAU);
  ctx.arc(eyeX, eyeY + r * 0.05, r * 0.12, 0, TAU);
  ctx.fill();
  if (e.type === 'ogre' || e.boss) {   // angry brows
    ctx.lineWidth = 2 * U;
    ctx.beginPath();
    ctx.moveTo(-eyeX - r * 0.25, eyeY - r * 0.38);
    ctx.lineTo(-eyeX + r * 0.2, eyeY - r * 0.2);
    ctx.moveTo(eyeX + r * 0.25, eyeY - r * 0.38);
    ctx.lineTo(eyeX - r * 0.2, eyeY - r * 0.2);
    ctx.stroke();
  }
  ctx.restore();

  drawEnemyStatus(e, x, y);
}

/* ---------- Kobolds, wolves and orcs ---------- */

/** Pair of eyes at (±dx, y); `angry` adds slanted brows. Coordinates are in the enemy's local space. */
function enemyEyes(dx, y, size, iris = INK, angry = false) {
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-dx, y, size, 0, TAU);
  ctx.arc(dx, y, size, 0, TAU);
  ctx.fill();
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(-dx, y + size * 0.2, size * 0.5, 0, TAU);
  ctx.arc(dx, y + size * 0.2, size * 0.5, 0, TAU);
  ctx.fill();
  if (!angry) return;
  ctx.beginPath();
  ctx.moveTo(-dx - size * 1.1, y - size * 1.5);
  ctx.lineTo(-dx + size * 0.9, y - size * 0.8);
  ctx.moveTo(dx + size * 1.1, y - size * 1.5);
  ctx.lineTo(dx - size * 0.9, y - size * 0.8);
  ctx.stroke();
}
const towardsCastle = e => (cx >= e.x ? 1 : -1);

/** Kobolds: big head, long ears. The slow one carries a heavy sack, the quick one a knife. */
function drawKobold(e, r, squash, moving, t) {
  const side = towardsCastle(e), fast = e.type === 'koboldFast', body = ctx.fillStyle;
  if (fast) ctx.rotate(side * 0.18);           // leans forward while running
  ctx.scale(2 - squash, squash);
  if (!fast) {                                  // sack on the back
    ctx.fillStyle = '#8a6a44';
    ctx.beginPath();
    ctx.ellipse(-side * r * 0.75, r * 0.05, r * 0.6, r * 0.7, -side * 0.3, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = body;
  }
  const stride = moving ? sin(t * (fast ? 26 : 8) + e.phase) * r * 0.25 : 0;
  ctx.lineWidth = 2.2 * U;
  ctx.beginPath();                              // legs
  ctx.moveTo(-r * 0.25, r * 0.6);
  ctx.lineTo(-r * 0.3 + stride, r * 1.05);
  ctx.moveTo(r * 0.25, r * 0.6);
  ctx.lineTo(r * 0.3 - stride, r * 1.05);
  ctx.stroke();
  ctx.lineWidth = 2 * U;
  ctx.beginPath();                              // body
  ctx.ellipse(0, r * 0.35, r * 0.55, r * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();                              // ears
  for (const s of [-1, 1]) {
    ctx.moveTo(s * r * 0.45, -r * 0.55);
    ctx.lineTo(s * r * 1.35, -r * 0.95);
    ctx.lineTo(s * r * 0.55, -r * 0.2);
  }
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();                              // head
  ctx.arc(0, -r * 0.4, r * 0.62, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(120,60,30,.45)';        // nose
  fillCircle(ctx, side * r * 0.2, -r * 0.22, r * 0.17);
  enemyEyes(r * 0.24, -r * 0.48, r * 0.15, '#c0392b', fast);
  if (fast) drawSword(ctx, side * r * 0.55, r * 0.35, side > 0 ? -0.5 : PI + 0.5, r * 1.1, '#dfe6ee', '#5b4636');
}

/** Wolves in side view, running towards the castle. The alpha is bigger, with a white mane. */
function drawWolf(e, r, squash, moving, t) {
  const side = towardsCastle(e), alpha = e.type === 'wolfAlpha', body = ctx.fillStyle;
  ctx.scale(side, 1);
  const gallop = moving ? sin(t * 20 + e.phase) : 0;
  ctx.translate(0, -Math.abs(gallop) * r * 0.12);
  ctx.lineWidth = 2.4 * U;                      // legs
  ctx.beginPath();
  for (const [lx, phase] of [[-0.7, 1], [-0.45, -1], [0.55, -1], [0.8, 1]]) {
    ctx.moveTo(lx * r, r * 0.2);
    ctx.lineTo(lx * r + gallop * phase * r * 0.3, r * 0.85);
  }
  ctx.stroke();
  ctx.lineWidth = 2 * U;
  ctx.beginPath();                              // tail
  ctx.moveTo(-r * 1.0, -r * 0.1);
  ctx.quadraticCurveTo(-r * 1.6, -r * (0.2 + gallop * 0.15), -r * 1.55, -r * 0.65);
  ctx.quadraticCurveTo(-r * 1.3, -r * 0.3, -r * 0.95, r * 0.15);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();                              // body
  ctx.ellipse(0, 0, r * 1.1, r * 0.55, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  if (alpha) {                                  // mane
    ctx.fillStyle = '#e8e8f0';
    ctx.beginPath();
    ctx.ellipse(r * 0.6, -r * 0.2, r * 0.55, r * 0.6, 0.3, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = body;
  }
  ctx.beginPath();                              // ears
  ctx.moveTo(r * 0.8, -r * 0.65);
  ctx.lineTo(r * 0.92, -r * 1.2);
  ctx.lineTo(r * 1.12, -r * 0.7);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();                              // head and snout
  ctx.arc(r * 1.05, -r * 0.4, r * 0.45, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(r * 1.5, -r * 0.25, r * 0.32, r * 0.2, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  fillCircle(ctx, r * 1.78, -r * 0.3, r * 0.08);   // nose tip
  ctx.fillStyle = alpha ? '#ff4a3a' : '#ffd24a';
  fillCircle(ctx, r * 1.12, -r * 0.48, r * 0.1);   // eye
  if (alpha) drawCrown(r * 1.02, -r * 0.82, r * 0.5);
}

/** Orcs: broad green body with tusks; club, axe or (king) crown, cape and a spiked club. */
function drawOrc(e, r, squash, moving, t) {
  const side = towardsCastle(e), king = e.type === 'orcKing', body = ctx.fillStyle;
  ctx.scale(2 - squash, squash);
  if (king) {                                   // cape behind the body
    ctx.fillStyle = '#9b2a2a';
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, -r * 0.5);
    ctx.lineTo(-r * 1.05, r * 0.95);
    ctx.lineTo(r * 1.05, r * 0.95);
    ctx.lineTo(r * 0.8, -r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = body;
  }
  ctx.beginPath();                              // body
  ctx.roundRect(-r * 0.85, -r * 0.55, r * 1.7, r * 1.45, r * 0.45);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#6b4a2e';                    // belt
  ctx.fillRect(-r * 0.85, r * 0.35, r * 1.7, r * 0.18);
  ctx.fillStyle = body;
  ctx.beginPath();                              // head
  ctx.arc(0, -r * 0.7, r * 0.55, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f2ead8';                    // tusks
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(s * r * 0.3, -r * 0.45);
    ctx.lineTo(s * r * 0.36, -r * 0.82);
    ctx.lineTo(s * r * 0.12, -r * 0.5);
  }
  ctx.fill();
  ctx.stroke();
  enemyEyes(r * 0.22, -r * 0.82, r * 0.13, '#c0392b', true);
  if (king) drawCrown(0, -r * 1.22, r * 0.75);

  // weapon in the hand towards the castle, swinging a little while walking
  const swing = moving ? sin(t * 6 + e.phase) * 0.25 : 0;
  ctx.save();
  ctx.translate(side * r * 0.9, r * 0.05);
  ctx.rotate(side * (-0.9 + swing));
  if (e.type === 'orcAxe') {
    ctx.fillStyle = '#7a5530';
    ctx.fillRect(-r * 0.07, -r * 1.25, r * 0.14, r * 1.4);
    ctx.strokeRect(-r * 0.07, -r * 1.25, r * 0.14, r * 1.4);
    ctx.fillStyle = '#cfd6de';
    ctx.beginPath();
    ctx.moveTo(r * 0.05, -r * 1.2);
    ctx.quadraticCurveTo(r * 0.75, -r * 1.05, r * 0.6, -r * 0.55);
    ctx.lineTo(r * 0.05, -r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = '#8a5a34';
    ctx.beginPath();
    ctx.moveTo(-r * 0.08, r * 0.1);
    ctx.lineTo(-r * 0.22, -r * 1.2);
    ctx.lineTo(r * 0.22, -r * 1.2);
    ctx.lineTo(r * 0.08, r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (king) {                                 // iron spikes on the king's club
      ctx.fillStyle = '#cfd6de';
      for (const sy of [-1.05, -0.75]) for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * r * 0.18, sy * r - r * 0.1);
        ctx.lineTo(s * r * 0.4, sy * r);
        ctx.lineTo(s * r * 0.16, sy * r + r * 0.1);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

/** Golden crown centred at (x, y), `w` wide. */
function drawCrown(x, y, w) {
  ctx.fillStyle = '#f5b93a';
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y + w * 0.3);
  ctx.lineTo(x - w / 2, y - w * 0.15);
  ctx.lineTo(x - w / 4, y + w * 0.08);
  ctx.lineTo(x, y - w * 0.3);
  ctx.lineTo(x + w / 4, y + w * 0.08);
  ctx.lineTo(x + w / 2, y - w * 0.15);
  ctx.lineTo(x + w / 2, y + w * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

const ENEMY_DRAWERS = {
  koboldSlow: drawKobold, koboldFast: drawKobold,
  wolf: drawWolf, wolfAlpha: drawWolf,
  orcClub: drawOrc, orcAxe: drawOrc, orcKing: drawOrc,
};

/** Shield bearer: armoured body with a big shield held towards the castle. */
function drawShieldBearerBody(e, r, squash) {
  const side = cx >= e.x ? 1 : -1;   // the shield faces the castle
  ctx.scale(2 - squash, squash);
  ctx.beginPath();
  ctx.roundRect(-r * 0.8, -r, r * 1.6, r * 1.9, r * 0.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(51,40,58,.3)';   // helmet band
  ctx.fillRect(-r * 0.8, -r * 0.62, r * 1.6, r * 0.2);
  ctx.fillStyle = e.flash > 0 ? '#fff' : '#d9dee8';
  ctx.beginPath();
  ctx.roundRect(side * r * 0.75 - r * 0.32, -r * 0.75, r * 0.64, r * 1.6, r * 0.25);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f5b93a';
  fillCircle(ctx, side * r * 0.75, 0, r * 0.14);
}

/** Archer: small hooded figure with a crossbow. */
function drawArcherBody(e, r, squash) {
  const side = cx >= e.x ? 1 : -1;
  ctx.scale(2 - squash, squash);
  ctx.beginPath();
  ctx.arc(0, r * 0.1, r * 0.85, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();   // pointed hood
  ctx.moveTo(-r * 0.8, -r * 0.25);
  ctx.lineTo(0, -r * 1.55);
  ctx.lineTo(r * 0.8, -r * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#5b4636';   // crossbow
  ctx.lineWidth = 2.4 * U;
  ctx.beginPath();
  ctx.moveTo(side * r * 0.5, r * 0.45);
  ctx.lineTo(side * r * 1.5, r * 0.45);
  ctx.moveTo(side * r * 1.2, r * 0.05);
  ctx.lineTo(side * r * 1.2, r * 0.85);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * U;
}

/** Glowing cracks on a lava golem. */
function drawLavaCracks(r) {
  ctx.strokeStyle = '#ff9a3c';
  ctx.lineWidth = 1.6 * U;
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, r * 0.1);
  ctx.lineTo(-r * 0.25, r * 0.3);
  ctx.lineTo(-r * 0.35, r * 0.7);
  ctx.moveTo(r * 0.55, -r * 0.05);
  ctx.lineTo(r * 0.2, r * 0.35);
  ctx.lineTo(r * 0.45, r * 0.75);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * U;
}

/** Wings of the lava boss; drawn before the body so they sit behind it. */
function drawDragonWings(r, flap) {
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.6, -r * 0.1);
    ctx.lineTo(side * r * 2.0, -r * (1.0 + flap));
    ctx.lineTo(side * r * 1.7, -r * 0.2);
    ctx.lineTo(side * r * 2.1, r * 0.2);
    ctx.lineTo(side * r * 1.3, r * 0.1);
    ctx.lineTo(side * r * 0.8, r * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

/** Status markers above an enemy: poison bubbles, flame, stun stars, frost ring, health bar. */
function drawEnemyStatus(e, x, y) {
  const t = session.time, r = e.r;
  if (e.poison > 0) {
    ctx.fillStyle = 'rgba(140,210,70,.9)';
    for (let i = 0; i < 2; i++) {
      const rise = (t * 1.4 + i * 0.5 + e.phase) % 1;
      fillCircle(ctx, x + (i ? 1 : -1) * r * 0.5, y - r * 0.6 - rise * 14 * U, 2.5 * U * (1 - rise));
    }
  }
  if (e.burn > 0) drawFlame(ctx, x, y - r * 0.9, r * 0.55, t * 14 + e.phase);
  if (e.stun > 0) {
    ctx.fillStyle = '#ffe36e';
    for (let i = 0; i < 3; i++) {
      const a = t * 6 + i * 2.1;
      fillCircle(ctx, x + cos(a) * r * 0.8, y - r * 1.3 + sin(a) * r * 0.25, 2.2 * U);
    }
  }
  if (e.freeze > 0) {
    ctx.strokeStyle = 'rgba(190,235,255,.9)';
    ctx.lineWidth = 2 * U;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.25, 0, TAU);
    ctx.stroke();
  }
  if (e.hp < e.max) {
    const width = r * 2, share = Math.max(0, e.hp / e.max);
    ctx.fillStyle = INK;
    ctx.fillRect(x - width / 2 - 1, y - r * 1.75 - 1, width + 2, 5 * U + 2);
    ctx.fillStyle = share > 0.5 ? '#7ddc5a' : share > 0.25 ? '#f5b93a' : '#e9524f';
    ctx.fillRect(x - width / 2, y - r * 1.75, width * share, 5 * U);
  }
}

/* ---------- Soldier ---------- */

function drawSoldier(soldier) {
  const u = U * 0.8;
  const hop = soldier.walking ? Math.abs(sin(session.time * 12 + soldier.phase)) * 2 * u : 0;
  const x = soldier.x, y = soldier.y - hop;
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  fillEllipse(ctx, soldier.x, soldier.y + 7 * u, 7 * u, 3 * u);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(soldier.facing, 1);
  ctx.lineWidth = 1.5 * u;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#4a3b42';   // legs
  ctx.fillRect(-3.5 * u, 3 * u, 2.5 * u, 4 * u);
  ctx.fillRect(u, 3 * u, 2.5 * u, 4 * u);
  ctx.fillStyle = soldier.flash > 0 ? '#fff' : '#4f7fd6';   // tunic
  ctx.beginPath();
  ctx.roundRect(-5 * u, -4 * u, 10 * u, 8.5 * u, 2.5 * u);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd9b3';   // head
  ctx.beginPath();
  ctx.arc(0, -8 * u, 4.2 * u, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#b9c2cf';   // helmet
  ctx.beginPath();
  ctx.arc(0, -8.6 * u, 4.6 * u, PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  fillCircle(ctx, 1.8 * u, -7.2 * u, 0.8 * u);
  drawSword(ctx, 5 * u, u, soldier.swing > 0 ? 0.3 : -1.1, 13 * u);
  ctx.fillStyle = '#e2574c';   // shield
  ctx.beginPath();
  ctx.arc(-4.5 * u, u, 3.2 * u, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // one dot per hit the soldier can still take
  for (let i = 0; i < soldier.maxHp; i++) {
    ctx.fillStyle = i < soldier.hp ? '#7ddc5a' : 'rgba(51,40,58,.45)';
    fillCircle(ctx, x - 4 * u + i * 4 * u, y - 17 * u, 1.6 * u);
  }
}

/* ---------- Ground ---------- */

let ground = null;   // off-screen canvas with the static background, rebuilt on resize and world change

/* Colours of the ground per world. Meadows get grass and flowers, the lava world gets lava and embers. */
const GROUND_STYLES = {
  meadow: {
    fill: ['#93d672', '#74bd5e', '#4d9a52'],
    patches: ['rgba(255,255,220,.06)', 'rgba(20,80,40,.07)'],
    yard: '201,168,119', stone: '#b9b4ad', edge: '20,50,40', plants: true,
  },
  lava: {
    fill: ['#5a4442', '#43302f', '#2a1c1e'],
    patches: ['rgba(255,150,60,.05)', 'rgba(0,0,0,.14)'],
    yard: '120,96,88', stone: '#6f6260', edge: '20,6,6', plants: false,
  },
};

function makeGround() {
  const style = GROUND_STYLES[S.world];
  ground = document.createElement('canvas');
  ground.width = W * DPR;
  ground.height = H * DPR;
  const g = ground.getContext('2d');
  g.scale(DPR, DPR);

  // Seeded generator so the meadow looks the same after every resize.
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const far = Math.max(W, H);
  const yardY = cy + 8 * U;   // centre of the trodden ground around the castle

  let fill = g.createRadialGradient(cx, cy, 10, cx, cy, far * 0.75);
  fill.addColorStop(0, style.fill[0]);
  fill.addColorStop(0.55, style.fill[1]);
  fill.addColorStop(1, style.fill[2]);
  g.fillStyle = fill;
  g.fillRect(0, 0, W, H);

  // light and dark patches
  for (let i = 0; i < 46; i++) {
    g.fillStyle = style.patches[i % 2 ? 0 : 1];
    g.beginPath();
    g.ellipse(rand() * W, rand() * H, (20 + rand() * 50) * U, (10 + rand() * 22) * U, rand() * 3, 0, TAU);
    g.fill();
  }
  // castle yard
  if (!style.plants) drawLavaStreams(g, rand, yardY);
  g.fillStyle = `rgba(${style.yard},.6)`;
  fillEllipse(g, cx, yardY, 58 * U, 34 * U);
  g.fillStyle = `rgba(${style.yard},.35)`;
  fillEllipse(g, cx, yardY, 72 * U, 44 * U);
  if (style.plants) drawMeadowPlants(g, rand, yardY);
  // stones
  for (let i = 0; i < 16; i++) {
    const x = rand() * W, y = rand() * H, size = (3 + rand() * 4) * U;
    g.fillStyle = 'rgba(0,0,0,.14)';
    fillEllipse(g, x + U, y + size * 0.5, size * 1.1, size * 0.5);
    g.fillStyle = style.stone;
    fillEllipse(g, x, y, size, size * 0.75);
    g.fillStyle = 'rgba(255,255,255,.35)';
    fillEllipse(g, x - size * 0.25, y - size * 0.25, size * 0.4, size * 0.25);
  }
  // darker edges
  fill = g.createRadialGradient(cx, cy, far * 0.3, cx, cy, far * 0.78);
  fill.addColorStop(0, `rgba(${style.edge},0)`);
  fill.addColorStop(1, `rgba(${style.edge},.5)`);
  g.fillStyle = fill;
  g.fillRect(0, 0, W, H);
}

function drawMeadowPlants(g, rand, yardY) {
  // grass tufts
  g.strokeStyle = 'rgba(40,110,55,.55)';
  g.lineWidth = 1.4 * U;
  g.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const x = rand() * W, y = rand() * H;
    if (dist(x, y, cx, yardY) < 60 * U) continue;
    g.beginPath();
    g.moveTo(x - 3 * U, y);
    g.lineTo(x - U, y - 5 * U);
    g.moveTo(x, y);
    g.lineTo(x, y - 6 * U);
    g.moveTo(x + 3 * U, y);
    g.lineTo(x + 1.5 * U, y - 4 * U);
    g.stroke();
  }
  // flowers
  const petals = ['#fff', '#ffe36e', '#ffb3d1', '#cfe3ff'];
  for (let i = 0; i < 46; i++) {
    const x = rand() * W, y = rand() * H;
    if (dist(x, y, cx, yardY) < 66 * U) continue;
    g.fillStyle = petals[i % 4];
    for (let j = 0; j < 5; j++) fillCircle(g, x + cos(j * 1.257) * 2.4 * U, y + sin(j * 1.257) * 2.4 * U, 1.7 * U);
    g.fillStyle = '#f5b93a';
    fillCircle(g, x, y, 1.3 * U);
  }
}

/** Winding lava streams with a bright core, plus scattered embers. */
function drawLavaStreams(g, rand, yardY) {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let i = 0; i < 5; i++) {
    // a stream wanders from one screen edge towards the opposite one, bending around the castle yard
    const points = [];
    let x = rand() * W, y = i % 2 ? -20 : H + 20;
    const stepY = (i % 2 ? 1 : -1) * H / 7;
    for (let j = 0; j < 9; j++) {
      points.push([x, y]);
      x = clamp(x + (rand() - 0.5) * 120 * U, -20, W + 20);
      y += stepY;
      if (dist(x, y, cx, yardY) < 110 * U) x += (x < cx ? -1 : 1) * 90 * U;
    }
    for (const [color, width] of [['rgba(60,10,5,.55)', 20], ['#d9461c', 13], ['#ff9a2e', 7], ['#ffe08a', 2.5]]) {
      g.strokeStyle = color;
      g.lineWidth = width * U;
      g.beginPath();
      g.moveTo(points[0][0], points[0][1]);
      for (const [px, py] of points.slice(1)) g.lineTo(px, py);
      g.stroke();
    }
  }
  for (let i = 0; i < 70; i++) {   // embers
    const x = rand() * W, y = rand() * H;
    g.fillStyle = i % 3 ? 'rgba(255,140,50,.5)' : 'rgba(255,220,130,.6)';
    fillCircle(g, x, y, (0.8 + rand() * 1.4) * U);
  }
}
