/* 08-game.js – what happens on screen: the egg, the stego's moods and moves, and the activities
 * (eat, drink, bath, teeth, ball, bed, hatching, growing party). update(dt) runs every frame,
 * drawWorld() draws everything. The HTML buttons are in 09-ui.js, touches in 10-input.js. */

/** Screen and activity state.
 *  screen: 'menu' | 'game'.  trans: 0 = menu camera .. 1 = game camera (animated).
 *  mode:   'idle' | 'eat' | 'drink' | 'bath' | 'brush' | 'ball' | 'hatch' | 'party'
 *          | 'play' (menu: ball, hide, music, training) | 'hide' | 'music' (0.3) | 'train' (0.8). */
const game = {
  screen: 'menu', trans: 0, mode: 'idle', modeT: 0, t: 0,
  flying: null,      // food on its way to the mouth: { id, x, y, sx, sy, k }
  held: null,        // food held by the finger: { id, x, y }
  rubbing: 0,        // seconds left of "finger is rubbing" (egg, bath, teeth)
  rubX: 0, rubY: 0,  // where the finger rubs
  bath: null,        // { phase: 'scrub'|'rinse'|'done', t }
  brush: null,       // { x, y, done, t, progress }
  ball: null,        // { x, h, vx, vh, rot, carried, thrown }
  amb: {},           // next time (game.t) of each ambient sound
  sky: null,
  stegoInfo: null,   // last result of drawStego (mouth, head, box)
  hide: null,        // hide and seek (15-play.js)
  visit: null,       // visitor on screen (16-visit.js)
  photoPending: null, flash: 0, autoPhotoAt: 0, autoPhoto: null,   // camera and milestone photos (18-photos.js)
  weatherTest: null, // tests only: forces the weather
};

/** The stego as an actor on screen. x is the offset from the screen centre in pixels. */
const pet = {
  x: 0, tx: 0, dir: 1, walk: 0, moving: false, jump: 0, jumpV: 0,
  blink: 0, nextBlink: 3, happyT: 0, giggleT: 0, eatT: 0, refuseT: 0, yawnT: 0,
  wiggle: 0, petDist: 0, purrT: 0,
  danceT: 0,   // > 0 while he dances to the music
  idle: null, idleNext: 6,   // 0.6: little things he does by himself ({ kind, t, dur }) and when the next one comes
  landT: 0,    // > 0 just after landing from a jump (squash)
  turnT: 0,    // 0.7: > 0 right after turning around (no new turn yet)
  trick: null, // 0.8: trick being shown { kind, ok, idle, t, dur } (22-training.js)
  depth: 0,    // 0 = in front .. 1 = far back behind a hiding place
};

/** Egg animation state. */
const eggFx = { glow: 0, wobble: 0, wobbleV: 0 };

/** Where things are on screen (set in resize()). */
let standY = 600, stegoSize = 290;

const today = () => dayIndex(now());
const asleepNow = () => hatched() && isAsleep(now());

/* ---------- egg ---------- */

/** 'growing' (cracks to come), 'done' (today's stroking done), 'hatchday' (ready to hatch). */
function eggPhase() {
  const e = S.egg, d = today();
  if (e.cracks >= EGG.cracks) return d > e.crackDay ? 'hatchday' : 'done';
  return e.crackDay === d ? 'done' : 'growing';
}

/** 0..1 progress shown as hearts above the egg. */
function eggProgress() {
  const e = S.egg, ph = eggPhase();
  if (ph === 'done') return 1;
  if (ph === 'hatchday') return clamp(e.hatchSec / EGG.hatchSeconds, 0, 1);
  return e.petDay === today() ? clamp(e.petSec / EGG.petSeconds, 0, 1) : 0;
}

/** The finger strokes the egg for dt seconds. */
function eggRub(dt) {
  const e = S.egg, d = today();
  if (e.petDay !== d) { e.petDay = d; e.petSec = 0; }
  const ph = eggPhase();
  if (ph === 'growing') {
    e.petSec += dt;
    if (e.petSec >= EGG.petSeconds) {
      e.cracks++; e.crackDay = d;
      sound('crack');
      eggFx.wobbleV += 3;
      for (let i = 0; i < 8; i++) addPart('star', W / 2 + rnd(-40, 40) * U, eggTop() + rnd(0, 60) * U, { size: 7 });
      save();
    }
  } else if (ph === 'hatchday') {
    e.hatchSec += dt;
    if (e.hatchSec >= EGG.hatchSeconds && game.mode !== 'hatch') startHatch();
  }
}

const eggHeight = () => 120 * U;
const eggTop = () => standY - eggHeight();

function startHatch() {
  game.mode = 'hatch'; game.modeT = 0;
  sound('crack');
}

