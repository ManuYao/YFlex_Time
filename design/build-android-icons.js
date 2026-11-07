// Réduit les icônes saisonnières (design/icons/<variante>/) aux tailles réellement
// utiles sur Android : premier plan et fond adaptatifs à 432 px, repli 192 px pour
// les vieux Android (avant 8). Écrit design/android-icons/<variante>/{fg,bg,legacy}.png,
// lus par plugins/withSeasonIcons.js. Relancer après `node design/build-icons.js`.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SRC = path.join(__dirname, 'icons');
const OUT = path.join(__dirname, 'android-icons');

function load(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

// Moyenne par aire (alpha prémultiplié), bords fractionnaires pondérés.
function resize(img, T) {
  const S = img.width;
  const f = S / T;
  const out = new PNG({ width: T, height: T });
  for (let y = 0; y < T; y++) {
    const y0 = y * f, y1 = (y + 1) * f;
    for (let x = 0; x < T; x++) {
      const x0 = x * f, x1 = (x + 1) * f;
      let r = 0, g = 0, b = 0, a = 0, w = 0;
      for (let sy = Math.floor(y0); sy < Math.min(S, Math.ceil(y1)); sy++) {
        const wy = Math.min(sy + 1, y1) - Math.max(sy, y0);
        for (let sx = Math.floor(x0); sx < Math.min(S, Math.ceil(x1)); sx++) {
          const wx = Math.min(sx + 1, x1) - Math.max(sx, x0);
          const k = wx * wy;
          const i = (sy * S + sx) * 4;
          const al = img.data[i + 3] / 255;
          r += img.data[i] * al * k; g += img.data[i + 1] * al * k; b += img.data[i + 2] * al * k;
          a += al * k; w += k;
        }
      }
      const o = (y * T + x) * 4;
      const al = w ? a / w : 0;
      out.data[o] = al ? Math.round(r / w / al) : 0;
      out.data[o + 1] = al ? Math.round(g / w / al) : 0;
      out.data[o + 2] = al ? Math.round(b / w / al) : 0;
      out.data[o + 3] = Math.round(al * 255);
    }
  }
  return out;
}

const write = (img, file) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(img, { colorType: 6 }));
};

for (const v of fs.readdirSync(SRC)) {
  const dir = path.join(SRC, v);
  if (!fs.statSync(dir).isDirectory() || !fs.existsSync(path.join(dir, 'foreground-1024.png'))) continue;
  write(resize(load(path.join(dir, 'foreground-1024.png')), 432), path.join(OUT, v, 'fg.png'));
  write(resize(load(path.join(dir, 'background-1024.png')), 432), path.join(OUT, v, 'bg.png'));
  write(resize(load(path.join(dir, 'icon-1024.png')), 192), path.join(OUT, v, 'legacy.png'));
  console.log('ok', v);
}
