/* make-icon.js – renders the app icon (the grown stego on a round meadow) from the game's own
 * drawing code into android/app/src/main/res/mipmap-(x)xhdpi/ic_launcher.png. Not a test; run it after
 * changing how the stego looks:  node stegi/tests/make-icon.js */
const fs = require('fs'), path = require('path');
const { chromium, openPage, loadClean } = require('./lib');
(async () => {
  const browser = await chromium.launch();
  const { page } = await openPage(browser);
  await loadClean(page);
  for (const [dir, size] of [['mipmap-xhdpi', 96], ['mipmap-xxxhdpi', 192]]) {
    const data = await page.evaluate(size => {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const x = c.getContext('2d'), s = size / 192;
      const g = x.createLinearGradient(0, 0, 0, size);
      g.addColorStop(0, '#8fd0ff'); g.addColorStop(0.62, '#cfeeff'); g.addColorStop(0.62, '#7ccb5c'); g.addColorStop(1, '#5aa83f');
      x.fillStyle = g; x.beginPath(); x.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); x.fill();
      x.save(); x.beginPath(); x.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); x.clip();
      __st.draw.stego(x, 92 * s, 150 * s, 205 * s, { g: 0.8, stage: 3, t: 0.3, eyes: 'open', mouth: 'smile' });
      x.restore();
      return c.toDataURL('image/png').split(',')[1];
    }, size);
    fs.writeFileSync(path.resolve(__dirname, '../android/app/src/main/res', dir, 'ic_launcher.png'), Buffer.from(data, 'base64'));
  }
  await browser.close();
  console.log('icons written');
})();