/** The egg opens: the baby is there. */
function finishHatch() {
  const t = now();
  S.hatchDay = today();
  for (const n of NEEDS) S.needs[n] = START_NEEDS;
  S.last = t; S.stageSeen = 0; S.meals = 0; S.poopAt = 0; S.poops = [];
  save();
  sound('fanfare');
  for (let i = 0; i < 14; i++) addPart('shell', W / 2 + rnd(-30, 30) * U, standY - rnd(30, 90) * U,
    { vx: rnd(-160, 160) * U, vy: rnd(-260, -120) * U, g: 600, color: i % 2 ? '#fff4d6' : '#9ad9b0', size: 8, max: 1.6 });
  confetti();
  pet.x = 0; pet.tx = 0; pet.jumpV = 260 * U; pet.giggleT = 1.5;
  game.autoPhotoAt = game.t + 1.6; game.autoPhoto = { kind: 'hatch' };   // first milestone photo
}

function confetti() {
  const cols = ['#ff5c8a', '#ffcc33', '#5cc15a', '#3fa9f5', '#b388ff', '#ff9a4d'];
  for (let i = 0; i < 70; i++) addPart('confetti', rnd(0, W), rnd(-40, 0) * U,
    { vx: rnd(-40, 40) * U, vy: rnd(60, 200) * U, g: 40, color: cols[i % cols.length], size: 9, max: rnd(2.5, 4) });
}

/* ---------- activities ---------- */

/** Leaves the current activity (X button, back key, night falling). */
function endMode() {
  if (game.mode === 'hatch') return;   // hatching cannot be interrupted
  game.mode = 'idle'; game.modeT = 0;
  game.held = null; game.flying = null; game.bath = null; game.brush = null;
  if (game.ball) game.ball = null;
  game.hide = null; pet.depth = 0; pet.danceT = 0;
  if (game.mode === 'train') pet.trick = null;
  game.train = null;
  pet.tx = 0;
  refreshUI();
}

/** Starts an activity from a bottom button. */
function startMode(m) {
  if (game.mode === 'play' && m !== 'play') game.mode = 'idle';   // chosen from the play menu
  if (!hatched() || asleepNow() || game.mode !== 'idle') return;
  sound('tap');
  if (m === 'drink') {
    if (S.needs.drink >= 95) { refuse(); return; }
    pet.tx = 0;
    // The bowl stays where the mouth was, the head bends down to it.
    game.bowlX = game.stegoInfo ? game.stegoInfo.mouth.x + 12 * U : W / 2 + 90 * U;
  }
  if (m === 'bath') game.bath = { phase: 'scrub', t: 0 };
  if (m === 'brush') game.brush = { x: W * 0.75, y: standY - 60 * U, progress: 0, done: false, t: 0, scrubT: 0 };
  if (m === 'hide') { game.mode = 'hide'; startHide(); refreshUI(); return; }
  if (m === 'train') { startTrain(); return; }
  if (m === 'ball') game.ball = { x: Math.min(W - 40 * U, W / 2 + 140 * U), h: 0, vx: 0, vh: 0, rot: 0, carried: false, thrown: false };
  game.mode = m; game.modeT = 0;
  if (m !== 'ball') pet.tx = 0;
  refreshUI();
}

/** He shakes his head: does not want any more. */
function refuse() { pet.refuseT = 0.9; sound('refuse'); }

/** "Lights out" in the sleepy half hour before bedtime. */
function goToBed() {
  if (!hatched() || asleepNow() || !isSleepy(now())) return;
  endMode();
  S.bedAt = now();
  sound('yawn');
  save();
  refreshUI();
}

/** Food is offered (tapped on the tray or dropped near the mouth). from = screen point. */
function offerFood(id, fx, fy) {
  if (game.mode !== 'eat' || game.flying || pet.eatT > 0) return false;
  if (S.needs.food >= 95) { refuse(); return false; }
  const m = game.stegoInfo ? game.stegoInfo.mouth : { x: W / 2, y: standY - 80 * U };
  game.flying = { id, x: fx, y: fy, sx: fx, sy: fy, k: 0, tx: m.x, ty: m.y };
  return true;
}

/** The food arrived in the mouth. */
function eat(id) {
  const f = FOODS.find(x => x.id === id);
  addNeed('food', f.value);
  addNeed('love', 1);
  countMeal();
  pet.eatT = 1.3;
  sound('munch');
  const m = game.stegoInfo.mouth;
  const col = { fern: '#4caf50', leaf: '#7cc957', berry: '#7b3fb0', apple: '#e53935', melon: '#ef5350' }[id];
  for (let i = 0; i < 6; i++) addPart('crumb', m.x, m.y, { vx: rnd(-60, 60) * U, vy: rnd(-80, -20) * U, g: 400, color: col, size: 4, max: 0.8 });
  save();
}

