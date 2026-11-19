/* suite-core.js – the rules: clock and night, egg and hatching, growth, needs, poop,
 * eating, drinking, bath, teeth, ball, bedtime, saving, reset, play-time limit. */
const { chromium, createReport, openPage, loadClean, hatchQuick, at, GAME_URL } = require('./lib');

(async () => {
  const R = createReport();
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser);
  const ev = (f, a) => page.evaluate(f, a);
  const near = (a, b, eps = 0.6) => Math.abs(a - b) <= eps;

  // ---------- start ----------
  await loadClean(page);
  let st = await ev(() => __st.state());
  R.ok(st.screen === 'menu' && !st.hatched && st.egg.cracks === 0, 'Neues Spiel: Hauptmenü mit Ei', JSON.stringify(st.egg));
  let vis = await ev(() => __st.visible());
  R.ok(!vis.needs && !vis.actions && !vis.exit, 'Im Menü keine Leisten, Beenden im Browser ausgeblendet', JSON.stringify(vis));

  // ---------- clock ----------
  const night = await ev(() => {
    const t = (h, m) => { const d = new Date(__st.now()); d.setHours(h, m, 0, 0); return d.getTime(); };
    return [[19, 29], [19, 30], [19, 59], [20, 0], [23, 0], [3, 0], [6, 59], [7, 0], [12, 0]]
      .map(([h, m]) => h + ':' + m + '=' + (__st.isNight(t(h, m)) ? 'N' : __st.isSleepy(t(h, m)) ? 'm' : 'T')).join(' ');
  });
  R.ok(night === '19:29=T 19:30=m 19:59=m 20:0=N 23:0=N 3:0=N 6:59=N 7:0=T 12:0=T', 'Nacht 20:00–7:00, müde ab 19:30', night);

  // ---------- egg ----------
  await ev(() => { __st.enterGame(); __st.step(1); });
  let e = await ev(() => { __st.eggRub(119); return { ...__st.S.egg, ph: __st.eggPhase(), p: __st.eggProgress() }; });
  R.ok(e.cracks === 0 && e.ph === 'growing' && near(e.p, 119 / 120, 0.01), 'Ei: 119 s gestreichelt, noch kein Riss', JSON.stringify(e));
  e = await ev(() => { __st.eggRub(1.5); return { ...__st.S.egg, ph: __st.eggPhase() }; });
  R.ok(e.cracks === 1 && e.ph === 'done', 'Ei: nach 2 Minuten der 1. Riss', JSON.stringify(e));
  e = await ev(() => { __st.eggRub(500); return { ...__st.S.egg }; });
  R.ok(e.cracks === 1, 'Ei: am selben Tag kein zweiter Riss', e.cracks);
  e = await ev(() => { __st.travel(48); __st.eggRub(60); return { ...__st.S.egg, p: __st.eggProgress() }; });
  R.ok(e.cracks === 1 && near(e.p, 0.5, 0.01), 'Ei: vergessener Tag schadet nicht, neuer Tag beginnt bei 0', JSON.stringify(e));
  e = await ev(() => { __st.eggRub(60); __st.travel(24); __st.eggRub(120); return { ...__st.S.egg, ph: __st.eggPhase() }; });
  R.ok(e.cracks === 3 && e.ph === 'done', 'Ei: 3 Risse an 3 Tagen', JSON.stringify(e));
  e = await ev(() => { __st.eggRub(100); __st.step(0.5); return { ...__st.state(), ph: __st.eggPhase() }; });
  R.ok(!e.hatched && e.mode === 'idle', 'Ei: am Tag des 3. Risses schlüpft es noch nicht', e.mode);
  e = await ev(() => { __st.travel(24); return { ph: __st.eggPhase(), p: __st.eggProgress() }; });
  R.ok(e.ph === 'hatchday' && e.p === 0, 'Ei: am nächsten Tag ist Schlüpftag', JSON.stringify(e));
  e = await ev(() => { __st.eggRub(14); __st.step(0.1); return __st.state(); });
  R.ok(!e.hatched && e.mode === 'idle', 'Schlüpfen: 14 s Streicheln reichen noch nicht', e.mode);
  e = await ev(() => { __st.eggRub(1.2); return __st.state(); });
  R.ok(e.mode === 'hatch', 'Schlüpfen: nach 15 s startet das Schlüpfen', e.mode);
  e = await ev(() => { __st.step(1.0); return __st.state(); });
  R.ok(!e.hatched, 'Schlüpfen: das Ei wackelt erst (noch nicht geschlüpft nach 1 s)');
  e = await ev(() => { __st.step(1.2); return { ...__st.state(), day: __st.lifeDay(), snd: __st.soundLog.map(s => s.name).slice(-6).join(',') }; });
  R.ok(e.hatched && e.mode === 'party' && e.stage === 0 && e.day === 1 && e.snd.includes('fanfare'), 'Schlüpfen: Baby ist da, Fest mit Fanfare, Tag 1', JSON.stringify({ mode: e.mode, day: e.day }));
  R.ok(Object.values(e.needs).every(v => near(v, 70, 0.1)), 'Nach dem Schlüpfen alle Bedürfnisse 70', JSON.stringify(e.needs));
  e = await ev(() => { __st.step(3.2); return { ...__st.state(), vis: __st.visible() }; });
  R.ok(e.mode === 'idle' && e.vis.needs && e.vis.actions && !e.vis.bed, 'Nach dem Fest: Leisten sichtbar, Licht-aus-Knopf tagsüber versteckt', JSON.stringify(e.vis));

  // ---------- growth ----------
  const growth = await ev(() => {
    const out = [];
    for (const d of [1, 5, 6, 12, 13, 22, 23, 29, 30, 45]) {
      __st.S.hatchDay = __st.dayIndex(__st.now()) - d + 1;
      out.push(d + ':' + __st.stageAt() + ':' + __st.growth().toFixed(2));
    }
    __st.S.hatchDay = __st.dayIndex(__st.now());
    return out.join(' ');
  });
  R.ok(growth === '1:0:0.00 5:0:0.14 6:1:0.17 12:1:0.38 13:2:0.41 22:2:0.72 23:3:0.76 29:3:0.97 30:4:1.00 45:4:1.00',
    'Wachstum: Baby/Kind/Jugend/Fast groß/Ganz groß ab Tag 1/6/13/23/30, Größe wächst täglich', growth);
  e = await ev(() => { __st.S.hatchDay -= 5; for (const k in __st.S.needs) __st.S.needs[k] = 80; __st.step(0.2); return { mode: __st.game.mode, seen: __st.S.stageSeen }; });
  R.ok(e.mode === 'party' && e.seen === 1, 'Neue Stufe (Kind) wird mit einem Fest gefeiert', JSON.stringify(e));
  await ev(() => { __st.step(3.5); });

  // ---------- needs over time ----------
  await at(page, 9, 0);
  let n = await ev(() => { for (const k in __st.S.needs) __st.S.needs[k] = 100; __st.S.poops = []; __st.S.last = __st.now(); __st.travel(4); __st.step(0.05); return { ...__st.S.needs }; });
  R.ok(near(n.food, 50) && near(n.love, 50) && near(n.fun, 50) && near(n.drink, 100 - 400 / 7) && near(n.clean, 75),
    'Nach 4 wachen Stunden: Essen/Liebe/Spaß 50, Trinken 43, Sauberkeit 75', JSON.stringify(n, (k, v) => typeof v === 'number' ? +v.toFixed(1) : v));
  await at(page, 20, 30);
  n = await ev(() => { for (const k in __st.S.needs) __st.S.needs[k] = 80; __st.S.last = __st.now(); __st.travel(10); __st.step(0.05); return { ...__st.S.needs }; });
  R.ok(Object.values(n).every(v => near(v, 80, 0.05)), 'Nachts (20:30 → 6:30) sinkt nichts', JSON.stringify(n));
  await at(page, 19, 0);
  n = await ev(() => { for (const k in __st.S.needs) __st.S.needs[k] = 100; __st.S.last = __st.now(); __st.travel(13); __st.step(0.05); return { ...__st.S.needs }; });
  R.ok(near(n.food, 75, 0.3), 'Über Nacht 19:00 → 8:00 zählen nur 2 wache Stunden (Essen 75)', n.food.toFixed(2));
  n = await ev(() => { __st.travel(24 * 5); __st.step(0.05); return { ...__st.state() }; });
  R.ok(Object.values(n.needs).every(v => v >= 0) && n.needs.food === 0 && n.hatched, 'Nach 5 Tagen ohne Pflege: Werte 0, aber der Stego ist noch da', JSON.stringify(n.needs));
  n = await ev(() => { __st.step(0.2); return { low: __st.lowest(), sad: true }; });
  R.ok(n.low.value === 0, 'Niedrigstes Bedürfnis wird erkannt', JSON.stringify(n.low));
  n = await ev(() => { const before = { ...__st.S.needs }; __st.travel(-2); __st.step(0.1); return JSON.stringify(before) === JSON.stringify(__st.S.needs); });
  R.ok(n, 'Uhr läuft rückwärts: nichts geht kaputt, Werte bleiben');

  // ---------- eating and poop ----------
  await at(page, 10, 0);
  let f = await ev(() => {
    __st.S.last = __st.now(); __st.S.needs.food = 10; __st.S.poops = []; __st.S.meals = 0; __st.S.poopAt = 0;
    __st.startMode('eat'); __st.step(0.1);
    const ok = __st.offerFood('apple', 100, 600); __st.step(0.6);
    return { ok, food: __st.S.needs.food, meals: __st.S.meals };
  });
  R.ok(f.ok && near(f.food, 35, 0.2) && f.meals === 1, 'Apfel: fliegt zum Maul, Essen +25', JSON.stringify(f));
  f = await ev(() => { const r = __st.offerFood('melon', 100, 600); return r; });
  R.ok(f === false, 'Während er kaut, kein zweites Futter gleichzeitig');
  f = await ev(() => {
    const out = [];
    for (const id of ['fern', 'berry', 'leaf']) { __st.step(1.5); out.push(__st.offerFood(id, 100, 600)); __st.step(0.5); }
    __st.step(1.5);
    return { out, food: __st.S.needs.food, poopAt: __st.S.poopAt > 0, meals: __st.S.meals };
  });
  R.ok(f.out.every(Boolean) && near(f.food, 90, 0.3) && f.poopAt, 'Farn, Beeren, Blatt: Essen 90, nach 4 Happen ist Kacka unterwegs', JSON.stringify(f));
  f = await ev(() => { __st.step(1.5); const r = __st.offerFood('melon', 100, 600); __st.step(0.5); return { r, food: __st.S.needs.food, refused: __st.pet.refuseT > 0 }; });
  R.ok(f.r === true && near(f.food, 100, 0.3), 'Melone: Essen voll (100)', JSON.stringify(f));
  f = await ev(() => { __st.step(1.5); const r = __st.offerFood('apple', 100, 600); return { r, refused: __st.pet.refuseT > 0 }; });
  R.ok(f.r === false && f.refused, 'Satt: er schüttelt den Kopf und will nichts mehr', JSON.stringify(f));
  f = await ev(() => { __st.travel(1 / 60); __st.step(0.1); const a = __st.S.poops.length; __st.travel(1.1 / 60); __st.step(0.1); return [a, __st.S.poops.length, __st.soundLog.some(s => s.name === 'plop')]; });
  R.ok(f[0] === 0 && f[1] === 1 && f[2], 'Kacka erscheint 2 Minuten nach dem 4. Happen (mit Plopp)', JSON.stringify(f));
  f = await ev(() => {
    __st.endMode();
    for (const k in __st.S.needs) __st.S.needs[k] = 100;
    __st.S.last = __st.now(); __st.travel(4); __st.step(0.05);
    return __st.S.needs.clean;
  });
  R.ok(near(f, 50, 0.3), 'Liegt Kacka herum, wird er doppelt so schnell schmutzig (4 h: Sauberkeit 50)', f.toFixed(1));
  f = await ev(() => { __st.removePoop(0); return { n: __st.S.poops.length, clean: __st.S.needs.clean }; });
  R.ok(f.n === 0 && near(f.clean, 55, 0.3), 'Kacka wegmachen: weg und Sauberkeit +5', JSON.stringify(f));
  f = await ev(() => { __st.S.poops = [{ x: 0.2 }, { x: 0.8 }, { x: 0.3 }]; __st.S.poopAt = __st.now() - 1; __st.step(0.1); return __st.S.poops.length; });
  R.ok(f === 3, 'Höchstens 3 Kackas', f);
  await ev(() => { __st.S.poops = []; });

  // ---------- drinking ----------
  f = await ev(() => { __st.S.needs.drink = 30; __st.startMode('drink'); __st.step(1); const mid = __st.S.needs.drink; __st.step(1.8); return { mid, end: __st.S.needs.drink, mode: __st.game.mode }; });
  R.ok(near(f.mid, 30, 0.2) && near(f.end, 65, 0.3) && f.mode === 'idle', 'Trinken: nach dem Schlabbern +35', JSON.stringify(f));
  f = await ev(() => { __st.S.needs.drink = 98; __st.startMode('drink'); return { mode: __st.game.mode, refused: __st.pet.refuseT > 0 }; });
  R.ok(f.mode === 'idle' && f.refused, 'Kein Durst: er will nicht trinken', JSON.stringify(f));

  // ---------- bath ----------
  f = await ev(() => {
    __st.step(1); __st.S.needs.clean = 10; __st.startMode('bath'); __st.step(0.2);
    const b = __st.pos().box, g = __st.game;
    for (let i = 0; i < 30 * 7; i++) { g.rubbing = 0.25; g.rubX = b.x + b.w * 0.5; g.rubY = b.y + b.h * 0.5; __st.step(1 / 30); }
    const phase = g.bath && g.bath.phase;
    __st.step(3.5);
    return { clean: __st.S.needs.clean, phase, mode: g.mode };
  });
  R.ok(near(f.clean, 100, 0.01) && f.mode === 'idle' && ['rinse', 'done'].includes(f.phase), 'Baden: schrubben macht sauber, dann Abbrausen und fertig', JSON.stringify(f));

  // ---------- teeth ----------
  f = await ev(() => {
    __st.S.needs.clean = 50; __st.S.needs.love = 50; __st.startMode('brush'); __st.step(0.2);
    const g = __st.game, m = () => __st.pos().mouth;
    for (let i = 0; i < 30 * 6; i++) { g.brush.x = m().x; g.brush.y = m().y; g.rubbing = 0.25; __st.step(1 / 30); }
    const done = g.brush && g.brush.done;
    __st.step(2);
    return { done, teeth: __st.S.teethDay === __st.dayIndex(__st.now()), clean: __st.S.needs.clean, love: __st.S.needs.love, mode: g.mode };
  });
  R.ok(f.teeth && near(f.clean, 60, 0.5) && near(f.love, 55, 0.5) && f.mode === 'idle', 'Zähne putzen: nach 5 s fertig, Sauberkeit +10, Liebe +5', JSON.stringify(f));

  // ---------- ball ----------
  f = await ev(() => {
    __st.S.needs.fun = 40; __st.startMode('ball'); __st.step(0.3);
    __st.throwBall(-500, -400);
    let picked = false, maxX = 0;
    for (let i = 0; i < 30 * 12; i++) { __st.step(1 / 30); if (__st.game.ball.carried) picked = true; maxX = Math.max(maxX, Math.abs(__st.pet.x)); if (picked && !__st.game.ball.carried) break; }
    return { picked, fun: __st.S.needs.fun, ran: maxX, back: Math.abs(__st.pet.x) };
  });
  R.ok(f.picked && near(f.fun, 52, 0.5) && f.ran > 30 && f.back < 6, 'Ball: er rennt hin, bringt ihn zurück, Spaß +12', JSON.stringify(f));
  await ev(() => { __st.endMode(); __st.step(2); });

  // ---------- bedtime ----------
  await at(page, 19, 20);
  f = await ev(() => { __st.S.last = __st.now(); __st.step(0.6); __st.goToBed(); return { asleep: __st.isAsleep(), bed: __st.visible().bed }; });
  R.ok(!f.asleep && !f.bed, '19:20: noch nicht müde, kein Licht-aus-Knopf', JSON.stringify(f));
  await at(page, 19, 40);
  f = await ev(() => { __st.step(0.6); const bed = __st.visible().bed; __st.goToBed(); __st.step(0.6); return { bed, asleep: __st.isAsleep(), vis: __st.visible() }; });
  R.ok(f.bed && f.asleep && !f.vis.actions, '19:40: Licht aus → er schläft, Knöpfe weg', JSON.stringify(f));
  f = await ev(() => { __st.startMode('eat'); return __st.game.mode; });
  R.ok(f === 'idle', 'Schlafend kann man nicht füttern', f);
  f = await ev(() => { __st.step(4); return __st.soundLog.filter(s => s.name === 'snore').length; });
  R.ok(f >= 1, 'Er schnarcht', f);
  await at(page, 23, 0);
  f = await ev(() => { __st.step(0.3); return __st.isAsleep(); });
  R.ok(f, '23:00 schläft er');
  await ev(() => { __st.travel(8); __st.S.last = __st.now(); __st.step(0.6); });
  f = await ev(() => ({ asleep: __st.isAsleep(), bedAt: __st.S.bedAt, vis: __st.visible(), h: new Date(__st.now()).getHours() }));
  R.ok(!f.asleep && f.bedAt === 0 && f.vis.actions, '7:00 am nächsten Morgen: wach, Knöpfe wieder da', JSON.stringify(f));
  await at(page, 19, 50);
  f = await ev(() => { __st.S.last = __st.now(); __st.startMode('bath'); __st.travel(0.25); __st.step(0.6); return { mode: __st.game.mode, asleep: __st.isAsleep() }; });
  R.ok(f.mode === 'idle' && f.asleep, 'Um 20:00 schläft er von selbst ein (Baden wird beendet)', JSON.stringify(f));

  // ---------- saving ----------
  await at(page, 11, 0);
  await ev(() => { __st.S.name = 'Rexi'; __st.S.needs.fun = 42; __st.S.last = __st.now(); __st.save(); });
  const offset = await ev(() => __st.clock.offset);
  await page.addInitScript(o => { window.__stOffset = o; }, offset);   // same game clock while loading
  await page.goto(GAME_URL);
  f = await ev(o => { __st.clock.offset = o; __st.debugFlags.visit = false; __st.pause(true); __st.step(0.1); return { name: __st.S.name, fun: __st.S.needs.fun, hatched: __st.state().hatched, title: document.getElementById('m-title').textContent }; }, offset);
  R.ok(f.name === 'Rexi' && near(f.fun, 42, 0.5) && f.hatched && f.title === 'Rexi', 'Speichern und Laden (Name, Werte, geschlüpft)', JSON.stringify(f));
  f = await ev(() => {
    const t = __st.now();
    const a = __st.sanitizeSave({ name: 5, needs: { food: 'x', love: 300 }, egg: { cracks: 9 }, poops: [{ x: 3 }, 'x', { x: 0.5 }, { x: 0.4 }, { x: 0.1 }], opts: { sleep: 1234 } }, t);
    const b = __st.sanitizeSave('kaputt', t);
    return { name: a.name, food: a.needs.food, love: a.needs.love, cracks: a.egg.cracks, poops: a.poops.length, px: a.poops[0].x, sleep: a.opts.sleep, b: b.hatchDay === null && b.name === 'Stegi' };
  });
  R.ok(f.name === 'Stegi' && f.food === 70 && f.love === 100 && f.cracks === 3 && f.poops === 3 && f.px === 0.95 && f.sleep === 1200 && f.b,
    'Kaputte Spielstände werden repariert', JSON.stringify(f));

  // ---------- play-time limit ----------
  f = await ev(() => {
    __st.S.opts.limit = 15; __st.S.playSec = 0; __st.S.playDay = -1;
    __st.enterGame(); __st.step(1);
    __st.step(60 * 14.5);
    const before = __st.state().screen;
    __st.step(40);
    return { before, after: __st.state().screen, rest: __st.visible().rest };
  });
  R.ok(f.before === 'game' && f.after === 'menu' && f.rest, 'Spielzeit 15 Minuten: danach Pause-Hinweis und zurück ins Menü', JSON.stringify(f));
  f = await ev(() => { document.getElementById('r-ok').click(); __st.enterGame(); return { screen: __st.state().screen, rest: __st.visible().rest }; });
  R.ok(f.screen === 'menu' && f.rest, 'Heute kein Weiterspielen mehr', JSON.stringify(f));
  f = await ev(() => { document.getElementById('r-ok').click(); __st.travel(24); __st.enterGame(); return __st.state().screen; });
  R.ok(f === 'game', 'Am nächsten Tag geht es weiter', f);
  await ev(() => { __st.S.opts.limit = 0; });

  // ---------- reset ----------
  f = await ev(() => { __st.resetAll(); return { ...__st.state(), name: __st.S.name, opts: __st.S.opts }; });
  R.ok(!f.hatched && f.egg.cracks === 0 && f.name === 'Stegi' && f.opts.sleep === 1200, 'Alles zurücksetzen: wieder ein Ei mit Standardwerten', JSON.stringify(f.egg));

  R.ok(errors.length === 0, 'Keine Fehler in der Konsole', errors.join(' | '));
  await browser.close();
  R.finish();
})();
