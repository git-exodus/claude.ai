/* suite-training.js – 0.8: training. Choosing tricks (Rolle open, the others "?" until the one before is
 * learned), tracing the symbol with the mouse, the drawing check (kind but no scribbling), trick or belly
 * flop, learning after 3 successes, learned tricks now and then by himself, back key, saving. */
const { chromium, createReport, openPage, loadClean, hatchQuick, at, GAME_URL } = require('./lib');

(async () => {
  const R = createReport();
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser, { scale: 2 });
  const ev = (f, a) => page.evaluate(f, a);
  const near = (a, b, eps = 0.6) => Math.abs(a - b) <= eps;

  await loadClean(page);
  await hatchQuick(page);
  await at(page, 10, 0);
  await ev(() => { __st.S.last = __st.now(); __st.S.hatchDay -= 15; __st.S.stageSeen = 2; __st.S.giftSeen = 12; for (const k in __st.S.needs) __st.S.needs[k] = 50; __st.pet.idleNext = 1e9; __st.step(1); });

  // ---------- the drawing check ----------
  let g = await ev(() => {
    const U = __st.pos().U, out = [];
    const all = __st.TRICKS.map(t => t.shape);
    for (const shape of all) {
      const gd = __st.trickGuide(shape), bd = __st.trainBoard();
      let seed = 3; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const good = { sauber: gd, kinderhand: gd.map((p, i) => ({ x: p.x + Math.sin(i / 5) * 14 * U, y: p.y + Math.cos(i / 7) * 14 * U })), rueckwaerts: gd.slice().reverse(),
        dreiViertel: gd.slice(0, Math.floor(gd.length * 0.8)), versetzt: gd.map(p => ({ x: p.x + 12 * U, y: p.y + 6 * U })) };
      const bad = { haelfte: gd.slice(0, Math.floor(gd.length * 0.5)), gekritzel: Array.from({ length: 60 }, () => ({ x: bd.x + rand() * bd.w, y: bd.y + rand() * bd.h })),
        strich: [{ x: bd.x + 30, y: bd.y + bd.h / 2 }, { x: bd.x + bd.w - 30, y: bd.y + bd.h / 2 }] };
      for (const o of all) if (o !== shape) bad['falsch:' + o] = __st.trickGuide(o);
      for (const [k, p] of Object.entries(good)) if (!__st.judgeTrace(shape, p).ok) out.push(shape + ' ' + k + ' abgelehnt');
      for (const [k, p] of Object.entries(bad)) if (__st.judgeTrace(shape, p).ok) out.push(shape + ' ' + k + ' angenommen');
    }
    return out;
  });
  R.ok(g.length === 0, 'Bewertung: sauber, wackelig, rückwärts, 3/4, leicht versetzt = ja; Hälfte, Gekritzel, Strich, jedes der 6 anderen Symbole = nein (alle 7 Formen)', g.join('; '));

  // ---------- choosing a trick ----------
  await page.click('#act-play');
  R.ok(await ev(() => !document.getElementById('play-train').hidden), 'Spielen-Menü hat den Trainings-Knopf');
  await page.click('#play-train');
  g = await ev(() => ({ mode: __st.game.mode, pick: __st.visible().trainpick, tiles: [...document.querySelectorAll('#trainpick .ttile')].map(t => t.classList.contains('locked') ? '?' : 'offen').join() }));
  R.ok(g.mode === 'train' && g.pick && g.tiles === 'offen,?,?,?,?,?,?', 'Training: Rolle offen, die 6 anderen Tricks mit Fragezeichen', JSON.stringify(g));
  await page.screenshot({ path: 'training-pick.png' });
  await page.click('#tt-stand');
  R.ok(await ev(() => __st.game.train.phase === 'pick'), 'Fragezeichen antippen: geht noch nicht');
  await page.click('#tt-roll');
  await ev(() => __st.step(0.5));
  g = await ev(() => ({ phase: __st.game.train.phase, back: __st.visible().trainback, pick: __st.visible().trainpick }));
  R.ok(g.phase === 'draw' && g.back && !g.pick, 'Rolle gewählt: Tafel mit Kreis zum Nachmalen', JSON.stringify(g));
  await page.screenshot({ path: 'training-board.png' });

  /** Traces a shape with the real mouse, like a child's hand (gently wobbling). */
  async function trace(shape, part = 1, wobble = 8) {
    const gd = await ev(s => __st.trickGuide(s), shape);
    await page.mouse.move(gd[0].x, gd[0].y); await page.mouse.down();
    for (let i = 1; i < gd.length * part; i++) await page.mouse.move(gd[i].x + Math.sin(i / 5) * wobble, gd[i].y + Math.cos(i / 6) * wobble);
    await page.mouse.up();
  }

  // ---------- success: roll ----------
  await ev(() => { __st.soundLog.length = 0; });
  await trace('circle');
  g = await ev(() => ({ roll: __st.S.tricks.roll, fun: __st.S.needs.fun, trick: __st.pet.trick && __st.pet.trick.kind + ':' + __st.pet.trick.ok, phase: __st.game.train.phase }));
  R.ok(g.roll === 1 && near(g.fun, 58, 0.5) && g.trick === 'roll:true' && g.phase === 'show', 'Kreis nachgemalt: er rollt, 1 Stern, Spaß +8', JSON.stringify(g));
  await ev(() => __st.step(1.0));
  await page.screenshot({ path: 'training-roll.png' });
  await ev(() => __st.step(1.0));
  g = await ev(() => ({ phase: __st.game.train.phase, applause: __st.soundLog.some(s => s.name === 'applause') }));
  R.ok(g.phase === 'draw' && g.applause, 'Nach der Rolle: Applaus, dann wieder die Tafel zum Üben', JSON.stringify(g));

  // ---------- failure: belly flop ----------
  await ev(() => { __st.soundLog.length = 0; });
  await trace('wave');
  g = await ev(() => ({ roll: __st.S.tricks.roll, fun: __st.S.needs.fun, trick: __st.pet.trick && __st.pet.trick.ok }));
  R.ok(g.roll === 1 && near(g.fun, 61, 0.5) && g.trick === false, 'Falsches Symbol: kein Stern, er plumpst auf den Bauch (Spaß +3)', JSON.stringify(g));
  await ev(() => __st.step(0.8));
  await page.screenshot({ path: 'training-flop.png' });
  await ev(() => __st.step(2));
  R.ok(await ev(() => __st.soundLog.some(s => s.name === 'flop') && __st.game.train.phase === 'draw'), 'Plumps-Geräusch, danach wieder die Tafel');
  await trace('circle', 0.4);
  await ev(() => __st.step(2.6));
  R.ok((await ev(() => __st.S.tricks.roll)) === 1, 'Nur ein Stück vom Kreis: zählt nicht');

  // ---------- learning and the next trick ----------
  for (let i = 0; i < 2; i++) { await trace('circle'); await ev(() => __st.step(2)); }
  g = await ev(() => ({ roll: __st.S.tricks.roll, learned: __st.learnedTricks().join(), fanfare: __st.soundLog.some(s => s.name === 'fanfare') }));
  R.ok(g.roll === 3 && g.learned === 'roll' && g.fanfare, '3-mal geschafft: Rolle gelernt (Fanfare)', JSON.stringify(g));
  await page.click('#train-back');
  g = await ev(() => [...document.querySelectorAll('#trainpick .ttile')].map(t => t.classList.contains('locked') ? '?' : 'offen').join());
  R.ok(g === 'offen,offen,?,?,?,?,?', 'Jetzt sind die Hinterbeine offen, die Vorderbeine noch nicht', g);
  await page.click('#tt-stand'); await ev(() => __st.step(0.3));
  await trace('zigzag');
  g = await ev(() => __st.pet.trick && __st.pet.trick.kind + ':' + __st.pet.trick.ok);
  R.ok(g === 'stand:true', 'Zickzack nachgemalt: er steht auf den Hinterbeinen', g);
  await ev(() => __st.step(1.0));
  await page.screenshot({ path: 'training-stand.png' });
  await ev(() => __st.step(1.2));
  g = await ev(() => { __st.S.tricks.stand = 3; __st.trainBackToPick(); return [...document.querySelectorAll('#trainpick .ttile')].map(t => t.classList.contains('locked') ? '?' : 'offen').join(); });
  R.ok(g === 'offen,offen,offen,?,?,?,?', 'Hinterbeine gelernt: Vorderbeine offen', g);
  await page.click('#tt-hand'); await ev(() => __st.step(0.3));
  await trace('wave');
  g = await ev(() => __st.pet.trick && __st.pet.trick.kind + ':' + __st.pet.trick.ok);
  R.ok(g === 'hand:true', 'Welle nachgemalt: er steht auf den Vorderbeinen', g);
  await ev(() => __st.step(1.0));
  await page.screenshot({ path: 'training-hand.png' });
  await ev(() => __st.step(1.2));

  // ---------- back key, X ----------
  g = await ev(() => [window.__back(), __st.game.train.phase, window.__back(), __st.game.mode].join());
  R.ok(g === 'true,pick,true,idle', 'Zurück-Taste: erst zur Trick-Auswahl, dann Training beenden', g);

  // ---------- learned tricks by himself ----------
  g = await ev(() => {
    __st.S.tricks.hand = 0;   // roll and stand learned
    __st.pet.idleNext = 0; const seen = {}; let any = 0;
    let last = null;
    for (let i = 0; i < 30 * 300; i++) { __st.step(1 / 30); for (const k in __st.S.needs) __st.S.needs[k] = 90; const t = __st.pet.trick; if (t && t !== last && t.idle) { seen[t.kind] = true; any++; } last = t; }
    return { kinds: Object.keys(seen).sort().join(), any };
  });
  R.ok(g.kinds === 'roll,stand' && g.any >= 2 && g.any <= 12, 'Von selbst macht er selten gelernte Tricks (nur gelernte, nie den Bauchplatscher)', JSON.stringify(g));

  // ---------- night, saving ----------
  await at(page, 22, 0);
  g = await ev(() => { __st.S.last = __st.now(); __st.step(0.3); __st.openPlayMenu(); __st.startMode('train'); return __st.game.mode; });
  R.ok(g === 'idle', 'Nachts kein Training');
  await at(page, 10, 0);
  const offset = await ev(() => { __st.S.last = __st.now(); __st.save(); return __st.clock.offset; });
  await page.addInitScript(o => { window.__stOffset = o; }, offset);
  await page.goto(GAME_URL);
  g = await ev(() => { __st.pause(true); return JSON.stringify(__st.S.tricks); });
  R.ok(g === '{"roll":3,"stand":3,"hand":0,"sit":0,"spin":0,"kiss":0,"pirouette":0}', 'Gelernte Tricks werden gespeichert', g);

  R.ok(errors.length === 0, 'Keine Fehler in der Konsole', errors.join(' | '));
  await browser.close();
  R.finish();
})();
