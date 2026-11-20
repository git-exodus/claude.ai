/* 07-scenery.js – depth and life for every place (0.6):
 *   drawSkyLife     sun rays (sunny days) and little birds (daytime, no rain)
 *   drawForeground  grass, flowers, shells, stones, snow ... in front of his feet, swaying in the wind
 *   drawGroundLife  butterflies over flower places, fish jumping at water places
 * What each place gets is in FOREGROUND (places not listed use 'grass' with flowers). */

/**
 * Foreground of each place:
 *   kind     'grass' (blades), 'dune' (sparse beach grass), 'shells' (only around him, water below),
 *            'pebbles', 'snow', 'fluff' (clouds), 'crystal'
 *   colors   blade / stone colours      flowers  flower colours (or none)
 *   extra    'leaves' (autumn leaves on the ground), 'ferns', 'embers' (glowing bits)
 *   life     'butterflies' | 'fish' (with fishY = water height below the horizon in U)
 */
const FOREGROUND = {
  meadow: { kind: 'grass', flowers: ['#ff8fb1', '#ffd54f', '#ffffff', '#b39ddb', '#ff8a65'], life: 'butterflies' },
  jungle: { kind: 'grass', colors: ['#245e25', '#2f7a2f'], extra: 'ferns' },
  savanna: { kind: 'grass', colors: ['#b8913d', '#c9a24a', '#a07a30'] },
  volcano: { kind: 'pebbles', colors: ['#3e2c27', '#5a4038'], extra: 'embers' },
  island: { kind: 'shells' },
  river: { kind: 'grass', flowers: ['#ffffff', '#ffd54f'], life: 'fish', fishY: 72 },
  cloud: { kind: 'fluff' },
  beach: { kind: 'dune' },
  waterfall: { kind: 'grass', colors: ['#2f7a24', '#3f8a2e'], extra: 'ferns' },
  desert: { kind: 'pebbles', colors: ['#c49056', '#d9a858', '#b07a43'] },
  snow: { kind: 'snow' },
  cave: { kind: 'crystal' },
  mushroom: { kind: 'grass', colors: ['#2e5e24', '#3f7d33'], flowers: ['#e53935', '#fb8c00'], life: 'butterflies' },
  sunflower: { kind: 'grass', flowers: ['#ffc107', '#ffb300'], life: 'butterflies' },
  bamboo: { kind: 'grass', colors: ['#5a9a3c', '#7fb069'] },
  pond: { kind: 'grass', flowers: ['#ff8fb1', '#ffffff'], life: 'fish', fishY: 50 },
  swamp: { kind: 'grass', colors: ['#556b2f', '#6b7d3a', '#4b6234'] },
  autumn: { kind: 'grass', colors: ['#8a7a35', '#9e8a3c'], extra: 'leaves' },
  cherry: { kind: 'grass', flowers: ['#f8bbd0', '#ffffff'], life: 'butterflies' },
  canyon: { kind: 'pebbles', colors: ['#a85f33', '#b8693e', '#8a4022'] },
  lagoon: { kind: 'dune' },   // the lagoon draws its own jumping fish
  rainbow: { kind: 'grass', colors: ['#7fd3b0', '#9ee0c4'], flowers: ['#ff8fb1', '#b39ddb', '#80deea', '#fff59d'], life: 'butterflies' },
  dinovalley: { kind: 'grass', extra: 'ferns' },
  mountainlake: { kind: 'grass', colors: ['#2f6f28', '#3f8a2e'], flowers: ['#b39ddb', '#ffffff'], life: 'fish', fishY: 30 },
  springs: { kind: 'pebbles', colors: ['#9c8a78', '#b9a48e'] },
  ice: { kind: 'snow' },
  starhill: { kind: 'grass', colors: ['#3a4580', '#4a5596'], flowers: ['#fff59d', '#b3e5fc'] },
  bigtree: { kind: 'grass', flowers: ['#ffffff', '#ffd54f'], extra: 'ferns' },
  berryhill: { kind: 'grass', flowers: ['#e53935', '#7b3fb0'], life: 'butterflies' },
  treasure: { kind: 'shells' },
  travel: { kind: 'grass', flowers: ['#ffd54f', '#ffffff'] },
  home: { kind: 'none' },   // 0.11: wooden floor, nothing in front
};
const fgOf = id => FOREGROUND[id] || FOREGROUND.meadow;

/** Sun rays slowly turning (sunny days) and a few birds crossing the sky (daytime, no rain or snow). */
function drawSkyLife(c, sky, time, placeId, weather, sunX, sunY) {
  if (sky.night || sky.light < 0.4) return;
  if (weather === 'sun' || weather === 'rainbow') {
    c.save();
    c.globalAlpha = 0.1 + sky.warm * 0.15;
    c.fillStyle = '#fff6c8';
    c.translate(sunX, sunY); c.rotate(time * 0.03);
    for (let i = 0; i < 10; i++) { c.rotate(TAU / 10); c.beginPath(); c.moveTo(0, 0); c.lineTo(-18 * U, 260 * U); c.lineTo(18 * U, 260 * U); c.fill(); }
    c.restore();
  }
  if (weather === 'rain' || weather === 'snow') return;
  c.strokeStyle = 'rgba(40,50,70,0.7)'; c.lineWidth = 2 * U; c.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const bx = ((time * (18 + i * 5) * U + i * 140 * U) % (W + 80 * U)) - 40 * U, by = 70 * U + i * 26 * U + Math.sin(time + i) * 6 * U;
    const f = Math.sin(time * 6 + i) * 4 * U;   // wing beat
    c.beginPath(); c.moveTo(bx - 9 * U, by - f); c.quadraticCurveTo(bx - 4 * U, by - 6 * U, bx, by); c.quadraticCurveTo(bx + 4 * U, by - 6 * U, bx + 9 * U, by - f); c.stroke();
  }
}

