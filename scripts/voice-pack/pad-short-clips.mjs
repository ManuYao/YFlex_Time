// Rallonge les clips de voix trop courts pour être entendus : aujourd'hui
// seulement « 1 » (count_1), dont le mot ne dure que 90 à 160 ms, collé au tout
// début d'un clip de 190 à 260 ms, et qui n'a aucune consonne pour « accrocher »
// l'oreille. Les autres chiffres font tous 310 ms et plus.
//
// On colle du SILENCE avant et après (trames MP3 vides) et, pour la voix homme
// dont le « 1 » est le plus faible du pack, on monte un peu le volume (le
// global_gain de chaque trame, 2 crans = +3 dB). Aucune voix n'est régénérée :
// pas d'appel à Azure, le mot lui-même n'est pas touché.
//
//   node scripts/voice-pack/pad-short-clips.mjs
//
// À relancer après un `generate.mjs` qui refabriquerait count_1. Sans danger si
// on le relance deux fois : un clip déjà rallongé est laissé tel quel.
//
// Format des clips (voir generate.mjs) : MPEG-2 couche III, mono, 24 kHz,
// 48 kbit/s → trames de 144 octets, 24 ms chacune, sans CRC ni remplissage.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets', 'voices');
const FRAME_BYTES = 144;
const FRAME_MS = 24;
const ALREADY_LONG_MS = 400; // au-delà, le clip est laissé tel quel

// Quoi rallonger : silence avant (`lead`) et après (`tail`) en trames de 24 ms,
// `gain` en crans de global_gain (4 crans = +6 dB).
const JOBS = [
  { file: 'female/count_1.mp3', lead: 8, tail: 4, gain: 0 },
  { file: 'male/count_1.mp3', lead: 8, tail: 4, gain: 2 },
];

const readBits = (buf, bitPos, n) => {
  let v = 0;
  for (let i = 0; i < n; i++) v = (v << 1) | ((buf[(bitPos + i) >> 3] >> (7 - ((bitPos + i) & 7))) & 1);
  return v;
};

const writeBits = (buf, bitPos, n, value) => {
  for (let i = 0; i < n; i++) {
    const bit = (value >> (n - 1 - i)) & 1;
    const byte = (bitPos + i) >> 3;
    const shift = 7 - ((bitPos + i) & 7);
    buf[byte] = (buf[byte] & ~(1 << shift)) | (bit << shift);
  }
};

// Vérifie que le fichier est bien celui qu'on sait modifier, et le découpe en trames.
const splitFrames = (buf) => {
  if (buf.length % FRAME_BYTES !== 0) throw new Error('taille inattendue (pas un multiple de 144 octets)');
  const frames = [];
  for (let pos = 0; pos < buf.length; pos += FRAME_BYTES) {
    // 0xFF 0xF3 = synchro + MPEG-2, couche III, SANS CRC
    if (buf[pos] !== 0xff || buf[pos + 1] !== 0xf3) throw new Error(`trame inattendue à l'octet ${pos}`);
    frames.push(Buffer.from(buf.subarray(pos, pos + FRAME_BYTES)));
  }
  // Le premier mot ne doit rien emprunter à une trame précédente (main_data_begin = 0).
  if (readBits(frames[0], 32, 8) !== 0) throw new Error('la 1re trame emprunte des données à une trame précédente');
  return frames;
};

const silentFrame = (header) => {
  const f = Buffer.alloc(FRAME_BYTES); // tout à zéro = silence
  header.copy(f, 0, 0, 4);
  return f;
};

for (const job of JOBS) {
  const file = path.join(ROOT, job.file);
  const original = fs.readFileSync(file);
  const frames = splitFrames(original);
  const ms = frames.length * FRAME_MS;
  if (ms >= ALREADY_LONG_MS) {
    console.log(`${job.file} : déjà ${ms} ms, rien à faire`);
    continue;
  }
  if (job.gain) {
    for (const f of frames) {
      // global_gain : 8 bits, juste après main_data_begin (8) + bit privé (1) + part2_3_length (12) + big_values (9).
      const at = 32 + 30;
      writeBits(f, at, 8, Math.min(255, readBits(f, at, 8) + job.gain));
    }
  }
  const header = frames[0];
  const out = Buffer.concat([
    ...Array.from({ length: job.lead }, () => silentFrame(header)),
    ...frames,
    ...Array.from({ length: job.tail }, () => silentFrame(header)),
  ]);
  fs.writeFileSync(file, out);
  console.log(`${job.file} : ${ms} ms → ${out.length / FRAME_BYTES * FRAME_MS} ms (${original.length} → ${out.length} octets)`);
}
