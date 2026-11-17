/*
 * Sound and vibration. Sounds are short synthesised tones (no audio files),
 * so the game stays a single small file.
 */

let audioContext = null;   // created lazily: browsers only allow audio after a user gesture

/** The shared AudioContext for sounds and music, or null if the device has none. */
function getAudio() {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
  } catch (e) {
    return null;
  }
}

/**
 * Plays one tone.
 *   freq   start frequency in Hz
 *   dur    length in seconds
 *   type   oscillator shape: 'square' | 'triangle' | 'sawtooth'
 *   volume 0..1
 *   slide  Hz added to the frequency over the duration (negative = falling)
 */
function sound(freq, dur = 0.08, type = 'square', volume = 0.05, slide = 0) {
  if (DB.opts.mute) return;
  const audioContext = getAudio();
  if (!audioContext) return;
  try {
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), now + dur);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  } catch (e) { /* no audio available: stay silent */ }
}

/** Vibrates the phone; only after the first attack, because it needs a user gesture too. */
function vibrate(ms) {
  if (!DB.opts.vib || !session.started || !navigator.vibrate) return;
  try { navigator.vibrate(ms); } catch (e) { /* not supported */ }
}

/* Attack sound per weapon: [freq, dur, type, volume, slide]. */
const ATTACK_SOUNDS = {
  sword: [520, 0.1, 'triangle', 0.05, -260],
  dagger: [900, 0.05, 'square', 0.03, 200],
  star: [130, 0.2, 'sawtooth', 0.07, -70],
  bow: [700, 0.07, 'triangle', 0.05, -350],
  wand: [260, 0.16, 'sawtooth', 0.05, 240],
};
