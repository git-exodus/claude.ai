// Tests for balance, shop upgrades, special enemies, chests, achievements and the lava world.
const { chromium } = require('playwright');
let fails = 0;
const ok = (c, m, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== '' ? '  [' + x + ']' : '')); if (!c) fails++; };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { window.__bwQuiet = true; });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const url = 'file://' + require('path').resolve(__dirname, '../android/app/src/main/assets/index.html');
  const E = f => p.evaluate(f);
  const dialogOpen = () => E(() => !document.getElementById('dialog').hidden);
  const dismiss = async () => { if (await dialogOpen()) await p.click('#dlg-0'); };
  const fresh = async () => {
    await p.goto(url); await E(() => localStorage.clear()); await p.goto(url); await p.waitForTimeout(200);
    await p.click('#m-start'); await p.click('#slot-0'); await dismiss();
  };
  const lose = () => E(() => {
    const g = __bw; g.setHp(1); g.S.wallHp = 0; g.step(2); g.spawn('slime');
    for (let i = 0; i < 80 && !g.state().paused; i++) { g.ens().forEach(e => { e.hp = 1e9; e.sp = 250; }); g.step(0.5); }
    return !document.getElementById('shop').hidden;
  });
  const win = () => E(() => { const g = __bw; g.step(3); g.clear(); g.step(0.1); return { w: g.S.wave, gold: g.S.gold, c: g.S.cleared, hp: g.state().hp }; });
  const buy = async (tab, id) => { await p.click('#tab-' + tab); await p.click('#buy-' + id); };
  let r;

  await fresh();

  // ---- Leichtere erste Wellen ----
  r = await E(() => { const g = __bw, o = []; for (const w of [1, 2, 3, 4]) { g.S.cleared = 9; g.S.wave = w; const e = g.spawn('slime'); o.push(+e.max.toFixed(2)); e.dead = true; } g.S.cleared = 0; g.S.wave = 1; return o; });
  ok(r.join() === '2.6,4.59,6.97,11.36', 'Schleim-Leben in Welle 1 bis 4 nach allen Nachlässen', r.join(' / '));
  r = await E(() => { const g = __bw, out = { slime: [], ogre: [], bad: [] };
    // expected values from the three rules, written out independently of the game code
    const f = w => 1 + 0.22 * (w - 1) + 0.015 * (w - 1) * (w - 1), early = w => 1 - 0.3 * Math.max(0, 10 - w) / 9, share = w => Math.max(0, Math.min(1, (13 - w) / 5));
    const before = (hp0, w) => (hp0 * f(w) - (w <= 3 ? 2 : 0)) * early(w);
    for (const w of [1, 4, 8, 9, 11, 13, 30]) { g.S.cleared = 40; g.S.wave = w;
      const s = g.spawn('slime'), o = g.spawn('ogre'); s.dead = o.dead = true;
      const es = Math.max(1, before(10, w) - 3 * share(w)), eo = before(42, w) * (1 - 0.5 * share(w));
      if (Math.abs(s.max - es) > 1e-6 || Math.abs(o.max - eo) > 1e-6) out.bad.push(w);
      out.slime.push(+(before(10, w) - s.max).toFixed(1)); out.ogre.push(Math.round((1 - o.max / before(42, w)) * 100)); }
    g.S.cleared = 0; g.S.wave = 1; return out; });
  ok(r.bad.length === 0 && r.slime.join() === '3,3,3,2.4,1.2,0,0' && r.ogre.join() === '50,50,50,40,20,0,0', 'Welle 1 bis 8: kleine Gegner 3 HP weniger, dicke 50 %; danach läuft es bis Welle 13 linear aus', 'Welle 1/4/8/9/11/13/30 · Schleim −' + r.slime.join('/') + ' HP · Oger −' + r.ogre.join('/') + ' %');
  r = await E(() => { const g = __bw, c = g.pos(), S = g.S, o = {}; S.own.dagger = S.own.bow = true;
    for (const w of ['sword', 'dagger', 'bow']) { S.active = w; g.hold({ x: c.cx + 60, y: c.cy - 80 }); const l = g.aimLine(); o[w] = l ? [Math.round(Math.atan2(l.y2 - l.y1, l.x2 - l.x1) * 100), Math.round(Math.atan2(-80, 60) * 100), l.x2 < 0 || l.x2 > c.W || l.y2 < 0 || l.y2 > c.H] : null; }
    g.hold(null); o.none = g.aimLine(); S.active = 'sword'; S.own.dagger = S.own.bow = false; return o; });
  ok(r.sword === null && r.none === null && r.dagger && r.bow && r.dagger[0] === r.dagger[1] && r.dagger[2] && r.bow[0] === r.bow[1], 'Ziellinie bei Dolchen und Bogen: von der Burg durch den Finger bis zum Rand, sonst keine', JSON.stringify(r));

  // ---- XP-Tempo ----
  r = await E(() => {
    // expected XP per wave from the type shares, then the level the always-used weapon reaches
    const need = __bw.need, xpOf = { slime: 1, bat: 1, ogre: 3, shield: 2, archer: 2 };
    let xp = 0, level = 1; const out = {};
    for (let w = 1; w <= 100; w++) {
      const share = { ogre: w >= 3 ? Math.min(0.25, 0.04 * w) : 0, bat: w >= 2 ? Math.min(0.3, 0.06 * w) : 0, shield: w >= 8 ? Math.min(0.1, 0.01 * w) : 0, archer: w >= 12 ? Math.min(0.05, 0.004 * w) : 0 };
      share.slime = 1 - share.ogre - share.bat - share.shield - share.archer;
      let per = 0; for (const t in share) per += share[t] * xpOf[t];
      xp += __bw.waveCount(w) * per + (w % 5 === 0 ? 20 : 0);
      while (xp >= need(level)) { xp -= need(level); level++; }
      if ([5, 10, 20, 30, 50, 100].includes(w)) out[w] = level;
    }
    return out;
  });
  const target = { 5: 4, 10: 8, 20: 15, 30: 22, 50: 40, 100: 80 };
  ok(Object.keys(target).every(w => Math.abs(r[w] - target[w]) <= Math.max(2, target[w] * 0.15)), 'XP-Tempo trifft die Zielkurve (Soll 4/8/15/22/40/80)', Object.keys(r).map(w => 'Welle ' + w + ': Lvl ' + r[w]).join(' · '));
  r = await E(() => { const g = __bw; g.S.lv.sword = 1000; const o = [g.cdOf('sword'), Math.round(g.dmgOf('sword')), g.need(999)]; g.S.lv.sword = 1; return o; });
  ok(r[0] === 0.5 && r[1] === 909 && r[2] > 0 && Number.isFinite(r[2]), 'Formeln rechnen auch mit Level 1000 (Tempo bleibt auf Level-100-Wert)', r.join(' / '));

  // ---- Dolche ----
  r = await E(() => { const g = __bw; g.S.own.dagger = true; g.S.active = 'dagger'; g.hud(); const t = [...document.getElementById('winfo').children].map(x => x.textContent).join('|'); g.S.active = 'sword'; g.S.own.dagger = false; g.hud(); return t; });
  ok(r === 'Dolche Lvl 1|Schaden 9|alle 2,0 s|Neu ab Lvl 5', 'Dolche: Grundschaden 9 statt 7', r);

  // ---- Shop-Reiter und neue Angebote ----
  await E(() => { __bw.S.gold = 2000; });
  ok(await lose(), 'Niederlage öffnet den Shop');
  r = await E(() => ({ tabs: [...document.querySelectorAll('#shoptabs button')].map(x => x.textContent + (x.getAttribute('aria-pressed') === 'true' ? '*' : '')).join('|'), card: document.querySelector('#shop .shopcard').getBoundingClientRect().height }));
  ok(r.tabs === 'Waffen*|Burg|Truppen|Boni', 'Shop hat vier Reiter, Schmiede noch verborgen', r.tabs);
  const h0 = r.card;
  await p.screenshot({ path: 'shop-tabs.png' });
  await p.click('#tab-castle');
  r = await E(() => ({ h: document.querySelector('#shop .shopcard').getBoundingClientRect().height, go: document.getElementById('shopgo').getBoundingClientRect().bottom, scroll: document.getElementById('items').scrollHeight <= document.getElementById('items').clientHeight + 1, pips: document.querySelectorAll('#items .pips u').length }));
  ok(r.h === h0 && r.scroll && r.pips === 8, 'Reiterwechsel ändert die Fenstergröße nicht, nichts muss gescrollt werden, Stufen als Punkte', r.pips + ' Punkte');
  await buy('castle', 'hp'); await p.click('#buy-hp'); await buy('castle', 'tower');
  await buy('troops', 'soldier'); await p.click('#buy-armor'); await p.click('#buy-squad');
  await buy('boni', 'goldBonus'); await p.click('#buy-xpBonus');
  r = await E(() => { const S = __bw.S; return [S.hpLv, S.own.tower, S.own.armor, S.own.squad, S.goldLv, S.xpLv, S.gold].join(); });
  ok(r === '2,true,true,true,1,1,' + (2000 - 60 - 150 - 120 - 2 - 50 - 90 - 80 - 60), 'Burg-Leben, Turmschütze, Rüstung, Verstärkung, Gold- und XP-Bonus gekauft', r);
  await p.click('#shopgo'); await dismiss();
  r = await E(() => { const h = document.getElementById('hearts'), hud = document.getElementById('hud').getBoundingClientRect(), g = document.getElementById('gold').getBoundingClientRect(); return { n: h.children.length, hp: __bw.state().hp, many: h.classList.contains('many'), fits: g.right <= hud.right && h.getBoundingClientRect().left >= document.querySelector('.wavectl').getBoundingClientRect().right }; });
  ok(r.n === 15 && r.hp === 15 && r.many && r.fits, '15 Burg-Leben: Herzen in zwei Reihen, Leiste läuft nicht über', JSON.stringify(r));
  r = await E(() => { const g = __bw; g.step(2.5); const s = g.sols()[0]; const a = s && s.hp; for (let i = 0; i < 400; i++) { g.ens().forEach(e => e.dead = true); g.step(0.1); } return [a, g.state().soldiers]; });
  ok(r[0] === 5 && r[1] === 6, 'Soldaten halten 5 Schläge aus, bis zu 6 gleichzeitig', r);
  r = await E(() => { const g = __bw; g.S.own.soldier = false; g.sols().length = 0; g.clear(); g.step(2); const e = g.spawn('ogre'); e.hp = e.max = 1e6; e.sp = 0; e.x = g.pos().cx + 80; e.y = g.pos().cy; let seen = false; for (let i = 0; i < 240; i++) { g.ens().forEach(x => { if (x !== e) x.dead = true; }); g.step(1 / 60); if (g.prj().some(q => q.k === 'towerBolt')) seen = true; } return [seen, e.max - e.hp > 0, +(e.max - e.hp).toFixed(1)]; });
  ok(r[0] && r[1], 'Turmschütze schießt von selbst und trifft', r[2] + ' Schaden in 4 s');
  r = await E(() => { const g = __bw; g.S.own.tower = false; g.clear(); g.S.cleared = 2; g.S.wave = 3; g.hud(); return 0; });
  await E(() => __bw.startGame(0, false));
  r = await E(() => { const g = __bw; g.S.own.tower = false; g.S.cleared = 2; g.S.wave = 3; const gold0 = g.S.gold; g.step(3); g.clear(); g.step(0.1); g.step(3); g.S.xp.sword = 0; const x0 = 0, l0 = g.S.lv.sword; g.S.lv.sword = Math.max(l0, 5); const l1 = g.S.lv.sword; const e = g.spawn('slime'); e.hp = 1; e.xp = 4; g.ens().forEach(x => { if (x !== e) x.dead = true; }); g.ready(); g.attack(e.x, e.y); g.step(0.2); return [g.S.gold - gold0, +(g.S.xp.sword - x0).toFixed(2), g.S.lv.sword - l1]; });
  ok(r[0] === 4, 'Goldbonus +25 %: Welle 3 gibt 4 statt 3 Gold', r[0]);
  ok(r[2] === 0 && r[1] === 5, 'XP-Bonus +25 %: 4 XP werden zu 5', r[1]);

  // ---- Besondere Gegner ----
  r = await E(() => { const g = __bw; g.S.own.dagger = g.S.own.star = true; g.clear(); g.step(2);
    const mk = () => { const e = g.spawn('shield'); e.hp = e.max = 1e6; e.sp = 0; e.x = g.pos().cx + 90; e.y = g.pos().cy; return e; };
    g.S.active = 'dagger'; let e = mk(); g.ready(); g.attack(e.x, e.y); for (let i = 0; i < 60; i++) { g.ens().forEach(x => { if (x !== e) x.dead = true; }); g.step(1 / 60); } const proj = e.max - e.hp; e.dead = true;
    g.S.active = 'star'; e = mk(); g.step(6); g.ens().forEach(x => { if (x !== e) x.dead = true; }); g.ready(); g.attack(e.x, e.y); g.step(0.05); const area = e.max - e.hp; e.dead = true; g.S.active = 'sword';
    return [+proj.toFixed(2), +(g.dmgOf('dagger') * 0.25).toFixed(2), +area.toFixed(1), +g.dmgOf('star').toFixed(1)]; });
  ok(r[0] === r[1] && r[2] === r[3], 'Schildträger: Geschosse machen nur 25 % Schaden, Flächenschaden voll', `Dolch ${r[0]} von ${(r[1] * 4).toFixed(1)}, Morgenstern ${r[2]} von ${r[3]}`);
  r = await E(() => { const g = __bw; g.clear(); g.sols().length = 0; g.S.wall = 2; g.S.wallHp = 5; g.setHp(15); g.step(2);
    const e = g.spawn('archer'); e.hp = e.max = 1e6; const c = g.pos(); let t = 0; const hits = [];
    while (t < 30) { g.ens().forEach(x => { if (x !== e) x.dead = true; }); const w = g.S.wallHp; g.step(1 / 60); t += 1 / 60; if (g.S.wallHp < w) hits.push(+t.toFixed(1)); if (hits.length === 3) break; }
    const d = Math.hypot(e.x - c.cx, e.y - c.cy) / c.U; g.S.wallHp = 0; g.S.wall = 0; e.shotCd = 0.01; g.step(0.6); const hp = g.state().hp; e.dead = true; g.hud();
    return { d: Math.round(d), gaps: [+(hits[1] - hits[0]).toFixed(1), +(hits[2] - hits[1]).toFixed(1)], hp }; });
  ok(r.d <= 105 && r.d >= 95 && r.gaps.every(x => Math.abs(x - 4) <= 0.15) && r.hp === 14, 'Armbrustschütze bleibt auf Abstand stehen und trifft alle 4 s Mauer oder Burg', JSON.stringify(r));

  // ---- Truhe ----
  await E(() => { const g = __bw; g.flags.chests = true; g.clear(); g.S.cleared = 9; g.S.wave = 10; g.save(); });
  await E(() => __bw.startGame(0, false));
  await E(() => { __bw.flags.chests = true; });
  r = await win();
  r = await E(() => ({ open: !document.getElementById('dialog').hidden, title: document.getElementById('dlg-title').textContent, n: document.querySelectorAll('#dlg-buttons button').length, paused: __bw.state().paused, labels: [...document.querySelectorAll('#dlg-buttons button')].map(x => x.firstChild.textContent) }));
  ok(r.open && r.title === 'Schatztruhe' && r.n === 3 && r.paused && new Set(r.labels).size === 3, 'Nach Welle 10 erscheint die Truhe mit drei verschiedenen Boni', r.labels.join(' | '));
  await p.screenshot({ path: 'chest.png' });
  await E(() => __back()); ok(await dialogOpen(), 'Truhe lässt sich nicht wegdrücken, man muss wählen');
  const d0 = await E(() => __bw.dmgOf('sword'));
  await p.click('#dlg-0');
  r = await E(() => ({ boons: JSON.stringify(__bw.S.run.boons), chests: __bw.S.run.chests.join(), paused: __bw.state().paused }));
  ok(!r.paused && r.chests === 'meadow:10', 'Wahl schließt die Truhe, das Spiel läuft weiter', r.boons);
  r = await E(() => { const g = __bw, S = g.S; S.run.boons = {}; const d = g.dmgOf('sword'), c = g.cdOf('sword'); S.run.boons = { damage: 1, speed: 1 }; return [+(g.dmgOf('sword') / d).toFixed(3), +(g.cdOf('sword') / c).toFixed(3)]; });
  ok(r.join() === '1.25,0.8', 'Boni wirken: +25 % Schaden, 20 % schnellere Angriffe', r.join(' / '));
  await E(() => { const g = __bw; g.S.wave = 10; g.save(); }); await E(() => __bw.startGame(0, false)); await E(() => { __bw.flags.chests = true; __bw.S.wave = 10; __bw.S.run.boons = { damage: 1 }; });
  await win(); ok(!(await dialogOpen()), 'Dieselbe Welle gibt im selben Lauf keine zweite Truhe');
  await lose(); await p.click('#shopgo'); await dismiss();
  r = await E(() => JSON.stringify(__bw.S.run)); ok(r === '{"boons":{},"chests":[]}', 'Nach einer Niederlage sind die Truhen-Boni weg', r);
  await E(() => { __bw.flags.chests = false; });

  // ---- Erfolge und Statistik ----
  await E(() => { const g = __bw; g.flags.achievements = true; g.S.stats.kills = 98; });
  const g0 = await E(() => __bw.S.gold);
  r = await E(() => { const g = __bw; g.step(2); for (let i = 0; i < 3; i++) g.spawn('slime'); g.clear(); g.step(1.2); return { gold: g.S.gold, ach: Object.keys(g.S.ach).join(), kills: g.S.stats.kills }; });
  ok(r.kills >= 100 && r.ach.includes('kills100'), 'Erfolg „100 Gegner“ wird freigeschaltet', r.ach);
  const gained = r.gold - g0;
  r = await E(() => { const g = __bw; const a = g.S.gold; for (let i = 0; i < 3; i++) g.spawn('slime'); g.clear(); g.step(1.2); return g.S.gold - a; });
  ok(gained >= 5 && r === 0, 'Belohnung wird genau einmal gezahlt', '+' + gained + ' Gold, danach +' + r);
  await E(() => { __bw.flags.achievements = false; });
  await p.click('#b-pause'); await p.click('#p-stats');
  r = await E(() => ({ open: !document.getElementById('dialog').hidden, title: document.getElementById('dlg-title').textContent, rows: document.querySelectorAll('#dlg-body .stat').length, done: document.querySelectorAll('#dlg-body .stat.done').length, kills: document.querySelector('#dlg-body .stat b').textContent }));
  ok(r.open && r.title === 'Statistik' && r.rows >= 20 && r.done >= 1 && +r.kills >= 100, 'Statistik zeigt Zahlen und Erfolge', `${r.rows} Zeilen, ${r.done} Erfolge erreicht, ${r.kills} Gegner`);
  await p.screenshot({ path: 'stats.png' });
  await p.click('#dlg-0'); ok(await E(() => !__bw.state().paused), 'Schließen der Statistik setzt das Spiel fort');

  // ---- Lava-Welt ----
  ok(await E(() => document.getElementById('b-world').hidden && !__bw.lavaUnlocked()), 'Welt-Knopf vor Welle 100 verborgen');
  await E(() => { const g = __bw; g.clear(); g.S.cleared = 99; g.S.wave = 100; g.S.gold = 0; g.S.goldLv = 0; g.S.xpLv = 0; g.save(); }); await E(() => __bw.startGame(0, false));
  r = await win();
  ok(r.c === 100 && r.gold === 100 && await E(() => !document.getElementById('b-world').hidden && __bw.lavaUnlocked()), 'Welle 100 geschafft: Lava-Welt freigeschaltet, Welt-Knopf erscheint', JSON.stringify(r));
  const meadowPixel = await E(() => __bw.groundSample());
  await p.click('#b-world');
  r = await E(() => [...document.querySelectorAll('#dlg-buttons button')].map(x => x.textContent).join(' | '));
  ok(r === 'WieseHier bist du · Welle 101 | Lava-WeltWelle 1', 'Weltauswahl zeigt beide Welten mit ihrer Welle', r);
  await p.click('#dlg-1');
  r = await E(() => { const g = __bw, S = g.S; return { world: S.world, wave: S.wave, cleared: S.cleared, parked: JSON.stringify(S.parked), queue: g.state().queue, lava: document.getElementById('wave').classList.contains('lava') }; });
  ok(r.world === 'lava' && r.wave === 1 && r.cleared === 0 && r.parked === '{"wave":101,"cleared":100}' && r.lava, 'Wechsel in die Lava-Welt: eigene Wellen ab 1, Wiese bleibt gemerkt', JSON.stringify(r));
  ok(r.queue === 130, 'Lava-Welle 1 hat 130 Gegner', r.queue);
  const lavaPixel = await E(() => __bw.groundSample());
  ok(meadowPixel !== lavaPixel, 'Der Boden sieht in der Lava-Welt anders aus');
  r = await E(() => { const g = __bw; const e = g.spawn('slime'); const o = { hp: Math.round(e.max), lava: e.lava, color: e.color, sp: e.sp }; e.dead = true; return o; });
  ok(r.hp === 1698 && r.lava && r.color === '#f0702a' && r.sp === 30, 'Lava-Gegner: Welle 1 so zäh wie Wiesen-Welle 100, eigenes Aussehen, schneller', JSON.stringify(r));
  r = await E(() => { const g = __bw; g.step(2); const e = g.spawn('slime'); e.hp = 1; e.sp = 0; e.x = g.pos().cx + 100; e.y = g.pos().cy; g.ens().forEach(x => { if (x !== e) x.dead = true; }); g.step(1 / 60); const before = g.state().enemies; g.ready(); g.attack(e.x, e.y); g.step(1 / 60); const minis = g.ens().filter(x => x.mini); return { before, n: minis.length, r: +(minis[0].r / e.r).toFixed(2), again: 0 }; });
  ok(r.n === 2 && r.r === 0.62, 'Magma-Schleim teilt sich beim Tod in zwei kleine', JSON.stringify(r));
  r = await E(() => { const g = __bw; g.ens().filter(x => x.mini).forEach(x => { x.hp = 1; x.sp = 0; }); const m = g.ens().find(x => x.mini); g.step(1); g.ready(); g.attack(m.x, m.y); g.step(0.1); return g.ens().filter(x => x.mini && !x.dead).length; });
  ok(r === 0, 'Kleine Schleime teilen sich nicht noch einmal', r);
  // in the lava world the first clear() leaves the split halves behind, so clear twice
  await E(() => { const g = __bw; g.S.gold = 0; g.step(3); g.clear(); g.step(0.05); }); r = await win();
  ok(r.c === 1 && r.gold === 3, 'Lava-Welle 1 gibt dreifaches Gold', JSON.stringify(r));
  await E(() => { const g = __bw; g.step(4); for (let i = 0; i < 12; i++) g.spawn(['slime', 'bat', 'ogre', 'shield', 'archer', 'boss'][i % 6]); g.step(5); }); await p.waitForTimeout(300);
  await p.screenshot({ path: 'lava.png' });
  // Schmiede
  await E(() => { __bw.S.gold = 1000; __bw.S.own.dagger = true; __bw.S.own.star = false; });
  await lose();
  r = await E(() => [...document.querySelectorAll('#shoptabs button')].map(x => x.textContent).join('|'));
  ok(r === 'Waffen|Burg|Truppen|Boni|Schmiede', 'In der Lava-Welt gibt es den Reiter Schmiede', r);
  await p.click('#tab-forge');
  r = await E(() => [...document.querySelectorAll('#items .item')].map(x => x.querySelector('b').textContent + ' → ' + x.querySelector('button').textContent).join(' | '));
  ok(r === 'Schwert schmieden → 100 Gold | Dolche schmieden → 100 Gold', 'Schmiede bietet nur Waffen im Besitz an', r);
  const dmg0 = await E(() => __bw.dmgOf('sword'));
  await p.click('#buy-forge-sword'); await p.click('#buy-forge-sword');
  r = await E(() => ({ gold: __bw.S.gold, stage: __bw.S.forge.sword, ratio: +(__bw.dmgOf('sword') / 10 / (1 + 0.09 * (__bw.S.lv.sword - 1))).toFixed(2), next: document.getElementById('buy-forge-sword').textContent, pip: document.querySelector('#items .pips').textContent }));
  ok(r.gold === 765 && r.stage === 2 && r.ratio === 1.2 && r.next === '182 Gold' && r.pip === 'Stufe 2', 'Schmieden: 100, dann 135 Gold, je +10 % Schaden, ohne Obergrenze', JSON.stringify(r));
  await p.screenshot({ path: 'forge.png' });
  await p.click('#shopgo'); await dismiss();
  ok(await E(() => __bw.S.world === 'lava' && __bw.S.wave === 1), 'Nach einer Niederlage geht es in derselben Welt bei Welle 1 weiter');
  // zurück und speichern
  await p.click('#b-world'); await p.click('#dlg-0');
  r = await E(() => { const S = __bw.S; return [S.world, S.wave, S.cleared, JSON.stringify(S.parked)].join(' '); });
  ok(r === 'meadow 101 100 {"wave":1,"cleared":1}', 'Zurück auf die Wiese: Fortschritt beider Welten erhalten', r);
  await p.click('#b-world'); await p.click('#dlg-1'); await p.click('#b-pause');   // paused, so nothing changes between saving and reloading
  const saved = await E(() => { __bw.save(); return JSON.stringify(__bw.S); });
  await p.goto(url); await p.waitForTimeout(200); await p.click('#m-load');
  r = await E(() => document.querySelector('#slot-0 span').textContent);
  await p.click('#slot-0');
  const lavaAgain = await E(() => __bw.groundSample());
  ok(await E(() => JSON.stringify(__bw.S)) === saved && lavaAgain === lavaPixel, 'Speichern und Laden erhält Welt, Schmiede, Statistik und Erfolge', r);

  // ---- Belastung in der Lava-Welt ----
  r = await E(() => { const g = __bw, S = g.S; Object.assign(S.own, { dagger: true, star: true, bow: true, wand: true, soldier: true, tower: true, armor: true, squad: true });
    for (const w in S.lv) S.lv[w] = 100; S.cleared = 40; S.wave = 30; S.wall = 4; g.save(); g.showMenu(); g.startGame(0, false);
    let mx = 0, n = 0, t0 = performance.now(); const ids = ['sword', 'dagger', 'star', 'bow', 'wand'];
    for (let i = 0; i < 60 * 50; i++) { if (g.state().paused) break; if (i % 300 === 0) { S.active = ids[(i / 300) % 5]; } const en = g.ens(); const t = en[(i * 13) % Math.max(1, en.length)]; g.hold(t ? { x: t.x, y: t.y } : null); g.setHp(15); S.wallHp = 25; g.step(1 / 60); n++; mx = Math.max(mx, g.state().enemies); }
    g.hold(null); return { n, mx, ms: (performance.now() - t0) / n, kinds: [...new Set(g.ens().map(e => e.type))].sort().join() }; });
  ok(r.n === 3000 && r.ms < 6, 'Lava-Welle 30 mit allen Waffen, Soldaten und Turmschütze: 50 s stabil', `bis zu ${r.mx} Gegner, ${r.ms.toFixed(2)} ms pro Bild, Typen: ${r.kinds}`);

  ok(errs.length === 0, 'Keine Laufzeitfehler im gesamten Lauf', errs.slice(0, 3));
  console.log(fails ? ('FEHLER: ' + fails) : 'ALLE TESTS BESTANDEN');
  await b.close();
})();
