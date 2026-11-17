/*
 * Game data and balance numbers. Nothing in here has side effects, so this is
 * the place to tune the game.
 */

const VERSION = '0.6.1';
const SAVE_KEY = 'burgwacht-v3';
const LEGACY_SAVE_KEY = 'burgwacht-v2';   // single-save format from before the start menu

/*
 * Weapon levels. MAX_LEVEL is the only number to change when the cap is raised
 * (1000 is planned). New abilities only exist up to ABILITY_CAP; above it only
 * damage keeps growing and the cooldown stays at its ABILITY_CAP value.
 */
const MAX_LEVEL = 100;
const ABILITY_CAP = 100;

const CASTLE_HP_TIERS = [10, 12, 15];    // castle lives per shop tier
const BONUS_TIERS = [1, 1.25, 1.5];      // gold and XP multiplier per shop tier
const CASTLE_SCALE = 0.6;          // castle and enemies are drawn at 60 % of their design size
const WALL_TIERS = [0, 3, 5, 10, 25];   // wall hit points per shop tier (index = tier)
const SOLDIER_INTERVALS = [5, 4, 3];    // seconds between soldiers per shop tier
const SOLDIER_CAP = [4, 6];              // soldiers on the field without / with the "squad" upgrade
const SOLDIER_HP = [3, 5];               // hits a soldier survives without / with armour
const MAX_ENEMIES_ALIVE = 260;     // further enemies wait off-screen until there is room

/*
 * Weapons, in the order of the weapon bar.
 *   price        gold needed in the shop (the sword is owned from the start)
 *   baseDamage   damage of one basic hit at level 1
 *   cooldown     [seconds at level 1, seconds at ABILITY_CAP], linear in between
 *   milestones   level -> name of the ability unlocked there; abilities stack
 *   aimLine      weapons thrown from the castle: show a dashed aiming line while the finger is down
 * The attack code lives in 10-weapon-*.js and is attached as WEAPONS[id].attack.
 */
const WEAPONS = {
  sword: {
    name: 'Schwert', price: 0, baseDamage: 10, cooldown: [3.5, 0.5], baseAbility: 'Schwerthieb',
    milestones: { 5: 'Doppelschwert', 10: 'Dreier-Fächer', 15: 'Echo-Hieb', 25: 'Kreisende Schwerter', 30: 'Klingenwelle', 40: 'Geisterschwert', 50: 'Riesenschwert', 60: 'Schwertsplitter', 70: 'Zeitriss', 80: 'Spiegelhieb', 90: 'Kettenblitz', 100: 'Schwertregen' },
  },
  dagger: {
    name: 'Dolche', price: 5, baseDamage: 9, cooldown: [2, 0.3], baseAbility: 'Wurfdolch', aimLine: true,
    milestones: { 5: 'Dolchfächer', 10: 'Abpraller', 15: 'Durchbohren', 25: 'Ansteckendes Gift', 30: 'Schattenklon', 40: 'Splitterdolche', 50: 'Bumerang', 60: 'Giftwolke', 70: 'Dolchfallen', 80: 'Zielsuchend', 90: 'Dolchwirbel', 100: 'Kettenreaktion' },
  },
  star: {
    name: 'Morgenstern', price: 10, baseDamage: 16, cooldown: [5, 1], baseAbility: 'Flächenschlag',
    milestones: { 5: 'Schockwelle', 10: 'Rollende Kugel', 15: 'Betäubung', 25: 'Stachelhagel', 30: 'Nachbeben', 40: 'Brennender Boden', 50: 'Kettenschwung', 60: 'Schwarzes Loch', 70: 'Kugelsplitter', 80: 'Erdspalte', 90: 'Zwillingsstern', 100: 'Meteor' },
  },
  bow: {
    name: 'Bogen', price: 40, baseDamage: 14, cooldown: [2.5, 0.4], baseAbility: 'Pfeilschuss', aimLine: true,
    milestones: { 5: 'Doppelpfeil', 10: 'Durchschuss', 15: 'Kritischer Treffer', 25: 'Brandpfeil', 30: 'Pfeilfächer', 40: 'Explosivpfeil', 50: 'Pfeilhagel', 60: 'Querschläger', 70: 'Frostpfeil', 80: 'Geisterschütze', 90: 'Riesenpfeil', 100: 'Pfeilsturm' },
  },
  wand: {
    name: 'Feuerstab', price: 75, baseDamage: 12, cooldown: [4, 0.8], baseAbility: 'Feuerball',
    milestones: { 5: 'Brand', 10: 'Zwei Feuerbälle', 15: 'Feuerspur', 25: 'Kettenexplosion', 30: 'Flammenwand', 40: 'Feuergeist', 50: 'Lavabecken', 60: 'Phönix', 70: 'Glutregen', 80: 'Feuertornado', 90: 'Sonnenstrahl', 100: 'Supernova' },
  },
};
const WEAPON_IDS = Object.keys(WEAPONS);

/*
 * XP needed to go from `level` to `level + 1`.
 * Tuned together with the flat XP per enemy below so that the weapon used all
 * the time is roughly level 4 / 8 / 15 / 22 / 40 / 80 after wave 5 / 10 / 20 /
 * 30 / 50 / 100 of a first playthrough. The power law keeps working for
 * levels far beyond 100.
 */
const xpNeeded = level => Math.round(4 + 6.4 * Math.pow(level, 1.4));

