/* 04-state.js – the saved game S, loading/saving, and the passing of real time (tick).
 * S is always the same object; loading copies fields into it. */

/** A fresh game: an egg in the nest. t = creation time. */
function blankSave(t) {
  return {
    v: 1,
    name: 'Stegi',
    created: t,
    // Egg: petSec = seconds stroked on petDay; cracks 0..3; crackDay = day of the last crack;
    // hatchSec = stroking on hatch day.
    egg: { petDay: -1, petSec: 0, cracks: 0, crackDay: -1, hatchSec: 0 },
    hatchDay: null,          // day number of hatching (null = still an egg)
    needs: { food: START_NEEDS, drink: START_NEEDS, love: START_NEEDS, fun: START_NEEDS, clean: START_NEEDS },
    last: t,                 // time up to which needs have been updated
    meals: 0,                // food pieces since the last poop
    poopAt: 0,               // time when the next poop appears (0 = none due)
    poops: [],               // poops lying around: { x } as fraction of screen width (0..1)
    bedAt: 0,                // time of "lights out" in the sleepy half hour (0 = not put to bed)
    teethDay: -1,            // day the teeth were brushed last
    stageSeen: 0,            // highest growth stage already celebrated
    playDay: -1, playSec: 0, // play time today (for the parents' daily limit)
    opts: { sound: true, music: true, sleep: SLEEP_DEFAULT, wake: WAKE_DEFAULT, limit: 0 },
    // Places (0.2): where he is, what was found on which day (-1 = start), the walk under way, a find not yet celebrated.
    place: 'meadow',
    found: [{ id: 'meadow', day: -1 }],
    walk: null,              // { sec } awake seconds walked so far, or null
    newPlace: null,          // id of a place reached but not yet celebrated
  };
}

let S = blankSave(Date.now());

/** Number in [a, b] or the fallback. */
const num = (v, a, b, fb) => (typeof v === 'number' && isFinite(v) ? clamp(v, a, b) : fb);

/** Checks every field of a loaded save; missing or broken fields get defaults.
 *  Old saves must always keep loading – add new fields here with a default. */
function sanitizeSave(o, t) {
  const b = blankSave(t);
  if (!o || typeof o !== 'object') return b;
  const e = o.egg || {};
  b.name = typeof o.name === 'string' && o.name.trim() ? o.name.trim().slice(0, 12) : b.name;
  b.created = num(o.created, 0, 1e14, t);
  b.egg = {
    petDay: num(e.petDay, -1, 1e6, -1), petSec: num(e.petSec, 0, 1e5, 0),
    cracks: Math.round(num(e.cracks, 0, EGG.cracks, 0)), crackDay: num(e.crackDay, -1, 1e6, -1),
    hatchSec: num(e.hatchSec, 0, 1e5, 0),
  };
  b.hatchDay = typeof o.hatchDay === 'number' && isFinite(o.hatchDay) ? o.hatchDay : null;
  for (const n of NEEDS) b.needs[n] = num(o.needs && o.needs[n], 0, 100, START_NEEDS);
  b.last = num(o.last, 0, 1e14, t);
  b.meals = Math.round(num(o.meals, 0, 100, 0));
  b.poopAt = num(o.poopAt, 0, 1e14, 0);
  b.poops = Array.isArray(o.poops) ? o.poops.filter(p => p && typeof p.x === 'number').slice(0, POOP.max)
    .map(p => ({ x: clamp(p.x, 0.05, 0.95) })) : [];
  b.bedAt = num(o.bedAt, 0, 1e14, 0);
  b.teethDay = num(o.teethDay, -1, 1e6, -1);
  b.stageSeen = Math.round(num(o.stageSeen, 0, STAGES.length - 1, 0));
  b.playDay = num(o.playDay, -1, 1e6, -1);
  b.playSec = num(o.playSec, 0, 1e6, 0);
  const op = o.opts || {};
  b.opts = {
    sound: op.sound !== false, music: op.music !== false,
    sleep: SLEEP_CHOICES.includes(op.sleep) ? op.sleep : SLEEP_DEFAULT,
    wake: WAKE_CHOICES.includes(op.wake) ? op.wake : WAKE_DEFAULT,
    limit: LIMIT_CHOICES.includes(op.limit) ? op.limit : 0,
  };
  const ids = PLACES.map(p => p.id);
  if (Array.isArray(o.found)) {
    const seen = new Set();
    b.found = o.found.filter(f => f && ids.includes(f.id) && !seen.has(f.id) && seen.add(f.id))
      .map(f => ({ id: f.id, day: num(f.day, -1, 1e6, -1) }));
    if (!seen.has('meadow')) b.found.unshift({ id: 'meadow', day: -1 });
  }
  b.place = b.found.some(f => f.id === o.place) ? o.place : 'meadow';
  b.walk = o.walk && typeof o.walk.sec === 'number' ? { sec: num(o.walk.sec, 0, WALK_SECONDS, 0) } : null;
  b.newPlace = b.found.some(f => f.id === o.newPlace) ? o.newPlace : null;
  return b;
}

