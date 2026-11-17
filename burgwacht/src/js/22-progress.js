/*
 * Long-term progress: statistics, achievements and the chest that appears
 * every tenth wave.
 */

/** All gold income goes through here so the statistics stay correct. */
function earnGold(amount) {
  S.gold += amount;
  S.stats.goldEarned += amount;
}

/** Called for every enemy killed by the player's side (not for enemies that reach the castle). */
function recordKill(enemy) {
  S.stats.kills++;
  if (enemy.boss) S.stats.bosses++;
  if (combo.count + 1 > S.stats.bestCombo) S.stats.bestCombo = combo.count + 1;
}

/* ---------- Achievements ---------- */

/*
 * Each achievement pays its gold reward once per save.
 *   done()  true as soon as the goal is reached
 */
const highestWave = worldId => (S.world === worldId ? S.cleared : S.parked.cleared);
const highestLevel = () => Math.max(...WEAPON_IDS.map(id => S.lv[id]));

const ACHIEVEMENTS = [
  { id: 'kills100', name: 'Monsterjäger', text: '100 Gegner besiegt', gold: 5, done: () => S.stats.kills >= 100 },
  { id: 'kills1000', name: 'Monsterschreck', text: '1.000 Gegner besiegt', gold: 25, done: () => S.stats.kills >= 1000 },
  { id: 'kills10000', name: 'Legende', text: '10.000 Gegner besiegt', gold: 100, done: () => S.stats.kills >= 10000 },
  { id: 'combo25', name: 'In Fahrt', text: 'Serie von 25 Treffern', gold: 5, done: () => S.stats.bestCombo >= 25 },
  { id: 'combo100', name: 'Unaufhaltsam', text: 'Serie von 100 Treffern', gold: 30, done: () => S.stats.bestCombo >= 100 },
  { id: 'boss', name: 'Königsmörder', text: 'Ersten Boss besiegt', gold: 5, done: () => S.stats.bosses >= 1 },
  { id: 'wave10', name: 'Standhaft', text: 'Welle 10 geschafft', gold: 10, done: () => highestWave('meadow') >= 10 },
  { id: 'wave25', name: 'Bollwerk', text: 'Welle 25 geschafft', gold: 25, done: () => highestWave('meadow') >= 25 },
  { id: 'wave50', name: 'Festung', text: 'Welle 50 geschafft', gold: 60, done: () => highestWave('meadow') >= 50 },
  { id: 'wave100', name: 'Herr der Wiese', text: 'Welle 100 geschafft', gold: 200, done: () => highestWave('meadow') >= 100 },
  { id: 'arsenal', name: 'Waffenkammer', text: 'Alle fünf Waffen im Besitz', gold: 30, done: () => WEAPON_IDS.every(owned) },
  { id: 'level50', name: 'Meister', text: 'Eine Waffe auf Level 50', gold: 30, done: () => highestLevel() >= 50 },
  { id: 'level100', name: 'Großmeister', text: 'Eine Waffe auf Level 100', gold: 100, done: () => highestLevel() >= 100 },
  { id: 'lava', name: 'Feuertaufe', text: 'Erste Lava-Welle geschafft', gold: 50, done: () => highestWave('lava') >= 1 },
];

/** Rewards every achievement that was reached since the last check. Cheap; called about once a second. */
function checkAchievements() {
  if (!debugFlags.achievements || slot < 0) return;
  for (const achievement of ACHIEVEMENTS) {
    if (S.ach[achievement.id] || !achievement.done()) continue;
    S.ach[achievement.id] = true;
    earnGold(achievement.gold);
    toast('Erfolg: ' + achievement.name, '+' + achievement.gold + ' Gold');
    sound(1000, 0.1, 'triangle', 0.05, 400);
    renderHud();
    save();
  }
}

