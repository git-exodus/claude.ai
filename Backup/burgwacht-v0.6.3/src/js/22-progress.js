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

/* ---------- Chest every tenth wave ---------- */

const CHEST_EVERY = 10;

/*
 * Boons from the chest. Lasting boons are counted in S.run.boons and read via
 * boonFactor() in 03-state.js; they end with the next defeat. Instant boons
 * apply once. `available()` hides boons that would do nothing right now.
 */
const BOONS = [
  { id: 'damage', name: 'Scharfe Klingen', text: '+25 % Schaden für alle Waffen' },
  { id: 'speed', name: 'Flinke Hände', text: 'Alle Waffen greifen 20 % schneller an' },
  { id: 'xp', name: 'Lehrmeister', text: '+50 % XP' },
  { id: 'gold', name: 'Schatzkarte', text: '+50 % Gold für neue Wellen' },
  { id: 'feast', name: 'Festmahl', text: 'Die Burg wird sofort voll geheilt', instant: () => { castle.hp = maxHp(); }, available: () => castle.hp < maxHp() },
  { id: 'mason', name: 'Maurer', text: 'Die Mauer wird sofort repariert', instant: () => { S.wallHp = wallMax(); }, available: () => S.wallHp < wallMax() },
];

const activeBoonNames = () => BOONS.filter(boon => S.run.boons[boon.id]).map(boon => boon.name + (S.run.boons[boon.id] > 1 ? ' ×' + S.run.boons[boon.id] : ''));

function takeBoon(boon) {
  if (boon.instant) boon.instant();
  else S.run.boons[boon.id] = (S.run.boons[boon.id] || 0) + 1;
  sound(880, 0.12, 'triangle', 0.05, 440);
  save();
  renderHud();
}

/** After clearing wave 10, 20, ...: pick one of three random boons. Once per wave number and run. */
function offerChest(waveNo) {
  const key = S.world + ':' + waveNo;
  if (!debugFlags.chests || S.run.chests.includes(key)) return;
  S.run.chests.push(key);
  const pool = BOONS.filter(boon => !boon.available || boon.available());
  const choices = [];
  while (choices.length < 3 && pool.length) choices.push(pool.splice(Math.floor(rnd(pool.length)), 1)[0]);
  showDialog({
    title: 'Schatztruhe',
    text: 'Wähle einen Bonus. Dauerhafte Boni gelten bis zur nächsten Niederlage.',
    dismissable: false,
    buttons: choices.map(boon => ({ label: boon.name, detail: boon.text, action: () => takeBoon(boon) })),
  });
}
