/* 07-draw-scene.js – the landscape (sky by real time, sun, moon, stars, clouds, hills, meadow)
 * and all small things: nest, egg with cracks, poop with flies, food, water bowl, bathtub,
 * toothbrush, ball and the particles (hearts, sparkles, bubbles, confetti, Zzz ...). */

const SKY = {
  night: ['#141a3d', '#2c3570'], dawn: ['#f3a07a', '#ffd9a0'],
  day: ['#4fa8e8', '#bfe6ff'], hillFar: '#7cc46a', hillNear: '#64b354', ground: ['#78c95a', '#4f9c3c'],
};

/** Fixed random decorations (stars, grass, flowers, clouds), made on resize. */
let deco = { stars: [], grass: [], flowers: [], clouds: [] };
function makeDeco() {
  const r = mulberry(7);
  deco.stars = Array.from({ length: 70 }, () => ({ x: r() * W, y: r() * groundY * 0.8, s: 0.6 + r() * 1.6, p: r() * TAU }));
  deco.grass = Array.from({ length: 70 }, () => ({ x: r() * W, y: groundY + 8 + r() * (H - groundY), h: 4 + r() * 7 }));
  deco.flowers = Array.from({ length: 14 }, () => ({ x: r() * W, y: groundY + 20 + r() * (H - groundY - 40), c: ['#fff', '#ffd54f', '#ff8fb1', '#b39ddb'][Math.floor(r() * 4)] }));
  deco.clouds = Array.from({ length: 4 }, (_, i) => ({ x: r() * W, y: 60 * U + i * 38 * U + r() * 30 * U, s: 0.7 + r() * 0.6, v: 4 + r() * 6 }));
}
/** Small seeded random generator so the meadow looks the same every time. */
function mulberry(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

/** Background: sky, stars, sun or moon, clouds, hills and meadow for sky state `sky` (see skyAt). */
function drawBackground(c, sky, time) {
  const L = sky.light, Wm = sky.warm;
  // Sky gradient: night -> day, with an orange glow at dawn and dusk.
  let top = mix(SKY.night[0], SKY.day[0], L), bottom = mix(SKY.night[1], SKY.day[1], L);
  if (Wm > 0) { top = mixRGB(top, SKY.dawn[0], Wm * 0.35); bottom = mixRGB(bottom, SKY.dawn[1], Wm * 0.6); }
  const gr = c.createLinearGradient(0, 0, 0, groundY);
  gr.addColorStop(0, top); gr.addColorStop(1, bottom);
  c.fillStyle = gr; c.fillRect(0, 0, W, groundY + 2);

  // Stars fade in at night and twinkle.
  const starA = clamp(1 - L * 1.6, 0, 1);
  if (starA > 0) {
    c.fillStyle = '#fff8d8';
    for (const s of deco.stars) {
      c.globalAlpha = starA * (0.55 + 0.45 * Math.sin(time * 2 + s.p));
      c.beginPath(); c.arc(s.x, s.y, s.s, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  }

  // Sun (day) or moon (night) on an arc across the sky.
  const p = clamp(sky.sun, 0, 1), arcX = lerp(W * 0.08, W * 0.92, p), arcY = groundY - Math.sin(p * Math.PI) * groundY * 0.72 + 40 * U;
  if (!sky.night) {
    const r = 26 * U;
    const glow = c.createRadialGradient(arcX, arcY, r * 0.5, arcX, arcY, r * 2.6);
    glow.addColorStop(0, 'rgba(255,240,170,0.55)'); glow.addColorStop(1, 'rgba(255,240,170,0)');
    c.fillStyle = glow; c.beginPath(); c.arc(arcX, arcY, r * 2.6, 0, TAU); c.fill();
    c.fillStyle = Wm > 0.4 ? '#ffb347' : '#ffe066';
    c.beginPath(); c.arc(arcX, arcY, r, 0, TAU); c.fill();
  } else {
    const r = 20 * U;
    c.fillStyle = 'rgba(255,250,220,0.15)'; c.beginPath(); c.arc(arcX, arcY, r * 2, 0, TAU); c.fill();
    c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(arcX, arcY, r, 0, TAU); c.fill();
    c.fillStyle = mix(SKY.night[0], SKY.night[1], 0.4);
    c.beginPath(); c.arc(arcX + r * 0.45, arcY - r * 0.25, r * 0.85, 0, TAU); c.fill();
  }

  // Clouds drift slowly.
  c.fillStyle = 'rgba(255,255,255,' + (0.35 + L * 0.5).toFixed(2) + ')';
  for (const cl of deco.clouds) {
    const cxp = ((cl.x + time * cl.v * U) % (W + 160 * U)) - 80 * U, s = cl.s * U;
    c.beginPath();
    c.arc(cxp, cl.y, 20 * s, 0, TAU); c.arc(cxp + 22 * s, cl.y - 9 * s, 24 * s, 0, TAU);
    c.arc(cxp + 46 * s, cl.y, 18 * s, 0, TAU); c.rect(cxp, cl.y, 46 * s, 18 * s);
    c.fill();
  }

  // Two layers of hills.
  const dim = k => mix('#1d2a4a', k, clamp(L * 1.1, 0.25, 1));
  c.fillStyle = dim(SKY.hillFar);
  c.beginPath(); c.moveTo(0, groundY);
  for (let i = 0; i <= 8; i++) c.quadraticCurveTo(W * (i - 0.5) / 8, groundY - (55 + (i % 3) * 22) * U, W * i / 8, groundY - 25 * U);
  c.lineTo(W, groundY + 2); c.lineTo(0, groundY + 2); c.fill();
  c.fillStyle = dim(SKY.hillNear);
  c.beginPath(); c.moveTo(0, groundY - 10 * U);
  c.bezierCurveTo(W * 0.25, groundY - 50 * U, W * 0.45, groundY - 5 * U, W * 0.65, groundY - 30 * U);
  c.bezierCurveTo(W * 0.8, groundY - 48 * U, W * 0.92, groundY - 15 * U, W, groundY - 22 * U);
  c.lineTo(W, groundY + 2); c.lineTo(0, groundY + 2); c.fill();

  // Meadow with grass tufts and flowers.
  const gg = c.createLinearGradient(0, groundY, 0, H);
  gg.addColorStop(0, dim(SKY.ground[0])); gg.addColorStop(1, dim(SKY.ground[1]));
  c.fillStyle = gg; c.fillRect(0, groundY, W, H - groundY);
  c.strokeStyle = dim('#3f8a2e'); c.lineWidth = 2 * U; c.lineCap = 'round';
  c.beginPath();
  for (const gs of deco.grass) { c.moveTo(gs.x, gs.y); c.lineTo(gs.x - 2 * U, gs.y - gs.h * U); c.moveTo(gs.x, gs.y); c.lineTo(gs.x + 2 * U, gs.y - gs.h * U); }
  c.stroke();
  for (const f of deco.flowers) {
    c.fillStyle = dim(f.c);
    for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(f.x + Math.cos(i * TAU / 5) * 3.2 * U, f.y + Math.sin(i * TAU / 5) * 3.2 * U, 2.4 * U, 0, TAU); c.fill(); }
    c.fillStyle = dim('#ffb300'); c.beginPath(); c.arc(f.x, f.y, 2 * U, 0, TAU); c.fill();
  }
}

/** Blend of a css "rgb(r,g,b)" colour with a "#rrggbb" colour. */
function mixRGB(rgb, hex, k) {
  const m = rgb.match(/\d+/g).map(Number), b = parseInt(hex.slice(1), 16);
  const ch = (v, s) => Math.round(lerp(v, (b >> s) & 255, k));
  return 'rgb(' + ch(m[0], 16) + ',' + ch(m[1], 8) + ',' + ch(m[2], 0) + ')';
}

/** Darkens everything drawn so far at night (the stego stays visible). */
function drawNightShade(c, sky) {
  const a = (1 - sky.light) * 0.38;
  if (a <= 0.01) return;
  c.fillStyle = 'rgba(12,18,60,' + a.toFixed(3) + ')';
  c.fillRect(0, 0, W, H);
}

/** Nest of straw at ground point (x, y), width w. part 'back' or 'front' (the egg sits between). */
function drawNest(c, x, y, w, part) {
  c.save();
  c.lineCap = 'round';
  if (part === 'back') {
    c.fillStyle = '#9b6a3a';
    c.beginPath(); c.ellipse(x, y - w * 0.08, w * 0.5, w * 0.16, 0, Math.PI, TAU); c.fill();
  } else {
    c.fillStyle = '#b07a43';
    c.beginPath(); c.ellipse(x, y - w * 0.06, w * 0.52, w * 0.15, 0, 0, Math.PI); c.lineTo(x - w * 0.52, y - w * 0.06); c.fill();
    c.strokeStyle = '#e0b46e'; c.lineWidth = w * 0.025;
    const r = mulberry(3);
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI, sx = x + Math.cos(a) * w * 0.48, sy = y - w * 0.06 + Math.sin(a) * w * 0.12;
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + (r() - 0.5) * w * 0.25, sy + (r() - 0.5) * w * 0.06); c.stroke();
    }
  }
  c.restore();
}

