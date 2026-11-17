/*
 * Wave flow: building a wave, spawning it, clearing it, choosing a wave with
 * the arrows, and what happens after a defeat.
 */

/** Fills the spawn queue for the current wave S.wave. */
function buildWave() {
  const waveNo = S.wave;
  const count = waveCount(waveNo);
  wave.queue = [];
  for (let i = 0; i < count; i++) wave.queue.push(rollEnemyType(waveNo));
  if (waveNo % BOSS_EVERY === 0) wave.queue.splice(Math.floor(wave.queue.length / 2), 0, 'boss');   // boss arrives mid-wave
  wave.spawnGap = spawnGapFor(count);
  wave.spawnTimer = 0;
  wave.total = wave.queue.length;
}

/** Clears the field and starts the current wave over. `all` also removes the soldiers. */
function restartWave(all) {
  clearField(all);
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
      spawnEnemy(wave.queue.shift());
      wave.spawnTimer += wave.spawnGap;
    }
  } else if (!world.enemies.length) {
    completeWave();
  }
}

function completeWave() {
  const waveNo = S.wave;
  let gold = 0;
  if (waveNo > S.cleared) {     // gold only for waves cleared for the first time
    S.cleared = waveNo;
    gold = waveNo;
    S.gold += gold;
    sound(1200, 0.07, 'triangle', 0.05);
  }
  castle.hp = Math.min(MAX_HP, castle.hp + S.heal);
  if (!S.hold) S.wave++;
  save();
  wave.pause = 2.5;
  buildWave();
  renderHud();
  toast('Welle ' + waveNo + ' geschafft', gold ? '+' + gold + ' Gold' : '');
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
  session.shake = 0;        // otherwise the frozen screen would keep shaking behind the shop
  castle.flash = 0;
  combo.count = 0;
  sound(220, 0.5, 'sawtooth', 0.07, -160);
  vibrate(200);
  restartWave(true);
  openShop();
}

/** Leaving the shop after a defeat: back to wave 1 with full lives and a repaired wall. */
function continueAfterDefeat() {
  S.wave = 1;
  S.wallHp = wallMax();
  castle.hp = MAX_HP;
  combat.cooldown = 0;
  restartWave(true);
}

/** Share of the wave that is already dealt with, 0..100, for the progress bar. */
const waveProgress = () => Math.round((1 - (wave.queue.length + world.enemies.length) / Math.max(1, wave.total)) * 100);
