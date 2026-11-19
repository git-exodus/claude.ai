/* 06-draw-stego.js – draws the stegosaurus in every growth stage and mood.
 * Everything is drawn with canvas paths in a "unit" system: the grown stego is about
 * 260 units long (tail tip to snout) and 0,0 is the ground under the middle of his body.
 * y goes up as negative numbers. drawStego() scales units to pixels. */

const STEGO_COLORS = {
  body: '#8bd35f', dark: '#5fa83c', belly: '#dcf3a6', line: '#2f5d24',
  plate: ['#ff9a4d', '#ffbe5c'], plateLine: '#b8571d', spot: '#71bd4a',
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
 *           jump (px up), wag (0..1) }
 * Returns screen positions: mouth {x, y}, head {x, y, r}, box {x, y, w, h} (for touches).
 */
function drawStego(c, x, y, size, o) {
  const C = o.colors || STEGO_COLORS, t = o.t || 0, g = o.g || 0, stage = o.stage || 0;
  const k = size * lerp(SIZE_MIN, 1, g) / 260;      // pixels per unit
  const dir = o.dir || 1, lie = o.pose === 'lie';
  const hs = lerp(1.5, 1.0, g);                       // head scale: babies have big heads
  const breathe = 1 + Math.sin(t * (lie ? 1.6 : 2.4)) * (lie ? 0.035 : 0.02);
  const legLen = lie ? 0 : lerp(18, 30, g);
  const rx = 62, ry = lerp(36, 42, g) * breathe;
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

  // Soft shadow on the ground (not lifted by the jump).
  c.save();
  c.translate(0, -bob + (o.jump || 0) / k);
  c.fillStyle = 'rgba(30,60,20,0.18)';
  c.beginPath(); c.ellipse(8, 2, 95 * (o.jump ? 0.85 : 1), 9, 0, 0, TAU); c.fill();
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
    c.fillStyle = C.plate[i % 2];
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
  c.fillStyle = C.body;
  c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, TAU); c.fill(); c.stroke();
  c.save();
  c.beginPath(); c.ellipse(cx, cy, rx - 1.5, ry - 1.5, 0, 0, TAU); c.clip();
  c.fillStyle = C.belly;
  c.beginPath(); c.ellipse(cx + 10, cy + ry * 0.85, rx * 0.85, ry * 0.5, 0, 0, TAU); c.fill();
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
  skull(); c.stroke(); snout(); c.stroke();
  c.fillStyle = C.body; skull(); c.fill(); snout(); c.fill();
  // Nostril and cheek.
  c.fillStyle = C.line;
  c.beginPath(); c.arc(hx + 28 * hs, hy + 1 * hs, 1.8 * hs, 0, TAU); c.fill();
  c.fillStyle = C.cheek; c.globalAlpha = 0.55;
  c.beginPath(); c.ellipse(hx + 10 * hs, hy + 9 * hs, 6 * hs, 4 * hs, 0, 0, TAU); c.fill();
  c.globalAlpha = 1;

  // Eye.
  const ex = hx + 1 * hs, ey = hy - 6 * hs, er = lerp(8.5, 7, g) * hs;
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
    c.beginPath(); c.arc(er * 0.22, er * 0.08, er * 0.62, 0, TAU); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(er * 0.42, -er * 0.25, er * 0.22, 0, TAU); c.fill();
    c.restore();
    if (eyes === 'sad') {   // worried eyebrow
      c.beginPath(); c.moveTo(ex - er * 0.9, ey - er * 1.25); c.lineTo(ex + er * 0.7, ey - er * 1.6); c.stroke();
    }
  }

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
