/* suite-ui.js – the game driven like a child would: real mouse taps, strokes and drags on the canvas,
 * the buttons, the parents' gear (hold 3 s), settings, reset with confirmation, Back key, Exit,
 * music after the first touch, and screenshots of every scene (written to the current directory). */
const { chromium, createReport, openPage, loadClean, hatchQuick, at } = require('./lib');

(async () => {
  const R = createReport();
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser, { scale: 2 });
  const ev = (f, a) => page.evaluate(f, a);
  const step = s => ev(s => __st.step(s), s);
  const shot = name => page.screenshot({ path: name + '.png' });
  /** Moves the mouse in small steps from a to b, stepping the game in between (like a real finger). */
  async function stroke(points, stepsEach = 6, gameStep = 1 / 30) {
    await page.mouse.move(points[0].x, points[0].y);
    await page.mouse.down();
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      for (let k = 1; k <= stepsEach; k++) {
        await page.mouse.move(a.x + (b.x - a.x) * k / stepsEach, a.y + (b.y - a.y) * k / stepsEach);
        await step(gameStep);
      }
    }
    await page.mouse.up();
  }
  const zigzag = (cx, cy, w, n) => Array.from({ length: n }, (_, i) => ({ x: cx + (i % 2 ? w : -w), y: cy }));

  // ---------- menu -> game ----------
  await loadClean(page);
  await step(0.5);
  await shot('ui-menu-egg');
  await page.mouse.click(15, 300);
  await step(1);
  R.ok((await ev(() => __st.state().screen)) === 'menu', 'Tippen neben das Ei: bleibt im Menü');
  let pos = await ev(() => __st.pos());
  await page.mouse.click(pos.egg.x, pos.egg.y);
  await step(0.3);
  let st = await ev(() => ({ ...__st.state(), vis: __st.visible() }));
  R.ok(st.screen === 'game' && st.trans < 1 && st.vis.menuGone, 'Ei antippen: Übergang ins Spiel beginnt', JSON.stringify({ trans: st.trans }));
  await step(0.6);
  R.ok((await ev(() => __st.state().trans)) === 1, 'Übergang nach 0,7 s fertig');
  await shot('ui-game-egg');

  // ---------- stroke the egg with the mouse ----------
  pos = await ev(() => __st.pos());
  await stroke(zigzag(pos.egg.x, pos.egg.y, 40, 40), 4);
  let egg = await ev(() => __st.S.egg.petSec);
  R.ok(egg > 3, 'Ei mit dem Finger streicheln zählt', egg.toFixed(1) + ' s');
  await shot('ui-egg-stroked');

  // ---------- hatched: buttons ----------
  await hatchQuick(page);
  await at(page, 10, 0);
  await ev(() => { __st.S.last = __st.now(); for (const k in __st.S.needs) __st.S.needs[k] = 60; __st.step(0.6); });
  let vis = await ev(() => __st.visible());
  const btnCount = await ev(() => [...document.querySelectorAll('#actions .round')].filter(b => !b.hidden).length);
  R.ok(vis.needs && vis.actions && btnCount === 6, 'Geschlüpft: 5 Bedürfnisse, 6 Knöpfe (tagsüber Wandern statt Licht aus)', btnCount);
  await shot('ui-baby');

  // ---------- food: tap on the tray ----------
  await page.click('#act-food');
  await step(0.2);
  R.ok((await ev(() => __st.visible().tray)), 'Essen-Knopf öffnet die Futterleiste');
  await shot('ui-tray');
  await page.click('#food-apple');
  await step(0.6);
  let food = await ev(() => __st.S.needs.food);
  R.ok(Math.abs(food - 85) < 0.5, 'Apfel antippen: er fliegt zum Maul, Essen +25', food.toFixed(1));
  await step(1.5);

  // ---------- food: drag to the mouth ----------
  pos = await ev(() => __st.pos());
  let box = await page.locator('#food-leaf').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) { await page.mouse.move(box.x + 29 + (pos.mouth.x - box.x - 29) * k / 10, box.y + 29 + (pos.mouth.y - box.y - 29) * k / 10); await step(1 / 30); }
  await shot('ui-drag-food');
  await page.mouse.up();
  await step(0.6);
  food = await ev(() => __st.S.needs.food);
  R.ok(Math.abs(food - 100) < 0.5, 'Blatt zum Maul ziehen: er frisst es (Essen 100)', food.toFixed(1));
  await step(1.5);
  await ev(() => { __st.S.needs.food = 50; });
  box = await page.locator('#food-berry').boundingBox();
  await page.mouse.move(box.x + 29, box.y + 29); await page.mouse.down();
  for (let k = 1; k <= 10; k++) { await page.mouse.move(box.x + 29 - k * 2, 150 + (box.y - 150) * (10 - k) / 10); await step(1 / 30); }
  await page.mouse.up(); await step(0.6);
  R.ok(Math.abs((await ev(() => __st.S.needs.food)) - 50) < 0.5, 'Futter in den Himmel gezogen: wird nicht gefressen');
  await page.click('#close');
  await step(0.2);
  R.ok((await ev(() => __st.state().mode)) === 'idle' && !(await ev(() => __st.visible().tray)), 'X schließt die Futterleiste');

  // ---------- stroke and tap the stego ----------
  await ev(() => { __st.S.needs.love = 40; __st.soundLog.length = 0; });
  pos = await ev(() => __st.pos());
  await stroke(zigzag(pos.box.x + pos.box.w * 0.45, pos.box.y + pos.box.h * 0.45, 45, 16), 4);
  let love = await ev(() => ({ love: __st.S.needs.love, purr: __st.soundLog.some(s => s.name === 'purr') }));
  R.ok(love.love > 50 && love.purr, 'Streicheln: Liebe steigt, er schnurrt', JSON.stringify(love));
  await step(0.1);
  await shot('ui-stroke');
  await step(1);
  await page.mouse.click(pos.box.x + pos.box.w * 0.5, pos.box.y + pos.box.h * 0.5);
  await step(0.2);
  R.ok(await ev(() => __st.soundLog.some(s => s.name === 'giggle') && __st.pet.jump > 0), 'Antippen: er kichert und hüpft');
  await step(1.5);

  // ---------- poop ----------
  await ev(() => { __st.S.poops = [{ x: 0.2 }]; __st.step(0.1); });
  pos = await ev(() => __st.pos());
  await shot('ui-poop');
  await page.mouse.click(pos.poops[0].x, pos.poops[0].y - 12);
  await step(0.2);
  R.ok((await ev(() => __st.S.poops.length)) === 0, 'Kacka antippen: weg (Pling)');

  // ---------- drink, bath, brush via buttons ----------
  await ev(() => { __st.S.needs.drink = 20; });
  await page.click('#act-drink'); await step(1.2); await shot('ui-drink'); await step(1.6);
  R.ok(Math.abs((await ev(() => __st.S.needs.drink)) - 55) < 0.5, 'Trinken-Knopf: er schlabbert, +35');
  await ev(() => { __st.S.needs.clean = 20; });
  await page.click('#act-bath'); await step(0.3);
  pos = await ev(() => __st.pos());
  await stroke(zigzag(pos.box.x + pos.box.w * 0.5, pos.box.y + pos.box.h * 0.4, 50, 30), 5);
  await shot('ui-bath');
  const cleanNow = await ev(() => __st.S.needs.clean);
  R.ok(cleanNow > 40, 'Baden: mit dem Finger schrubben macht sauber', cleanNow.toFixed(1));
  await page.click('#close'); await step(0.2);
  await page.click('#act-brush'); await step(0.3);
  pos = await ev(() => __st.pos());
  await stroke(zigzag(pos.mouth.x, pos.mouth.y, 14, 20), 4);
  await shot('ui-brush');
  R.ok((await ev(() => __st.game.brush && __st.game.brush.progress > 0.3)), 'Zähne putzen mit dem Finger zählt');
  await page.click('#close'); await step(0.2);

  // ---------- ball: flick ----------
  await page.click('#act-ball'); await step(0.3);
  pos = await ev(() => __st.pos());
  await page.mouse.move(pos.ball.x, pos.ball.y); await page.mouse.down();
  for (let k = 1; k <= 5; k++) { await page.mouse.move(pos.ball.x - k * 25, pos.ball.y - k * 20); await page.waitForTimeout(16); }
  await page.mouse.up();
  let ball = await ev(() => ({ ...__st.game.ball }));
  R.ok(ball.thrown && ball.vx < 0 && ball.vh > 0, 'Ball wegschnipsen: fliegt nach links oben', JSON.stringify({ vx: Math.round(ball.vx), vh: Math.round(ball.vh) }));
  await step(0.6); await shot('ui-ball');
  await page.click('#close'); await step(0.5);

  // ---------- needs: thought bubble and wobbling icon ----------
  await ev(() => { __st.S.needs.drink = 15; __st.step(0.6); });
  R.ok(await ev(() => document.getElementById('need-drink').classList.contains('low')), 'Niedriges Bedürfnis: Symbol wackelt');
  await shot('ui-thirsty');

  // ---------- evening and night ----------
  await at(page, 19, 40);
  await ev(() => { __st.S.last = __st.now(); __st.step(0.6); });
  R.ok(await ev(() => __st.visible().bed), 'Abends erscheint der Licht-aus-Knopf');
  await shot('ui-evening');
  await page.click('#act-bed'); await step(2);
  R.ok(await ev(() => __st.isAsleep()), 'Licht-aus-Knopf: er schläft');
  await at(page, 23, 0);
  await ev(() => { __st.S.last = __st.now(); __st.step(3); });
  await shot('ui-night');
  pos = await ev(() => __st.pos());
  await ev(() => { __st.soundLog.length = 0; });
  await page.mouse.click(pos.box.x + pos.box.w / 2, pos.box.y + pos.box.h * 0.6); await step(0.2);
  R.ok(await ev(() => __st.soundLog.some(s => s.name === 'murmur')), 'Nachts antippen: er murmelt im Schlaf');

  // ---------- back key ----------
  await at(page, 10, 0);
  await ev(() => { __st.S.last = __st.now(); __st.step(0.6); });
  await page.click('#act-bath'); await step(0.2);
  let back = await ev(() => [window.__back(), __st.state().mode]);
  R.ok(back[0] === true && back[1] === 'idle', 'Zurück-Taste beendet Baden', JSON.stringify(back));
  back = await ev(() => [window.__back(), __st.state().screen]);
  R.ok(back[0] === true && back[1] === 'menu', 'Zurück-Taste im Spiel: Hauptmenü', JSON.stringify(back));
  await step(1);
  await shot('ui-menu-baby');
  back = await ev(() => window.__back());
  R.ok(back === false, 'Zurück-Taste im Hauptmenü: App darf schließen');

  // ---------- gear: hold 3 s ----------
  const gear = await page.locator('#gear').boundingBox();
  await page.mouse.move(gear.x + 20, gear.y + 20);
  await page.mouse.down(); await page.waitForTimeout(1000); await page.mouse.up(); await page.waitForTimeout(100);
  R.ok(!(await ev(() => __st.visible().settings)), 'Zahnrad kurz drücken: keine Einstellungen');
  await page.mouse.down(); await page.waitForTimeout(3300); await page.mouse.up();
  R.ok(await ev(() => __st.visible().settings), 'Zahnrad 3 s halten: Einstellungen öffnen');
  await shot('ui-settings');
  const info = await page.textContent('#s-info');
  R.ok(/Tag 1 von 30 · Baby/.test(info), 'Einstellungen zeigen Tag und Stufe', info);
  await page.fill('#s-name', 'Dino');
  R.ok((await ev(() => [__st.S.name, document.getElementById('m-title').textContent].join())) === 'Dino,Dino', 'Name ändern: auch im Hauptmenü');
  await page.click('#s-sound');
  await page.click('#s-music');
  await page.selectOption('#s-sleep', String(19 * 60 + 30));
  await page.selectOption('#s-wake', String(6 * 60 + 30));
  await page.selectOption('#s-limit', '30');
  let opts = await ev(() => ({ ...__st.S.opts }));
  R.ok(!opts.sound && !opts.music && opts.sleep === 1170 && opts.wake === 390 && opts.limit === 30, 'Ton, Musik, Schlafenszeit, Aufstehen, Spielzeit einstellbar', JSON.stringify(opts));
  R.ok((await page.textContent('#credit')).trim() === '@made by Brownii (Claude.ai) · v' + (await ev(() => __st.VERSION)), 'Fußzeile mit Version');
  // Reset: confirm dialog, cancel, then really.
  await page.click('#s-reset');
  R.ok(await ev(() => __st.visible().confirm), 'Alles zurücksetzen fragt nach');
  await shot('ui-confirm');
  await page.click('#c-no');
  R.ok(await ev(() => !__st.visible().confirm && __st.state().hatched), 'Abbrechen: nichts gelöscht');
  await page.click('#s-reset'); await page.click('#c-yes'); await step(0.3);
  st = await ev(() => ({ ...__st.state(), name: __st.S.name, vis: __st.visible(), title: document.getElementById('m-title').textContent }));
  R.ok(!st.hatched && st.screen === 'menu' && !st.vis.settings && st.name === 'Stegi' && st.title === 'Stegi', 'Ja, löschen: neues Ei im Hauptmenü', JSON.stringify({ hatched: st.hatched, screen: st.screen }));

  // ---------- APK: Exit button ----------
  const apk = await openPage(browser, { android: true });
  await loadClean(apk.page);
  R.ok(await apk.page.isVisible('#m-exit'), 'In der App gibt es den Beenden-Knopf');
  await apk.page.click('#m-exit');
  R.ok(await apk.page.evaluate(() => window.__exited === true), 'Beenden ruft Android.exit() auf');

  // ---------- sound and music after the first touch (normal autoplay rules) ----------
  const loud = await openPage(browser, { quiet: false });
  await loadClean(loud.page);
  await loud.page.evaluate(() => __st.pause(false));
  await loud.page.mouse.click(10, 10);
  await loud.page.waitForTimeout(700);
  const m1 = await loud.page.evaluate(() => __st.music);
  R.ok(m1.on && m1.ctx === 'running', 'Erste Berührung gibt Ton frei, tagsüber läuft Musik (Klang selbst nicht prüfbar)', JSON.stringify(m1));
  await loud.page.evaluate(() => { const d = new Date(__st.now()); d.setHours(22, 0); __st.setTime(d.toString()); });
  await loud.page.waitForTimeout(300);
  const m2 = await loud.page.evaluate(() => __st.music);
  R.ok(!m2.on, 'Nachts keine Musik', JSON.stringify(m2));
  R.ok(loud.errors.length === 0 && apk.errors.length === 0, 'Keine Fehler mit Ton und in der App', loud.errors.concat(apk.errors).join(' | '));

  R.ok(errors.length === 0, 'Keine Fehler in der Konsole', errors.join(' | '));
  await browser.close();
  R.finish();
})();
