/*
 * bench-weapons: compares the five weapons at level 100. Not a pass/fail test;
 * it prints a table for balancing decisions. Takes several minutes.
 *
 * For wave 50 and wave 100 each weapon fights alone three times: no wall, no
 * soldiers, archers or knight, auto-fire always aimed at the enemy closest to
 * the castle. The castle is refilled every frame, so "durchgekommen" counts
 * every life it would have lost (siege enemies count 2 or 3).
 *
 *   node tests/bench-weapons.js      (after python3 build.py)
 */
const { chromium, openPage, loadClean, startNewGame } = require('./lib');

(async () => {
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser, { quiet: true });
  await loadClean(page);
  await startNewGame(page);

  for (const waveNo of [50, 100]) {
    console.log('--- Welle ' + waveNo + ' ---');
    for (const weapon of ['sword', 'dagger', 'star', 'bow', 'wand']) {
      const runs = [];
      for (let k = 0; k < 3; k++) {
        runs.push(await page.evaluate(([weapon, waveNo]) => {
          const g = __bw, S = g.S;
          // own every weapon (the starting weapon would otherwise replace an unowned one on load)
          Object.assign(S.own, { sword: true, dagger: true, star: true, bow: true, wand: true, soldier: false, knight: false });
          S.archers = 0;
          S.lv = { sword: 1, dagger: 1, star: 1, bow: 1, wand: 1 };
          S.lv[weapon] = 100;
          S.xp[weapon] = 0;
          S.active = weapon;
          S.wall = 0;
          S.wallHp = 0;
          S.cleared = 200;
          S.wave = waveNo;
          S.hold = true;
          g.save();
          g.showMenu();
          g.startGame(0, false);
          const total = g.state().queue, c = g.pos();
          let t = 0, leaks = 0, peak = 0;
          while (t < 300) {
            let closest = null, closestDist = 1e9;
            for (const e of g.ens()) {
              if (e.dead) continue;
              const d = Math.hypot(e.x - c.cx, e.y - c.cy);
              if (d < closestDist) { closestDist = d; closest = e; }
            }
            g.hold(closest ? { x: closest.x, y: closest.y } : null);
            g.setHp(10);
            g.step(1 / 60);
            t += 1 / 60;
            const st = g.state();
            if (st.paused) break;
            leaks += 10 - st.hp;
            peak = Math.max(peak, st.enemies);
            if (st.queue === 0 && st.enemies === 0 && t > 3) break;   // wave cleared
            if (st.pause > 2 && t > 5) break;                         // next wave is being prepared
          }
          g.hold(null);
          return { total, active: S.active, t, leaks, peak };
        }, [weapon, waveNo]));
      }
      const average = key => runs.reduce((a, run) => a + run[key], 0) / runs.length;
      console.log(weapon.padEnd(7), 'Gegner', runs[0].total, '| Dauer', average('t').toFixed(0).padStart(4), 's | durchgekommen',
        average('leaks').toFixed(0).padStart(4), '| max. gleichzeitig', average('peak').toFixed(0).padStart(4),
        runs[0].active === weapon ? '' : '| ACHTUNG: gespielt mit ' + runs[0].active);
    }
  }
  console.log('Laufzeitfehler:', errors.length ? errors.slice(0, 3) : 'keine');
  await browser.close();
})();
