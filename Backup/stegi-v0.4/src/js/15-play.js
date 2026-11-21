/* 15-play.js – the two new games of 0.3: hide and seek, and making music while he dances.
 * Both are modes like 'ball' (game.mode 'hide' / 'music'), started from the play menu. */

/* ---------- hide and seek ---------- */

/** The three hiding places (screen positions, size). Kind: 0 bush, 1 berry bush, 2 rock. */
function hideSpots() {
  return [0.2, 0.5, 0.8].map((fx, i) => ({ x: W * fx, y: groundY + 78 * U, kind: i }));
}

/** Starts a round: he runs to a random hiding place (not the last one) and gets small behind it. */
function hideRound() {
  const h = game.hide;
  let spot;
  do spot = Math.floor(Math.random() * 3); while (spot === h.spot);
  h.spot = spot; h.phase = 'hiding'; h.t = 0; h.hint = 5;
  pet.tx = hideSpots()[spot].x - W / 2;
}

function startHide() {
  const box = game.stegoInfo ? game.stegoInfo.box : { w: 200 * U, h: 120 * U };
  // Scale so that he fits completely behind a hiding place.
  game.hide = { phase: 'hiding', spot: -1, t: 0, hint: 5, wiggle: [0, 0, 0], sMin: Math.min(0.9, 110 * U / box.w, 60 * U / box.h) };
  pet.depth = 0;
  hideRound();
}

function updateHide(dt) {
  const h = game.hide;
  if (!h) return;
  h.t += dt;
  h.wiggle = h.wiggle.map(v => Math.max(0, v - dt));
  const target = h.phase === 'hiding' || h.phase === 'seek' ? 1 : h.phase === 'found' ? 1 : 0;
  pet.depth = clamp(pet.depth + Math.sign(target - pet.depth) * dt * 1.1, 0, 1);
  if (h.phase === 'hiding' && pet.depth >= 1 && !pet.moving) { h.phase = 'seek'; h.t = 0; }
  else if (h.phase === 'seek' && h.t > h.hint) {
    // Hint: his hiding place shakes and he giggles.
    h.hint = h.t + 4; h.wiggle[h.spot] = 0.6; sound('giggle');
  } else if (h.phase === 'found' && h.t > 1.4) { h.phase = 'back'; h.t = 0; pet.tx = 0; }
  else if (h.phase === 'back' && pet.depth <= 0 && !pet.moving && h.t > 0.6) hideRound();
}

/** A hiding place was tapped. */
function hideTap(i) {
  const h = game.hide;
  if (!h || h.phase !== 'seek') return;
  if (i === h.spot) {
    h.phase = 'found'; h.t = 0;
    addNeed('fun', HIDE_FUN); save();
    pet.jumpV = 220 * U; pet.giggleT = 1.2;
    sound('giggle'); sound('sparkle');
    const sp = hideSpots()[i];
    for (let k = 0; k < 12; k++) addPart('star', sp.x + rnd(-50, 50) * U, sp.y - rnd(20, 90) * U, { size: 8 });
  } else {
    h.wiggle[i] = 0.5;
    sound('nope');
  }
}

/** Index of the hiding place at screen point (x, y), or -1. */
function hideSpotAt(x, y) {
  return hideSpots().findIndex(s => Math.abs(x - s.x) < 75 * U && y > s.y - 110 * U && y < s.y + 25 * U);
}

/** Draws the three hiding places (wiggling when tapped wrong or as a hint). */
function drawHideSpots(c) {
  const env = { d: k => k, L: 1 };
  hideSpots().forEach((s, i) => {
    const wig = game.hide.wiggle[i] > 0 ? Math.sin(game.t * 40) * 4 * U : 0;
    if (s.kind === 2) pRock(c, env, s.x + wig, s.y, 2.8, '#9e9e9e');
    else pBush(c, env, s.x + wig, s.y, 1.9, s.kind ? '#3f8f3a' : '#4f9a3c', s.kind ? '#e53935' : null);
  });
}

/* ---------- music ---------- */

/** A key of the music pad: 0..5 xylophone bars, 6 big drum, 7 small drum. He dances to it. */
function playKey(i) {
  if (game.mode !== 'music') return;
  if (i < 6) sound('xylo', i); else sound('drum', i - 6);
  addNeed('fun', MUSIC_FUN);
  pet.danceT = 1.1;
  pet.dir = -pet.dir;
  if (pet.jump === 0) pet.jumpV = (i >= 6 ? 190 : 140) * U;
  const h = game.stegoInfo ? game.stegoInfo.head : { x: W / 2, y: standY - 100 * U };
  addPart('note', h.x + rnd(-40, 40) * U, h.y - 40 * U, { vy: -60 * U, size: 9, color: ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#6d4c41', '#6d4c41'][i], max: 1.6 });
}
