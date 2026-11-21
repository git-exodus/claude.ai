/* 09-ui.js – the HTML parts: need bars, action buttons, food tray, main menu, parents' settings
 * (opened by holding the gear for GEAR_HOLD seconds), "reset everything", play-time rest screen,
 * and the Back key (window.__back). */

/** Bottom buttons: id, icon, what they do. The bed button only shows in the sleepy half hour. */
const ACTIONS = [
  { id: 'food', icon: 'food', label: 'Essen', run: () => startMode('eat') },
  { id: 'drink', icon: 'drink', label: 'Trinken', run: () => startMode('drink') },
  { id: 'bath', icon: 'bath', label: 'Baden', run: () => startMode('bath') },
  { id: 'play', icon: 'play', label: 'Spielen', run: () => openPlayMenu() },
  { id: 'brush', icon: 'brush', label: 'Zähne putzen', run: () => startMode('brush') },
  { id: 'walk', icon: 'walk', label: 'Wandern', run: () => startWalk() },
  { id: 'bed', icon: 'bed', label: 'Licht aus', run: () => goToBed() },
];

/** Builds all buttons once. */
function buildUI() {
  $('needs').innerHTML = NEEDS.map(n => '<div class="need" id="need-' + n + '"><span class="ico">' + iconSVG(n) +
    '</span><i class="bar"><b></b></i></div>').join('');
  $('actions').innerHTML = ACTIONS.map(a => '<button class="round" id="act-' + a.id + '" type="button" aria-label="' + a.label + '">' +
    iconSVG(a.icon) + '</button>').join('');
  for (const a of ACTIONS) $('act-' + a.id).addEventListener('click', a.run);
  $('tray').innerHTML = FOODS.map(f => '<button class="food" id="food-' + f.id + '" data-food="' + f.id + '" type="button" aria-label="Futter"><canvas width="96" height="96"></canvas></button>').join('');
  for (const f of FOODS) {
    const c = $('food-' + f.id).querySelector('canvas').getContext('2d');
    c.save(); c.scale(96 / 60, 96 / 60); drawFood(c, f.id, 30, 30, 44); c.restore();
  }
  $('close').innerHTML = iconSVG('close');
  $('close').addEventListener('click', () => { sound('tap'); endMode(); });
  $('gear').insertAdjacentHTML('afterbegin', iconSVG('gear'));
  $('r-icon').innerHTML = iconSVG('bed');
  $('b-map').innerHTML = iconSVG('map');
  $('b-map').addEventListener('click', openPlaces);
  // 0.3: wardrobe, album, camera, play menu, music pad.
  $('b-wear').innerHTML = iconSVG('hat'); $('b-wear').addEventListener('click', openWardrobe);
  $('b-album').innerHTML = iconSVG('album'); $('b-album').addEventListener('click', openAlbum);
  // 0.11: stars, sticker book, shop (only at home).
  $('b-stickers').innerHTML = iconSVG('sticker'); $('b-stickers').addEventListener('click', openStickers);
  $('b-shop').innerHTML = iconSVG('shop'); $('b-shop').addEventListener('click', openShop);
  $('st-close').addEventListener('click', closeStickers);
  $('sh-close').addEventListener('click', closeShop);
  $('b-camera').innerHTML = iconSVG('camera') + '<span class="cnt" hidden></span>'; $('b-camera').addEventListener('click', cameraTap);
  $('at-diary').addEventListener('click', () => openAlbum('diary'));
  $('at-mile').addEventListener('click', () => openAlbum('mile'));
  setupPhotoDelete();
  $('w-close').addEventListener('click', closeWardrobe);
  $('a-close').addEventListener('click', closeAlbum);
  $('pv-close').addEventListener('click', () => { $('photoview').hidden = true; });
  $('play-ball').innerHTML = iconSVG('fun'); $('play-ball').addEventListener('click', () => startMode('ball'));
  $('play-hide').innerHTML = iconSVG('hide'); $('play-hide').addEventListener('click', () => startMode('hide'));
  $('play-music').innerHTML = iconSVG('music'); $('play-music').addEventListener('click', () => startMode('music'));
  $('play-bubbles').innerHTML = iconSVG('bubbles'); $('play-bubbles').addEventListener('click', () => startMode('bubbles'));
  $('play-kite').innerHTML = iconSVG('kite'); $('play-kite').addEventListener('click', () => startMode('kite'));
  $('play-castle').innerHTML = iconSVG('castle'); $('play-castle').addEventListener('click', () => startMode('castle'));
  $('mel-btn').innerHTML = iconSVG('melody'); $('mel-btn').addEventListener('click', () => { sound('tap'); startMelody(MELODY_START); });
  $('play-train').innerHTML = iconSVG('train'); $('play-train').addEventListener('click', () => startMode('train'));
  $('train-back').addEventListener('click', () => { sound('tap'); trainBackToPick(); });
  buildMusicPad();
  $('pl-close').addEventListener('click', closePlaces);
  $('walkbar').querySelector('.foot').innerHTML = iconSVG('walk');
  $('walkbar').querySelector('.flag').innerHTML = iconSVG('map');
  $('credit').textContent = '@made by Brownii (Claude.ai) · v' + VERSION;
  setupGear();
  setupSettings();
  $('m-exit').hidden = !window.Android;
  $('m-exit').addEventListener('click', () => { if (window.Android) window.Android.exit(); });
  $('r-ok').addEventListener('click', () => { $('rest').hidden = true; });
}

