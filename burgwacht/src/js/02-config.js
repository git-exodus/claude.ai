/*
 * Game data and balance numbers. Nothing in here has side effects, so this is
 * the place to tune the game. The README (section "Spielregeln und Balance")
 * lists the current values in readable form; keep both in step.
 *
 * When raising the version, change VERSION here, the credit line in
 * src/page.html and versionCode/versionName in android/app/build.gradle.
 */

const VERSION = '0.8';
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
const SOLDIER_CAP_BASE = 4, SOLDIER_CAP_STEP = 2;   // soldiers on the field: 4, +2 per "more soldiers" tier
const SOLDIER_CAP_PRICES = [30, 50, 80, 120, 170, 230, 300, 400];   // 8 tiers -> at most 20 soldiers
const ARCHER_PRICES = [60, 90, 130, 180, 240, 310, 390, 480, 580, 700];   // archers on the wall, at most 10
const XP_GAIN = 1.3;                     // global XP multiplier (levelling was too slow without it)
const SOLDIER_HP = [3, 5];               // hits a soldier survives without / with armour
const MAX_ENEMIES_ALIVE = 260;     // further enemies wait off-screen until there is room

/*
 * Weapons, in the order of the weapon bar.
 *   price        gold needed in the shop (STARTER_WEAPON is owned from the start)
 *   baseDamage   damage of one basic hit at level 1
 *   cooldown     [seconds at level 1, seconds at ABILITY_CAP], linear in between
 *   baseAbility  name of the level-1 attack, shown first in the ability overview
 *   milestones   level -> name of the ability unlocked there; abilities stack
 *   aimLine      weapons thrown from the castle: show a dashed aiming line while the finger is down
 * The attack code lives in 10-weapon-*.js and is attached as WEAPONS[id].attack.
 */
const WEAPONS = {
  dagger: {
    name: 'Dolche', price: 0, baseDamage: 9, cooldown: [2, 0.3], baseAbility: 'Wurfdolch', aimLine: true,
    milestones: { 5: 'Dolchfächer', 10: 'Abpraller', 15: 'Durchbohren', 25: 'Ansteckendes Gift', 30: 'Schattenklon', 40: 'Splitterdolche', 50: 'Bumerang', 60: 'Giftwolke', 70: 'Dolchfallen', 80: 'Zielsuchend', 90: 'Dolchwirbel', 100: 'Kettenreaktion' },
  },
  sword: {
    name: 'Schwert', price: 5, baseDamage: 10, cooldown: [3.5, 0.5], baseAbility: 'Schwerthieb',
    milestones: { 5: 'Doppelschwert', 10: 'Dreier-Fächer', 15: 'Echo-Hieb', 25: 'Kreisende Schwerter', 30: 'Klingenwelle', 40: 'Geisterschwert', 50: 'Riesenschwert', 60: 'Schwertsplitter', 70: 'Zeitriss', 80: 'Spiegelhieb', 90: 'Kettenblitz', 100: 'Schwertregen' },
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
const STARTER_WEAPON = 'dagger';

/*
 * XP needed to go from `level` to `level + 1`.
 * Tuned together with the flat XP per enemy and XP_GAIN so that the weapon used
 * all the time is roughly level 5 / 9 / 16 / 25 / 43 / 91 after wave 5 / 10 /
 * 20 / 30 / 50 / 100 of a first playthrough without repeating waves
 * (tests/suite-progress.js checks this curve). The power law keeps working for
 * levels far beyond 100.
 */
const xpNeeded = level => Math.round(4 + 6.4 * Math.pow(level, 1.4));

/*
 * Enemy types. The key is the type id used everywhere (queue, drawing, tests).
 *   name        German name, for the README and debugging only
 *   r, sp, xp   radius in U before CASTLE_SCALE, speed in U per second, XP per kill;
 *               worlds and waves scale them, see WORLDS below
 *   hp, hpStep  hit points in meadow wave 1 and how many are added per wave
 *               until RAMP_UNTIL (see meadowHp below); big enemies grow faster
 *   shielded    projectile hits only deal SHIELD_BLOCK of their damage; area damage is unaffected
 *   ranged      stops at ARCHER_RANGE and shoots the castle instead of walking into it
 */
const ENEMY_TYPES = {
  slime:      { name: 'Schleim', r: 13, hp: 3, hpStep: 1, sp: 20, xp: 1, color: '#59c36a' },
  bat:        { name: 'Fledermaus', r: 10, hp: 1, hpStep: 1, sp: 38, xp: 1, color: '#9a6bd6' },
  koboldSlow: { name: 'Kobold', r: 11, hp: 7, hpStep: 2, sp: 10, xp: 2, color: '#b58a4a' },
  koboldFast: { name: 'Flinker Kobold', r: 9, hp: 2, hpStep: 1, sp: 50, xp: 1, color: '#c8cf4a' },
  wolf:       { name: 'Wolf', r: 11, hp: 3, hpStep: 1, sp: 46, xp: 1, color: '#8a8f99' },
  ogre:       { name: 'Oger', r: 19, hp: 14, hpStep: 3, sp: 13, xp: 3, color: '#4f9aa8' },
  orcClub:    { name: 'Ork mit Keule', r: 18, hp: 22, hpStep: 4, sp: 14, xp: 4, color: '#6f8f3a', club: true },
  orcAxe:     { name: 'Ork mit Axt', r: 17, hp: 16, hpStep: 3, sp: 21, xp: 4, color: '#82a046', siege: 2 },
  shield:     { name: 'Schildträger', r: 14, hp: 14, hpStep: 1, sp: 16, xp: 2, color: '#8793b8', shielded: true },
  archer:     { name: 'Armbrustschütze', r: 11, hp: 4, hpStep: 1, sp: 22, xp: 2, color: '#c9787f', ranged: true },
  // bosses
  boss:       { name: 'Schleimkönig', r: 30, hp: 90, hpStep: 15, sp: 9, xp: 20, color: '#e07a3f', boss: true },
  wolfAlpha:  { name: 'Wolfsalpha', r: 22, hp: 70, hpStep: 12, sp: 26, xp: 20, color: '#5d6270', boss: true },
  orcKing:    { name: 'Orkkönig', r: 31, hp: 120, hpStep: 20, sp: 8, xp: 25, color: '#4f7a2a', boss: true, club: true, siege: 3 },
};
/*
 * Extra fields above:
 *   boss    counts as a boss (statistics, knockback resistance, crown)
 *   club    hits soldiers for 2 and knocks them back (orcs with clubs)
 *   siege   damage to wall or castle when it gets there (default 1)
 */
const BOSS_ROTATION = ['boss', 'wolfAlpha', 'orcKing'];   // wave 5, 10, 15, then again from the start
const WOLF_PACK = 4;                                      // wolves always come in packs; the alpha brings one
const BOSS_EVERY = 5;        // a boss joins every 5th wave
const SHIELD_BLOCK = 0.25;   // share of projectile damage that gets through a shield
const ARCHER_RANGE = 105;    // distance from the castle (in U) at which archers stop
const ARCHER_INTERVAL = 4;   // seconds between an archer's shots

/*
 * Enemy hit points in the meadow.
 *   waves 1..RAMP_UNTIL  gentle linear start: hp + hpStep per wave (small enemies +1)
 *   after that           the value of wave RAMP_UNTIL grows with enemyHpFactor, which
 *                        starts at 1, so there is no jump between the two parts
 */
const RAMP_UNTIL = 17;
function meadowHp(type, waveNo) {
  const { hp, hpStep } = ENEMY_TYPES[type];
  const rampEnd = hp + hpStep * (Math.min(waveNo, RAMP_UNTIL) - 1);
  return waveNo <= RAMP_UNTIL ? rampEnd : rampEnd * enemyHpFactor(waveNo - RAMP_UNTIL + 1);
}

/**
 * Gold for clearing a wave, every time (also repeated waves): 2 gold in waves
 * 1-10, and 3 more for every further ten waves (11-20: 5, 21-30: 8, ...).
 */
const goldForWave = waveNo => 2 + 3 * Math.floor((waveNo - 1) / 10);

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
 *   enemyHp(t, w)   hit points of an enemy of type t in wave w
 *   speedFactor(w)  multiplier on enemy speed
 *   goldMult        multiplier on the gold for every cleared wave, see goldForWave()
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
    enemyHp: meadowHp,
    speedFactor: enemySpeedFactor,
    goldMult: 1, xpMult: 1, colors: {}, splitSlimes: false,
  },
  lava: {
    name: 'Lava-Welt',
    count: w => waveCount(w + 20),
    enemyHp: (type, w) => meadowHp(type, LAVA_UNLOCK_WAVE) * (1 + 0.15 * (w - 1) + 0.008 * (w - 1) * (w - 1)),
    speedFactor: () => 1.5,
    goldMult: 3, xpMult: 3, splitSlimes: true,
    colors: { slime: '#f0702a', bat: '#ffb23e', ogre: '#7a5560', shield: '#a8553a', archer: '#d94a3a', boss: '#c22b2b',
      koboldSlow: '#a5603a', koboldFast: '#ffcf4a', wolf: '#5a4a48', orcClub: '#8a4a2a', orcAxe: '#a65a2a', wolfAlpha: '#3a2a2a', orcKing: '#6a2a1a' },
  },
};

