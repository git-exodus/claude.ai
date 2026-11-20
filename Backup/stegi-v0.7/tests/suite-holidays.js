/* suite-holidays.js – 0.7: one present a day, no flickering when chasing the ball, and the holidays:
 * Christmas tree (18.12.–6.1.) with presents from 24.12., New Year fireworks (31.12. and 1.1. until noon),
 * Easter egg hunt (Good Friday – Easter Monday) with a chocolate bunny. Uses the test clock. */
const { chromium, createReport, openPage, loadClean, hatchQuick, GAME_URL } = require('./lib');

(async () => {
  const R = createReport();
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser, { scale: 1 });
  const ev = (f, a) => page.evaluate(f, a);
  const near = (a, b, eps = 0.6) => Math.abs(a - b) <= eps;
  /** Sets the game clock (no time passes for his needs). */
  // Big time jumps would make him grow a stage (party, taps ignored): count the stage as already seen.
  const go = iso => ev(iso => { __st.setTime(iso); __st.S.last = __st.now(); __st.S.stageSeen = Math.max(__st.S.stageSeen, __st.stageAt()); for (const k in __st.S.needs) __st.S.needs[k] = 60; __st.step(0.4); }, iso);

  await loadClean(page, '2026-12-10T10:00');
  await hatchQuick(page);

  // ---------- dates ----------
  let g = await ev(() => [2026, 2027, 2028, 2029, 2030].map(y => { const d = __st.easterSunday(y); return d.getDate() + '.' + (d.getMonth() + 1) + '.'; }).join(' '));
  R.ok(g === '5.4. 28.3. 16.4. 1.4. 21.4.', 'Ostersonntag richtig berechnet (2026–2030)', g);
  g = await ev(() => {
    const s = iso => __st.seasonAt(new Date(iso).getTime()), f = x => [x.tree ? 'B' : '-', x.gifts ? 'G' : '-', x.fireworks ? 'F' : '-', x.easter ? 'O' : '-'].join('');
    return ['2026-12-17T12:00', '2026-12-18T08:00', '2026-12-24T08:00', '2026-12-30T23:00', '2026-12-31T08:00', '2027-01-01T11:59', '2027-01-01T12:00', '2027-01-06T20:00', '2027-01-07T08:00',
      '2027-03-25T12:00', '2027-03-26T08:00', '2027-03-29T20:00', '2027-03-30T08:00'].map(t => t.slice(5, 16) + '=' + f(s(t))).join(' ');
  });
  R.ok(g === '12-17T12:00=---- 12-18T08:00=B--- 12-24T08:00=BG-- 12-30T23:00=BG-- 12-31T08:00=BGF- 01-01T11:59=BGF- 01-01T12:00=BG-- 01-06T20:00=BG-- 01-07T08:00=---- 03-25T12:00=---- 03-26T08:00=---O 03-29T20:00=---O 03-30T08:00=----',
    'Baum 18.12.–6.1., Geschenke ab 24.12., Feuerwerk 31.12. bis 1.1. mittags, Ostern Karfreitag–Ostermontag', g);

  // ---------- Christmas ----------
  await go('2026-12-18T11:00');
  g = await ev(() => { const here = __st.treeHere(); __st.S.place = 'cave'; const cave = __st.treeHere(); __st.S.place = 'cloud'; const cloud = __st.treeHere(); __st.S.place = 'meadow'; __st.S.walk = { sec: 10 }; const walk = __st.treeHere(); __st.S.walk = null; return { here, cave, cloud, walk }; });
  R.ok(g.here && !g.cave && !g.cloud && !g.walk, 'Baum steht bei ihm (nicht in der Höhle, auf der Wolke oder unterwegs)', JSON.stringify(g));
  const box0 = await ev(() => { const p = __st.xmasBoxPos(0); return { x: p.x, y: p.y - 16 * __st.pos().U }; });
  await page.mouse.click(box0.x, box0.y); await ev(() => __st.step(0.3));
  R.ok((await ev(() => __st.S.extraWear.length)) === 0, 'Vor dem 24.12. liegen keine Geschenke unter dem Baum');
  await go('2026-12-24T10:00');
  await page.screenshot({ path: 'holidays-xmas.png' });
  await page.mouse.click(box0.x, box0.y); await ev(() => __st.step(0.3));
  g = await ev(() => ({ extra: __st.S.extraWear.join(), head: __st.S.wear.head }));
  R.ok(g.extra === 'santa' && g.head === 'santa', '1. Geschenk: Weihnachtsmütze, gleich aufgesetzt', JSON.stringify(g));
  const box = i => ev(i => { const p = __st.xmasBoxPos(i); return { x: p.x, y: p.y - 16 * __st.pos().U }; }, i);
  let b = await box(1); await page.mouse.click(b.x, b.y); await ev(() => __st.step(0.3));
  g = await ev(() => ({ food: __st.S.needs.food, extra: __st.S.extraWear.join() }));
  b = await box(2); await page.mouse.click(b.x, b.y); await ev(() => __st.step(0.3));
  const food = await ev(() => __st.S.needs.food);
  R.ok(g.extra === 'santa,antlers' && near(food, g.food + 30, 1), '2. Geschenk: Rentier-Geweih, 3. Geschenk: Zuckerstange (Essen +30)', JSON.stringify({ extra: g.extra, food }));
  await page.screenshot({ path: 'holidays-antlers.png' });
  g = await ev(() => { __st.openWardrobe(); const n = document.querySelectorAll('#wearlist .wtile').length; __st.closeWardrobe(); return n; });
  R.ok(g === 14, 'Kleiderschrank: 12 Teile + Weihnachtsmütze + Geweih', g);
  g = await ev(() => { __st.save(); return __st.xmasState().opened.join(); });
  R.ok(g === 'true,true,true', 'Alle drei Geschenke ausgepackt (wird gespeichert)', g);
  const offset = await ev(() => __st.clock.offset);
  await page.addInitScript(o => { window.__stOffset = o; }, offset);
  await page.goto(GAME_URL);
  g = await ev(() => { __st.pause(true); __st.debugFlags.visit = false; __st.enterGame(); __st.step(1); return { extra: __st.S.extraWear.join(), opened: __st.xmasState().opened.join(), head: __st.S.wear.head }; });
  R.ok(g.extra === 'santa,antlers' && g.opened === 'true,true,true' && g.head === 'antlers', 'Nach Neustart: Weihnachtssachen und ausgepackte Geschenke bleiben', JSON.stringify(g));
  g = await ev(() => { __st.setTime('2027-12-24T10:00'); __st.S.last = __st.now(); __st.step(0.3); return { opened: __st.xmasState().opened.join(), extra: __st.S.extraWear.length }; });
  R.ok(g.opened === 'false,false,false' && g.extra === 2, 'Nächstes Weihnachten wieder 3 Geschenke (Mütze und Geweih bleiben im Schrank)', JSON.stringify(g));

  // ---------- New Year ----------
  await go('2027-12-30T11:00');
  g = await ev(() => { __st.soundLog.length = 0; __st.step(3); return __st.soundLog.filter(s => s.name === 'firework').length; });
  R.ok(g === 0, '30.12.: kein Feuerwerk', g);
  await go('2027-12-31T11:00');
  g = await ev(() => { __st.soundLog.length = 0; __st.step(3); return __st.soundLog.filter(s => s.name === 'firework').length; });
  R.ok(g >= 4, '31.12. vormittags: Feuerwerk mit leisem Knallen', g);
  await page.screenshot({ path: 'holidays-nye-day.png' });
  await go('2027-12-31T21:00');
  await ev(() => __st.step(1.2));
  await page.screenshot({ path: 'holidays-nye-night.png' });
  g = await ev(() => { __st.soundLog.length = 0; __st.step(3); return __st.soundLog.filter(s => s.name === 'firework').length; });
  R.ok(g === 0, 'Wenn er schläft, knallt nichts (das Feuerwerk leuchtet trotzdem)', g);

  // ---------- Easter ----------
  await go('2028-04-14T10:00');   // Good Friday 2028
  g = await ev(() => ({ easter: __st.seasonNow().easter, found: __st.easterState().found.join() }));
  R.ok(g.easter && g.found === 'false,false,false,false,false', 'Karfreitag: 5 Ostereier versteckt', JSON.stringify(g));
  await page.screenshot({ path: 'holidays-easter.png' });
  const eggs = await ev(() => [0, 1, 2, 3, 4].map(i => { const p = __st.eggPos(i); return { x: p.x, y: p.y - 10 * __st.pos().U }; }));
  for (const e of eggs.slice(0, 4)) { await page.mouse.click(e.x, e.y); await ev(() => __st.step(0.2)); }
  g = await ev(() => ({ found: __st.easterState().found.filter(Boolean).length, bunny: __st.easterState().bunny }));
  R.ok(g.found === 4 && g.bunny === 'none', '4 Eier gefunden: noch kein Hase', JSON.stringify(g));
  await page.mouse.click(eggs[4].x, eggs[4].y); await ev(() => __st.step(0.5));
  R.ok((await ev(() => __st.easterState().bunny)) === 'shown', 'Alle 5 gefunden: Schokohase erscheint');
  await page.screenshot({ path: 'holidays-bunny.png' });
  const f0 = await ev(() => __st.S.needs.food);
  const bp = await ev(() => { const p = __st.bunnyPos(); return { x: p.x, y: p.y - 22 * __st.pos().U }; });
  await page.mouse.click(bp.x, bp.y); await ev(() => __st.step(0.3));
  g = await ev(() => ({ bunny: __st.easterState().bunny, food: __st.S.needs.food }));
  R.ok(g.bunny === 'eaten' && near(g.food, f0 + 30, 1), 'Schokohase antippen: er frisst ihn (Essen +30)', JSON.stringify(g));
  g = await ev(() => { __st.setTime('2029-03-30T10:00'); __st.S.last = __st.now(); __st.step(0.2); return { easter: __st.seasonNow().easter, found: __st.easterState().found.filter(Boolean).length }; });
  R.ok(g.easter && g.found === 0, 'Nächstes Ostern sind die Eier wieder versteckt', JSON.stringify(g));

  // ---------- one present a day ----------
  g = await ev(() => {
    __st.setTime('2029-05-02T10:00'); __st.S.last = __st.now(); __st.S.giftSeen = 2; __st.S.giftDay = -1; __st.step(0.3);
    const a = __st.giftWaiting(); __st.openGift(); const b = __st.giftWaiting();
    __st.travel(24); __st.S.last = __st.now(); __st.step(0.3); const c = __st.giftWaiting();
    return { a, b, c, seen: __st.S.giftSeen };
  });
  R.ok(g.a && !g.b && g.c && g.seen === 3, 'Mehrere Geschenke fällig: heute eins, morgen das nächste', JSON.stringify(g));

  // ---------- ball: no flickering ----------
  g = await ev(() => {
    __st.S.giftSeen = 12; for (const k in __st.S.needs) __st.S.needs[k] = 90; __st.step(1);
    __st.openPlayMenu(); __st.startMode('ball'); __st.step(0.3);
    let worst = 0;
    for (const [vx, vy] of [[-500, -400], [-120, -200], [80, -150], [300, -500], [-60, -100], [20, -60], [-30, -80], [150, -300]]) {
      __st.throwBall(vx, vy);
      const turns = []; let last = __st.stegoLook().dir;
      for (let i = 0; i < 30 * 8; i++) {
        __st.step(1 / 30); const d = __st.stegoLook().dir;
        if (d !== last) turns.push(i); last = d;
        if (!__st.game.ball.thrown && !__st.game.ball.carried) break;
      }
      for (let i = 0; i < turns.length; i++) worst = Math.max(worst, turns.filter(t => t >= turns[i] && t < turns[i] + 30).length);
    }
    __st.endMode();
    return worst;
  });
  R.ok(g <= 3, 'Ballspielen: er dreht sich höchstens 3-mal pro Sekunde um (vorher bis zu 21-mal in 1,5 s)', g);

  // ---------- test mode buttons ----------
  g = await ev(() => { __st.setTestMode(true); __st.devStage(2); __st.openDev(); document.getElementById('dv-x24').click(); const d = new Date(__st.now()); const r = d.getDate() + '.' + (d.getMonth() + 1) + '. ' + d.getHours() + ':00';
    document.getElementById('dv-easter').click(); const e = new Date(__st.now()); __st.closeDev(); __st.setTestMode(false); return [r, e.getDay(), e.getHours()]; });
  R.ok(g[0] === '24.12. 10:00' && g[1] === 0 && g[2] === 10, 'Test-Werkzeuge: Sprung zum 24.12. und zu Ostern (Sonntag 10:00)', JSON.stringify(g));

  R.ok(errors.length === 0, 'Keine Fehler in der Konsole', errors.join(' | '));
  await browser.close();
  R.finish();
})();
