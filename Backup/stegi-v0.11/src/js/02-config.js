/* 02-config.js – every game value in one place (no side effects).
 * Change numbers here, then update README section 7 and the tests that check them. */

const VERSION = '0.11';
const SAVE_KEY = 'stegi-v1';
/** Test mode (0.4) keeps its own game, photos and clock here, so the child's Stegi is never touched. */
const TEST_KEYS = { save: 'stegi-test-v1', photos: 'stegi-test-photos-v1', clock: 'stegi-test-clock' };
/** Time speeds offered in test mode. */
const DEV_SPEEDS = [1, 10, 60, 600];

/** The five needs, in the order of the top bar. Each is 0 (empty) .. 100 (full). */
const NEEDS = ['food', 'drink', 'love', 'fun', 'clean'];
/** Awake hours a need takes to drop from 100 to 0. Needs do not drop while he sleeps. */
const NEED_HOURS = { food: 8, drink: 7, love: 8, fun: 8, clean: 16 };
/** Below this a need shows a thought bubble (and hunger makes the tummy rumble). */
const NEED_LOW = 30;
/** Below this the stego looks sad and whines now and then. */
const NEED_SAD = 20;
/** Needs right after hatching. */
const START_NEEDS = 70;

/** Plant food on the tray. value = how much "food" one piece fills. */
const FOODS = [
  { id: 'fern', value: 20 },
  { id: 'leaf', value: 20 },
  { id: 'berry', value: 15 },
  { id: 'apple', value: 25 },
  { id: 'melon', value: 30 },
];
/** One drink from the bowl. */
const DRINK_VALUE = 35;

/** Stroking: every PET_STEP * U pixels of finger movement over the stego gives PET_LOVE love. */
const PET_STEP = 90;
const PET_LOVE = 3;
/** Ball game: every ball brought back gives this much fun. */
const FETCH_FUN = 12;
/** Bath: seconds of scrubbing from dirty (0) to clean (100). */
const BATH_SECONDS = 6;
/** Teeth: seconds of brushing until done. Gives clean and love once. */
const BRUSH_SECONDS = 5;
const BRUSH_CLEAN = 10, BRUSH_LOVE = 5;
/** Removing one poop. */
const POOP_CLEAN = 5;

/** Egg: stroke it PET_SECONDS a day -> one more crack (max 3, at most one per calendar day).
 *  On a later day after the 3rd crack, HATCH_SECONDS of stroking makes it hatch. */
const EGG = { petSeconds: 120, cracks: 3, hatchSeconds: 15 };

/** Growth stages by day since hatching (hatch day = day 1). He also grows a little every day
 *  (size goes smoothly from SIZE_MIN on day 1 to 1 on GROWN_DAY). */
const STAGES = [
  { day: 1, name: 'Baby' },
  { day: 6, name: 'Kind' },
  { day: 13, name: 'Jugendlicher' },
  { day: 23, name: 'Fast groß' },
  { day: 30, name: 'Ganz groß' },
];
const GROWN_DAY = 30;
const SIZE_MIN = 0.42;   // baby length = 38.5 % of the grown one (agreed in 0.2); 0.42 because the baby body is rounder/shorter since 0.6

/** Poop: after every MEALS pieces of food, a poop appears DELAY_MIN minutes later (at most MAX lie around).
 *  Every poop lying around makes "clean" drop one time faster. */
const POOP = { meals: 4, delayMin: 2, max: 3 };

/** Default sleep window in minutes after midnight (parents can change it). */
const SLEEP_DEFAULT = 20 * 60;
const WAKE_DEFAULT = 7 * 60;
/** Minutes before bedtime when he gets sleepy and the "lights out" button appears. */
const SLEEPY_BEFORE = 30;
/** Choices in the parents' settings. */
const SLEEP_CHOICES = [18 * 60, 18.5 * 60, 19 * 60, 19.5 * 60, 20 * 60, 20.5 * 60, 21 * 60, 21.5 * 60, 22 * 60];
const WAKE_CHOICES = [5.5 * 60, 6 * 60, 6.5 * 60, 7 * 60, 7.5 * 60, 8 * 60, 8.5 * 60, 9 * 60];
/** Daily play time limit in minutes, 0 = off. */
const LIMIT_CHOICES = [0, 15, 30, 45, 60, 90];