/*
 * Share of each regular enemy type per wave: [type, first wave, share per wave, maximum share].
 * Whatever is left over are slimes. 'wolf' means a whole pack of WOLF_PACK wolves.
 */
const ENEMY_SHARES = [
  ['bat', 2, 0.05, 0.22],
  ['ogre', 3, 0.03, 0.18],
  ['koboldFast', 4, 0.02, 0.10],
  ['koboldSlow', 4, 0.015, 0.08],
  ['wolf', 6, 0.01, 0.05],
  ['shield', 8, 0.008, 0.07],
  ['orcClub', 10, 0.008, 0.08],
  ['archer', 12, 0.004, 0.05],
  ['orcAxe', 15, 0.006, 0.07],
];

/** Random type for one regular enemy of the wave. */
function rollEnemyType(waveNo) {
  let roll = Math.random();
  for (const [type, from, perWave, max] of ENEMY_SHARES) {
    if (waveNo < from) continue;
    const share = Math.min(max, perWave * waveNo);
    if (roll < share) return type;
    roll -= share;
  }
  return 'slime';
}

/** Boss of a boss wave: slime king, wolf alpha and orc king take turns. */
const bossFor = waveNo => BOSS_ROTATION[(Math.floor(waveNo / BOSS_EVERY) - 1) % BOSS_ROTATION.length];

/*
 * Switches for the automated tests. Tests set window.__bwQuiet before the game
 * loads; then achievements, chests, the skill hint, the chest animation and the
 * music are off, so they cannot disturb what a test measures. A test can turn a
 * single one back on through window.__bw.flags.
 */
const debugFlags = { achievements: !window.__bwQuiet, chests: !window.__bwQuiet, skillHint: !window.__bwQuiet, chestAnimation: !window.__bwQuiet, music: !window.__bwQuiet };