/** Loads S from localStorage (or starts a new egg). */
function loadGame() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { raw = null; }
  Object.assign(S, sanitizeSave(raw, now()));
}

/** Writes S to localStorage. Ignores errors (private mode, full storage). */
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* not saved */ }
}

/** "Alles zurücksetzen": everything back to a new egg, settings included. */
function resetAll() {
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, blankSave(now()));
  save();
}

const hatched = () => S.hatchDay !== null;

/** Day since hatching, hatch day = 1. */
function lifeDay(t) { return hatched() ? dayIndex(t) - S.hatchDay + 1 : 0; }

/** Growth stage index 0..4 (see STAGES). */
function stageAt(t) {
  const d = lifeDay(t);
  let i = 0;
  while (i + 1 < STAGES.length && d >= STAGES[i + 1].day) i++;
  return i;
}

/** Growth 0 (hatch day) .. 1 (GROWN_DAY and later), grows a bit every day. */
function growthAt(t) { return clamp((lifeDay(t) - 1) / (GROWN_DAY - 1), 0, 1); }

/** Lowest need and its value. */
function lowestNeed() {
  let best = NEEDS[0];
  for (const n of NEEDS) if (S.needs[n] < S.needs[best]) best = n;
  return { need: best, value: S.needs[best] };
}

/** Adds to a need, kept within 0..100. */
function addNeed(n, v) { S.needs[n] = clamp(S.needs[n] + v, 0, 100); }

/**
 * Lets real time pass up to t (called every frame and after the app was closed):
 * needs drop during awake time, a due poop appears. Night time does not count.
 * If the clock went backwards (time zone, manual change), nothing happens.
 */
function tick(t) {
  if (t <= S.last) { S.last = Math.min(S.last, t); return; }
  if (!hatched()) { S.last = t; return; }
  const sec = awakeSeconds(S.last, t);
  for (const n of NEEDS) {
    let rate = 100 / (NEED_HOURS[n] * 3600);
    if (n === 'clean') rate *= 1 + S.poops.length;
    S.needs[n] = clamp(S.needs[n] - rate * sec, 0, 100);
  }
  if (S.poopAt && t >= S.poopAt) {
    S.poopAt = 0;
    S.meals = 0;
    // While walking he leaves it behind on the way (it never shows up).
    if (!S.walk && S.poops.length < POOP.max) { S.poops.push({ x: newPoopX() }); onPoop(); }
  }
  if (S.walk) {
    S.walk.sec += sec;
    if (S.walk.sec >= WALK_SECONDS) arrive(t);
  }
  if (S.bedAt && !isSleepy(t) && !isNight(t)) S.bedAt = 0;  // the morning after: forget "lights out"
  S.last = t;
}

/** A free spot on the ground for a new poop, away from the middle where the stego stands. */
function newPoopX() {
  for (let i = 0; i < 20; i++) {
    const x = Math.random() < 0.5 ? rnd(0.1, 0.3) : rnd(0.7, 0.9);
    if (S.poops.every(p => Math.abs(p.x - x) > 0.09)) return x;
  }
  return rnd(0.1, 0.9);
}

/** Counts a meal; every POOP.meals meals a poop is scheduled. */
function countMeal() {
  S.meals++;
  if (S.meals >= POOP.meals && !S.poopAt) S.poopAt = now() + POOP.delayMin * 60000;
}

/** Play time for the parents' limit: adds seconds and tells whether today's limit is used up. */
function addPlayTime(sec) {
  const d = dayIndex(now());
  if (S.playDay !== d) { S.playDay = d; S.playSec = 0; }
  S.playSec += sec;
  return limitReached();
}
function limitReached() {
  return S.opts.limit > 0 && S.playDay === dayIndex(now()) && S.playSec >= S.opts.limit * 60;
}
