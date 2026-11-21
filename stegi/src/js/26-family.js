/* 26-family.js – 0.12: the family.
 * Two days after he is fully grown (life day SIB_EGG_DAY) a second egg lies in a small nest next to him.
 * It is stroked like his own egg was (EGG rules: one crack a day after EGG.petSeconds of stroking, then on a
 * later day EGG.hatchSeconds of stroking and it hatches). The little sibling has NO needs of its own: it
 * follows him, walks along, copies his jumps and dances, sleeps next to him and giggles when tapped.
 * It grows like he did (GROWN_DAY days), but stays a little smaller than him (SIB_SIZE). */

const SIB_EGG_DAY = GROWN_DAY + 2;   // life day of the big one when the sibling egg appears
const SIB_SIZE = 0.75;               // grown sibling = 75 % of his size (he stays the big brother)
const SIB_EGG_H = 84;                // egg height in units (his egg was 120)
/** Mint green with sky-blue plates, so the child can tell them apart at once. */
const SIB_COLORS = Object.assign({}, STEGO_COLORS, {
  body: '#7fae9a', dark: '#64907d', spot: '#6f9f8a', belly: '#e4eadb',
  plate: ['#64b5f6', '#9fd3ff'], plateLine: '#2f6fa3',
});

/** Sibling on screen (not saved): position, jumps, timers, the egg's wobble. */
const sib = { x: null, dir: 1, walk: 0, moving: false, jump: 0, jumpV: 0, landT: 0, hopAt: 0, petJump: 0,
  giggleT: 0, blink: 0, nextBlink: 2, idleHop: 8, rub: 0, hatchT: -1, box: null,
  egg: { glow: 0, wobble: 0, wobbleV: 0 } };

const blankSib = () => ({ egg: { petDay: -1, petSec: 0, cracks: 0, crackDay: -1, hatchSec: 0 }, hatchDay: null, seen: false });
const sibEggThere = () => hatched() && !!S.sib && S.sib.hatchDay === null;
const sibHatched = () => hatched() && !!S.sib && S.sib.hatchDay !== null;
/** Day of the sibling's life (hatch day = 1), its growth 0..1 and stage like his (STAGES). */
const sibLifeDay = t => dayIndex(t) - S.sib.hatchDay + 1;
const sibGrowth = t => clamp((sibLifeDay(t) - 1) / (GROWN_DAY - 1), 0, 1);
function sibStage(t) { const d = sibLifeDay(t); let i = 0; while (i + 1 < STAGES.length && d >= STAGES[i + 1].day) i++; return i; }

/** The nest: in front of his feet, a bit left of the middle (he guards it; the sides hold cake, tree,
 *  puddles, gift; an Easter egg lies right of the middle). Hidden while walking (he carries it along).
 *  Taps on puddles, cake and holiday things win over the egg (10-input), the egg wins over furniture. */
const sibNestPos = () => ({ x: W * 0.38, y: standY + 38 * U });
const sibEggVisible = () => sibEggThere() && !S.walk;
function sibEggHit(x, y) {
  if (!sibEggVisible()) return false;
  const p = sibNestPos(), h = SIB_EGG_H * U;
  return Math.abs(x - p.x) < 60 * U && y > p.y - h - 25 * U && y < p.y + 20 * U;
}

/* ---------- egg ---------- */

/** Stroking the sibling egg for dt seconds (same rules as his egg, see eggRub in 08-game). */
function sibEggRub(dt) {
  const e = S.sib.egg, d = today(), p = sibNestPos();
  if (e.petDay !== d) { e.petDay = d; e.petSec = 0; }
  const ph = eggPhase(e);
  if (ph === 'growing') {
    e.petSec += dt;
    if (e.petSec >= EGG.petSeconds) {
      e.cracks++; e.crackDay = d;
      sound('crack'); sib.egg.wobbleV += 3;
      for (let i = 0; i < 8; i++) addPart('star', p.x + rnd(-30, 30) * U, p.y - rnd(20, 70) * U, { size: 6 });
      save();
    }
  } else if (ph === 'hatchday') {
    e.hatchSec += dt;
    if (e.hatchSec >= EGG.hatchSeconds && sib.hatchT < 0) { sib.hatchT = 0; sound('crack'); }
  }
}

/** The sibling egg opens. */
function finishSibHatch() {
  const p = sibNestPos();
  S.sib.hatchDay = today();
  save();
  for (let i = 0; i < 14; i++) addPart('shell', p.x + rnd(-24, 24) * U, p.y - rnd(20, 70) * U,
    { vx: rnd(-150, 150) * U, vy: rnd(-250, -110) * U, g: 600, color: i % 2 ? '#fff4d6' : '#9ad9b0', size: 7, max: 1.6 });
  sib.x = p.x; sib.dir = 1; sib.jumpV = 240 * U; sib.giggleT = 1.5;
  if (game.mode === 'idle') startParty(); else { sound('fanfare'); confetti(); }
  pet.giggleT = 2;
  game.autoPhotoAt = game.t + 1.6; game.autoPhoto = { kind: 'stage', label: 'Geschwisterchen' };   // milestone photo
}

