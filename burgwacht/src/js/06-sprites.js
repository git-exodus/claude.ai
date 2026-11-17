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
  } else {
    // slime, and the boss as a crowned slime
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
  const eyeY = e.type === 'ogre' ? -r * 0.25 : e.type === 'bat' ? -r * 0.1 : r * 0.15;
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

let ground = null;   // off-screen canvas with the static background, rebuilt on resize

function makeGround() {
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
  fill.addColorStop(0, '#93d672');
  fill.addColorStop(0.55, '#74bd5e');
  fill.addColorStop(1, '#4d9a52');
  g.fillStyle = fill;
  g.fillRect(0, 0, W, H);

  // light and dark patches
  for (let i = 0; i < 46; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,255,220,.06)' : 'rgba(20,80,40,.07)';
    g.beginPath();
    g.ellipse(rand() * W, rand() * H, (20 + rand() * 50) * U, (10 + rand() * 22) * U, rand() * 3, 0, TAU);
    g.fill();
  }
  // castle yard
  g.fillStyle = 'rgba(201,168,119,.6)';
  fillEllipse(g, cx, yardY, 58 * U, 34 * U);
  g.fillStyle = 'rgba(201,168,119,.35)';
  fillEllipse(g, cx, yardY, 72 * U, 44 * U);
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
  // stones
  for (let i = 0; i < 16; i++) {
    const x = rand() * W, y = rand() * H, size = (3 + rand() * 4) * U;
    g.fillStyle = 'rgba(0,0,0,.14)';
    fillEllipse(g, x + U, y + size * 0.5, size * 1.1, size * 0.5);
    g.fillStyle = '#b9b4ad';
    fillEllipse(g, x, y, size, size * 0.75);
    g.fillStyle = 'rgba(255,255,255,.35)';
    fillEllipse(g, x - size * 0.25, y - size * 0.25, size * 0.4, size * 0.25);
  }
  // darker edges
  fill = g.createRadialGradient(cx, cy, far * 0.3, cx, cy, far * 0.78);
  fill.addColorStop(0, 'rgba(20,50,40,0)');
  fill.addColorStop(1, 'rgba(20,50,40,.5)');
  g.fillStyle = fill;
  g.fillRect(0, 0, W, H);
}