/** Statistics and achievement list, opened from the pause menu. */
function showStats() {
  const row = (label, value, className = '') => {
    const el = document.createElement('div');
    el.className = 'stat ' + className;
    const name = document.createElement('span'), amount = document.createElement('b');
    name.textContent = label;
    amount.textContent = value;
    el.append(name, amount);
    return el;
  };
  const number = n => n.toLocaleString('de-DE');
  const body = [
    row('Besiegte Gegner', number(S.stats.kills)),
    row('Besiegte Bosse', number(S.stats.bosses)),
    row('Längste Serie', '×' + number(S.stats.bestCombo)),
    row('Höchste Welle (Wiese)', highestWave('meadow')),
  ];
  if (lavaUnlocked()) body.push(row('Höchste Welle (Lava)', highestWave('lava')));
  body.push(row('Gold verdient', number(S.stats.goldEarned)), row('Niederlagen', number(S.stats.defeats)));

  const boons = activeBoonNames();
  if (boons.length) body.push(row('Truhen-Boni', boons.join(', '), 'wide'));

  const heading = document.createElement('h3');
  heading.textContent = 'Erfolge ' + Object.keys(S.ach).length + ' / ' + ACHIEVEMENTS.length;
  body.push(heading);
  for (const achievement of ACHIEVEMENTS) {
    body.push(row(achievement.name + ' – ' + achievement.text, S.ach[achievement.id] ? '✓' : achievement.gold + ' Gold', S.ach[achievement.id] ? 'done' : 'open'));
  }
  showDialog({ title: 'Statistik', body, buttons: [{ label: 'Schließen' }] });
}

/* ---------- Chest every third wave ---------- */

const CHEST_EVERY = 3;

/*
 * Boons from the chest. Lasting boons are counted in S.run.boons and read via
 * boonFactor() in 03-state.js; they end with the next defeat. Instant boons
 * apply once. `available()` hides boons that would do nothing right now.
 */
const BOONS = [
  { id: 'damage', name: 'Scharfe Klingen', text: '+25 % Schaden für alle Waffen' },
  { id: 'speed', name: 'Flinke Hände', text: 'Alle Waffen greifen 20 % schneller an' },
  { id: 'xp', name: 'Lehrmeister', text: '+50 % XP' },
  { id: 'gold', name: 'Schatzkarte', text: '+50 % Gold pro Welle' },
  { id: 'feast', name: 'Festmahl', text: 'Die Burg wird sofort voll geheilt', instant: () => { castle.hp = maxHp(); }, available: () => castle.hp < maxHp() },
  { id: 'mason', name: 'Maurer', text: 'Die Mauer wird sofort repariert', instant: () => { S.wallHp = wallMax(); }, available: () => S.wallHp < wallMax() },
];

const activeBoonNames = () => BOONS.filter(boon => S.run.boons[boon.id]).map(boon => boon.name + (S.run.boons[boon.id] > 1 ? ' ×' + S.run.boons[boon.id] : ''));

/** Info panel in the chest window: how long boons last and which ones are already active. */
function chestInfoBox() {
  const box = document.createElement('div');
  box.className = 'infobox';
  const title = document.createElement('b');
  title.textContent = 'ⓘ Gilt bis zur nächsten Niederlage';
  const text = document.createElement('span');
  text.textContent = 'Boni wie Schaden, Tempo, XP und Gold stapeln sich mit jeder Truhe. Verliert die Burg, verfallen alle. Heilung und Reparatur wirken sofort.';
  box.append(title, text);
  const active = activeBoonNames();
  if (active.length) {
    const now = document.createElement('span');
    now.className = 'active';
    now.textContent = 'Aktiv: ' + active.join(', ');
    box.appendChild(now);
  }
  return box;
}

function takeBoon(boon) {
  if (boon.instant) boon.instant();
  else S.run.boons[boon.id] = (S.run.boons[boon.id] || 0) + 1;
  sound(880, 0.12, 'triangle', 0.05, 440);
  save();
  renderHud();
}

