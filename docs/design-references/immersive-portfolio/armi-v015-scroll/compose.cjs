const sharp = require('sharp');
const path = require('path');
const keys = ['product', 'enter', 'routing', 'core', 'route', 'text', 'memory', 'tavily', 'robot', 'response', 'structured', 'returned'];
(async () => {
  const tiles = await Promise.all(keys.map(async (key, i) => ({
    input: await sharp(path.join(__dirname, `home-${key}.jpg`)).resize(480, 300).toBuffer(),
    left: i % 3 * 480, top: Math.floor(i / 3) * 330 + 30,
  })));
  const labels = Buffer.from(`<svg width="1440" height="1320">${keys.map((k, i) => `<text x="${i % 3 * 480 + 12}" y="${Math.floor(i / 3) * 330 + 22}" fill="#d5e0e7" font-size="17" font-family="Arial">${k.toUpperCase()}</text>`).join('')}</svg>`);
  await sharp({ create: { width: 1440, height: 1320, channels: 3, background: '#060b10' } }).composite([...tiles, { input: labels }]).png().toFile(path.join(__dirname, 'home-contact-sheet.png'));
})();
