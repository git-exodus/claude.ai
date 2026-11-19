/* 17-wardrobe.js – dressing up (0.3): presents on the days in WEAR_ITEMS, opening one puts the new
 * thing on; the wardrobe (hat button) shows all 12, presents not yet due as a wrapped box.
 * Some places add something automatically (sunglasses at the beach, a scarf in the snow), see PLACES.wear. */

/** Number of things whose day has come (by day of life). */
function wearUnlocked() { const d = lifeDay(now()); return WEAR_ITEMS.filter(w => w.day <= d).length; }
/** Is a present waiting to be opened? */
const giftWaiting = () => hatched() && S.giftSeen < wearUnlocked();

/** Where the present lies on the ground (to the right of him). */
function giftPos() {
  const box = game.stegoInfo ? game.stegoInfo.box : { x: W * 0.3, w: W * 0.4 };
  return { x: clamp(box.x + box.w + 34 * U, 40 * U, W - 40 * U), y: standY + 6 * U };
}

/** The present is tapped: open it, put the thing on. */
function openGift() {
  if (!giftWaiting()) return;
  const item = WEAR_ITEMS[S.giftSeen];
  S.giftSeen++;
  S.wear[item.slot] = item.id;
  save();
  sound('fanfare');
  const p = giftPos();
  for (let i = 0; i < 30; i++) addPart('confetti', p.x, p.y - 20 * U, { vx: rnd(-160, 160) * U, vy: rnd(-300, -120) * U, g: 500, color: ['#ff5c8a', '#ffcc33', '#5cc15a', '#3fa9f5', '#b388ff'][i % 5], size: 8, max: 1.6 });
  pet.jumpV = 200 * U; pet.giggleT = 1.2;
}

/** A wrapped box with a bow; bounces a little so the child notices it. */
function drawGift(c, x, y, s, t) {
  const b = Math.abs(Math.sin(t * 3)) * 6 * U;
  c.save(); c.translate(x, y - b);
  c.fillStyle = '#ff5c8a'; c.strokeStyle = '#a32757'; c.lineWidth = 2 * U;
  c.beginPath(); c.rect(-20 * s, -32 * s, 40 * s, 32 * s); c.fill(); c.stroke();
  c.fillStyle = '#ff7aa2'; c.beginPath(); c.rect(-23 * s, -40 * s, 46 * s, 10 * s); c.fill(); c.stroke();
  c.fillStyle = '#ffd54f'; c.fillRect(-4 * s, -40 * s, 8 * s, 40 * s);
  c.beginPath(); c.ellipse(-9 * s, -46 * s, 9 * s, 6 * s, -0.4, 0, TAU); c.ellipse(9 * s, -46 * s, 9 * s, 6 * s, 0.4, 0, TAU); c.fill();
  c.restore();
}

/** What he wears right now: his own things plus what a place adds to an empty slot. */
function wearNow() {
  const w = { ...S.wear }, pl = placeById(S.walk ? 'meadow' : S.place);
  if (pl.wear) for (const slot in pl.wear) if (!w[slot]) w[slot] = pl.wear[slot];
  return w;
}

/* ---------- wardrobe ---------- */

function openWardrobe() {
  if (!hatched()) return;
  sound('tap');
  const list = $('wearlist');
  list.innerHTML = WEAR_ITEMS.map((w, i) => '<button class="wtile' + (i < S.giftSeen ? '' : ' locked') + (S.wear[w.slot] === w.id ? ' on' : '') +
    '" id="wt-' + w.id + '" type="button" aria-label="Verkleiden"><canvas width="150" height="120"></canvas></button>').join('');
  WEAR_ITEMS.forEach((w, i) => {
    const el = $('wt-' + w.id), c = el.querySelector('canvas').getContext('2d');
    if (i < S.giftSeen) drawWearPreview(c, w, 150, 120); else { c.save(); c.scale(1.2, 1.2); drawGift(c, 62, 92, 1.1, 0); c.restore(); }
    el.addEventListener('click', () => {
      if (i >= S.giftSeen) { sound('refuse'); el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); return; }
      S.wear[w.slot] = S.wear[w.slot] === w.id ? null : w.id;   // tap again = take it off
      sound(S.wear[w.slot] ? 'happy' : 'tap');
      save();
      openWardrobe();
    });
  });
  $('wardrobe').hidden = false;
}
function closeWardrobe() { $('wardrobe').hidden = true; }

/** The head of a stego wearing one thing, centred in a w x h canvas. */
function drawWearPreview(c, item, w, h) {
  c.fillStyle = '#e8f4ff'; c.fillRect(0, 0, w, h);
  const o = { g: 0.6, stage: 2, t: 0.4, eyes: 'open', mouth: 'smile', wear: { [item.slot]: item.id } };
  // Draw once off-screen to find the head, then so that the head sits in the middle.
  const probe = drawStego(document.createElement('canvas').getContext('2d'), 0, 0, 560, o);
  drawStego(c, w * 0.5 - probe.head.x, h * 0.62 - probe.head.y, 560, o);
}
