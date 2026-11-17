/*
 * Background music, synthesised live with the Web Audio API (no audio files).
 *
 *   'menu'  "Burghof": lute melody over a drone, D dorian, 16 bars in 3/4
 *   'game'  "Wachtposten": flute folk tune in 6/8 with frame drum and plucked bass
 *
 * A track is a list of bars; bar(i) returns that bar's notes as
 * [instrument, startBeat, midiNote, lengthInBeats, velocity]. The player
 * schedules one bar at a time slightly ahead of the audio clock, which keeps
 * the timing exact even when the game's frames stutter.
 */

const MUSIC_VOLUME = 0.42;
const MUSIC_LOOKAHEAD = 0.3;   // seconds of music scheduled in advance

const music = {
  bus: null,        // gain node all notes of the current piece go through; replaced to cut a piece off
  hall: null,       // reverb send of the current bus
  noise: null,      // shared white-noise buffer for drums and breath
  track: null,      // id of the piece that should play, or null
  bar: 0,
  nextBarTime: 0,
  timer: 0,
};

const midiHz = midi => 440 * Math.pow(2, (midi - 69) / 12);

/** New output chain: bus -> compressor -> speakers, plus a convolution hall. */
function buildMusicBus(ac) {
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  comp.connect(ac.destination);
  const bus = ac.createGain();
  bus.gain.value = 0;
  bus.gain.linearRampToValueAtTime(MUSIC_VOLUME, ac.currentTime + 1.2);   // fade in
  bus.connect(comp);
  // hall: exponentially decaying noise as impulse response
  const length = Math.floor(ac.sampleRate * 2.2), impulse = ac.createBuffer(2, length, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2);
  }
  const convolver = ac.createConvolver();
  convolver.buffer = impulse;
  const hall = ac.createGain();
  hall.gain.value = 0.3;
  hall.connect(convolver);
  convolver.connect(bus);
  music.bus = bus;
  music.hall = hall;
  if (!music.noise) {
    music.noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const data = music.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
}

/* ---------- Instruments: (ac, time, midi, seconds, velocity) ---------- */

/** Gain stage of one note, feeding the bus and (by `send`) the hall. */
function noteOut(ac, send) {
  const gain = ac.createGain();
  gain.gain.value = 0;
  gain.connect(music.bus);
  if (send) {
    const s = ac.createGain();
    s.gain.value = send;
    gain.connect(s);
    s.connect(music.hall);
  }
  return gain;
}
function tone(ac, type, freq, start, end, dest, detune = 0) {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  o.connect(dest);
  o.start(start);
  o.stop(end + 0.05);
  return o;
}
function lowpass(ac, freq, q = 0.7) {
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}
function noiseBurst(ac, start, end, dest) {
  const n = ac.createBufferSource();
  n.buffer = music.noise;
  n.loop = true;
  n.connect(dest);
  n.start(start);
  n.stop(end + 0.05);
}

