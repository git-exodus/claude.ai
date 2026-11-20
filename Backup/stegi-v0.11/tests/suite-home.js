/* suite-home.js – 0.11: stars, home ("Zuhause"), shop, furniture, sticker book, friendship. */
const { chromium, createReport, openPage, loadClean, hatchQuick, at, GAME_URL } = require('./lib');

(async () => {
  const R = createReport();
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser, { scale: 2 });
  const ev = (f, a) => page.evaluate(f, a);

  await loadClean(page, '2026-06-10T10:00');
  await hatchQuick(page);
  await at(page, 11, 0);
  await ev(() => { __st.game.weatherTest = 'sun'; __st.S.last = __st.now(); __st.S.giftSeen = 12; __st.S.giftDay = __st.dayIndex(__st.now()); for (const k in __st.S.needs) __st.S.needs[k] = 60; __st.pet.idleNext = 1e9; __st.game.nextWish = 1e9; __st.step(2.5); });

  // ---------- stickers and stars ----------
  let g = await ev(() => ({ st: __st.S.stickers.join(), stars: __st.S.stars }));
  R.ok(g.st === 'hatch' && g.stars === 3, 'Erster Sticker „Geschlüpft“ (+3 Sterne)', JSON.stringify(g));
  g = await ev(() => { const a = __st.S.stars; __st.startMode('eat'); __st.step(0.2); __st.offerFood('apple', 100, 600); __st.step(1.5); __st.endMode(); __st.step(2.2); return { gained: __st.S.stars - a, feed: __st.S.stats.feed, st: __st.S.stickers.includes('feed1') }; });
  R.ok(g.gained === 4 && g.feed === 1 && g.st, 'Füttern: +1 Stern, dazu Sticker „Erstes Futter“ (+3)', JSON.stringify(g));
  R.ok(await ev(() => document.getElementById('starpill').textContent === '★ ' + __st.S.stars), 'Sterne werden oben in der Knopfspalte angezeigt');
  g = await ev(() => { const a = __st.S.stars; __st.S.poops = [{ x: 0.2 }]; __st.removePoop(0); return __st.S.stars - a; });
  R.ok(g === 1, 'Kacka weg: +1 Stern', g);
  await page.click('#b-stickers');
  g = await ev(() => ({ n: document.querySelectorAll('#stickerlist .sticker').length, on: document.querySelectorAll('#stickerlist .sticker:not(.locked)').length, count: document.getElementById('stickercount').textContent }));
  R.ok(g.n === 24 && g.on === 2 && g.count === '2 von 24 Stickern', 'Sticker-Heft: 24 Sticker, 2 verdient, Rest grau', JSON.stringify(g));
  await page.screenshot({ path: 'home-stickers.png' });
  await page.click('#st-close');

  // ---------- home ----------
  await page.click('#b-map');
  g = await ev(() => ({ first: document.querySelector('#placelist .ptile').id, locked: document.getElementById('pt-home').classList.contains('locked'), count: document.getElementById('placecount').textContent }));
  R.ok(g.first === 'pt-home' && !g.locked && g.count === '1 von 30 entdeckt', 'Orte: „Zuhause“ ganz oben, immer offen, zählt nicht zu den 30', JSON.stringify(g));
  R.ok(await ev(() => document.getElementById('b-shop').hidden), 'Laden-Knopf nur zu Hause (auf der Wiese versteckt)');
  await page.click('#pt-home'); await ev(() => __st.step(0.6));
  g = await ev(() => ({ home: __st.atHome(), shop: !document.getElementById('b-shop').hidden, weather: __st.currentWeather() }));
  R.ok(g.home && g.shop && g.weather === 'sun', 'Zuhause: Laden-Knopf da, drinnen kein Wetter', JSON.stringify(g));
  g = await ev(() => { __st.startWalk(); __st.travel(1.01); __st.step(0.3); const p = __st.S.place, n = __st.realFound(); __st.goPlace('home'); return { p, n }; });
  R.ok(g.p !== 'home' && g.n === 2, 'Wandern führt nie nach Hause, sondern zu einem neuen Ort', JSON.stringify(g));
  await ev(() => __st.step(4));

  // ---------- shop ----------
  await ev(() => { __st.S.stars = 12; __st.step(0.2); });
  await page.click('#b-shop');
  g = await ev(() => ({ items: document.querySelectorAll('#shoplist .shopitem').length, poor: document.querySelectorAll('#shoplist .poor').length, stars: document.getElementById('shopstars').textContent }));
  R.ok(g.items === 12 && g.poor === 2 && g.stars === '★ 12', 'Laden: 12 Möbel, zu teure sind blass', JSON.stringify(g));
  await page.screenshot({ path: 'home-shop.png' });
  await page.click('#si-bed_wood');
  R.ok((await ev(() => __st.S.stars)) === 12 && !(await ev(() => __st.S.home.owned.includes('bed_wood'))), 'Zu teuer: nichts gekauft');
  await page.click('#si-bed_leaves');
  g = await ev(() => ({ stars: __st.S.stars, placed: __st.S.home.placed.bed, owned: document.querySelector('#si-bed_leaves').classList.contains('owned') }));
  R.ok(g.stars === 7 && g.placed === 'bed_leaves' && g.owned, 'Blätterbett gekauft (5 Sterne), steht gleich im Zuhause', JSON.stringify(g));
  await page.click('#sh-close');
  g = await ev(() => { __st.S.stars = 100; ['bed_wood', 'rug_round', 'lamp_jar', 'pic_sun', 'plant_fern'].forEach(__st.buyFurniture); __st.step(2.2); return { bed: __st.S.home.placed.bed, n: __st.S.home.owned.length, st: __st.S.stickers.includes('home5') }; });
  R.ok(g.bed === 'bed_wood' && g.n === 6 && g.st, 'Mehr gekauft: neues Bett steht da, Sticker „Zuhause eingerichtet“', JSON.stringify(g));
  const bed = await ev(() => { const p = __st.spotPos('bed'); return { x: p.x, y: p.y - 20 * __st.pos().U }; });
  await page.mouse.click(bed.x, bed.y); await ev(() => __st.step(0.2));
  R.ok((await ev(() => __st.S.home.placed.bed)) === 'bed_leaves', 'Bett antippen: wechselt zum anderen gekauften Bett');
  await page.screenshot({ path: 'home-furnished.png' });

  // ---------- friendship ----------
  g = await ev(() => {
    __st.debugFlags.visit = true; const out = [];
    for (let i = 0; i < 6; i++) {
      __st.game.visit = null; __st.startVisit('turtle'); __st.step(4);
      out.push((__st.game.visit.present ? 'G' : '-') + (__st.S.friends.turtle || 0));
      __st.step(62); __st.step(8);
    }
    __st.debugFlags.visit = false;
    return { out: out.join(' '), owned: __st.S.home.owned.includes('friend_turtle'), placed: __st.S.home.placed.f_turtle, st: __st.S.stickers.includes('friend5') };
  });
  R.ok(g.out === '-0 -1 -2 -3 -4 G5' && g.owned && g.placed === 'friend_turtle' && g.st, 'Jeder Besuch ein Herz; bei 5 Herzen bringt die Schildkröte ein Geschenk fürs Zuhause', JSON.stringify(g));
  g = await ev(() => { __st.debugFlags.visit = true; __st.game.visit = null; __st.startVisit('turtle'); __st.step(4); const p = __st.game.visit.present; __st.game.visit = null; __st.debugFlags.visit = false; return p; });
  R.ok(g === false, 'Das Geschenk gibt es nur einmal');

  // ---------- saving ----------
  const offset = await ev(() => { __st.save(); return __st.clock.offset; });
  const before = await ev(() => JSON.stringify({ stars: __st.S.stars, home: __st.S.home, friends: __st.S.friends, st: [...__st.S.stickers].sort() }));
  await page.addInitScript(o => { window.__stOffset = o; }, offset);
  await page.goto(GAME_URL);
  g = await ev(() => { __st.pause(true); return JSON.stringify({ stars: __st.S.stars, home: __st.S.home, friends: __st.S.friends, st: [...__st.S.stickers].sort() }); });
  R.ok(g === before, 'Sterne, Möbel, Freunde und Sticker werden gespeichert', g + ' VS ' + before);
  g = await ev(() => { const s = __st.sanitizeSave({ stars: -5, home: { owned: ['bed_wood', 'sofa', 'friend_trex'], placed: { bed: 'rug_round' } }, friends: { trex: 9, alien: 3 }, stickers: ['hatch', 'xyz'] }, __st.now()); return JSON.stringify({ stars: s.stars, owned: s.home.owned, placed: s.home.placed, friends: s.friends, st: s.stickers }); });
  R.ok(g === '{"stars":0,"owned":["bed_wood","friend_trex"],"placed":{"bed":"bed_wood","f_trex":"friend_trex"},"friends":{"trex":5},"st":["hatch"]}', 'Kaputte Daten werden repariert', g);

  R.ok(errors.length === 0, 'Keine Fehler in der Konsole', errors.join(' | '));
  await browser.close();
  R.finish();
})();