/** Crack lines on the egg in egg units (egg is 100 high, 0,0 = bottom centre). One list per crack stage. */
const EGG_CRACKS = [
  [[-22, -62], [-12, -55], [-16, -46], [-4, -40]],
  [[4, -40], [12, -50], [8, -58], [20, -66], [16, -74], [28, -80]],
  [[-4, -40], [-6, -30], [6, -26], [2, -16], [14, -12], [30, -62], [34, -48], [24, -42], [36, -34]],
];

/**
 * The egg standing at (x, y) with height h pixels.
 *   cracks 0..3, glow 0..1 (being stroked), wobble (radians), t (time for sparkle)
 */
function drawEgg(c, x, y, h, cracks, glow, wobble, t) {
  const k = h / 100;
  c.save();
  if (glow > 0) {
    const gl = c.createRadialGradient(x, y - h * 0.45, h * 0.2, x, y - h * 0.45, h * 0.95);
    gl.addColorStop(0, 'rgba(255,240,180,' + (0.65 * glow).toFixed(2) + ')'); gl.addColorStop(1, 'rgba(255,240,180,0)');
    c.fillStyle = gl; c.beginPath(); c.arc(x, y - h * 0.45, h * 0.95, 0, TAU); c.fill();
  }
  c.translate(x, y); c.rotate(wobble); c.scale(k, k);
  const shape = () => {
    c.beginPath(); c.moveTo(0, 0);
    c.bezierCurveTo(-46, 0, -42, -70, 0, -100);
    c.bezierCurveTo(42, -70, 46, 0, 0, 0);
  };
  shape(); c.fillStyle = '#fff4d6'; c.fill();
  c.save(); shape(); c.clip();
  c.fillStyle = '#9ad9b0';
  for (const [sx, sy, r] of [[-18, -30, 9], [14, -52, 7], [-8, -75, 6], [22, -22, 6], [-26, -55, 5], [6, -14, 5]]) { c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.fill(); }
  c.fillStyle = '#f7b2c4';
  for (const [sx, sy, r] of [[2, -36, 5], [-20, -12, 4], [20, -76, 4]]) { c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.beginPath(); c.ellipse(-14, -70, 6, 12, 0.4, 0, TAU); c.fill();
  c.fillStyle = 'rgba(160,120,60,0.18)';
  c.beginPath(); c.ellipse(16, -30, 18, 40, 0.1, 0, TAU); c.fill();
  c.restore();
  c.lineWidth = 3; c.strokeStyle = '#b89b6a'; shape(); c.stroke();
  // Cracks: dark zigzag lines, each stage adds one more.
  c.strokeStyle = '#5b4630'; c.lineWidth = 2.6; c.lineJoin = 'round';
  for (let i = 0; i < cracks; i++) {
    c.beginPath();
    EGG_CRACKS[i].forEach(([px, py], j) => (j ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.stroke();
  }
  c.restore();
}

/** A poop on the ground at (x, y), size s, with two flies buzzing around. */
function drawPoop(c, x, y, s, t) {
  c.save();
  c.translate(x, y);
  c.fillStyle = '#8d5a3b'; c.strokeStyle = '#5e3a24'; c.lineWidth = 1.5 * U;
  for (const [oy, rx, ry] of [[-5, 15, 7], [-14, 11, 6], [-22, 7, 5]]) {
    c.beginPath(); c.ellipse(0, oy * s, rx * s, ry * s, 0, 0, TAU); c.fill(); c.stroke();
  }
  c.beginPath(); c.moveTo(0, -27 * s); c.quadraticCurveTo(5 * s, -32 * s, 2 * s, -35 * s); c.lineWidth = 3 * s; c.strokeStyle = '#8d5a3b'; c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.beginPath(); c.ellipse(-5 * s, -16 * s, 3 * s, 1.6 * s, -0.3, 0, TAU); c.fill();
  // Flies.
  for (let i = 0; i < 2; i++) {
    const a = t * (3 + i) + i * 2, fx = Math.cos(a) * 16 * s, fy = -30 * s + Math.sin(a * 1.7) * 9 * s;
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.beginPath(); c.ellipse(fx - 1.5 * s, fy - 2.5 * s, 2 * s, 1.2 * s, -0.5, 0, TAU); c.ellipse(fx + 1.5 * s, fy - 2.5 * s, 2 * s, 1.2 * s, 0.5, 0, TAU); c.fill();
    c.fillStyle = '#222'; c.beginPath(); c.arc(fx, fy, 1.8 * s, 0, TAU); c.fill();
  }
  c.restore();
}

/** A piece of food centred at (x, y), size s pixels. */
function drawFood(c, id, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s / 40, s / 40);
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (id === 'fern') {
    c.strokeStyle = '#2e7d32'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(-4, 18); c.quadraticCurveTo(2, 0, 4, -18); c.stroke();
    c.fillStyle = '#4caf50';
    for (let i = 0; i < 6; i++) {
      const yy = 12 - i * 5.5, len = 13 - i * 1.6, xx = -2 + i * 1;
      c.beginPath(); c.ellipse(xx - len / 2, yy, len / 2, 2.6, 0.35, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(xx + len / 2 + 1, yy - 2, len / 2, 2.6, -0.35, 0, TAU); c.fill();
    }
  } else if (id === 'leaf') {
    c.fillStyle = '#7cc957'; c.strokeStyle = '#3d8b2a'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-16, 16); c.bezierCurveTo(-18, -8, 2, -18, 17, -17); c.bezierCurveTo(16, 0, 6, 18, -16, 16); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-16, 16); c.lineTo(10, -10); c.stroke();
  } else if (id === 'berry') {
    c.strokeStyle = '#3d8b2a'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -16); c.lineTo(-7, -4); c.moveTo(0, -16); c.lineTo(7, -2); c.moveTo(0, -16); c.lineTo(0, 4); c.stroke();
    c.fillStyle = '#6cbf4a'; c.beginPath(); c.ellipse(6, -17, 7, 3.5, -0.4, 0, TAU); c.fill();
    for (const [bx, by] of [[-8, 0], [8, 2], [0, 9], [-3, -3]]) {
      c.fillStyle = '#7b3fb0'; c.beginPath(); c.arc(bx, by, 7, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(bx - 2.5, by - 2.5, 2, 0, TAU); c.fill();
    }
  } else if (id === 'apple') {
    c.fillStyle = '#e53935';
    c.beginPath(); c.arc(-6, 3, 13, 0, TAU); c.arc(6, 3, 13, 0, TAU); c.fill();
    c.strokeStyle = '#6d4c41'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, -8); c.lineTo(2, -16); c.stroke();
    c.fillStyle = '#66bb6a'; c.beginPath(); c.ellipse(8, -15, 6, 3, -0.5, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.ellipse(-9, -2, 3, 5, 0.4, 0, TAU); c.fill();
  } else if (id === 'melon') {
    c.fillStyle = '#43a047'; c.beginPath(); c.arc(0, -4, 20, 0, Math.PI); c.fill();
    c.fillStyle = '#c5e1a5'; c.beginPath(); c.arc(0, -4, 17, 0, Math.PI); c.fill();
    c.fillStyle = '#ef5350'; c.beginPath(); c.arc(0, -4, 15, 0, Math.PI); c.fill();
    c.fillStyle = '#3e2723';
    for (const [sx, sy] of [[-7, 2], [0, 6], [7, 2], [-3, 0], [4, 1]]) { c.beginPath(); c.ellipse(sx, sy, 1.4, 2.2, 0, 0, TAU); c.fill(); }
  }
  c.restore();
}

/** Water bowl at ground point (x, y), width w; level 0..1. */
function drawBowl(c, x, y, w, level) {
  c.save();
  c.fillStyle = '#3d7fd1';
  c.beginPath(); c.moveTo(x - w / 2, y - w * 0.3); c.lineTo(x + w / 2, y - w * 0.3); c.lineTo(x + w * 0.38, y); c.lineTo(x - w * 0.38, y); c.closePath(); c.fill();
  c.fillStyle = '#6fb0ff';
  c.beginPath(); c.ellipse(x, y - w * 0.3, w / 2, w * 0.1, 0, 0, TAU); c.fill();
  c.fillStyle = '#4fc3f7';
  c.beginPath(); c.ellipse(x, y - w * 0.3, w * 0.44 * (0.5 + 0.5 * level), w * 0.07 * (0.5 + 0.5 * level), 0, 0, TAU); c.fill();
  c.restore();
}

/** Bathtub at ground point (x, y), width w. part 'back' (inner wall) or 'front'. */
function drawTub(c, x, y, w, part) {
  c.save();
  const top = y - w * 0.26;
  if (part === 'back') {
    c.fillStyle = '#d6ecf7';
    c.beginPath(); c.ellipse(x, top, w / 2, w * 0.08, 0, Math.PI, TAU); c.fill();
  } else {
    c.fillStyle = '#9e9e9e';
    for (const fx of [-0.36, 0.36]) { c.beginPath(); c.arc(x + fx * w, y - w * 0.02, w * 0.04, 0, TAU); c.fill(); }
    c.fillStyle = '#ffffff'; c.strokeStyle = '#7fb8d6'; c.lineWidth = 3 * U;
    c.beginPath();
    c.moveTo(x - w / 2, top);
    c.lineTo(x + w / 2, top);
    c.bezierCurveTo(x + w / 2, y - w * 0.08, x + w * 0.35, y - w * 0.04, x + w * 0.3, y - w * 0.04);
    c.lineTo(x - w * 0.3, y - w * 0.04);
    c.bezierCurveTo(x - w * 0.35, y - w * 0.04, x - w / 2, y - w * 0.08, x - w / 2, top);
    c.fill(); c.stroke();
    c.fillStyle = '#7fd0ff';
    c.beginPath(); c.ellipse(x, top, w / 2, w * 0.06, 0, 0, Math.PI); c.fill();
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(x - w * 0.42 + i * w * 0.105, top - w * 0.01, w * 0.045, 0, TAU); c.fill(); }
  }
  c.restore();
}