const MUSIC_INSTRUMENTS = {
  /** Plucked lute: bright attack, the filter closes quickly, long decay. */
  lute(ac, t, m, dur, v) {
    const len = Math.min(Math.max(dur * 1.6, 0.5), 1.8), out = noteOut(ac, 0.35), f = lowpass(ac, 3200, 1.2);
    f.frequency.setValueAtTime(3200, t);
    f.frequency.exponentialRampToValueAtTime(700, t + 0.35);
    f.connect(out);
    tone(ac, 'triangle', midiHz(m), t, t + len, f);
    tone(ac, 'sawtooth', midiHz(m), t, t + len, f, 6);
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(v * 0.32, t + 0.006);
    out.gain.exponentialRampToValueAtTime(0.0008, t + len);
  },
  /** Soft sustained drone under the lute. */
  drone(ac, t, m, dur, v) {
    const out = noteOut(ac, 0.4), f = lowpass(ac, 520);
    f.connect(out);
    tone(ac, 'sawtooth', midiHz(m), t, t + dur + 0.6, f, -5);
    tone(ac, 'sawtooth', midiHz(m), t, t + dur + 0.6, f, 5);
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(v * 0.07, t + 0.5);
    out.gain.setValueAtTime(v * 0.07, t + dur);
    out.gain.linearRampToValueAtTime(0, t + dur + 0.6);
  },
  /** Flute: sine with a soft octave, vibrato and a little breath noise. */
  flute(ac, t, m, dur, v) {
    const end = t + dur, out = noteOut(ac, 0.4);
    const octave = ac.createGain();
    octave.gain.value = 0.12;
    octave.connect(out);
    const a = tone(ac, 'sine', midiHz(m), t, end + 0.1, out);
    const b = tone(ac, 'triangle', midiHz(m) * 2, t, end + 0.1, octave);
    const lfo = ac.createOscillator(), depth = ac.createGain();
    lfo.frequency.value = 5.6;
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(12, t + 0.3);
    lfo.connect(depth);
    depth.connect(a.detune);
    depth.connect(b.detune);
    lfo.start(t);
    lfo.stop(end + 0.1);
    const breath = ac.createGain(), band = ac.createBiquadFilter();
    breath.gain.value = 0.05;
    band.type = 'bandpass';
    band.frequency.value = midiHz(m) * 2;
    band.Q.value = 6;
    band.connect(breath);
    breath.connect(out);
    noiseBurst(ac, t, end, band);
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(v * 0.22, t + 0.045);
    out.gain.setValueAtTime(v * 0.2, end - 0.03);
    out.gain.linearRampToValueAtTime(0, end + 0.08);
  },
  /** Plucked bass. */
  bass(ac, t, m, dur, v) {
    const len = Math.min(dur, 0.9), out = noteOut(ac, 0.1), f = lowpass(ac, 800, 3);
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(220, t + len);
    f.connect(out);
    tone(ac, 'square', midiHz(m), t, t + len, f);
    tone(ac, 'triangle', midiHz(m), t, t + len, f);
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(v * 0.3, t + 0.008);
    out.gain.exponentialRampToValueAtTime(0.001, t + len);
  },
  /** Frame drum: falling sine plus a short thump of noise. */
  drum(ac, t, m, dur, v) {
    const out = noteOut(ac, 0.25), o = tone(ac, 'sine', midiHz(m) * 2.2, t, t + 0.5, out);
    o.frequency.setValueAtTime(midiHz(m) * 2.2, t);
    o.frequency.exponentialRampToValueAtTime(midiHz(m), t + 0.07);
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(v * 0.75, t + 0.004);
    out.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    const thump = noteOut(ac, 0.15), f = lowpass(ac, 1100);
    f.connect(thump);
    noiseBurst(ac, t, t + 0.06, f);
    thump.gain.setValueAtTime(v * 0.25, t);
    thump.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  },
  /** Tambourine tick. */
  tick(ac, t, m, dur, v) {
    const out = noteOut(ac, 0.1), f = ac.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 6500;
    f.connect(out);
    noiseBurst(ac, t, t + 0.06, f);
    out.gain.setValueAtTime(v * 0.3, t);
    out.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  },
};

/* ---------- The two pieces ---------- */

const MUSIC_CHORDS = { Dm: [50, 3], C: [48, 4], G: [43, 4], Am: [45, 3], F: [41, 4], D: [50, 4], Em: [52, 3] };
/** [[midi|null, beats], ...] -> note events of one instrument from beat 0 of the bar. */
function melodyLine(instrument, notes, velocity, transpose = 0) {
  const events = [];
  let beat = 0;
  for (const [midi, length] of notes) {
    if (midi !== null) events.push([instrument, beat, midi + transpose, length, velocity]);
    beat += length;
  }
  return events;
}
/** Chord root moved into octave 2 (MIDI 36..47), for bass and drone. */
const chordRootLow = name => 36 + ((MUSIC_CHORDS[name][0] - 36) % 12);