/** Things in front of his feet (drawn after him), moving gently in the wind. L = light 0..1 (night darker).
 *  scroll = pixels walked (0.6.1): on the way everything slides out of the picture like the ground –
 *  the band at his feet at the speed of the path (1.0), the things further down a bit faster (1.3). */
function drawForeground(c, placeId, time, L, scroll = 0) {
  const fg = fgOf(placeId), d = k => mix('#1d2a4a', k, clamp(L * 1.1, 0.25, 1)), r = mulberry(77);
  const wind = x => Math.sin(time * 1.8 + x * 0.05) * 4 * U;
  const span = W + 60 * U;
  const slide = (x, speed) => scroll ? ((x - scroll * speed) % span + span) % span - 30 * U : x;
  // Row of positions: a band just in front of his feet and some lower down near the screen edge.
  const spot = i => { const near = i % 2, x = r() * W; return { x: slide(x, near ? 1 : 1.3), y: (near ? standY + (8 + r() * 26) * U : standY + 40 * U + r() * (H - standY - 50 * U)) }; };
  if (fg.kind === 'grass' || fg.kind === 'dune') {
    const cols = fg.colors || (fg.kind === 'dune' ? ['#9ab55a', '#b5c46a'] : ['#3f8a2e', '#5aa83c', '#3f8a2e']);
    const n = fg.kind === 'dune' ? 10 : 26;
    c.lineWidth = 3 * U; c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const { x, y } = spot(i), h = (12 + r() * 18) * U, sw = wind(x);
      c.strokeStyle = d(cols[i % cols.length]);
      c.beginPath();
      for (const k of [-1, 0, 1]) { c.moveTo(x + k * 4 * U, y); c.quadraticCurveTo(x + k * 6 * U, y - h * 0.6, x + k * 7 * U + sw, y - h * (k ? 0.8 : 1)); }
      c.stroke();
    }
    if (fg.kind === 'dune') drawShells(c, d, r, 5);
  } else if (fg.kind === 'shells') {
    drawShells(c, d, r, 4, true);
  } else if (fg.kind === 'pebbles') {
    for (let i = 0; i < 14; i++) {
      const { x, y } = spot(i), s = (4 + r() * 7) * U;
      c.fillStyle = d(fg.colors[i % fg.colors.length]);
      c.beginPath(); c.ellipse(x, y, s * 1.3, s * 0.8, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.ellipse(x - s * 0.4, y - s * 0.3, s * 0.5, s * 0.25, 0, 0, TAU); c.fill();
    }
  } else if (fg.kind === 'snow') {
    for (let i = 0; i < 8; i++) {
      const { x, y } = spot(i), s = (14 + r() * 16) * U;
      c.fillStyle = d('#dce9f5'); c.beginPath(); c.ellipse(x, y + 2 * U, s * 1.4, s * 0.5, 0, Math.PI, TAU); c.fill();
      c.fillStyle = d('#ffffff'); c.beginPath(); c.ellipse(x - 2 * U, y, s * 1.2, s * 0.42, 0, Math.PI, TAU); c.fill();
    }
  } else if (fg.kind === 'fluff') {
    c.fillStyle = d('#ffffff');
    for (let i = 0; i < 7; i++) { const { x, y } = spot(i); c.globalAlpha = 0.9; c.beginPath(); c.arc(x, y, (14 + r() * 12) * U, 0, TAU); c.arc(x + 16 * U, y + 4 * U, 12 * U, 0, TAU); c.fill(); }
    c.globalAlpha = 1;
  } else if (fg.kind === 'crystal') {
    for (let i = 0; i < 6; i++) {
      const { x, y } = spot(i), s = (8 + r() * 10) * U, col = ['#4dd0e1', '#f06292', '#b388ff'][i % 3];
      c.fillStyle = col; c.globalAlpha = 0.85 + Math.sin(time * 2 + i) * 0.15;
      c.beginPath(); c.moveTo(x - s * 0.5, y); c.lineTo(x, y - s * 1.6); c.lineTo(x + s * 0.5, y); c.fill();
    }
    c.globalAlpha = 1;
  }
  // Flowers swaying on a stem.
  if (fg.flowers) {
    for (let i = 0; i < 5; i++) {
      const x = slide(W * (0.08 + i * 0.21) + r() * 20 * U, 1.3), y = H - (30 + r() * 60) * U, sw = Math.sin(time * 2 + i) * 3 * U;
      c.strokeStyle = d('#3f8a2e'); c.lineWidth = 2.5 * U;
      c.beginPath(); c.moveTo(x, y + 20 * U); c.quadraticCurveTo(x + sw, y + 8 * U, x + sw, y); c.stroke();
      c.fillStyle = d(fg.flowers[i % fg.flowers.length]);
      for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + sw + Math.cos(k * TAU / 5) * 5 * U, y + Math.sin(k * TAU / 5) * 5 * U, 4 * U, 0, TAU); c.fill(); }
      c.fillStyle = d('#ffb300'); c.beginPath(); c.arc(x + sw, y, 3 * U, 0, TAU); c.fill();
    }
  }
  if (fg.extra === 'ferns') {
    for (const [fx, flip] of [[0.04, 1], [0.96, -1]]) {
      c.save(); c.translate(W * fx, H - 20 * U); c.scale(flip, 1); c.rotate(-0.5 + Math.sin(time * 1.5 + fx * 9) * 0.04);
      c.strokeStyle = d('#2e7d32'); c.lineWidth = 3 * U; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(20 * U, -50 * U, 50 * U, -90 * U); c.stroke();
      c.fillStyle = d('#43a047');
      for (let k = 1; k < 8; k++) { const t = k / 8, px = 50 * U * t * t + 20 * U * t * (1 - t) * 2, py = -90 * U * t; c.beginPath(); c.ellipse(px - 8 * U, py, 10 * U * (1 - t * 0.5), 3.5 * U, 0.4, 0, TAU); c.ellipse(px + 8 * U, py - 3 * U, 10 * U * (1 - t * 0.5), 3.5 * U, -0.4, 0, TAU); c.fill(); }
      c.restore();
    }
  } else if (fg.extra === 'leaves') {
    for (let i = 0; i < 10; i++) { const { x, y } = spot(i); c.fillStyle = d(['#e65100', '#fbc02d', '#d84315'][i % 3]); c.beginPath(); c.ellipse(x, y, 7 * U, 3.5 * U, r() * 3, 0, TAU); c.fill(); }
  } else if (fg.extra === 'embers') {
    for (let i = 0; i < 6; i++) { const { x, y } = spot(i), a = 0.5 + 0.5 * Math.sin(time * 3 + i * 2); c.fillStyle = 'rgba(255,120,40,' + a.toFixed(2) + ')'; c.beginPath(); c.arc(x, y, 3 * U, 0, TAU); c.fill(); }
  }
}

