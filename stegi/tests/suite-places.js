/* suite-places.js – 0.2: smaller baby and longer plates, walking (also while the app is closed),
 * finding places, two a day, the places list, jumping to a found place, fireflies, saving. */
const { chromium, createReport, openPage, loadClean, hatchQuick, at, GAME_URL } = require('./lib');

(async () => {
  const R = createReport();
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser, { scale: 2 });
  const ev = (f, a) => page.evaluate(f, a);
  const near = (a, b, eps = 0.5) => Math.abs(a - b) <= eps;

  await loadClean(page);
  await hatchQuick(page);
  await at(page, 9, 0);
  await ev(() => { __st.S.last = __st.now(); for (const k in __st.S.needs) __st.S.needs[k] = 90; __st.step(0.6); });

  // ---------- size and plates ----------
  const size = await ev(() => {
    const w = () => __st.pos().box.w;
    const baby = w();
    __st.S.hatchDay -= 29; __st.S.stageSeen = 4; __st.step(0.2);
    const grown = w();
    __st.S.hatchDay += 29; __st.step(0.2);
    return { baby, grown, ratio: baby / grown };
  });
  R.ok(near(size.ratio, 0.385, 0.03), 'Baby ist 38,5 % so groß wie der große Stego (30 % kleiner als in 0.1)', size.ratio.toFixed(3));

  // ---------- start walking ----------
  let st = await ev(() => { document.getElementById('act-walk').click(); __st.step(0.6); return { walk: __st.S.walk, vis: __st.visible(), walkbar: !document.getElementById('walkbar').hidden, walkBtn: !document.getElementById('act-walk').hidden }; });
  R.ok(st.walk && st.walk.sec < 2 && st.walkbar && !st.walkBtn, 'Wandern-Knopf: er läuft los, Fortschrittsbalken statt Knopf', JSON.stringify(st.walk));
  await page.screenshot({ path: 'places-walking.png' });
  st = await ev(() => { const a = __st.walkFx.scroll; __st.step(2); return { moved: __st.walkFx.scroll - a, look: __st.game.stegoInfo && true }; });
  R.ok(st.moved > 40, 'Unterwegs zieht die Landschaft vorbei', st.moved.toFixed(0) + ' px');
  st = await ev(() => { __st.S.poops = [{ x: 0.2 }]; __st.S.walk = null; __st.startWalk(); return __st.S.poops.length; });
  R.ok(st === 0, 'Beim Losgehen bleibt Kacka am alten Ort zurück');

  // ---------- time passes with the app closed ----------
  st = await ev(() => { __st.travel(0.5); __st.step(0.1); return { sec: __st.S.walk && __st.S.walk.sec, place: __st.S.place }; });
  R.ok(st.sec > 1790 && st.sec < 1815 && st.place === 'meadow', 'Nach 30 Minuten (App zu) halb angekommen', JSON.stringify(st));
  st = await ev(() => { __st.travel(0.55); __st.step(0.1); return { walk: __st.S.walk, place: __st.S.place, found: __st.S.found.length, mode: __st.game.mode, banner: !document.getElementById('banner').hidden }; });
  R.ok(!st.walk && st.place !== 'meadow' && st.found === 3 && st.mode === 'party' && st.banner, 'Nach 1 Stunde: neuer Ort entdeckt, Fest und Bild mit Namen', JSON.stringify(st));
  await page.screenshot({ path: 'places-new.png' });
  await ev(() => __st.step(3.5));

  // ---------- night pauses the walk ----------
  await at(page, 19, 30);
  st = await ev(() => { __st.S.last = __st.now(); __st.S.walk = { sec: 0 }; __st.travel(11.5); __st.step(0.1); return __st.S.walk && __st.S.walk.sec; });
  R.ok(near(st, 1800, 15), 'Nachts ruht die Wanderung (19:30 → 7:00 = 30 wache Minuten)', st);
  await ev(() => { __st.S.walk = null; __st.step(0.2); });

  // ---------- two new places per day ----------
  await at(page, 9, 0);
  st = await ev(() => {
    __st.S.last = __st.now();
    const out = [];
    for (let i = 0; i < 3; i++) { const before = __st.S.found.length; __st.startWalk(); const started = !!__st.S.walk; if (started) { __st.travel(1.01); __st.step(0.1); __st.step(3.5); } out.push(started + ':' + (__st.S.found.length - before)); }
    return { out, today: __st.foundToday(), refused: __st.pet.refuseT > 0, limit: __st.walkLimitReached() };
  });
  R.ok(st.out.join() === 'true:1,true:1,false:0' && st.today === 2 && st.limit, 'Höchstens 2 neue Orte pro Tag, danach schüttelt er den Kopf', JSON.stringify(st));
  st = await ev(() => { __st.travel(24); __st.S.last = __st.now(); __st.step(0.1); return { limit: __st.walkLimitReached(), today: __st.foundToday() }; });
  R.ok(!st.limit && st.today === 0, 'Am nächsten Tag geht es weiter', JSON.stringify(st));

  // ---------- places list ----------
  st = await ev(() => { document.getElementById('b-map').click(); const tiles = [...document.querySelectorAll('#placelist .ptile')]; return { n: tiles.length, locked: tiles.filter(t => t.classList.contains('locked')).length, here: tiles.filter(t => t.classList.contains('here')).length, count: document.getElementById('placecount').textContent, open: __st.visible().places }; });
  R.ok(st.n === 31 && st.locked === 26 && st.here === 1 && st.count === '4 von 30 entdeckt', 'Orte-Liste: Zuhause + 30 Orte, 26 mit Fragezeichen, aktueller Ort markiert', JSON.stringify(st));
  await page.screenshot({ path: 'places-list.png' });
  st = await ev(() => { const locked = document.querySelector('#placelist .ptile.locked'); const before = __st.S.place; locked.click(); return before === __st.S.place && !document.getElementById('places').hidden; });
  R.ok(st, 'Fragezeichen antippen: nichts passiert (wackelt nur)');
  st = await ev(() => { __st.S.walk = { sec: 100 }; document.getElementById('pt-meadow').click(); __st.step(0.3); return { place: __st.S.place, walk: __st.S.walk, open: !document.getElementById('places').hidden }; });
  R.ok(st.place === 'meadow' && !st.walk && !st.open, 'Entdeckten Ort antippen: er ist sofort dort (Wanderung endet)', JSON.stringify(st));
  st = await ev(() => { document.getElementById('b-map').click(); const r = window.__back(); return [r, document.getElementById('places').hidden]; });
  R.ok(st[0] && st[1], 'Zurück-Taste schließt die Orte-Liste');

  // ---------- all places found ----------
  st = await ev(() => {
    __st.S.found = __st.PLACES.map(p => ({ id: p.id, day: -1 }));
    __st.S.place = 'beach';
    __st.step(3.5);
    const mode = __st.game.mode;
    __st.startWalk(); __st.travel(1.01); __st.step(0.1);
    return { mode, place: __st.S.place, found: __st.S.found.length, newPlace: __st.S.newPlace, limit: __st.walkLimitReached() };
  });
  R.ok(st.place !== 'beach' && st.found === 31 && !st.limit, 'Alles entdeckt: er wandert zu einem bekannten Ort, ohne Tagesgrenze', JSON.stringify(st));

  // ---------- every place draws without errors ----------
  st = await ev(() => { let bad = []; for (const p of __st.PLACES) { try { __st.S.place = p.id; __st.step(0.05); const c = __st.placePicture(p.id, 160, 100); if (!c.width) bad.push(p.id); } catch (e) { bad.push(p.id + ':' + e.message); } } return bad; });
  R.ok(st.length === 0, 'Alle 30 Orte zeichnen fehlerfrei (Spiel und Liste)', st.join(', '));

  // ---------- fireflies ----------
  st = await ev(() => {
    const t = (h, m) => { const d = new Date(__st.now()); d.setHours(h, m, 0, 0); return d.getTime(); };
    const dayEven = __st.dayIndex(t(12, 0)) % 2 === 0;
    return {
      noon: __st.firefliesNow(t(12, 0), 'jungle', 'sun'), jungle19: __st.firefliesNow(t(19, 5), 'jungle', 'sun'),
      jungle23: __st.firefliesNow(t(23, 0), 'jungle', 'sun'), cave: __st.firefliesNow(t(23, 0), 'cave', 'sun'),
      rain: __st.firefliesNow(t(23, 0), 'jungle', 'rain'), beach: __st.firefliesNow(t(23, 0), 'beach', 'sun') === dayEven,
    };
  });
  R.ok(!st.noon && st.jungle19 && st.jungle23 && !st.cave && !st.rain && st.beach, 'Glühwürmchen: ab 19:00, an Wald/Wasser jede Nacht, sonst jede 2. Nacht, nicht in der Höhle', JSON.stringify(st));
  await at(page, 21, 0);
  await ev(() => { __st.S.place = 'pond'; __st.S.last = __st.now(); __st.step(2); });
  await page.screenshot({ path: 'places-fireflies.png' });

  // ---------- saving ----------
  await at(page, 10, 0);
  await ev(() => { __st.S.place = 'volcano'; __st.S.walk = { sec: 1234 }; __st.S.last = __st.now(); __st.save(); });
  const offset = await ev(() => __st.clock.offset);
  await page.addInitScript(o => { window.__stOffset = o; }, offset);
  await page.goto(GAME_URL);
  st = await ev(() => { __st.pause(true); return { place: __st.S.place, walk: __st.S.walk, found: __st.S.found.length }; });
  R.ok(st.place === 'volcano' && st.walk && near(st.walk.sec, 1234, 3) && st.found === 31, 'Ort, Wanderung und Fundliste werden gespeichert', JSON.stringify(st));
  st = await ev(() => { const s = __st.sanitizeSave({ place: 'mars', found: [{ id: 'jungle', day: 3 }, { id: 'jungle' }, { id: 'xyz' }], walk: { sec: 99999 }, newPlace: 'beach' }, __st.now()); return { place: s.place, found: s.found.map(f => f.id).join(), walk: s.walk.sec, np: s.newPlace }; });
  R.ok(st.place === 'meadow' && st.found === 'meadow,jungle,home' && st.walk === 3600 && st.np === null, 'Kaputte Orts-Daten werden repariert', JSON.stringify(st));

  R.ok(errors.length === 0, 'Keine Fehler in der Konsole', errors.join(' | '));
  await browser.close();
  R.finish();
})();