/** A poop was tapped away. */
function removePoop(i) {
  const p = S.poops[i];
  S.poops.splice(i, 1);
  addNeed('clean', POOP_CLEAN);
  sound('pling');
  for (let k = 0; k < 6; k++) addPart('sparkle', p.x * W + rnd(-15, 15) * U, standY + 18 * U - rnd(0, 30) * U, { size: 7, max: 0.8 });
  save();
}
/** Called by tick() when a poop appears. */
function onPoop() { if (game.screen === 'game') sound('plop'); }

/** Screen position of poop i. */
const poopPos = i => ({ x: S.poops[i].x * W, y: standY + 22 * U });

/** He is stroked: dist = finger movement in pixels over his body. */
function strokeStego(dist) {
  pet.idle = null;
  pet.petDist += dist;
  pet.happyT = 0.6;
  pet.wiggle = 1;
  while (pet.petDist >= PET_STEP * U) {
    pet.petDist -= PET_STEP * U;
    addNeed('love', PET_LOVE);
    const h = game.stegoInfo ? game.stegoInfo.head : { x: W / 2, y: standY - 100 * U };
    addPart('heart', h.x + rnd(-30, 30) * U, h.y - 30 * U, { size: 8, vy: -50 * U });
  }
  if (game.t > pet.purrT) { sound('purr'); pet.purrT = game.t + 1.0; }
}

/** He is tapped once. */
function tapStego() {
  pet.idle = null;
  if (asleepNow()) { sound('murmur'); pet.dir = -pet.dir; return; }
  if (pet.jump > 0) return;
  pet.jumpV = 170 * U; pet.giggleT = 0.7;
  addNeed('love', 1);
  sound('giggle');
}

/** Idle moments (0.6): when nothing happens for 7–14 s and he is fine, he sniffs at a flower,
 *  looks up in wonder, is happy for no reason or hops. Not when he is sad, sleepy, walking or has a visitor. */
const IDLE_KINDS = { sniff: 2.6, look: 2.2, happy: 1.6, hop: 1.0 };
function updateIdle(dt, low) {
  if (pet.idle) {
    pet.idle.t += dt;
    if (pet.idle.t >= pet.idle.dur) { pet.idle = null; pet.idleNext = game.t + rnd(7, 14); }
    return;
  }
  const busy = !!pet.trick || pet.moving || walkingNow() || game.visit || pet.jump > 0 || pet.happyT > 0 || pet.eatT > 0 || pet.yawnT > 0 || pet.giggleT > 0;
  if (busy || low.value < NEED_SAD || isSleepy(now())) { pet.idleNext = Math.max(pet.idleNext, game.t + 3); return; }
  if (game.t < pet.idleNext) return;
  // 0.8: now and then a trick he has learned instead.
  const learned = learnedTricks();
  if (learned.length && Math.random() < IDLE_TRICK_CHANCE) { startTrick(learned[Math.floor(Math.random() * learned.length)], true, true); pet.idleNext = game.t + rnd(7, 14); return; }
  const kinds = Object.keys(IDLE_KINDS), kind = kinds[Math.floor(Math.random() * kinds.length)];
  pet.idle = { kind, t: 0, dur: IDLE_KINDS[kind] };
  if (kind === 'hop') pet.jumpV = 200 * U;
  if (kind === 'happy') sound('happy');
}

/** Stage-up party (and the first look after hatching). */
function startParty() {
  game.mode = 'party'; game.modeT = 0;
  sound('fanfare'); confetti();
  pet.jumpV = 240 * U; pet.giggleT = 2;
  refreshUI();
}

/* ---------- update ---------- */

function update(dt) {
  updateDev(dt);   // test mode: fast time (19-dev.js)
  const t = now();
  game.t += dt;
  tick(t);
  game.sky = skyAt(t);
  // Camera between menu (0) and game (1).
  game.trans = clamp(game.trans + (game.screen === 'game' ? dt : -dt) / 0.7, 0, 1);
  game.modeT += dt;
  game.rubbing = Math.max(0, game.rubbing - dt);
  updateParts(dt);

  const sleeping = asleepNow();
  if (sleeping && !['idle', 'hatch'].includes(game.mode)) endMode();

  if (!hatched() || game.mode === 'hatch') updateEgg(dt);
  else updatePet(dt, sleeping);

  if (game.screen === 'game' && game.trans >= 1 && document.visibilityState !== 'hidden') {
    if (addPlayTime(dt)) showRest();
  }
  updateMusic(!game.sky.night && game.mode !== 'music');
  if (game.autoPhotoAt && game.t >= game.autoPhotoAt) { game.autoPhotoAt = 0; const a = game.autoPhoto || { kind: 'stage' }; takePhoto(a.kind, a.label); }
  game.flash = Math.max(0, game.flash - dt * 2.5);
}

