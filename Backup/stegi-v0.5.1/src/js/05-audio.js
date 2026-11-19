/* 05-audio.js – all sounds are synthesised live with WebAudio (no sound files, no speech).
 * Browsers and the Android WebView only allow sound after a touch: unlockAudio() runs on the
 * first touch. sound(name) plays one effect; music is in startMusic()/updateMusic(). */

let AC = null, master = null;
/** Short log of played sounds for the tests (name + time). */
const soundLog = [];

function getAudio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain();
      master.gain.value = 0.9;
      master.connect(AC.destination);
    } catch (e) { AC = null; }
  }
  return AC;
}

/** Called on every touch until the AudioContext runs. */
function unlockAudio() {
  const a = getAudio();
  if (a && a.state === 'suspended') a.resume();
}
['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach(ev =>
  window.addEventListener(ev, unlockAudio, { capture: true, passive: true }));

/** A tone: frequency f (to f2 if given) for dur seconds, starting `at` seconds from now. */
function tone(f, dur, { type = 'sine', vol = 0.2, f2 = 0, at = 0, attack = 0.01, vib = 0, out = master } = {}) {
  const a = AC, t0 = a.currentTime + at;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  if (vib) {   // vibrato: a slow oscillator wobbling the pitch
    const l = a.createOscillator(), lg = a.createGain();
    l.frequency.value = 7; lg.gain.value = vib;
    l.connect(lg); lg.connect(o.frequency); l.start(t0); l.stop(t0 + dur);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(out);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

let noiseBuf = null;
/** Filtered noise for dur seconds (splash, rumble, snore, crack ...). trem = tremolo speed in Hz. */
function noise(dur, { freq = 1000, q = 1, vol = 0.2, at = 0, type = 'bandpass', freq2 = 0, trem = 0, attack = 0.02 } = {}) {
  const a = AC, t0 = a.currentTime + at;
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = noiseBuf; s.loop = true;
  f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
  if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let out = g;
  if (trem) {  // tremolo: an extra gain stage wobbled by a slow oscillator
    const tg = a.createGain(), l = a.createOscillator(), lg = a.createGain();
    tg.gain.value = 0.5; l.frequency.value = trem; lg.gain.value = 0.5;
    l.connect(lg); lg.connect(tg.gain); l.start(t0); l.stop(t0 + dur);
    g.connect(tg); out = tg;
  }
  s.connect(f); f.connect(g); out.connect(master);
  s.start(t0); s.stop(t0 + dur + 0.05);
}

/** Every sound effect of the game. */
const SOUNDS = {
  // Content purring while being stroked.
  purr: () => { noise(0.9, { freq: 180, q: 2, vol: 0.35, type: 'lowpass', trem: 24 }); tone(55, 0.9, { vol: 0.08, type: 'triangle' }); },
  // "Hi-hi-hi" giggle.
  giggle: () => { [0, 0.11, 0.22, 0.33].forEach((at, i) => tone(820 + i * 70, 0.1, { at, vol: 0.13, f2: 1100 + i * 60, type: 'triangle' })); },
  // Big yawn.
  yawn: () => { tone(260, 1.3, { f2: 160, vol: 0.12, vib: 12, attack: 0.3, type: 'triangle' }); noise(1.2, { freq: 600, vol: 0.05, attack: 0.3 }); },
  // Snoring: breathing in (noise) and a soft whistle out.
  snore: () => { noise(1.0, { freq: 220, freq2: 320, q: 4, vol: 0.22, attack: 0.5, type: 'lowpass', trem: 30 }); tone(900, 0.5, { at: 1.1, f2: 650, vol: 0.03 }); },
  // Sad whining.
  whine: () => { tone(720, 0.55, { f2: 480, vol: 0.1, vib: 18, attack: 0.08 }); tone(680, 0.6, { at: 0.65, f2: 420, vol: 0.09, vib: 18, attack: 0.08 }); },
  // Hungry tummy rumbling.
  rumble: () => { noise(1.1, { freq: 110, q: 6, vol: 0.5, type: 'lowpass', trem: 9, attack: 0.15 }); tone(70, 1.0, { f2: 55, vol: 0.12, vib: 6, type: 'triangle', attack: 0.15 }); },
  // Chewing: three crunches.
  munch: () => { [0, 0.22, 0.44].forEach(at => noise(0.12, { at, freq: 1500, q: 1.5, vol: 0.28 })); },
  // Slurping water.
  slurp: () => { [0, 0.3, 0.6].forEach(at => noise(0.22, { at, freq: 500, freq2: 1600, q: 5, vol: 0.2 })); },
  // "Mm-mm", he does not want any more.
  refuse: () => { tone(240, 0.22, { vol: 0.12, type: 'triangle' }); tone(200, 0.3, { at: 0.28, vol: 0.12, type: 'triangle' }); },
  // Mumbling in his sleep.
  murmur: () => { tone(180, 0.6, { f2: 150, vol: 0.08, vib: 10, attack: 0.15, type: 'triangle' }); },
  // Splash in the bath / shower.
  splash: () => { noise(0.6, { freq: 1800, q: 0.7, vol: 0.25, freq2: 600 }); },
  // Soap bubble pop.
  pop: () => { tone(500 + Math.random() * 300, 0.07, { f2: 1200, vol: 0.08 }); },
  // Brushing teeth: scrub-scrub.
  scrub: () => { noise(0.15, { freq: 4000, q: 1, vol: 0.12 }); },
  // Sparkle when clean or brushed.
  sparkle: () => { [0, 0.07, 0.14, 0.21].forEach((at, i) => tone(1600 + i * 300, 0.25, { at, vol: 0.06 })); },
  // Poop gone.
  pling: () => { tone(1200, 0.25, { vol: 0.12 }); tone(1800, 0.35, { at: 0.08, vol: 0.1 }); },
  // Poop appears.
  plop: () => { tone(300, 0.15, { f2: 120, vol: 0.15, type: 'triangle' }); },
  // Ball bounce.
  boing: () => { tone(180, 0.25, { f2: 420, vol: 0.12, type: 'triangle' }); },
  // A little heart pling while stroking the egg.
  egg: () => { tone(880 + Math.random() * 200, 0.2, { vol: 0.06 }); },
  // Egg cracks.
  crack: () => { noise(0.08, { freq: 3500, q: 2, vol: 0.35 }); noise(0.12, { at: 0.1, freq: 2500, q: 2, vol: 0.3 }); tone(120, 0.15, { vol: 0.1, type: 'triangle' }); },
  // Peep from inside the egg.
  peep: () => { tone(1700, 0.12, { f2: 2200, vol: 0.09 }); tone(1800, 0.14, { at: 0.18, f2: 2300, vol: 0.09 }); },
  // Fanfare for hatching and growing up.
  fanfare: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, { at: i * 0.14, vol: 0.12, type: 'triangle' })); tone(1047, 0.8, { at: 0.56, vol: 0.1, type: 'triangle' }); },
  // Soft tap on a button.
  tap: () => { tone(660, 0.08, { vol: 0.06, type: 'triangle' }); },
  // 0.3: xylophone bar i (0..5) and drum i (0 = big boom, 1 = small tap) for the music game.
  xylo: i => { const f = midi([72, 74, 76, 79, 81, 84][i] || 72); tone(f, 0.9, { vol: 0.16 }); tone(f * 4, 0.25, { vol: 0.04 }); },
  drum: i => { if (i) { noise(0.12, { freq: 2500, q: 0.8, vol: 0.3 }); } else { tone(110, 0.35, { f2: 45, vol: 0.4, type: 'sine' }); noise(0.08, { freq: 300, vol: 0.2 }); } },
  // Camera click.
  shutter: () => { noise(0.05, { freq: 4000, q: 1, vol: 0.3 }); noise(0.07, { at: 0.08, freq: 3000, q: 1, vol: 0.25 }); },
  // Wrong hiding place: a soft "boing".
  nope: () => { tone(300, 0.2, { f2: 200, vol: 0.08, type: 'triangle' }); },
  // A visitor says hello.
  hello: () => { tone(660, 0.18, { vol: 0.1, type: 'triangle' }); tone(880, 0.25, { at: 0.2, vol: 0.1, type: 'triangle' }); },
  // Happy "hm!" when lying down / waking up.
  happy: () => { tone(500, 0.15, { f2: 700, vol: 0.1, type: 'triangle' }); tone(700, 0.2, { at: 0.15, f2: 900, vol: 0.1, type: 'triangle' }); },
};

