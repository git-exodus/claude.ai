/*
 * Wave flow: building a wave, spawning it, clearing it, choosing a wave with
 * the arrows, and what happens after a defeat.
 */

/** Fills the spawn queue for the current wave S.wave. */
function buildWave() {
  const waveNo = S.wave;
  const count = currentWorld().count(waveNo);
  wave.queue = [];
  // A wolf pack is queued as a leader entry 'wolf+' plus followers; spawnFromQueue() brings them in together.
  const pack = leader => [leader, ...Array(WOLF_PACK - (leader === 'wolf+' ? 1 : 0)).fill('wolf')];
  for (let i = 0; i < count;) {
    const type = rollEnemyType(waveNo);
    if (type === 'wolf' && count - i >= WOLF_PACK) { wave.queue.push(...pack('wolf+')); i += WOLF_PACK; }
    else { wave.queue.push(type === 'wolf' ? 'slime' : type); i++; }   // no room left for a whole pack
  }
  if (waveNo % BOSS_EVERY === 0) {   // the boss arrives mid-wave; the wolf alpha brings a pack
    const boss = bossFor(waveNo);
    let at = Math.floor(wave.queue.length / 2);
    while (wave.queue[at] === 'wolf') at++;   // never split a pack: insert before the next non-follower
    wave.queue.splice(at, 0, ...(boss === 'wolfAlpha' ? pack(boss) : [boss]));
  }
  wave.spawnGap = spawnGapFor(count);
  wave.spawnTimer = 0;
  wave.total = wave.queue.length;
}

/** Clears the field and starts the current wave over. `all` also removes the soldiers. */
function restartWave(all) {
  clearField(all);
  if (all) resetKnight();
  wave.pause = 1.5;
  buildWave();
}

/** One frame of wave flow: wait, spawn, or finish the wave when nothing is left. */
function updateWave(dt) {
  if (wave.pause > 0) {
    wave.pause -= dt;
  } else if (wave.queue.length) {
    // Enemies come one by one. If the field is full the timer may run up to
    // three spawns behind, so the backlog arrives quickly once there is room.
    wave.spawnTimer = Math.max(wave.spawnTimer - dt, -wave.spawnGap * 3);
    while (wave.spawnTimer <= 0 && wave.queue.length && world.enemies.length < MAX_ENEMIES_ALIVE) {
      spawnFromQueue();
      wave.spawnTimer += wave.spawnGap;
    }
  } else if (!world.enemies.length) {
    completeWave();
  }
}

/** Spawns the next queue entry; a pack leader takes its wolves along, close beside it. */
function spawnFromQueue() {
  let type = wave.queue.shift();
  const leads = type === 'wolf+' || type === 'wolfAlpha';
  if (type === 'wolf+') type = 'wolf';
  const leader = spawnEnemy(type);
  if (!leads) return;
  let k = 0;
  while (wave.queue[0] === 'wolf') {
    wave.queue.shift();
    const a = (k++ / WOLF_PACK) * TAU;
    spawnEnemy('wolf', { at: { x: leader.x + cos(a) * 16 * U, y: leader.y + sin(a) * 16 * U } });
  }
}

function completeWave() {
  const waveNo = S.wave;
  // gold for every clear, repeated waves included
  const gold = Math.round(goldForWave(waveNo) * currentWorld().goldMult * goldFactor());
  earnGold(gold);
  sound(1200, 0.07, 'triangle', 0.05);
  if (waveNo > S.cleared) {
    const wasLocked = !lavaUnlocked();
    S.cleared = waveNo;
    if (wasLocked && lavaUnlocked()) toast('Die Lava-Welt ist offen!', 'Wechsle die Welt mit dem Knopf oben');
  }
  castle.hp = Math.min(maxHp(), castle.hp + S.heal);
  if (!S.hold) S.wave++;
  wave.pause = 2.5;
  buildWave();
  toast('Welle ' + waveNo + ' geschafft', '+' + gold + ' Gold');
  checkAchievements();
  save();
  renderHud();
  if (waveNo % CHEST_EVERY === 0) offerChest(waveNo);
  else if (waveNo === 2) showSkillHintOnce();
}

/** Wave arrows: jump to any wave up to the first one not cleared yet. Resets the enemies. */
function setWave(waveNo) {
  waveNo = clamp(waveNo, 1, S.cleared + 1);
  if (waveNo === S.wave || session.paused) return;
  S.wave = waveNo;
  restartWave(false);
  renderHud();
  save();
  toast('Welle ' + waveNo);
}

/** The castle fell: stop all feedback and open the shop. */
function handleDefeat() {
  castle.fallen = false;
  S.stats.defeats++;
  session.shake = 0;        // otherwise the frozen screen would keep shaking behind the shop
  castle.flash = 0;
  combo.count = 0;
  sound(220, 0.5, 'sawtooth', 0.07, -160);
  vibrate(200);
  restartWave(true);
  openShop();
}

/** Leaving the shop after a defeat: the same wave again, with full lives and a repaired wall; chest boons end. */
function continueAfterDefeat() {
  S.wallHp = wallMax();
  S.run = { boons: {}, chests: [] };
  castle.hp = maxHp();
  combat.cooldown = 0;
  restartWave(true);
}

/** Switches to another world; each world keeps its own wave and progress. */
function switchWorld(id) {
  if (id === S.world || !WORLDS[id]) return;
  const leaving = { wave: S.wave, cleared: S.cleared };
  S.wave = S.parked.wave;
  S.cleared = S.parked.cleared;
  S.parked = leaving;
  S.world = id;
  makeGround();
  restartWave(true);
  renderHud();
  save();
  toast(WORLDS[id].name, 'Welle ' + S.wave);
}

/** Share of the wave that is already dealt with, 0..100, for the progress bar. */
const waveProgress = () => Math.round((1 - (wave.queue.length + world.enemies.length) / Math.max(1, wave.total)) * 100);