/** Shows/hides buttons for the current situation. Call after every mode or screen change. */
function refreshUI() {
  const inGame = game.screen === 'game', egg = !hatched() || game.mode === 'hatch';
  const sleeping = asleepNow();
  $('menu').classList.toggle('gone', inGame);
  $('m-exit').hidden = !window.Android || inGame;   // only in the APK, and only in the main menu
  $('m-title').textContent = S.name;
  $('needs').hidden = !inGame || egg;
  $('needs').classList.toggle('dim', sleeping);
  const idle = game.mode === 'idle';
  $('actions').hidden = !inGame || egg || sleeping || !idle;
  $('act-bed').hidden = !isSleepy(now()) || sleeping;
  // In the sleepy half hour "lights out" takes the place of "walk"; while walking there is the progress bar instead.
  $('act-walk').hidden = !$('act-bed').hidden || !!S.walk;
  $('side').hidden = !inGame || egg;
  $('walkbar').hidden = !inGame || egg || !S.walk;
  if (S.walk) $('walkbar').querySelector('b').style.width = (100 * S.walk.sec / WALK_SECONDS).toFixed(1) + '%';
  $('act-bed').classList.add('glow');
  $('tray').hidden = !(inGame && game.mode === 'eat');
  $('playtray').hidden = !(inGame && game.mode === 'play');
  $('play-kite').hidden = !kiteOk(); $('play-castle').hidden = !castleOk();   // 0.10: kite in good weather, castle on sand
  $('mel-btn').hidden = !(inGame && game.mode === 'music');
  // 0.12.3: the melody button stands right above the big drum (was in the middle of the screen).
  if (!$('mel-btn').hidden) { const r = $('mk-6').getBoundingClientRect(); if (r.width) $('mel-btn').style.left = Math.max(34, r.left + r.width / 2) + 'px'; }
  $('mel-btn').classList.toggle('glow', !!(game.melody && game.melody.phase === 'play'));
  $('trainpick').hidden = !(inGame && game.mode === 'train' && game.train && game.train.phase === 'pick');
  $('train-back').hidden = !(inGame && game.mode === 'train' && game.train && game.train.phase === 'draw');
  $('musicpad').hidden = !(inGame && game.mode === 'music');
  $('close').hidden = !(inGame && ['eat', 'bath', 'brush', 'ball', 'play', 'hide', 'music', 'train', 'bubbles', 'kite', 'castle'].includes(game.mode));
  refreshCamera();
  $('starpill').textContent = '★ ' + S.stars;
  $('b-shop').hidden = !atHome();
  $('devbadge').hidden = !dev.on;
  if (dev.on) $('devbadge').textContent = 'TEST' + (dev.speed > 1 ? ' · ' + dev.speed + '×' : '');
  updateNeedBars();
}

