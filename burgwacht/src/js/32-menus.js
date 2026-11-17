/*
 * Overlays other than the shop: main menu with the save slots, pause menu and
 * the ability overview. Also decides when the game is paused.
 */

const OVERLAY_IDS = ['menu', 'shop', 'pausep', 'abil', 'dialog', 'chestfx'];
const isOpen = id => !$(id).hidden;

/** The game is paused exactly while any overlay is open. Call after showing or hiding one. */
function refreshPause() {
  session.paused = OVERLAY_IDS.some(isOpen);
  if (session.paused) session.holdPoint = null;   // a finger that was down must not keep firing afterwards
}

/* The Android app injects `window.Android` (see MainActivity.java); in a browser there is no Exit. */
const androidApp = window.Android;
const canExit = !!(androidApp && androidApp.exit);

/* ---------- Main menu and save slots ---------- */

let slotMode = 'new';      // 'new' = pick a slot for a new game, 'load' = pick a slot to load
let confirmSlot = -1;      // occupied slot that was tapped once and waits for the confirming tap

function showMenu() {
  save();
  slot = -1;
  game.classList.add('inmenu');
  for (const id of OVERLAY_IDS) $(id).hidden = id !== 'menu';
  showMenuPage('m-main');
  $('m-load').disabled = !DB.slots[0] && !DB.slots[1];
  clearField(true);
  world.effects = [];
  world.particles = [];
  world.texts = [];
  refreshPause();
  playMusic('menu');
}

function showMenuPage(id) {
  $('m-main').hidden = id !== 'm-main';
  $('m-slots').hidden = id !== 'm-slots';
}

function showSlots(mode) {
  slotMode = mode;
  confirmSlot = -1;
  showMenuPage('m-slots');
  $('m-slottitle').textContent = mode === 'new' ? 'Neues Spiel: Platz wählen' : 'Spielstand laden';
  renderSlots();
}

/** One-line summary of a save for the slot buttons. */
function slotSummary(data) {
  const weapons = WEAPON_IDS.filter(id => id === 'sword' || data.own[id]).map(id => ' · ' + WEAPONS[id].name + ' ' + data.lv[id]);
  return 'Welle ' + data.wave + ' · ' + data.gold + ' Gold' + weapons.join('');
}

function renderSlots() {
  const list = $('slotlist');
  list.textContent = '';
  [0, 1].forEach(index => {
    const data = DB.slots[index];
    const button = document.createElement('button');
    const title = document.createElement('b');
    const info = document.createElement('span');
    button.type = 'button';
    button.id = 'slot-' + index;
    button.className = 'slot' + (confirmSlot === index ? ' warn' : '');
    title.textContent = 'Spielstand ' + (index + 1);
    info.textContent = confirmSlot === index ? 'Überschreiben? Zum Bestätigen noch einmal tippen.' : data ? slotSummary(data) : 'Leer';
    button.append(title, info);
    if (slotMode === 'load' && !data) button.disabled = true;
    button.addEventListener('click', () => {
      // starting a new game on an occupied slot needs a second tap
      if (slotMode === 'new' && data && confirmSlot !== index) {
        confirmSlot = index;
        renderSlots();
        return;
      }
      startGame(index, slotMode === 'new');
      if (slotMode === 'new') showIntro();
    });
    list.appendChild(button);
  });
}

/** Leaves the menu and starts playing slot `index`; `fresh` starts a new game there. */
function startGame(index, fresh) {
  loadSlotIntoState(index, fresh);
  castle.hp = maxHp();
  makeGround();                                  // the slot may be in another world than the last one played
  combat.cooldown = 0;
  combat.cooldownMax = 1;
  combat.attackCount = 0;
  restartWave(true);
  $('menu').hidden = true;
  game.classList.remove('inmenu');
  session.started = !fresh;                      // a new game shows the "tap to attack" hint
  $('hint').style.opacity = fresh ? 1 : 0;
  clearCooldownRings();
  refreshPause();
  renderHud();
  save();
  toast('Welle ' + S.wave);
  playMusic('game');
}

/* ---------- Pause menu ---------- */

function renderPause() {
  $('p-snd').textContent = 'Ton: ' + (DB.opts.mute ? 'aus' : 'an');
  $('p-vib').textContent = 'Vibration: ' + (DB.opts.vib ? 'an' : 'aus');
  $('p-music').textContent = 'Musik: ' + (DB.opts.music ? 'an' : 'aus');
}
function openPause() {
  if (session.paused) return;
  renderPause();
  $('pausep').hidden = false;
  refreshPause();
}
function closePause() {
  $('pausep').hidden = true;
  refreshPause();
}

/* ---------- Generic dialog ---------- */

let dialogDismissable = true;   // false while the player has to pick one of the buttons (chest)

/**
 * Opens a small window and pauses the game.
 *   text     paragraph below the title (optional)
 *   body     extra DOM nodes between text and buttons (optional)
 *   buttons  [{ label, detail?, action?, alt? }]; every button closes the window, then runs its action
 *   dismissable  false = the back button does not close it
 */
function showDialog({ title, text = '', body = [], buttons = [{ label: 'Weiter' }], dismissable = true }) {
  dialogDismissable = dismissable;
  $('dlg-title').textContent = title;
  $('dlg-text').textContent = text;
  $('dlg-text').hidden = !text;
  const bodyBox = $('dlg-body');
  bodyBox.textContent = '';
  bodyBox.append(...body);
  const buttonBox = $('dlg-buttons');
  buttonBox.textContent = '';
  buttons.forEach((spec, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'dlg-' + index;
    button.className = 'big' + (spec.alt ? ' alt' : '');
    button.textContent = spec.label;
    if (spec.detail) {
      const detail = document.createElement('small');
      detail.textContent = spec.detail;
      button.appendChild(detail);
    }
    button.addEventListener('click', () => {
      closeDialog();
      if (spec.action) spec.action();
    });
    buttonBox.appendChild(button);
  });
  $('dialog').hidden = false;
  refreshPause();
}
function closeDialog() {
  $('dialog').hidden = true;
  refreshPause();
}

