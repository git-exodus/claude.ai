/* suite-dev.js – 0.4: test mode in the settings. Separate test game (the real one stays untouched),
 * stage and day buttons, fast time, time jumps, helpers, weather, reset of the test game. */
const { chromium, createReport, openPage, loadClean, hatchQuick, at, GAME_URL } = require('./lib');

(async () => {
  const R = createReport();
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser, { scale: 2 });
  const ev = (f, a) => page.evaluate(f, a);
  const near = (a, b, eps = 0.5) => Math.abs(a - b) <= eps;
  const realRaw = () => ev(() => localStorage.getItem('stegi-v1'));

  // ---------- the real game ----------
  await loadClean(page);
  await hatchQuick(page);
  await at(page, 10, 0);
  await ev(() => { __st.S.last = __st.now(); __st.S.name = 'Echt'; for (const k in __st.S.needs) __st.S.needs[k] = 77; __st.save(); __st.step(0.3); });
  const realOffset = await ev(() => __st.clock.offset);

  // ---------- switch on in the settings ----------
  await ev(() => { document.getElementById('settings').hidden = false; });
  await page.click('#s-dev');
  // Switching saves the real game once (with the current time); from now on it must not change.
  const real0 = JSON.parse(await realRaw());
  let st = await ev(() => ({ on: __st.dev.on, vis: __st.visible(), badge: document.getElementById('devbadge').textContent, name: __st.S.name, hatched: __st.state().hatched }));
  R.ok(st.on && st.vis.devpanel && st.vis.devbadge && st.badge === 'TEST' && !st.vis.settings, 'Testmodus an: Test-Werkzeuge offen, rotes TEST-Schild', JSON.stringify({ badge: st.badge }));
  R.ok(st.name === 'Stegi' && !st.hatched, 'Eigener Test-Spielstand (beginnt als Ei)', JSON.stringify(st.name));
  await page.screenshot({ path: 'dev-panel.png' });

  // ---------- stages ----------
  st = await ev(() => { const out = []; for (let i = 0; i < 5; i++) { __st.devStage(i); __st.step(0.3); out.push(__st.stageAt() + ':' + __st.lifeDay() + ':' + __st.game.mode); } return out.join(' '); });
  R.ok(st === '0:1:idle 1:6:idle 2:13:idle 3:23:idle 4:30:idle', 'Stufen-Knöpfe: Baby, Kind, Jugendlicher, Fast groß, Ganz groß (ohne Fest-Wiederholung)', st);
  await page.click('#dev-close');
  await ev(() => __st.step(0.5));
  await page.screenshot({ path: 'dev-grown.png' });
  await ev(() => __st.openDev());
  await page.fill('#dv-day', '15');
  await page.dispatchEvent('#dv-day', 'input');
  st = await ev(() => ({ day: __st.lifeDay(), label: document.getElementById('dv-dayval').textContent, on: document.querySelector('#dv-st-2').classList.contains('on') }));
  R.ok(st.day === 15 && st.label === '15' && st.on, 'Schieberegler: Tag 15 (Jugendlicher markiert)', JSON.stringify(st));
  st = await ev(() => { __st.devEgg(2); const a = { ...__st.S.egg, hatched: __st.state().hatched }; __st.eggRub(121); return { a, cracks: __st.S.egg.cracks }; });
  R.ok(!st.a.hatched && st.a.cracks === 2 && st.cracks === 3, 'Ei mit 2 Rissen; heute streicheln gibt den 3.', JSON.stringify(st));
  st = await ev(() => { __st.devEgg('hatchday'); const ph = __st.eggPhase(); __st.enterGame(); __st.step(1); __st.eggRub(16); __st.step(2.5); return { ph, hatched: __st.state().hatched }; });
  R.ok(st.ph === 'hatchday' && st.hatched, 'Schlüpftag-Knopf: Ei schlüpft nach 15 s Streicheln', JSON.stringify(st));
  await ev(() => __st.step(3.5));

  // ---------- fast time ----------
  await page.click('#dv-sp-600');
  st = await ev(() => {
    for (const k in __st.S.needs) __st.S.needs[k] = 100;
    __st.S.last = __st.now();
    const t0 = __st.now(); __st.step(1); const t1 = __st.now();
    return { sec: (t1 - t0) / 1000, food: __st.S.needs.food, badge: document.getElementById('devbadge').textContent, on: document.querySelector('#dv-sp-600').classList.contains('on') };
  });
  const asleep = await ev(() => __st.isAsleep());
  R.ok(near(st.sec, 600, 15) && st.badge === 'TEST · 600×' && st.on, '600×: 1 Sekunde = 10 Minuten, Schild zeigt das Tempo', JSON.stringify(st));
  R.ok(asleep ? near(st.food, 100, 0.1) : near(st.food, 100 - 600 / 288, 0.3), 'Bedürfnisse sinken im Zeitraffer mit', st.food.toFixed(2));
  await page.click('#dv-sp-1');
  st = await ev(() => { const t0 = __st.now(); __st.step(1); return (__st.now() - t0) / 1000; });
  R.ok(st < 3, 'Zurück auf 1×: normale Zeit', st.toFixed(2));

  // ---------- time jumps ----------
  st = await ev(() => {
    const d0 = __st.dayIndex(__st.now()), t0 = __st.now();
    __st.devTimeOfDay(7 * 60); const a = new Date(__st.now());
    __st.devTimeOfDay(19 * 60 + 45); const b = new Date(__st.now());
    __st.devJump(24); const c = __st.dayIndex(__st.now());
    return { forward: a.getTime() > t0, a: a.getHours() + ':' + a.getMinutes(), b: b.getHours() + ':' + b.getMinutes(), days: c - d0 };
  });
  R.ok(st.forward && st.a === '7:0' && st.b === '19:45' && st.days >= 2, 'Zeitsprünge: Morgen 7:00, Abend 19:45, +1 Tag (immer vorwärts)', JSON.stringify(st));
  await ev(() => { __st.S.last = __st.now(); __st.step(0.6); });
  R.ok(await ev(() => __st.visible().bed), 'Abend 19:45: der Licht-aus-Knopf erscheint');
  await ev(() => { __st.devTimeOfDay(12 * 60); __st.S.last = __st.now(); __st.step(0.3); });

  // ---------- helpers ----------
  st = await ev(() => { __st.devNeeds(15); const low = { ...__st.S.needs }; __st.devNeeds(100); return { low: Object.values(low).every(v => v === 15), full: Object.values(__st.S.needs).every(v => v === 100) }; });
  R.ok(st.low && st.full, 'Helfer: alles voll / fast leer', JSON.stringify(st));
  st = await ev(() => { const n = __st.S.found.length, p = __st.S.place; __st.devArrive(); __st.devArrive(); __st.devArrive(); return { n0: n, n: __st.S.found.length, p0: p, p: __st.S.place }; });
  R.ok(st.n === st.n0 + 3 && st.p !== st.p0, 'Sofort ankommen: neuer Ort, auch über die 2-pro-Tag-Grenze', JSON.stringify(st));
  await ev(() => __st.step(4));
  st = await ev(() => { __st.devAllPlaces(); __st.devAllGifts(); return [__st.S.found.length, __st.S.giftSeen]; });
  R.ok(st[0] === 30 && st[1] === 12, 'Alle Orte und alle Geschenke freigeschaltet', JSON.stringify(st));
  st = await ev(() => { __st.devVisit(); const a = __st.game.visit && __st.game.visit.kind; __st.devVisit(); return [a, __st.game.visit && __st.game.visit.kind]; });
  R.ok(st[0] === 'trex' && st[1] === 'ptero', 'Besuch jetzt (bei jedem Druck der nächste Freund)', JSON.stringify(st));
  await ev(() => { __st.game.visit = null; });
  await ev(() => __st.openDev());
  await ev(() => { __st.S.place = 'meadow'; });   // dry places stay sunny
  await page.click('#dv-w-snow');
  st = await ev(() => ({ w: __st.currentWeather(), on: document.querySelector('#dv-w-snow').classList.contains('on') }));
  R.ok(st.w === 'snow' && st.on, 'Wetter wählen: Schnee', JSON.stringify(st));
  await page.click('#dv-w-auto');
  R.ok((await ev(() => __st.game.weatherTest)) === null, 'Wetter „Normal“: wieder das Wetter des Tages');
  await page.click('#dv-w-rain');
  R.ok((await ev(() => [window.__back(), __st.visible().devpanel].join())) === 'true,false', 'Zurück-Taste schließt die Test-Werkzeuge');

  // ---------- the real game is untouched ----------
  R.ok((await realRaw()) === JSON.stringify(real0), 'Der echte Spielstand wurde nicht verändert');
  const testOffset = await ev(() => __st.clock.offset);
  await ev(() => { document.getElementById('settings').hidden = false; });
  await page.click('#s-dev');
  st = await ev(() => ({ on: __st.dev.on, name: __st.S.name, food: __st.S.needs.food, off: __st.clock.offset, w: __st.game.weatherTest, badge: __st.visible().devbadge, hatched: __st.state().hatched }));
  R.ok(!st.on && st.name === 'Echt' && near(st.food, 77, 1) && st.off === realOffset && st.w === null && !st.badge && st.hatched,
    'Testmodus aus: echter Stegi zurück (Name, Werte, Uhr, kein Testwetter, kein Schild)', JSON.stringify(st));
  await ev(() => { document.getElementById('settings').hidden = false; });
  await page.click('#s-dev');
  st = await ev(() => ({ found: __st.S.found.length, gifts: __st.S.giftSeen, off: __st.clock.offset }));
  R.ok(st.found === 30 && st.gifts === 12 && near(st.off, testOffset, 5000), 'Wieder an: Test-Stegi und Testuhr sind noch da', JSON.stringify({ found: st.found, gifts: st.gifts }));

  // ---------- reset the test game ----------
  await ev(() => __st.openDev());
  await page.click('#dv-reset');
  R.ok(await ev(() => !document.getElementById('dev-confirm').hidden), 'Test-Spielstand zurücksetzen fragt nach');
  await page.click('#dvc-yes');
  st = await ev(() => ({ hatched: __st.state().hatched, found: __st.S.found.length }));
  R.ok(!st.hatched && st.found === 1, 'Test-Spielstand ist wieder ein Ei', JSON.stringify(st));
  R.ok((await realRaw()) === JSON.stringify(real0), 'Der echte Spielstand ist weiterhin unverändert');

  // ---------- a restart always starts the real game ----------
  await page.goto(GAME_URL);
  st = await ev(() => ({ on: __st.dev.on, name: __st.S.name, badge: __st.visible().devbadge }));
  R.ok(!st.on && st.name === 'Echt' && !st.badge, 'App neu gestartet: immer der echte Spielstand', JSON.stringify(st));

  R.ok(errors.length === 0, 'Keine Fehler in der Konsole', errors.join(' | '));
  await browser.close();
  R.finish();
})();