function updateEgg(dt) {
  const ph = eggPhase(), night = isNight(now());
  // Wobble: a spring that gets kicks while being stroked and on hatch day.
  eggFx.wobbleV += -eggFx.wobble * 40 * dt; eggFx.wobbleV *= 1 - 3 * dt; eggFx.wobble += eggFx.wobbleV * dt;
  eggFx.glow = Math.max(0, eggFx.glow - dt * 1.5);
  if (game.mode === 'hatch') {
    if (Math.random() < dt * 8) eggFx.wobbleV += rnd(-2.5, 2.5);
    if (game.modeT > 0.6 && Math.floor(game.modeT * 2) !== Math.floor((game.modeT - dt) * 2)) sound('crack');
    if (game.modeT >= 1.8 && !hatched()) { finishHatch(); startParty(); }
    return;
  }
  if (game.screen !== 'game' || game.trans < 1) return;
  if (game.rubbing > 0 && !night) {
    eggRub(dt);
    eggFx.glow = Math.min(1, eggFx.glow + dt * 4);
    if (Math.random() < dt * 3) { eggFx.wobbleV += rnd(-0.6, 0.6); sound('egg'); addPart('heart', game.rubX, game.rubY - 20 * U, { size: 6, vy: -40 * U }); }
  }
  if (ph === 'hatchday' && !night && game.t > (game.amb.peep || 0)) {
    game.amb.peep = game.t + 5;
    sound('peep'); eggFx.wobbleV += 1.5;
  }
}

function updatePet(dt, sleeping) {
  const inGame = game.screen === 'game' && game.trans >= 1;
  // Timers.
  pet.happyT = Math.max(0, pet.happyT - dt);
  pet.giggleT = Math.max(0, pet.giggleT - dt);
  pet.eatT = Math.max(0, pet.eatT - dt);
  pet.refuseT = Math.max(0, pet.refuseT - dt);
  pet.yawnT = Math.max(0, pet.yawnT - dt);
  pet.wiggle = Math.max(0, pet.wiggle - dt * 1.5);
  pet.danceT = Math.max(0, pet.danceT - dt);
  updateTrick(dt);
  pet.landT = Math.max(0, pet.landT - dt);
  // Jumping.
  if (pet.jumpV || pet.jump > 0) {
    pet.jump += pet.jumpV * dt; pet.jumpV -= 900 * U * dt;
    if (pet.jump <= 0) { pet.jump = 0; pet.jumpV = 0; pet.landT = 0.18; }
  }
  // Blinking.
  pet.nextBlink -= dt;
  if (pet.nextBlink < 0) { pet.blink = 0.15; pet.nextBlink = rnd(2.5, 5); }
  pet.blink = Math.max(0, pet.blink - dt);
  // Walking towards tx.
  const speed = (game.mode === 'ball' || game.mode === 'hide' ? 260 : 120) * U, dx = pet.tx - pet.x;
  pet.moving = Math.abs(dx) > 3 * U && !sleeping;
  pet.turnT = Math.max(0, pet.turnT - dt);
  if (pet.moving) {
    // He turns around at most every 0.4 s (0.7): before, he could flip every frame while chasing the ball.
    const want = Math.sign(dx);
    if (want !== pet.dir && pet.turnT > 0) { /* wait a moment before turning */ }
    else {
      if (want !== pet.dir) pet.turnT = 0.4;
      pet.dir = want;
      pet.x += want * Math.min(Math.abs(dx), speed * dt);
      pet.walk += dt * 12;
    }
  } else if (!['ball', 'hide', 'music'].includes(game.mode) && !(game.visit && game.visit.phase === 'stay') && !sleeping) pet.dir = 1;
  if (walkingNow()) pet.walk += dt * 6;   // slow steps on the way (the landscape scrolls, 13-travel)
  updateTravel(dt, sleeping);

  // Activities.
  if (game.mode === 'eat' && game.flying) {
    const f = game.flying, m = game.stegoInfo ? game.stegoInfo.mouth : { x: f.tx, y: f.ty };
    f.k = Math.min(1, f.k + dt / 0.35);
    f.x = lerp(f.sx, m.x, smooth(f.k)); f.y = lerp(f.sy, m.y, smooth(f.k)) - Math.sin(f.k * Math.PI) * 50 * U;
    if (f.k >= 1) { game.flying = null; eat(f.id); }
  }
  if (game.mode === 'drink') {
    if (Math.floor(game.modeT / 0.8) !== Math.floor((game.modeT - dt) / 0.8) && game.modeT > 0.5) sound('slurp');
    if (game.modeT >= 2.6) { addNeed('drink', DRINK_VALUE); save(); game.mode = 'idle'; refreshUI(); }
  }
  if (game.mode === 'bath') updateBath(dt);
  if (game.mode === 'brush') updateBrush(dt);
  if (game.mode === 'ball') updateBall(dt);
  if (game.mode === 'hide') updateHide(dt);
  updateVisit(dt, sleeping);
  if (game.mode === 'party' && game.modeT > 3) { game.mode = 'idle'; refreshUI(); }
  if (game.mode === 'party' && pet.jump === 0 && game.modeT < 2.4) { pet.jumpV = 200 * U; }

  if (!inGame) return;
  // Ambient sounds and Zzz.
  const a = game.amb;
  if (sleeping) {
    if (game.t > (a.snore || 0)) { a.snore = game.t + 3.4; sound('snore'); }
    if (game.t > (a.zzz || 0)) { a.zzz = game.t + 1.3; const h = game.stegoInfo.head; addPart('zzz', h.x + 20 * U, h.y - 20 * U, { vx: 15 * U, vy: -35 * U, size: 10 + Math.random() * 6, max: 2.4 }); }
    return;
  }
  if (game.mode !== 'idle') return;
  const low = lowestNeed();
  if (S.needs.food < NEED_LOW && game.t > (a.rumble || 8)) { a.rumble = game.t + rnd(16, 26); sound('rumble'); }
  else if (low.value < NEED_SAD && game.t > (a.whine || 12)) { a.whine = game.t + rnd(18, 28); sound('whine'); }
  if (isSleepy(now()) && game.t > (a.yawn || 4)) { a.yawn = game.t + rnd(14, 22); pet.yawnT = 1.6; sound('yawn'); }
  updateIdle(dt, low);
  // Stage-up party once a second check.
  if (stageAt(now()) > S.stageSeen) { S.stageSeen = stageAt(now()); save(); startParty(); game.autoPhotoAt = game.t + 1.6; game.autoPhoto = { kind: 'stage', label: STAGES[S.stageSeen].name }; }
}

