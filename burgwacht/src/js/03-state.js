/*
 * Persistent state: the save game `S`, the two save slots and the options.
 *
 * `S` is always the same object. Loading a slot copies the slot's fields into
 * it, so other code (and the test hooks) can keep a reference to it.
 */

/** A brand-new save game. Every persistent field must be listed here. */
function blankSave() {
  const perWeapon = value => Object.fromEntries(WEAPON_IDS.map(id => [id, value]));
  return {
    lv: perWeapon(1),          // weapon levels
    xp: perWeapon(0),          // XP towards the next level
    forge: perWeapon(0),       // forge stages per weapon (lava world shop), +10 % damage each
    active: STARTER_WEAPON,    // weapon selected in the bar
    world: 'meadow',           // world being played, key of WORLDS
    wave: 1,                   // wave currently being played in that world
    cleared: 0,                // highest wave ever cleared there (the wave arrows go up to cleared + 1)
    parked: { wave: 1, cleared: 0 },   // wave and cleared of the OTHER world while it is not played
    gold: 0,
    heal: 1,                   // lives restored after each cleared wave (shop: 1..3)
    hold: false,               // "repeat this wave" toggle
    wall: 0,                   // wall tier, index into WALL_TIERS
    wallHp: 0,                 // current wall hit points; only refilled after a defeat
    solLv: 0,                  // soldier speed tier, index into SOLDIER_INTERVALS
    solCapLv: 0,               // "more soldiers" tiers bought, see SOLDIER_CAP_PRICES
    archers: 0,                // archers on the wall, see ARCHER_PRICES
    hpLv: 0,                   // castle lives tier, index into CASTLE_HP_TIERS
    goldLv: 0,                 // gold bonus tier, index into BONUS_TIERS
    xpLv: 0,                   // XP bonus tier, index into BONUS_TIERS
    // one-time purchases
    own: { sword: false, dagger: false, star: false, bow: false, wand: false, soldier: false, armor: false, knight: false },
    // things that last until the next defeat: chest boons (id -> times taken) and chests already opened ("world:wave")
    run: { boons: {}, chests: [] },
    hints: { waves: false, skills: false },   // one-time hints already shown: wave arrows (first defeat), abilities (wave 2)
    stats: { kills: 0, bosses: 0, bestCombo: 0, defeats: 0, goldEarned: 0 },
    ach: {},                   // achievement id -> true once rewarded
  };
}

const toCount = (value, max = 1e12) => clamp(Math.floor(+value || 0), 0, max);   // safe non-negative integer

/** Rebuilds a save from untrusted data (old versions, edited storage), clamping every field. */
function sanitizeSave(data) {
  const save = blankSave();
  if (!data) return save;
  for (const id of WEAPON_IDS) {
    save.lv[id] = clamp(data.lv?.[id] | 0 || 1, 1, MAX_LEVEL);
    save.xp[id] = +data.xp?.[id] || 0;
    save.forge[id] = toCount(data.forge?.[id], 9999);
  }
  save.gold = toCount(data.gold);
  save.heal = clamp(data.heal | 0 || 1, 1, 3);
  save.hold = !!data.hold;
  save.wall = toCount(data.wall, WALL_TIERS.length - 1);
  save.wallHp = toCount(data.wallHp, WALL_TIERS[save.wall]);
  save.solLv = toCount(data.solLv, SOLDIER_INTERVALS.length - 1);
  save.hpLv = toCount(data.hpLv, CASTLE_HP_TIERS.length - 1);
  save.goldLv = toCount(data.goldLv, BONUS_TIERS.length - 1);
  save.xpLv = toCount(data.xpLv, BONUS_TIERS.length - 1);
  for (const key in save.own) save.own[key] = !!data.own?.[key];
  // Until 0.7 everybody started with the sword, so older saves always own it.
  if (data.own && data.own.sword === undefined) save.own.sword = true;
  // 0.7 replaced the single "squad" upgrade by tiers and the tower archer by up to ten archers
  save.solCapLv = toCount(data.solCapLv ?? (data.own?.squad ? 1 : 0), SOLDIER_CAP_PRICES.length);
  save.archers = toCount(data.archers ?? (data.own?.tower ? 1 : 0), ARCHER_PRICES.length);

  save.world = WORLDS[data.world] ? data.world : 'meadow';
  save.cleared = toCount(data.cleared);
  save.wave = clamp(data.wave | 0 || 1, 1, save.cleared + 1);
  save.parked.cleared = toCount(data.parked?.cleared);
  save.parked.wave = clamp(data.parked?.wave | 0 || 1, 1, save.parked.cleared + 1);
  if (data.active === STARTER_WEAPON || save.own[data.active]) save.active = data.active;

  for (const id in data.run?.boons || {}) save.run.boons[id] = toCount(data.run.boons[id], 99);
  if (Array.isArray(data.run?.chests)) save.run.chests = data.run.chests.filter(key => typeof key === 'string').slice(0, 500);
  save.hints.waves = !!data.hints?.waves;
  save.hints.skills = !!data.hints?.skills;
  for (const key in save.stats) save.stats[key] = toCount(data.stats?.[key]);
  for (const id in data.ach || {}) if (data.ach[id]) save.ach[id] = true;
  return save;
}

