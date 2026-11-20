/* 19-dev.js – test mode for the parents (0.4): opened in the settings. It switches to a separate
 * test game (TEST_KEYS), so the child's Stegi, photos and clock are never changed. In test mode:
 * choose the stage or day, speed up time (DEV_SPEEDS), jump in time, and helpers (needs, places,
 * presents, visit, weather). Test mode is not remembered: every start of the app is the real game.
 * A red "TEST" badge shows while it is on. */

const dev = { on: false, speed: 1, realOffset: 0, visitor: 0 };

/** Switches between the real game and the test game. */
function setTestMode(on) {
  if (on === dev.on) return;
  save(); savePhotos();
  if (on) {
    dev.realOffset = clock.offset;
    dev.on = true;
    let off = NaN;
    try { off = parseFloat(localStorage.getItem(TEST_KEYS.clock)); } catch (e) { /* none */ }
    clock.offset = isFinite(off) ? off : clock.offset;
  } else {
    saveTestClock();
    dev.on = false; dev.speed = 1;
    clock.offset = dev.realOffset;
    game.weatherTest = null;
  }
  loadGame();
  loadPhotos();
  resetScreenState();
  refreshUI();
}

function saveTestClock() {
  try { localStorage.setItem(TEST_KEYS.clock, String(clock.offset)); } catch (e) { /* not saved */ }
}

/** After loading another game: nothing from the old one may stay on screen. */
function resetScreenState() {
  endMode();
  game.mode = 'idle'; game.visit = null; game.flying = null; game.held = null; game.autoPhotoAt = 0;
  parts.length = 0;
  Object.assign(pet, { x: 0, tx: 0, jump: 0, jumpV: 0, depth: 0, danceT: 0, eatT: 0, refuseT: 0, giggleT: 0, happyT: 0 });
  game.sky = skyAt(now());
}

/** Called every frame: fast time moves the test clock forward. */
function updateDev(dt) {
  if (!dev.on || dev.speed <= 1) return;
  clock.offset += dt * 1000 * (dev.speed - 1);
  if (Math.random() < dt) saveTestClock();
}

/* ---------- actions of the test panel ---------- */

const today0 = () => dayIndex(now());

/** Egg with n cracks (0..3); 'hatchday' = ready to hatch today. Stroking can go on today. */
function devEgg(n) {
  const fresh = blankSave(now());
  fresh.name = S.name; fresh.opts = S.opts;
  fresh.found = S.found; fresh.giftSeen = 0;
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, fresh);
  const d = today0();
  if (n === 'hatchday') { S.egg.cracks = EGG.cracks; S.egg.crackDay = d - 1; }
  else { S.egg.cracks = n; S.egg.crackDay = n > 0 ? d - 1 : -1; }
  resetScreenState(); save(); refreshUI();
}

/** Puts him on day d of his life (hatches him first if needed). No party for the stages skipped. */
function devDay(d) {
  if (!hatched()) {
    S.hatchDay = today0();
    for (const k of NEEDS) S.needs[k] = START_NEEDS;
    S.last = now();
  }
  S.hatchDay = today0() - d + 1;
  S.stageSeen = stageAt(now());
  resetScreenState(); save(); refreshUI();
}
const devStage = i => devDay(STAGES[i].day);

/** Time: jump forward h hours, or forward to the next hh:mm. */
function devJump(h) { clock.offset += h * 3600e3; saveTestClock(); refreshUI(); }
function devTimeOfDay(minutes) {
  const ahead = minutesUntil(minuteOfDay(now()), minutes) || 1440;
  devJump(ahead / 60);
}
function devSpeed(x) { dev.speed = x; refreshUI(); fillDev(); }

function devNeeds(v) { for (const k of NEEDS) S.needs[k] = v; save(); refreshUI(); }
function devArrive() {
  if (!hatched()) return;
  arrive(now());   // ignores the two-a-day limit on purpose
  closeDev();
}
function devAllPlaces() { S.found = PLACES.map(p => ({ id: p.id, day: -1 })); save(); fillDev(); }
function devAllGifts() { S.giftSeen = WEAR_ITEMS.length; save(); fillDev(); }
function devVisit() {
  if (!hatched()) return;
  game.visit = null;
  startVisit(VISITORS[dev.visitor++ % VISITORS.length]);
  closeDev();
}
function devWeather(w) { game.weatherTest = w === 'auto' ? null : w; fillDev(); }
function devResetTest() {
  resetAll();
  photos = []; savePhotos();
  clock.offset = dev.realOffset; saveTestClock();
  resetScreenState(); fillDev(); refreshUI();
}

/* ---------- the panel ---------- */

const DEV_WEATHER = [['auto', 'Normal'], ['sun', 'Sonne'], ['clouds', 'Wolken'], ['rain', 'Regen'], ['snow', 'Schnee'], ['rainbow', 'Regenbogen']];

