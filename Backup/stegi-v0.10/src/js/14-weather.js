/* 14-weather.js – today's weather (0.3): one per calendar day, chosen from the day number so it
 * stays the same all day and after a restart. Places change it: dry places stay sunny, cold places
 * get snow instead of rain, the cave has none. Rain turns into a rainbow after RAINBOW_FROM.
 * Weather values: 'sun' | 'clouds' | 'rain' | 'snow' | 'rainbow'. */

/** Weather at time t for a place. game.weatherTest (tests only) overrides the day's weather. */
function weatherAt(t, placeId) {
  const d = dayIndex(t), month = new Date(t).getMonth();
  let w = game.weatherTest;
  if (!w) {
    const r = mulberry(d * 7919 + 13)();
    w = r < WEATHER_SHARES.sun ? 'sun' : r < WEATHER_SHARES.sun + WEATHER_SHARES.clouds ? 'clouds' : 'rain';
    if (w === 'rain' && (month === 11 || month <= 1)) w = 'snow';   // December to February
  }
  const pl = placeById(placeId);
  if (pl.indoor) return 'sun';
  if (pl.dry && (w === 'rain' || w === 'snow')) return 'sun';
  if (pl.cold && w === 'rain') w = 'snow';
  if (w === 'rain' && minuteOfDay(t) >= RAINBOW_FROM) w = 'rainbow';
  return w;
}

/** Weather where he is right now (on the way: like the meadow). */
function currentWeather() {
  const id = !hatched() || S.walk ? 'meadow' : S.place;
  return weatherAt(now(), id);
}

/** Rain or snow falling over the whole picture (drawn after the place, before the night shade). */
function drawWeather(c, w, time) {
  if (w === 'rain') {
    c.strokeStyle = 'rgba(200,225,255,0.65)'; c.lineWidth = 1.6 * U; c.lineCap = 'round';
    c.beginPath();
    const r = mulberry(5);
    for (let i = 0; i < 70; i++) {
      const x0 = r() * (W + 60 * U), sp = (500 + r() * 200) * U, ph = r() * 10;
      const y = ((time * sp + ph * H) % (H + 40 * U)) - 20 * U, x = x0 - (y / H) * 60 * U;
      c.moveTo(x, y); c.lineTo(x - 4 * U, y + 14 * U);
    }
    c.stroke();
  } else if (w === 'snow') {
    const r = mulberry(6);
    c.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 60; i++) {
      const x0 = r() * W, sp = (25 + r() * 35) * U, ph = r() * 10, s = (1.5 + r() * 2.5) * U;
      const y = ((time * sp + ph * H) % (H + 20 * U)) - 10 * U, x = x0 + Math.sin(time + ph * 3) * 14 * U;
      c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill();
    }
  }
}
