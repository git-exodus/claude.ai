/* suite-apk.js – 0.5.1: the game as in the APK (window.Android exists, so the menu has "Beenden").
 * In 0.5 the menu was only made invisible in the game, and its hidden "Beenden" button lay over the
 * middle buttons: tapping them closed the app. This suite checks that every visible button really
 * receives the tap (nothing invisible on top) in every screen, and that only "Beenden" in the menu exits. */
const { chromium, createReport, openPage, loadClean, hatchQuick, at } = require('./lib');

(async () => {
  const R = createReport();
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser, { android: true });
  const ev = (f, a) => page.evaluate(f, a);
  /** Ids of visible buttons whose middle is covered by something else. With a window open, only the
   *  buttons of that (topmost) window count – the game behind it is meant to be covered. Each button is
   *  scrolled into view first (long windows scroll). */
  const covered = () => ev(() => {
    const open = [...document.querySelectorAll('.ov')].filter(o => !o.hidden);
    const scope = open.length ? open[open.length - 1] : document;
    return [...scope.querySelectorAll('button')].filter(b => {
      if (b.closest('[hidden]') || b.hidden) return false;
      b.scrollIntoView({ block: 'center' });
      const r = b.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !(e && (e === b || b.contains(e)));
    }).map(b => b.id || b.className);
  });

  await loadClean(page);
  await hatchQuick(page);
  await at(page, 10, 0);
  await ev(() => { __st.S.last = __st.now(); for (const k in __st.S.needs) __st.S.needs[k] = 60; __st.step(1); });
  await page.waitForTimeout(700);   // the menu fades out

  R.ok(await ev(() => document.getElementById('m-exit').hidden), 'Im Spiel ist der Beenden-Knopf ausgeschaltet');
  let c = await covered();
  R.ok(c.length === 0, 'Im Spiel ist kein Knopf verdeckt', c.join());

  // Tap every bottom button (and close what it opens); the app must never exit.
  for (const id of ['food', 'drink', 'bath', 'play', 'brush', 'walk']) {
    await ev(() => { __st.endMode(); __st.S.walk = null; __st.S.needs.drink = 50; __st.step(0.3); });
    await page.click('#act-' + id);
    await ev(() => __st.step(0.3));
  }
  R.ok((await ev(() => window.__exited || false)) === false, 'Alle 6 unteren Knöpfe angetippt: App bleibt offen');

  // Every screen and window: nothing covered.
  const screens = [
    ['Futterleiste', () => { __st.endMode(); __st.S.walk = null; __st.step(0.3); __st.startMode('eat'); }],
    ['Spielmenü', () => { __st.endMode(); __st.openPlayMenu(); }],
    ['Musik', () => { __st.endMode(); __st.openPlayMenu(); __st.startMode('music'); }],
    ['Verstecken', () => { __st.endMode(); __st.openPlayMenu(); __st.startMode('hide'); }],
    ['Orte', () => { __st.endMode(); __st.openPlaces(); }],
    ['Kleiderschrank', () => { __st.closePlaces(); __st.openWardrobe(); }],
    ['Album', () => { __st.closeWardrobe(); __st.openAlbum(); }],
    ['Einstellungen', () => { __st.closeAlbum(); document.getElementById('settings').hidden = false; }],
    ['Test-Werkzeuge', () => { document.getElementById('settings').hidden = true; __st.setTestMode(true); __st.openDev(); }],
  ];
  for (const [name, f] of screens) {
    await ev(f);
    await ev(() => __st.step(0.3));
    c = await covered();
    R.ok(c.length === 0, name + ': kein Knopf verdeckt', c.join());
  }
  await ev(() => { __st.closeDev(); __st.setTestMode(false); });
  R.ok((await ev(() => window.__exited || false)) === false, 'Durch alle Fenster: App bleibt offen');

  // Back in the menu, "Beenden" is there and works.
  await ev(() => { __st.showMenu(); __st.step(1); });
  R.ok(await ev(() => !document.getElementById('m-exit').hidden), 'Im Hauptmenü ist Beenden wieder da');
  c = await covered();
  R.ok(c.length === 0, 'Im Hauptmenü ist kein Knopf verdeckt', c.join());
  await page.click('#m-exit');
  R.ok(await ev(() => window.__exited === true), 'Beenden im Hauptmenü schließt die App');

  R.ok(errors.length === 0, 'Keine Fehler in der Konsole', errors.join(' | '));
  await browser.close();
  R.finish();
})();
