/*
 * suite-world: wave sizes, castle defences and the economy.
 *
 *   - enemy count per wave, spawn interval, enemy size
 *   - no screen shake behind the shop
 *   - gold balance of all fixed shop prices against the income of waves 1-100
 *   - soldier speed upgrade, wall tiers, wall hit points display, wall absorbs hits,
 *     wall only repaired after a defeat
 *   - kill streak counter
 *   - wave 100 with all weapons at level 100: enemy count, logic time, frame rate
 */
const { chromium, GAME_URL, createReport, openPage, loadClean, startNewGame, dismissDialog, shopList, buy } = require('./lib');

(async () => {
  const report = createReport(), ok = report.ok;
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser, { quiet: true });
  const game = fn => page.evaluate(fn);
  let r;

  await loadClean(page);
  await startNewGame(page);

  /** Castle and wall at 0, one unkillable fast slime: the shop opens. Returns the runtime state. */
  const loseBattle = () => game(() => {
    const g = __bw;
    g.setHp(1);
    g.S.wallHp = 0;
    g.step(2);
    g.spawn('slime');
    for (let i = 0; i < 60 && !g.state().paused; i++) {
      g.ens().forEach(e => { e.hp = 1e6; e.sp = 200; });
      g.step(0.5);
    }
    return g.state();
  });

  /* ---------- wave sizes ---------- */
  r = await game(() => [1, 2, 5, 6, 15, 16, 30, 31, 50, 51, 100].map(w => __bw.waveCount(w)));
  ok(JSON.stringify(r) === '[6,8,14,18,49,56,154,165,364,378,1064]', 'Gegnerzahl: Grundkurve (+3 bis Welle 5, +5 bis 15, +10 bis 30, +15 bis 50, +20 danach) × 0,7', r.join(', '));
  // the real queue adds the boss (and the wolf alpha's pack); spawn gap shrinks with the wave
  r = await game(() => {
    const g = __bw, out = [];
    for (const w of [1, 5, 15, 30, 50, 100]) {
      g.S.cleared = w;
      g.S.wave = w;
      g.showMenu();
      g.startGame(0, false);
      out.push([w, g.state().queue, +g.gap().toFixed(3)]);
    }
    g.S.cleared = 0;
    g.S.wave = 1;
    g.save();
    g.showMenu();
    g.startGame(0, true);
    return out;
  });
  ok(r[0][1] === 6 && r[1][1] === 15 && r[5][1] === 1069, 'Wellen enthalten die Gegnerzahl plus Boss (Welle 100: Wolfsalpha mit Rudel)', r.map(x => x[1]).join(', '));
  ok(r.every((x, i) => i === 0 || x[2] <= r[i - 1][2]) && r[0][2] === 1.5 && r[5][2] < 0.08, 'Gegner kommen einzeln, mit jeder Welle in kürzerem Abstand', r.map(x => 'W' + x[0] + ': ' + x[2] + ' s').join(' · '));

  /* ---------- enemy size ---------- */
  r = await game(() => {
    const g = __bw;
    g.step(2);
    g.spawn('slime');
    const e = g.ens()[g.ens().length - 1];
    return +(e.r / g.pos().U).toFixed(2);
  });
  ok(r === 7.8, 'Gegner auf 60 % verkleinert (Schleim-Radius 13 → 7,8)', r);

  /* ---------- the castle must not keep shaking behind the shop ---------- */
  r = await loseBattle();
  ok(r.paused && r.shake === 0 && r.castleFlash === 0, 'Im Shop wackelt die Burg nicht mehr', `shake ${r.shake}, flash ${r.castleFlash}`);
  const castleShot = () => page.screenshot({ clip: { x: 120, y: 250, width: 120, height: 120 } });
  const shotA = await castleShot();
  await page.waitForTimeout(250);
  const shotB = await castleShot();
  ok(shotA.equals(shotB), 'Burg-Bild im Shop bleibt über 250 ms identisch');

  /* ---------- economy: everything with a fixed price against the gold of waves 1-100 ---------- */
  r = await game(() => ({
    cost: __bw.SHOP.map(offer => offer.t.reduce((a, c) => a + c, 0)),
    sum: __bw.SHOP.reduce((a, offer) => a + offer.t.reduce((x, c) => x + c, 0), 0),
    income: Array.from({ length: 100 }, (_, i) => 2 + 3 * Math.floor(i / 10)).reduce((a, c) => a + c, 0),
  }));
  ok(r.sum === 6354 && r.income === 1550, 'Gold-Rechnung: alle festen Käufe 6.354, Welle 1–100 einmal geschafft bringt 1.550', r.cost.join('+') + ' = ' + r.sum);

  /* ---------- soldier speed and wall tiers ---------- */
  await game(() => { __bw.S.gold = 1000; __bw.save(); });
  await game(() => { document.getElementById('shopgo').click(); });
  await dismissDialog(page);
  await loseBattle();
  r = await shopList(page);
  ok(r.includes('troops: Soldat → 2 Gold | Soldaten-Tempo: alle 4 s → Erst Soldat(aus)') && r.includes('castle: Heilung: +2 → 20 Gold | Mauer: 3 HP → 15 Gold'), 'Shop-Liste mit Stufen', r.replace(/\n/g, ' // '));
  await buy(page, 'troops', 'soldier');
  await page.click('#buy-soldierSpeed');
  r = await game(() => [__bw.S.solLv, __bw.S.gold, document.querySelectorAll('#items .item b')[1].textContent, document.getElementById('buy-soldierSpeed').textContent]);
  ok(r[0] === 1 && r[1] === 973 && r[2] === 'Soldaten-Tempo: alle 3 s' && r[3] === '80 Gold', 'Soldaten alle 4 s für 25 Gold', r.join(' / '));
  await page.click('#buy-soldierSpeed');
  r = await game(() => [__bw.S.solLv, __bw.S.gold, document.getElementById('buy-soldierSpeed').textContent]);
  ok(r[0] === 2 && r[1] === 893 && r[2] === 'Maximal', 'Soldaten alle 3 s für 80 Gold', r.join(' / '));
  const wallSteps = [];
  for (let i = 0; i < 4; i++) {
    await buy(page, 'castle', 'wall');
    wallSteps.push(await game(() => [__bw.S.wall, __bw.S.gold].join(':')));
  }
  ok(wallSteps.join(' ') === '1:878 2:848 3:728 4:428', 'Mauer-Stufen 15, 30, 120, 300 Gold', wallSteps.join(' '));
  ok(await game(() => document.getElementById('buy-wall').textContent) === 'Maximal', 'Mauer bei 25 HP ausgereizt');
  await page.screenshot({ path: 'shop2.png' });
  await page.click('#shopgo');
  r = await game(() => {
    const bricks = document.getElementById('wall'), box = bricks.getBoundingClientRect();
    return { hp: __bw.S.wallHp, n: bricks.children.length, off: bricks.querySelectorAll('.off').length, h: Math.round(box.height), right: Math.round(box.right), hidden: bricks.hidden };
  });
  ok(r.hp === 25 && r.n === 25 && r.off === 0 && !r.hidden, 'Mauer nach Niederlage voll repariert: 25 Symbole', JSON.stringify(r));
  ok(r.h >= 14 && r.right <= 344, 'Mauer-Symbole stehen in mehreren Zeilen oben rechts', r.h + ' px hoch');

  /* ---------- soldiers every 3 s after both speed tiers ---------- */
  r = await game(() => {
    const g = __bw;
    const stepEmpty = seconds => { for (let i = 0; i < seconds * 10; i++) { g.ens().forEach(e => { e.dead = true; }); g.step(0.1); } };
    stepEmpty(2.2);
    const a = g.state().soldiers;
    stepEmpty(3);
    const b = g.state().soldiers;
    stepEmpty(3);
    return [a, b, g.state().soldiers];
  });
  ok(r.join() === '1,2,3', 'Soldaten erscheinen jetzt alle 3 Sekunden', r);

  /* ---------- the wall takes the hits ---------- */
  // hitOnce(): one unkillable fast slime runs at the castle; returns when wall or castle lost something
  r = await game(() => {
    const g = __bw;
    g.S.own.soldier = false;
    g.sols().length = 0;
    g.clear();
    g.setHp(10);
    g.step(3);
    const hitOnce = () => {
      g.spawn('slime');
      const runner = g.ens()[g.ens().length - 1];
      runner.hp = 1e6;
      runner.sp = 400;
      const wall0 = g.S.wallHp, hp0 = g.state().hp;
      for (let n = 0; g.S.wallHp === wall0 && g.state().hp === hp0 && n < 900; n++) {
        g.ens().forEach(x => { if (x !== runner) x.dead = true; });
        g.step(1 / 60);
      }
    };
    hitOnce();
    const afterOne = [g.S.wallHp, g.state().hp];
    hitOnce();
    hitOnce();
    return { a: afterOne, c: [g.S.wallHp, g.state().hp], off: document.querySelectorAll('#wall .off').length };
  });
  ok(r.a.join() === '24,10' && r.c.join() === '22,10' && r.off === 3, 'Mauer verliert 1 HP pro Treffer, Burg bleibt heil', JSON.stringify(r));
  r = await game(() => { const g = __bw; g.step(3); g.clear(); g.step(0.1); return [g.S.wallHp, g.S.wave]; });
  ok(r[0] === 22, 'Mauer wird nach geschaffter Welle nicht repariert', r);
  r = await game(() => {
    const g = __bw;
    g.S.wallHp = 1;
    g.hud();
    const hitOnce = () => {
      g.spawn('slime');
      const runner = g.ens()[g.ens().length - 1];
      runner.hp = 1e6;
      runner.sp = 400;
      const wall0 = g.S.wallHp, hp0 = g.state().hp;
      for (let n = 0; g.S.wallHp === wall0 && g.state().hp === hp0 && n < 900; n++) {
        g.ens().forEach(x => { if (x !== runner) x.dead = true; });
        g.step(1 / 60);
      }
    };
    g.setHp(10);
    g.step(3);
    hitOnce();
    const afterLastBrick = [g.S.wallHp, g.state().hp];
    hitOnce();
    return { a: afterLastBrick, c: [g.S.wallHp, g.state().hp] };
  });
  ok(r.a.join() === '0,10' && r.c.join() === '0,9', 'Ohne Mauer trifft der nächste Gegner die Burg', JSON.stringify(r));
  await game(() => { __bw.S.wallHp = 7; __bw.save(); });
  await page.goto(GAME_URL);
  await page.waitForTimeout(200);
  await page.click('#m-load');
  await page.click('#slot-0');
  r = await game(() => [__bw.S.wall, __bw.S.wallHp, __bw.S.solLv]);
  ok(r.join() === '4,7,2', 'Mauer-Stand und Soldaten-Tempo werden gespeichert', r);
  await loseBattle();
  await page.click('#shopgo');
  ok(await game(() => __bw.S.wallHp) === 25, 'Nach erneuter Niederlage wieder 25 HP');
  await game(() => { __bw.step(3); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'wall.png' });

  /* ---------- kill streak ---------- */
  r = await game(() => {
    const g = __bw;
    g.clear();
    g.step(3);
    for (let i = 0; i < 12; i++) g.spawn('slime');
    g.clear();
    const streak = g.state().combo;
    g.step(2);
    return [streak, g.state().combo];
  });
  ok(r[0] >= 12 && r[1] === 0, 'Treffer-Serie zählt hoch und läuft nach 1,5 s aus', r);

  /* ---------- wave 100: 1,069 enemies, all weapons at level 100, 30 s with auto-fire from second 10 ---------- */
  r = await game(() => {
    const g = __bw, S = g.S;
    S.own.dagger = S.own.star = S.own.bow = S.own.wand = S.own.soldier = true;
    S.lv = { sword: 100, dagger: 100, star: 100, bow: 100, wand: 100 };
    S.cleared = 120;
    S.wave = 100;
    g.save();
    g.showMenu();
    g.startGame(0, false);
    const total = g.state().queue;
    let most = 0, frames = 0;
    const start = performance.now();
    for (let i = 0; i < 60 * 30; i++) {
      if (g.state().paused) break;
      const enemies = g.ens();
      g.setHp(10);
      S.wallHp = 25;
      const target = enemies[(i * 13) % Math.max(1, enemies.length)];
      if (i > 600) g.hold(target ? { x: target.x, y: target.y } : null);
      g.step(1 / 60);
      frames++;
      most = Math.max(most, g.state().enemies);
    }
    g.hold(null);
    return { total, most, ms: (performance.now() - start) / frames };
  });
  ok(r.total === 1069 && r.most <= 260 && r.most > 100 && r.ms < 6, 'Welle 100: 1.069 Gegner, viele gleichzeitig, Logik bleibt schnell', `bis zu ${r.most} gleichzeitig, ${r.ms.toFixed(2)} ms pro Bild`);
  await game(() => {
    const g = __bw;
    g.S.active = 'star';
    g.hud();
    for (let i = 0; i < 300; i++) { g.setHp(10); g.S.wallHp = 25; g.step(1 / 60); }
  });
  // real frame rate with a full field, without attacking (headless Chromium has no GPU)
  const fps = await game(() => new Promise(resolve => {
    const g = __bw, start = performance.now();
    let frames = 0;
    const tick = () => {
      g.setHp(10);
      g.S.wallHp = 25;
      frames++;
      if (performance.now() - start < 2500) requestAnimationFrame(tick);
      else resolve([frames / 2.5, g.state().enemies]);
    };
    requestAnimationFrame(tick);
  }));
  ok(fps[0] > 30, 'Bildrate in Welle 100 ohne Angriff (Emulator ohne Grafikkarte)', fps[0].toFixed(0) + ' Bilder/s bei ' + fps[1] + ' Gegnern');
  await page.screenshot({ path: 'w100.png' });

  ok(errors.length === 0, 'Keine Laufzeitfehler im gesamten Lauf', errors.slice(0, 3));
  report.finish();
  await browser.close();
})();
