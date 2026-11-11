// Fabrique les « bandes-son de comptage » de la pyramide : pour chaque voix et
// chaque niveau de lenteur (SERIES_LEVELS), UN MP3 « 1, 2, 3… SERIES_MAX_N » dont le
// chiffre k démarre à (k-1) × pas. Toute série commence à 1 : l'app lance le fichier
// du début et l'arrête après le dernier chiffre de la série (voir lib/gamePyramid.js,
// « Une bande-son par série », et lib/gameVoice.js, `playSeries`).
//
//   node scripts/voice-pack/build-count-series.mjs
//
// 6 fichiers seulement : une mise à jour à distance est limitée à 1 000 fichiers et
// l'app en utilise déjà ~940 (un fichier par longueur de série en aurait fait 90).
//
// AUCUNE voix n'est régénérée (pas d'appel à Azure) : on colle les clips
// `count_1…count_N` existants, séparés par du silence (trames MP3 vides). Même
// technique que pad-short-clips.mjs : clips MPEG-2 couche III, mono, 24 kHz,
// 48 kbit/s = trames de 144 octets / 24 ms, dont la 1re ne s'appuie sur aucune trame
// précédente (donc on peut les recoller).
//
// À relancer si les clips count_* ou les constantes de la pyramide changent. Écrit
// aussi lib/voiceSeriesIndex.js (Metro ne prend que des require() en toutes lettres).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const VOICES_DIR = path.join(ROOT, 'assets', 'voices');
const INDEX_FILE = path.join(ROOT, 'lib', 'voiceSeriesIndex.js');
const FRAME_BYTES = 144;
const FRAME_MS = 24;
const GENDERS = ['female', 'male'];

const pyramid = await import(pathToFileURL(path.join(ROOT, 'lib', 'gamePyramid.js')).href);
const { SERIES_LEVELS, SERIES_MAX_N, PYRAMID_REP_MS, seriesStepMs } = pyramid;

const readBits = (buf, bitPos, n) => {
  let v = 0;
  for (let i = 0; i < n; i++) v = (v << 1) | ((buf[(bitPos + i) >> 3] >> (7 - ((bitPos + i) & 7))) & 1);
  return v;
};

const splitFrames = (buf, label) => {
  if (buf.length % FRAME_BYTES !== 0) throw new Error(`${label} : taille inattendue`);
  const frames = [];
  for (let pos = 0; pos < buf.length; pos += FRAME_BYTES) {
    if (buf[pos] !== 0xff || buf[pos + 1] !== 0xf3) throw new Error(`${label} : trame inattendue à ${pos}`);
    frames.push(Buffer.from(buf.subarray(pos, pos + FRAME_BYTES)));
  }
  if (readBits(frames[0], 32, 8) !== 0) throw new Error(`${label} : la 1re trame emprunte des données`);
  return frames;
};

const index = {};
let files = 0;
let bytes = 0;

for (const gender of GENDERS) {
  const clips = {};
  for (let k = 1; k <= SERIES_MAX_N; k++) {
    const file = path.join(VOICES_DIR, gender, `count_${k}.mp3`);
    clips[k] = splitFrames(fs.readFileSync(file), `${gender}/count_${k}`);
  }
  const header = clips[1][0];
  const silent = () => {
    const f = Buffer.alloc(FRAME_BYTES);
    header.copy(f, 0, 0, 4);
    return f;
  };
  const outDir = path.join(VOICES_DIR, gender, 'series');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  index[gender] = {};

  for (let level = 0; level < SERIES_LEVELS; level++) {
    const stepFrames = seriesStepMs(PYRAMID_REP_MS, level) / FRAME_MS;
    const frames = [];
    for (let k = 1; k <= SERIES_MAX_N; k++) {
      const start = Math.round((k - 1) * stepFrames);
      while (frames.length < start) frames.push(silent());
      if (frames.length > start) throw new Error(`${gender} niveau ${level} k=${k} : le clip déborde sur le suivant`);
      frames.push(...clips[k]);
    }
    const out = Buffer.concat(frames);
    const key = `series_${level}`;
    fs.writeFileSync(path.join(outDir, `${key}.mp3`), out);
    index[gender][key] = `../assets/voices/${gender}/series/${key}.mp3`;
    files += 1;
    bytes += out.length;
  }
}

const lines = [
  '// FICHIER GÉNÉRÉ par scripts/voice-pack/build-count-series.mjs — ne pas modifier à la main.',
  '// Comptage « 1, 2, 3… » du jeu La pyramide : un fichier par niveau de lenteur (series_<niveau>).',
  'export const VOICE_SERIES = {',
];
for (const gender of GENDERS) {
  lines.push(`  ${gender}: {`);
  for (const [key, rel] of Object.entries(index[gender])) lines.push(`    ${key}: require('${rel}'),`);
  lines.push('  },');
}
lines.push('};', '');
fs.writeFileSync(INDEX_FILE, lines.join('\n'));
console.log(`${files} fichiers (${(bytes / 1024 / 1024).toFixed(2)} Mo) + ${path.relative(ROOT, INDEX_FILE)}`);