/** After clearing wave 3, 6, 9, ...: pick one of three random boons. Once per wave number and run. */
function offerChest(waveNo) {
  const key = S.world + ':' + waveNo;
  if (!debugFlags.chests || S.run.chests.includes(key)) return;
  S.run.chests.push(key);
  const pool = BOONS.filter(boon => !boon.available || boon.available());
  const choices = [];
  while (choices.length < 3 && pool.length) choices.push(pool.splice(Math.floor(rnd(pool.length)), 1)[0]);
  const showChoice = () => showDialog({
    title: 'Schatztruhe',
    text: 'Wähle einen Bonus.',
    body: [chestInfoBox()],
    dismissable: false,
    buttons: choices.map(boon => ({ label: boon.name, detail: boon.text, action: () => takeBoon(boon) })),
  });
  if (debugFlags.chestAnimation) playChestAnimation(showChoice);
  else showChoice();
}

/* ---------- Chest opening animation ---------- */

const CHEST_ANIMATION = 2.1;     // seconds until the choice appears
const CHEST_SKIPPABLE = 0.4;     // a tap skips the rest after this many seconds

/*
 * Timeline (seconds): 0-0.45 the chest drops in and bounces, 0.45-1.25 it
 * shakes harder and harder, 1.25-2.1 the lid flies open with light rays and
 * sparkles. Runs on its own canvas while the game is paused underneath.
 */
function playChestAnimation(onDone) {
  const overlay = $('chestfx'), cv = overlay.querySelector('canvas'), g = cv.getContext('2d');
  const width = game.clientWidth, height = game.clientHeight, ratio = Math.min(2.5, window.devicePixelRatio || 1);
  cv.width = Math.round(width * ratio);
  cv.height = Math.round(height * ratio);
  overlay.hidden = false;
  refreshPause();
  const start = performance.now();
  let finished = false, frameId = 0;
  sound(180, 0.25, 'triangle', 0.06, -60);

  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frameId);
    overlay.hidden = true;
    overlay.onclick = null;
    refreshPause();
    onDone();
  };
  overlay.onclick = () => { if ((performance.now() - start) / 1000 >= CHEST_SKIPPABLE) finish(); };

  let creaked = false;
  const frame = now => {
    const t = (now - start) / 1000;
    if (t >= CHEST_ANIMATION) { finish(); return; }
    if (t > 1.25 && !creaked) { creaked = true; sound(520, 0.35, 'triangle', 0.06, 500); vibrate(40); }
    drawChestFrame(g, ratio, width, height, t);
    frameId = requestAnimationFrame(frame);
  };
  frameId = requestAnimationFrame(frame);
}