/** Walking: awake seconds from setting off until he reaches a new place (the app may be closed).
 *  At most WALK_PER_DAY new places per calendar day; when all are found he walks to a random known one. */
const WALK_SECONDS = 3600;
const WALK_PER_DAY = 2;

/**
 * The 30 places. id, name (shown to parents in the places list), flags:
 *   ff      fireflies every night (forest and water places); elsewhere every other night
 *   dry     no rain or snow (weather turns sunny)      cold   rain falls as snow
 *   indoor  no sky, sun, weather or clouds (the cave)   wear   automatic accessory (0.3)
 * The drawing of each place is in 07-places.js (PLACE_DRAW).
 */
const PLACES = [
  { id: 'home', name: 'Zuhause', indoor: true, home: true },   // 0.11: his own cave, always open, not one of the 30
  { id: 'meadow', name: 'Wiese' },
  { id: 'jungle', name: 'Dschungel', ff: true },
  { id: 'savanna', name: 'Savanne', dry: true },
  { id: 'volcano', name: 'Vulkan', dry: true },
  { id: 'island', name: 'Kleine Insel' },
  { id: 'river', name: 'Am Fluss', ff: true },
  { id: 'cloud', name: 'Auf einer Wolke', dry: true },
  { id: 'beach', name: 'Strand', wear: { eyes: 'sunglasses' } },
  { id: 'waterfall', name: 'Wasserfall', ff: true },
  { id: 'desert', name: 'Wüste', dry: true, wear: { eyes: 'sunglasses' } },
  { id: 'snow', name: 'Schneeberg', cold: true, wear: { neck: 'scarf' } },
  { id: 'cave', name: 'Kristallhöhle', indoor: true },
  { id: 'mushroom', name: 'Pilzwald', ff: true },
  { id: 'sunflower', name: 'Sonnenblumenfeld' },
  { id: 'bamboo', name: 'Bambuswald', ff: true },
  { id: 'pond', name: 'Seerosenteich', ff: true },
  { id: 'swamp', name: 'Sumpf', ff: true },
  { id: 'autumn', name: 'Herbstwald', ff: true },
  { id: 'cherry', name: 'Kirschblütenhain' },
  { id: 'canyon', name: 'Felsenschlucht', dry: true },
  { id: 'lagoon', name: 'Lagune' },
  { id: 'rainbow', name: 'Regenbogenland' },
  { id: 'dinovalley', name: 'Dino-Tal' },
  { id: 'mountainlake', name: 'Bergsee', ff: true },
  { id: 'springs', name: 'Heiße Quellen' },
  { id: 'ice', name: 'Eisland', cold: true, wear: { neck: 'scarf' } },
  { id: 'starhill', name: 'Sternenhügel', ff: true },
  { id: 'bigtree', name: 'Riesenbaum', ff: true },
  { id: 'berryhill', name: 'Beerenhügel' },
  { id: 'treasure', name: 'Schatzinsel' },
];
const placeById = id => PLACES.find(p => p.id === id) || PLACES[1];   // unknown (e.g. 'travel') = meadow

/** Dressing up (0.3): 12 things, one per slot (head / eyes / neck). Each becomes a present on its day of
 *  life (every 2–3 days, the first on the hatch day); opening the present puts it on. */
