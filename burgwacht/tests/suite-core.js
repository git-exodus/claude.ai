/*
 * suite-core: the basic game rules.
 *
 *   T1  start of a new game (gold, locked weapons, wave arrows)
 *   T2  attack cooldown
 *   T3  every weapon at every milestone level (1, 5, 10 ... 100) attacks and deals damage
 *   T4  XP per kill and level-up
 *   T5  waves, gold per wave, wave arrows
 *   T6  defeat, shop prices and locks, buying, continuing on the same wave
 *   T7  soldiers (spawn interval, cap, blocking, three hits)
 *   T8  buying weapons and healing, healing after a wave
 *   T9  castle loses one life per enemy
 *   T10 boss wave
 *   T11 saving and loading
 *
 * Most checks are about sword mechanics, but new games start with daggers,
 * so newGame() hands out the sword unless told otherwise.
 */
const { chromium, GAME_URL, createReport, openPage, loadClean, startNewGame, dismissDialog, shopList, buy } = require('./lib');

(async () => {
  const report = createReport(), ok = report.ok;
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser, { quiet: true });
  const game = fn => page.evaluate(fn);
  const giveSword = () => game(() => { __bw.S.own.sword = true; __bw.S.active = 'sword'; __bw.hud(); });

  /** Clean storage, new game in slot 1, sword in hand (unless withSword = false). */
  const newGame = async (withSword = true) => {
    await loadClean(page);
    await startNewGame(page);
    if (withSword) await giveSword();
  };

  /** Lets the wave start, kills everything and returns wave, gold, highest cleared wave and lives. */
  const winWave = () => game(() => {
    const g = __bw;
    g.step(3);
    g.clear();
    g.step(0.1);
    return { w: g.S.wave, gold: g.S.gold, c: g.S.cleared, hp: g.state().hp };
  });

  /** Castle on 1 life, one unkillable fast slime: the shop opens. Returns whether the game paused. */
  const loseBattle = () => game(() => {
    const g = __bw;
    g.setHp(1);
    g.step(2);
    g.spawn('slime');
    for (let i = 0; i < 60 && !g.state().paused; i++) {
      g.ens().forEach(e => { e.hp = 1e6; e.sp = 200; });
      g.step(0.5);
    }
    return g.state().paused;
  });

  let r;

  /* ---------- T1 start ---------- */
  await newGame(false);
  r = await game(() => ({
    gold: __bw.S.gold,
    locked: [...document.querySelectorAll('.wp.locked')].map(x => x.dataset.w),
    goldText: document.getElementById('gold').textContent,
  }));
  ok(r.gold === 0 && r.goldText === '0', 'Start: 0 Gold');
  ok(r.locked.join() === 'sword,star,bow,wand', 'Start: alle Waffen außer den Dolchen gesperrt', r.locked);
  ok(await game(() => __bw.S.active) === 'dagger', 'Neues Spiel beginnt mit den Dolchen');
  await page.click('#wp-sword');
  ok(await game(() => __bw.S.active) === 'dagger', 'Gesperrte Waffe lässt sich nicht wählen');
  ok(await game(() => document.getElementById('wdown').disabled && document.getElementById('wup').disabled), 'Start: beide Pfeile deaktiviert');
  await giveSword();

  /* ---------- T2 cooldown: a real tap attacks, a second tap right after does not ---------- */
  await page.mouse.click(100, 300);
  const afterFirstTap = await game(() => __bw.state().atkCount);
  await page.mouse.click(120, 300);
  const afterSecondTap = await game(() => __bw.state().atkCount);
  await game(() => __bw.step(3.6));
  await page.mouse.click(120, 300);
  const afterWaiting = await game(() => __bw.state().atkCount);
  ok(afterFirstTap === 1 && afterSecondTap === 1 && afterWaiting === 2, 'Cooldown blockt zweiten Tipp, nach 3,6 s wieder frei', [afterFirstTap, afterSecondTap, afterWaiting]);
  ok(await game(() => __bw.cdOf('sword')) === 3.5, 'Cooldown Lvl 1 = 3,5 s');

  /* ---------- T3 every weapon at every milestone level ---------- */
  // 14 practically immortal enemies stand still around the first one; three attack
  // calls in a row must result in exactly one attack (cooldown), and some damage.
  const LEVELS = [1, 5, 10, 15, 25, 30, 40, 50, 60, 70, 80, 90, 100];
  for (const weapon of ['sword', 'dagger', 'star', 'bow', 'wand']) {
    const lines = [];
    for (const level of LEVELS) {
      const s = await page.evaluate(([weapon, level]) => {
        const g = __bw, S = g.S;
        S.own.dagger = S.own.star = S.own.bow = S.own.wand = true;
        S.active = weapon;
        S.wave = 1;
        g.clear();
        S.lv[weapon] = level;
        S.xp[weapon] = 0;
        g.setHp(10);
        for (let i = 0; i < 14; i++) g.spawn(i % 5 === 0 ? 'ogre' : 'slime');
        for (const e of g.ens()) e.hp = e.max = 1e5;
        g.step(9);                      // let them walk onto the field
        g.setHp(10);
        const target = g.ens()[0];
        for (const e of g.ens()) { e.hp = e.max = 1e5; e.sp = 0; }
        g.ready();
        const before = g.state().atkCount;
        g.attack(target.x, target.y);
        g.attack(target.x, target.y);
        g.attack(target.x, target.y);
        const st = g.state(), kinds = [...new Set(g.prj().map(x => x.k))].join('+');
        for (let i = 0; i < 30; i++) g.step(0.1);   // let projectiles, zones and timers play out
        const damage = g.ens().reduce((sum, e) => sum + (e.max - e.hp), 0);
        return { attacks: st.atkCount - before, projs: st.projs, zones: st.zones, fx: st.fx, kinds, damage: Math.round(damage), cd: g.cdOf(weapon) };
      }, [weapon, level]);
      lines.push(`L${level}: dmg ${s.damage} proj ${s.projs}(${s.kinds}) zones ${s.zones} fx ${s.fx} cd ${s.cd.toFixed(2)}`);
      ok(s.attacks === 1 && s.damage > 0, `${weapon} Lvl ${level}: greift an und macht Schaden`, s.damage);
    }
    console.log(lines.join('\n'));   // per-level overview, useful when balancing
  }
  ok(errors.length === 0, 'Keine Laufzeitfehler bei allen 65 Stufen', errors.slice(0, 3));

  /* ---------- T4 XP and level-up ---------- */
  await newGame();
  r = await game(() => {
    const g = __bw;
    g.step(2);
    g.spawn('slime');
    const xpBefore = g.S.xp.sword;
    g.ens().forEach(e => { e.hp = 1; });
    const e = g.ens()[0];
    g.ready();
    g.attack(e.x, e.y);
    g.step(0.2);
    const xpAfter = g.S.xp.sword;
    // half an XP point short of level 2, then one more kill
    g.S.xp.sword = g.need(1) - 0.5;
    g.spawn('slime');
    const f = g.ens()[g.ens().length - 1];
    f.hp = 1;
    g.step(3.6);
    g.attack(f.x, f.y);
    g.step(0.2);
    return { x0: xpBefore, x1: xpAfter, lv: g.S.lv.sword };
  });
  ok(r.x1 > r.x0, 'XP pro besiegtem Gegner', [r.x0, r.x1.toFixed(2)]);
  ok(r.lv === 2, 'Level-Up bei voller XP-Leiste', r.lv);

  /* ---------- T5 waves, gold, wave arrows ---------- */
  await newGame();
  await game(() => __bw.setHp(5));
  r = await winWave();
  ok(r.w === 2 && r.gold === 2 && r.c === 1, 'Welle 1 geschafft: +2 Gold, weiter zu Welle 2', JSON.stringify(r));
  ok(r.hp === 6, 'Heilung +1 nach Welle', r.hp);
  ok(await game(() => !document.getElementById('wdown').disabled && document.getElementById('wup').disabled), 'Pfeil runter aktiv, hoch gesperrt (höchste Welle)');
  await game(() => __bw.step(4));
  const enemiesBefore = await game(() => __bw.state().enemies);
  await page.click('#wdown');
  r = await game(() => ({ w: __bw.S.wave, e: __bw.state().enemies }));
  ok(enemiesBefore > 0 && r.w === 1 && r.e === 0, 'Pfeil runter: Welle 1, Gegner zurückgesetzt', [enemiesBefore, r.w, r.e]);
  r = await winWave();
  ok(r.w === 2 && r.gold === 4, 'Wiederholte Welle gibt auch Gold (+2)', JSON.stringify(r));
  r = await winWave();
  ok(r.w === 3 && r.gold === 6 && r.c === 2, 'Welle 2 geschafft: +2 Gold', JSON.stringify(r));
  // gold per wave across the decades; "hold" repeats the same wave
  r = await game(() => {
    const g = __bw, gained = [];
    for (const w of [1, 10, 11, 20, 21, 50, 91, 100]) {
      const before = g.S.gold;
      g.S.cleared = 200;
      g.S.wave = w;
      g.S.hold = true;
      g.step(3);
      g.clear();
      g.step(0.1);
      gained.push(g.S.gold - before);
    }
    g.S.hold = false;
    g.S.cleared = 2;
    g.S.wave = 3;
    g.S.gold = 6;
    g.hud();
    return gained.join();
  });
  ok(r === '2,2,5,5,8,14,29,29', 'Gold pro Welle: 2 in Welle 1–10, je 10 Wellen +3 mehr', r);
  await page.click('#wdown');
  await page.click('#wup');
  ok(await game(() => __bw.S.wave === 3 && document.getElementById('wup').disabled), 'Pfeil hoch geht nur bis zur höchsten erreichten Welle');

  /* ---------- T6 defeat and shop ---------- */
  ok(await loseBattle(), 'Niederlage pausiert das Spiel');
  await game(() => { __bw.S.gold = 3; });   // shopList() clicks the tabs, which re-renders the shop with this amount
  ok(await game(() => !document.getElementById('shop').hidden), 'Shop öffnet sich nach Niederlage');
  r = await shopList(page);
  ok(r === 'weapons: Schwert → Gekauft(aus) | Morgenstern → 10 Gold(aus) | Bogen → 40 Gold(aus) | Feuerstab → 75 Gold(aus)\n'
    + 'castle: Heilung: +2 → 20 Gold(aus) | Mauer: 3 HP → 15 Gold(aus) | Burg-Leben: 12 Leben → 60 Gold(aus) | Bogenschützen: 1 von 10 → 60 Gold(aus)\n'
    + 'troops: Soldat → 2 Gold | Soldaten-Tempo: alle 4 s → Erst Soldat(aus) | Ritter → 300 Gold(aus) | Rüstung → Erst Soldat(aus) | Mehr Soldaten: bis 6 → Erst Soldat(aus)\n'
    + 'boni: Goldbonus: +25 % → 80 Gold(aus) | XP-Bonus: +25 % → 60 Gold(aus)',
  'Shop-Preise und Sperren bei 3 Gold in allen vier Reitern', r.replace(/\n/g, ' // '));
  await page.screenshot({ path: 'shop.png' });
  await buy(page, 'troops', 'soldier');
  r = await game(() => ({ g: __bw.S.gold, s: __bw.S.own.soldier, t: document.getElementById('buy-soldier').textContent }));
  ok(r.g === 1 && r.s && r.t === 'Gekauft', 'Soldat gekauft für 2 Gold', JSON.stringify(r));
  const attacksInShop = await game(() => __bw.state().atkCount);
  await game(() => { __bw.ready(); __bw.attack(100, 300); });
  ok(await game(() => __bw.state().atkCount) === attacksInShop, 'Kein Angriff, solange der Shop offen ist');
  await page.click('#shopgo');
  ok(await game(() => !document.getElementById('dialog').hidden && document.getElementById('dlg-text').textContent.includes('Oben links')), 'Nach der ersten Niederlage erscheint der Hinweis auf die Wellen-Pfeile');
  await dismissDialog(page);
  r = await game(() => ({ w: __bw.S.wave, st: __bw.state(), h: document.getElementById('shop').hidden, c: __bw.S.cleared }));
  ok(r.w === 3 && r.st.hp === 10 && !r.st.paused && r.h && r.st.enemies === 0, 'Nach dem Shop geht es auf derselben Welle weiter, volle Leben, Feld leer', r.w);
  ok(r.c === 2, 'Höchste Welle bleibt erhalten (Pfeile)', r.c);

  /* ---------- T7 soldiers ---------- */
  r = await game(() => {
    const g = __bw;
    // advance time while keeping the field empty, so soldiers only come and go by the timer
    const stepEmpty = seconds => { for (let i = 0; i < seconds * 10; i++) { g.ens().forEach(e => { e.dead = true; }); g.step(0.1); } };
    stepEmpty(2.2);
    const first = g.state().soldiers;
    stepEmpty(5);
    const second = g.state().soldiers;
    let most = 0;
    for (let i = 0; i < 60; i++) { g.clear(); g.S.wave = 1; g.step(1); most = Math.max(most, g.state().soldiers); }
    return { a: first, b: second, mx: most };
  });
  ok(r.a === 1 && r.b === 2, 'Soldat erscheint alle 5 Sekunden', [r.a, r.b]);
  ok(r.mx === 4, 'Höchstens 4 Soldaten gleichzeitig', r.mx);
  // one soldier against one immortal ogre: the ogre stops, the soldier falls after 3 hits
  r = await game(() => {
    const g = __bw;
    g.clear();
    g.sols().length = 1;
    g.S.own.soldier = false;            // no new soldiers during the duel
    const soldier = g.sols()[0];
    soldier.hp = 3;
    g.step(0.05);
    g.spawn('ogre');
    const ogre = g.ens()[g.ens().length - 1];
    ogre.hp = ogre.max = 1e6;
    let waited = 0;
    while (ogre.blocked <= 0 && waited < 40) {
      g.ens().forEach(x => { if (x !== ogre) { x.hp = 0; x.dead = true; } });
      g.step(1 / 60);
      waited += 1 / 60;
    }
    const x0 = ogre.x, y0 = ogre.y;
    let life = 0, hits = 1, last = soldier.hp, moved = 0;
    while (soldier.hp > 0 && life < 8) {
      g.step(1 / 60);
      life += 1 / 60;
      if (soldier.hp < last) { hits += last - soldier.hp; last = soldier.hp; }
      moved = Math.max(moved, Math.hypot(ogre.x - x0, ogre.y - y0));
    }
    const damage = ogre.max - ogre.hp;
    g.step(0.3);
    g.ens().forEach(x => { if (x !== ogre) x.dead = true; });
    const xa = ogre.x, ya = ogre.y;
    g.step(0.5);
    const walkedOn = Math.hypot(ogre.x - xa, ogre.y - ya);
    g.S.own.soldier = true;
    return { blocked: waited < 40, moved, hits, life, dmg: damage, free: walkedOn };
  });
  ok(r.blocked && r.moved < 1, 'Gegner bleibt am Soldaten stehen', r.moved.toFixed(2));
  ok(r.hits === 3 && r.life > 2 && r.life < 3, 'Soldat fällt nach genau 3 Schlägen', r.hits + ' Treffer in ' + r.life.toFixed(1) + ' s');
  ok(r.dmg > 0 && r.dmg < 30, 'Soldat macht nur minimalen Schaden', r.dmg.toFixed(1));
  ok(r.free > 2, 'Ohne Soldat läuft der Gegner weiter', r.free.toFixed(1));

  /* ---------- T8 buying weapons and healing ---------- */
  await game(() => { __bw.S.gold = 70; __bw.S.own.sword = false; __bw.S.active = 'dagger'; __bw.clear(); });
  ok(await loseBattle(), 'Zweite Niederlage');
  await buy(page, 'weapons', 'sword');
  await buy(page, 'weapons', 'star');
  await page.click('#tab-castle');
  r = await game(() => document.querySelectorAll('#items .item b')[0].textContent);
  ok(r === 'Heilung: +2', 'Heilung zeigt zuerst Stufe +2', r);
  await page.click('#buy-heal');
  await page.click('#buy-heal');
  ok(await game(() => document.getElementById('buy-heal').textContent) === 'Maximal', 'Heilung nach +3 ausgereizt');
  r = await game(() => ({ g: __bw.S.gold, o: __bw.S.own, h: __bw.S.heal }));
  // 70 - 5 - 10 - 20 - 32 = 3, plus 2 gold: loseBattle() completed the (empty) wave before the defeat
  ok(r.g === 5 && r.o.sword && r.o.star && r.h === 3, 'Schwert 5, Morgenstern 10, Heilung 20 und 32 abgezogen (+2 Gold für die Welle davor)', JSON.stringify(r));
  await page.click('#shopgo');
  ok(await game(() => document.getElementById('dialog').hidden), 'Der Hinweis erscheint nur einmal');
  ok(await game(() => [...document.querySelectorAll('.wp.locked')].map(x => x.dataset.w).join()) === 'bow,wand', 'Gekaufte Waffen entsperrt, Bogen und Feuerstab noch nicht');
  await page.click('#wp-dagger');
  ok(await game(() => __bw.S.active) === 'dagger', 'Dolche wählbar');
  await page.click('#wp-star');
  ok(await game(() => __bw.S.active) === 'star', 'Morgenstern wählbar');
  await game(() => __bw.setHp(4));
  r = await winWave();
  ok(r.hp === 7, 'Heilung +3 nach Welle', r.hp);
  await game(() => { __bw.setHp(9); __bw.S.wave = 1; });
  r = await winWave();
  ok(r.hp === 10, 'Heilung nie über 10 Leben', r.hp);

  /* ---------- T9 castle damage ---------- */
  r = await game(() => {
    const g = __bw;
    g.clear();
    g.sols().length = 0;
    g.S.own.soldier = false;
    g.setHp(10);
    g.step(2);
    g.spawn('slime');
    const runner = g.ens()[g.ens().length - 1];
    runner.hp = 1e6;
    runner.sp = 300;
    g.ens().forEach(x => { if (x !== runner) x.dead = true; });
    let frames = 0;
    while (g.state().hp === 10 && frames < 900) { g.step(1 / 60); frames++; }
    return g.state().hp;
  });
  ok(r === 9, 'Burg verliert genau 1 Leben pro Treffer', r);

  /* ---------- T10 boss wave (jump to wave 5 with the arrow, wait until the boss walks in) ---------- */
  await game(() => { const g = __bw; g.step(0.2); g.S.cleared = 10; g.S.wave = 6; g.hud(); });
  await page.click('#wdown');
  r = await game(() => {
    const g = __bw;
    let boss = false, w = 0;
    for (let i = 0; i < 80 && !boss; i++) {
      g.setHp(10);
      g.step(0.5);
      if (g.ens().some(e => e.boss)) { boss = true; w = g.S.wave; }
    }
    return { boss, w };
  });
  ok(r.boss && r.w === 5, 'Boss in Welle 5', JSON.stringify(r));

  /* ---------- T11 saving and loading ---------- */
  await game(() => { __bw.S.own.soldier = true; __bw.S.lv.sword = 37; __bw.S.wave = 4; __bw.save(); });
  const saved = await game(() => JSON.stringify(__bw.S));
  await page.goto(GAME_URL);
  await page.waitForTimeout(200);
  await page.click('#m-load');
  await page.click('#slot-0');
  const loaded = await game(() => JSON.stringify(__bw.S));
  ok(saved === loaded, 'Speichern und Laden erhält den ganzen Spielstand');
  await game(() => { __bw.step(14); });
  await page.mouse.click(110, 330);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'main2.png' });

  ok(errors.length === 0, 'Keine Laufzeitfehler im gesamten Lauf', errors.slice(0, 3));
  report.finish();
  await browser.close();
})();