/* ---------- every frame ---------- */

function updateFamily(dt, sleeping) {
  const t = now(), inGame = game.screen === 'game' && game.trans >= 1;
  if (!hatched()) return;
  if (!S.sib && lifeDay(t) >= SIB_EGG_DAY) { S.sib = blankSib(); save(); }
  if (!S.sib) return;
  sib.rub = Math.max(0, sib.rub - dt);
  if (sibEggThere()) { updateSibEgg(dt, inGame); return; }
  updateSibling(dt, sleeping);
}

function updateSibEgg(dt, inGame) {
  const fx = sib.egg, night = isNight(now()), p = sibNestPos();
  fx.wobbleV += -fx.wobble * 40 * dt; fx.wobbleV *= 1 - 3 * dt; fx.wobble += fx.wobbleV * dt;
  fx.glow = Math.max(0, fx.glow - dt * 1.5);
  if (sib.hatchT >= 0) {   // hatching: 1.8 s of wobbling and cracking
    const a = sib.hatchT; sib.hatchT += dt;
    if (Math.random() < dt * 8) fx.wobbleV += rnd(-2.5, 2.5);
    if (a > 0.6 && Math.floor(sib.hatchT * 2) !== Math.floor(a * 2)) sound('crack');
    if (sib.hatchT >= 1.8) { sib.hatchT = -1; finishSibHatch(); }
    return;
  }
  if (!inGame || S.walk) return;
  // The first time the child sees it: sparkles and a peep.
  if (!S.sib.seen && !night && game.mode === 'idle') {
    S.sib.seen = true; save();
    sound('peep'); fx.wobbleV += 2;
    for (let i = 0; i < 10; i++) addPart('star', p.x + rnd(-40, 40) * U, p.y - rnd(10, 100) * U, { size: 7 });
  }
  if (sib.rub > 0 && !night) {
    sibEggRub(dt);
    fx.glow = Math.min(1, fx.glow + dt * 4);
    if (Math.random() < dt * 3) { fx.wobbleV += rnd(-0.6, 0.6); sound('egg'); addPart('heart', game.rubX, game.rubY - 20 * U, { size: 6, vy: -40 * U }); }
  }
  if (eggPhase(S.sib.egg) === 'hatchday' && !night && game.t > (game.amb.sibPeep || 0)) {
    game.amb.sibPeep = game.t + 6;
    sound('peep'); fx.wobbleV += 1.5;
  }
}

/** Where the sibling wants to stand: in front of his tail, looking at him (also while walking).
 *  Its own tail may leave the screen on the left; its head must stay visible. */
function sibTarget(g) {
  const box = game.stegoInfo ? game.stegoInfo.box : { x: W * 0.2, w: W * 0.6 };
  const half = stegoSize * SIB_SIZE * lerp(SIZE_MIN, 1, g) * 0.5;
  return clamp(box.x + box.w * 0.06, half * lerp(1, 0.25, g), W - half);   // a small one stays fully in view
}

function updateSibling(dt, sleeping) {
  const t = now(), g = sibGrowth(t);
  sib.giggleT = Math.max(0, sib.giggleT - dt);
  sib.landT = Math.max(0, sib.landT - dt);
  sib.nextBlink -= dt;
  if (sib.nextBlink < 0) { sib.blink = 0.15; sib.nextBlink = rnd(2, 4.5); }
  sib.blink = Math.max(0, sib.blink - dt);
  const tx = sibTarget(g);
  if (sib.x === null) sib.x = tx;
  // Jumps: copies his jumps a moment later, and hops by itself now and then.
  if (pet.jump > 0 && sib.petJump === 0 && !sleeping) sib.hopAt = game.t + 0.25;
  sib.petJump = pet.jump;
  sib.idleHop -= dt;
  if (sib.idleHop < 0) { sib.idleHop = rnd(7, 14); if (!sleeping && !walkingNow() && game.mode === 'idle') sib.hopAt = game.t; }
  if (sib.hopAt && game.t >= sib.hopAt && sib.jump === 0) { sib.hopAt = 0; sib.jumpV = 170 * U; }
  if (sib.jumpV || sib.jump > 0) {
    sib.jump += sib.jumpV * dt; sib.jumpV -= 900 * U * dt;
    if (sib.jump <= 0) { sib.jump = 0; sib.jumpV = 0; sib.landT = 0.18; }
  }
  // Following.
  const dx = tx - sib.x;
  sib.moving = Math.abs(dx) > 4 * U && !sleeping;
  if (sib.moving) {
    sib.dir = Math.sign(dx);
    sib.x += sib.dir * Math.min(Math.abs(dx), (game.mode === 'ball' ? 240 : 140) * U * dt);
    sib.walk += dt * 14;
  } else if (walkingNow()) { sib.dir = 1; sib.walk += dt * 8; }
  else if (game.ball && !sleeping) sib.dir = game.ball.x > sib.x ? 1 : -1;   // watches the ball
  else sib.dir = W / 2 + pet.x > sib.x ? 1 : -1;                            // looks at its big brother
}