const WEAR_ITEMS = [
  { id: 'bow', slot: 'head', day: 1 }, { id: 'sunglasses', slot: 'eyes', day: 3 },
  { id: 'party', slot: 'head', day: 6 }, { id: 'scarf', slot: 'neck', day: 8 },
  { id: 'sunhat', slot: 'head', day: 11 }, { id: 'glasses', slot: 'eyes', day: 13 },
  { id: 'beanie', slot: 'head', day: 16 }, { id: 'crown', slot: 'head', day: 18 },
  { id: 'bowtie', slot: 'neck', day: 21 }, { id: 'flowers', slot: 'head', day: 23 },
  { id: 'pirate', slot: 'head', day: 26 }, { id: 'wizard', slot: 'head', day: 28 },
];
const wearItem = id => WEAR_ITEMS.find(w => w.id === id);

/** Photos (0.5): two albums. "Fototagebuch" = own photos, at most PHOTO_PER_DAY a calendar day and
 *  PHOTO_OWN_MAX in all (then the oldest goes). "Meilensteine" = automatic photos (hatching, every new
 *  stage, every new place), never removed. Stored apart from the game in localStorage[PHOTO_KEY] as small
 *  JPEGs (PHOTO_W pixels wide). A photo is never dropped because storing failed (it stays until the app closes). */
const PHOTO_PER_DAY = 2;
const PHOTO_OWN_MAX = 100;
/** Seconds the delete button in the big photo view must be held. */
const PHOTO_DELETE_HOLD = 3;
const PHOTO_KEY = 'stegi-photos-v1';
const PHOTO_W = 240;

/** Visitors (0.3): at most one a day at a random time between VISIT_FROM and an hour before bedtime;
 *  they stay VISIT_SECONDS and leave love and fun behind. */
const VISITORS = ['trex', 'ptero', 'trike', 'turtle', 'butterflies'];
const VISIT_FROM = 9 * 60;
const VISIT_SECONDS = 60;
const VISIT_LOVE = 10, VISIT_FUN = 10;

/** Hide and seek: fun for every time he is found. Music: fun for every note played. */
const HIDE_FUN = 15;
const MUSIC_FUN = 1.5;

/** Weather (0.3), the same all day, chosen from the day number: share of sun / clouds / rain;
 *  in December–February rain falls as snow; after 15:00 a rainy day turns into a rainbow. */
const WEATHER_SHARES = { sun: 0.45, clouds: 0.25, rain: 0.30 };
const RAINBOW_FROM = 15 * 60;

/** Training (0.8, 7 tricks since 0.9): draw the symbol, he does the trick. In this order; a trick is open once the one before
 *  is learned (TRICK_LEARN successes). Learned tricks he sometimes does by himself (IDLE_TRICK_CHANCE of the
 *  idle moments). shape: 'circle' | 'zigzag' (up and down) | 'wave' (left to right) | 'triangle' | 'spiral' | 'heart' | 'star'. */
const TRICKS = [
  { id: 'roll', shape: 'circle', name: 'Rolle' },
  { id: 'stand', shape: 'zigzag', name: 'Hinterbeine' },
  { id: 'hand', shape: 'wave', name: 'Vorderbeine' },
  // 0.9: four more, opened one after the other.
  { id: 'sit', shape: 'triangle', name: 'Sitz' },
  { id: 'spin', shape: 'spiral', name: 'Drehen' },
  { id: 'kiss', shape: 'heart', name: 'Küsschen' },
  { id: 'pirouette', shape: 'star', name: 'Pirouette' },
];
const TRICK_LEARN = 3;
const TRAIN_FUN_OK = 8, TRAIN_FUN_FAIL = 3;
const IDLE_TRICK_CHANCE = 0.2;
/** Drawing check (generous for small children, but no scribbling): share of the dotted line the finger
 *  must pass near, share of the finger's line that must stay near the dotted line, share of the finger's
 *  steps that must go along the line in one direction (no zigzagging back and forth), allowed length of
 *  the finger's line compared to the dotted line, and the distance that counts as "near" (in U). */
