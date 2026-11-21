/*
 * Shared helpers for the Playwright test suites.
 *
 * Every suite drives the real game page in headless Chromium:
 *   - It loads the standalone page that goes into the APK
 *     (android/app/src/main/assets/index.html), so build.py must have run first (run.sh does that).
 *   - It talks to the game through window.__st (see src/js/99-debug.js): time travel with
 *     __st.setTime('2026-11-20T10:00') / __st.travel(hours), simulated game time with __st.step(seconds).
 *   - Output is one line per check: "PASS <what>  [<detail>]" or "FAIL ...",
 *     then "ALLE TESTS BESTANDEN" or "FEHLER: <n>". run.sh counts these lines.
 *
 * Screenshots are written to the current directory, so run the suites from a scratch directory.
 */
const path = require('path');
const { chromium } = require('playwright');

const GAME_URL = 'file://' + path.resolve(__dirname, '../android/app/src/main/assets/index.html');

function createReport() {
  let fails = 0;
  return {
    ok(condition, message, detail = '') {
      console.log((condition ? 'PASS ' : 'FAIL ') + message + (detail !== '' ? '  [' + detail + ']' : ''));
      if (!condition) fails++;
    },
    finish() { console.log(fails ? 'FEHLER: ' + fails : 'ALLE TESTS BESTANDEN'); },
  };
}

/**
 * Opens a 360x740 phone-sized page. quiet = no music (window.__stQuiet).
 * Page and console errors are collected in `errors`; every suite checks it is empty at the end.
 */
async function openPage(browser, { quiet = true, scale = 1, android = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: scale });
  if (quiet) await context.addInitScript(() => { window.__stQuiet = true; });
  if (android) await context.addInitScript(() => { window.Android = { exit() { window.__exited = true; } }; });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return { context, page, errors };
}

/**
 * Loads the game with empty storage at the given local time and stops the real-time loop,
 * so only __st.step() moves the game on (exact, repeatable tests).
 */
async function loadClean(page, time = '2026-11-20T10:00') {
  await page.goto(GAME_URL);
  await page.evaluate(() => localStorage.clear());
  await page.goto(GAME_URL);
  await page.evaluate(t => { __st.setTime(t); __st.S.last = __st.now(); __st.S.created = __st.now(); __st.pause(true); __st.step(0.2); }, time);
}

/** From the egg to a freshly hatched baby (4 calendar days), then into the game. Returns nothing. */
async function hatchQuick(page) {
  await page.evaluate(() => {
    __st.enterGame(); __st.step(1);
    for (let d = 0; d < 3; d++) { __st.eggRub(120); __st.travel(24); }
    __st.eggRub(16); __st.step(2.5); __st.step(3.5);
    __st.S.last = __st.now();
  });
}

/** Sets the local clock time of the current game day (keeps the date), e.g. at(page, 19, 45). */
function at(page, h, m = 0) {
  return page.evaluate(([h, m]) => {
    const d = new Date(__st.now()); d.setHours(h, m, 0, 0);
    __st.clock.offset = d.getTime() - Date.now();
    __st.S.last = Math.min(__st.S.last, __st.now());
  }, [h, m]);
}

module.exports = { chromium, GAME_URL, createReport, openPage, loadClean, hatchQuick, at };
