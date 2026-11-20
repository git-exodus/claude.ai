/* suite-fun.js – 0.10: seasons, weather games (puddles, snowman, leaf piles), toys (bubbles, kite,
 * sandcastle), melody game in the music game, and wishes ("3 berries", "something red"). */
const { chromium, createReport, openPage, loadClean, hatchQuick } = require('./lib');

(async () => {
  const R = createReport();
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser, { scale: 2 });
  const ev = (f, a) => page.evaluate(f, a);
  const near = (a, b, eps = 0.6) => Math.abs(a - b) <= eps;
  const setup = (iso, weather) => ev(([iso, w]) => { __st.setTime(iso); __st.S.last = __st.now(); __st.S.stageSeen = __st.stageAt(); __st.S.giftSeen = 12; __st.S.giftDay = __st.dayIndex(__st.now()); __st.S.bday = { key: 'x', out: 0, eaten: true, sung: true }; __st.S.place = 'meadow'; __st.S.walk = null; __st.game.weatherTest = w; for (const k in __st.S.needs) __st.S.needs[k] = 60; __st.pet.idleNext = 1e9; __st.game.nextWish = 1e9; __st.S.wish = null; __st.step(1); }, [iso, weather]);

  await loadClean(page, '2026-04-02T10:00');
  await hatchQuick(page);

  // ---------- seasons ----------
  let g = await ev(() => ['2026-01-15', '2026-03-01', '2026-05-31', '2026-06-01', '2026-08-31', '2026-09-01', '2026-11-30', '2026-12-01'].map(d => d.slice(5) + '=' + __st.seasonKind(new Date(d + 'T12:00').getTime()).slice(0, 2)).join(' '));
  R.ok(g === '01-15=wi 03-01=sp 05-31=sp 06-01=su 08-31=su 09-01=au 11-30=au 12-01=wi', 'Jahreszeiten nach Monat', g);
  for (const [iso, n] of [['2026-04-20T11:00', 'spring'], ['2026-10-20T11:00', 'autumn'], ['2027-01-20T11:00', 'winter']]) { await setup(iso, 'sun'); await page.screenshot({ path: 'fun-' + n + '.png' }); }

  // ---------- puddles ----------
  await setup('2026-06-10T11:00', 'rain');
  g = await ev(() => __st.weatherGame());
  R.ok(g === 'puddles', 'Regen: Pfützen zum Reinspringen', g);
  const pud = await ev(() => __st.puddlePos(1));
  g = await ev(() => ({ fun: __st.S.needs.fun, clean: __st.S.needs.clean }));
  await page.mouse.click(pud.x, pud.y); await ev(() => __st.step(2.5));
  const g2 = await ev(() => ({ fun: __st.S.needs.fun, clean: __st.S.needs.clean, splash: __st.soundLog.some(s => s.name === 'splash') }));
  R.ok(near(g2.fun, g.fun + 5, 0.5) && near(g2.clean, g.clean - 8, 0.5) && g2.splash, 'Pfütze antippen: er rennt hin, springt rein (Spaß +5, aber schmutzig −8)', JSON.stringify({ before: g, after: g2 }));
  await ev(() => __st.step(2));
  R.ok(await ev(() => Math.abs(__st.pet.x) < 4 && !__st.game.jumpTo), 'Danach läuft er zurück in die Mitte');
  g = await ev(() => { __st.S.place = 'desert'; __st.step(0.2); const a = __st.weatherGame(); __st.S.place = 'meadow'; return a; });
  R.ok(g === null, 'In der Wüste keine Pfützen (bleibt trocken)', String(g));

  // ---------- snowman ----------
  await setup('2027-01-12T11:00', 'snow');
  const sp = await ev(() => { const p = __st.snowPos(); return { x: p.x, y: p.y - 30 * __st.pos().U }; });
  for (let i = 0; i < 2; i++) { await page.mouse.click(sp.x, sp.y); await ev(() => __st.step(0.2)); }
  R.ok((await ev(() => __st.snowmanState().stage)) === 2, 'Schnee antippen: der Schneemann wächst Kugel für Kugel');
  const f0 = await ev(() => __st.S.needs.fun);
  await page.mouse.click(sp.x, sp.y); await ev(() => __st.step(0.3));
  g = await ev(() => ({ stage: __st.snowmanState().stage, fun: __st.S.needs.fun }));
  R.ok(g.stage === 3 && near(g.fun, f0 + 10, 0.5), 'Dritte Kugel: fertig mit Hut und Möhre (Spaß +10)', JSON.stringify(g));
  await page.screenshot({ path: 'fun-snowman.png' });
  g = await ev(() => { __st.save(); __st.travel(24); __st.S.last = __st.now(); __st.step(0.2); return __st.snowmanState().stage; });
  R.ok(g === 0, 'Am nächsten Tag liegt wieder ein Schneehaufen da', g);

  // ---------- leaf piles ----------
  await setup('2026-10-14T11:00', 'sun');
  R.ok((await ev(() => __st.weatherGame())) === 'leaves', 'Herbst: Laubhaufen');
  const lp = await ev(() => __st.leafPos(0));
  await page.mouse.click(lp.x, lp.y); await ev(() => __st.step(2));
  g = await ev(() => ({ gone: __st.game.leafGone && __st.game.leafGone[0] > __st.game.t }));
  R.ok(g.gone, 'Laubhaufen antippen: er springt rein, die Blätter fliegen (der Haufen wächst nach 10 s nach)', JSON.stringify(g));
  await ev(() => __st.step(3));

  // ---------- toys ----------
  await setup('2026-06-11T11:00', 'sun');
  await page.click('#act-play');
  g = await ev(() => ['play-ball', 'play-hide', 'play-music', 'play-train', 'play-bubbles', 'play-kite', 'play-castle'].map(id => document.getElementById(id).hidden ? '-' : '+').join(''));
  R.ok(g === '++++++-', 'Spielmenü: Ball, Verstecken, Musik, Training, Seifenblasen, Drachen (Sandburg nur auf Sand)', g);
  await page.click('#play-bubbles'); await ev(() => __st.step(3));
  const bub = await ev(() => { const q = __st.game.bubbles.list[0]; return { x: q.x, y: q.y }; });
  const fb = await ev(() => __st.S.needs.fun);
  await page.mouse.click(bub.x, bub.y);
  g = await ev(() => ({ fun: __st.S.needs.fun, pop: __st.soundLog.slice(-3).some(s => s.name === 'pop') }));
  R.ok(near(g.fun, fb + 2, 0.3) && g.pop, 'Seifenblase antippen: plopp, er schnappt danach (Spaß +2)', JSON.stringify(g));
  await page.click('#close'); await ev(() => __st.step(0.3));
  await page.click('#act-play'); await page.click('#play-kite');
  await page.mouse.move(80, 160); await page.mouse.down(); await page.mouse.move(120, 140); await ev(() => __st.step(2.5)); await page.mouse.up();
  g = await ev(() => ({ x: __st.game.kite.x, y: __st.game.kite.y, look: __st.stegoLook().look }));
  R.ok(Math.abs(g.x - 120) < 30 && Math.abs(g.y - 140) < 30 && g.look && g.look.y < 0, 'Drachen folgt dem Finger, Stego schaut nach oben', JSON.stringify(g));
  await page.screenshot({ path: 'fun-kite.png' });
  await page.click('#close'); await ev(() => __st.step(0.3));
  g = await ev(() => { __st.game.weatherTest = 'rain'; const a = __st.kiteOk(); __st.game.weatherTest = 'sun'; __st.S.place = 'cave'; const b = __st.kiteOk(); __st.S.place = 'beach'; const c = __st.castleOk(); __st.step(0.3); return [a, b, c]; });
  R.ok(g.join() === 'false,false,true', 'Kein Drachen bei Regen oder in der Höhle; Sandburg am Strand', g.join());
  await page.click('#act-play'); await page.click('#play-castle');
  const cp = await ev(() => ({ x: __st.pos().W * 0.8, y: __st.pos().standY + 4 * __st.pos().U }));
  for (let i = 0; i < 4; i++) { await page.mouse.click(cp.x, cp.y); await ev(() => __st.step(0.2)); }
  R.ok((await ev(() => __st.game.castle.stage)) === 4, 'Sandburg: 4-mal antippen, fertig mit Fahne');
  await page.screenshot({ path: 'fun-castle.png' });
  const box = await ev(() => __st.pos().box);
  await page.mouse.click(box.x + box.w / 2, box.y + box.h / 2); await ev(() => __st.step(1.2));
  g = await ev(() => ({ stage: __st.game.castle.stage, flop: __st.soundLog.some(s => s.name === 'flop') }));
  R.ok(g.stage === 0 && g.flop, 'Stego antippen: er springt drauf, die Burg ist platt (und man kann neu bauen)', JSON.stringify(g));
  await page.click('#close'); await ev(() => { __st.S.place = 'meadow'; __st.step(1); });

  // ---------- melody game ----------
  await page.click('#act-play'); await page.click('#play-music'); await ev(() => __st.step(0.3));
  R.ok(await ev(() => !document.getElementById('mel-btn').hidden), 'Musik: Knopf „Melodie nachspielen“');
  g = await ev(() => { const a = document.getElementById('mel-btn').getBoundingClientRect(), d = document.getElementById('mk-6').getBoundingClientRect(); return { dx: Math.abs((a.left + a.width / 2) - (d.left + d.width / 2)), above: a.bottom <= d.top }; });
  R.ok(g.dx < 3 && g.above, 'Melodie-Knopf steht über der großen Trommel', JSON.stringify(g));
  await page.click('#mel-btn');
  g = await ev(() => { __st.soundLog.length = 0; __st.step(3.2); return { phase: __st.game.melody.phase, seq: __st.game.melody.seq, heard: __st.soundLog.filter(s => s.name === 'xylo').length }; });
  R.ok(g.phase === 'play' && g.seq.length === 3 && g.heard === 3, 'Er spielt 3 Töne vor, dann ist man dran', JSON.stringify(g));
  for (const k of g.seq) await page.click('#mk-' + k);
  g = await ev(() => { const a = __st.game.melody.phase; return a; });
  R.ok(g === 'done', 'Richtig nachgespielt: Applaus', g);
  await page.waitForTimeout(1600);
  g = await ev(() => __st.game.melody.len);
  R.ok(g === 4, 'Danach eine Melodie mit 4 Tönen', g);
  await ev(() => __st.step(3.9));   // 4 notes are played first
  const wrong = await ev(() => (__st.game.melody.seq[0] + 1) % 6);
  await page.click('#mk-' + wrong);
  g = await ev(() => __st.game.melody.phase);
  R.ok(g === 'wrong', 'Falscher Ton: „mm-mm“, er spielt es noch einmal vor', g);
  await page.click('#close'); await ev(() => __st.step(0.3));

  // ---------- wishes ----------
  g = await ev(() => { __st.S.needs.food = 40; __st.game.nextWish = 0; __st.step(0.2); return __st.S.wish; });
  R.ok(g && (g.type === 'count' || g.type === 'color'), 'Er wünscht sich etwas (Gedankenblase)', JSON.stringify(g));
  g = await ev(() => {
    __st.S.wish = { type: 'count', food: 'berry', n: 3, got: 0, until: 1e9 }; __st.S.needs.food = 30; __st.S.needs.love = 50;
    __st.startMode('eat'); __st.step(0.2);
    const out = [];
    for (const id of ['apple', 'berry', 'berry', 'berry']) { __st.offerFood(id, 100, 600); __st.step(1.8); out.push(__st.S.wish ? __st.S.wish.got : 'erfüllt'); }
    return { out: out.join(','), love: __st.S.needs.love };
  });
  R.ok(g.out === '0,1,2,erfüllt' && near(g.love, 50 + 4 + 10, 0.5), '„3 Beeren“: Apfel zählt nicht, nach der 3. Beere freut er sich (Liebe +10)', JSON.stringify(g));
  await page.screenshot({ path: 'fun-wish-done.png' });
  g = await ev(() => { __st.S.wish = { type: 'color', color: 'red', until: 1e9 }; __st.S.needs.food = 30; __st.step(0.5); __st.offerFood('fern', 100, 600); __st.step(1.8); const a = !!__st.S.wish; __st.offerFood('melon', 100, 600); __st.step(1.8); return [a, !!__st.S.wish]; });
  R.ok(g.join() === 'true,false', '„Was Rotes“: Farn nicht, Melone ja', g.join());
  await ev(() => __st.endMode());

  R.ok(errors.length === 0, 'Keine Fehler in der Konsole', errors.join(' | '));
  await browser.close();
  R.finish();
})();