/** Fill and colour of the five need bars. */
function updateNeedBars() {
  for (const n of NEEDS) {
    const v = S.needs[n], el = $('need-' + n);
    if (!el) continue;
    const b = el.querySelector('b');
    b.style.width = v.toFixed(0) + '%';
    b.style.background = v < NEED_SAD ? '#e5533d' : v < NEED_LOW ? '#ffb300' : '#5cc15a';
    el.classList.toggle('low', v < NEED_LOW && !asleepNow());
  }
}

/* ---------- screens ---------- */

/** Menu -> game: zoom from the big stego into the meadow. */
function enterGame() {
  if (game.screen === 'game') return;
  if (limitReached()) { showRest(); return; }
  sound('happy');
  game.screen = 'game';
  pet.x = 0; pet.tx = 0;
  refreshUI();
}

/** Game -> menu. */
function showMenu() {
  endMode();
  game.screen = 'menu';
  save();
  refreshUI();
}

/** The parents' daily play time is used up. */
function showRest() {
  if (game.screen === 'game') showMenu();
  $('rest').hidden = false;
}

/* ---------- parents' settings ---------- */

let gearHold = null;
function setupGear() {
  const g = $('gear');
  const stop = () => { if (gearHold) { cancelAnimationFrame(gearHold.raf); gearHold = null; } g.style.setProperty('--p', 0); };
  g.addEventListener('pointerdown', e => {
    e.preventDefault();
    stop();
    const start = performance.now();
    const step = () => {
      const p = (performance.now() - start) / 1000 / GEAR_HOLD;
      g.style.setProperty('--p', Math.min(1, p));
      if (p >= 1) { stop(); openSettings(); return; }
      gearHold.raf = requestAnimationFrame(step);
    };
    gearHold = { raf: requestAnimationFrame(step) };
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => g.addEventListener(ev, stop));
  g.addEventListener('contextmenu', e => e.preventDefault());
}

const hhmm = m => Math.floor(m / 60) + ':' + String(Math.round(m % 60)).padStart(2, '0') + ' Uhr';

function setupSettings() {
  const opt = (v, text) => '<option value="' + v + '">' + text + '</option>';
  $('s-sleep').innerHTML = SLEEP_CHOICES.map(m => opt(m, hhmm(m))).join('');
  $('s-wake').innerHTML = WAKE_CHOICES.map(m => opt(m, hhmm(m))).join('');
  $('s-limit').innerHTML = LIMIT_CHOICES.map(m => opt(m, m ? m + ' Minuten' : 'unbegrenzt')).join('');
  $('s-name').addEventListener('input', () => {
    const v = $('s-name').value.trim();
    if (v) { S.name = v.slice(0, 12); save(); refreshUI(); }
  });
  $('s-sound').addEventListener('click', () => { S.opts.sound = !S.opts.sound; save(); fillSettings(); });
  $('s-music').addEventListener('click', () => { S.opts.music = !S.opts.music; save(); fillSettings(); });
  $('s-sleep').addEventListener('change', () => { S.opts.sleep = +$('s-sleep').value; S.bedAt = 0; save(); refreshUI(); });
  $('s-wake').addEventListener('change', () => { S.opts.wake = +$('s-wake').value; save(); refreshUI(); });
  $('s-limit').addEventListener('change', () => { S.opts.limit = +$('s-limit').value; save(); });
  $('s-close').addEventListener('click', closeSettings);
  $('s-reset').addEventListener('click', () => { $('confirm').hidden = false; });
  $('c-no').addEventListener('click', () => { $('confirm').hidden = true; });
  $('c-yes').addEventListener('click', () => {
    resetAll();
    photos = []; savePhotos();   // "everything" includes the album (stored separately)
    $('confirm').hidden = true;
    closeSettings();
    game.mode = 'idle'; game.ball = null; game.bath = null; game.brush = null;
    parts.length = 0;
    showMenu();
  });
}

function fillSettings() {
  $('s-name').value = S.name;
  $('s-sound').textContent = S.opts.sound ? 'an' : 'aus';
  $('s-sound').classList.toggle('on', S.opts.sound);
  $('s-music').textContent = S.opts.music ? 'an' : 'aus';
  $('s-music').classList.toggle('on', S.opts.music);
  $('s-sleep').value = S.opts.sleep;
  $('s-wake').value = S.opts.wake;
  $('s-limit').value = S.opts.limit;
  $('s-storage').hidden = storageOk && checkStorage();
  $('s-dev').textContent = dev.on ? 'an' : 'aus';
  $('s-dev').classList.toggle('on', dev.on);
  $('s-devopen').hidden = !dev.on;
  const t = now();
  $('s-info').textContent = hatched()
    ? 'Tag ' + lifeDay(t) + ' von ' + GROWN_DAY + ' · ' + STAGES[stageAt(t)].name
    : 'Noch im Ei · ' + S.egg.cracks + (S.egg.cracks === 1 ? ' Riss' : ' Risse') + ' von ' + EGG.cracks;
}

function openSettings() {
  fillSettings();
  $('settings').hidden = false;
}
function closeSettings() {
  $('settings').hidden = true;
  $('confirm').hidden = true;
  refreshUI();
}

/**
 * Back key (called from MainActivity). Returns true if the game handled it,
 * false = the app may close (only from the main menu).
 */
window.__back = () => {
  if (!$('confirm').hidden) { $('confirm').hidden = true; return true; }
  if (!$('settings').hidden) { closeSettings(); return true; }
  if (!$('rest').hidden) { $('rest').hidden = true; return true; }
  if (!$('dev-confirm').hidden) { $('dev-confirm').hidden = true; return true; }
  if (!$('devpanel').hidden) { closeDev(); return true; }
  if (!$('stickers').hidden) { closeStickers(); return true; }
  if (!$('shop').hidden) { closeShop(); return true; }
  if (!$('places').hidden) { closePlaces(); return true; }
  if (!$('photoview').hidden) { $('photoview').hidden = true; return true; }
  if (!$('album').hidden) { closeAlbum(); return true; }
  if (!$('wardrobe').hidden) { closeWardrobe(); return true; }
  if (game.screen === 'game') {
    if (game.mode === 'train' && game.train && game.train.phase === 'draw') { trainBackToPick(); return true; }
    if (!['idle', 'hatch', 'party'].includes(game.mode)) { endMode(); return true; }
    showMenu(); return true;
  }
  return false;
};

/** The play button opens a small menu: ball, hide and seek, music. */
function openPlayMenu() {
  if (!hatched() || asleepNow() || game.mode !== 'idle') return;
  sound('tap');
  game.mode = 'play'; game.modeT = 0;
  refreshUI();
}

/** Six coloured xylophone bars (higher = shorter) and two drums. */
function buildMusicPad() {
  const cols = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'];
  $('musicpad').innerHTML = '<button class="drum" id="mk-6" type="button" aria-label="Trommel" style="background:#ffe0b2"></button>' +
    cols.map((c, i) => '<button class="key" id="mk-' + i + '" type="button" aria-label="Ton" style="background:' + c + ';height:' + (96 - i * 8) + 'px"></button>').join('') +
    '<button class="drum small" id="mk-7" type="button" aria-label="kleine Trommel" style="background:#fff3e0"></button>';
  for (let i = 0; i < 8; i++) {
    const el = $('mk-' + i);
    el.addEventListener('pointerdown', e => { e.preventDefault(); unlockAudio(); playKey(i); melodyKey(i); el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 120); });
  }
}