const MUSIC_TRACKS = {
  menu: {   // "Burghof"
    bpm: 72, beats: 3, bars: 16,
    melody: [
      [[69, 2], [67, 1]], [[65, 1], [64, 1], [62, 1]], [[64, 2], [65, 1]], [[67, 3]],
      [[69, 2], [72, 1]], [[71, 1], [69, 1], [67, 1]], [[69, 2], [65, 1]], [[64, 3]],
      [[74, 2], [72, 1]], [[69, 1], [67, 1], [69, 1]], [[65, 1], [67, 1], [64, 1]], [[62, 3]],
      [[65, 1], [67, 1], [69, 1]], [[72, 2], [69, 1]], [[67, 1], [65, 1], [64, 1]], [[62, 3]],
    ],
    chords: ['Dm', 'Dm', 'C', 'G', 'Am', 'G', 'F', 'Am', 'Dm', 'Am', 'C', 'Dm', 'F', 'Am', 'C', 'Dm'],
    bar(i) {
      const [root, third] = MUSIC_CHORDS[this.chords[i]];
      const events = melodyLine('lute', this.melody[i], 0.95);
      // arpeggio in eighths: root, fifth, octave, tenth, octave, fifth
      [0, 7, 12, 12 + third, 12, 7].forEach((step, k) => events.push(['lute', k * 0.5, root + step, 0.5, k === 0 ? 0.55 : 0.36]));
      if (i % 2 === 0) events.push(['drone', 0, 38, 6, 1], ['drone', 0, 45, 6, 0.8]);
      return events;
    },
  },
  game: {   // "Wachtposten"; a beat is an eighth note of the 6/8 bar
    bpm: 300, beats: 6, bars: 8,
    melody: [
      [[71, 2], [69, 1], [67, 2], [69, 1]], [[71, 1], [74, 1], [71, 1], [69, 2], [67, 1]],
      [[64, 2], [66, 1], [67, 2], [69, 1]], [[71, 3], [69, 3]],
      [[71, 2], [69, 1], [67, 2], [69, 1]], [[71, 1], [74, 1], [76, 1], [74, 2], [71, 1]],
      [[69, 1], [71, 1], [69, 1], [67, 2], [66, 1]], [[64, 3], [null, 3]],
    ],
    chords: ['Em', 'G', 'Em', 'D', 'Em', 'G', 'D', 'Em'],
    bar(i) {
      const events = melodyLine('flute', this.melody[i], 0.85, 12);
      const low = chordRootLow(this.chords[i]);
      events.push(['bass', 0, low, 2, 0.8], ['bass', 3, low + 7, 2, 0.6]);
      events.push(['drum', 0, 45, 1, 0.55], ['drum', 3, 45, 1, 0.38], ['tick', 2, 0, 0, 0.18], ['tick', 5, 0, 0, 0.18]);
      if (i % 4 === 0) events.push(['drone', 0, 40, 24, 0.7]);
      return events;
    },
  },
};

/* ---------- Player ---------- */

function scheduleMusic() {
  const ac = audioContext, track = MUSIC_TRACKS[music.track];
  if (!ac || !track) return;
  const secondsPerBeat = 60 / track.bpm;
  while (music.nextBarTime < ac.currentTime + MUSIC_LOOKAHEAD) {
    for (const [instrument, beat, midi, length, velocity] of track.bar(music.bar)) {
      MUSIC_INSTRUMENTS[instrument](ac, music.nextBarTime + beat * secondsPerBeat, midi, length * secondsPerBeat, velocity);
    }
    music.nextBarTime += track.beats * secondsPerBeat;
    music.bar = (music.bar + 1) % track.bars;
  }
}

/** Cuts the current piece off quickly; notes already queued die with their bus. */
function silenceMusic() {
  clearInterval(music.timer);
  const ac = audioContext, bus = music.bus;
  if (ac && bus) {
    bus.gain.cancelScheduledValues(ac.currentTime);
    bus.gain.setValueAtTime(bus.gain.value, ac.currentTime);
    bus.gain.linearRampToValueAtTime(0, ac.currentTime + 0.3);
    setTimeout(() => bus.disconnect(), 400);
  }
  music.bus = null;
}

/**
 * Plays piece `id` ('menu' or 'game') in a loop, or nothing for null.
 * Calling it with the piece that already plays does nothing.
 */
function playMusic(id) {
  const wanted = DB.opts.music && debugFlags.music ? id : null;
  if (wanted === music.track && (music.bus || !wanted)) return;
  silenceMusic();
  music.track = wanted;
  if (!wanted) return;
  const ac = getAudio();
  if (!ac) return;
  buildMusicBus(ac);
  music.bar = 0;
  music.nextBarTime = ac.currentTime + 0.15;
  scheduleMusic();
  music.timer = setInterval(scheduleMusic, 50);
}

/** The piece that belongs to the current screen. */
const musicForScreen = () => (slot < 0 ? 'menu' : 'game');

/*
 * Browsers only start audio after a user gesture, so the menu music begins
 * with the first tap. In the background (app minimised, tab hidden) the
 * audio clock is suspended so nothing plays.
 */
addEventListener('pointerdown', () => { if (!music.bus) playMusic(musicForScreen()); }, { capture: true });
document.addEventListener('visibilitychange', () => {
  if (!audioContext) return;
  if (document.hidden) audioContext.suspend();
  else audioContext.resume();
});