/** Toothbrush with its head at (x, y). */
function drawBrush(c, x, y, s) {
  c.save(); c.translate(x, y); c.rotate(-0.6); c.scale(s / 40, s / 40);
  // Plain rectangles (roundRect is missing in older Android WebViews).
  c.fillStyle = '#26a69a'; c.fillRect(-4, 4, 8, 44);
  c.fillStyle = '#ffffff'; c.strokeStyle = '#90a4ae'; c.lineWidth = 1.5;
  c.beginPath(); c.rect(-6, -14, 12, 20); c.fill(); c.stroke();
  c.strokeStyle = '#4fc3f7'; c.lineWidth = 2;
  for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-6, -11 + i * 5); c.lineTo(-13, -11 + i * 5); c.stroke(); }
  c.restore();
}

/** Ball centred at (x, y), radius r, rotation a. */
function drawBall(c, x, y, r, a) {
  c.save(); c.translate(x, y); c.rotate(a);
  c.fillStyle = '#ffcc33'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
  c.save(); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip();
  c.fillStyle = '#e53935'; c.fillRect(-r, -r * 0.25, r * 2, r * 0.5);
  c.fillStyle = '#42a5f5'; c.fillRect(-r * 0.25, -r, r * 0.5, r * 2);
  c.restore();
  c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1.5 * U; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(-r * 0.35, -r * 0.4, r * 0.22, 0, TAU); c.fill();
  c.restore();
}

