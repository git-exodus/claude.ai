/* 06-draw-stego.js – draws the stegosaurus in every growth stage and mood.
 * Everything is drawn with canvas paths in a "unit" system: the grown stego is about
 * 260 units long (tail tip to snout) and 0,0 is the ground under the middle of his body.
 * y goes up as negative numbers. drawStego() scales units to pixels. */

/** Slate grey with a hint of blue (variant "A" chosen in 0.2; was green in 0.1). Plates stay orange. */
const STEGO_COLORS = {
  body: '#6f7d88', dark: '#56636d', belly: '#d9d4c7', line: '#2c343b',
  plate: ['#ff9a4d', '#ffbe5c'], plateLine: '#b8571d', spot: '#61707b',
  eye: '#2a2a35', cheek: '#ff8fa8', mouth: '#7a2335', tongue: '#ff7b93',
  dirt: '#8a6a3f', nail: '#f6f2dc',
};

/** Number of back plates per growth stage. */
const PLATE_COUNT = [4, 5, 6, 7, 7];

/**
 * Draws the stego standing on the ground at screen point (x, y).
 *   size  pixel length of a fully grown stego; o.g (growth 0..1) shrinks him to SIZE_MIN.
 *   o     { colors (optional palette, default STEGO_COLORS), g, stage, t, dir (1 = looks right), pose ('stand'|'walk'|'lie'), walk (phase),
 *           eyes ('open'|'happy'|'closed'|'sad'), blink (0..1), mouth ('smile'|'open'|'chew'|
 *           'sad'|'yawn'|'grin'|'closed'), headDown (0..1), wiggle (0..1), dirt (0..1),
 *           jump (px up), wag (0..1), wear ({ head, eyes, neck } item ids, 0.3),
 *           0.6: squash (-1 stretched .. 1 squashed), look ({ x, y } pupil offset in eye radii),
 *           brow ('happy'|'up'), blush (true = red cheeks) }
 * Returns screen positions: mouth {x, y}, head {x, y, r}, box {x, y, w, h} (for touches).
 */
