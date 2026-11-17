/*
 * Game data and balance numbers. Nothing in here has side effects, so this is
 * the place to tune the game.
 */

const VERSION = '0.5';
const SAVE_KEY = 'burgwacht-v3';
const LEGACY_SAVE_KEY = 'burgwacht-v2';   // single-save format from before the start menu

/*
 * Weapon levels. MAX_LEVEL is the only number to change when the cap is raised
 * (1000 is planned). New abilities only exist up to ABILITY_CAP; above it only
 * damage keeps growing and the cooldown stays at its ABILITY_CAP value.
 */
const MAX_LEVEL = 100;
const ABILITY_CAP = 100;

const MAX_HP = 10;                 // castle lives
const CASTLE_SCALE = 0.6;          // castle and enemies are drawn at 60 % of their design size
const WALL_TIERS = [0, 3, 5, 10, 25];   // wall hit points per shop tier (index = tier)
const SOLDIER_INTERVALS = [5, 4, 3];    // seconds between soldiers per shop tier
const MAX_SOLDIERS = 4;
const MAX_ENEMIES_ALIVE = 260;     // further enemies wait off-screen until there is room

/*
 * Weapons, in the order of the weapon bar.
 *   price        gold needed in the shop (the sword is owned from the start)
 *   baseDamage   damage of one basic hit at level 1
 *   cooldown     [seconds at level 1, seconds at ABILITY_CAP], linear in between
 *   milestones   level -> name of the ability unlocked there; abilities stack
 * The attack code lives in 10-weapon-*.js and is attached as WEAPONS[id].attack.
 */
const WEAPONS = {
  sword: {
    name: 'Schwert', price: 0, baseDamage: 10, cooldown: [3.5, 0.5], baseAbility: 'Schwerthieb',
    milestones: { 5: 'Doppelschwert', 10: 'Dreier-Fächer', 15: 'Echo-Hieb', 25: 'Kreisende Schwerter', 30: 'Klingenwelle', 40: 'Geisterschwert', 50: 'Riesenschwert', 60: 'Schwertsplitter', 70: 'Zeitriss', 80: 'Spiegelhieb', 90: 'Kettenblitz', 100: 'Schwertregen' },
  },
  dagger: {
    name: 'Dolche', price: 5, baseDamage: 7, cooldown: [2, 0.3], baseAbility: 'Wurfdolch',
    milestones: { 5: 'Dolchfächer', 10: 'Abpraller', 15: 'Durchbohren', 25: 'Ansteckendes Gift', 30: 'Schattenklon', 40: 'Splitterdolche', 50: 'Bumerang', 60: 'Giftwolke', 70: 'Dolchfallen', 80: 'Zielsuchend', 90: 'Dolchwirbel', 100: 'Kettenreaktion' },
  },
  star: {
    name: 'Morgenstern', price: 10, baseDamage: 16, cooldown: [5, 1], baseAbility: 'Flächenschlag',
    milestones: { 5: 'Schockwelle', 10: 'Rollende Kugel', 15: 'Betäubung', 25: 'Stachelhagel', 30: 'Nachbeben', 40: 'Brennender Boden', 50: 'Kettenschwung', 60: 'Schwarzes Loch', 70: 'Kugelsplitter', 80: 'Erdspalte', 90: 'Zwillingsstern', 100: 'Meteor' },
  },
  bow: {
    name: 'Bogen', price: 40, baseDamage: 14, cooldown: [2.5, 0.4], baseAbility: 'Pfeilschuss',
    milestones: { 5: 'Doppelpfeil', 10: 'Durchschuss', 15: 'Kritischer Treffer', 25: 'Brandpfeil', 30: 'Pfeilfächer', 40: 'Explosivpfeil', 50: 'Pfeilhagel', 60: 'Querschläger', 70: 'Frostpfeil', 80: 'Geisterschütze', 90: 'Riesenpfeil', 100: 'Pfeilsturm' },
  },
  wand: {
    name: 'Feuerstab', price: 75, baseDamage: 12, cooldown: [4, 0.8], baseAbility: 'Feuerball',
    milestones: { 5: 'Brand', 10: 'Zwei Feuerbälle', 15: 'Feuerspur', 25: 'Kettenexplosion', 30: 'Flammenwand', 40: 'Feuergeist', 50: 'Lavabecken', 60: 'Phönix', 70: 'Glutregen', 80: 'Feuertornado', 90: 'Sonnenstrahl', 100: 'Supernova' },
  },
};
const WEAPON_IDS = Object.keys(WEAPONS);

/** XP needed to go from `level` to `level + 1`. */
const xpNeeded = level => Math.round(4 + level * 1.4 + level * level * 0.035);

/*
 * Enemy types. r/hp/sp/xp are the level-1 values (radius in U before CASTLE_SCALE,
 * speed in U per second); waves scale them with the functions below.
 */
const ENEMY_TYPES = {
  slime: { r: 13, hp: 10, sp: 20, xp: 1, color: '#59c36a' },
  bat:   { r: 10, hp: 6, sp: 38, xp: 1, color: '#9a6bd6' },
  ogre:  { r: 19, hp: 42, sp: 13, xp: 4, color: '#4f9aa8' },
  boss:  { r: 30, hp: 260, sp: 9, xp: 25, color: '#e07a3f' },
};
const BOSS_EVERY = 5;   // a boss joins every 5th wave

/** Number of regular enemies in a wave: +3 per wave up to 5, +5 to 15, +10 to 30, +15 to 50, +20 after. */
function waveCount(waveNo) {
  let n = 8;
  for (let i = 2; i <= waveNo; i++) n += i <= 5 ? 3 : i <= 15 ? 5 : i <= 30 ? 10 : i <= 50 ? 15 : 20;
  return n;
}
const enemyHpFactor = waveNo => 1 + 0.22 * (waveNo - 1) + 0.015 * (waveNo - 1) * (waveNo - 1);
const enemySpeedFactor = waveNo => 1 + Math.min(0.5, waveNo * 0.02);
const enemyXpFactor = waveNo => 1 + 0.12 * waveNo;
/** Seconds between two spawns: a wave takes at most ~80 s to enter the field. */
const spawnGapFor = count => clamp(Math.min(80, 10 + count * 0.6) / count, 0.04, 1.5);

/** Random type for one regular enemy; ogres appear from wave 3, bats from wave 2. */
function rollEnemyType(waveNo) {
  const roll = Math.random();
  const ogreShare = Math.min(0.25, 0.04 * waveNo);
  const batShare = Math.min(0.3, 0.06 * waveNo);
  if (waveNo >= 3 && roll < ogreShare) return 'ogre';
  if (waveNo >= 2 && roll < ogreShare + batShare) return 'bat';
  return 'slime';
}
