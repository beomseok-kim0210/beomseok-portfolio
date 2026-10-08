const sharp = require('sharp'), path = require('path');
const directory = path.resolve('docs/design-references/immersive-portfolio/armi-v015-runtime');
(async () => {
 const left = await sharp(path.join(directory, 'Blender-approved.png')).resize(530,600).png().toBuffer();
 const right = await sharp(path.join(directory, 'browser-reference.png')).resize(530,600).png().toBuffer();
 const heading = Buffer.from('<svg width="1060" height="44"><rect width="1060" height="44" fill="#101b23"/><text x="14" y="28" fill="white" font-size="18" font-family="Arial">Approved Blender v015</text><text x="544" y="28" fill="white" font-size="18" font-family="Arial">Portfolio R3F / same hero + aspect</text></svg>');
 await sharp({create:{width:1060,height:644,channels:4,background:'#060b10'}}).composite([{input:left,left:0,top:44},{input:right,left:530,top:44},{input:heading,left:0,top:0}]).png().toFile(path.join(directory,'Blender-vs-browser.png'));
})();