// Fabrique les MP3 de la voix humaine du coach avec Azure AI Speech.
//
//   node scripts/voice-pack/generate.mjs --list          (compte, aucun envoi)
//   node scripts/voice-pack/generate.mjs --test          (3 clips seulement)
//   node scripts/voice-pack/generate.mjs                 (tout, reprend où ça s'est arrêté)
//   node scripts/voice-pack/generate.mjs --index-only    (réécrit lib/voiceClipsIndex.js)
//   node scripts/voice-pack/generate.mjs --voice=female  (une seule voix)
//
// La clé Azure est lue dans les variables d'environnement AZURE_SPEECH_KEY et
// AZURE_SPEECH_REGION (ou dans le fichier E:/ftb/azure-key.txt, HORS du projet et jamais sur C:, deux
// lignes : la clé puis la région). Elle n'est JAMAIS écrite
// dans l'app : les MP3 sont fabriqués ici, sur le PC, puis embarqués.
//
// Les fichiers déjà fabriqués ne sont pas refaits (supprime-les pour les refaire).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.join(ROOT, 'assets', 'voices');
const INDEX_FILE = path.join(ROOT, 'lib', 'voiceClipsIndex.js');

// Voix neuronales françaises (palier gratuit : 500 000 caractères par mois).
const VOICES = {
  female: { name: 'fr-FR-DeniseNeural', rate: '+6%' },
  male: { name: 'fr-FR-HenriNeural', rate: '+6%' },
};
const FORMAT = 'audio-24khz-48kbitrate-mono-mp3';

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const onlyVoice = (args.find((a) => a.startsWith('--voice=')) || '').split('=')[1];

// Node lit les .js du projet comme du CommonJS : on en fait une copie ESM
// temporaire pour pouvoir importer le vocabulaire partagé avec l'app.
const loadLexicon = async () => {
  const tmp = fs.mkdtempSync(path.join('E:/ftb/tmp', 'ft-lexicon-'));
  fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}');
  for (const f of ['voiceLexicon.js', 'voiceTexts.js']) {
    fs.copyFileSync(path.join(ROOT, 'lib', f), path.join(tmp, f));
  }
  return import(pathToFileURL(path.join(tmp, 'voiceLexicon.js')).href);
};

const readCredentials = () => {
  let key = process.env.AZURE_SPEECH_KEY;
  let region = process.env.AZURE_SPEECH_REGION;
  const file = process.env.FT_AZURE_KEY_FILE || 'E:/ftb/azure-key.txt';
  if ((!key || !region) && fs.existsSync(file)) {
    const [k, r] = fs.readFileSync(file, 'utf8').split(/\r?\n/).map((s) => s.trim());
    key = key || k;
    region = region || r;
  }
  return { key, region };
};

const xmlEscape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const synthesize = async ({ key, region }, voice, text) => {
  const ssml =
    `<speak version="1.0" xml:lang="fr-FR" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts">` +
    // Pas de silence au début ni à la fin : les clips s'enchaînent sans trou.
    `<voice name="${voice.name}"><mstts:silence type="Leading-exact" value="0ms"/><mstts:silence type="Tailing-exact" value="0ms"/>` +
    `<prosody rate="${voice.rate}">${xmlEscape(text)}</prosody></voice></speak>`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': FORMAT,
        'User-Agent': 'flex-timer-voice-pack',
      },
      body: ssml,
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status === 429 || res.status >= 500) {
      const wait = (Number(res.headers.get('retry-after')) || 5 * (attempt + 1)) * 1000;
      console.log(`  … attente ${Math.round(wait / 1000)} s (HTTP ${res.status})`);
      await sleep(wait);
      continue;
    }
    throw new Error(`HTTP ${res.status} : ${(await res.text()).slice(0, 200)}`);
  }
  throw new Error('Trop de refus consécutifs, relance le script plus tard.');
};

// Réécrit lib/voiceClipsIndex.js avec les MP3 réellement présents. Metro
// n'accepte que des require() écrits en toutes lettres, d'où ce fichier généré.
const writeIndex = () => {
  const lines = [
    '// FICHIER GÉNÉRÉ par scripts/voice-pack/generate.mjs — ne pas modifier à la main.',
    '// Un morceau absent de cette liste est simplement dit par la voix du téléphone.',
    'export const VOICE_CLIPS = {',
  ];
  let total = 0;
  for (const gender of Object.keys(VOICES)) {
    const dir = path.join(OUT_DIR, gender);
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.mp3')).sort() : [];
    lines.push(`  ${gender}: {`);
    files.forEach((f) => lines.push(`    ${f.slice(0, -4)}: require('../assets/voices/${gender}/${f}'),`));
    lines.push('  },');
    total += files.length;
  }
  lines.push('};', '');
  fs.writeFileSync(INDEX_FILE, lines.join('\n'));
  console.log(`Index écrit : ${total} clips (${path.relative(ROOT, INDEX_FILE)}).`);
};

const main = async () => {
  if (flag('--index-only')) return writeIndex();

  const { allClips } = await loadLexicon();
  let clips = allClips();
  const genders = Object.keys(VOICES).filter((g) => !onlyVoice || g === onlyVoice);
  const chars = clips.reduce((n, c) => n + c.text.length, 0);

  if (flag('--list')) {
    console.log(`${clips.length} clips par voix, ${chars} caractères par voix.`);
    console.log(`Pour ${genders.length} voix : ${chars * genders.length} caractères (palier gratuit : 500 000 par mois).`);
    return;
  }

  const creds = readCredentials();
  if (!creds.key || !creds.region) {
    console.error('Clé Azure introuvable : AZURE_SPEECH_KEY et AZURE_SPEECH_REGION (ou E:/ftb/azure-key.txt).');
    process.exit(1);
  }
  if (flag('--test')) {
    const pick = ['tour_3', 'sur_8', 'sec_30'];
    clips = clips.filter((c) => pick.includes(c.key));
  }

  // Le palier gratuit limite le débit (~20 requêtes par minute) : on reste en dessous.
  const GAP_MS = 3200;
  for (const gender of genders) {
    const dir = path.join(OUT_DIR, gender);
    fs.mkdirSync(dir, { recursive: true });
    let done = 0;
    for (const clip of clips) {
      const file = path.join(dir, `${clip.key}.mp3`);
      done += 1;
      if (fs.existsSync(file)) continue;
      process.stdout.write(`[${gender} ${done}/${clips.length}] ${clip.text}\n`);
      fs.writeFileSync(file, await synthesize(creds, VOICES[gender], clip.text));
      await sleep(GAP_MS);
    }
  }
  fs.writeFileSync(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify(Object.fromEntries(allClips().map((c) => [c.key, c.text])), null, 1),
  );
  writeIndex();
};

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
