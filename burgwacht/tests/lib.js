/*
 * Shared helpers for the Playwright test suites.
 *
 * Every suite drives the real game page in headless Chromium:
 *   - It loads the standalone page that goes into the APK
 *     (android/app/src/main/assets/index.html), so build.py must have run first.
 *     tests/run.sh does that.
 *   - It talks to the game through window.__bw (see src/js/99-debug.js), e.g.
 *     __bw.step(seconds) to simulate game time without waiting for real time.
 *   - Output is one line per check: "PASS <what>  [<detail>]" or "FAIL ...",
 *     then "ALLE TESTS BESTANDEN" or "FEHLER: <n>". run.sh counts these lines.
 *
 * Screenshots the suites take are written to the current directory, so run the
 * suites from a scratch directory, not from inside the repository.
 */
const path = require('path');
const { chromium } = require('playwright');

/** file:// URL of the standalone game page. */
const GAME_URL = 'file://' + path.resolve(__dirname, '../android/app/src/main/assets/index.html');

/** Collects PASS/FAIL lines and prints the summary line at the end. */
function createReport() {
  let fails = 0;
  return {
    /** Records one check: `condition` true = PASS. `detail` is printed in brackets to help debugging. */
    ok(condition, message, detail = '') {
      console.log((condition ? 'PASS ' : 'FAIL ') + message + (detail !== '' ? '  [' + detail + ']' : ''));
      if (!condition) fails++;
    },
    finish() {
      console.log(fails ? 'FEHLER: ' + fails : 'ALLE TESTS BESTANDEN');
    },
  };
}

/**
 * Opens a fresh browser context and page on a 360x740 phone-sized viewport.
 *   quiet   true sets window.__bwQuiet before the game loads: no achievements,
 *           chests, skill hint, chest animation or music (see debugFlags in
 *           src/js/02-config.js), so they cannot disturb what a suite measures.
 *   scale   deviceScaleFactor; 1 is enough unless screenshots are looked at closely.
 * Page errors and console errors are collected in the returned `errors` array;
 * every suite ends with a check that it is empty.
 */
async function openPage(browser, { quiet = true, scale = 1 } = {}) {
  const context = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: scale });
  if (quiet) await context.addInitScript(() => { window.__bwQuiet = true; });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return { context, page, errors };
}

/** Loads the game with empty storage (two loads: the first clears localStorage, the second starts clean). */
async function loadClean(page) {
  await page.goto(GAME_URL);
  await page.evaluate(() => localStorage.clear());
  await page.goto(GAME_URL);
  await page.waitForTimeout(200);
}

/** Closes the generic dialog (greeting, hints, chest choice) with its first button, if one is open. */
async function dismissDialog(page) {
  if (await page.evaluate(() => !document.getElementById('dialog').hidden)) await page.click('#dlg-0');
}

/** From the main menu: "Spiel starten" -> slot 1 -> close the greeting. */
async function startNewGame(page) {
  await page.click('#m-start');
  await page.click('#slot-0');
  await dismissDialog(page);
}

/**
 * Text of the open shop, one line per tab:
 *   "weapons: Schwert → 5 Gold(aus) | Morgenstern → 10 Gold(aus) | ..."
 * "(aus)" marks a disabled buy button. Clicking the tabs re-renders the shop.
 */
function shopList(page, tabs = ['weapons', 'castle', 'troops', 'boni']) {
  return page.evaluate(tabs => tabs.map(tab => {
    document.getElementById('tab-' + tab).click();
    const offers = [...document.querySelectorAll('#items .item')].map(card => {
      const button = card.querySelector('button');
      return card.querySelector('b').textContent + ' → ' + button.textContent + (button.disabled ? '(aus)' : '');
    });
    return tab + ': ' + offers.join(' | ');
  }).join('\n'), tabs);
}

/** Buys shop offer `id` (DOM id "buy-<id>") on tab `tab`. */
async function buy(page, tab, id) {
  await page.click('#tab-' + tab);
  await page.click('#buy-' + id);
}

module.exports = { chromium, GAME_URL, createReport, openPage, loadClean, dismissDialog, startNewGame, shopList, buy };