function buildDev() {
  const b = (id, text, cls = '') => '<button class="chip' + cls + '" id="' + id + '" type="button">' + text + '</button>';
  $('dev-body').innerHTML =
    '<h3>Stufe</h3><div class="chips">' +
      b('dv-egg-0', 'Ei') + b('dv-egg-1', 'Ei 1 Riss') + b('dv-egg-2', 'Ei 2 Risse') + b('dv-egg-3', 'Ei 3 Risse') + b('dv-egg-h', 'Schlüpftag') +
      STAGES.map((st, i) => b('dv-st-' + i, st.name)).join('') + '</div>' +
    '<label class="row">Tag <input id="dv-day" type="range" min="1" max="' + GROWN_DAY + '" step="1"><b id="dv-dayval"></b></label>' +
    '<h3>Zeit</h3><p class="info" id="dv-clock"></p><div class="chips">' +
      DEV_SPEEDS.map(x => b('dv-sp-' + x, x + '×')).join('') + '</div><div class="chips">' +
      b('dv-h1', '+1 Stunde') + b('dv-d1', '+1 Tag') + b('dv-t7', 'Morgen 7:00') + b('dv-t12', 'Mittag') + b('dv-t1945', 'Abend 19:45') + b('dv-t22', 'Nacht 22:00') + '</div><div class="chips">' +
      b('dv-x18', '18.12.') + b('dv-x24', '24.12.') + b('dv-x31', '31.12.') + b('dv-easter', 'Ostern') + '</div>' +
    '<h3>Helfer</h3><div class="chips">' +
      b('dv-full', 'Alles voll') + b('dv-low', 'Fast leer') + b('dv-arrive', 'Sofort ankommen') + b('dv-places', 'Alle Orte') +
      b('dv-gifts', 'Alle Geschenke') + b('dv-visit', 'Besuch jetzt') + '</div>' +
    '<h3>Wetter</h3><div class="chips">' + DEV_WEATHER.map(([w, t]) => b('dv-w-' + w, t)).join('') + '</div>' +
    b('dv-reset', 'Test-Spielstand zurücksetzen', ' danger wide');
  const on = (id, f) => $(id).addEventListener('click', () => { sound('tap'); f(); fillDev(); });
  [0, 1, 2, 3].forEach(n => on('dv-egg-' + n, () => devEgg(n)));
  on('dv-egg-h', () => devEgg('hatchday'));
  STAGES.forEach((_, i) => on('dv-st-' + i, () => devStage(i)));
  $('dv-day').addEventListener('input', () => { devDay(+$('dv-day').value); fillDev(); });
  DEV_SPEEDS.forEach(x => on('dv-sp-' + x, () => devSpeed(x)));
  on('dv-h1', () => devJump(1)); on('dv-d1', () => devJump(24));
  on('dv-t7', () => devTimeOfDay(7 * 60)); on('dv-t12', () => devTimeOfDay(12 * 60));
  on('dv-x18', () => devGoHoliday([12, 18])); on('dv-x24', () => devGoHoliday([12, 24]));
  on('dv-x31', () => devGoHoliday([12, 31])); on('dv-easter', () => devGoHoliday('easter'));
  on('dv-t1945', () => devTimeOfDay(19 * 60 + 45)); on('dv-t22', () => devTimeOfDay(22 * 60));
  on('dv-full', () => devNeeds(100)); on('dv-low', () => devNeeds(15));
  on('dv-arrive', devArrive); on('dv-places', devAllPlaces); on('dv-gifts', devAllGifts); on('dv-visit', devVisit);
  DEV_WEATHER.forEach(([w]) => on('dv-w-' + w, () => devWeather(w)));
  $('dv-reset').addEventListener('click', () => { $('dev-confirm').hidden = false; });
  $('dvc-no').addEventListener('click', () => { $('dev-confirm').hidden = true; });
  $('dvc-yes').addEventListener('click', () => { $('dev-confirm').hidden = true; devResetTest(); });
  $('dev-close').addEventListener('click', closeDev);
  $('s-dev').addEventListener('click', () => { setTestMode(!dev.on); fillSettings(); if (dev.on) openDev(); });
  $('s-devopen').addEventListener('click', openDev);
}

/** Shows the current state in the panel (which buttons are "on", clock, day). */
function fillDev() {
  if (!dev.on) return;
  const t = now(), d = new Date(t), mark = (id, v) => $(id) && $(id).classList.toggle('on', !!v);
  DEV_SPEEDS.forEach(x => mark('dv-sp-' + x, dev.speed === x));
  DEV_WEATHER.forEach(([w]) => mark('dv-w-' + w, (game.weatherTest || 'auto') === w));
  const st = hatched() ? stageAt(t) : -1;
  STAGES.forEach((_, i) => mark('dv-st-' + i, st === i));
  [0, 1, 2, 3].forEach(n => mark('dv-egg-' + n, !hatched() && S.egg.cracks === n && eggPhase() !== 'hatchday'));
  mark('dv-egg-h', !hatched() && eggPhase() === 'hatchday');
  $('dv-day').value = hatched() ? clamp(lifeDay(t), 1, GROWN_DAY) : 1;
  $('dv-dayval').textContent = hatched() ? lifeDay(t) : 'Ei';
  $('dv-clock').textContent = 'Testuhr: ' + ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '. ' +
    String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' Uhr · ' + S.found.length + ' Orte · ' + S.giftSeen + ' Geschenke';
}

let devClockTimer = 0;
function openDev() {
  if (!dev.on) return;
  closeSettings();
  fillDev();
  $('devpanel').hidden = false;
  clearInterval(devClockTimer);
  devClockTimer = setInterval(() => { if ($('devpanel').hidden) clearInterval(devClockTimer); else fillDev(); }, 500);
}
function closeDev() { $('devpanel').hidden = true; refreshUI(); }