const TRACE_COVER = 0.72, TRACE_ON_LINE = 0.8, TRACE_ORDER = 0.8, TRACE_LEN = [0.6, 2.2], TRACE_TOL = 28;
/** 0.9 (7 similar shapes): average distance (U) from the dotted line to the finger line and back must be at
 *  most TRACE_MEAN, and 90 % of the finger line within TRACE_P90. A child's wobble stays below 10, a different
 *  shape is 12 or more (measured for every pair of shapes, see README 6.16). */
const TRACE_MEAN = 11, TRACE_P90 = 20;

/** Seconds the gear button must be held to open the parents' settings. */
const GEAR_HOLD = 3;

/** Switches for the tests (window.__stQuiet = true before load turns music off). */
const debugFlags = { music: !window.__stQuiet, visit: true };   // visit: false = no visitors (tests that must not depend on chance)

/** Icons used both as inline SVG (buttons) and on the canvas (thought bubbles).
 *  Coordinates are in a 24x24 box. Each part: d = SVG path, fill and/or stroke (+ w = width). */
const ICONS = {
  food: [
    { d: 'M4 20C4 10 10 3 21 3c0 11-6 17-17 17z', fill: '#5cc15a' },
    { d: 'M5 19L16 8', stroke: '#2e7d32', w: 1.8 },
  ],
  drink: [
    { d: 'M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13z', fill: '#3fa9f5' },
    { d: 'M8.5 15a3.5 3.5 0 0 0 3.5 3.5', stroke: '#fff', w: 1.8 },
  ],
  love: [
    { d: 'M12 21C5 15 2 12 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 4-3 7-10 13z', fill: '#ff5c8a' },
    { d: 'M6 7.5a2.5 2.5 0 0 1 2.5-2', stroke: '#fff', w: 1.6 },
  ],
  fun: [
    { d: 'M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0z', fill: '#ffcc33' },
    { d: 'M3 8.5c6 2.5 12 2.5 18 0M3 15.5c6-2.5 12-2.5 18 0', stroke: '#e53935', w: 2.2 },
  ],
  clean: [
    { d: 'M2 15a6 6 0 1 0 12 0a6 6 0 1 0-12 0z', fill: '#8fd3ff' },
    { d: 'M13 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0z', fill: '#bfe6ff' },
    { d: 'M15 18a3 3 0 1 0 6 0a3 3 0 1 0-6 0z', fill: '#a8dcff' },
    { d: 'M5 13a3 3 0 0 1 2.5-2.5', stroke: '#fff', w: 1.5 },
  ],
  bath: [
    { d: 'M2 11h20v2a7 7 0 0 1-7 7H9a7 7 0 0 1-7-7z', fill: '#5bb8f0' },
    { d: 'M5 11V6.5a2.5 2.5 0 0 1 5 0', stroke: '#90a4ae', w: 2 },
    { d: 'M12 8a2 2 0 1 0 4 0a2 2 0 1 0-4 0zM16.5 5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z', fill: '#bfe6ff' },
    { d: 'M6 20l-1 2.5M18 20l1 2.5', stroke: '#90a4ae', w: 2 },
  ],
  brush: [
    { d: 'M3.5 20.5L14 10', stroke: '#26a69a', w: 3.6 },
    { d: 'M12.5 8.5l4-4 3 3-4 4z', fill: '#fff', stroke: '#90a4ae', w: 1.2 },
    { d: 'M15 3.5l1.5-1.5M18 6.5l1.5-1.5M21 9.5l-1.5 1.5', stroke: '#4fc3f7', w: 1.6 },
  ],
  bed: [
    { d: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11z', fill: '#ffd54f' },
    { d: 'M17 3l.8 1.7 1.7.8-1.7.8L17 8l-.8-1.7-1.7-.8 1.7-.8z', fill: '#fff59d' },
  ],
  walk: [
    { d: 'M6 3.5c1.8 0 2.8 2 2.6 4.5S7 12 5.6 12 3.2 10.3 3.4 7.6 4.3 3.5 6 3.5zM4 13.5h4l-.4 2.5H4.4z', fill: '#8d6e63' },
    { d: 'M16.5 8.5c1.8 0 2.8 2 2.6 4.5s-1.6 4-3 4-2.4-1.7-2.2-4.4.9-4.1 2.6-4.1zM14.5 18.5h4l-.4 2.5h-3.2z', fill: '#a1887f' },
  ],
  map: [
    { d: 'M2 5l6-2 8 2 6-2v16l-6 2-8-2-6 2z', fill: '#ffe9a8', stroke: '#c49a3a', w: 1.4 },
    { d: 'M8 3v16M16 5v16', stroke: '#e0c070', w: 1.2 },
    { d: 'M5 14c2-3 5 1 7-2s4-1 6-4', stroke: '#e5533d', w: 1.8 },
    { d: 'M17 5.5l1.6 1.6M18.6 5.5L17 7.1', stroke: '#e5533d', w: 1.6 },
  ],
  play: [
    { d: 'M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0z', fill: '#ffcc33' },
    { d: 'M3 8.5c6 2.5 12 2.5 18 0M3 15.5c6-2.5 12-2.5 18 0', stroke: '#e53935', w: 2.2 },
  ],
  hide: [
    { d: 'M2 20c0-5 3-8 6-8 0-4 3-7 6-6 3-2 7 1 7 5 2 1 2 5 1 9z', fill: '#4f9a3c' },
    { d: 'M9.5 15a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0zM14 15a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z', fill: '#fff' },
    { d: 'M10.5 15.3a.6.6 0 1 0 1.2 0a.6.6 0 1 0-1.2 0zM15 15.3a.6.6 0 1 0 1.2 0a.6.6 0 1 0-1.2 0z', fill: '#222' },
  ],
  music: [
    { d: 'M9 18V5l11-2v13', stroke: '#7e57c2', w: 2.2 },
    { d: 'M3 18a3 2.5 0 1 0 6 0a3 2.5 0 1 0-6 0zM14 16a3 2.5 0 1 0 6 0a3 2.5 0 1 0-6 0z', fill: '#7e57c2' },
  ],
  hat: [
    { d: 'M7 17l3-13 7 13z', fill: '#ff7096' },
    { d: 'M8.6 11l5.6-1M7.8 14.5l7.4-1.4', stroke: '#ffd54f', w: 1.6 },
    { d: 'M8.5 3.5a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0z', fill: '#ffd54f' },
    { d: 'M3 18.5c4-2 14-2 18 0', stroke: '#7e57c2', w: 2.4 },
  ],
  album: [
    { d: 'M3 4h18v16H3z', fill: '#ffffff', stroke: '#8d6e63', w: 1.6 },
    { d: 'M5 6h14v10H5z', fill: '#8fd3ff' },
    { d: 'M5 16l5-6 4 4 2-2 3 4z', fill: '#5cc15a' },
    { d: 'M15 8.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z', fill: '#ffd54f' },
  ],
  camera: [
    { d: 'M2 8h5l2-3h6l2 3h5v12H2z', fill: '#455a64' },
    { d: 'M8 13.5a4 4 0 1 0 8 0a4 4 0 1 0-8 0z', fill: '#90caf9', stroke: '#ffffff', w: 1.6 },
    { d: 'M18 10h2', stroke: '#ffd54f', w: 2 },
  ],
  train: [
    { d: 'M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z', fill: '#ffca28', stroke: '#e0a800', w: 1.2 },
    { d: 'M9 12.5l2 2 4-4.5', stroke: '#ffffff', w: 2 },
  ],
  bubbles: [
    { d: 'M3 12a6 6 0 1 0 12 0a6 6 0 1 0-12 0z', fill: '#bfe6ff', stroke: '#7fc4f0', w: 1.4 },
    { d: 'M14 6a4 4 0 1 0 8 0a4 4 0 1 0-8 0zM15 17a3 3 0 1 0 6 0a3 3 0 1 0-6 0z', fill: '#ffd6ef', stroke: '#f48fb1', w: 1.2 },
    { d: 'M6 10a3 3 0 0 1 2.5-2.5', stroke: '#ffffff', w: 1.6 },
  ],
  kite: [
    { d: 'M12 2l7 8-7 9-7-9z', fill: '#e53935' },
    { d: 'M12 2v17M5 10h14', stroke: '#ffca28', w: 1.6 },
    { d: 'M12 19c-2 1-1 3-3 4', stroke: '#555', w: 1.4 },
  ],
  castle: [
    { d: 'M3 21V11h3V8h3v3h6V8h3v3h3v10z', fill: '#e2be72', stroke: '#b8914a', w: 1.2 },
    { d: 'M10 21v-5h4v5', fill: '#b8914a' },
    { d: 'M16.5 8V3l4 1.5-4 1.5', fill: '#e53935', stroke: '#6d4c41', w: 1 },
  ],
  melody: [
    { d: 'M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0z', fill: '#7e57c2' },
    { d: 'M10 16V7l6-1v8', stroke: '#ffffff', w: 1.8 },
    { d: 'M7 16a2.5 2 0 1 0 5 0a2.5 2 0 1 0-5 0zM13 14a2.5 2 0 1 0 5 0a2.5 2 0 1 0-5 0z', fill: '#ffffff' },
  ],
  sticker: [
    { d: 'M12 2l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z', fill: '#ff8fb1', stroke: '#c2185b', w: 1.2 },
    { d: 'M12 8a3 3 0 1 0 0.01 0z', fill: '#ffffff' },
  ],
  shop: [
    { d: 'M4 8h16l-1.5 13h-13z', fill: '#ffb74d', stroke: '#e65100', w: 1.2 },
    { d: 'M8 8V6a4 4 0 0 1 8 0v2', stroke: '#e65100', w: 1.8 },
    { d: 'M12 12l1.2 2.4 2.6.3-2 1.8.6 2.6-2.4-1.4-2.4 1.4.6-2.6-2-1.8 2.6-.3z', fill: '#fff59d' },
  ],
  close: [
    { d: 'M6 6l12 12M18 6L6 18', stroke: '#e5533d', w: 3.4 },
  ],
  gear: [
    { d: gearPath(), fill: '#ffffff' },
    { d: 'M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0z', fill: '#7a8a99' },
  ],
};

/** Outline of a gear with 8 teeth in the 24x24 icon box. */
function gearPath() {
  const pts = [];
  for (let i = 0; i < 32; i++) {
    const a = i / 32 * TAU, r = (i % 4 < 2) ? 10.5 : 7.8;
    pts.push((12 + Math.cos(a) * r).toFixed(2) + ' ' + (12 + Math.sin(a) * r).toFixed(2));
  }
  return 'M' + pts.join('L') + 'z';
}

/** Inline SVG markup for an icon (used for the HTML buttons). */
function iconSVG(name) {
  const parts = ICONS[name].map(p => '<path d="' + p.d + '" fill="' + (p.fill || 'none') + '"' +
    (p.stroke ? ' stroke="' + p.stroke + '" stroke-width="' + (p.w || 2) + '" stroke-linecap="round" stroke-linejoin="round"' : '') + '/>');
  return '<svg viewBox="0 0 24 24" aria-hidden="true">' + parts.join('') + '</svg>';
}

/** Path2D objects for the icons, created once on first use. */
const iconPaths = {};
/** Draws an icon centred at (x, y), size s pixels, on the given canvas context. */
function drawIcon(c, name, x, y, s) {
  if (!iconPaths[name]) iconPaths[name] = ICONS[name].map(p => ({ ...p, path: new Path2D(p.d) }));
  c.save();
  c.translate(x - s / 2, y - s / 2);
  c.scale(s / 24, s / 24);
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const p of iconPaths[name]) {
    if (p.fill) { c.fillStyle = p.fill; c.fill(p.path); }
    if (p.stroke) { c.strokeStyle = p.stroke; c.lineWidth = p.w || 2; c.stroke(p.path); }
  }
  c.restore();
}
