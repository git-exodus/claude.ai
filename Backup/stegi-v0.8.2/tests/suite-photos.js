/* suite-photos.js – 0.5: photo diary (2 own photos a day), milestones (hatching, stages, new places),
 * flying preview, deleting by holding, test album, and a device that refuses to store data. */
const { chromium, createReport, openPage, loadClean, hatchQuick, at, GAME_URL } = require('./lib');

(async () => {
  const R = createReport();
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser, { scale: 2 });
  const ev = (f, a) => page.evaluate(f, a);
  const shot = n => page.screenshot({ path: n + '.png' });

  await loadClean(page);
  await hatchQuick(page);
  await at(page, 10, 0);
  await ev(() => { __st.S.last = __st.now(); for (const k in __st.S.needs) __st.S.needs[k] = 80; __st.step(0.5); });

  // ---------- two own photos a day ----------
  let g = await ev(() => __st.photos.map(p => p.kind).join());
  R.ok(g === 'hatch', 'Meilenstein-Foto beim Schlüpfen', g);
  await page.click('#b-camera');
  await page.waitForTimeout(150);
  g = await ev(() => ({ fly: document.querySelectorAll('.flyphoto').length, n: __st.ownToday() }));
  R.ok(g.fly === 1 && g.n === 1, 'Eigenes Foto: kleines Bild fliegt zum Album', JSON.stringify(g));
  await shot('photos-fly');
  await ev(() => __st.step(0.3));
  await page.click('#b-camera');
  await ev(() => __st.step(0.3));
  g = await ev(() => ({ n: __st.ownToday(), full: __st.cameraFull(), grey: document.getElementById('b-camera').classList.contains('full'), cnt: document.querySelector('#b-camera .cnt').textContent }));
  R.ok(g.n === 2 && g.full && g.grey && g.cnt === '2/2', 'Nach 2 Fotos: Kamera grau mit „2/2“', JSON.stringify(g));
  await page.click('#b-camera');
  await ev(() => __st.step(0.3));
  g = await ev(() => ({ n: __st.ownToday(), refuse: __st.soundLog.slice(-3).some(s => s.name === 'refuse') }));
  R.ok(g.n === 2 && g.refuse, 'Drittes Foto am selben Tag geht nicht', JSON.stringify(g));
  g = await ev(() => { __st.travel(24); __st.S.last = __st.now(); __st.step(0.6); const free = !__st.cameraFull(); __st.cameraTap(); __st.step(0.2); return { free, n: __st.ownToday(), all: __st.photos.filter(p => !p.auto).length }; });
  R.ok(g.free && g.n === 1 && g.all === 3, 'Am nächsten Tag wieder 2 Fotos', JSON.stringify(g));

  // ---------- milestones: stage and new place ----------
  g = await ev(() => {
    __st.S.hatchDay -= 5; __st.step(2.5); __st.step(3);
    __st.startWalk(); __st.travel(1.01); __st.step(0.2); __st.step(2.5); __st.step(3);
    return __st.photos.filter(p => p.auto).map(p => p.kind + (p.label ? ':' + p.label : '') + (p.kind === 'place' ? ':' + p.place : '')).join(', ');
  });
  R.ok(/^hatch, stage:Kind, place:\w+$/.test(g), 'Meilensteine: Schlüpfen, neue Stufe (Kind), neuer Ort', g);

  // ---------- album with two tabs ----------
  await page.click('#b-album');
  g = await ev(() => ({ title: document.getElementById('a-title').textContent, n: document.querySelectorAll('#photolist .photo').length, cap: document.querySelector('#photolist .photo span').textContent, count: document.getElementById('photocount').textContent }));
  R.ok(g.title === 'Fotoalbum' && g.n === 3 && /^Tag \d+$/.test(g.cap) && g.count === '3 Fotos · heute noch 1 Foto', 'Fototagebuch: eigene Fotos mit Tag, „heute noch 1 Foto“', JSON.stringify(g));
  await shot('photos-diary');
  await page.click('#at-mile');
  g = await ev(() => [...document.querySelectorAll('#photolist .photo span')].map(s => s.textContent));
  R.ok(g.length === 3 && /^Tag 1 · Geschlüpft$/.test(g[2]) && /^Tag 7 · Kind$/.test(g[1]) && /^Tag 7 · \S/.test(g[0]), 'Meilensteine: Tag und was passiert ist', JSON.stringify(g));
  await shot('photos-milestones');
  await page.click('#photolist .photo');
  R.ok(await ev(() => document.getElementById('pv-delete').hidden), 'Meilensteine kann man nicht löschen');
  await ev(() => { document.getElementById('photoview').hidden = true; });
  await page.click('#at-diary');

  // ---------- delete an own photo by holding ----------
  await page.click('#photolist .photo');
  R.ok(await ev(() => !document.getElementById('pv-delete').hidden && /^Tag \d+ · \d+\.\d+\.\d{4}/.test(document.getElementById('pv-text').textContent)), 'Großes Foto: Tag, Datum, Löschen-Knopf');
  await shot('photos-view');
  const del = await page.locator('#pv-delete').boundingBox();
  await page.mouse.move(del.x + 20, del.y + 10);
  await page.mouse.down(); await page.waitForTimeout(1000); await page.mouse.up();
  R.ok((await ev(() => __st.photos.filter(p => !p.auto).length)) === 3, 'Löschen kurz gedrückt: nichts passiert');
  await page.mouse.down(); await page.waitForTimeout(3300); await page.mouse.up();
  g = await ev(() => ({ own: __st.photos.filter(p => !p.auto).length, stored: JSON.parse(localStorage.getItem('stegi-photos-v1')).length, view: __st.visible().photoview }));
  R.ok(g.own === 2 && g.stored === 5 && !g.view, '3 Sekunden gehalten: Foto gelöscht (auch im Speicher)', JSON.stringify(g));
  await ev(() => __st.closeAlbum());

  // ---------- at most 100 own photos ----------
  g = await ev(() => {
    const p0 = __st.photos[0];
    for (let i = 0; i < 120; i++) __st.photos.unshift({ ...p0, auto: false, kind: 'own', t: 1000 + i });
    __st.takePhoto('own'); __st.step(0.1);
    return { own: __st.photos.filter(p => !p.auto).length, autos: __st.photos.filter(p => p.auto).length };
  });
  R.ok(g.own === 100 && g.autos === 3, 'Höchstens 100 eigene Fotos (die ältesten gehen), Meilensteine bleiben', JSON.stringify(g));

  // ---------- old photos from 0.3/0.4 ----------
  g = await ev(() => {
    localStorage.setItem('stegi-photos-v1', JSON.stringify([{ t: 1, day: 2, auto: true, data: 'data:image/jpeg;base64,AA' }, { t: 2, day: 3, auto: false, data: 'data:image/jpeg;base64,AA' }]));
    __st.loadPhotos(); return __st.photos.map(p => p.kind).join();
  });
  R.ok(g === 'stage,own', 'Fotos aus älteren Versionen landen im richtigen Album', g);

  // ---------- test mode ----------
  await ev(() => { document.getElementById('settings').hidden = false; });
  await page.click('#s-dev');
  await ev(() => { __st.devStage(1); __st.closeDev(); __st.enterGame(); __st.step(1); });
  await page.click('#b-album');
  R.ok((await ev(() => document.getElementById('a-title').textContent)) === 'Test-Fotos', 'Im Testmodus heißt das Album „Test-Fotos“');
  await ev(() => __st.closeAlbum());

  // ---------- a device that keeps no data ----------
  const nostore = await openPage(browser);
  await nostore.context.addInitScript(() => { Storage.prototype.setItem = function () { throw new Error('QuotaExceededError'); }; });
  await nostore.page.goto(GAME_URL);
  g = await nostore.page.evaluate(() => {
    __st.debugFlags.visit = false; __st.setTime('2026-11-20T10:00'); __st.pause(true);
    __st.enterGame(); __st.step(1); for (let d = 0; d < 3; d++) { __st.eggRub(120); __st.travel(24); } __st.eggRub(16); __st.step(6);
    __st.cameraTap(); __st.step(0.2);
    return { n: __st.photos.length, ok: __st.storageOk };
  });
  R.ok(g.n === 2 && !g.ok, 'Gerät speichert nicht: Fotos bleiben trotzdem im Album', JSON.stringify(g));
  // Open the settings the normal way (hold the gear), so the warning is filled in.
  const gear = await nostore.page.locator('#gear').boundingBox();
  await nostore.page.mouse.move(gear.x + 20, gear.y + 20); await nostore.page.mouse.down(); await nostore.page.waitForTimeout(3300); await nostore.page.mouse.up();
  const w = await nostore.page.evaluate(() => ({ open: !document.getElementById('settings').hidden, warn: !document.getElementById('s-storage').hidden }));
  R.ok(w.open && w.warn, 'Einstellungen zeigen: „Dieses Gerät speichert nicht“', JSON.stringify(w));
  await nostore.page.screenshot({ path: 'photos-nostore.png' });
  R.ok(!(await ev(() => !document.getElementById('s-storage').hidden)), 'Normales Gerät: kein Speicher-Hinweis');

  R.ok(errors.length === 0 && nostore.errors.length === 0, 'Keine Fehler in der Konsole', errors.concat(nostore.errors).join(' | '));
  await browser.close();
  R.finish();
})();
