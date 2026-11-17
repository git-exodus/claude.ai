/*
 * Runtime state of the running battle (nothing here is saved) and the small
 * registries that weapons use to put things on the field: timers, zones,
 * effects, particles and floating texts.
 */

/*
 * Entity lists. Entries are plain objects; dead ones are filtered out at the
 * end of update() so code may push to these lists while iterating them.
 *   enemies      see spawnEnemy() in 07-enemies.js
 *   projectiles  see addProjectile() in 08-projectiles.js
 *   zones        lingering things with their own update: fields, orbiting swords, traps
 *   effects      pure visuals, drawn with their progress 0..1
 *   particles    little dots from puff()
 *   texts        floating damage numbers and level-up texts
 *   timers       delayed callbacks in game time (they pause with the game)
 *   soldiers     see 20-defenders.js
 */
const world = { enemies: [], projectiles: [], zones: [], effects: [], particles: [], texts: [], timers: [], soldiers: [] };

const castle = { hp: CASTLE_HP_TIERS[0], flash: 0, fallen: false };   // flash: seconds of hit feedback left

const combat = {
  cooldown: 0,        // seconds until the next attack is allowed
  cooldownMax: 1,     // cooldown that was started by the last attack (for the ring displays)
  attackCount: 0,     // attacks this session; drives "every n-th attack" abilities
  bowShots: 0,        // counts aimed arrows for the critical hit
  chainBooms: 0,      // chain explosions started this frame (capped per frame)
};

const combo = { count: 0, timer: 0, punch: 0 };   // kill streak; punch animates the counter

const wave = {
  queue: [],          // enemy types still to spawn
  total: 1,           // size of the wave, for the progress bar
  spawnGap: 1,        // seconds between two spawns
  spawnTimer: 0,
  pause: 1.5,         // breathing time before the first spawn
};

const session = {
  time: 0,            // game time in seconds
  shake: 0,           // screen shake strength, decays quickly
  paused: false,      // true while any overlay is open (see refreshPause in 32-menus.js)
  started: false,     // false until the first attack; hides the hint and gates vibration
  holdPoint: null,    // {x, y} while a finger rests on the field (auto-fire)
  soldierTimer: 2,
  archerTimers: [],   // seconds until each wall archer's next shot, see 20-defenders.js
  achievementTimer: 0,
  lastKillSound: 0,
  lastProgress: -1,   // last wave progress written to the DOM, to avoid redundant writes
};

/* Effects that can pile up at short cooldowns stop being added above these counts. */
const FX_CAP_COMMON = 160;
const FX_CAP_RARE = 219;
const PARTICLE_CAP = 260;
const TEXT_CAP = 40;

/** Runs `fn` after `delay` seconds of game time. */
function after(delay, fn) {
  world.timers.push({ t: delay, fn });
}

/**
 * Adds a lingering zone.
 *   spec.tag     optional name for zoneCount()/findZone()
 *   spec.dur     lifetime in seconds
 *   spec.under   draw below enemies (ground effects)
 *   spec.update  (zone, dt) called every frame while alive
 *   spec.draw    (zone) called every frame
 * Any other fields are private state of the zone. `zone.t` is its age.
 */
function addZone(spec) {
  const zone = Object.assign({ t: 0, under: false, update() {}, draw() {} }, spec);
  world.zones.push(zone);
  return zone;
}
const findZone = tag => world.zones.find(zone => zone.tag === tag);
function zoneCount(tag) {
  let n = 0;
  for (const zone of world.zones) if (zone.tag === tag) n++;
  return n;
}
/** Fade factor 0..1 for zones: quick fade in, fade out near the end. */
const zoneFade = (zone, inRate, outRate) => Math.min(1, zone.t * inRate, (zone.dur - zone.t) * outRate);

/**
 * Adds a visual effect; `draw(k)` gets the progress 0..1.
 * With `cap`, the effect is skipped while more than `cap` effects are alive.
 */
function addEffect(dur, draw, { under = false, cap = Infinity } = {}) {
  if (world.effects.length > cap) return;
  world.effects.push({ t: 0, dur, under, draw });
}

/** Burst of `count` particles. */
function puff(x, y, color, count) {
  for (let i = 0; i < count && world.particles.length < PARTICLE_CAP; i++) {
    const angle = rnd(TAU), speed = rnd(30, 140) * U;
    world.particles.push({
      x, y, vx: cos(angle) * speed, vy: sin(angle) * speed - 40 * U,
      life: rnd(0.3, 0.6), maxLife: 0.6, color, size: rnd(2, 5) * U,
    });
  }
}

/** Expanding ring; `rgb` is "r,g,b". */
function ring(x, y, radius, rgb, dur = 0.4, under = false) {
  addEffect(dur, k => {
    ctx.strokeStyle = `rgba(${rgb},${1 - k})`;
    ctx.lineWidth = (6 - 5 * k) * U;
    const r = radius * (0.3 + 0.7 * k);
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.8, 0, 0, TAU);
    ctx.stroke();
  }, { under, cap: FX_CAP_COMMON });
}

function floatText(x, y, text, color, big = false) {
  world.texts.push({ x, y, text, color, big, t: 0 });
}

/** Removes everything from the field. `all` also removes soldiers and visuals. */
function clearField(all) {
  world.enemies = [];
  world.projectiles = [];
  world.zones = [];
  world.timers = [];
  if (all) {
    world.soldiers = [];
    session.soldierTimer = 2;
  }
}