const S = blankSave();
const DB = { slots: [null, null], opts: { mute: false, music: true, vib: true, speed: 1 } };
let slot = -1;   // index of the slot being played, -1 while in the main menu

/** Reads slots and options from localStorage; storage may be unavailable, then defaults stay. */
function loadDatabase() {
  try {
    const stored = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (stored) {
      DB.slots = [0, 1].map(i => (stored.slots?.[i] ? sanitizeSave(stored.slots[i]) : null));
      DB.opts.mute = !!stored.opts?.mute;
      DB.opts.vib = stored.opts?.vib !== false;
      DB.opts.music = stored.opts?.music !== false;
      DB.opts.speed = stored.opts?.speed === 2 ? 2 : 1;
    } else {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_SAVE_KEY) || 'null');
      if (legacy) DB.slots[0] = sanitizeSave(legacy);
    }
  } catch (e) { /* private mode or blocked storage: play without saving */ }
}
loadDatabase();

/** Writes the running game into its slot and everything to localStorage. */
function save() {
  if (slot >= 0) DB.slots[slot] = JSON.parse(JSON.stringify(S));
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(DB)); } catch (e) { /* see loadDatabase */ }
}

/** Copies a slot (or a blank save) into `S`. */
function loadSlotIntoState(index, fresh) {
  const data = fresh || !DB.slots[index] ? blankSave() : sanitizeSave(DB.slots[index]);
  for (const key in data) S[key] = data[key];
  slot = index;
}

/* ---------- Values derived from the save ---------- */

const owned = id => id === STARTER_WEAPON || S.own[id];
const currentWorld = () => WORLDS[S.world];

/** Highest meadow wave cleared, no matter which world is being played. */
const meadowCleared = () => (S.world === 'meadow' ? S.cleared : S.parked.cleared);
const lavaUnlocked = () => meadowCleared() >= LAVA_UNLOCK_WAVE;

/** Multiplier from chest boons taken this run: `step` per boon, e.g. 1.25 -> x1.25, x1.56, ... */
const boonFactor = (id, step) => Math.pow(step, S.run.boons[id] || 0);

/** Damage of one basic hit of the weapon: level, forge stages and the damage boon. */
function damageOf(id) {
  const byLevel = WEAPONS[id].baseDamage * (1 + 0.09 * (S.lv[id] - 1));
  return byLevel * (1 + 0.1 * S.forge[id]) * boonFactor('damage', 1.25);
}

/** Seconds between attacks; shrinks linearly until ABILITY_CAP and stays there. The speed boon shortens it. */
function cooldownOf(id) {
  const [slow, fast] = WEAPONS[id].cooldown;
  const progress = (Math.min(S.lv[id], ABILITY_CAP) - 1) / (ABILITY_CAP - 1);
  return Math.max(0.1, (slow - (slow - fast) * progress) * boonFactor('speed', 0.8));
}

/** Next milestone level above the weapon's current level, or undefined. */
const nextMilestone = id => Object.keys(WEAPONS[id].milestones).map(Number).find(level => level > S.lv[id]);

const wallMax = () => WALL_TIERS[S.wall];
const maxHp = () => CASTLE_HP_TIERS[S.hpLv];
const soldierCap = () => SOLDIER_CAP_BASE + SOLDIER_CAP_STEP * S.solCapLv;
const soldierHp = () => SOLDIER_HP[+S.own.armor];
const goldFactor = () => BONUS_TIERS[S.goldLv] * boonFactor('gold', 1.5);
const xpFactor = () => XP_GAIN * BONUS_TIERS[S.xpLv] * boonFactor('xp', 1.5);
