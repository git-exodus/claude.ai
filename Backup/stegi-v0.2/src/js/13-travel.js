/* 13-travel.js – walking to new places (0.2), the places list and the fireflies.
 * A walk takes WALK_SECONDS of awake time and goes on while the app is closed (tick() in 04-state
 * adds the time, arrive() picks the place). He stops at a new place and waits there; the find is
 * celebrated the next time the child looks (S.newPlace). */

/** Pixels walked on screen (only for the scrolling landscape). */
const walkFx = { scroll: 0 };

const isFound = id => S.found.some(f => f.id === id);
const undiscovered = () => PLACES.filter(p => !isFound(p.id));
/** New places found today (the start meadow does not count). */
function foundToday() { const d = dayIndex(now()); return S.found.filter(f => f.day === d).length; }
/** Today's limit of new places reached (only matters while there is still something to find). */
const walkLimitReached = () => undiscovered().length > 0 && foundToday() >= WALK_PER_DAY;

/** The "Wandern" button. */
function startWalk() {
  if (!hatched() || asleepNow() || S.walk || game.mode !== 'idle') return;
  sound('tap');
  if (walkLimitReached()) { refuse(); return; }   // tired feet: two new places a day are enough
  S.walk = { sec: 0 };
  S.poops = [];   // poops stay behind at the old place
  sound('happy');
  save();
  refreshUI();
}

/** He reaches a place (called from tick, also while the app was closed). */
function arrive(t) {
  const und = undiscovered();
  let id;
  if (und.length) {
    id = und[Math.floor(Math.random() * und.length)].id;
    S.found.push({ id, day: dayIndex(t) });
    S.newPlace = id;
  } else {
    const others = S.found.filter(f => f.id !== S.place);
    id = others.length ? others[Math.floor(Math.random() * others.length)].id : S.place;
  }
  S.place = id;
  S.walk = null;
  save();
}

/** Jump to a place already found (tap in the places list). Stops a walk under way. */
function goPlace(id) {
  if (!isFound(id) || !hatched()) return;
  S.place = id; S.walk = null;
  sound('happy');
  save();
  closePlaces();
  refreshUI();
}

/** Every frame while in the game: scroll while walking, celebrate a new find. */
function updateTravel(dt, sleeping) {
  if (S.walk && !sleeping && game.mode === 'idle') walkFx.scroll += 38 * U * dt;
  if (S.newPlace && !sleeping && game.mode === 'idle' && game.screen === 'game' && game.trans >= 1) {
    const id = S.newPlace;
    S.newPlace = null;
    save();
    startParty();
    showBanner(id);
  }
}

/** Is he walking right now (legs moving)? */
const walkingNow = () => !!S.walk && !asleepNow() && game.mode === 'idle';

/* ---------- banner "new place" ---------- */

let bannerTimer = 0;
function showBanner(id) {
  const b = $('banner');
  const pic = placePicture(id, 240, 135);
  const cv2 = b.querySelector('canvas');
  cv2.getContext('2d').drawImage(pic, 0, 0);
  b.querySelector('b').textContent = placeById(id).name;
  b.hidden = false;
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { b.hidden = true; }, 4000);
}

/* ---------- places list ---------- */

function openPlaces() {
  if (!hatched()) return;
  sound('tap');
  const list = $('placelist');
  list.innerHTML = PLACES.map(p => '<button class="ptile' + (isFound(p.id) ? '' : ' locked') + (p.id === S.place && !S.walk ? ' here' : '') +
    '" id="pt-' + p.id + '" type="button" aria-label="' + (isFound(p.id) ? p.name : 'Noch nicht entdeckt') + '">' +
    (isFound(p.id) ? '<canvas width="160" height="100"></canvas><span>' + p.name + '</span>' : '<i>?</i>') + '</button>').join('');
  for (const p of PLACES) {
    const el = $('pt-' + p.id);
    if (isFound(p.id)) el.querySelector('canvas').getContext('2d').drawImage(placePicture(p.id, 160, 100), 0, 0);
    el.addEventListener('click', () => { if (isFound(p.id)) goPlace(p.id); else { sound('refuse'); el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); } });
  }
  $('placecount').textContent = S.found.length + ' von ' + PLACES.length + ' entdeckt';
  $('places').hidden = false;
}
function closePlaces() { $('places').hidden = true; }

/* ---------- fireflies ---------- */

/** Fireflies glow from the evening (an hour before bedtime) through the night: always at forest and
 *  water places, elsewhere every other night. Not in rain or snow, not in the cave. */
function firefliesNow(t, placeId, weather) {
  const pl = placeById(placeId);
  if (pl.indoor || weather === 'rain' || weather === 'snow') return false;
  const evening = inWindow(minuteOfDay(t), (S.opts.sleep - 60 + 1440) % 1440, S.opts.wake);
  return evening && (pl.ff || dayIndex(t) % 2 === 0);
}

function drawFireflies(c, time) {
  for (let i = 0; i < 16; i++) {
    const ph = i * 1.7, x = W * (0.05 + 0.9 * ((i * 0.618) % 1)) + Math.sin(time * 0.5 + ph) * 40 * U;
    const y = lerp(groundY - 90 * U, H - 120 * U, (i * 0.381) % 1) + Math.sin(time * 0.8 + ph * 2) * 25 * U;
    const glow = Math.max(0, Math.sin(time * 1.6 + ph * 3));
    if (glow < 0.05) continue;
    const g = c.createRadialGradient(x, y, 0, x, y, 12 * U);
    g.addColorStop(0, 'rgba(230,255,140,' + (0.9 * glow).toFixed(2) + ')'); g.addColorStop(1, 'rgba(230,255,140,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, 12 * U, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,210,' + glow.toFixed(2) + ')'; c.beginPath(); c.arc(x, y, 2 * U, 0, TAU); c.fill();
  }
}
