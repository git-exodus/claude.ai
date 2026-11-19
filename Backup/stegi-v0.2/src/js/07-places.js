/* 07-places.js – the 30 places (and "travel", the landscape while walking).
 * Each entry of PLACE_DRAW draws everything below the sky: far layers, ground and props.
 *   sky     optional day-sky colours [top, bottom]      clouds  false = no clouds
 *   stars   true = stars also by day (dim)              indoor  true = draws its own sky (cave)
 *   draw(c, env)   env = { L (light 0..1), t (seconds), d (colour -> dimmed for night), sky, weather }
 * Everything is placed in fractions of W and between groundY (horizon) and H, using U for sizes,
 * so it fits every phone. Random details use mulberry(seed) and look the same every time. */

/** Rendered place pictures for the places list (cleared on resize). */
const placeCache = new Map();

/* ---------- building blocks ---------- */

/** Ground from the horizon down, gradient c1 -> c2. */
function pGround(c, e, c1, c2, top = groundY) {
  const g = c.createLinearGradient(0, top, 0, H);
  g.addColorStop(0, e.d(c1)); g.addColorStop(1, e.d(c2));
  c.fillStyle = g; c.fillRect(0, top, W, H - top);
}
/** A row of rounded hills along the horizon. h = height in U, n = number of humps, lift = raise above horizon. */
function pHills(c, e, col, h, n, seed = 1, lift = 0) {
  const r = mulberry(seed);
  c.fillStyle = e.d(col);
  c.beginPath(); c.moveTo(0, groundY + 2);
  c.lineTo(0, groundY - lift * U);
  for (let i = 0; i < n; i++) {
    const x0 = W * i / n, x1 = W * (i + 1) / n;
    c.quadraticCurveTo((x0 + x1) / 2, groundY - lift * U - h * U * (0.6 + r() * 0.8), x1, groundY - lift * U);
  }
  c.lineTo(W, groundY + 2); c.fill();
}
/** Pointed mountains: list of [x fraction, width fraction, height U]. snow = white caps. */
function pMountains(c, e, col, list, snow) {
  for (const [fx, fw, h] of list) {
    const x = W * fx, w = W * fw, top = groundY - h * U;
    c.fillStyle = e.d(col);
    c.beginPath(); c.moveTo(x - w / 2, groundY + 2); c.lineTo(x, top); c.lineTo(x + w / 2, groundY + 2); c.fill();
    if (snow) {
      c.fillStyle = e.d('#ffffff');
      c.beginPath(); c.moveTo(x, top); c.lineTo(x - w * 0.14, top + h * U * 0.28);
      c.lineTo(x - w * 0.05, top + h * U * 0.22); c.lineTo(x + w * 0.03, top + h * U * 0.3); c.lineTo(x + w * 0.14, top + h * U * 0.28); c.fill();
    }
  }
}
/** Grass tufts scattered on the ground. */
function pTufts(c, e, col, n, seed = 2, from = groundY + 6) {
  const r = mulberry(seed);
  c.strokeStyle = e.d(col); c.lineWidth = 2 * U; c.lineCap = 'round';
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = from + r() * (H - from), h = (4 + r() * 7) * U;
    c.moveTo(x, y); c.lineTo(x - 2 * U, y - h); c.moveTo(x, y); c.lineTo(x + 2 * U, y - h);
  }
  c.stroke();
}
/** Little five-petal flowers on the ground. */
function pFlowers(c, e, cols, n, seed = 3, size = 1) {
  const r = mulberry(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = groundY + 20 * U + r() * (H - groundY - 40 * U), col = cols[Math.floor(r() * cols.length)];
    c.fillStyle = e.d(col);
    for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + Math.cos(k * TAU / 5) * 3.2 * U * size, y + Math.sin(k * TAU / 5) * 3.2 * U * size, 2.4 * U * size, 0, TAU); c.fill(); }
    c.fillStyle = e.d('#ffb300'); c.beginPath(); c.arc(x, y, 2 * U * size, 0, TAU); c.fill();
  }
}
/** Round leafy tree standing at (x, y), size s (1 = about 120 U high). */
function pTree(c, e, x, y, s, leaf = '#4caf50', trunk = '#7b5134', dots) {
  c.fillStyle = e.d(trunk);
  c.fillRect(x - 7 * s * U, y - 55 * s * U, 14 * s * U, 55 * s * U);
  c.fillStyle = e.d(leaf);
  for (const [ox, oy, r] of [[0, -95, 38], [-28, -70, 28], [28, -72, 28], [0, -60, 30]]) { c.beginPath(); c.arc(x + ox * s * U, y + oy * s * U, r * s * U, 0, TAU); c.fill(); }
  if (dots) { c.fillStyle = e.d(dots); for (const [ox, oy] of [[-15, -95], [18, -80], [-25, -65], [10, -105], [25, -60]]) { c.beginPath(); c.arc(x + ox * s * U, y + oy * s * U, 4.5 * s * U, 0, TAU); c.fill(); } }
}
/** Pine tree (optionally with snow). */
function pPine(c, e, x, y, s, col = '#2e7d4f', snow) {
  c.fillStyle = e.d('#6d4c41'); c.fillRect(x - 5 * s * U, y - 18 * s * U, 10 * s * U, 18 * s * U);
  for (let i = 0; i < 3; i++) {
    const w = (44 - i * 10) * s * U, by = y - (14 + i * 26) * s * U, h = 42 * s * U;
    c.fillStyle = e.d(col); c.beginPath(); c.moveTo(x - w, by); c.lineTo(x, by - h); c.lineTo(x + w, by); c.fill();
    if (snow) { c.fillStyle = e.d('#ffffff'); c.beginPath(); c.moveTo(x - w * 0.35, by - h * 0.65); c.lineTo(x, by - h); c.lineTo(x + w * 0.35, by - h * 0.65); c.fill(); }
  }
}
/** Palm tree, leaning a bit, leaves sway with time. */
function pPalm(c, e, x, y, s, t = 0) {
  const tx = x + 30 * s * U, ty = y - 130 * s * U;
  c.strokeStyle = e.d('#a1774b'); c.lineWidth = 12 * s * U; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - 5 * s * U, y - 70 * s * U, tx, ty); c.stroke();
  c.fillStyle = e.d('#3faa4f');
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.6 + Math.sin(t * 1.5 + i) * 0.05;
    c.save(); c.translate(tx, ty); c.rotate(a);
    c.beginPath(); c.ellipse(36 * s * U, 6 * s * U, 40 * s * U, 10 * s * U, 0.35, 0, TAU); c.fill();
    c.restore();
  }
  c.fillStyle = e.d('#6d4c2f');
  for (const [ox, oy] of [[-6, 8], [6, 9], [0, 14]]) { c.beginPath(); c.arc(tx + ox * s * U, ty + oy * s * U, 6 * s * U, 0, TAU); c.fill(); }
}
/** Bush made of circles. */
function pBush(c, e, x, y, s, col = '#4f9a3c', berries) {
  c.fillStyle = e.d(col);
  for (const [ox, oy, r] of [[-20, -16, 18], [0, -26, 22], [22, -16, 18], [0, -12, 20]]) { c.beginPath(); c.arc(x + ox * s * U, y + oy * s * U, r * s * U, 0, TAU); c.fill(); }
  if (berries) { c.fillStyle = e.d(berries); for (const [ox, oy] of [[-18, -20], [-4, -34], [12, -26], [20, -12], [-8, -14], [4, -20]]) { c.beginPath(); c.arc(x + ox * s * U, y + oy * s * U, 4 * s * U, 0, TAU); c.fill(); } }
}
/** Rounded rock. */
function pRock(c, e, x, y, s, col = '#9e9e9e') {
  c.fillStyle = e.d(col);
  c.beginPath(); c.ellipse(x, y - 12 * s * U, 26 * s * U, 16 * s * U, 0, Math.PI, TAU); c.lineTo(x + 26 * s * U, y); c.lineTo(x - 26 * s * U, y); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.ellipse(x - 8 * s * U, y - 18 * s * U, 8 * s * U, 4 * s * U, -0.3, 0, TAU); c.fill();
}
/** Water band between y0 and y1 with moving wave lines. */
function pWater(c, e, y0, y1, c1, c2, t, waves = 6) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, e.d(c1)); g.addColorStop(1, e.d(c2));
  c.fillStyle = g; c.fillRect(0, y0, W, y1 - y0);
  c.strokeStyle = 'rgba(255,255,255,' + (0.25 + e.L * 0.3).toFixed(2) + ')'; c.lineWidth = 2 * U; c.lineCap = 'round';
  const r = mulberry(11);
  for (let i = 0; i < waves; i++) {
    const y = y0 + (y1 - y0) * (0.15 + 0.7 * r()), x = ((r() * W + t * 14 * U * (0.5 + r())) % (W + 40 * U)) - 20 * U;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 8 * U, y - 4 * U, x + 16 * U, y); c.quadraticCurveTo(x + 24 * U, y + 4 * U, x + 32 * U, y); c.stroke();
  }
}
/** Flat patch of ground (sand island etc.) as an ellipse under the stego. */
function pPatch(c, e, x, y, rx, ry, col, edge) {
  if (edge) { c.fillStyle = e.d(edge); c.beginPath(); c.ellipse(x, y + 4 * U, rx + 6 * U, ry + 4 * U, 0, 0, TAU); c.fill(); }
  c.fillStyle = e.d(col); c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill();
}
/** Things that fall slowly (leaves, petals, snow) – positions from time, no state. */
function pFalling(c, e, col, n, t, size = 4, speed = 30, seed = 21) {
  const r = mulberry(seed);
  c.fillStyle = e.d(col);
  for (let i = 0; i < n; i++) {
    const x0 = r() * W, sp = (0.6 + r() * 0.8) * speed * U, ph = r() * 100;
    const y = ((t * sp + ph * H) % (H + 20 * U)) - 10 * U, x = x0 + Math.sin(t * 1.3 + ph) * 18 * U;
    c.beginPath(); c.ellipse(x, y, size * U, size * 0.6 * U, t + ph, 0, TAU); c.fill();
  }
}

