/*
 * suite-menu: menus, interface and comfort features.
 *
 *   - main menu, version line, game time stands still in menus
 *   - save slots: new game, greeting, loading, overwrite confirmation, migration of old saves
 *   - weapon info line, locked weapons show their price, attack speed per level
 *   - auto-fire while the finger rests on the field
 *   - pause menu (sound, vibration), speed x2, wave progress bar, "hold wave"
 *   - ability overview on long press, Android back button and Exit (simulated)
 *   - load test: every weapon at level 100 for 40 s of auto-fire, frame rate
 */
const { chromium, GAME_URL, createReport, openPage, loadClean, dismissDialog } = require('./lib');

(async () => {
  const report = createReport(), ok = report.ok;
  const browser = await chromium.launch();
  const { context, page, errors } = await openPage(browser, { quiet: true });
  const game = fn => page.evaluate(fn);
  const visible = id => page.evaluate(id => !document.getElementById(id).hidden, id);
  const infoLine = () => game(() => [...document.getElementById('winfo').children].map(x => x.textContent).join('|'));
  /** Long press (650 ms) on a weapon button. */
  const longPress = async selector => {
    const box = await page.locator(selector).boundingBox();
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.waitForTimeout(650);
    await page.mouse.up();
  };
  let r;

  await loadClean(page);
  await page.waitForTimeout(100);

  /* ---------- main menu ---------- */
  ok(await visible('menu') && await game(() => __bw.state().paused), 'Startbildschirm erscheint, Spiel steht');
  r = await game(() => ({
    buttons: [...document.querySelectorAll('#m-main button')].filter(x => !x.hidden).map(x => x.textContent + (x.disabled ? '(aus)' : '')).join('|'),
    credit: document.getElementById('credit').textContent,
    version: __bw.VERSION,
    hud: getComputedStyle(document.getElementById('hud')).visibility,
  }));
  ok(r.buttons === 'Spiel starten|Spiel laden(aus)', 'Menü: Starten aktiv, Laden ohne Spielstand aus, Exit im Browser ausgeblendet', r.buttons);
  ok(r.credit === '@made by Brownii (Claude.ai) · v' + r.version, 'Fußzeile mit Versionsnummer', r.credit);
  ok(r.hud === 'hidden', 'Spielanzeige im Menü ausgeblendet');
  await page.screenshot({ path: 'menu.png' });
  let gameTime = await game(() => __bw.state().t);
  await page.waitForTimeout(400);
  ok(await game(() => __bw.state().t) === gameTime, 'Im Menü läuft keine Spielzeit');

  /* ---------- new game ---------- */
  await page.click('#m-start');
  r = await game(() => [...document.querySelectorAll('.slot span')].map(x => x.textContent).join('|'));
  ok(r === 'Leer|Leer', 'Platzwahl zeigt zwei leere Plätze', r);
  await page.click('#m-back');
  ok(await visible('m-main'), 'Zurück führt ins Hauptmenü');
  await page.click('#m-start');
  await page.click('#slot-0');
  r = await game(() => ({ dialog: !document.getElementById('dialog').hidden, text: document.getElementById('dlg-text').textContent, paused: __bw.state().paused }));
  ok(r.dialog && r.paused && r.text === 'Sire, die Monster greifen an. Nehmt Eure Dolche. Wir müssen uns aufrüsten!', 'Neues Spiel beginnt mit dem Begrüßungsfenster', r.text);
  await page.click('#dlg-0');
  ok(!(await visible('menu')) && await game(() => __bw.slot() === 0 && !__bw.state().paused), 'Neues Spiel in Platz 1 läuft');

  /* ---------- weapon bar and info line ---------- */
  r = await infoLine();
  ok(r === 'Dolche Lvl 1|Schaden 9|alle 2,0 s|Neu ab Lvl 5', 'Infozeile: Waffe, Schaden, Tempo, nächste Fähigkeit', r);
  r = await game(() => {
    const line = document.getElementById('winfo');
    const lineBox = line.getBoundingClientRect(), buttons = document.querySelector('.wps').getBoundingClientRect();
    return [lineBox.top > buttons.bottom, line.scrollWidth <= line.clientWidth + 1, parseFloat(getComputedStyle(line).fontSize)];
  });
  ok(r[0] && r[1] && r[2] >= 11, 'Infozeile steht unter den Waffen, passt in die Breite und ist lesbar groß', r[2] + ' px');
  r = await game(() => ['sword', 'star', 'bow', 'wand'].map(w => document.querySelector('#wp-' + w + ' .badge').textContent).join('|'));
  ok(r === '5|10|40|75', 'Gesperrte Waffen zeigen ihren Preis', r);

  /* ---------- attack speed per level ---------- */
  r = await game(() => {
    const S = __bw.S, out = {};
    for (const w of ['sword', 'dagger', 'star']) {
      out[w] = [1, 50.5, 100].map(level => { S.lv[w] = level; return +__bw.cdOf(w).toFixed(3); });
      S.lv[w] = 1;
    }
    return out;
  });
  ok(JSON.stringify(r) === '{"sword":[3.5,2,0.5],"dagger":[2,1.15,0.3],"star":[5,3,1]}', 'Tempo linear: Schwert 3,5→0,5 · Dolche 2,0→0,3 · Morgenstern 5,0→1,0', JSON.stringify(r));
  r = await game(() => {
    const S = __bw.S;
    let faster = true, previous = 9;
    for (let level = 1; level <= 100; level++) {
      S.lv.dagger = level;
      const cd = __bw.cdOf('dagger');
      if (!(cd < previous)) faster = false;
      previous = cd;
    }
    S.lv.dagger = 1;
    return faster;
  });
  ok(r, 'Tempo wird mit jedem Level stetig schneller');
  r = await game(() => {
    const g = __bw;
    g.S.lv.dagger = 100;
    g.hud();
    const text = [...document.getElementById('winfo').children].map(x => x.textContent).join('|');
    g.S.lv.dagger = 1;
    g.hud();
    return text;
  });
  ok(r === 'Dolche Lvl 100|Schaden 89|alle 0,3 s|MAX', 'Infozeile auf Lvl 100', r);

  /* ---------- auto-fire ---------- */
  r = await game(() => {
    const g = __bw;
    g.ready();
    const before = g.state().atkCount;
    g.hold({ x: 100, y: 300 });
    g.step(8);
    const whileHeld = g.state().atkCount - before;
    g.hold(null);
    g.step(8);
    return [whileHeld, g.state().atkCount - before];
  });
  ok(r[0] === 4 && r[1] === 4, 'Finger halten: Dauerfeuer im Takt des Cooldowns (Dolche alle 2 s), Loslassen stoppt', r);
  await page.mouse.move(120, 330);
  await page.mouse.down();
  await page.waitForTimeout(150);
  r = await game(() => __bw.state().atkCount);
  await page.mouse.up();
  ok(r >= 4, 'Echter Finger-Druck löst Angriff aus', r);

  /* ---------- pause menu ---------- */
  await page.click('#b-pause');
  ok(await visible('pausep') && await game(() => __bw.state().paused), 'Pause-Knopf hält das Spiel an');
  gameTime = await game(() => __bw.state().t);
  await page.waitForTimeout(300);
  ok(await game(() => __bw.state().t) === gameTime, 'In der Pause läuft keine Spielzeit');
  await page.click('#p-snd');
  r = await game(() => [__bw.DB.opts.mute, document.getElementById('p-snd').textContent]);
  ok(r[0] === true && r[1] === 'Ton: aus', 'Ton lässt sich ausschalten', r);
  await page.click('#p-vib');
  r = await game(() => [__bw.DB.opts.vib, document.getElementById('p-vib').textContent]);
  ok(r[0] === false && r[1] === 'Vibration: aus', 'Vibration lässt sich ausschalten', r);
  await page.click('#p-snd');   // sound back on; vibration stays off (checked again after the reload below)
  await page.click('#p-resume');
  ok(!(await visible('pausep')) && await game(() => !__bw.state().paused), 'Weiter setzt das Spiel fort');

  /* ---------- speed x2: game seconds per real second, measured over 1.2 s ---------- */
  const gameSpeed = async () => {
    const a = await game(() => [__bw.state().t, performance.now()]);
    await page.waitForTimeout(1200);
    const b = await game(() => [__bw.state().t, performance.now()]);
    return (b[0] - a[0]) / ((b[1] - a[1]) / 1000);
  };
  const normal = await gameSpeed();
  await page.click('#b-speed');
  const doubled = await gameSpeed();
  ok(doubled / normal > 1.7 && doubled / normal < 2.3, 'Tempo x2 verdoppelt die Spielgeschwindigkeit', (doubled / normal).toFixed(2));
  ok(await game(() => document.getElementById('b-speed').textContent) === 'x2', 'Tempo-Knopf zeigt x2');
  await page.click('#b-speed');

  /* ---------- wave progress and "hold wave" ---------- */
  const winWave = () => game(() => {
    const g = __bw;
    g.step(3);
    g.clear();
    g.step(0.1);
    return { w: g.S.wave, gold: g.S.gold, c: g.S.cleared };
  });
  r = await game(() => {
    const g = __bw;
    g.step(3);
    const bar = document.getElementById('wprog');
    g.ens().forEach(e => { e.sp = 0; });
    const before = parseFloat(bar.style.width);
    const e = g.ens()[0];
    e.hp = 1;
    g.ready();
    g.attack(e.x, e.y);
    g.step(0.3);
    return [before, parseFloat(bar.style.width)];
  });
  ok(r[1] > r[0], 'Wellen-Fortschritt steigt mit besiegten Gegnern', r.join(' → ') + ' %');
  await page.click('#b-hold');
  ok(await game(() => __bw.S.hold && document.getElementById('b-hold').getAttribute('aria-pressed') === 'true'), 'Welle halten eingeschaltet');
  r = await winWave();
  ok(r.w === 1 && r.gold === 2 && r.c === 1, 'Welle halten: Welle bleibt, +2 Gold', JSON.stringify(r));
  r = await winWave();
  ok(r.w === 1 && r.gold === 4, 'Welle halten: Wiederholung gibt wieder Gold', JSON.stringify(r));
  ok(await game(() => !document.getElementById('wup').disabled), 'Pfeil hoch nach gehaltener Welle frei');
  await page.click('#b-hold');
  r = await winWave();
  ok(r.w === 2, 'Welle halten aus: es geht wieder weiter', r.w);

  /* ---------- ability overview ---------- */
  await game(() => { __bw.S.lv.dagger = 27; __bw.hud(); });
  await longPress('#wp-dagger');
  r = await game(() => ({
    open: !document.getElementById('abil').hidden,
    rows: document.querySelectorAll('.ab').length,
    unlocked: document.querySelectorAll('.ab.on').length,
    title: document.getElementById('abiltitle').textContent,
    paused: __bw.state().paused,
  }));
  ok(r.open && r.rows === 13 && r.unlocked === 5 && r.paused, 'Lange drücken zeigt 13 Stufen, 5 davon frei bei Lvl 27', JSON.stringify(r));
  await page.screenshot({ path: 'abil.png' });
  await page.click('#abil-close');
  ok(!(await visible('abil')) && await game(() => !__bw.state().paused), 'Übersicht schließen setzt fort');
  await longPress('#wp-sword');
  r = await game(() => ({ on: document.querySelectorAll('.ab.on').length, active: __bw.S.active, title: document.getElementById('abiltitle').textContent }));
  ok(r.on === 0 && r.active === 'dagger' && r.title === 'Schwert · gesperrt', 'Übersicht auch für gesperrte Waffe, ohne sie zu wählen', JSON.stringify(r));
  await page.click('#abil-close');
  await page.click('#wp-dagger');
  ok(!(await visible('abil')), 'Kurzes Tippen öffnet die Übersicht nicht');

  /* ---------- Android back button (window.__back is what MainActivity calls) ---------- */
  await game(() => __back());
  ok(await visible('pausep'), 'Zurück-Taste im Spiel öffnet Pause');
  await game(() => __back());
  ok(!(await visible('pausep')), 'Zurück-Taste in der Pause setzt fort');

  /* ---------- save slots ---------- */
  await game(() => { __bw.S.gold = 7; __bw.S.lv.sword = 12; __bw.S.cleared = 5; __bw.S.wave = 4; __bw.save(); });
  await page.click('#b-pause');
  await page.click('#p-menu');
  ok(await visible('menu') && await game(() => __bw.slot() === -1), 'Hauptmenü aus der Pause erreichbar');
  ok(await game(() => !document.getElementById('m-load').disabled), 'Spiel laden jetzt aktiv');
  await page.click('#m-load');
  r = await game(() => [...document.querySelectorAll('.slot')].map(x => x.querySelector('span').textContent + (x.disabled ? '(aus)' : '')).join('|'));
  ok(r === 'Welle 4 · 7 Gold · Schwert 12|Leer(aus)', 'Laden zeigt Platz 1 mit Inhalt, Platz 2 leer und gesperrt', r);
  await page.screenshot({ path: 'slots.png' });
  await page.click('#m-back');
  await page.click('#m-start');
  await page.click('#slot-1');
  await dismissDialog(page);
  r = await game(() => ({ slot: __bw.slot(), gold: __bw.S.gold, sword: __bw.S.lv.sword, wave: __bw.S.wave }));
  ok(r.slot === 1 && r.gold === 0 && r.sword === 1 && r.wave === 1, 'Neues Spiel in Platz 2 startet leer', JSON.stringify(r));
  await game(() => { __bw.S.gold = 3; __bw.save(); __bw.showMenu(); });
  await page.click('#m-load');
  await page.click('#slot-0');
  ok(await game(() => document.getElementById('dialog').hidden), 'Beim Laden erscheint kein Begrüßungsfenster');
  r = await game(() => ({ slot: __bw.slot(), gold: __bw.S.gold, sword: __bw.S.lv.sword, wave: __bw.S.wave }));
  ok(r.slot === 0 && r.gold === 7 && r.sword === 12 && r.wave === 4, 'Platz 1 unverändert geladen', JSON.stringify(r));
  await game(() => __bw.showMenu());
  await page.click('#m-start');
  await page.click('#slot-0');
  r = await game(() => ({ menu: !document.getElementById('menu').hidden, text: document.querySelector('#slot-0 span').textContent }));
  ok(r.menu && r.text.startsWith('Überschreiben?'), 'Belegter Platz fragt vor dem Überschreiben nach', r.text);
  await page.click('#m-back');
  await page.click('#m-load');
  await page.click('#slot-1');
  ok(await game(() => __bw.S.gold === 3), 'Abbrechen überschreibt nichts, Platz 2 lädt');
  await game(() => __bw.showMenu());
  await page.click('#m-start');
  await page.click('#slot-0');
  await page.click('#slot-0');   // second tap confirms the overwrite
  await dismissDialog(page);
  r = await game(() => ({ slot: __bw.slot(), gold: __bw.S.gold, sword: __bw.S.lv.sword }));
  ok(r.slot === 0 && r.gold === 0 && r.sword === 1, 'Zweites Tippen überschreibt Platz 1', JSON.stringify(r));
  await page.goto(GAME_URL);
  await page.waitForTimeout(200);
  r = await game(() => ({ gold: __bw.DB.slots.map(x => x && x.gold), vib: __bw.DB.opts.vib }));
  ok(JSON.stringify(r.gold) === '[0,3]' && r.vib === false, 'Beide Spielstände und Einstellungen überstehen einen Neustart', JSON.stringify(r));

  /* ---------- migration of a save from before the start menu (key burgwacht-v2, one slot, sword era) ---------- */
  await game(() => {
    localStorage.clear();
    localStorage.setItem('burgwacht-v2', JSON.stringify({
      lv: { sword: 9, dagger: 2, star: 1 }, xp: { sword: 1, dagger: 0, star: 0 }, wave: 3, active: 'sword',
      gold: 4, cleared: 3, heal: 1, own: { dagger: true, star: false, soldier: true },
    }));
  });
  await page.goto(GAME_URL);
  await page.waitForTimeout(200);
  await page.click('#m-load');
  r = await game(() => document.querySelector('#slot-0 span').textContent);
  ok(r === 'Welle 3 · 4 Gold · Dolche 2 · Schwert 9', 'Alter Spielstand wandert in Platz 1 und behält das Schwert', r);

  /* ---------- Exit in the app: a fake window.Android stands in for MainActivity's bridge ---------- */
  const appPage = await context.newPage();
  await appPage.addInitScript(() => { window.__exited = 0; window.Android = { exit() { window.__exited++; } }; });
  await appPage.goto(GAME_URL);
  await appPage.waitForTimeout(200);
  ok(await appPage.evaluate(() => !document.getElementById('m-exit').hidden), 'In der App ist Exit sichtbar');
  await appPage.click('#m-exit');
  ok(await appPage.evaluate(() => window.__exited) === 1, 'Exit ruft das Schließen der App auf');
  await appPage.evaluate(() => __back());
  ok(await appPage.evaluate(() => window.__exited) === 2, 'Zurück-Taste im Hauptmenü schließt die App');
  await appPage.close();

  /* ---------- load test: 40 s of auto-fire at level 100 against up to 60 enemies ---------- */
  await page.click('#slot-0');
  for (const weapon of ['sword', 'dagger', 'star', 'bow', 'wand']) {
    r = await page.evaluate(weapon => {
      const g = __bw, S = g.S;
      S.own.dagger = S.own.star = S.own.bow = S.own.wand = S.own.soldier = true;
      S.active = weapon;
      S.lv[weapon] = 100;
      S.cleared = 60;
      S.wave = 40;
      g.hud();
      g.clear();
      g.setHp(10);
      const most = { p: 0, z: 0, f: 0, e: 0 };
      const start = performance.now();
      let frames = 0;
      for (let i = 0; i < 60 * 40; i++) {
        if (i % 20 === 0 && g.state().enemies < 60) g.spawn(i % 100 === 0 ? 'boss' : i % 3 ? 'slime' : 'ogre');
        if (g.state().paused) break;
        const enemies = g.ens();
        const target = enemies[(i * 7) % Math.max(1, enemies.length)];
        g.hold(target ? { x: target.x, y: target.y } : { x: 100, y: 300 });
        g.setHp(10);
        g.step(1 / 60);
        frames++;
        const q = g.state();
        most.p = Math.max(most.p, q.projs);
        most.z = Math.max(most.z, q.zones);
        most.f = Math.max(most.f, q.fx);
        most.e = Math.max(most.e, q.enemies);
      }
      g.hold(null);
      return { most, ms: (performance.now() - start) / frames, frames };
    }, weapon);
    ok(r.frames === 2400 && r.most.p < 400 && r.most.z < 80 && r.most.f < 400 && r.ms < 4, `${weapon} Lvl 100: 40 s Dauerfeuer stabil`,
      `max. Geschosse ${r.most.p}, Zonen ${r.most.z}, Effekte ${r.most.f}, ${r.ms.toFixed(2)} ms Logik pro Bild`);
  }
  // real frame rate (logic + drawing) while firing; headless Chromium has no GPU, a phone is usually faster
  await page.waitForTimeout(400);
  await game(() => {
    const g = __bw;
    for (let i = 0; i < 20; i++) g.spawn('slime');
    g.step(6);
    const e = g.ens()[0];
    g.hold({ x: e.x, y: e.y });
    g.step(1.2);
    g.hold(null);
  });
  const fps = await game(() => new Promise(resolve => {
    const g = __bw, start = performance.now();
    let frames = 0;
    const tick = () => {
      const e = g.ens()[0];
      g.hold(e ? { x: e.x, y: e.y } : { x: 100, y: 300 });
      frames++;
      if (performance.now() - start < 2000) requestAnimationFrame(tick);
      else { g.hold(null); resolve(frames / 2); }
    };
    requestAnimationFrame(tick);
  }));
  ok(fps > 40, 'Bildrate bei Lvl-100-Dauerfeuer (Emulator ohne Grafikkarte)', fps.toFixed(0) + ' Bilder/s');
  await page.screenshot({ path: 'stress.png' });
  await game(() => { const g = __bw; Object.assign(g.S.lv, { sword: 14, dagger: 6, star: 3 }); g.S.wave = 7; g.S.gold = 12; g.clear(); g.hud(); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'game3.png' });

  ok(errors.length === 0, 'Keine Laufzeitfehler im gesamten Lauf', errors.slice(0, 3));
  report.finish();
  await browser.close();
})();