/** Plays a sound effect if sound is on and allowed. arg is passed on (e.g. which xylophone bar). */
function sound(name, arg) {
  soundLog.push({ name, t: performance.now() });
  if (soundLog.length > 200) soundLog.shift();
  if (!S.opts.sound) return;
  const a = getAudio();
  if (!a || a.state !== 'running') return;
  try { SOUNDS[name](arg); } catch (e) { /* audio problems never stop the game */ }
}

/* ---------- Music: a gentle music-box tune, only by day ---------- */

const music = { on: false, next: 0, step: 0, gain: null };
/** 32 steps of melody (MIDI note numbers, 0 = rest) over a simple bass, C major pentatonic. */
const TUNE = [72, 0, 76, 79, 76, 0, 74, 72, 74, 0, 76, 74, 72, 0, 67, 0,
              69, 0, 72, 74, 76, 0, 79, 76, 74, 72, 74, 0, 72, 0, 0, 0];
const BASS = [48, 55, 52, 55, 43, 50, 47, 50];
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

/** Turns the music on/off depending on settings, screen and night. Called every frame. */
function updateMusic(wanted) {
  const a = AC;
  const want = wanted && S.opts.music && debugFlags.music && a && a.state === 'running';
  if (want && !music.on) {
    music.on = true;
    music.gain = a.createGain(); music.gain.gain.value = 0.0001; music.gain.connect(master);
    music.gain.gain.exponentialRampToValueAtTime(0.5, a.currentTime + 1.5);
    music.next = a.currentTime + 0.2;
  } else if (!want && music.on) {
    music.on = false;
    if (a) { const g = music.gain; g.gain.setTargetAtTime(0.0001, a.currentTime, 0.3); setTimeout(() => g.disconnect(), 2000); }
  }
  if (!music.on) return;
  // Schedule the next notes up to 0.5 s ahead.
  const beat = 0.32;
  while (music.next < a.currentTime + 0.5) {
    const at = music.next - a.currentTime, i = music.step % TUNE.length;
    if (TUNE[i]) tone(midi(TUNE[i]), 0.9, { at, vol: 0.05, type: 'sine', out: music.gain });
    if (i % 4 === 0) tone(midi(BASS[(i / 4) % BASS.length]), 1.2, { at, vol: 0.04, type: 'triangle', out: music.gain });
    music.next += beat;
    music.step++;
  }
}