/* ---------- the places ---------- */

const PLACE_DRAW = {
  meadow: { draw(c, e) {
    pHills(c, e, '#7cc46a', 45, 8, 4, 22);
    pHills(c, e, '#64b354', 30, 4, 5, 8);
    pGround(c, e, '#78c95a', '#4f9c3c');
    pTufts(c, e, '#3f8a2e', 70);
    pFlowers(c, e, ['#ffffff', '#ffd54f', '#ff8fb1', '#b39ddb'], 14);
  } },
  jungle: { sky: ['#5fb3a0', '#c9ecd6'], draw(c, e) {
    pHills(c, e, '#2f7a4a', 70, 5, 6, 10);
    for (const [x, s] of [[0.08, 1.4], [0.3, 1.1], [0.72, 1.2], [0.95, 1.5]]) pTree(c, e, W * x, groundY + 10 * U, s, '#2e8b47', '#5d4030');
    pGround(c, e, '#3e8f3a', '#245e25');
    // Hanging vines from the top.
    c.strokeStyle = e.d('#2f6f2f'); c.lineWidth = 4 * U;
    for (let i = 0; i < 7; i++) { const x = W * (i + 0.5) / 7, len = (60 + (i * 37) % 90) * U; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + 15 * U, len / 2, x + Math.sin(e.t + i) * 6 * U, len); c.stroke(); c.fillStyle = e.d('#43a047'); c.beginPath(); c.ellipse(x, len, 8 * U, 5 * U, 0.5, 0, TAU); c.fill(); }
    // Big leaves at the sides.
    c.fillStyle = e.d('#2e7d32');
    for (const [x, y, a] of [[0, 0.8, -0.6], [W, 0.75, Math.PI + 0.6], [0, 0.95, -0.3], [W, 0.97, Math.PI + 0.3]]) { c.save(); c.translate(x, H * y); c.rotate(a); c.beginPath(); c.ellipse(55 * U, 0, 60 * U, 20 * U, 0, 0, TAU); c.fill(); c.restore(); }
    pTufts(c, e, '#1e5b20', 50);
  } },
  savanna: { sky: ['#f2b25c', '#fde3a7'], draw(c, e) {
    pHills(c, e, '#d9a95b', 20, 3, 7, 4);
    pGround(c, e, '#e2c56b', '#c49a3c');
    // Flat-topped acacia trees.
    for (const [x, s] of [[0.15, 0.9], [0.82, 1.2], [0.55, 0.5]]) {
      const X = W * x, Y = groundY + 6 * U;
      c.strokeStyle = e.d('#5d4030'); c.lineWidth = 7 * s * U;
      c.beginPath(); c.moveTo(X, Y); c.lineTo(X, Y - 60 * s * U); c.lineTo(X - 25 * s * U, Y - 85 * s * U); c.moveTo(X, Y - 60 * s * U); c.lineTo(X + 28 * s * U, Y - 88 * s * U); c.stroke();
      c.fillStyle = e.d('#6b8e23'); c.beginPath(); c.ellipse(X, Y - 92 * s * U, 62 * s * U, 14 * s * U, 0, 0, TAU); c.fill();
    }
    pTufts(c, e, '#a8822e', 80);
  } },
  volcano: { sky: ['#e0795a', '#ffc49a'], draw(c, e) {
    const X = W * 0.62, top = groundY - 200 * U;
    c.fillStyle = e.d('#5a4038');
    c.beginPath(); c.moveTo(X - 190 * U, groundY + 2); c.lineTo(X - 35 * U, top); c.lineTo(X + 35 * U, top); c.lineTo(X + 190 * U, groundY + 2); c.fill();
    c.fillStyle = '#ff7043'; c.beginPath(); c.ellipse(X, top + 2 * U, 34 * U, 8 * U, 0, 0, TAU); c.fill();
    // Lava streams and smoke puffs.
    c.strokeStyle = '#ff8a3d'; c.lineWidth = 6 * U; c.lineCap = 'round';
    c.beginPath(); c.moveTo(X - 10 * U, top + 4 * U); c.quadraticCurveTo(X - 40 * U, top + 80 * U, X - 70 * U, top + 150 * U); c.moveTo(X + 15 * U, top + 4 * U); c.quadraticCurveTo(X + 30 * U, top + 90 * U, X + 80 * U, top + 170 * U); c.stroke();
    for (let i = 0; i < 4; i++) {
      const k = (e.t * 0.25 + i / 4) % 1;
      c.fillStyle = 'rgba(110,100,100,' + (0.55 * (1 - k)).toFixed(2) + ')';
      c.beginPath(); c.arc(X + Math.sin(i * 2 + k * 3) * 20 * U, top - k * 120 * U, (14 + k * 30) * U, 0, TAU); c.fill();
    }
    pGround(c, e, '#6d5248', '#3e2c27');
    c.strokeStyle = '#ff6d00'; c.lineWidth = 3 * U;
    const r = mulberry(31);
    for (let i = 0; i < 6; i++) { const x = r() * W, y = groundY + 30 * U + r() * (H - groundY - 60 * U); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 14 * U, y + 6 * U); c.lineTo(x + 26 * U, y + 2 * U); c.stroke(); }
    pRock(c, e, W * 0.12, groundY + 50 * U, 1.2, '#4e3b35');
  } },
  island: { sky: ['#56b4ef', '#c8ecff'], draw(c, e) {
    pWater(c, e, groundY, H, '#3aa6dd', '#1d6fb0', e.t, 14);
    pPatch(c, e, W * 0.5, standY + 8 * U, W * 0.48, 46 * U, '#f2dc9b', '#ffffff');
    pPalm(c, e, W * 0.86, standY - 6 * U, 1.1, e.t);
    pRock(c, e, W * 0.12, standY + 6 * U, 0.6, '#b0a48a');
  } },
  river: { draw(c, e) {
    pHills(c, e, '#82c86e', 40, 6, 8, 18);
    pGround(c, e, '#7ccb5c', '#4f9c3c');
    // River winding behind the stego.
    c.fillStyle = e.d('#4aa8e0');
    c.beginPath(); c.moveTo(0, groundY + 40 * U); c.bezierCurveTo(W * 0.3, groundY + 20 * U, W * 0.6, groundY + 80 * U, W, groundY + 50 * U);
    c.lineTo(W, groundY + 95 * U); c.bezierCurveTo(W * 0.6, groundY + 125 * U, W * 0.3, groundY + 65 * U, 0, groundY + 85 * U); c.fill();
    pWaterLines(c, e, groundY + 50 * U, groundY + 95 * U, e.t);
    for (const x of [0.05, 0.12, 0.9]) { c.strokeStyle = e.d('#5b8f2e'); c.lineWidth = 3 * U; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(W * x + k * 5 * U, groundY + 110 * U); c.lineTo(W * x + k * 6 * U - 4 * U, groundY + 70 * U); c.stroke(); } c.fillStyle = e.d('#6d4c41'); c.fillRect(W * x + 6 * U, groundY + 66 * U, 5 * U, 14 * U); }
    pRock(c, e, W * 0.7, groundY + 120 * U, 0.6);
    pTufts(c, e, '#3f8a2e', 40, 5, groundY + 110 * U);
  } },
  cloud: { sky: ['#a7c8ff', '#ffe1f0'], clouds: false, draw(c, e) {
    c.fillStyle = e.d('#ffffff');
    for (let i = 0; i < 6; i++) { c.globalAlpha = 0.7; drawCloudShape(c, ((i * 97 + e.t * 6) % (W + 120 * U)) - 60 * U, 70 * U + (i % 3) * 60 * U, 0.9 * U); }
    c.globalAlpha = 1;
    drawRainbow(c, W * 0.2, groundY + 30 * U, W * 0.45, 0.6);
    // The big cloud he stands on.
    c.fillStyle = e.d('#ffffff');
    c.beginPath();
    for (let i = 0; i <= 8; i++) c.arc(W * i / 8, groundY + 30 * U + (i % 2) * 14 * U, 46 * U, 0, TAU);
    c.rect(0, groundY + 30 * U, W, H);
    c.fill();
    c.fillStyle = e.d('#eef3ff');
    for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(W * (i + 0.5) / 6, groundY + 140 * U + (i % 2) * 40 * U, 36 * U, 0, TAU); c.fill(); }
  } },
  beach: { sky: ['#4fb3ef', '#d0f0ff'], draw(c, e) {
    pWater(c, e, groundY, groundY + 70 * U, '#2f9ad6', '#56c3ee', e.t, 8);
    // Foam where waves reach the sand.
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.beginPath(); c.moveTo(0, groundY + 70 * U);
    for (let i = 0; i <= 12; i++) c.lineTo(W * i / 12, groundY + 66 * U + Math.sin(e.t * 2 + i) * 4 * U);
    c.lineTo(W, groundY + 80 * U); c.lineTo(0, groundY + 80 * U); c.fill();
    pGround(c, e, '#f6dd9e', '#e2be72', groundY + 76 * U);
    // Beach umbrella and shells.
    const X = W * 0.85, Y = groundY + 120 * U;
    c.strokeStyle = e.d('#8d6e63'); c.lineWidth = 4 * U; c.beginPath(); c.moveTo(X, Y + 30 * U); c.lineTo(X - 8 * U, Y - 70 * U); c.stroke();
    ['#ff5252', '#ffffff', '#ff5252', '#ffffff'].forEach((col, i) => { c.fillStyle = e.d(col); c.beginPath(); c.moveTo(X - 8 * U, Y - 74 * U); c.arc(X - 8 * U, Y - 74 * U, 52 * U, Math.PI + i * Math.PI / 4, Math.PI + (i + 1) * Math.PI / 4); c.fill(); });
    const r = mulberry(41);
    for (let i = 0; i < 6; i++) { c.fillStyle = e.d(['#ffccbc', '#f8bbd0', '#fff3e0'][i % 3]); c.beginPath(); c.arc(r() * W, groundY + 100 * U + r() * (H - groundY - 120 * U), 5 * U, Math.PI, TAU); c.fill(); }
  } },
  waterfall: { draw(c, e) {
    // Cliff with the falling water in the middle.
    c.fillStyle = e.d('#8a7a6a');
    c.beginPath(); c.moveTo(0, groundY + 2); c.lineTo(0, groundY - 190 * U); c.lineTo(W, groundY - 170 * U); c.lineTo(W, groundY + 2); c.fill();
    c.fillStyle = e.d('#5aa74a'); c.fillRect(0, groundY - 196 * U, W, 14 * U);
    const fx = W * 0.42, fw = 70 * U;
    c.fillStyle = e.d('#7fd0ff'); c.fillRect(fx, groundY - 186 * U, fw, 200 * U);
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 3 * U;
    for (let i = 0; i < 6; i++) { const x = fx + 8 * U + i * 11 * U, y = groundY - 186 * U + ((e.t * 120 * U + i * 37 * U) % (190 * U)); c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 26 * U); c.stroke(); }
    pGround(c, e, '#6cc052', '#3f8a2e');
    c.fillStyle = e.d('#4fb3e8'); c.beginPath(); c.ellipse(fx + fw / 2, groundY + 28 * U, 120 * U, 30 * U, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(fx + fw / 2 + Math.sin(e.t * 3 + i) * 40 * U, groundY + 14 * U, (6 + (i % 3) * 3) * U, 0, TAU); c.fill(); }
    pBush(c, e, W * 0.1, groundY + 60 * U, 1.1, '#3f8f3a');
    pBush(c, e, W * 0.92, groundY + 70 * U, 1.0, '#3f8f3a');
    pTufts(c, e, '#2f7a24', 40, 7, groundY + 70 * U);
  } },
  desert: { sky: ['#f7a94b', '#ffe3a3'], draw(c, e) {
    pHills(c, e, '#e8b765', 50, 3, 9, 4);
    pHills(c, e, '#f0c879', 25, 2, 10, 0);
    pGround(c, e, '#f3d08a', '#d9a858');
    // Cacti.
    for (const [x, s] of [[0.12, 1.1], [0.88, 0.9], [0.68, 0.55]]) {
      const X = W * x, Y = groundY + (40 + s * 30) * U;
      c.fillStyle = e.d('#3f9b4e');
      const arm = (ax, ay, h) => { c.fillRect(ax - 7 * s * U, ay - h, 14 * s * U, h); c.beginPath(); c.arc(ax, ay - h, 7 * s * U, 0, TAU); c.fill(); };
      arm(X, Y, 80 * s * U);
      c.fillRect(X - 30 * s * U, Y - 45 * s * U, 30 * s * U, 10 * s * U); arm(X - 26 * s * U, Y - 38 * s * U, 30 * s * U);
      c.fillRect(X, Y - 58 * s * U, 28 * s * U, 10 * s * U); arm(X + 24 * s * U, Y - 50 * s * U, 24 * s * U);
    }
    pRock(c, e, W * 0.35, groundY + 150 * U, 0.6, '#c49056');
  } },
  snow: { sky: ['#8ec5ef', '#e6f4ff'], draw(c, e) {
    pMountains(c, e, '#8fa6bf', [[0.2, 0.7, 170], [0.7, 0.8, 210], [1.05, 0.5, 120]], true);
    pGround(c, e, '#f4f8fc', '#d4e2ee');
    pPine(c, e, W * 0.1, groundY + 60 * U, 1.1, '#2e6b4f', true);
    pPine(c, e, W * 0.9, groundY + 50 * U, 0.9, '#2e6b4f', true);
    pPine(c, e, W * 0.78, groundY + 20 * U, 0.6, '#2e6b4f', true);
    pFalling(c, e, '#ffffff', 26, e.t, 2.5, 26);
  } },
  cave: { indoor: true, draw(c, e) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a1f3d'); g.addColorStop(0.55, '#3d2d57'); g.addColorStop(1, '#241a33');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // Stalactites.
    c.fillStyle = '#4a3a63';
    const r = mulberry(51);
    for (let i = 0; i < 9; i++) { const x = W * (i + 0.3 + r() * 0.4) / 9, h = (40 + r() * 70) * U; c.beginPath(); c.moveTo(x - 14 * U, 0); c.lineTo(x, h); c.lineTo(x + 14 * U, 0); c.fill(); }
    pGround(c, { ...e, d: k => k }, '#4b3b5e', '#2c2240');
    // Glowing crystals.
    const crystal = (x, y, s, col) => {
      const pulse = 0.65 + 0.35 * Math.sin(e.t * 2 + x);
      const gl = c.createRadialGradient(x, y - 30 * s * U, 4 * U, x, y - 30 * s * U, 70 * s * U);
      gl.addColorStop(0, col + '88'); gl.addColorStop(1, col + '00');
      c.globalAlpha = pulse; c.fillStyle = gl; c.beginPath(); c.arc(x, y - 30 * s * U, 70 * s * U, 0, TAU); c.fill(); c.globalAlpha = 1;
      c.fillStyle = col;
      for (const [ox, h, w] of [[-14, 50, 10], [0, 80, 13], [15, 58, 10]]) { c.beginPath(); c.moveTo(x + (ox - w) * s * U, y); c.lineTo(x + ox * s * U, y - h * s * U); c.lineTo(x + (ox + w) * s * U, y); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.moveTo(x - 3 * s * U, y - 10 * s * U); c.lineTo(x, y - 75 * s * U); c.lineTo(x + 3 * s * U, y - 10 * s * U); c.fill();
    };
    crystal(W * 0.12, groundY + 40 * U, 1.1, '#4dd0e1');
    crystal(W * 0.85, groundY + 30 * U, 1.3, '#f06292');
    crystal(W * 0.6, groundY - 5 * U, 0.6, '#b388ff');
    crystal(W * 0.3, groundY - 2 * U, 0.5, '#80deea');
  } },
  mushroom: { sky: ['#7fbfa0', '#d8f0dc'], draw(c, e) {
    pHills(c, e, '#3f7d4a', 60, 5, 12, 10);
    pGround(c, e, '#5a9a48', '#35702c');
    const shroom = (x, y, s, cap) => {
      c.fillStyle = e.d('#f5ecd7'); c.fillRect(x - 10 * s * U, y - 60 * s * U, 20 * s * U, 60 * s * U);
      c.fillStyle = e.d(cap); c.beginPath(); c.ellipse(x, y - 60 * s * U, 48 * s * U, 34 * s * U, 0, Math.PI, TAU); c.fill();
      c.fillStyle = e.d('#ffffff'); for (const [ox, oy, r] of [[-22, -72, 6], [5, -82, 7], [26, -70, 5], [-5, -66, 4]]) { c.beginPath(); c.arc(x + ox * s * U, y + oy * s * U, r * s * U, 0, TAU); c.fill(); }
    };
    shroom(W * 0.12, groundY + 40 * U, 1.3, '#e53935');
    shroom(W * 0.88, groundY + 30 * U, 1.0, '#8e24aa');
    shroom(W * 0.7, groundY + 6 * U, 0.6, '#fb8c00');
    shroom(W * 0.3, groundY + 4 * U, 0.5, '#e53935');
    pTufts(c, e, '#2e5e24', 50);
  } },
  sunflower: { sky: ['#5cb6f0', '#d6f0ff'], draw(c, e) {
    pHills(c, e, '#8bc96c', 30, 4, 13, 10);
    pGround(c, e, '#7cbf4f', '#4f8f30');
    const flower = (x, y, s) => {
      c.strokeStyle = e.d('#4c8c2a'); c.lineWidth = 4 * s * U; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 70 * s * U); c.stroke();
      c.fillStyle = e.d('#ffc107');
      for (let k = 0; k < 10; k++) { const a = k * TAU / 10; c.beginPath(); c.ellipse(x + Math.cos(a) * 14 * s * U, y - 70 * s * U + Math.sin(a) * 14 * s * U, 9 * s * U, 4.5 * s * U, a, 0, TAU); c.fill(); }
      c.fillStyle = e.d('#6d4c41'); c.beginPath(); c.arc(x, y - 70 * s * U, 9 * s * U, 0, TAU); c.fill();
    };
    for (let row = 0; row < 2; row++) for (let i = 0; i < 9; i++) flower(W * (i + 0.5 + row * 0.5) / 9, groundY + (8 + row * 22) * U, 0.55 + row * 0.15);
    flower(W * 0.08, groundY + 150 * U, 1.3); flower(W * 0.93, groundY + 140 * U, 1.2);
  } },
  bamboo: { sky: ['#9bd4b5', '#e3f6ea'], draw(c, e) {
    pGround(c, e, '#8ac26a', '#57923d');
    const r = mulberry(61);
    for (let i = 0; i < 16; i++) {
      const x = r() * W, w = (7 + r() * 6) * U, far = i < 10;
      if (!far && Math.abs(x - W / 2) < 110 * U) continue;
      const base = far ? groundY + 6 * U : groundY + 90 * U;
      c.fillStyle = e.d(far ? '#7fb069' : '#5a9a3c'); c.fillRect(x - w / 2, 0, w, base);
      c.fillStyle = e.d(far ? '#6a9a57' : '#467d2c');
      for (let y = base - 40 * U; y > 0; y -= 46 * U) c.fillRect(x - w / 2 - 1, y, w + 2, 3 * U);
      c.fillStyle = e.d('#6fbf4a'); c.beginPath(); c.ellipse(x + 14 * U, base * 0.4, 16 * U, 4 * U, -0.5, 0, TAU); c.fill();
    }
  } },
  pond: { draw(c, e) {
    pHills(c, e, '#7cc46a', 35, 6, 14, 14);
    pGround(c, e, '#78c95a', '#4f9c3c');
    c.fillStyle = e.d('#4aa3d8'); c.beginPath(); c.ellipse(W * 0.5, groundY + 50 * U, W * 0.62, 42 * U, 0, 0, TAU); c.fill();
    pWaterLines(c, e, groundY + 25 * U, groundY + 75 * U, e.t);
    const r = mulberry(71);
    for (let i = 0; i < 7; i++) {
      const x = W * (0.1 + r() * 0.8), y = groundY + 30 * U + r() * 40 * U;
      c.fillStyle = e.d('#3f9b3a'); c.beginPath(); c.arc(x, y, 12 * U, 0.3, TAU - 0.3); c.lineTo(x, y); c.fill();
      if (i % 2) { c.fillStyle = e.d('#ff8fb1'); for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse(x + Math.cos(k) * 4 * U, y - 4 * U, 5 * U, 2.5 * U, k, 0, TAU); c.fill(); } }
    }
    pTufts(c, e, '#3f8a2e', 40, 9, groundY + 100 * U);
  } },
  swamp: { sky: ['#8fae9a', '#d4e2cf'], draw(c, e) {
    pHills(c, e, '#5d7d55', 40, 5, 15, 10);
    pGround(c, e, '#6f8a4b', '#4b6234');
    c.fillStyle = e.d('#5d7a5c');
    for (const [x, y, rx] of [[0.18, 40, 70], [0.78, 60, 90], [0.4, 150, 50]]) { c.beginPath(); c.ellipse(W * x, groundY + y * U, rx * U, 16 * U, 0, 0, TAU); c.fill(); }
    // Cattails.
    for (const x of [0.06, 0.1, 0.9, 0.95, 0.62]) { c.strokeStyle = e.d('#556b2f'); c.lineWidth = 3 * U; c.beginPath(); c.moveTo(W * x, groundY + 70 * U); c.lineTo(W * x, groundY + 10 * U); c.stroke(); c.fillStyle = e.d('#6d4c41'); c.beginPath(); c.ellipse(W * x, groundY + 16 * U, 4 * U, 11 * U, 0, 0, TAU); c.fill(); }
    // A frog on a lily pad.
    const fx = W * 0.78, fy = groundY + 56 * U;
    c.fillStyle = e.d('#3f9b3a'); c.beginPath(); c.ellipse(fx, fy + 4 * U, 18 * U, 6 * U, 0, 0, TAU); c.fill();
    c.fillStyle = e.d('#7cb342'); c.beginPath(); c.ellipse(fx, fy - 4 * U, 11 * U, 8 * U, 0, 0, TAU); c.fill();
    c.fillStyle = '#fff'; for (const ox of [-5, 5]) { c.beginPath(); c.arc(fx + ox * U, fy - 11 * U, 3.5 * U, 0, TAU); c.fill(); }
    c.fillStyle = '#222'; for (const ox of [-5, 5]) { c.beginPath(); c.arc(fx + ox * U, fy - 11 * U, 1.6 * U, 0, TAU); c.fill(); }
    // Mist.
    c.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(((i * 130 + e.t * 8) % (W + 200 * U)) - 100 * U, groundY + 20 * U + i * 25 * U, 110 * U, 14 * U, 0, 0, TAU); c.fill(); }
  } },
  autumn: { sky: ['#f0a868', '#ffe0b8'], draw(c, e) {
    pHills(c, e, '#c98a4b', 40, 5, 16, 10);
    for (const [x, s, col] of [[0.08, 1.2, '#e65100'], [0.3, 0.8, '#fbc02d'], [0.72, 0.9, '#d84315'], [0.93, 1.3, '#f9a825']]) pTree(c, e, W * x, groundY + 12 * U, s, col, '#5d4030');
    pGround(c, e, '#b9a058', '#8a6f35');
    const r = mulberry(81);
    for (let i = 0; i < 30; i++) { c.fillStyle = e.d(['#e65100', '#fbc02d', '#d84315'][i % 3]); c.beginPath(); c.ellipse(r() * W, groundY + 20 * U + r() * (H - groundY), 6 * U, 3 * U, r() * 3, 0, TAU); c.fill(); }
    pFalling(c, e, '#ef6c00', 10, e.t, 5, 22, 82);
    pFalling(c, e, '#fbc02d', 8, e.t, 5, 18, 83);
  } },
  cherry: { sky: ['#9cc9f2', '#ffe4ef'], draw(c, e) {
    pHills(c, e, '#a3d18a', 30, 5, 17, 12);
    for (const [x, s] of [[0.1, 1.2], [0.35, 0.7], [0.68, 0.8], [0.92, 1.3]]) pTree(c, e, W * x, groundY + 12 * U, s, '#f8bbd0', '#6d4c41', '#f48fb1');
    pGround(c, e, '#9ccc7a', '#6aa04c');
    pFalling(c, e, '#f8bbd0', 22, e.t, 3.5, 20, 91);
    pTufts(c, e, '#5c9a3c', 40);
  } },
  canyon: { sky: ['#f2a65a', '#ffdcb0'], draw(c, e) {
    // Mesas in the back and steep walls left and right.
    c.fillStyle = e.d('#c46a3c');
    c.fillRect(W * 0.32, groundY - 70 * U, W * 0.22, 72 * U); c.fillRect(W * 0.6, groundY - 45 * U, W * 0.16, 47 * U);
    c.fillStyle = e.d('#a8532d');
    c.beginPath(); c.moveTo(0, 0); c.lineTo(W * 0.24, 0); c.lineTo(W * 0.2, groundY - 120 * U); c.lineTo(W * 0.26, groundY + 40 * U); c.lineTo(0, groundY + 80 * U); c.fill();
    c.beginPath(); c.moveTo(W, 0); c.lineTo(W * 0.8, 0); c.lineTo(W * 0.84, groundY - 140 * U); c.lineTo(W * 0.76, groundY + 30 * U); c.lineTo(W, groundY + 70 * U); c.fill();
    c.strokeStyle = e.d('#8a4022'); c.lineWidth = 3 * U;
    for (let y = 60 * U; y < groundY; y += 50 * U) { c.beginPath(); c.moveTo(0, y); c.lineTo(W * 0.2, y + 6 * U); c.moveTo(W, y + 10 * U); c.lineTo(W * 0.82, y + 16 * U); c.stroke(); }
    pGround(c, e, '#d98b55', '#a85f33', groundY + 2);
    pRock(c, e, W * 0.2, groundY + 140 * U, 0.9, '#b8693e');
    pRock(c, e, W * 0.86, groundY + 120 * U, 0.7, '#b8693e');
  } },
  lagoon: { sky: ['#45c0e8', '#d4f6ff'], draw(c, e) {
    pWater(c, e, groundY, groundY + 90 * U, '#2bb3c9', '#64e0d8', e.t, 10);
    // Corals and a jumping fish.
    for (const [x, col] of [[0.15, '#ff7096'], [0.32, '#ffb74d'], [0.7, '#ba68c8'], [0.88, '#ff7096']]) {
      c.strokeStyle = e.d(col); c.lineWidth = 5 * U; c.lineCap = 'round';
      const X = W * x, Y = groundY + 80 * U;
      c.beginPath(); c.moveTo(X, Y); c.lineTo(X, Y - 26 * U); c.moveTo(X, Y - 12 * U); c.lineTo(X - 10 * U, Y - 24 * U); c.moveTo(X, Y - 16 * U); c.lineTo(X + 10 * U, Y - 30 * U); c.stroke();
    }
    const k = (e.t * 0.4) % 1, fx = W * 0.25 + k * W * 0.3, fy = groundY + 30 * U - Math.sin(k * Math.PI) * 50 * U;
    if (k < 0.95) { c.fillStyle = e.d('#ff8a65'); c.beginPath(); c.ellipse(fx, fy, 11 * U, 6 * U, -0.6 + k * 1.2, 0, TAU); c.fill(); }
    pGround(c, e, '#f7e2a8', '#e6c47a', groundY + 86 * U);
    pPalm(c, e, W * 0.08, groundY + 140 * U, 0.9, e.t);
  } },
  rainbow: { sky: ['#b3a2ff', '#ffd6f2'], draw(c, e) {
    drawRainbow(c, W * 0.5, groundY + 20 * U, W * 0.55, 0.9);
    const cols = ['#ff9aa2', '#ffdac1', '#e2f0cb', '#b5ead7', '#c7ceea'];
    cols.forEach((col, i) => pHills(c, e, col, 30 + i * 6, 3 + i, 18 + i, 30 - i * 7));
    pGround(c, e, '#b5ead7', '#8fd3b8');
    // Lollipop trees.
    for (const [x, col] of [[0.1, '#ff8fb1'], [0.88, '#ffd54f'], [0.72, '#80deea']]) {
      c.fillStyle = e.d('#ffffff'); c.fillRect(W * x - 3 * U, groundY + 10 * U, 6 * U, 60 * U);
      c.fillStyle = e.d(col); c.beginPath(); c.arc(W * x, groundY + 4 * U, 26 * U, 0, TAU); c.fill();
      c.strokeStyle = e.d('#ffffff'); c.lineWidth = 3 * U; c.beginPath(); c.arc(W * x, groundY + 4 * U, 14 * U, 0, 4.5); c.stroke();
    }
    pFlowers(c, e, ['#ffffff', '#ff8fb1', '#b39ddb', '#80deea'], 18, 19, 1.2);
  } },
  dinovalley: { draw(c, e) {
    pMountains(c, e, '#7f9a6e', [[0.15, 0.6, 120], [0.6, 0.7, 150], [0.95, 0.5, 100]]);
    // A long-neck dino far away.
    const X = W * 0.7, Y = groundY - 4 * U;
    c.fillStyle = e.d('#6b8c5a');
    c.beginPath(); c.ellipse(X, Y - 18 * U, 34 * U, 16 * U, 0, 0, TAU); c.fill();
    c.lineWidth = 9 * U; c.strokeStyle = e.d('#6b8c5a'); c.lineCap = 'round';
    c.beginPath(); c.moveTo(X + 22 * U, Y - 24 * U); c.quadraticCurveTo(X + 40 * U, Y - 70 * U, X + 55 * U, Y - 80 * U); c.moveTo(X - 30 * U, Y - 18 * U); c.quadraticCurveTo(X - 55 * U, Y - 14 * U, X - 70 * U, Y - 4 * U); c.stroke();
    for (const lx of [-20, -8, 12, 24]) c.fillRect(X + lx * U - 3 * U, Y - 8 * U, 7 * U, 14 * U);
    pGround(c, e, '#86c062', '#5b9440');
    // Other nests with eggs.
    for (const [x, y, col] of [[0.12, 60, '#ffe0b2'], [0.88, 80, '#e1bee7']]) {
      drawNest(c, W * x, groundY + y * U, 80 * U, 'back');
      for (const ox of [-12, 0, 12]) { c.fillStyle = e.d(col); c.beginPath(); c.ellipse(W * x + ox * U, groundY + y * U - 16 * U, 8 * U, 11 * U, 0, 0, TAU); c.fill(); }
      drawNest(c, W * x, groundY + y * U, 80 * U, 'front');
    }
    for (const x of [0.3, 0.55]) pBush(c, e, W * x, groundY + 22 * U, 0.6, '#4f9a3c');
    pTufts(c, e, '#3f8a2e', 40);
  } },
  mountainlake: { sky: ['#5aa9e6', '#d6eeff'], draw(c, e) {
    pMountains(c, e, '#7d8fa8', [[0.2, 0.6, 180], [0.55, 0.7, 220], [0.9, 0.6, 160]], true);
    c.fillStyle = e.d('#3f8fd1'); c.fillRect(0, groundY, W, 60 * U);
    // Mirror image of the mountains.
    c.save(); c.globalAlpha = 0.25; c.translate(0, groundY * 2); c.scale(1, -0.3);
    pMountains(c, e, '#c5d3e6', [[0.2, 0.6, 180], [0.55, 0.7, 220], [0.9, 0.6, 160]]);
    c.restore();
    pWaterLines(c, e, groundY + 6 * U, groundY + 56 * U, e.t);
    pGround(c, e, '#6cb85a', '#3f7d33', groundY + 58 * U);
    pPine(c, e, W * 0.07, groundY + 130 * U, 1.0);
    pPine(c, e, W * 0.93, groundY + 120 * U, 1.1);
    pTufts(c, e, '#2f6f28', 40, 23, groundY + 70 * U);
  } },
  springs: { sky: ['#8fc0e0', '#e8f2f8'], draw(c, e) {
    pHills(c, e, '#a39282', 50, 4, 24, 6);
    pGround(c, e, '#b9a48e', '#8a7562');
    // Steaming pools and a geyser that erupts now and then.
    for (const [x, y, rx] of [[0.2, 50, 60], [0.82, 70, 50]]) {
      c.fillStyle = e.d('#e8dccb'); c.beginPath(); c.ellipse(W * x, groundY + y * U, rx * U + 6 * U, 16 * U, 0, 0, TAU); c.fill();
      c.fillStyle = e.d('#5fd0d8'); c.beginPath(); c.ellipse(W * x, groundY + y * U, rx * U, 12 * U, 0, 0, TAU); c.fill();
      for (let i = 0; i < 3; i++) { const k = (e.t * 0.3 + i / 3) % 1; c.fillStyle = 'rgba(255,255,255,' + (0.4 * (1 - k)).toFixed(2) + ')'; c.beginPath(); c.arc(W * x + (i - 1) * 18 * U, groundY + y * U - k * 70 * U, (8 + k * 14) * U, 0, TAU); c.fill(); }
    }
    const gx = W * 0.55, gy = groundY + 4 * U, burst = Math.max(0, Math.sin(e.t * 0.6)) ** 3;
    c.fillStyle = e.d('#cbb9a2'); c.beginPath(); c.ellipse(gx, gy, 22 * U, 7 * U, 0, 0, TAU); c.fill();
    if (burst > 0.05) {
      c.fillStyle = 'rgba(220,245,255,0.85)';
      c.beginPath(); c.moveTo(gx - 8 * U, gy); c.quadraticCurveTo(gx - 14 * U, gy - 80 * U * burst, gx, gy - 130 * U * burst); c.quadraticCurveTo(gx + 14 * U, gy - 80 * U * burst, gx + 8 * U, gy); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(gx, gy - 130 * U * burst, 22 * U * burst, 0, TAU); c.fill();
    }
    pRock(c, e, W * 0.08, groundY + 130 * U, 0.8, '#9c8a78');
  } },
  ice: { sky: ['#7fb7e6', '#e3f3ff'], draw(c, e) {
    // Polar light, strongest at night.
    const a = clamp(0.25 + (1 - e.L) * 0.75, 0, 1);
    for (let i = 0; i < 3; i++) {
      const g = c.createLinearGradient(0, 40 * U, 0, groundY * 0.7);
      g.addColorStop(0, 'rgba(120,255,200,0)'); g.addColorStop(0.5, ['rgba(120,255,200,', 'rgba(140,200,255,', 'rgba(200,140,255,'][i] + (0.35 * a).toFixed(2) + ')'); g.addColorStop(1, 'rgba(120,255,200,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(0, 60 * U + i * 30 * U);
      for (let x = 0; x <= W; x += W / 12) c.lineTo(x, 60 * U + i * 30 * U + Math.sin(x / W * 6 + e.t * 0.5 + i) * 25 * U);
      c.lineTo(W, groundY * 0.7); c.lineTo(0, groundY * 0.7); c.fill();
    }
    pWater(c, e, groundY, groundY + 70 * U, '#2f6fa0', '#4f8fc0', e.t, 6);
    // Icebergs.
    for (const [x, w, h] of [[0.18, 90, 70], [0.75, 120, 95], [0.95, 60, 40]]) {
      c.fillStyle = e.d('#eef8ff'); c.beginPath(); c.moveTo(W * x - w / 2 * U, groundY + 30 * U); c.lineTo(W * x - w / 4 * U, groundY + 30 * U - h * U); c.lineTo(W * x + w / 6 * U, groundY + 30 * U - h * 0.8 * U); c.lineTo(W * x + w / 2 * U, groundY + 30 * U); c.fill();
      c.fillStyle = e.d('#b8dcf5'); c.beginPath(); c.moveTo(W * x + w / 6 * U, groundY + 30 * U - h * 0.8 * U); c.lineTo(W * x + w / 2 * U, groundY + 30 * U); c.lineTo(W * x + w / 8 * U, groundY + 30 * U); c.fill();
    }
    pGround(c, e, '#f2f9ff', '#cfe4f4', groundY + 66 * U);
  } },
  starhill: { sky: ['#5b5aa8', '#c6b6ef'], stars: true, draw(c, e) {
    // A big moon by day, a shooting star now and then.
    c.fillStyle = 'rgba(255,250,220,0.85)'; c.beginPath(); c.arc(W * 0.78, 110 * U, 34 * U, 0, TAU); c.fill();
    const k = (e.t * 0.15) % 1;
    if (k < 0.2) { const x = W * (0.1 + k * 3), y = 60 * U + k * 200 * U; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2 * U; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 40 * U, y - 20 * U); c.stroke(); }
    pHills(c, e, '#3f4a86', 40, 5, 26, 10);
    pGround(c, e, '#58639f', '#363f72');
    c.fillStyle = e.d('#7986cb');
    c.beginPath(); c.ellipse(W * 0.5, groundY + 20 * U, W * 0.7, 40 * U, 0, Math.PI, TAU); c.fill();
    pFlowers(c, e, ['#fff59d', '#b3e5fc', '#f8bbd0'], 16, 27, 0.9);
  } },
  bigtree: { draw(c, e) {
    pHills(c, e, '#6fb85d', 35, 5, 28, 12);
    pGround(c, e, '#6fbf54', '#447f33');
    // Huge trunk on the left, leaves across the top, a little tree house.
    c.fillStyle = e.d('#6d4a30'); c.fillRect(W * 0.02, 0, W * 0.2, groundY + 60 * U);
    c.fillStyle = e.d('#5a3c26'); c.beginPath(); c.moveTo(0, groundY + 70 * U); c.lineTo(W * 0.32, groundY + 70 * U); c.lineTo(W * 0.22, groundY + 30 * U); c.lineTo(W * 0.02, groundY + 30 * U); c.fill();
    c.fillStyle = e.d('#3f8f3a');
    for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(W * i / 7, 20 * U + (i % 2) * 30 * U, 70 * U, 0, TAU); c.fill(); }
    c.fillStyle = e.d('#a1774b'); c.fillRect(W * 0.12, groundY - 190 * U, 90 * U, 50 * U);
    c.fillStyle = e.d('#c62828'); c.beginPath(); c.moveTo(W * 0.12 - 8 * U, groundY - 190 * U); c.lineTo(W * 0.12 + 45 * U, groundY - 225 * U); c.lineTo(W * 0.12 + 98 * U, groundY - 190 * U); c.fill();
    c.fillStyle = e.d('#ffe082'); c.fillRect(W * 0.12 + 32 * U, groundY - 178 * U, 22 * U, 18 * U);
    c.strokeStyle = e.d('#8d6e63'); c.lineWidth = 3 * U;
    c.beginPath(); c.moveTo(W * 0.12 + 75 * U, groundY - 140 * U); c.lineTo(W * 0.12 + 75 * U, groundY + 40 * U); c.moveTo(W * 0.12 + 90 * U, groundY - 140 * U); c.lineTo(W * 0.12 + 90 * U, groundY + 40 * U);
    for (let y = groundY - 130 * U; y < groundY + 40 * U; y += 20 * U) { c.moveTo(W * 0.12 + 75 * U, y); c.lineTo(W * 0.12 + 90 * U, y); }
    c.stroke();
    pTufts(c, e, '#2f6f28', 40);
  } },
  berryhill: { draw(c, e) {
    pHills(c, e, '#8fca6c', 60, 3, 29, 10);
    pGround(c, e, '#7fc35c', '#4f9037');
    for (const [x, y, s, b] of [[0.12, 40, 1.1, '#7b3fb0'], [0.88, 50, 1.2, '#e53935'], [0.3, 4, 0.6, '#3949ab'], [0.7, 6, 0.6, '#e53935']]) pBush(c, e, W * x, groundY + y * U, s, '#3f8f3a', b);
    // A basket full of berries.
    const X = W * 0.86, Y = groundY + 150 * U;
    c.fillStyle = e.d('#a1774b'); c.beginPath(); c.moveTo(X - 26 * U, Y - 24 * U); c.lineTo(X + 26 * U, Y - 24 * U); c.lineTo(X + 20 * U, Y); c.lineTo(X - 20 * U, Y); c.fill();
    c.strokeStyle = e.d('#a1774b'); c.lineWidth = 4 * U; c.beginPath(); c.arc(X, Y - 24 * U, 22 * U, Math.PI, TAU); c.stroke();
    for (const [ox, col] of [[-12, '#7b3fb0'], [0, '#e53935'], [12, '#3949ab'], [-5, '#e53935'], [7, '#7b3fb0']]) { c.fillStyle = e.d(col); c.beginPath(); c.arc(X + ox * U, Y - 28 * U - (ox % 2 ? 4 : 0) * U, 6 * U, 0, TAU); c.fill(); }
    pTufts(c, e, '#3f8a2e', 50);
  } },
  treasure: { sky: ['#4fb0ea', '#d0eeff'], draw(c, e) {
    pWater(c, e, groundY, H, '#2f8fcf', '#1c5f99', e.t, 12);
    // Pirate ship on the horizon.
    const X = W * 0.25 + Math.sin(e.t * 0.3) * 10 * U, Y = groundY + 6 * U + Math.sin(e.t * 1.5) * 2 * U;
    c.fillStyle = e.d('#6d4c41'); c.beginPath(); c.moveTo(X - 40 * U, Y - 12 * U); c.lineTo(X + 40 * U, Y - 12 * U); c.lineTo(X + 30 * U, Y); c.lineTo(X - 30 * U, Y); c.fill();
    c.strokeStyle = e.d('#4e342e'); c.lineWidth = 3 * U; c.beginPath(); c.moveTo(X, Y - 12 * U); c.lineTo(X, Y - 70 * U); c.stroke();
    c.fillStyle = e.d('#f5f5f5'); c.beginPath(); c.moveTo(X + 2 * U, Y - 66 * U); c.quadraticCurveTo(X + 30 * U, Y - 45 * U, X + 2 * U, Y - 20 * U); c.fill();
    c.fillStyle = '#222'; c.fillRect(X - 1 * U, Y - 82 * U, 18 * U, 11 * U);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(X + 8 * U, Y - 77 * U, 2.5 * U, 0, TAU); c.fill();
    pPatch(c, e, W * 0.5, standY + 8 * U, W * 0.5, 50 * U, '#f2dc9b', '#ffffff');
    pPalm(c, e, W * 0.1, standY - 4 * U, 0.9, e.t);
    // Treasure chest with sparkling gold.
    const cx = W * 0.86, cy = standY + 10 * U;
    c.fillStyle = e.d('#8d5a2b'); c.fillRect(cx - 24 * U, cy - 26 * U, 48 * U, 26 * U);
    c.fillStyle = e.d('#a86b33'); c.beginPath(); c.ellipse(cx, cy - 26 * U, 24 * U, 10 * U, 0, Math.PI, TAU); c.fill();
    c.fillStyle = e.d('#ffd54f'); c.fillRect(cx - 24 * U, cy - 16 * U, 48 * U, 4 * U); c.fillRect(cx - 4 * U, cy - 22 * U, 8 * U, 10 * U);
    if (Math.sin(e.t * 3) > 0.6) { c.fillStyle = '#fffde7'; c.beginPath(); c.arc(cx + 12 * U, cy - 34 * U, 3 * U, 0, TAU); c.fill(); }
  } },
};