/** A few shells; near = only around him (when water is all around). */
function drawShells(c, d, r, n, near) {
  for (let i = 0; i < n; i++) {
    const x = near ? W / 2 + (r() - 0.5) * W * 0.8 : r() * W, y = near ? standY + (14 + r() * 24) * U : H - (30 + r() * 80) * U;
    c.fillStyle = d(['#ffccbc', '#f8bbd0', '#fff3e0'][i % 3]);
    c.beginPath(); c.arc(x, y, 7 * U, Math.PI, TAU); c.fill();
    c.strokeStyle = d('#e0a890'); c.lineWidth = 1.2 * U;
    c.beginPath(); for (let k = -2; k <= 2; k++) { c.moveTo(x, y); c.lineTo(x + k * 3 * U, y - 6 * U); } c.stroke();
  }
}

/** Butterflies over flower places, fish jumping at water places (daytime, no rain). */
function drawGroundLife(c, placeId, time, sky, weather) {
  const fg = fgOf(placeId);
  if (!fg.life || sky.night || weather === 'rain' || weather === 'snow') return;
  if (fg.life === 'butterflies') {
    for (let i = 0; i < 2; i++) {
      const bx = W * (0.15 + i * 0.7) + Math.sin(time * 0.7 + i * 3) * 50 * U, by = standY - 40 * U + Math.cos(time * 1.1 + i) * 30 * U;
      const fl = Math.abs(Math.sin(time * 11 + i));
      c.fillStyle = ['#ff8a65', '#ba68c8'][i];
      c.beginPath(); c.ellipse(bx - 5 * U * fl, by, 6 * U * fl + 1, 8 * U, -0.4, 0, TAU); c.ellipse(bx + 5 * U * fl, by, 6 * U * fl + 1, 8 * U, 0.4, 0, TAU); c.fill();
      c.fillStyle = '#333'; c.fillRect(bx - 1 * U, by - 6 * U, 2 * U, 12 * U);
    }
  } else if (fg.life === 'fish') {
    const k = (time * 0.35) % 1;
    if (k > 0.45) return;   // a jump now and then
    const q = k / 0.45, fx = W * 0.2 + q * W * 0.25, fy = groundY + fg.fishY * U - Math.sin(q * Math.PI) * 40 * U;
    c.fillStyle = '#ff8a65';
    c.save(); c.translate(fx, fy); c.rotate(-0.8 + q * 1.6);
    c.beginPath(); c.ellipse(0, 0, 10 * U, 5 * U, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-8 * U, 0); c.lineTo(-15 * U, -5 * U); c.lineTo(-15 * U, 5 * U); c.fill();
    c.restore();
  }
}
