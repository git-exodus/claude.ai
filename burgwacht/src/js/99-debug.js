/*
 * Hooks for the automated tests in ../tests (and for poking at the game from
 * the browser console). Nothing in the game itself uses window.__bw.
 */
window.__bw = {
  S, DB, VERSION,
  SHOP: SHOP_ITEMS.filter(offer => offer.prices).map(offer => ({ id: offer.id, t: offer.prices })),   // offers with fixed prices
  flags: debugFlags, switchWorld, WORLDS, lavaUnlocked,
  WALL: WALL_TIERS,
  startGame, showMenu,
  slot: () => slot,
  dmgOf: damageOf, cdOf: cooldownOf, need: xpNeeded, waveCount,
  hud: renderHud, save,
  gap: () => wave.spawnGap,
  pos: () => ({ cx, cy, W, H, U }),

  /** Snapshot of the runtime state. */
  state: () => ({
    t: session.time, shake: session.shake, castleFlash: castle.flash, combo: combo.count,
    hp: castle.hp, enemies: world.enemies.length, projs: world.projectiles.length,
    zones: world.zones.length, fx: world.effects.length,
    cd: combat.cooldown, atkCount: combat.attackCount, paused: session.paused,
    queue: wave.queue.length, soldiers: world.soldiers.length, pause: wave.pause,
  }),

  /** Simulates `seconds` of game time at 60 steps per second (stops when an overlay opens). */
  step(seconds) {
    for (let i = 0; i < seconds * 60 && !session.paused; i++) update(1 / 60);
  },
  ready() { combat.cooldown = 0; },
  hold(point) { session.holdPoint = point; },
  attack, aimLine,
  queue: () => wave.queue.slice(),
  bossFor, ENEMY_TYPES,
  knight: () => ({ ...knight }),
  music: () => ({ track: music.track, playing: !!music.bus, audio: audioContext ? audioContext.state : 'none' }),
  /** Colours of the pre-rendered ground at a few fixed points, to tell worlds apart without screenshots. */
  groundSample() {
    const g = ground.getContext('2d');
    return [[0.1, 0.3], [0.5, 0.2], [0.8, 0.6], [0.3, 0.85]]
      .map(([fx, fy]) => Array.from(g.getImageData(Math.round(fx * ground.width), Math.round(fy * ground.height), 1, 1).data).join(',')).join(' ');
  },
  spawn: spawnEnemy,
  setHp(n) { castle.hp = n; renderHud(); },
  ens: () => world.enemies,
  sols: () => world.soldiers,
  prj: () => world.projectiles.map(p => ({ k: p.kind })),
  /** Kills every enemy on the field and empties the spawn queue. */
  clear() {
    for (const e of world.enemies.slice()) hurt(e, 1e9, { weapon: 'sword' });
    wave.queue.length = 0;
  },
};