function updateBath(dt) {
  const b = game.bath;
  b.t += dt;
  if (b.phase === 'scrub') {
    if (game.rubbing > 0 && game.stegoInfo && inBox(game.rubX, game.rubY, game.stegoInfo.box, 20 * U)) {
      addNeed('clean', 100 / BATH_SECONDS * dt);
      pet.happyT = 0.3;
      if (Math.random() < dt * 14) addPart('bubble', game.rubX + rnd(-20, 20) * U, game.rubY + rnd(-15, 15) * U, { vx: rnd(-10, 10) * U, vy: rnd(-30, -10) * U, size: rnd(5, 10), max: 2.5 });
      if (Math.random() < dt * 3) sound('pop');
      if (S.needs.clean >= 100) { b.phase = 'rinse'; b.t = 0; sound('splash'); }
    }
  } else if (b.phase === 'rinse') {
    for (let i = 0; i < 3; i++) addPart('drop', W / 2 + rnd(-90, 90) * U, standY - 230 * U, { vx: 0, vy: rnd(250, 350) * U, g: 300, size: 7, max: 0.8 });
    if (b.t > 1.6) { b.phase = 'done'; b.t = 0; sound('sparkle'); for (let i = 0; i < 12; i++) addPart('sparkle', W / 2 + rnd(-100, 100) * U, standY - rnd(20, 160) * U, { size: 9 }); save(); }
  } else if (b.t > 1.4) endMode();
}

function updateBrush(dt) {
  const b = game.brush;
  b.t += dt;
  if (b.done) { if (b.t > 1.4) endMode(); return; }
  const m = game.stegoInfo && game.stegoInfo.mouth;
  if (m && game.rubbing > 0 && dist(b.x, b.y, m.x, m.y) < 55 * U) {
    b.progress += dt / BRUSH_SECONDS;
    b.scrubT -= dt;
    if (b.scrubT <= 0) { sound('scrub'); b.scrubT = 0.2; }
    if (Math.random() < dt * 10) addPart('bubble', m.x + rnd(-12, 12) * U, m.y + rnd(-8, 8) * U, { vx: rnd(-20, 20) * U, vy: rnd(-25, -5) * U, size: rnd(3, 6), max: 1.2 });
    if (b.progress >= 1) {
      b.done = true; b.t = 0;
      S.teethDay = today();
      addNeed('clean', BRUSH_CLEAN); addNeed('love', BRUSH_LOVE);
      sound('sparkle');
      for (let i = 0; i < 10; i++) addPart('star', m.x + rnd(-30, 30) * U, m.y + rnd(-30, 10) * U, { size: 7 });
      save();
    }
  }
}

