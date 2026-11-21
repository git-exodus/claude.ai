/* suite-check.js – 0.12.8: the overall check ("Gesamtprüfung"). Unlike the other suites the game runs with its
 * real frame loop here (not paused), like on the phone. After every step it checks that frames keep coming and
 * that no error appeared. Found the freeze of 0.12.7 (test mode: from the egg straight to a stage at night).
 *   1. every test-mode button, by day and by night; freshly opened egg at night straight to a stage
 *   2. 150 random test-mode steps mixed with activities and places (fixed seed)
 *   3. the main things a child does: feed, drink, bath, teeth, all games, walk, places, home, shop,
 *      stickers, wardrobe, album, camera, visit, bedtime, back to the menu */
const { chromium, createReport, openPage, GAME_URL } = require('./lib');

(async () => {
  const R = createReport();
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser);
  const ev = (f, a) => page.evaluate(f, a);
  /** Do frames still come (6 frames within 4 s)? */
  const alive = () => Promise.race([
    ev(() => new Promise(r => { let k = 0; const f = () => (++k < 6 ? requestAnimationFrame(f) : r(true)); requestAnimationFrame(f); })),
    new Promise(r => setTimeout(() => r(false), 4000))]);
  const clickId = id => ev(i => { const el = document.getElementById(i); if (el) el.click(); return !!el; }, id);
  const dev = id => ev(i => { __st.openDev(); document.getElementById(i).click(); }, id);

  await page.goto(GAME_URL); await ev(() => localStorage.clear()); await page.goto(GAME_URL);
  await page.waitForTimeout(400);
  await ev(() => { __st.setTestMode(true); __st.enterGame(); });
  await page.waitForTimeout(900);

  // ---------- 1. every test-mode button, by day and by night ----------
  const ids = await ev(() => { __st.openDev(); return [...document.querySelectorAll('#dev-body button')].map(b => b.id).filter(i => i !== 'dv-reset' && !i.startsWith('dv-sp-')); });
  for (const time of ['dv-t12', 'dv-t22']) {
    const bad = [];
    for (const id of ids) {
      await dev(time); await dev(id);
      if (!(await alive()) || errors.length) { bad.push(id + (errors.length ? ': ' + errors[0] : ': steht')); errors.length = 0; }
    }
    R.ok(bad.length === 0, 'Alle ' + ids.length + ' Testmodus-Knöpfe ' + (time === 'dv-t12' ? 'am Tag' : 'in der Nacht') + ': kein Fehler, kein Stehenbleiben', bad.join(' | '));
  }
  // Freshly opened (he has not been drawn yet), as an egg, at night: straight to a stage. This froze in 0.12.7.
  const fresh = [];
  for (const id of ['dv-st-0', 'dv-st-1', 'dv-st-2', 'dv-st-3', 'dv-st-4', 'dv-sib-egg', 'dv-sib-born']) {
    await page.goto(GAME_URL); await page.waitForTimeout(300);
    await ev(() => { __st.setTestMode(true); __st.devEgg(2); __st.enterGame(); }); await page.waitForTimeout(800);
    await dev('dv-t22'); await dev(id);
    if (!(await alive()) || errors.length) { fresh.push(id + (errors.length ? ': ' + errors[0] : ': steht')); errors.length = 0; }
  }
  R.ok(fresh.length === 0, 'Frisch geöffnet, Ei, nachts direkt eine Stufe wählen: kein Fehler, kein Stehenbleiben', fresh.join(' | '));
  const speeds = await ev(() => [...document.querySelectorAll('#dev-body button')].map(b => b.id).filter(i => i.startsWith('dv-sp-')));
  let badSp = [];
  for (const id of speeds) { await dev('dv-st-2'); await dev(id); await page.waitForTimeout(600); if (!(await alive()) || errors.length) { badSp.push(id); errors.length = 0; } }
  await dev('dv-sp-1');
  R.ok(badSp.length === 0, 'Zeitraffer-Stufen laufen', badSp.join(' '));

  // ---------- 2. random steps ----------
  let seed = 42; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const modes = ['ball', 'music', 'train', 'eat', 'bath', 'hide', 'bubbles'];
  let stuck = '';
  for (let n = 0; n < 150 && !stuck; n++) {
    const id = ids[Math.floor(rand() * ids.length)];
    await dev(id);
    if (rand() < 0.4) { const m = modes[Math.floor(rand() * modes.length)]; await ev(m => { __st.closeDev(); __st.startMode(m); }, m); }
    if (rand() < 0.2) await ev(() => { const pl = __st.S.found.map(f => f.id); __st.goPlace(pl[Math.floor(Math.random() * pl.length)]); });
    if (!(await alive()) || errors.length) stuck = 'Schritt ' + n + ' (' + id + '): ' + (errors[0] || 'steht');
  }
  R.ok(!stuck, '150 zufällige Schritte (Testmodus, Spiele, Orte): kein Fehler, kein Stehenbleiben', stuck);
  errors.length = 0;

  // ---------- 3. what a child does ----------
  await dev('dv-st-2'); await dev('dv-t12'); await dev('dv-full'); await dev('dv-w-sun');
  await ev(() => { __st.closeDev(); __st.endMode(); __st.goPlace('meadow'); __st.S.stars = 100; });
  await page.waitForTimeout(500);
  const steps = [
    ['Füttern', async () => { await clickId('act-food'); await page.waitForTimeout(300); await ev(() => __st.offerFood('apple', 100, 600)); await page.waitForTimeout(1600); await clickId('close'); }],
    ['Trinken', async () => { await clickId('act-drink'); await page.waitForTimeout(3000); }],
    ['Baden', async () => { await clickId('act-bath'); await page.waitForTimeout(800); await clickId('close'); }],
    ['Zähneputzen', async () => { await clickId('act-brush'); await page.waitForTimeout(800); await clickId('close'); }],
    ['Alle Spiele', async () => { for (const p of ['ball', 'hide', 'music', 'train', 'bubbles', 'kite']) { await clickId('act-play'); await page.waitForTimeout(200); await clickId('play-' + p); await page.waitForTimeout(700); if (p === 'music') { await clickId('mel-btn'); await page.waitForTimeout(800); } await clickId('close'); await page.waitForTimeout(300); } }],
    ['Wandern und ankommen', async () => { await clickId('act-walk'); await page.waitForTimeout(1200); await dev('dv-arrive'); await ev(() => __st.closeDev()); await page.waitForTimeout(3500); }],
    ['Orte-Liste, nach Hause', async () => { await clickId('b-map'); await page.waitForTimeout(300); await clickId('pt-home'); await page.waitForTimeout(600); }],
    ['Laden und kaufen', async () => { await clickId('b-shop'); await page.waitForTimeout(300); await clickId('si-toybox'); await page.waitForTimeout(300); await clickId('sh-close'); }],
    ['Sticker-Heft', async () => { await clickId('b-stickers'); await page.waitForTimeout(300); await clickId('st-close'); }],
    ['Kleiderschrank', async () => { await clickId('b-wear'); await page.waitForTimeout(300); await clickId('w-close'); }],
    ['Kamera und Album', async () => { await clickId('b-camera'); await page.waitForTimeout(1200); await clickId('b-album'); await page.waitForTimeout(400); await clickId('a-close'); }],
    ['Besuch', async () => { await dev('dv-visit'); await ev(() => __st.closeDev()); await page.waitForTimeout(3000); }],
    ['Geschwisterchen', async () => { await dev('dv-sib-egg'); await page.waitForTimeout(500); await dev('dv-sib-born'); await ev(() => __st.closeDev()); await page.waitForTimeout(1500); }],
    ['Schlafenszeit', async () => { await dev('dv-t1945'); await ev(() => __st.closeDev()); await page.waitForTimeout(400); await clickId('act-bed'); await page.waitForTimeout(2500); }],
    ['Zurück ins Menü und wieder rein', async () => { await ev(() => window.__back()); await page.waitForTimeout(1000); await ev(() => __st.enterGame()); await page.waitForTimeout(1000); }],
  ];
  for (const [name, run] of steps) {
    let err = '';
    try { await run(); } catch (e) { err = String(e).slice(0, 120); }
    const ok = await alive();
    R.ok(ok && !err && errors.length === 0, name + ': läuft ohne Fehler', err || errors.join(' | ') || (ok ? '' : 'steht'));
    errors.length = 0;
  }
  await ev(() => __st.setTestMode(false));
  await browser.close();
  R.finish();
})();