function drawStego(c, x, y, size, o) {
  const C = o.colors || STEGO_COLORS, t = o.t || 0, g = o.g || 0, stage = o.stage || 0;
  const k = size * lerp(SIZE_MIN, 1, g) / 260;      // pixels per unit
  const dir = o.dir || 1, lie = o.pose === 'lie';
  const hs = lerp(1.6, 1.0, g);                       // head scale: babies have big heads (0.6: a bit bigger)
  const breathe = 1 + Math.sin(t * (lie ? 1.6 : 2.4)) * (lie ? 0.035 : 0.02);
  const legLen = lie ? 0 : lerp(18, 30, g);
  const rx = lerp(54, 62, g), ry = lerp(40, 42, g) * breathe;   // 0.6: the baby is rounder (chubby)
  const cx = 0, cy = lie ? -ry * 0.78 : -legLen - ry * 0.78;
  const walk = o.pose === 'walk' ? o.walk || 0 : 0;
  const bob = o.pose === 'walk' ? Math.abs(Math.sin(walk)) * -3 : 0;

  c.save();
  c.translate(x, y - (o.jump || 0));
  c.scale(k * dir, k);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.lineWidth = 3;
  c.strokeStyle = C.line;
  c.translate(0, bob);
  // Squash and stretch around the feet (jumping and landing, 0.6).
  if (o.squash) { const q = o.squash; c.scale(1 + 0.1 * q, 1 - 0.12 * q); }

  // Soft shadow on the ground (not lifted by the jump).
  c.save();
  c.translate(0, -bob + (o.jump || 0) / k);
  const sh = c.createRadialGradient(8, 2, 5, 8, 2, 100);   // soft round shadow (0.6)
  sh.addColorStop(0, 'rgba(20,40,20,0.32)'); sh.addColorStop(1, 'rgba(20,40,20,0)');
  c.fillStyle = sh; c.save(); c.scale(1, 0.12); c.beginPath(); c.arc(8, 16, 100 * (o.jump ? 0.85 : 1), 0, TAU); c.fill(); c.restore();
  c.restore();

  // ---- tail with spikes ----
  const tailLen = lerp(38, 78, g), wagA = Math.sin(t * (o.wag ? 9 : 2.2)) * (o.wag ? 7 : 3);
  const tipX = cx - rx - tailLen, tipY = cy - 6 + wagA + (lie ? 10 : 0);
  if (stage >= 1) {
    const sp = lerp(4, 25, g);   // tail spikes grow with him (+25 % since 0.2)
    c.fillStyle = C.nail; c.strokeStyle = C.plateLine; c.lineWidth = 2;
    // Up to four spikes near the tail tip, pointing up and backwards (two from stage 1, four from stage 3).
    const spikes = stage >= 3 ? [[5, -0.5], [9, 0.25], [17, -0.35], [21, 0.4]] : [[7, -0.4], [17, 0.3]];
    for (const [ox, lean] of spikes) {
      const bx = tipX + ox, by = tipY - 2;
      c.beginPath(); c.moveTo(bx - 3.5, by); c.lineTo(bx - sp * 0.45 + lean * sp, by - sp); c.lineTo(bx + 3.5, by);
      c.closePath(); c.fill(); c.stroke();
    }
    c.lineWidth = 3; c.strokeStyle = C.line;
  }
  c.fillStyle = C.body;
  c.beginPath();
  c.moveTo(cx - rx * 0.6, cy - ry * 0.55);
  c.quadraticCurveTo(cx - rx - tailLen * 0.45, cy - ry * 0.35, tipX, tipY);
  c.quadraticCurveTo(cx - rx - tailLen * 0.35, cy + ry * 0.45, cx - rx * 0.55, cy + ry * 0.62);
  c.closePath(); c.fill(); c.stroke();

  // ---- legs on the far side (darker, behind the body) ----
  const legW = lerp(21, 27, g);
  const leg = (lx, phase, far) => {
    if (lie) return;
    const swing = walk ? Math.sin(walk + phase) * 7 : 0, lift = walk ? Math.max(0, Math.cos(walk + phase)) * 4 : 0;
    const top = cy + ry * 0.2, bot = -lift;
    c.fillStyle = far ? C.dark : C.body;
    c.beginPath();
    c.moveTo(lx - legW / 2, top);
    c.lineTo(lx - legW / 2 + swing, bot - 6);
    c.quadraticCurveTo(lx - legW / 2 + swing, bot, lx + swing, bot);
    c.lineTo(lx + legW / 2 + swing + 2, bot);
    c.quadraticCurveTo(lx + legW / 2 + swing + 2, bot - 6, lx + legW / 2 + swing, bot - 8);
    c.lineTo(lx + legW / 2, top);
    c.closePath(); c.fill(); c.stroke();
    if (!far) {   // three little toenails
      c.fillStyle = C.nail;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(lx + swing - legW / 2 + 5 + i * (legW / 2.6), bot - 1, 2.6, Math.PI, 0); c.fill(); }
    }
  };
  leg(-28, Math.PI, true);
  leg(38, 0, true);

  // ---- back plates (behind the body) ----
  const n = PLATE_COUNT[stage], plateBase = lerp(13, 39, g);   // plates grow from baby to grown (+50 % since 0.2)
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0.5 : i / (n - 1);
    const a = lerp(Math.PI * 1.13, Math.PI * 1.86, f);
    const px = cx + Math.cos(a) * rx * 0.92, py = cy + Math.sin(a) * ry * 0.92;
    let nx = Math.cos(a) / rx, ny = Math.sin(a) / ry;
    const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
    const wig = (o.wiggle || 0) * Math.sin(t * 22 + i * 1.7) * 0.25;
    const ang = Math.atan2(ny, nx) + wig;
    const h = plateBase * (0.7 + 0.45 * Math.sin(Math.PI * (0.25 + f * 0.6)));
    c.save();
    c.translate(px, py); c.rotate(ang + Math.PI / 2);
    // Plates darker at the body, lighter at the tip (0.6).
    const pg = c.createLinearGradient(0, 6, 0, -h);
    pg.addColorStop(0, mix(C.plate[i % 2], '#c2410c', 0.35)); pg.addColorStop(1, mix(C.plate[i % 2], '#ffffff', 0.35));
    c.fillStyle = pg;
    c.strokeStyle = C.plateLine;
    c.beginPath();
    c.moveTo(-h * 0.42, 6);
    c.quadraticCurveTo(-h * 0.5, -h * 0.55, 0, -h);
    c.quadraticCurveTo(h * 0.5, -h * 0.55, h * 0.42, 6);
    c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
  c.strokeStyle = C.line;

  // ---- legs on the near side (drawn before the body, so the body hides their tops) ----
  leg(-40, 0, false);
  leg(26, Math.PI, false);

  // ---- body with belly, spots and dirt ----
  // Light from above: lighter back, darker belly side (0.6).
  const bg = c.createLinearGradient(0, cy - ry, 0, cy + ry);
  bg.addColorStop(0, mix(C.body, '#ffffff', 0.28)); bg.addColorStop(0.55, mix(C.body, '#ffffff', 0.02)); bg.addColorStop(1, mix(C.body, '#1b2530', 0.35));
  c.fillStyle = bg;
  c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, TAU); c.fill(); c.stroke();
  c.save();
  c.beginPath(); c.ellipse(cx, cy, rx - 1.5, ry - 1.5, 0, 0, TAU); c.clip();
  c.fillStyle = C.belly;
  c.beginPath(); c.ellipse(cx + 10, cy + ry * 0.85, rx * 0.85, ry * 0.5, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.22)';   // shine on the back
  c.beginPath(); c.ellipse(cx - 10, cy - ry * 0.62, rx * 0.5, ry * 0.16, -0.12, 0, TAU); c.fill();
  c.fillStyle = C.spot;
  for (const [sx, sy, sr] of [[-28, -0.45, 7], [-6, -0.62, 6], [16, -0.4, 5], [-40, -0.05, 5], [30, -0.65, 4]]) {
    c.beginPath(); c.arc(cx + sx, cy + sy * ry, sr, 0, TAU); c.fill();
  }
  if (o.dirt > 0) {   // mud spots when he is dirty
    c.globalAlpha = clamp(o.dirt, 0, 1) * 0.75;
    c.fillStyle = C.dirt;
    for (const [sx, sy, sr] of [[-20, 0.2, 9], [12, 0.05, 7], [36, 0.3, 6], [-45, 0.4, 6], [0, -0.3, 5], [24, 0.55, 8]]) {
      c.beginPath(); c.ellipse(cx + sx, cy + sy * ry, sr * 1.3, sr, 0.4, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  }
  c.restore();

  // ---- neck and head (the head can be lowered to drink) ----
  const nbx = cx + rx * 0.72, nby = cy - ry * 0.05;
  const hx = cx + rx + 12 * hs, hy = lie ? -16 * hs : cy + 4 - (hs - 1) * 14;
  c.save();
  c.translate(nbx, nby);
  c.rotate((o.headDown || 0) * 0.55);
  c.translate(-nbx, -nby);
  c.fillStyle = C.body;
  c.beginPath();
  c.moveTo(cx + rx * 0.55, cy - ry * 0.6);
  c.quadraticCurveTo(hx - 18 * hs, hy - 22 * hs, hx - 6 * hs, hy - 18 * hs);
  c.lineTo(hx - 6 * hs, hy + 16 * hs);
  c.quadraticCurveTo(hx - 18 * hs, hy + 18 * hs, cx + rx * 0.6, cy + ry * 0.55);
  c.closePath(); c.fill();
  c.beginPath();
  c.moveTo(cx + rx * 0.62, cy - ry * 0.68);
  c.quadraticCurveTo(hx - 18 * hs, hy - 22 * hs, hx - 6 * hs, hy - 18 * hs);
  c.moveTo(cx + rx * 0.78, cy + ry * 0.55);
  c.quadraticCurveTo(hx - 18 * hs, hy + 18 * hs, hx - 6 * hs, hy + 16 * hs);
  c.stroke();

  // Head = round skull + snout, outlined together.
  const skull = () => { c.beginPath(); c.ellipse(hx, hy, 25 * hs, 21 * hs, 0, 0, TAU); };
  const snout = () => { c.beginPath(); c.ellipse(hx + 16 * hs, hy + 6 * hs, 17 * hs, 13 * hs, 0.1, 0, TAU); };
  // Outline the skull only at the front: no line where it meets the neck (0.6).
  c.beginPath(); c.ellipse(hx, hy, 25 * hs, 21 * hs, 0, -1.81, 1.82); c.stroke(); snout(); c.stroke();
  const hg = c.createLinearGradient(0, hy - 22 * hs, 0, hy + 20 * hs);
  hg.addColorStop(0, mix(C.body, '#ffffff', 0.3)); hg.addColorStop(1, mix(C.body, '#1b2530', 0.25));
  c.fillStyle = hg; skull(); c.fill(); snout(); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.ellipse(hx - 4 * hs, hy - 14 * hs, 10 * hs, 4 * hs, -0.2, 0, TAU); c.fill();
  // Nostril and cheek.
  c.fillStyle = C.line;
  c.beginPath(); c.arc(hx + 28 * hs, hy + 1 * hs, 1.8 * hs, 0, TAU); c.fill();
  c.fillStyle = C.cheek; c.globalAlpha = o.blush ? 0.95 : 0.55;
  c.beginPath(); c.ellipse(hx + 10 * hs, hy + 9 * hs, 6 * hs, 4 * hs, 0, 0, TAU); c.fill();
  c.globalAlpha = 1;

  // Eye.
  const ex = hx + 1 * hs, ey = hy - 6 * hs, er = lerp(10, 7.6, g) * hs;   // 0.6: bigger eyes
  const lk = o.look || { x: 0.22, y: 0.08 };
  const eyes = o.eyes || 'open';
  c.lineWidth = 2.6;
  if (eyes === 'happy') {
    c.beginPath(); c.arc(ex, ey + er * 0.3, er * 0.75, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
  } else if (eyes === 'closed') {
    c.beginPath(); c.arc(ex, ey - er * 0.2, er * 0.75, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
  } else {
    const open = 1 - clamp(o.blink || 0, 0, 1);
    c.save();
    c.translate(ex, ey); c.scale(1, Math.max(0.08, open));
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(0, 0, er, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = C.eye;
    c.beginPath(); c.arc(er * lk.x, er * lk.y, er * 0.64, 0, TAU); c.fill();
    c.fillStyle = '#fff';   // two shines
    c.beginPath(); c.arc(er * (lk.x + 0.2), er * (lk.y - 0.33), er * 0.24, 0, TAU); c.fill();
    c.beginPath(); c.arc(er * (lk.x - 0.2), er * (lk.y + 0.25), er * 0.1, 0, TAU); c.fill();
    c.restore();
    if (eyes === 'sad') {   // worried eyebrow
      c.beginPath(); c.moveTo(ex - er * 0.9, ey - er * 1.25); c.lineTo(ex + er * 0.7, ey - er * 1.6); c.stroke();
    }
  }

  // Eyebrows (0.6): arched when happy, raised when he wonders.
  if (o.brow === 'happy') { c.beginPath(); c.arc(ex, ey - er * 0.6, er * 1.1, Math.PI * 1.25, Math.PI * 1.75); c.stroke(); }
  else if (o.brow === 'up') { c.beginPath(); c.moveTo(ex - er * 0.8, ey - er * 1.7); c.quadraticCurveTo(ex, ey - er * 2.1, ex + er * 0.8, ey - er * 1.75); c.stroke(); }
  // Mouth.
  const mx = hx + 19 * hs, my = hy + 12 * hs;
  const mouth = o.mouth || 'smile';
  c.lineWidth = 2.4;
  const openMouth = (w, h) => {
    c.fillStyle = C.mouth;
    c.beginPath(); c.ellipse(mx, my + h * 0.3, w, h, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = C.tongue;
    c.beginPath(); c.ellipse(mx + w * 0.1, my + h * 0.75, w * 0.6, h * 0.35, 0, 0, TAU); c.fill();
  };
  if (mouth === 'open') openMouth(7 * hs, 6 * hs);
  else if (mouth === 'yawn') openMouth(6 * hs, 9 * hs);
  else if (mouth === 'chew') {
    if (Math.sin(t * 16) > 0) openMouth(5 * hs, 3.5 * hs);
    else { c.beginPath(); c.moveTo(mx - 7 * hs, my); c.quadraticCurveTo(mx, my + 3 * hs, mx + 7 * hs, my - 1 * hs); c.stroke(); }
  } else if (mouth === 'grin') {
    c.fillStyle = C.mouth;
    c.beginPath(); c.moveTo(mx - 10 * hs, my - 2 * hs); c.quadraticCurveTo(mx, my + 12 * hs, mx + 9 * hs, my - 3 * hs); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fff';
    c.fillRect(mx - 7 * hs, my - 2.2 * hs, 14 * hs, 3 * hs);
  } else if (mouth === 'sad') {
    c.beginPath(); c.moveTo(mx - 7 * hs, my + 3 * hs); c.quadraticCurveTo(mx, my - 3 * hs, mx + 7 * hs, my + 3 * hs); c.stroke();
  } else if (mouth === 'closed') {
    c.beginPath(); c.moveTo(mx - 5 * hs, my + 1 * hs); c.lineTo(mx + 5 * hs, my + 1 * hs); c.stroke();
  } else {
    c.beginPath(); c.moveTo(mx - 8 * hs, my - 1 * hs); c.quadraticCurveTo(mx, my + 7 * hs, mx + 8 * hs, my - 2 * hs); c.stroke();
  }
  // Things he wears (0.3): drawn with the head, so they tilt when he drinks.
  if (o.wear) drawWear(c, o.wear, { hx, hy, hs, ex, ey, er, t });
  c.restore();   // head rotation

  c.restore();

  // Screen positions of mouth, head and the whole body (for feeding and touching).
  const rot = (o.headDown || 0) * 0.55, toScreen = (ux, uy) => {
    const dx = ux - nbx, dy = uy - nby;
    const rxu = nbx + dx * Math.cos(rot) - dy * Math.sin(rot), ryu = nby + dx * Math.sin(rot) + dy * Math.cos(rot);
    return { x: x + rxu * k * dir, y: y - (o.jump || 0) + (ryu + bob) * k };
  };
  const m = toScreen(mx, my), h = toScreen(hx, hy);
  const left = Math.min(x + (tipX - 10) * k * dir, x + (hx + 45 * hs) * k * dir);
  const width = (hx + 45 * hs - tipX + 10) * k;
  const top = y - (o.jump || 0) + (cy - ry - plateBase * 1.1) * k;
  return { mouth: m, head: { x: h.x, y: h.y, r: 28 * hs * k }, box: { x: left, y: top, w: width, h: y - top }, k };
}

/**
 * Accessories in the stego's unit space (inside drawStego, after the head).
 *   w  { head, eyes, neck } ids from WEAR_ITEMS (or null)
 *   g  { hx, hy (skull centre), hs (head scale), ex, ey, er (eye), t }
 */
function drawWear(c, w, g) {
  const { hx, hy, hs, ex, ey, er } = g;
  const S_ = v => v * hs;
  c.save();
  c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 2.2; c.strokeStyle = '#2c343b';
  // ---- neck ----
  if (w.neck === 'scarf') {
    // A striped band around the neck behind the head, one end hanging down.
    const x = hx - S_(30), y = hy + S_(4);
    c.fillStyle = '#e53935';
    c.beginPath(); c.moveTo(x - S_(6), y + S_(10)); c.lineTo(x - S_(20), y + S_(36)); c.lineTo(x - S_(6), y + S_(40)); c.lineTo(x + S_(6), y + S_(12)); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - S_(17), y + S_(32)); c.lineTo(x - S_(8), y + S_(35)); c.stroke(); c.strokeStyle = '#2c343b'; c.lineWidth = 2.2;
    c.save(); c.translate(x, y); c.rotate(0.18);
    c.beginPath(); c.ellipse(0, 0, S_(12), S_(20), 0, 0, TAU); c.fill(); c.stroke();
    c.save(); c.clip(); c.fillStyle = '#ffffff'; c.fillRect(-S_(13), -S_(9), S_(26), S_(5)); c.fillRect(-S_(13), S_(4), S_(26), S_(5)); c.restore();
    c.restore();
  } else if (w.neck === 'bowtie') {
    const x = hx - S_(14), y = hy + S_(19);
    c.fillStyle = '#e53935';
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - S_(10), y - S_(7)); c.lineTo(x - S_(10), y + S_(7)); c.closePath();
    c.moveTo(x, y); c.lineTo(x + S_(10), y - S_(7)); c.lineTo(x + S_(10), y + S_(7)); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#b71c1c'; c.beginPath(); c.arc(x, y, S_(3.2), 0, TAU); c.fill(); c.stroke();
  }
  // ---- eyes ----
  if (w.eyes === 'glasses' || w.eyes === 'sunglasses') {
    // Two lenses: the near one round the eye, the far one peeking out behind the snout; a frame bar to the ear.
    const sun = w.eyes === 'sunglasses', frame = sun ? '#ff4f87' : '#3e2723';
    const lens = (x, y, rx, ry) => {
      c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU);
      if (sun) { c.fillStyle = '#1b1b24'; c.fill(); } else { c.fillStyle = 'rgba(200,230,255,0.25)'; c.fill(); }
      c.strokeStyle = frame; c.lineWidth = 2.8; c.stroke();
    };
    const fx = hx + S_(16), fy = ey + S_(1);
    lens(fx, fy, er * 0.75, er * 0.95);
    c.strokeStyle = frame; c.lineWidth = 2.8;
    c.beginPath(); c.moveTo(ex - er * 1.3, ey - S_(1)); c.lineTo(hx - S_(23), ey + S_(2)); c.moveTo(ex + er * 1.3, ey - S_(1)); c.lineTo(fx - er * 0.7, fy - S_(1)); c.stroke();
    lens(ex, ey, er * 1.35, er * 1.2);
    if (sun) { c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(ex + er * 0.45, ey - er * 0.45, er * 0.45, er * 0.2, -0.5, 0, TAU); c.fill(); }
    c.strokeStyle = '#2c343b'; c.lineWidth = 2.2;
  }
  // ---- head ----
  const top = hy - S_(19), tx = hx - S_(4);
  c.strokeStyle = '#2c343b'; c.lineWidth = 2.2;
  if (w.head === 'bow') {
    const x = hx - S_(10), y = top + S_(1);
    c.fillStyle = '#ff6fa5';
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - S_(13), y - S_(9)); c.lineTo(x - S_(12), y + S_(8)); c.closePath();
    c.moveTo(x, y); c.lineTo(x + S_(13), y - S_(10)); c.lineTo(x + S_(13), y + S_(7)); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#e0457f'; c.beginPath(); c.arc(x, y, S_(4), 0, TAU); c.fill(); c.stroke();
  } else if (w.head === 'party') {
    c.save(); c.translate(tx, top + S_(3)); c.rotate(-0.25);
    c.fillStyle = '#42a5f5';
    c.beginPath(); c.moveTo(-S_(12), 0); c.lineTo(0, -S_(34)); c.lineTo(S_(12), 0); c.closePath(); c.fill(); c.stroke();
    c.save(); c.clip(); c.fillStyle = '#ffd54f';
    for (let i = 0; i < 3; i++) c.fillRect(-S_(14), -S_(9 + i * 10), S_(28), S_(4));
    c.restore();
    c.fillStyle = '#ff5c8a'; c.beginPath(); c.arc(0, -S_(35), S_(4.5), 0, TAU); c.fill(); c.stroke();
    c.restore();
  } else if (w.head === 'sunhat') {
    c.fillStyle = '#f2d27a';
    c.beginPath(); c.ellipse(tx, top + S_(3), S_(32), S_(7), -0.08, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(tx, top - S_(3), S_(15), S_(12), 0, Math.PI, TAU); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#e53935'; c.fillRect(tx - S_(15), top - S_(2), S_(30), S_(4));
  } else if (w.head === 'beanie') {
    c.fillStyle = '#e53935';
    c.beginPath(); c.moveTo(tx - S_(20), top + S_(7)); c.quadraticCurveTo(tx - S_(18), top - S_(16), tx + S_(4), top - S_(14));
    c.quadraticCurveTo(tx - S_(16), top - S_(30), tx - S_(30), top - S_(22)); c.quadraticCurveTo(tx - S_(16), top - S_(12), tx + S_(18), top + S_(6)); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(tx - S_(1), top + S_(6), S_(20), S_(5), 0.05, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.arc(tx - S_(31), top - S_(22), S_(5), 0, TAU); c.fill(); c.stroke();
  } else if (w.head === 'crown') {
    c.fillStyle = '#ffca28';
    c.beginPath(); c.moveTo(tx - S_(14), top + S_(4));
    for (const [px, py] of [[-14, -12], [-7, -3], [0, -16], [7, -3], [14, -12], [14, 4]]) c.lineTo(tx + S_(px), top + S_(py));
    c.closePath(); c.fill(); c.stroke();
    for (const [px, col] of [[-7, '#e53935'], [0, '#42a5f5'], [7, '#66bb6a']]) { c.fillStyle = col; c.beginPath(); c.arc(tx + S_(px), top + S_(0), S_(2.4), 0, TAU); c.fill(); }
  } else if (w.head === 'flowers') {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.08 + i * 0.14), x = hx + Math.cos(a) * S_(25), y = hy + Math.sin(a) * S_(21);
      c.fillStyle = ['#ff8fb1', '#ffffff', '#ffd54f', '#b39ddb'][i % 4];
      for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + Math.cos(k * TAU / 5) * S_(3.2), y + Math.sin(k * TAU / 5) * S_(3.2), S_(2.6), 0, TAU); c.fill(); }
      c.fillStyle = '#ff9800'; c.beginPath(); c.arc(x, y, S_(1.8), 0, TAU); c.fill();
    }
  } else if (w.head === 'pirate') {
    c.fillStyle = '#263238';
    c.beginPath(); c.moveTo(tx - S_(26), top + S_(4)); c.quadraticCurveTo(tx - S_(18), top - S_(10), tx - S_(10), top - S_(14));
    c.quadraticCurveTo(tx, top - S_(24), tx + S_(10), top - S_(14)); c.quadraticCurveTo(tx + S_(18), top - S_(10), tx + S_(26), top + S_(4));
    c.quadraticCurveTo(tx, top - S_(4), tx - S_(26), top + S_(4)); c.fill(); c.stroke();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(tx, top - S_(9), S_(4), 0, TAU); c.fill();
    c.fillStyle = '#263238'; c.fillRect(tx - S_(2.4), top - S_(9), S_(1.6), S_(1.6)); c.fillRect(tx + S_(0.8), top - S_(9), S_(1.6), S_(1.6));
  } else if (w.head === 'wizard') {
    c.save(); c.translate(tx, top + S_(3)); c.rotate(-0.18);
    c.fillStyle = '#3949ab';
    c.beginPath(); c.ellipse(0, 0, S_(26), S_(6), 0, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-S_(14), -S_(2)); c.quadraticCurveTo(-S_(4), -S_(30), S_(10), -S_(44)); c.quadraticCurveTo(S_(6), -S_(22), S_(14), -S_(2)); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#ffeb3b';
    for (const [px, py] of [[-4, -12], [5, -24], [3, -6]]) { c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? S_(1.4) : S_(3.4), a = i * Math.PI / 5 - Math.PI / 2; c.lineTo(S_(px) + Math.cos(a) * r, S_(py) + Math.sin(a) * r); } c.fill(); }
    c.restore();
  }
  c.restore();
}
