/* suite-celebrate.js – 0.9: four more tricks (Sitz, Drehen, Küsschen, Pirouette) opening one after the other,
 * the monthly birthday (cake, candles, balloons, party hat) and the good-night ritual (lullaby, cuddly toy, darker). */
const { chromium, createReport, openPage, loadClean, hatchQuick, at } = require('./lib');

(async () => {
  const R = createReport();
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser, { scale: 2 });
  const ev = (f, a) => page.evaluate(f, a);
  const near = (a, b, eps = 0.6) => Math.abs(a - b) <= eps;

  await loadClean(page, '2026-10-12T10:00');
  await hatchQuick(page);   // hatches on 15.10.2026
  await at(page, 10, 0);
  await ev(() => { __st.S.last = __st.now(); __st.S.giftSeen = 12; __st.S.giftDay = __st.dayIndex(__st.now()); for (const k in __st.S.needs) __st.S.needs[k] = 50; __st.pet.idleNext = 1e9; __st.step(1); });

  // ---------- seven tricks, one after the other ----------
  let g = await ev(() => {
    const out = [];
    for (let n = 0; n <= 7; n++) {
      __st.TRICKS.forEach((t, i) => { __st.S.tricks[t.id] = i < n ? 3 : 0; });
      out.push(__st.TRICKS.map((t, i) => __st.trickOpen(i) ? 'o' : '?').join(''));
    }
    return out.join(' ');
  });
  R.ok(g === 'o?????? oo????? ooo???? oooo??? ooooo?? oooooo? ooooooo ooooooo', '7 Tricks werden nacheinander frei', g);
  g = await ev(() => __st.TRICKS.map(t => t.name + '=' + t.shape).join(', '));
  R.ok(g === 'Rolle=circle, Hinterbeine=zigzag, Vorderbeine=wave, Sitz=triangle, Drehen=spiral, Küsschen=heart, Pirouette=star', 'Neue Tricks: Dreieck=Sitz, Spirale=Drehen, Herz=Küsschen, Stern=Pirouette', g);
  await ev(() => { __st.TRICKS.forEach((t, i) => { __st.S.tricks[t.id] = i < 3 ? 3 : 0; }); __st.openPlayMenu(); __st.startMode('train'); __st.step(0.3); });
  g = await ev(() => [...document.querySelectorAll('#trainpick .ttile')].map(t => t.classList.contains('locked') ? '?' : 'o').join(''));
  R.ok(g === 'oooo???', 'Trick-Auswahl zeigt 7 Kärtchen: 3 gelernt, Sitz offen, Rest „?“', g);
  await page.screenshot({ path: 'celebrate-pick.png' });
  await page.click('#tt-sit'); await ev(() => __st.step(0.3));
  const tri = await ev(() => __st.trickGuide('triangle'));
  await page.mouse.move(tri[0].x, tri[0].y); await page.mouse.down();
  for (let i = 1; i < tri.length; i++) await page.mouse.move(tri[i].x + Math.sin(i / 4) * 6, tri[i].y + Math.cos(i / 5) * 6);
  await page.mouse.up();
  g = await ev(() => ({ trick: __st.pet.trick && __st.pet.trick.kind + ':' + __st.pet.trick.ok, sit: __st.S.tricks.sit }));
  R.ok(g.trick === 'sit:true' && g.sit === 1, 'Dreieck mit der Maus nachgemalt: er macht Sitz', JSON.stringify(g));
  g = await ev(() => {
    const out = [];
    for (const k of ['spin', 'kiss', 'pirouette']) { __st.step(3); __st.startTrick(k, true, false); __st.soundLog.length = 0; let hearts = 0; for (let i = 0; i < 60; i++) { __st.step(1 / 30); } out.push(k + ':' + (__st.pet.trick === null) + ':' + __st.soundLog.map(s => s.name).filter(n => n === 'applause' || n === 'happy').join('+')); }
    return out.join(' ');
  });
  R.ok(/spin:true:applause/.test(g) && /kiss:true:happy\+applause/.test(g) && /pirouette:true:applause/.test(g), 'Drehen, Küsschen (mit Herzen) und Pirouette laufen ab', g);
  await ev(() => { __st.step(2); __st.endMode(); __st.step(0.3); });

  // ---------- birthday dates ----------
  g = await ev(() => {
    const keep = __st.S.hatchDay, at = iso => __st.birthdayAt(new Date(iso).getTime());
    __st.S.hatchDay = __st.dayIndex(new Date('2026-10-15T12:00').getTime());
    const r = ['2026-10-15', '2026-11-14', '2026-11-15', '2026-12-15', '2027-10-15'].map(d => { const b = at(d + 'T10:00'); return d.slice(5) + '=' + (b ? b.candles + (b.years ? 'J' : 'M') : '-'); });
    __st.S.hatchDay = __st.dayIndex(new Date('2027-01-31T12:00').getTime());
    r.push('31.1.->28.2.=' + (at('2027-02-28T10:00') ? 'ja' : 'nein'), '31.1.->30.4.=' + (at('2027-04-30T10:00') ? 'ja' : 'nein'));
    __st.S.hatchDay = keep;
    return r.join(' ');
  });
  R.ok(g === '10-15=- 11-14=- 11-15=1M 12-15=2M 10-15=1J 31.1.->28.2.=ja 31.1.->30.4.=ja', 'Geburtstag jeden Monat am Schlüpftag (1 Kerze je Monat, ab 1 Jahr je Jahr; kurze Monate: letzter Tag)', g);

  // ---------- birthday party ----------
  await ev(() => { __st.setTime('2026-11-15T10:00'); __st.S.last = __st.now(); __st.S.stageSeen = __st.stageAt(); __st.soundLog.length = 0; __st.step(1.5); });
  g = await ev(() => ({ hat: __st.wearNow().head, sung: __st.soundLog.filter(s => s.name === 'bday').length, cake: !!__st.bdayState() }));
  R.ok(g.hat === 'party' && g.sung === 1 && g.cake, 'Geburtstag: Partyhut, Geburtstagslied, Kuchen mit Kerze', JSON.stringify(g));
  await page.screenshot({ path: 'celebrate-birthday.png' });
  const cake = await ev(() => { const c = __st.cakePos(); return { x: c.x, y: c.y - 30 * __st.pos().U }; });
  const food0 = await ev(() => __st.S.needs.food);
  await page.mouse.click(cake.x, cake.y); await ev(() => __st.step(0.3));
  g = await ev(() => ({ out: __st.bdayState().out, eaten: __st.bdayState().eaten }));
  R.ok(g.out === 1 && !g.eaten, 'Kuchen antippen: Kerze aus', JSON.stringify(g));
  await ev(() => __st.step(2));
  g = await ev(() => ({ eaten: __st.bdayState().eaten, food: __st.S.needs.food }));
  R.ok(g.eaten && near(g.food, food0 + 30, 1), 'Alle Kerzen aus: Fanfare, er frisst den Kuchen (Essen +30)', JSON.stringify({ ...g, food0 }));
  g = await ev(() => { __st.step(2); return __st.soundLog.filter(s => s.name === 'bday').length; });
  R.ok(g === 1, 'Das Geburtstagslied kommt nur einmal', g);
  g = await ev(() => { __st.setTime('2026-12-15T10:00'); __st.S.last = __st.now(); __st.S.stageSeen = __st.stageAt(); __st.step(0.5); return { ...__st.bdayState(), b: __st.birthdayNow().candles }; });
  R.ok(g.out === 0 && !g.eaten && g.b === 2, 'Nächster Monat: neuer Kuchen mit 2 Kerzen', JSON.stringify(g));
  g = await ev(() => { __st.setTime('2026-12-16T10:00'); __st.S.last = __st.now(); __st.step(0.3); return __st.wearNow().head; });
  R.ok(g === null, 'Am Tag danach kein Partyhut mehr', String(g));

  // ---------- good night ----------
  await at(page, 19, 45);
  g = await ev(() => { __st.S.last = __st.now(); __st.soundLog.length = 0; __st.step(0.5); __st.goToBed(); __st.step(0.2); const a = __st.goodnightDim(); __st.step(5); return { lull: __st.soundLog.filter(s => s.name === 'lullaby').length, dim0: a, dim: __st.goodnightDim(), gn: !!__st.game.goodnight }; });
  R.ok(g.lull === 1 && g.dim0 < 0.05 && Math.abs(g.dim - 0.22) < 0.01 && g.gn, 'Licht aus: Schlaflied, Kuscheltier, es wird langsam dunkler', JSON.stringify(g));
  await page.screenshot({ path: 'celebrate-goodnight.png' });
  await at(page, 23, 0);
  g = await ev(() => { __st.S.last = __st.now(); __st.showMenu(); __st.step(1); __st.enterGame(); __st.step(1); return __st.soundLog.filter(s => s.name === 'lullaby').length; });
  R.ok(g === 1, 'In derselben Nacht kein zweites Schlaflied', g);
  g = await ev(() => { __st.travel(9); __st.S.last = __st.now(); __st.step(0.5); const awake = !__st.isAsleep() && !__st.game.goodnight; const d = new Date(__st.now()); d.setHours(20, 0, 30, 0); __st.clock.offset = d.getTime() - Date.now(); __st.S.last = __st.now(); __st.step(0.5); return { awake, lull: __st.soundLog.filter(s => s.name === 'lullaby').length }; });
  R.ok(g.awake && g.lull === 2, 'Am Morgen wach; nächster Abend um 20 Uhr schläft er ein, wieder mit Schlaflied', JSON.stringify(g));

  // ---------- test mode ----------
  g = await ev(() => { __st.setTestMode(true); __st.devStage(1); __st.openDev(); document.getElementById('dv-bday').click(); const b = __st.birthdayNow(); __st.closeDev(); __st.setTestMode(false); return !!b; });
  R.ok(g, 'Test-Werkzeuge: Sprung zum nächsten Geburtstag');

  R.ok(errors.length === 0, 'Keine Fehler in der Konsole', errors.join(' | '));
  await browser.close();
  R.finish();
})();