/** Ball physics in a side view: x across the screen, h = height above the ground. */
function updateBall(dt) {
  const b = game.ball, info = game.stegoInfo;
  if (!b || !info) return;
  if (b.carried) {
    b.x = info.mouth.x + pet.dir * 8 * U; b.h = standY - info.mouth.y - 4 * U;
    pet.tx = 0;
    if (!pet.moving && Math.abs(pet.x) < 4 * U) {   // back in the middle: drop it, happy
      b.carried = false; b.thrown = false; b.vx = 0; b.vh = 120 * U; b.x = Math.min(W - 40 * U, W / 2 + 140 * U);
      addNeed('fun', FETCH_FUN); save();
      pet.giggleT = 0.9; pet.jumpV = 160 * U; sound('giggle');
      for (let i = 0; i < 3; i++) addPart('heart', info.head.x + rnd(-20, 20) * U, info.head.y - 30 * U, { size: 8 });
    }
    return;
  }
  b.vh -= 900 * U * dt;
  b.h += b.vh * dt;
  if (b.h <= 0) {
    b.h = 0;
    if (b.vh < -80 * U) { b.vh = -b.vh * 0.55; sound('boing'); } else b.vh = 0;
    b.vx *= 1 - Math.min(1, 2.2 * dt);
  }
  b.x += b.vx * dt;
  b.rot += b.vx * dt / (16 * U);
  const r = BALL_R * U;
  if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx) * 0.7; sound('boing'); }
  if (b.x > W - r) { b.x = W - r; b.vx = -Math.abs(b.vx) * 0.7; sound('boing'); }
  if (b.thrown) {
    // Run so that the mouth reaches the ball. Which side of him the ball is on is decided once per throw
    // and only changed when the ball is clearly on the other side (0.7: no more flickering left/right).
    const reach = Math.abs(info.mouth.x - (W / 2 + pet.x)), rel = b.x - (W / 2 + pet.x);
    if (!b.side || (Math.sign(rel) !== b.side && Math.abs(rel) > reach * 1.3)) b.side = Math.sign(rel) || 1;
    const side = b.side;
    pet.tx = clamp(b.x - W / 2 - side * Math.abs(reach), -W / 2 + 60 * U, W / 2 - 60 * U);
    const slow = Math.abs(b.vx) < 90 * U && b.h < 25 * U;
    if (slow && Math.abs(info.mouth.x - b.x) < 30 * U) { b.carried = true; sound('happy'); }
  }
}

/** Ball thrown by the finger with velocity (vx, vy) in px/s. */
function throwBall(vx, vy) {
  const b = game.ball;
  if (!b || b.carried) return;
  const sp = Math.hypot(vx, vy);
  if (sp < 150 * U) { vx = (b.x > W / 2 + pet.x ? 1 : -1) * 260 * U; vy = -320 * U; }
  b.vx = clamp(vx, -900 * U, 900 * U); b.vh = clamp(-vy, 150 * U, 900 * U);
  b.thrown = true;
  b.side = 0;   // chase side is chosen fresh for this throw
  sound('boing');
}

/** Ball radius in U and the screen y of its centre (it rolls in front of the stego). */
const BALL_R = 20;
const ballY = () => standY + 14 * U - game.ball.h - BALL_R * U;

const inBox = (x, y, b, pad = 0) => x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;

/* ---------- drawing ---------- */

/** Pose and face of the stego right now. */
function stegoLook() {
  const sleeping = asleepNow(), low = lowestNeed();
  const o = { g: growthAt(now()), stage: stageAt(now()), t: game.t, dir: pet.dir, pose: 'stand', walk: pet.walk,
    eyes: 'open', mouth: 'smile', blink: pet.blink > 0 ? 1 : 0, jump: pet.jump, wiggle: pet.wiggle,
    dirt: clamp((50 - S.needs.clean) / 50, 0, 1), headDown: 0, wag: 0, wear: wearNow() };
  if (sleeping) { o.pose = 'lie'; o.eyes = 'closed'; o.mouth = 'closed'; o.blink = 0; return o; }
  if (pet.trick) { applyTrickLook(o); return o; }   // 0.8: a trick wins over everything else
  if (pet.moving || walkingNow()) o.pose = 'walk';
  if (game.mode === 'drink') { o.headDown = smooth(Math.min(game.modeT, 2.6 - game.modeT) / 0.4); o.mouth = 'open'; o.eyes = 'happy'; }
  else if (pet.eatT > 0) { o.mouth = 'chew'; o.eyes = 'happy'; }
  else if (pet.refuseT > 0) { o.mouth = 'closed'; o.eyes = 'closed'; o.dir = Math.sin(pet.refuseT * 25) > 0 ? 1 : -1; }
  else if (game.mode === 'brush') { o.mouth = game.brush.done ? 'smile' : 'grin'; o.eyes = game.brush.done ? 'happy' : 'open'; }
  else if (game.mode === 'eat') { o.mouth = 'open'; }
  else if (pet.yawnT > 0) { o.mouth = 'yawn'; o.eyes = 'closed'; }
  else if (pet.danceT > 0) { o.mouth = 'open'; o.eyes = 'happy'; o.wag = 1; o.wiggle = 1; o.brow = 'happy'; }
  else if (pet.giggleT > 0) { o.mouth = 'open'; o.eyes = 'happy'; o.wag = 1; o.brow = 'happy'; o.blush = true; }
  else if (pet.happyT > 0) { o.eyes = 'happy'; o.wag = 1; o.blush = true; }
  else if (pet.idle && game.mode === 'idle') applyIdleLook(o);
  else if (low.value < NEED_SAD) { o.eyes = 'sad'; o.mouth = 'sad'; }
  if (game.ball && game.ball.carried) o.mouth = 'open';
  // Squash and stretch: stretched in the air, squashed for a moment after landing.
  if (pet.jump > 0) o.squash = -clamp(Math.abs(pet.jumpV) / (300 * U), 0, 1) * 0.6;
  else if (pet.landT > 0) o.squash = pet.landT / 0.18 * 0.9;
  return o;
}