/** White flow lines on calm water between y0 and y1. */
function pWaterLines(c, e, y0, y1, t) {
  c.strokeStyle = 'rgba(255,255,255,' + (0.3 + e.L * 0.3).toFixed(2) + ')'; c.lineWidth = 2 * U; c.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const y = lerp(y0, y1, (i + 0.5) / 6), x = ((i * 71 * U + t * 16 * U) % (W + 60 * U)) - 30 * U;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + 22 * U, y); c.stroke();
  }
}

/** On the way: a seamless landscape that scrolls with the distance walked (scroll in px). */
PLACE_DRAW.travel = { draw(c, e) {
  const sc = e.scroll || 0;
  const band = (col, y0, amp, speed, wl) => {
    c.fillStyle = e.d(col); c.beginPath(); c.moveTo(0, groundY + 2);
    for (let x = 0; x <= W + 8; x += 8) c.lineTo(x, y0 - amp * U * (0.5 + 0.5 * Math.sin((x + sc * speed) / (wl * U))) - amp * 0.4 * U * Math.sin((x + sc * speed) / (wl * 0.37 * U)));
    c.lineTo(W, groundY + 2); c.fill();
  };
  band('#9fc4a0', groundY - 30 * U, 50, 0.15, 90);
  band('#7cc46a', groundY - 8 * U, 26, 0.35, 60);
  pGround(c, e, '#78c95a', '#4f9c3c');
  // The path he walks on.
  c.fillStyle = e.d('#d9b98a'); c.fillRect(0, standY - 16 * U, W, 40 * U);
  c.fillStyle = e.d('#c9a574');
  for (let i = 0; i < 12; i++) { const x = ((i * 53 * U - sc) % (W + 40 * U) + W + 40 * U) % (W + 40 * U) - 20 * U; c.beginPath(); c.ellipse(x, standY + (i % 3) * 8 * U, 5 * U, 3 * U, 0, 0, TAU); c.fill(); }
  // Trees and bushes passing by (behind the path).
  const items = 6, span = W + 200 * U;
  for (let i = 0; i < items; i++) {
    const x = ((i * span / items - sc * 0.7) % span + span) % span - 100 * U;
    if (i % 2) pTree(c, e, x, groundY + 30 * U, 0.7, '#4caf50'); else pBush(c, e, x, groundY + 40 * U, 0.8, '#4f9a3c');
  }
  // Grass in front scrolls fastest.
  c.strokeStyle = e.d('#3f8a2e'); c.lineWidth = 2 * U; c.lineCap = 'round'; c.beginPath();
  const r = mulberry(99);
  for (let i = 0; i < 50; i++) {
    const x0 = r() * (W + 40 * U), y = standY + 30 * U + r() * (H - standY - 30 * U), x = ((x0 - sc * 1.3) % (W + 40 * U) + W + 40 * U) % (W + 40 * U) - 20 * U;
    c.moveTo(x, y); c.lineTo(x - 2 * U, y - 8 * U); c.moveTo(x, y); c.lineTo(x + 2 * U, y - 8 * U);
  }
  c.stroke();
} };

/** Picture of a place for the places list (day light, cached). Returns a canvas of w x h. */
function placePicture(id, w, h) {
  const key = id + ':' + w + 'x' + h;
  if (placeCache.has(key)) return placeCache.get(key);
  const big = document.createElement('canvas');
  big.width = Math.round(W); big.height = Math.round(H);
  const bc = big.getContext('2d');
  drawBackground(bc, { light: 1, warm: 0, sun: 0.35, night: false }, 3, id, 'sun');
  const small = document.createElement('canvas');
  small.width = w; small.height = h;
  // Crop around the horizon, where each place shows what is special about it.
  const ch = Math.min(H, W * h / w), cy = clamp(groundY - ch * 0.55, 0, H - ch);
  small.getContext('2d').drawImage(big, 0, cy, W, ch, 0, 0, w, h);
  placeCache.set(key, small);
  return small;
}
