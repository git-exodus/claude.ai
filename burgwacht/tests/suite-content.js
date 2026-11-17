/*
 * suite-content: content added in 0.8.
 *
 *   - daggers as starting weapon, sword in the shop for 5 gold
 *   - knight: patrol circle, charges enemies close to the castle, never beyond 175 U
 *   - new enemies: speeds, siege damage, club hits on soldiers, first wave of each type
 *   - wolf packs of four (queue and spawn point), boss rotation, the alpha brings a pack
 *   - lava colours for the new enemies
 *   - not quiet (second page): menu and game music, skill hint after wave 2,
 *     chest opening animation (about 2 s, tap to skip), music switch and its saving
 *
 * Chromium runs with its normal autoplay policy, like a phone: audio only starts
 * after a tap. Whether the music sounds good cannot be tested here.
 */
const { chromium } = require('playwright');
let fails = 0;
const ok = (c, m, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== '' ? '  [' + x + ']' : '')); if (!c) fails++; };

(async () => {
  const b = await chromium.launch();
  const url = 'file://' + require('path').resolve(__dirname, '../android/app/src/main/assets/index.html');
  const errs = [];
  // quiet = no rewards, hints, chest animation or music, so they cannot disturb other checks
  const open = async (quiet) => {
    const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1 });
    if (quiet) await ctx.addInitScript(() => { window.__bwQuiet = true; });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(url); await p.evaluate(() => localStorage.clear()); await p.goto(url); await p.waitForTimeout(150);
    return p;
  };
  const newGame = async p => { await p.click('#m-start'); await p.click('#slot-0'); if (await p.evaluate(() => !document.getElementById('dialog').hidden)) await p.click('#dlg-0'); };
  let p = await open(true), r;
  const E = f => p.evaluate(f);
  await newGame(p);

  // ---- Startwaffe ----
  r = await E(() => ({ active: __bw.S.active, locked: [...document.querySelectorAll('.wp.locked')].map(x => x.dataset.w).join(), first: document.querySelector('.wps .wp').dataset.w }));
  ok(r.active === 'dagger' && r.locked === 'sword,star,bow,wand' && r.first === 'dagger', 'Neues Spiel startet mit Dolchen, Schwert gesperrt, Dolche ganz links', JSON.stringify(r));
  const lose = () => E(() => { const g = __bw; g.setHp(1); g.S.wallHp = 0; g.step(2); g.spawn('slime'); for (let i = 0; i < 80 && !g.state().paused; i++) { g.ens().forEach(e => { e.hp = 1e9; e.sp = 250; }); g.step(0.5); } return !document.getElementById('shop').hidden; });
  await E(() => { __bw.S.gold = 400; });
  ok(await lose(), 'Shop nach Niederlage');
  r = await E(() => document.getElementById('buy-sword').textContent);
  ok(r === '5 Gold', 'Schwert kostet im Shop 5 Gold', r);
  await p.click('#buy-sword');
  ok(await E(() => __bw.S.own.sword && __bw.S.gold === 395), 'Schwert gekauft');

  // ---- Ritter ----
  await p.click('#tab-troops');
  r = await E(() => document.getElementById('buy-knight').closest('.item').querySelector('b').textContent + ' → ' + document.getElementById('buy-knight').textContent);
  ok(r === 'Ritter → 300 Gold', 'Ritter im Reiter Truppen für 300 Gold', r);
  await p.click('#buy-knight'); await p.click('#shopgo');
  if (await E(() => !document.getElementById('dialog').hidden)) await p.click('#dlg-0');
  r = await E(() => { const g = __bw, c = g.pos(); g.clear(); let far = 0; for (let i = 0; i < 300; i++) { g.ens().forEach(e => e.dead = true); g.step(1 / 30); const k = g.knight(); far = Math.max(far, Math.hypot(k.x - c.cx, k.y - c.cy) / c.U); } const k = g.knight(); return { active: k.active, far: Math.round(far), gold: g.S.gold }; });
  ok(r.active && r.far >= 60 && r.far <= 90, 'Ritter reitet ohne Gegner auf seinem Kreis um die Burg', 'Abstand bis ' + r.far + ' U');
  r = await E(() => { const g = __bw, c = g.pos(); const e = g.spawn('ogre'); e.hp = e.max = 1e6; e.sp = 0; e.x = c.cx + 130 * c.U; e.y = c.cy; let near = 1e9, far = 0;
    for (let i = 0; i < 180; i++) { g.ens().forEach(x => { if (x !== e) x.dead = true; }); g.step(1 / 60); const k = g.knight(); near = Math.min(near, Math.hypot(k.x - e.x, k.y - e.y) / c.U); far = Math.max(far, Math.hypot(k.x - c.cx, k.y - c.cy) / c.U); }
    const dmg = e.max - e.hp; e.dead = true; return { near: Math.round(near), dmg: Math.round(dmg), far: Math.round(far) }; });
  ok(r.near < 25 && r.dmg > 0, 'Ritter stürmt auf einen Gegner nahe der Burg und trifft ihn', JSON.stringify(r));
  r = await E(() => { const g = __bw, c = g.pos(); const e = g.spawn('ogre'); e.hp = e.max = 1e6; e.sp = 0; e.x = c.cx + 240 * c.U; e.y = c.cy; let far = 0;
    for (let i = 0; i < 180; i++) { g.ens().forEach(x => { if (x !== e) x.dead = true; }); g.step(1 / 60); const k = g.knight(); far = Math.max(far, Math.hypot(k.x - c.cx, k.y - c.cy) / c.U); }
    const dmg = e.max - e.hp; e.dead = true; return { far: Math.round(far), dmg: Math.round(dmg) }; });
  ok(r.far <= 175 && r.dmg === 0, 'Gegner weit weg lässt er in Ruhe und entfernt sich nie weiter als 175 U', JSON.stringify(r));

  // ---- Neue Gegner ----
  r = await E(() => { const g = __bw, o = {}; g.S.cleared = 200; for (const t of ['slime', 'bat', 'koboldSlow', 'koboldFast', 'wolf', 'orcClub', 'orcAxe', 'wolfAlpha', 'orcKing']) { g.S.wave = 1; const e = g.spawn(t); o[t] = { sp: e.sp, siege: e.siege, club: e.club, boss: e.boss }; e.dead = true; } return o; });
  ok(r.koboldSlow.sp < r.slime.sp && r.koboldFast.sp > r.bat.sp && r.wolf.sp > r.slime.sp * 2, 'Kobold langsam, flinker Kobold schneller als Fledermäuse, Wölfe schnell', `Kobold ${r.koboldSlow.sp}, flink ${r.koboldFast.sp}, Wolf ${r.wolf.sp}`);
  ok(r.orcAxe.siege === 2 && r.orcKing.siege === 3 && r.orcClub.club && r.orcKing.club && r.wolfAlpha.boss && r.orcKing.boss, 'Ork mit Axt 2 Schaden an Mauer und Burg, Orkkönig 3, Keulen-Orks mit Keule');
  r = await E(() => { const g = __bw, seen = {}; for (const w of [3, 4, 5, 6, 9, 10, 14, 15, 40]) { g.S.cleared = 200; g.S.wave = w; const types = new Set(); for (let k = 0; k < 6; k++) { g.startGame(0, false); g.S.cleared = 200; g.S.wave = w; g.step(0.01); } }
    const first = {}; for (let w = 1; w <= 20; w++) { const types = new Set(); for (let k = 0; k < 8; k++) { g.S.cleared = 200; g.S.wave = w; g.save(); g.startGame(0, false); g.queue().forEach(t => types.add(t.replace('+', ''))); } for (const t of types) if (!(t in first)) first[t] = w; }
    return first; });
  ok(r.koboldSlow === 4 && r.koboldFast === 4 && r.wolf === 6 && r.orcClub === 10 && r.orcAxe === 15, 'Kobolde ab Welle 4, Wölfe ab 6, Keulen-Ork ab 10, Axt-Ork ab 15', JSON.stringify(r));
  r = await E(() => { const g = __bw; let packs = 0, bad = 0; for (let k = 0; k < 10; k++) { g.S.cleared = 200; g.S.wave = 30; g.save(); g.startGame(0, false); const q = g.queue(); q.forEach((t, i) => { if (t === 'wolf+') { packs++; if (q.slice(i + 1, i + 4).join() !== 'wolf,wolf,wolf') bad++; } }); } return { packs, bad }; });
  ok(r.packs > 0 && r.bad === 0, 'Wölfe stehen in der Welle immer als Rudel zu viert', JSON.stringify(r));
  r = await E(() => { const g = __bw, c = g.pos(); g.S.cleared = 200; g.S.wave = 30; g.save(); g.startGame(0, false); g.clear(); const q = ['wolf+', 'wolf', 'wolf', 'wolf']; g.queue(); g.step(2);
    const before = g.state().enemies; window.__q = q; return before; });
  r = await E(() => { const g = __bw, c = g.pos(); g.S.cleared = 200; g.S.wave = 30; let found = null;
    for (let tries = 0; tries < 30 && !found; tries++) { g.save(); g.startGame(0, false); if (!g.queue().includes('wolf+')) continue; for (let i = 0; i < 4000 && !found; i++) { g.step(1 / 60); g.setHp(10); const wolves = g.ens().filter(e => e.type === 'wolf'); if (wolves.length >= 4) found = wolves.slice(0, 4).map(e => [e.x, e.y]); } }
    if (!found) return null; let spread = 0; for (const [x, y] of found) for (const [x2, y2] of found) spread = Math.max(spread, Math.hypot(x - x2, y - y2) / c.U); return Math.round(spread); });
  ok(r !== null && r < 60, 'Ein Rudel erscheint gemeinsam an einer Stelle', r + ' U Abstand');
  r = await E(() => [5, 10, 15, 20, 25, 30].map(w => __bw.bossFor(w)).join());
  ok(r === 'boss,wolfAlpha,orcKing,boss,wolfAlpha,orcKing', 'Bosse wechseln: Schleimkönig, Wolfsalpha, Orkkönig', r);
  r = await E(() => { const g = __bw; g.S.cleared = 200; g.S.wave = 10; g.save(); g.startGame(0, false); const q = g.queue(), i = q.indexOf('wolfAlpha'); return q.slice(i, i + 5).join(); });
  ok(r === 'wolfAlpha,wolf,wolf,wolf,wolf', 'Der Wolfsalpha kommt mit seinem Rudel', r);
  r = await E(() => { const g = __bw; g.clear(); g.sols().length = 0; g.S.own.soldier = false; g.S.own.knight = false; g.S.wall = 2; g.S.wallHp = 5; g.setHp(10); g.step(2);
    const hit = t => { const e = g.spawn(t); e.hp = 1e9; e.sp = 300; const w = g.S.wallHp, h = g.state().hp; let n = 0; while (g.S.wallHp === w && g.state().hp === h && n < 900) { g.ens().forEach(x => { if (x !== e) x.dead = true; }); g.step(1 / 60); n++; } return [w - g.S.wallHp, h - g.state().hp]; };
    const axe = hit('orcAxe'), king = hit('orcKing'); g.S.wallHp = 0; const axe2 = hit('orcAxe'); return { axe, king, axe2 }; });
  ok(r.axe.join() === '2,0' && r.king[0] === 3 && r.axe2.join() === '0,2', 'Axt-Ork: 2 Schaden an der Mauer, ohne Mauer 2 Leben; Orkkönig 3', JSON.stringify(r));
  r = await E(() => { const g = __bw, c = g.pos(); g.clear(); g.sols().length = 0; g.S.own.soldier = true; g.step(0.1); g.S.own.soldier = false;
    const s = { x: c.cx + 60 * c.U, y: c.cy, hp: 5, maxHp: 5, attackCd: 9, flash: 0, swing: 0, walking: false, facing: 1, phase: 0, guardAngle: 1 }; g.sols().length = 0; g.sols().push(s);
    const e = g.spawn('orcClub'); e.hp = 1e9; e.sp = 0; e.x = s.x + 8 * c.U; e.y = s.y; e.attackCd = 0; const x0 = s.x; g.step(1 / 60); return { hp: s.hp, pushed: Math.round(Math.abs(s.x - x0) / c.U) }; });
  ok(r.hp === 3 && r.pushed >= 10, 'Keulen-Ork trifft Soldaten doppelt und stößt sie zurück', JSON.stringify(r));
  await E(() => { const g = __bw, c = g.pos(); g.clear(); g.sols().length = 0; g.step(2); ['koboldSlow', 'koboldFast', 'wolf', 'wolfAlpha', 'orcClub', 'orcAxe', 'orcKing'].forEach((t, i) => { const e = g.spawn(t); e.sp = 0; e.hp = e.max = 1e9; e.x = 50 + (i % 4) * 85; e.y = 150 + Math.floor(i / 4) * 120; }); g.step(0.2); });
  await p.waitForTimeout(100); await p.screenshot({ path: 'content-enemies.png' });

  // ---- Lava: neue Gegner bekommen Lava-Farben ----
  r = await E(() => { const g = __bw; g.S.cleared = 100; g.S.wave = 101; g.save(); g.startGame(0, false); g.switchWorld('lava'); const o = ['koboldSlow', 'wolf', 'orcKing'].map(t => { const e = g.spawn(t); e.dead = true; return e.color; }); g.switchWorld('meadow'); return o.join(); });
  ok(r === '#a5603a,#5a4a48,#6a2a1a', 'Neue Gegner haben in der Lava-Welt eigene Farben', r);

  // ---- Truhen-Animation, Fähigkeiten-Hinweis, Musik (ohne Ruhe-Modus) ----
  p = await open(false);
  const F = f => p.evaluate(f);
  r = await F(() => __bw.music());
  ok(r.track === 'menu' && r.audio === 'suspended', 'Vor der ersten Berührung ist der Ton gesperrt (Browser-Regel)', JSON.stringify(r));
  await p.mouse.click(180, 300);   // a tap on the menu background, not on a button
  await p.waitForTimeout(300);     // resuming the audio context is asynchronous
  r = await F(() => __bw.music());
  ok(r.track === 'menu' && r.playing && r.audio === 'running', 'Hauptmenü spielt nach dem ersten Tippen die Burghof-Musik', JSON.stringify(r));
  await p.click('#m-start');
  await p.click('#slot-0');
  r = await F(() => ({ m: __bw.music(), intro: document.getElementById('dlg-text').textContent }));
  ok(r.m.track === 'game' && r.m.playing && r.m.audio === 'running' && r.intro.includes('Nehmt Eure Dolche'), 'Im Spiel läuft die Wachtposten-Musik, Begrüßung nennt die Dolche', JSON.stringify(r.m));
  await p.click('#dlg-0');
  await F(() => { const g = __bw; g.flags.achievements = false; g.step(3); g.clear(); g.step(0.1); });
  ok(await F(() => __bw.S.wave === 2 && document.getElementById('dialog').hidden), 'Nach Welle 1 noch kein Hinweis');
  await F(() => { const g = __bw; g.step(3); g.clear(); g.step(0.1); });
  r = await F(() => ({ open: !document.getElementById('dialog').hidden, text: document.getElementById('dlg-text').textContent }));
  ok(r.open && r.text.startsWith('Halte eine Waffe unten gedrückt'), 'Nach Welle 2 erscheint der Hinweis auf die Fähigkeiten', r.text.slice(0, 50));
  await p.click('#dlg-0');
  await F(() => { const g = __bw; g.S.cleared = 1; g.S.wave = 2; g.save(); g.startGame(0, false); g.step(3); g.clear(); g.step(0.1); });
  ok(await F(() => document.getElementById('dialog').hidden || !document.getElementById('dlg-text').textContent.startsWith('Halte')), 'Der Hinweis erscheint nur einmal');
  await F(() => { const g = __bw; g.step(3); g.clear(); g.step(0.1); });
  r = await F(() => ({ fx: !document.getElementById('chestfx').hidden, dialog: !document.getElementById('dialog').hidden, paused: __bw.state().paused }));
  ok(r.fx && !r.dialog && r.paused, 'Nach Welle 3 läuft zuerst die Truhen-Animation, das Spiel pausiert', JSON.stringify(r));
  await p.screenshot({ path: 'content-chest-start.png' });
  const t0 = Date.now();
  await p.waitForFunction(() => !document.getElementById('dialog').hidden, null, { timeout: 5000 });
  const took = (Date.now() - t0) / 1000;
  ok(took > 1.4 && took < 2.8 && await F(() => document.getElementById('chestfx').hidden && document.getElementById('dlg-title').textContent === 'Schatztruhe'), 'Nach etwa 2 Sekunden öffnet sich die Truhe und die Auswahl erscheint', took.toFixed(1) + ' s');
  await p.click('#dlg-0');
  await F(() => { const g = __bw; g.S.cleared = 5; g.S.wave = 6; g.step(3); g.clear(); g.step(0.1); });
  await p.waitForTimeout(500); await p.click('#chestfx');
  await p.waitForTimeout(80);
  ok(await F(() => !document.getElementById('dialog').hidden && document.getElementById('chestfx').hidden), 'Antippen überspringt die Animation');
  await p.click('#dlg-0');
  await p.click('#b-pause');
  r = await F(() => document.getElementById('p-music').textContent);
  ok(r === 'Musik: an', 'Pause-Menü hat einen eigenen Musik-Schalter', r);
  await p.click('#p-music');
  r = await F(() => ({ m: __bw.music(), t: document.getElementById('p-music').textContent, snd: __bw.DB.opts.mute }));
  ok(!r.m.playing && r.m.track === null && r.t === 'Musik: aus' && r.snd === false, 'Musik lässt sich ausschalten, der Ton bleibt an', JSON.stringify(r));
  await p.click('#p-menu');
  ok(await F(() => !__bw.music().playing), 'Ausgeschaltete Musik bleibt auch im Menü aus');
  await p.reload(); await p.waitForTimeout(150); await p.click('#m-load');
  ok(await F(() => __bw.DB.opts.music === false && !__bw.music().playing), 'Die Musik-Einstellung wird gespeichert');

  ok(errs.length === 0, 'Keine Laufzeitfehler im gesamten Lauf', errs.slice(0, 3));
  console.log(fails ? ('FEHLER: ' + fails) : 'ALLE TESTS BESTANDEN');
  await b.close();
})();