/** Face and pose of the idle moments (see updateIdle). */
function applyIdleLook(o) {
  const { kind, t, dur } = pet.idle, inOut = smooth(Math.min(t, dur - t) / 0.4);
  if (kind === 'sniff') { o.headDown = inOut * 0.75; o.eyes = 'closed'; o.mouth = 'closed'; }
  else if (kind === 'look') { o.look = { x: 0.05, y: -0.35 * inOut }; if (inOut > 0.5) { o.brow = 'up'; o.mouth = 'open'; } }
  else if (kind === 'happy') { o.eyes = 'happy'; o.brow = 'happy'; o.blush = true; o.mouth = 'open'; o.wiggle = 1; o.wag = 1; }
  else if (kind === 'hop') { o.eyes = 'happy'; o.mouth = 'open'; }
}

/** Camera: zoomed in on the stego in the menu, normal in the game. */
function cameraZoom() {
  // A small stego is zoomed in more, so that the grown one still fits on the screen.
  const menuZoom = hatched() ? lerp(1.4, 1.02, growthAt(now())) : 1.35;
  return lerp(menuZoom, 1, smooth(game.trans));
}
const camCenter = () => ({ x: W / 2, y: standY - 70 * U });

function drawWorld() {
  const t = now(), sky = game.sky || skyAt(t), z = cameraZoom(), cc = camCenter();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.save();
  ctx.translate(cc.x, cc.y); ctx.scale(z, z); ctx.translate(-cc.x, -cc.y);
  const placeId = !hatched() ? 'meadow' : S.walk ? 'travel' : S.place, weather = currentWeather();
  drawBackground(ctx, sky, game.t, placeId, weather, walkFx.scroll);

  if (!hatched() || (game.mode === 'hatch' && !hatched())) {
    drawEggScene(sky);
    drawForeground(ctx, 'meadow', game.t, sky.light);
  } else {
    S.poops.forEach((p, i) => { const pp = poopPos(i); drawPoop(ctx, pp.x, pp.y, 1.1 * U, game.t + i); });
    const sx = W / 2 + pet.x, look = stegoLook();
    const tubW = game.stegoInfo ? game.stegoInfo.box.w * 0.8 : stegoSize * 0.6;
    if (game.mode === 'bath') drawTub(ctx, W / 2 + 6 * U, standY + 6 * U, tubW, 'back');
    if (game.mode === 'drink') drawBowl(ctx, game.bowlX, standY + 4 * U, 72 * U, 1 - clamp(game.modeT / 2.6, 0, 1));
    // Hide and seek: far back he is drawn smaller and higher up (behind a hiding place).
    const hd = game.hide, depth = hd ? pet.depth : 0;
    const sy = lerp(standY, groundY + 76 * U, smooth(depth)), ss = stegoSize * lerp(1, hd ? hd.sMin : 1, smooth(depth));
    const season = seasonNow();
    if (treeHere()) drawXmasTree(ctx, sky.light, game.t);   // 0.7 holidays (20-holidays.js)
    if (hd && hd.phase === 'found') drawHideSpots(ctx);
    // The present waits where he stops: not shown on the way (it would stand still on the moving ground, 0.6.1).
    if (giftWaiting() && game.mode === 'idle' && !asleepNow() && !S.walk) { const gp = giftPos(); drawGift(ctx, gp.x, gp.y, U, game.t); }
    game.stegoInfo = drawStego(ctx, sx, sy, ss, look);
    if (hd && hd.phase !== 'found') drawHideSpots(ctx);
    if (game.visit) drawVisitor(ctx, game.visit, game.t);   // 0.8.1: every visitor in front of him
    if (holidayHere() && season.easter) drawEaster(ctx, game.t);
    if (treeHere() && season.gifts) drawXmasBoxes(ctx, game.t);
    drawForeground(ctx, placeId, game.t, sky.light, placeId === 'travel' ? walkFx.scroll : 0);   // grass, flowers ... in front of him (0.6; scrolls on the way since 0.6.1)
    drawGroundLife(ctx, placeId, game.t, sky, weather);
    if (game.mode === 'bath') {
      drawTub(ctx, W / 2 + 6 * U, standY + 6 * U, tubW, 'front');
      if (game.bath.phase === 'scrub' && S.needs.clean < 100) drawRubHint(game.stegoInfo.box);
    }
    if (game.ball) drawBall(ctx, game.ball.x, ballY(), BALL_R * U, game.ball.rot);
    if (game.flying) drawFood(ctx, game.flying.id, game.flying.x, game.flying.y, 46 * U);
  }
  drawWeather(ctx, weather, game.t);
  drawNightShade(ctx, sky);
  if (firefliesNow(t, placeId === 'travel' ? 'meadow' : placeId, weather)) drawFireflies(ctx, game.t);
  drawParts(ctx);

  // Thought bubble with what he needs most (awake, idle, in the game).
  if (hatched() && !asleepNow() && game.mode === 'idle' && game.trans >= 1 && game.stegoInfo) {
    const low = lowestNeed();
    if (low.value < NEED_LOW) { const h = game.stegoInfo.head; drawThought(ctx, h.x + 10 * U, h.y - 60 * U, low.need, game.t); }
  }
  ctx.restore();

  if (game.mode === 'train') drawTrainBoard(ctx);   // 0.8: the board is drawn without the camera
  // A photo shows the picture as it is now (no finger things, no flash).
  if (game.photoPending) capturePhoto();
  if (game.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + game.flash.toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }

  // Things that follow the finger are drawn without the camera.
  if (game.held) drawFood(ctx, game.held.id, game.held.x, game.held.y, 56 * U);
  if (game.mode === 'brush' && game.brush) drawBrush(ctx, game.brush.x, game.brush.y, 46 * U);
  if (game.screen === 'menu' && game.trans === 0) drawMenuHint();
}

