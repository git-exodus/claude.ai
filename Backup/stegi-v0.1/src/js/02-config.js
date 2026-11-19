/* 02-config.js – every game value in one place (no side effects).
 * Change numbers here, then update README section 7 and the tests that check them. */

const VERSION = '0.1';
const SAVE_KEY = 'stegi-v1';

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
const SIZE_MIN = 0.55;

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

/** Seconds the gear button must be held to open the parents' settings. */
const GEAR_HOLD = 3;

/** Switches for the tests (window.__stQuiet = true before load turns music off). */
const debugFlags = { music: !window.__stQuiet };

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
