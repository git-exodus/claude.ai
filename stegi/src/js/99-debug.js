/* 99-debug.js – window.__st: hooks for the tests (tests/*.js). The game itself never uses them.
 * Time travel: __st.setTime('2026-11-20T09:00') or __st.travel(hours) move now() (clock.offset). */

window.__st = {
  get S() { return S; },
  game, pet, clock, parts, soundLog, debugFlags, PLACES, VERSION,
  /** Music state: on = tune is scheduled, ctx = AudioContext state ('running' after a touch). */
  get music() { return { on: music.on, ctx: AC ? AC.state : 'none' }; },
  /** Sets the game clock to a local date/time string, e.g. '2026-11-20T09:00'. */
  setTime(s) { clock.offset = new Date(s).getTime() - Date.now(); },
  /** Moves the game clock forward by h hours. */
  travel(h) { clock.offset += h * 3600e3; },
  now, dayIndex, isNight, isSleepy, isAsleep: () => asleepNow(),
  /** Simulates sec seconds of game in 1/30 s steps (also draws, like a real frame). */
  step(sec) { const n = Math.round(sec * 30); for (let i = 0; i < n; i++) { update(1 / 30); drawWorld(); } refreshUI(); },
  /** Stops/starts the real-time frame loop (tests that need exact control). */
  pause(p) { paused = p; },
  WEAR_ITEMS, VISITORS, weatherAt, currentWeather, startHide, hideTap, hideSpots, hideSpotAt, playKey, startVisit, planVisit, openGift, giftWaiting, giftPos, wearNow,
  wearUnlocked, openWardrobe, closeWardrobe, takePhoto, openAlbum, closeAlbum, get photos() { return photos; }, loadPhotos, openPlayMenu,
  dev, setTestMode, devEgg, devDay, devStage, devJump, devTimeOfDay, devSpeed, devNeeds, devArrive, devAllPlaces, devAllGifts, devVisit, devWeather, devResetTest, openDev, closeDev,
  cameraTap, ownToday, cameraFull, deletePhoto, showPhoto, get storageOk() { return storageOk; }, checkStorage,
  IDLE_KINDS, FOREGROUND, stegoLook, get groundY() { return groundY; },
  startWalk, arrive, goPlace, openPlaces, closePlaces, foundToday, walkLimitReached, firefliesNow, placePicture, walkFx,
  enterGame, showMenu, startMode, endMode, goToBed, offerFood, removePoop, tapStego, strokeStego, throwBall,
  eggPhase, eggProgress, eggRub, stageAt: () => stageAt(now()), growth: () => growthAt(now()), lifeDay: () => lifeDay(now()),
  lowest: lowestNeed, limitReached, save, load: loadGame, sanitizeSave, resetAll, blankSave,
  /** Drawing functions (used to render the app icon, see README 4.2). */
  draw: { stego: drawStego, egg: drawEgg, nest: drawNest, foreground: drawForeground },
  /** The stego palette object (tests and previews may change it in place). */
  colors: STEGO_COLORS,
  /** Screen positions for touches. */
  pos() {
    const i = game.stegoInfo;
    return { W, H, U, standY, groundY, egg: { x: W / 2, y: standY - eggHeight() / 2 },
      mouth: i && i.mouth, head: i && i.head, box: i && i.box, poops: S.poops.map((_, k) => poopPos(k)),
      ball: game.ball && { x: game.ball.x, y: ballY() } };
  },
  state() {
    return { screen: game.screen, trans: game.trans, mode: game.mode, hatched: hatched(), needs: { ...S.needs },
      egg: { ...S.egg }, poops: S.poops.length, asleep: asleepNow(), stage: hatched() ? stageAt(now()) : -1 };
  },
  visible() {
    const v = id => !$(id).hidden;
    return { needs: v('needs'), actions: v('actions'), tray: v('tray'), close: v('close'), bed: v('act-bed'),
      settings: v('settings'), playtray: v('playtray'), musicpad: v('musicpad'), wardrobe: v('wardrobe'), album: v('album'), photoview: v('photoview'), side: v('side'), devbadge: v('devbadge'), devpanel: v('devpanel'), devopen: v('s-devopen'), confirm: v('confirm'), rest: v('rest'), exit: v('m-exit'), menuGone: $('menu').classList.contains('gone') };
  },
};

start();
