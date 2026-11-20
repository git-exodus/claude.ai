/* suite-family.js – 0.12: sibling egg two days after he is grown, stroking it like his own egg, hatching,
 * the little sibling (no needs, follows, copies jumps, giggles, sleeps, walks along, grows), dev buttons, saving. */
const { chromium, createReport, openPage, loadClean, hatchQuick, at, GAME_URL } = require('./lib');

(async () => {
  const R = createReport();
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser, { scale: 2 });
  const ev = (f, a) => page.evaluate(f, a);
  const calm = () => ev(() => { __st.game.weatherTest = 'sun'; __st.S.last = __st.now(); __st.S.giftSeen = 12; __st.S.giftDay = __st.dayIndex(__st.now());
    for (const k in __st.S.needs) __st.S.needs[k] = 80; __st.pet.idleNext = 1e9; __st.game.nextWish = 1e9; __st.S.stageSeen = 4; });

  await loadClean(page, '2026-06-03T10:00');
  await hatchQuick(page);
  await at(page, 11, 0);

  // ---------- the egg comes two days after he is grown ----------
  await ev(() => __st.devDay(30)); await calm();
  let g = await ev(() => { __st.step(0.5); const a = __st.S.sib; __st.travel(24); __st.step(0.5); const b = __st.S.sib; return { a, b, day: __st.lifeDay() }; });
  R.ok(g.a === null && g.b === null && g.day === 31, 'Tag 30 und 31: noch kein Geschwister-Ei', JSON.stringify(g));
  await at(page, 11, 0); await calm();
  g = await ev(() => { __st.travel(24); __st.S.last = __st.now(); for (const k in __st.S.needs) __st.S.needs[k] = 80; __st.step(0.5); __st.step(0.5); return { day: __st.lifeDay(), egg: __st.sibEggThere(), seen: __st.S.sib && __st.S.sib.seen }; });
  R.ok(g.day === 32 && g.egg && g.seen, 'Tag 32: ein Ei liegt im Nest vor ihm (mit Glitzern beim ersten Sehen)', JSON.stringify(g));
  await at(page, 11, 0); await calm(); await ev(() => __st.step(0.5));
  await page.screenshot({ path: 'family-egg.png' });

  // ---------- stroking the egg ----------
  const egg = await ev(() => { const p = __st.sibNestPos(); return { x: p.x, y: p.y - 40 * __st.pos().U }; });
  g = await ev(() => ({ love: __st.S.needs.love, sec: __st.S.sib.egg.petSec }));
  await page.mouse.move(egg.x - 30, egg.y); await page.mouse.down();
  for (let i = 0; i < 12; i++) { await page.mouse.move(egg.x + (i % 2 ? 30 : -30), egg.y, { steps: 3 }); await ev(() => __st.step(0.1)); }
  await page.mouse.up();
  const g2 = await ev(() => ({ love: __st.S.needs.love, sec: __st.S.sib.egg.petSec, petDist: __st.pet.petDist }));
  R.ok(g2.sec > 0.5 && g2.love <= g.love && g2.petDist === 0, 'Mit dem Finger übers Ei streicheln: das Ei zählt, er selbst wird dabei nicht gestreichelt', JSON.stringify({ g, g2 }));
  g = await ev(() => { for (let i = 0; i < 650; i++) { __st.sib.rub = 0.25; __st.step(0.2); } return { cracks: __st.S.sib.egg.cracks, ph: __st.eggPhase(__st.S.sib.egg) }; });
  R.ok(g.cracks === 1 && g.ph === 'done', '2 Minuten streicheln: erster Riss, für heute fertig', JSON.stringify(g));
  g = await ev(() => { for (let i = 0; i < 650; i++) { __st.sib.rub = 0.25; __st.step(0.2); } return __st.S.sib.egg.cracks; });
  R.ok(g === 1, 'Am selben Tag kein zweiter Riss', g);
  await at(page, 22, 0);
  g = await ev(() => { __st.travel(24); __st.S.last = __st.now(); const s = __st.S.sib.egg.petSec; for (let i = 0; i < 50; i++) { __st.sib.rub = 0.25; __st.step(0.2); } return { before: s, after: __st.S.sib.egg.petSec }; });
  R.ok(g.after === g.before, 'Nachts schläft das Ei (Streicheln zählt nicht)', JSON.stringify(g));
  for (let d = 0; d < 2; d++) {
    await at(page, 11, 0); await calm();
    await ev(() => { for (let i = 0; i < 650; i++) { __st.sib.rub = 0.25; __st.step(0.2); } __st.travel(24); __st.S.last = __st.now(); });
  }
  await at(page, 11, 0); await calm();
  g = await ev(() => ({ cracks: __st.S.sib.egg.cracks, ph: __st.eggPhase(__st.S.sib.egg) }));
  R.ok(g.cracks === 3 && g.ph === 'hatchday', 'Nach 3 Tagen 3 Risse, am nächsten Tag ist Schlüpftag', JSON.stringify(g));
  g = await ev(() => { __st.step(0.2); for (let i = 0; i < 76; i++) { __st.sib.rub = 0.25; __st.step(0.2); } __st.step(2); return { born: __st.sibHatched(), today: __st.S.sib.hatchDay === __st.dayIndex(__st.now()), mode: __st.game.mode, photo: __st.game.autoPhoto && __st.game.autoPhoto.label }; });
  R.ok(g.born && g.today && g.mode === 'party' && g.photo === 'Geschwisterchen', '15 Sekunden streicheln: das Geschwisterchen schlüpft, Fest und Meilenstein-Foto', JSON.stringify(g));
  await ev(() => __st.step(4));
  await page.screenshot({ path: 'family-baby.png' });

  // ---------- the little sibling ----------
  g = await ev(() => ({ keys: Object.keys(__st.S.sib).sort().join(), g: __st.sibGrowth(__st.now()), st: __st.sibStage(__st.now()) }));
  R.ok(g.keys === 'egg,hatchDay,seen' && g.g === 0 && g.st === 0, 'Geschwisterchen hat keine eigenen Bedürfnisse, startet als Baby', JSON.stringify(g));
  g = await ev(() => { const a = __st.sib.box && __st.sib.box.w, b = __st.game.stegoInfo.box; return { inView: __st.sib.box.x >= 0 && __st.sib.box.x + __st.sib.box.w <= window.innerWidth, smaller: a < b.w * 0.5 }; });
  R.ok(g.inView && g.smaller, 'Das kleine Geschwisterchen steht ganz im Bild, vor seinem Schwanz', JSON.stringify(g));
  g = await ev(() => { __st.pet.tx = 150; __st.step(3); const t1 = __st.sib.x; __st.pet.tx = 0; __st.step(3); return { t1, t2: __st.sib.x }; });
  R.ok(g.t1 - g.t2 > 80, 'Es läuft ihm hinterher', JSON.stringify(g));
  await ev(() => { __st.pet.tx = 0; __st.step(3); });
  g = await ev(() => { __st.pet.jumpV = 200; __st.step(0.05); const a = __st.sib.jump; __st.step(0.35); return { a, b: __st.sib.jump }; });
  R.ok(g.a === 0 && g.b > 0, 'Springt er, hüpft es kurz danach mit', JSON.stringify(g));
  await ev(() => __st.step(2));
  const sb = await ev(() => { const b = __st.sib.box; return { x: b.x + b.w * 0.6, y: b.y + b.h * 0.5 }; });
  await page.mouse.click(sb.x, sb.y);
  g = await ev(() => ({ giggle: __st.sib.giggleT > 0, happy: __st.pet.happyT > 0 }));
  R.ok(g.giggle && g.happy, 'Geschwisterchen antippen: es kichert und hüpft, der Große freut sich', JSON.stringify(g));
  g = await ev(() => { __st.startWalk(); __st.step(2); const r = { walk: !!__st.S.walk, dir: __st.sib.dir, moving: __st.sib.x !== null }; __st.goPlace('meadow'); __st.step(1); return r; });
  R.ok(g.walk && g.dir === 1, 'Beim Wandern läuft es mit (Blick nach vorn)', JSON.stringify(g));
  g = await ev(() => { __st.devSib('older'); __st.devSib('older'); return { g: __st.sibGrowth(__st.now()), st: __st.sibStage(__st.now()) }; });
  R.ok(Math.abs(g.g - 10 / 29) < 1e-9 && g.st === 1, 'Es wächst wie er (Tag 11 = Kind)', JSON.stringify(g));
  await calm();
  g = await ev(() => { for (let i = 0; i < 4; i++) __st.devSib('older'); __st.step(3); return { w: __st.sib.box.w, big: __st.game.stegoInfo.box.w, head: __st.sib.box.x + __st.sib.box.w > 0 }; });
  R.ok(Math.abs(g.w / g.big - 0.75) < 0.08 && g.head, 'Ganz groß ist es drei Viertel so groß wie er', JSON.stringify(g));
  await page.screenshot({ path: 'family-grown.png' });
  await at(page, 22, 0);
  g = await ev(() => { __st.S.last = __st.now(); __st.step(3); return { asleep: __st.stegoLook().pose === 'lie', zzz: __st.parts.filter(p => p.kind === 'zzz').length }; });
  R.ok(g.asleep && g.zzz >= 2, 'Nachts schlafen beide (zwei Zzz-Wolken)', JSON.stringify(g));
  await at(page, 11, 0);

  // ---------- saving ----------
  await calm();
  const offset = await ev(() => { __st.save(); return __st.clock.offset; });
  const before = await ev(() => JSON.stringify(__st.S.sib));
  await page.addInitScript(o => { window.__stOffset = o; }, offset);
  await page.goto(GAME_URL);
  g = await ev(() => { __st.pause(true); return JSON.stringify(__st.S.sib); });
  R.ok(g === before, 'Geschwisterchen wird gespeichert', g);
  g = await ev(() => JSON.stringify(__st.sanitizeSave({ sib: { egg: { cracks: 9, petSec: -3 }, hatchDay: 'x', seen: 1 } }, __st.now()).sib));
  R.ok(g === '{"egg":{"petDay":-1,"petSec":0,"cracks":3,"crackDay":-1,"hatchSec":0},"hatchDay":null,"seen":false}', 'Kaputte Daten werden repariert', g);
  g = await ev(() => __st.sanitizeSave({}, __st.now()).sib);
  R.ok(g === null, 'Alter Spielstand: noch kein Geschwisterchen');

  // ---------- test mode buttons ----------
  await ev(() => { __st.setTestMode(true); __st.devEgg(0); __st.openDev(); });
  await page.click('#dv-sib-egg');
  g = await ev(() => ({ grown: __st.stageAt() === 4, egg: __st.sibEggThere() }));
  R.ok(g.grown && g.egg, 'Testmodus „Geschwister-Ei“: er wird groß, das Ei liegt da', JSON.stringify(g));
  await page.click('#dv-sib-hd');
  R.ok(await ev(() => __st.eggPhase(__st.S.sib.egg) === 'hatchday'), 'Testmodus „Ei Schlüpftag“');
  await page.click('#dv-sib-born');
  R.ok(await ev(() => __st.sibHatched() && __st.sibGrowth(__st.now()) === 0), 'Testmodus „Geschwister da“');
  await page.click('#dv-sib-5');
  R.ok(await ev(() => Math.abs(__st.sibGrowth(__st.now()) - 5 / 29) < 1e-9), 'Testmodus „Geschwister +5 Tage“');
  await ev(() => __st.setTestMode(false));

  R.ok(errors.length === 0, 'Keine Fehler in der Konsole', errors.join(' | '));
  await browser.close();
  R.finish();
})();