/** Tap on the egg or on the sibling. Returns true if it was used. */
function familyTap(x, y) {
  if (sibEggVisible() && sibEggHit(x, y) && sib.hatchT < 0) {
    sib.egg.wobbleV += 1.2; sound(isNight(now()) ? 'murmur' : 'egg');
    return true;
  }
  if (sibHatched() && sib.box && !asleepNow() && inBox(x, y, sib.box, 6 * U)) {
    sib.giggleT = 1.2; if (sib.jump === 0) sib.jumpV = 190 * U;
    sound('peep'); pet.happyT = Math.max(pet.happyT, 1);
    addPart('heart', sib.box.x + sib.box.w / 2, sib.box.y, { size: 8 });
    return true;
  }
  return false;
}

/* ---------- drawing ---------- */

/** The little sibling, drawn in front of him. (The egg is drawn later, see drawFamilyEgg.) */
function drawFamily(c, sky) {
  if (!sibHatched()) return;
  const t = now(), sleeping = asleepNow(), g = sibGrowth(t);
  const o = { colors: SIB_COLORS, g, stage: sibStage(t), t: game.t + 1.3, dir: sib.dir, pose: 'stand', walk: sib.walk,
    eyes: 'open', mouth: 'smile', blink: sib.blink > 0 ? 1 : 0, jump: sib.jump, wiggle: 0, dirt: 0, headDown: 0, wag: 0 };
  if (sleeping) { o.pose = 'lie'; o.eyes = 'closed'; o.mouth = 'closed'; o.blink = 0; }
  else {
    if (sib.moving || walkingNow()) o.pose = 'walk';
    if (sib.giggleT > 0) { o.eyes = 'happy'; o.mouth = 'open'; o.wag = 1; o.blush = true; o.brow = 'happy'; }
    else if (pet.danceT > 0 || game.mode === 'party') { o.eyes = 'happy'; o.mouth = 'open'; o.wag = 1; o.wiggle = 1; }
    else if (pet.happyT > 0 || pet.giggleT > 0) { o.eyes = 'happy'; o.wag = 1; }
    if (sib.jump > 0) o.squash = -clamp(Math.abs(sib.jumpV) / (300 * U), 0, 1) * 0.6;
    else if (sib.landT > 0) o.squash = sib.landT / 0.18 * 0.9;
  }
  const info = drawStego(c, sib.x, standY + 16 * U, stegoSize * SIB_SIZE, o);
  sib.box = info.box;
  if (sleeping && game.trans >= 1 && game.t > (game.amb.sibZzz || 0)) {
    game.amb.sibZzz = game.t + 1.9;
    addPart('zzz', info.head.x + 12 * U, info.head.y - 14 * U, { vx: 12 * U, vy: -30 * U, size: 7 + Math.random() * 4, max: 2.2 });
  }
}

/** Nest with egg and its hearts: drawn after the foreground grass, so no blade covers the egg. */
function drawFamilyEgg(c, sky) { if (sibEggVisible()) drawSibEgg(c, sky); }

function drawSibEgg(c, sky) {
  const p = sibNestPos(), h = SIB_EGG_H * U, fx = sib.egg, e = S.sib.egg;
  let wob = fx.wobble;
  const ph = eggPhase(e);
  if (ph === 'hatchday' && sib.hatchT < 0) wob += Math.sin(game.t * 9) * 0.03;
  drawNest(c, p.x, p.y + 6 * U, 120 * U, 'back');
  drawEgg(c, p.x, p.y - 3 * U, h, e.cracks, fx.glow, wob, game.t);
  drawNest(c, p.x, p.y + 6 * U, 120 * U, 'front');
  if (game.trans < 1 || sib.hatchT >= 0) return;
  if (sky.night) {
    if (Math.random() < 0.015) addPart('zzz', p.x + 28 * U, p.y - h, { vx: 10 * U, vy: -26 * U, size: 5, max: 2 });
    return;
  }
  // Five small hearts above the egg fill up with today's stroking.
  const pr = eggProgress(e), n = 5, s = 20 * U;
  for (let i = 0; i < n; i++) {
    const hx = p.x + (i - 2) * 24 * U, hy = p.y - h - 34 * U, fill = clamp(pr * n - i, 0, 1);
    c.save(); c.globalAlpha = 0.35; drawIcon(c, 'love', hx, hy, s); c.restore();
    if (fill > 0) {
      c.save(); c.beginPath(); c.rect(hx - s / 2, hy + s / 2 - s * fill, s, s * fill); c.clip();
      drawIcon(c, 'love', hx, hy, s); c.restore();
    }
  }
  if (ph !== 'done' && sib.rub <= 0 && game.mode === 'idle') drawRubHint({ x: p.x - 30 * U, y: p.y - h, w: 60 * U, h });
}
