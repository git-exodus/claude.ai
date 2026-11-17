/*
 * Core helpers shared by every other file.
 *
 * All files in src/js are concatenated into one function scope (see build.py),
 * so everything declared here is visible everywhere without imports.
 */

const TAU = Math.PI * 2;
const PI = Math.PI;
const { cos, sin, atan2 } = Math;

/** rnd() -> 0..1, rnd(a) -> 0..a, rnd(a, b) -> a..b */
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const $ = id => document.getElementById(id);

const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

const game = $('game');
const canvas = $('c');
const ctx = canvas.getContext('2d');

/*
 * View metrics, recomputed by resize() in 40-main.js.
 *   W, H    size of the play field in CSS pixels
 *   DPR     device pixel ratio used for the canvas backing store
 *   U       gameplay unit: every size and speed is a multiple of U so the game
 *           looks the same on small and large phones
 *   cx, cy  centre of the castle; enemies walk towards this point
 */
let W = 360, H = 640, DPR = 1, U = 1, cx = 180, cy = 300;

/** Shortest distance from point (px, py) to the segment (x1, y1)-(x2, y2). */
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lengthSq, 0, 1);
  return dist(px, py, x1 + dx * t, y1 + dy * t);
}

/* Small canvas shortcuts; `c` is any 2D context (the game canvas or an icon canvas). */
function fillCircle(c, x, y, r) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
}
function fillEllipse(c, x, y, rx, ry) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fill();
}