/** Greeting at the start of every new game. */
function showIntro() {
  showDialog({
    title: 'Sire!',
    text: 'Sire, die Monster greifen an. Nehmt Eure Dolche. Wir müssen uns aufrüsten!',
    buttons: [{ label: 'Zu den Waffen!' }],
  });
}

/** One-time hint after the first defeat of a save: the wave arrows. */
function showWaveHintOnce() {
  if (S.hints.waves) return;
  S.hints.waves = true;
  save();
  showDialog({
    title: 'Tipp',
    text: 'Oben links wählst du mit den Pfeilen die Welle selbst. Ist eine Welle zu schwer, geh ein paar Wellen zurück: Dort gibt es auch Gold, und deine Waffen leveln weiter.',
    buttons: [{ label: 'Verstanden' }],
  });
}

/** One-time hint after wave 2: long press on a weapon shows its abilities. */
function showSkillHintOnce() {
  if (S.hints.skills || !debugFlags.skillHint) return;
  S.hints.skills = true;
  save();
  showDialog({
    title: 'Tipp',
    text: 'Halte eine Waffe unten gedrückt, um alle ihre Fähigkeiten zu sehen – auch die, die erst mit höherem Level kommen.',
    buttons: [{ label: 'Verstanden' }],
  });
}

/** World picker behind the globe button (only visible once the lava world is unlocked). */
function showWorldChoice() {
  if (session.paused || !lavaUnlocked()) return;
  const waveIn = id => (id === S.world ? S.wave : S.parked.wave);
  showDialog({
    title: 'Welt wechseln',
    text: 'Jede Welt hat ihre eigenen Wellen. In der Lava-Welt gibt es dreifaches Gold.',
    buttons: Object.keys(WORLDS).map(id => ({
      label: WORLDS[id].name,
      detail: (id === S.world ? 'Hier bist du · ' : '') + 'Welle ' + waveIn(id),
      alt: id === S.world,
      action: () => switchWorld(id),
    })),
  });
}

/* ---------- Ability overview (long press on a weapon) ---------- */

function openAbilities(id) {
  if (isOpen('menu') || isOpen('shop') || isOpen('pausep')) return;
  const weapon = WEAPONS[id], has = owned(id);
  $('abiltitle').textContent = weapon.name + (has ? ' · Lvl ' + S.lv[id] : ' · gesperrt');
  const list = $('abillist');
  list.textContent = '';
  const rows = [[1, weapon.baseAbility]].concat(Object.keys(weapon.milestones).map(level => [+level, weapon.milestones[level]]));
  for (const [level, name] of rows) {
    const row = document.createElement('div');
    const levelEl = document.createElement('b');
    const nameEl = document.createElement('span');
    row.className = 'ab' + (has && S.lv[id] >= level ? ' on' : '');
    levelEl.textContent = 'Lvl ' + level;
    nameEl.textContent = name;
    row.append(levelEl, nameEl);
    list.appendChild(row);
  }
  $('abil').hidden = false;
  refreshPause();
}
function closeAbilities() {
  $('abil').hidden = true;
  refreshPause();
}

/* ---------- Back button ---------- */

/** Called by the Android back button: closes the topmost thing, or exits from the main menu. */
window.__back = () => {
  if (isOpen('dialog')) { if (dialogDismissable) closeDialog(); }
  else if (isOpen('abil')) closeAbilities();
  else if (isOpen('pausep')) closePause();
  else if (isOpen('shop')) { /* the shop can only be left with its own button */ }
  else if (isOpen('menu')) {
    if (isOpen('m-slots')) showMenuPage('m-main');
    else if (canExit) androidApp.exit();
  } else openPause();
};

/* ---------- Button wiring ---------- */

$('m-start').addEventListener('click', () => showSlots('new'));
$('m-load').addEventListener('click', () => showSlots('load'));
$('m-back').addEventListener('click', () => showMenuPage('m-main'));
if (canExit) $('m-exit').addEventListener('click', () => androidApp.exit());
else $('m-exit').hidden = true;

$('b-pause').addEventListener('click', openPause);
$('p-resume').addEventListener('click', closePause);
$('p-menu').addEventListener('click', showMenu);
$('p-stats').addEventListener('click', () => { closePause(); showStats(); });
$('b-world').addEventListener('click', showWorldChoice);
$('p-snd').addEventListener('click', () => {
  DB.opts.mute = !DB.opts.mute;
  save();
  renderPause();
  sound(700, 0.08, 'triangle');
});
$('p-music').addEventListener('click', () => {
  DB.opts.music = !DB.opts.music;
  save();
  renderPause();
  playMusic(musicForScreen());
});
$('p-vib').addEventListener('click', () => {
  DB.opts.vib = !DB.opts.vib;
  save();
  renderPause();
  vibrate(40);
});
$('abil-close').addEventListener('click', closeAbilities);
$('shopgo').addEventListener('click', closeShop);

$('b-speed').addEventListener('click', () => {
  DB.opts.speed = DB.opts.speed === 2 ? 1 : 2;
  save();
  renderHud();
});
$('b-hold').addEventListener('click', () => {
  S.hold = !S.hold;
  save();
  renderHud();
});
$('wdown').addEventListener('click', () => setWave(S.wave - 1));
$('wup').addEventListener('click', () => setWave(S.wave + 1));
