/* 11-main.js – screen size, the frame loop, saving and the start of the game. */

function resize() {
  W = window.innerWidth; H = window.innerHeight;
  DPR = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  U = clamp(Math.min(W / 360, H / 680), 0.75, 1.8);
  // The meadow starts a bit above the middle; the stego stands above the buttons.
  groundY = H * 0.52;
  standY = H - Math.max(150 * U, H * 0.2);
  stegoSize = Math.min(W * 0.92, 440 * U);
  makeDeco();
}

let lastFrame = 0, uiTimer = 0, saveTimer = 0;
/** If true, the frame loop does not simulate (tests drive the game with __st.step). */
let paused = false;

function frame(ts) {
  const dt = Math.min(0.05, Math.max(0, (ts - lastFrame) / 1000));
  lastFrame = ts;
  if (!paused) {
    update(dt);
    uiTimer -= dt; saveTimer -= dt;
    if (uiTimer <= 0) { uiTimer = 0.5; refreshUI(); }
    if (saveTimer <= 0) { saveTimer = 5; save(); }
  }
  drawWorld();
  requestAnimationFrame(frame);
}

function start() {
  loadGame();
  loadPhotos();
  resize();
  buildUI();
  buildDev();
  setupInput();
  window.addEventListener('resize', resize);
  // Save when the app goes to the background; on return, time has passed (tick catches up).
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
  window.addEventListener('pagehide', save);
  game.sky = skyAt(now());
  refreshUI();
  requestAnimationFrame(ts => { lastFrame = ts; frame(ts); });
}