/** Nest, egg, hearts of today's progress. */
function drawEggScene(sky) {
  const x = W / 2, y = standY, h = eggHeight();
  drawNest(ctx, x, y + 8 * U, 170 * U, 'back');
  const ph = eggPhase();
  let wob = eggFx.wobble;
  if (ph === 'hatchday' && game.mode !== 'hatch') wob += Math.sin(game.t * 9) * 0.03;
  drawEgg(ctx, x, y - 4 * U, h, S.egg.cracks, eggFx.glow, wob, game.t);
  drawNest(ctx, x, y + 8 * U, 170 * U, 'front');
  if (game.trans < 1 || game.mode === 'hatch') return;
  if (sky.night) {   // the egg sleeps too
    if (Math.random() < 0.02) addPart('zzz', x + 40 * U, y - h, { vx: 12 * U, vy: -30 * U, size: 6, max: 2.2 });
    return;
  }
  // Five hearts above the egg fill up with today's stroking.
  const p = eggProgress(), n = 5;
  for (let i = 0; i < n; i++) {
    const hx = x + (i - 2) * 34 * U, hy = y - h - 46 * U, fill = clamp(p * n - i, 0, 1);
    ctx.save(); ctx.globalAlpha = 0.35; drawIcon(ctx, 'love', hx, hy, 28 * U); ctx.restore();
    if (fill > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(hx - 14 * U, hy + 14 * U - 28 * U * fill, 28 * U, 28 * U * fill); ctx.clip();
      drawIcon(ctx, 'love', hx, hy, 28 * U); ctx.restore();
    }
  }
  if (ph !== 'done' && game.rubbing <= 0) drawRubHint({ x: x - 40 * U, y: y - h, w: 80 * U, h: h });
}

/** A hand swiping left and right: "stroke here". */
function drawRubHint(box) {
  const k = (Math.sin(game.t * 3) + 1) / 2;
  const x = box.x + box.w * lerp(0.3, 0.7, k), y = box.y + box.h * 0.45;
  ctx.save();
  ctx.globalAlpha = 0.55 + 0.25 * Math.sin(game.t * 6);
  drawHand(ctx, x, y, 34 * U);
  ctx.restore();
}

/** A simple pointing hand (finger up). */
function drawHand(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s / 40, s / 40);
  c.fillStyle = '#ffe0c2'; c.strokeStyle = '#8d6e63'; c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-4, -18); c.quadraticCurveTo(-4, -24, 0, -24); c.quadraticCurveTo(4, -24, 4, -18);
  c.lineTo(4, -4); c.lineTo(14, -2); c.quadraticCurveTo(18, 0, 16, 10); c.quadraticCurveTo(12, 20, 0, 20);
  c.quadraticCurveTo(-12, 20, -12, 8); c.lineTo(-12, -2); c.quadraticCurveTo(-12, -6, -4, -4); c.closePath();
  c.fill(); c.stroke();
  c.restore();
}

/** In the menu a pulsing ring invites to tap the stego / egg. */
function drawMenuHint() {
  const z = cameraZoom(), cc = camCenter();
  const r = (hatched() ? 120 : 95) * U * (1 + Math.sin(game.t * 3) * 0.05);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 + 0.25 * Math.sin(game.t * 3)).toFixed(2) + ')';
  ctx.lineWidth = 4 * U;
  ctx.setLineDash([10 * U, 12 * U]);
  ctx.lineDashOffset = -game.t * 20;
  ctx.beginPath(); ctx.arc(cc.x, cc.y + (standY - 60 * U - cc.y) * z, r, 0, TAU); ctx.stroke();
  ctx.restore();
}
