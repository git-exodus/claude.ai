/* 01-core.js – small shared helpers, the canvas and the screen metrics.
 * All files in src/js are concatenated by build.py into ONE function scope (see README 4.1),
 * so everything declared here is visible in every later file. */

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, k) => a + (b - a) * k;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
/** Smooth 0..1 ramp (smoothstep). */
const smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const $ = id => document.getElementById(id);

const cv = $('c');
const ctx = cv.getContext('2d');

/** Screen size in CSS pixels, device pixel ratio and the size unit U.
 *  U is 1 on a 360 px wide phone; every size in the game is a multiple of U. */
let W = 360, H = 740, DPR = 1, U = 1;
/** y of the ground line where the stego stands (set in resize()). */
let groundY = 500;

/** Linear blend of two "#rrggbb" colours, k = 0..1. */
function mix(c1, c2, k) {
  const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
  const ch = s => Math.round(lerp((a >> s) & 255, (b >> s) & 255, k));
  return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')';
}
