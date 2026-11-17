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
    active: 'sword',           // weapon selected in the bar
    wave: 1,                   // wave currently being played
    cleared: 0,                // highest wave ever cleared (limits the wave arrows, pays gold once)
    gold: 0,
    heal: 1,                   // lives restored after each cleared wave (shop: 1..3)
    hold: false,               // "repeat this wave" toggle
    wall: 0,                   // wall tier, index into WALL_TIERS
    wallHp: 0,                 // current wall hit points; only refilled after a defeat
    solLv: 0,                  // soldier speed tier, index into SOLDIER_INTERVALS
    own: { dagger: false, star: false, bow: false, wand: false, soldier: false },
  };
}

/** Rebuilds a save from untrusted data (old versions, edited storage), clamping every field. */
function sanitizeSave(data) {
  const save = blankSave();
  if (!data) return save;
  for (const id of WEAPON_IDS) {
    save.lv[id] = clamp(data.lv?.[id] | 0 || 1, 1, MAX_LEVEL);
    save.xp[id] = +data.xp?.[id] || 0;
  }
  save.gold = Math.max(0, data.gold | 0);
  save.cleared = Math.max(0, data.cleared | 0);
  save.heal = clamp(data.heal | 0 || 1, 1, 3);
  save.hold = !!data.hold;
  save.wall = clamp(data.wall | 0, 0, WALL_TIERS.length - 1);
  save.wallHp = clamp(data.wallHp | 0, 0, WALL_TIERS[save.wall]);
  save.solLv = clamp(data.solLv | 0, 0, SOLDIER_INTERVALS.length - 1);
  for (const key in save.own) save.own[key] = !!data.own?.[key];
  save.wave = clamp(data.wave | 0 || 1, 1, save.cleared + 1);
  if (data.active === 'sword' || save.own[data.active]) save.active = data.active;
  return save;
}

const S = blankSave();
const DB = { slots: [null, null], opts: { mute: false, vib: true, speed: 1 } };
let slot = -1;   // index of the slot being played, -1 while in the main menu

/** Reads slots and options from localStorage; storage may be unavailable, then defaults stay. */
function loadDatabase() {
  try {
    const stored = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (stored) {
      DB.slots = [0, 1].map(i => (stored.slots?.[i] ? sanitizeSave(stored.slots[i]) : null));
      DB.opts.mute = !!stored.opts?.mute;
      DB.opts.vib = stored.opts?.vib !== false;
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

const owned = id => id === 'sword' || S.own[id];

/** Damage of one basic hit of the weapon at its current level. */
const damageOf = id => WEAPONS[id].baseDamage * (1 + 0.09 * (S.lv[id] - 1));

/** Seconds between attacks; shrinks linearly until ABILITY_CAP and stays there. */
function cooldownOf(id) {
  const [slow, fast] = WEAPONS[id].cooldown;
  const progress = (Math.min(S.lv[id], ABILITY_CAP) - 1) / (ABILITY_CAP - 1);
  return slow - (slow - fast) * progress;
}

/** Next milestone level above the weapon's current level, or undefined. */
const nextMilestone = id => Object.keys(WEAPONS[id].milestones).map(Number).find(level => level > S.lv[id]);

const wallMax = () => WALL_TIERS[S.wall];
