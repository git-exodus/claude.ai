/*
 * In-game interface: toasts, the top bar, the weapon bar with its info line,
 * and gaining XP (which is mostly a display matter: bars, toasts, level-ups).
 */

/* ---------- Toasts ---------- */

const toastEl = $('toast');
const toastQueue = [];
let toastBusy = false;

/** Shows a short message below the top bar; `detail` is an optional second line. */
function toast(title, detail) {
  toastQueue.push([title, detail]);
  if (!toastBusy) showNextToast();
}
function showNextToast() {
  const next = toastQueue.shift();
  if (!next) { toastBusy = false; return; }
  toastBusy = true;
  const [title, detail] = next;
  toastEl.textContent = title;
  if (detail) {
    const line = document.createElement('small');
    line.textContent = detail;
    toastEl.appendChild(line);
  }
  toastEl.classList.add('on');
  setTimeout(() => {
    toastEl.classList.remove('on');
    setTimeout(showNextToast, 280);
  }, detail ? 2600 : 1500);
}

/* ---------- Top bar and weapon bar ---------- */

/** Redraws every DOM part of the HUD from the current state. Cheap enough to call on any change. */
function renderHud() {
  $('wave').textContent = 'Welle ' + S.wave;
  $('wdown').disabled = S.wave <= 1;
  $('wup').disabled = S.wave > S.cleared;
  $('b-hold').setAttribute('aria-pressed', String(S.hold));
  $('b-speed').textContent = 'x' + DB.opts.speed;
  $('wave').classList.toggle('lava', S.world === 'lava');
  $('b-world').hidden = !lavaUnlocked();
  $('gold').textContent = S.gold;
  $('gold').setAttribute('aria-label', S.gold + ' Gold');
  renderHearts();
  renderWallBricks();
  renderWeaponBar();
  renderWeaponInfo();
}

function renderHearts() {
  const box = $('hearts'), max = maxHp();
  box.textContent = '';
  box.classList.toggle('many', max > 10);   // more than ten hearts wrap into two rows
  for (let i = 0; i < max; i++) {
    const heart = document.createElement('span');
    heart.textContent = '♥';
    if (i >= castle.hp) heart.className = 'off';
    box.appendChild(heart);
  }
  box.setAttribute('aria-label', castle.hp + ' von ' + max + ' Leben');
}

/** One brick per wall hit point; lost ones are dimmed. Wraps into several rows. */
function renderWallBricks() {
  const box = $('wall'), max = wallMax();
  box.hidden = !max;
  box.textContent = '';
  box.setAttribute('aria-label', 'Mauer ' + S.wallHp + ' von ' + max);
  for (let i = 0; i < max; i++) {
    const brick = document.createElement('i');
    if (i >= S.wallHp) brick.className = 'off';
    box.appendChild(brick);
  }
}

/** Round weapon buttons: level badge when owned, price when locked. */
function renderWeaponBar() {
  for (const id of WEAPON_IDS) {
    const button = $('wp-' + id), weapon = WEAPONS[id], has = owned(id);
    button.classList.toggle('locked', !has);
    button.setAttribute('aria-pressed', String(S.active === id));
    button.querySelector('.badge').textContent = has ? S.lv[id] : weapon.price;
    button.setAttribute('aria-label', weapon.name + (has ? ', Level ' + S.lv[id] : ', gesperrt, ' + weapon.price + ' Gold'));
  }
}

/** Info line under the weapons: name and level, damage, attack interval, next ability; plus the XP bar. */
function renderWeaponInfo() {
  const id = S.active, level = S.lv[id];
  const line = $('winfo');
  line.textContent = '';
  const chip = (text, tag = 'span', className = '') => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = text;
    line.appendChild(el);
  };
  chip(WEAPONS[id].name + ' Lvl ' + level, 'b');
  chip('Schaden ' + Math.round(damageOf(id)));
  chip('alle ' + cooldownOf(id).toFixed(1).replace('.', ',') + ' s');
  const next = nextMilestone(id);
  chip(next ? 'Neu ab Lvl ' + next : 'MAX', 'span', 'nx');

  // Shrink the font until the line fits; long weapon names would overflow otherwise.
  let fontSize = 12.5;
  line.style.fontSize = fontSize + 'px';
  while (line.scrollWidth > line.clientWidth + 1 && fontSize > 9) {
    fontSize -= 0.5;
    line.style.fontSize = fontSize + 'px';
  }
  const share = level >= MAX_LEVEL ? 1 : Math.min(1, S.xp[id] / xpNeeded(level));
  $('wxp').firstElementChild.style.width = share * 100 + '%';
}

/** Per-frame HUD parts: wave progress bar and the cooldown ring on the active weapon. */
function updateHudMeters() {
  const progress = waveProgress();
  if (progress !== session.lastProgress) {
    session.lastProgress = progress;
    $('wprog').style.width = Math.max(0, progress) + '%';
  }
  const left = clamp(combat.cooldown / combat.cooldownMax, 0, 1);
  $('wp-' + S.active).querySelector('.cd').style.setProperty('--p', left.toFixed(3));
}

function clearCooldownRings() {
  document.querySelectorAll('.wp .cd').forEach(el => el.style.setProperty('--p', 0));
}

/* ---------- XP ---------- */

/** Gives XP to a weapon and handles level-ups, including the announcement of new abilities. */
function gainXp(id, amount) {
  if (S.lv[id] >= MAX_LEVEL) return;
  S.xp[id] += amount * xpFactor();
  let leveledUp = false;
  while (S.lv[id] < MAX_LEVEL && S.xp[id] >= xpNeeded(S.lv[id])) {
    S.xp[id] -= xpNeeded(S.lv[id]);
    S.lv[id]++;
    leveledUp = true;
    const title = WEAPONS[id].name + ' Lvl ' + S.lv[id];
    const ability = WEAPONS[id].milestones[S.lv[id]];
    if (ability) toast(title, 'Neu: ' + ability);
    else floatText(cx, cy - 70 * U, title, '#ffe08a', true);
  }
  if (S.lv[id] >= MAX_LEVEL) S.xp[id] = 0;
  if (leveledUp) {
    sound(660, 0.09, 'triangle', 0.05);
    setTimeout(() => sound(880, 0.14, 'triangle', 0.05), 90);
    vibrate(30);
    ring(cx, cy, 90 * U, '245,185,58', 0.6);
    checkAchievements();
    save();
  }
  renderWeaponBar();     // only these two parts change with XP; kills are frequent, so skip the rest
  renderWeaponInfo();
}
