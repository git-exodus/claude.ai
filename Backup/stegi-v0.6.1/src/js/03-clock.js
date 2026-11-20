/* 03-clock.js – real time: day numbers, night, sleepiness and the light of the sky.
 * Everything uses now(), never Date.now() directly, so the tests can "time travel"
 * by changing clock.offset (see 99-debug.js). */

/** offset = test time travel in ms; tests may preset it before loading with window.__stOffset. */
const clock = { offset: window.__stOffset || 0 };
const now = () => Date.now() + clock.offset;

/** Calendar day number of a timestamp in local time (days since 1970-01-01). Changes at midnight. */
function dayIndex(t) {
  const d = new Date(t);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
}

/** Minutes after local midnight, with fractions (0 .. 1440). */
function minuteOfDay(t) {
  const d = new Date(t);
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60 + d.getMilliseconds() / 60000;
}

/** Minutes from a to b going forward around the clock (0 .. 1440). */
const minutesUntil = (a, b) => ((b - a) % 1440 + 1440) % 1440;
/** true if minute m lies in [from, to), also when the window wraps past midnight. */
const inWindow = (m, from, to) => minutesUntil(from, m) < minutesUntil(from, to);

/** Night = between bedtime and wake-up time (parents' settings, default 20:00 – 7:00). */
function isNight(t) { return inWindow(minuteOfDay(t), S.opts.sleep, S.opts.wake); }

/** The last SLEEPY_BEFORE minutes before bedtime: he yawns and can be put to bed early. */
function isSleepy(t) { return inWindow(minuteOfDay(t), (S.opts.sleep - SLEEPY_BEFORE + 1440) % 1440, S.opts.sleep); }

/** Is he asleep at time t? At night always; in the sleepy time only after "lights out" (S.bedAt). */
function isAsleep(t) {
  if (isNight(t)) return true;
  return S.bedAt > 0 && t >= S.bedAt && t - S.bedAt < SLEEPY_BEFORE * 60000 && isSleepy(t);
}

/** Seconds between a and b that are NOT night. Needs only drop during these.
 *  Long gaps (app closed) are walked in one-minute steps, at most 60 days. */
function awakeSeconds(a, b) {
  if (b <= a) return 0;
  if (b - a <= 60000) return isNight((a + b) / 2) ? 0 : (b - a) / 1000;
  let sum = 0;
  const end = Math.min(b, a + 60 * 864e5);
  for (let t = a; t < end; t += 60000) {
    const step = Math.min(60000, end - t);
    if (!isNight(t + step / 2)) sum += step / 1000;
  }
  return sum;
}

/**
 * Light of the sky at time t:
 *   light 0 (deep night) .. 1 (full day)
 *   warm  0 .. 1, orange glow around sunrise and sunset
 *   sun   0 .. 1 position of the sun between wake-up and bedtime (or of the moon at night)
 *   night true between bedtime and wake-up
 * Sunrise starts 30 minutes before wake-up, the evening glow 90 minutes before bedtime.
 */
function skyAt(t) {
  const m = minuteOfDay(t), sleep = S.opts.sleep, wake = S.opts.wake;
  const night = inWindow(m, sleep, wake);
  if (night) {
    const sinceSleep = minutesUntil(sleep, m), toWake = minutesUntil(m, wake);
    const dusk = 1 - smooth(sinceSleep / 40), dawn = 1 - smooth(toWake / 30);
    const len = minutesUntil(sleep, wake);
    return { light: Math.max(dusk * 0.35, dawn * 0.45), warm: Math.max(dusk, dawn) * 0.8, sun: sinceSleep / len, night };
  }
  const sinceWake = minutesUntil(wake, m), toSleep = minutesUntil(m, sleep);
  const len = minutesUntil(wake, sleep);
  const light = Math.min(lerp(0.45, 1, smooth(sinceWake / 60)), lerp(0.35, 1, smooth(toSleep / 90)));
  const warm = Math.max(1 - smooth(sinceWake / 90), 1 - smooth(toSleep / 100));
  return { light, warm, sun: sinceWake / len, night };
}