/*
 * Enemy types. r/hp/sp/xp are the base values (radius in U before CASTLE_SCALE,
 * speed in U per second); worlds and waves scale them, see WORLDS below.
 *   shielded  projectile hits only deal SHIELD_BLOCK of their damage; area damage is unaffected
 *   ranged    stops at ARCHER_RANGE and shoots the castle instead of walking into it
 */
const ENEMY_TYPES = {
  slime:  { r: 13, hp: 10, sp: 20, xp: 1, color: '#59c36a' },
  bat:    { r: 10, hp: 6, sp: 38, xp: 1, color: '#9a6bd6' },
  ogre:   { r: 19, hp: 42, sp: 13, xp: 3, color: '#4f9aa8' },
  shield: { r: 14, hp: 26, sp: 16, xp: 2, color: '#8793b8', shielded: true },
  archer: { r: 11, hp: 12, sp: 22, xp: 2, color: '#c9787f', ranged: true },
  boss:   { r: 30, hp: 260, sp: 9, xp: 20, color: '#e07a3f' },
};
const BOSS_EVERY = 5;        // a boss joins every 5th wave
const SHIELD_BLOCK = 0.25;   // share of projectile damage that gets through a shield
const ARCHER_RANGE = 105;    // distance from the castle (in U) at which archers stop
const ARCHER_INTERVAL = 4;   // seconds between an archer's shots
const EASY_WAVES = 3;        // the first waves of the meadow get EASY_HP_CUT less hit points
const EASY_HP_CUT = 2;
/*
 * On top of that, meadow enemies start with EARLY_HP_DISCOUNT less hit points
 * in wave 1; the discount shrinks linearly and is gone from EARLY_HP_UNTIL on.
 */
const EARLY_HP_DISCOUNT = 0.3;
const EARLY_HP_UNTIL = 10;
const earlyHpFactor = waveNo => 1 - EARLY_HP_DISCOUNT * Math.max(0, EARLY_HP_UNTIL - waveNo) / (EARLY_HP_UNTIL - 1);

/** Number of regular enemies in a wave: +3 per wave up to 5, +5 to 15, +10 to 30, +15 to 50, +20 after. */
function waveCount(waveNo) {
  let n = 8;
  for (let i = 2; i <= waveNo; i++) n += i <= 5 ? 3 : i <= 15 ? 5 : i <= 30 ? 10 : i <= 50 ? 15 : 20;
  return n;
}
const enemyHpFactor = waveNo => 1 + 0.22 * (waveNo - 1) + 0.015 * (waveNo - 1) * (waveNo - 1);
const enemySpeedFactor = waveNo => 1 + Math.min(0.5, waveNo * 0.02);
/** Seconds between two spawns: a wave takes at most ~80 s to enter the field. */
const spawnGapFor = count => clamp(Math.min(80, 10 + count * 0.6) / count, 0.04, 1.5);

/*
 * Worlds. Each world has its own wave counter and progress (see 03-state.js).
 *   count(w)        regular enemies in wave w
 *   hpFactor(w)     multiplier on enemy hit points
 *   speedFactor(w)  multiplier on enemy speed
 *   goldMult        gold per newly cleared wave = wave number * goldMult
 *   xpMult          multiplier on enemy XP
 *   colors          enemy colours that differ from ENEMY_TYPES
 *   splitSlimes     slimes break into two small ones when they die
 * The lava world unlocks after LAVA_UNLOCK_WAVE in the meadow; its wave 1 is
 * about as tough as meadow wave 100.
 */
const LAVA_UNLOCK_WAVE = 100;
const WORLDS = {
  meadow: {
    name: 'Wiese',
    count: waveCount,
    hpFactor: enemyHpFactor,
    speedFactor: enemySpeedFactor,
    goldMult: 1, xpMult: 1, colors: {}, splitSlimes: false,
  },
  lava: {
    name: 'Lava-Welt',
    count: w => waveCount(w + 20),
    hpFactor: w => enemyHpFactor(LAVA_UNLOCK_WAVE) * (1 + 0.15 * (w - 1) + 0.008 * (w - 1) * (w - 1)),
    speedFactor: () => 1.5,
    goldMult: 3, xpMult: 3, splitSlimes: true,
    colors: { slime: '#f0702a', bat: '#ffb23e', ogre: '#7a5560', shield: '#a8553a', archer: '#d94a3a', boss: '#c22b2b' },
  },
};

/** Random type for one regular enemy. Bats come from wave 2, ogres from 3, shield bearers from 8, archers from 12. */
function rollEnemyType(waveNo) {
  let roll = Math.random();
  const shares = [
    ['ogre', waveNo >= 3 ? Math.min(0.25, 0.04 * waveNo) : 0],
    ['bat', waveNo >= 2 ? Math.min(0.3, 0.06 * waveNo) : 0],
    ['shield', waveNo >= 8 ? Math.min(0.1, 0.01 * waveNo) : 0],
    ['archer', waveNo >= 12 ? Math.min(0.05, 0.004 * waveNo) : 0],
  ];
  for (const [type, share] of shares) {
    if (roll < share) return type;
    roll -= share;
  }
  return 'slime';
}

/* Tests set window.__bwQuiet before the game loads so rewards do not disturb what they measure. */
const debugFlags = { achievements: !window.__bwQuiet, chests: !window.__bwQuiet };