function drawChestFrame(g, ratio, width, height, t) {
  g.setTransform(ratio, 0, 0, ratio, 0, 0);
  g.clearRect(0, 0, width, height);
  const size = Math.min(width, height) * 0.32, x = width / 2, groundY = height * 0.5 + size * 0.3;
  const easeOut = k => 1 - Math.pow(1 - k, 3);

  // drop with one bounce
  let y = groundY;
  if (t < 0.32) y = groundY - (1 - easeOut(t / 0.32)) * height * 0.6;
  else if (t < 0.45) y = groundY - sin((t - 0.32) / 0.13 * PI) * size * 0.12;
  // shaking, stronger towards the opening
  const shake = t > 0.45 && t < 1.25 ? sin(t * 60) * (t - 0.45) * 0.12 : 0;
  // lid angle: closed, a short peek, then wide open
  const open = t < 1.25 ? (t > 0.9 ? sin((t - 0.9) / 0.35 * PI) * 0.15 : 0) : Math.min(1, (t - 1.25) / 0.35);

  if (t > 1.25) drawChestLight(g, x, y - size * 0.35, size, Math.min(1, (t - 1.25) / 0.3), t);

  g.save();
  g.translate(x, y);
  g.rotate(shake);
  g.lineJoin = 'round';
  g.strokeStyle = INK;
  g.lineWidth = size * 0.035;
  g.fillStyle = 'rgba(0,0,0,.25)';
  fillEllipse(g, 0, size * 0.04, size * 0.62, size * 0.1);
  // box
  const w = size, h = size * 0.55;
  g.fillStyle = '#8a5a34';
  g.beginPath();
  g.roundRect(-w / 2, -h, w, h, size * 0.05);
  g.fill();
  g.stroke();
  g.fillStyle = 'rgba(0,0,0,.15)';
  for (let i = 1; i < 3; i++) g.fillRect(-w / 2, -h + i * h / 3, w, size * 0.015);   // planks
  chestBands(g, w, -h, h, size);
  if (open > 0.3) {   // the open chest: dark inside, heaped with glowing gold
    g.fillStyle = '#3a2416';
    fillEllipse(g, 0, -h, w * 0.46, size * 0.08);
    for (let i = 0; i < 9; i++) {
      g.fillStyle = i % 3 ? '#f5b93a' : '#ffe08a';
      fillCircle(g, (i - 4) * w * 0.09, -h - size * (0.03 + 0.05 * sin(i * 1.3) ** 2), size * 0.05);
    }
  }
  // lid, hinged at the back edge
  g.save();
  g.translate(0, -h);
  g.scale(1, cos(open * PI * 0.62));
  g.fillStyle = '#9b6a3e';
  g.beginPath();
  g.moveTo(-w / 2, 0);
  g.lineTo(-w / 2, -size * 0.18);
  g.quadraticCurveTo(0, -size * 0.42, w / 2, -size * 0.18);
  g.lineTo(w / 2, 0);
  g.closePath();
  g.fill();
  g.stroke();
  chestBands(g, w, -size * 0.3, size * 0.3, size);
  g.restore();
  // lock
  if (open < 0.2) {
    g.fillStyle = '#f5b93a';
    g.beginPath();
    g.roundRect(-size * 0.07, -h - size * 0.06, size * 0.14, size * 0.16, size * 0.03);
    g.fill();
    g.stroke();
  }
  g.restore();
}

/** Two golden metal bands across the chest or lid. */
function chestBands(g, w, top, h, size) {
  g.fillStyle = '#f5b93a';
  for (const bx of [-w * 0.32, w * 0.24]) {
    g.fillRect(bx, top, size * 0.08, h);
    g.strokeRect(bx, top, size * 0.08, h);
  }
}

/** Light pouring out of the open chest: rotating rays and rising sparkles. */
function drawChestLight(g, x, y, size, strength, t) {
  g.save();
  g.translate(x, y);
  g.globalAlpha = strength;
  for (let i = 0; i < 12; i++) {
    const a = -PI / 2 + (i - 5.5) * 0.17 + sin(t * 2 + i) * 0.03;
    const reach = size * (1.6 + 0.3 * sin(t * 5 + i * 1.7));
    const ray = g.createLinearGradient(0, 0, cos(a) * reach, sin(a) * reach);
    ray.addColorStop(0, 'rgba(255,236,170,.85)');
    ray.addColorStop(1, 'rgba(255,236,170,0)');
    g.fillStyle = ray;
    g.beginPath();
    g.moveTo(-size * 0.05, 0);
    g.lineTo(cos(a - 0.05) * reach, sin(a - 0.05) * reach);
    g.lineTo(cos(a + 0.05) * reach, sin(a + 0.05) * reach);
    g.lineTo(size * 0.05, 0);
    g.fill();
  }
  for (let i = 0; i < 14; i++) {   // sparkles rise and fade
    const k = ((t - 1.25) * 0.9 + i / 14) % 1;
    const sx = sin(i * 2.3) * size * 0.45, sy = -k * size * 1.3;
    g.globalAlpha = strength * (1 - k);
    g.fillStyle = i % 2 ? '#fff6c8' : '#f5b93a';
    fillCircle(g, sx, sy, size * 0.025 * (1 - k * 0.5));
  }
  g.restore();
}
