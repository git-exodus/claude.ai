/* suite-extras.js – 0.3: weather, presents and dressing up, photos and album (details: suite-photos), visitors,
 * hide and seek, music with dancing, the play menu and the new buttons. */
const { chromium, createReport, openPage, loadClean, hatchQuick, at, GAME_URL } = require('./lib');

(async () => {
  const R = createReport();
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser, { scale: 2 });
  const ev = (f, a) => page.evaluate(f, a);
  const near = (a, b, eps = 0.5) => Math.abs(a - b) <= eps;
  const shot = n => page.screenshot({ path: n + '.png' });

  await loadClean(page);
  R.ok(!(await ev(() => __st.visible().side)), 'Im Ei: keine Knöpfe für Orte, Kleider, Album, Kamera');
  await hatchQuick(page, { visits: true });
  await at(page, 10, 0);
  await ev(() => { __st.S.last = __st.now(); __st.S.visitDay = __st.dayIndex(__st.now()); __st.S.visitDone = true; for (const k in __st.S.needs) __st.S.needs[k] = 80; __st.step(0.6); });
  R.ok(await ev(() => __st.visible().side), 'Geschlüpft: Knöpfe Orte, Kleider, Album, Kamera sichtbar');

  // ---------- weather ----------
  let w = await ev(() => {
    const base = new Date(__st.now()); base.setHours(11, 0, 0, 0);
    const count = { sun: 0, clouds: 0, rain: 0, snow: 0 }, winter = { rain: 0, snow: 0 };
    for (let i = 0; i < 400; i++) {
      const t = base.getTime() + i * 864e5, m = new Date(t).getMonth(), x = __st.weatherAt(t, 'meadow');
      count[x]++;
      if ((m === 11 || m <= 1) && (x === 'rain' || x === 'snow')) winter[x]++;
    }
    const t0 = base.getTime();
    const same = __st.weatherAt(t0, 'meadow') === __st.weatherAt(t0 + 3600e3 * 2, 'meadow');
    return { count, winter, same };
  });
  const wet = (w.count.rain + w.count.snow) / 400;
  R.ok(near(w.count.sun / 400, 0.45, 0.08) && near(w.count.clouds / 400, 0.25, 0.08) && near(wet, 0.30, 0.08) && w.same,
    'Wetter: je Tag fest, ca. 45 % Sonne, 25 % Wolken, 30 % Regen/Schnee', JSON.stringify(w.count));
  R.ok(w.winter.rain === 0 && w.winter.snow > 0, 'Dezember bis Februar fällt Schnee statt Regen', JSON.stringify(w.winter));
  w = await ev(() => {
    __st.game.weatherTest = 'rain';
    const t = h => { const d = new Date(__st.now()); d.setHours(h, 0, 0, 0); return d.getTime(); };
    const r = { m11: __st.weatherAt(t(11), 'meadow'), m16: __st.weatherAt(t(16), 'meadow'), desert: __st.weatherAt(t(11), 'desert'),
      snow: __st.weatherAt(t(11), 'snow'), cave: __st.weatherAt(t(11), 'cave'), ff: __st.firefliesNow(t(22), 'jungle', 'rain') };
    __st.game.weatherTest = null;
    return r;
  });
  R.ok(w.m11 === 'rain' && w.m16 === 'rainbow' && w.desert === 'sun' && w.snow === 'snow' && w.cave === 'sun' && !w.ff,
    'Regen: ab 15 Uhr Regenbogen, Wüste bleibt trocken, im Schneeberg Schnee, Höhle ohne Wetter, keine Glühwürmchen', JSON.stringify(w));
  for (const x of ['rain', 'snow', 'rainbow']) {
    await ev(x => { __st.game.weatherTest = x; __st.step(0.5); }, x);
    await shot('extras-weather-' + x);
  }
  await ev(() => { __st.game.weatherTest = 'sun'; });

  // ---------- presents and dressing up ----------
  let g = await ev(() => ({ unlocked: __st.wearUnlocked(), waiting: __st.giftWaiting(), days: __st.WEAR_ITEMS.map(x => x.day).join() }));
  R.ok(g.unlocked === 1 && g.waiting && g.days === '1,3,6,8,11,13,16,18,21,23,26,28', 'Geschenk am Schlüpftag; 12 Dinge an Tag 1, 3, 6 … 28', JSON.stringify(g));
  await shot('extras-gift');
  const gp = await ev(() => __st.giftPos());
  await page.mouse.click(gp.x, gp.y - 20);
  await ev(() => __st.step(0.3));
  g = await ev(() => ({ seen: __st.S.giftSeen, wear: __st.S.wear, waiting: __st.giftWaiting() }));
  R.ok(g.seen === 1 && g.wear.head === 'bow' && !g.waiting, 'Geschenk antippen: Schleife ist an', JSON.stringify(g));
  g = await ev(() => {
    __st.S.hatchDay -= 27; __st.S.stageSeen = 4; __st.step(0.2);
    const n = __st.wearUnlocked(), sameDay = __st.giftWaiting();
    let opened = 0;
    // 0.7: only one present a day – simulate the following days by forgetting which day the last one came.
    for (let d = 0; d < 20 && __st.S.giftSeen < 12; d++) { __st.S.giftDay = -1; if (__st.giftWaiting()) { __st.openGift(); opened++; } }
    return { n, sameDay, opened, wear: __st.S.wear };
  });
  R.ok(g.n === 12 && !g.sameDay && g.opened === 11 && g.wear.head === 'wizard' && g.wear.eyes === 'glasses' && g.wear.neck === 'bowtie', 'Tag 28: 12 Dinge fällig, aber nur 1 Geschenk pro Tag – nach 11 weiteren Tagen alle ausgepackt', JSON.stringify(g));
  await ev(() => { __st.step(3.5); __st.game.autoPhotoAt = 0; });
  await page.click('#b-wear');
  g = await ev(() => ({ open: __st.visible().wardrobe, tiles: document.querySelectorAll('#wearlist .wtile').length, on: document.querySelectorAll('#wearlist .wtile.on').length, locked: document.querySelectorAll('#wearlist .locked').length }));
  R.ok(g.open && g.tiles === 12 && g.on === 3 && g.locked === 0, 'Kleiderschrank: 12 Teile, 3 angezogen markiert', JSON.stringify(g));
  await shot('extras-wardrobe');
  await page.click('#wt-crown');
  g = await ev(() => __st.S.wear.head);
  R.ok(g === 'crown', 'Krone antippen: Krone statt Zauberhut', g);
  await page.click('#wt-crown');
  R.ok((await ev(() => __st.S.wear.head)) === null, 'Nochmal antippen: ausgezogen');
  await page.click('#wt-crown');
  await page.click('#w-close');
  // A place adds sunglasses at the beach (only into an empty slot).
  g = await ev(() => {
    __st.S.place = 'beach'; __st.S.wear.eyes = null; const a = __st.wearNow().eyes;
    __st.S.wear.eyes = 'glasses'; const b = __st.wearNow().eyes; __st.S.wear.eyes = null;
    __st.S.place = 'snow'; const c = __st.wearNow().neck; __st.S.place = 'meadow';
    return { a, b, c, own: __st.S.wear.eyes };
  });
  R.ok(g.a === 'sunglasses' && g.b === 'glasses' && g.c === 'bowtie' && g.own === null, 'Am Strand automatisch Sonnenbrille (eigene Brille hat Vorrang), Schnee: Schal nur bei freiem Hals', JSON.stringify(g));
  await ev(() => { __st.S.wear.neck = null; __st.S.place = 'snow'; __st.step(0.3); });
  await shot('extras-snow-scarf');
  await ev(() => { __st.S.place = 'meadow'; __st.S.wear.neck = 'scarf'; __st.step(0.2); });
  g = await ev(() => { const s = __st.sanitizeSave({ giftSeen: 2, wear: { head: 'wizard', eyes: 'sunglasses', neck: 'bow' } }, __st.now()); return s.wear; });
  R.ok(g.head === null && g.eyes === 'sunglasses' && g.neck === null, 'Spielstand: nur ausgepackte Dinge im richtigen Platz', JSON.stringify(g));

  // ---------- photos ----------
  g = await ev(() => { const a = __st.photos.filter(p => p.auto).length; __st.S.stageSeen = 2; __st.step(2); __st.step(3); return [a, __st.photos.filter(p => p.auto).length]; });
  R.ok(g[0] === 1 && g[1] === 2, 'Automatische Fotos beim Schlüpfen und bei neuer Stufe', JSON.stringify(g));
  const before = await ev(() => __st.photos.length);
  await page.click('#b-camera');
  await ev(() => __st.step(0.2));
  g = await ev(() => ({ n: __st.photos.length, last: __st.photos[__st.photos.length - 1], shutter: __st.soundLog.some(s => s.name === 'shutter') }));
  R.ok(g.n === before + 1 && !g.last.auto && g.last.data.startsWith('data:image/jpeg') && g.shutter, 'Kamera-Knopf: Klick, Blitz, Foto im Album', g.n);
  g = await ev(() => { try { return JSON.parse(localStorage.getItem('stegi-photos-v1')).length; } catch (e) { return -1; } });
  R.ok(g === 3, 'Fotos sind gespeichert (eigener Speicherplatz)', g);
  await page.click('#b-album');
  g = await ev(() => ({ open: __st.visible().album, n: document.querySelectorAll('#photolist .photo').length }));
  R.ok(g.open && g.n === 1, 'Album zeigt das eigene Foto im Fototagebuch (mehr in suite-photos)', JSON.stringify(g));
  await shot('extras-album');
  await page.click('#photolist .photo');
  R.ok(await ev(() => __st.visible().photoview && /^Tag \d+/.test(document.getElementById('pv-text').textContent)), 'Foto antippen: groß mit Tag und Datum');
  await shot('extras-photo');
  g = await ev(() => [window.__back(), __st.visible().photoview, window.__back(), __st.visible().album]);
  R.ok(g[0] && !g[1] && g[2] && !g[3], 'Zurück-Taste: erst großes Foto, dann Album zu', JSON.stringify(g));

  // ---------- visitors ----------
  g = await ev(() => {
    __st.S.visitDay = -1; __st.step(0.1);
    const d = new Date(__st.S.visitAt);
    return { h: d.getHours() + d.getMinutes() / 60, sameDay: __st.dayIndex(__st.S.visitAt) === __st.dayIndex(__st.now()) };
  });
  R.ok(g.sameDay && g.h >= 9 && g.h <= 19, 'Besuch geplant zwischen 9 und 19 Uhr', g.h.toFixed(2));
  await at(page, 8, 30);
  g = await ev(() => { __st.S.last = __st.now(); __st.game.visit = null; __st.S.visitDay = __st.dayIndex(__st.now()); __st.S.visitAt = __st.now() + 3600e3; __st.S.visitDone = false; __st.step(1); return !!__st.game.visit; });
  R.ok(!g, 'Vor der Besuchszeit kommt niemand');
  g = await ev(() => { __st.S.love = 0; __st.S.needs.love = 50; __st.S.needs.fun = 50; __st.travel(1.01); __st.S.last = __st.now(); __st.step(1); return { v: __st.game.visit && __st.game.visit.kind, done: __st.S.visitDone }; });
  R.ok(g.v && g.done, 'Zur Besuchszeit kommt ein Freund', JSON.stringify(g));
  await ev(() => __st.step(4)); await shot('extras-visit');
  g = await ev(() => { const ph = __st.game.visit.phase; __st.step(52); const ph2 = __st.game.visit && __st.game.visit.phase; __st.step(12); return { ph, ph2, gone: !__st.game.visit, love: __st.S.needs.love, fun: __st.S.needs.fun, hello: __st.soundLog.filter(s => s.name === 'hello').length }; });
  R.ok(g.ph === 'stay' && g.ph2 === 'stay' && g.gone && near(g.love, 60, 1) && near(g.fun, 60, 1) && g.hello >= 2, 'Besuch bleibt 1 Minute, dann Liebe +10 und Spaß +10, er geht wieder', JSON.stringify(g));
  g = await ev(() => { __st.travel(2); __st.S.last = __st.now(); __st.step(2); return !!__st.game.visit; });
  R.ok(!g, 'Nur ein Besuch pro Tag');
  g = await ev(() => { const out = []; for (const k of __st.VISITORS) { __st.game.visit = null; __st.startVisit(k); __st.step(4); out.push(k + ':' + __st.game.visit.phase); } __st.game.visit = null; return out.join(); });
  R.ok(!/in$|in,/.test(g), 'Alle 5 Besucher (T-Rex, Flugsaurier, Triceratops, Schildkröte, Schmetterlinge) kommen an', g);

  // ---------- 0.8.1: a big stego steps aside, the friend walks along ----------
  g = await ev(() => {
    const keep = __st.S.hatchDay; __st.S.hatchDay = __st.dayIndex(__st.now()) - 29; __st.S.stageSeen = 4; __st.step(0.3);
    __st.game.visit = null; __st.startVisit('trex'); __st.game.visit.side = 1; __st.step(6);
    const shifted = __st.pet.x, W = __st.pos().W;
    __st.startWalk(); __st.step(3);
    const v = __st.game.visit, box = __st.pos().box, hind = box.x + box.w * 0.32;
    const r = { shifted: shifted / W, along: v.along, nearHind: Math.abs(v.x - hind) < 12, back: __st.pet.x };
    __st.step(2); r.stillNear = Math.abs(__st.game.visit.x - (__st.pos().box.x + __st.pos().box.w * 0.32)) < 12;
    __st.S.walk = null; __st.game.visit = null; __st.S.hatchDay = keep; __st.S.stageSeen = __st.stageAt(); __st.step(3);
    return r;
  });
  R.ok(g.shifted < -0.1 && g.shifted > -0.13, 'Großer Stego rückt beim Besuch ein Stück zur Seite (12 %)', JSON.stringify(g));
  R.ok(g.along && g.nearHind && g.stillNear && Math.abs(g.back) < 2, 'Er wandert los: der Besuch läuft vor ihm an den Hinterbeinen mit', JSON.stringify(g));

  // ---------- play menu ----------
  await ev(() => __st.step(0.6));
  await page.click('#act-play');
  g = await ev(() => ({ mode: __st.game.mode, vis: __st.visible() }));
  R.ok(g.mode === 'play' && g.vis.playtray && g.vis.close && !g.vis.actions, 'Spielen-Knopf öffnet Ball / Verstecken / Musik', JSON.stringify({ mode: g.mode }));
  await shot('extras-playmenu');

  // ---------- hide and seek ----------
  await page.click('#play-hide');
  await ev(() => __st.step(3));
  g = await ev(() => ({ mode: __st.game.mode, phase: __st.game.hide.phase, spot: __st.game.hide.spot, box: __st.pos().box, spots: __st.hideSpots() }));
  const sp = g.spots[g.spot];
  R.ok(g.mode === 'hide' && g.phase === 'seek' && g.box.w < 120 * 1 + 2 && Math.abs(g.box.x + g.box.w / 2 - sp.x) < 60, 'Verstecken: er läuft hinter ein Versteck und wird klein', JSON.stringify({ phase: g.phase, w: Math.round(g.box.w) }));
  await shot('extras-hidden');
  const wrong = (g.spot + 1) % 3;
  await page.mouse.click(g.spots[wrong].x, g.spots[wrong].y - 30);
  await ev(() => __st.step(0.1));
  g = await ev(() => ({ phase: __st.game.hide.phase, nope: __st.soundLog.some(s => s.name === 'nope'), fun: __st.S.needs.fun }));
  R.ok(g.phase === 'seek' && g.nope, 'Falsches Versteck: wackelt, weitersuchen', JSON.stringify(g));
  const funBefore = g.fun;
  await page.mouse.click(sp.x, sp.y - 30);
  await ev(() => __st.step(0.3));
  g = await ev(() => ({ phase: __st.game.hide.phase, fun: __st.S.needs.fun }));
  R.ok(g.phase === 'found' && near(g.fun, funBefore + 15, 0.5), 'Richtiges Versteck: gefunden, Spaß +15', JSON.stringify(g));
  await shot('extras-found');
  g = await ev(() => { const first = __st.game.hide.spot; __st.step(5); return { phase: __st.game.hide.phase, first, now: __st.game.hide.spot }; });
  R.ok(g.phase === 'seek' && g.first !== g.now, 'Neue Runde an einem anderen Versteck', JSON.stringify(g));
  await page.click('#close'); await ev(() => __st.step(0.3));
  R.ok((await ev(() => [__st.game.mode, __st.pet.depth].join())) === 'idle,0', 'X beendet Verstecken, er ist wieder vorne');

  // ---------- music ----------
  await page.click('#act-play'); await page.click('#play-music'); await ev(() => __st.step(0.2));
  R.ok(await ev(() => __st.visible().musicpad && __st.game.mode === 'music'), 'Musik: Xylophon und Trommeln erscheinen');
  await ev(() => { __st.S.needs.fun = 50; __st.soundLog.length = 0; });
  for (const id of ['#mk-0', '#mk-3', '#mk-5', '#mk-6', '#mk-7']) { await page.click(id); await ev(() => __st.step(0.1)); }
  g = await ev(() => ({ xylo: __st.soundLog.filter(s => s.name === 'xylo').length, drum: __st.soundLog.filter(s => s.name === 'drum').length, fun: __st.S.needs.fun, dance: __st.pet.danceT > 0 }));
  R.ok(g.xylo === 3 && g.drum === 2 && near(g.fun, 57.5, 0.5) && g.dance, 'Tasten spielen Töne, er tanzt, Spaß +1,5 je Ton', JSON.stringify(g));
  await shot('extras-music');
  R.ok((await ev(() => [window.__back(), __st.game.mode].join())) === 'true,idle', 'Zurück-Taste beendet die Musik');

  // ---------- reload keeps 0.3 things ----------
  const offset = await ev(() => { __st.save(); return __st.clock.offset; });
  await page.addInitScript(o => { window.__stOffset = o; }, offset);
  await page.goto(GAME_URL);
  g = await ev(() => { __st.pause(true); return { seen: __st.S.giftSeen, wear: __st.S.wear, photos: __st.photos.length, visit: __st.S.visitDone }; });
  R.ok(g.seen === 12 && g.wear.head === 'crown' && g.wear.neck === 'scarf' && g.photos === 3 && g.visit, 'Nach Neustart: Kleider, Fotos und Besuch gespeichert', JSON.stringify(g));

  R.ok(errors.length === 0, 'Keine Fehler in der Konsole', errors.join(' | '));
  await browser.close();
  R.finish();
})();
