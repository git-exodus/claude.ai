/* suite-design.js – 0.6: horizon, idle moments (sniff, look, happy, hop), squash and stretch,
 * happy face when stroked, foreground and life for every place, screenshots of the new look. */
const { chromium, createReport, openPage, loadClean, hatchQuick, at } = require('./lib');

(async () => {
  const R = createReport();
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser, { scale: 2 });
  const ev = (f, a) => page.evaluate(f, a);

  await loadClean(page);
  await hatchQuick(page);
  await at(page, 10, 0);
  await ev(() => { __st.game.weatherTest = 'sun'; __st.S.last = __st.now(); for (const k in __st.S.needs) __st.S.needs[k] = 90; __st.step(1); });

  let g = await ev(() => ({ gy: __st.groundY, H: __st.pos().H }));
  R.ok(Math.abs(g.gy / g.H - 0.42) < 0.005, 'Horizont bei 42 % der Höhe (vorher 52 %)', (g.gy / g.H).toFixed(3));

  // ---------- idle moments ----------
  g = await ev(() => {
    const seen = {}; let first = null;
    for (let i = 0; i < 30 * 200; i++) { __st.step(1 / 30); for (const k in __st.S.needs) __st.S.needs[k] = 90; const id = __st.pet.idle; if (id) { seen[id.kind] = true; if (first === null) first = i / 30; } }
    return { kinds: Object.keys(seen).sort().join(), first };
  });
  R.ok(g.kinds === 'happy,hop,look,sniff' && g.first >= 6 && g.first < 20, 'Er macht von selbst etwas: schnuppern, staunen, freuen, hüpfen (erstes nach 6–20 s)', JSON.stringify(g));
  g = await ev(() => {
    const out = {};
    for (const kind of ['sniff', 'look', 'happy']) { __st.pet.idle = { kind, t: 1, dur: __st.IDLE_KINDS[kind] }; const o = __st.stegoLook(); out[kind] = [o.eyes, o.brow || '-', o.headDown > 0.5, !!o.blush].join('/'); }
    __st.pet.idle = null;
    return out;
  });
  R.ok(g.sniff === 'closed/-/true/false' && g.look === 'open/up/false/false' && g.happy === 'happy/happy/false/true', 'Gesichter: schnuppern (Kopf runter), staunen (Augenbraue hoch), freuen (Bäckchen)', JSON.stringify(g));
  g = await ev(() => { __st.pet.idle = null; __st.pet.idleNext = 0; for (const k in __st.S.needs) __st.S.needs[k] = 10; let any = false; for (let i = 0; i < 30 * 20; i++) { __st.step(1 / 30); for (const k in __st.S.needs) __st.S.needs[k] = 10; if (__st.pet.idle) any = true; } for (const k in __st.S.needs) __st.S.needs[k] = 90; return any; });
  R.ok(!g, 'Ist er traurig, macht er keine fröhlichen Kleinigkeiten');
  g = await ev(() => { __st.pet.idle = { kind: 'look', t: 0, dur: 2 }; __st.tapStego(); return __st.pet.idle; });
  R.ok(g === null, 'Antippen unterbricht die Kleinigkeit');

  // ---------- squash and stretch ----------
  g = await ev(() => {
    __st.step(2); __st.pet.idle = null; __st.pet.idleNext = 1e9;
    __st.pet.jumpV = 220 * __st.pos().U; __st.step(1 / 30);
    const up = __st.stegoLook().squash;
    for (let i = 0; i < 60 && __st.pet.jump > 0; i++) __st.step(1 / 30);
    const land = __st.stegoLook().squash;
    __st.step(0.5);
    return { up, land, after: __st.stegoLook().squash || 0 };
  });
  R.ok(g.up < -0.2 && g.land > 0.3 && g.after === 0, 'Hüpfen: in der Luft gestreckt, beim Landen kurz gestaucht', JSON.stringify(g));
  g = await ev(() => { __st.strokeStego(10); const o = __st.stegoLook(); return o.blush && o.eyes === 'happy'; });
  R.ok(g, 'Streicheln: Lachaugen und rote Bäckchen');

  // ---------- every place: foreground and life draw ----------
  g = await ev(() => {
    const bad = [], missing = __st.PLACES.filter(p => !__st.FOREGROUND[p.id]).map(p => p.id);
    for (const p of __st.PLACES) { try { __st.S.place = p.id; __st.step(0.1); } catch (e) { bad.push(p.id + ':' + e.message); } }
    __st.S.place = 'meadow';
    return { bad, missing };
  });
  R.ok(g.bad.length === 0 && g.missing.length === 0, 'Alle 30 Orte haben einen eigenen Vordergrund und zeichnen fehlerfrei', JSON.stringify(g));
  // ---------- 0.6.1: on the way the foreground slides out of the picture with the ground ----------
  g = await ev(() => {
    const P = __st.pos(), img = scroll => { const c = document.createElement('canvas'); c.width = P.W; c.height = P.H; __st.draw.foreground(c.getContext('2d'), 'travel', 0, 1, scroll); return c.toDataURL(); };
    const a = img(0), b = img(0), moved = img(120);
    // Same picture shifted by the walked distance: one full loop (span) brings it back.
    const loop = img(0 + (P.W + 60 * P.U) / 1);
    return { same: a === b, moved: a !== moved };
  });
  R.ok(g.same && g.moved, 'Unterwegs: Gras und Blumen vorne wandern mit dem Weg aus dem Bild', JSON.stringify(g));
  g = await ev(() => {
    __st.S.giftSeen = 0; __st.S.walk = null; __st.step(0.3);
    const before = __st.giftWaiting();
    __st.startWalk(); __st.step(0.3);
    const gp = __st.giftPos(); const seenBefore = __st.S.giftSeen;
    return { before, walking: !!__st.S.walk, seen: seenBefore };
  });
  const gpos = await ev(() => __st.giftPos());
  await page.mouse.click(gpos.x, gpos.y - 20);
  await ev(() => __st.step(0.2));
  g.tapIgnored = (await ev(() => __st.S.giftSeen)) === 0;
  R.ok(g.before && g.walking && g.tapIgnored, 'Unterwegs wartet das Geschenk (nicht sichtbar, Antippen ohne Wirkung)', JSON.stringify(g));
  g = await ev(() => { __st.travel(1.01); __st.step(0.2); __st.step(6); return { arrived: !__st.S.walk, waiting: __st.giftWaiting() }; });
  R.ok(g.arrived && g.waiting, 'Nach dem Ankommen liegt das Geschenk wieder da', JSON.stringify(g));
  await ev(() => { while (__st.giftWaiting()) __st.openGift(); __st.S.place = 'meadow'; __st.step(4); });

  for (const [place, name] of [['meadow', 'design-wiese'], ['beach', 'design-strand'], ['snow', 'design-schnee']]) {
    await ev(p => { __st.S.place = p; __st.S.hatchDay -= 0; __st.step(0.4); }, place);
    await page.screenshot({ path: name + '.png' });
  }

  R.ok(errors.length === 0, 'Keine Fehler in der Konsole', errors.join(' | '));
  await browser.close();
  R.finish();
})();
