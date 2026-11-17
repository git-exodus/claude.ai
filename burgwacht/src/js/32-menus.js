/*
 * Overlays other than the shop: main menu with the save slots, pause menu and
 * the ability overview. Also decides when the game is paused.
 */

const OVERLAY_IDS = ['menu', 'shop', 'pausep', 'abil'];
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
    });
    list.appendChild(button);
  });
}

/** Leaves the menu and starts playing slot `index`; `fresh` starts a new game there. */
function startGame(index, fresh) {
  loadSlotIntoState(index, fresh);
  castle.hp = MAX_HP;
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
}

/* ---------- Pause menu ---------- */

function renderPause() {
  $('p-snd').textContent = 'Ton: ' + (DB.opts.mute ? 'aus' : 'an');
  $('p-vib').textContent = 'Vibration: ' + (DB.opts.vib ? 'an' : 'aus');
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
  if (isOpen('abil')) closeAbilities();
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
$('p-snd').addEventListener('click', () => {
  DB.opts.mute = !DB.opts.mute;
  save();
  renderPause();
  sound(700, 0.08, 'triangle');
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