/** Thought bubble with an icon of what he needs, above point (x, y). */
function drawThought(c, x, y, icon, t) {
  const bob = Math.sin(t * 2.5) * 3 * U, r = 26 * U;
  c.save();
  c.fillStyle = 'rgba(255,255,255,0.95)'; c.strokeStyle = 'rgba(60,80,110,0.35)'; c.lineWidth = 2 * U;
  c.beginPath(); c.arc(x - 18 * U, y + 22 * U + bob, 5 * U, 0, TAU); c.fill(); c.stroke();
  c.beginPath(); c.arc(x - 8 * U, y + 10 * U + bob, 8 * U, 0, TAU); c.fill(); c.stroke();
  c.beginPath(); c.arc(x + 14 * U, y - 18 * U + bob, r, 0, TAU); c.fill(); c.stroke();
  drawIcon(c, icon, x + 14 * U, y - 18 * U + bob, r * 1.25);
  c.restore();
}

/* ---------- particles ---------- */

const parts = [];
/** Adds a particle. kind: heart, sparkle, bubble, confetti, zzz, crumb, drop, shell, star. */
function addPart(kind, x, y, o = {}) {
  if (parts.length > 260) parts.shift();
  parts.push({ kind, x, y, vx: o.vx ?? rnd(-20, 20) * U, vy: o.vy ?? rnd(-60, -30) * U, g: o.g ?? 0, life: 0,
    max: o.max ?? 1.4, size: (o.size ?? 10) * U, rot: rnd(0, TAU), vr: rnd(-4, 4), color: o.color || '#fff' });
}
function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * U * dt; p.rot += p.vr * dt;
    if (p.kind === 'zzz' || p.kind === 'heart') p.x += Math.sin(p.life * 4) * 12 * U * dt;
    if (p.life >= p.max) parts.splice(i, 1);
  }
}
function drawParts(c) {
  for (const p of parts) {
    const k = p.life / p.max, a = k < 0.15 ? k / 0.15 : 1 - smooth((k - 0.6) / 0.4);
    c.save(); c.globalAlpha = clamp(a, 0, 1); c.translate(p.x, p.y);
    if (p.kind === 'heart') drawIcon(c, 'love', 0, 0, p.size * 2);
    else if (p.kind === 'sparkle' || p.kind === 'star') {
      c.rotate(p.rot); c.fillStyle = p.kind === 'star' ? '#ffd740' : '#fffbe0';
      c.beginPath();
      for (let i = 0; i < 8; i++) { const r = i % 2 ? p.size * 0.35 : p.size; c.lineTo(Math.cos(i * Math.PI / 4) * r, Math.sin(i * Math.PI / 4) * r); }
      c.fill();
    } else if (p.kind === 'bubble') {
      c.fillStyle = 'rgba(255,255,255,0.75)'; c.strokeStyle = 'rgba(150,200,255,0.9)'; c.lineWidth = 1.2 * U;
      c.beginPath(); c.arc(0, 0, p.size * (0.6 + k * 0.4), 0, TAU); c.fill(); c.stroke();
    } else if (p.kind === 'confetti') {
      c.rotate(p.rot); c.fillStyle = p.color; c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else if (p.kind === 'zzz') {
      c.fillStyle = '#e8f0ff'; c.font = '800 ' + Math.round(p.size * 2) + 'px Nunito, sans-serif'; c.textAlign = 'center';
      c.fillText('Z', 0, 0);
    } else if (p.kind === 'crumb' || p.kind === 'shell') {
      c.rotate(p.rot); c.fillStyle = p.color;
      c.beginPath(); c.moveTo(-p.size, 0); c.lineTo(0, -p.size * 0.8); c.lineTo(p.size, p.size * 0.3); c.closePath(); c.fill();
    } else if (p.kind === 'drop') {
      c.fillStyle = '#7fd0ff'; c.beginPath(); c.ellipse(0, 0, p.size * 0.35, p.size * 0.6, 0, 0, TAU); c.fill();
    }
    c.restore();
  }
}
