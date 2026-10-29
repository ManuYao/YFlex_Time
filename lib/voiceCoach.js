import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { decideCues, voiceSnapshot } from './voiceCues';
import { VOICE_CLIPS } from './voiceClipsIndex';
import { textToClips } from './voiceLexicon';
import { conciseText, motivatingText, pickText, resetVoiceMemory, setVoiceDetail } from './voiceTexts';

// ─────────────────────────────────────────────────────────────────────────
//  RÉGLAGE DE LA VOIX — c'est ICI qu'on la rend plus grave, plus aiguë,
//  plus rapide ou plus lente. (Les phrases, elles, sont dans
//  lib/voiceTexts.js.)
// ─────────────────────────────────────────────────────────────────────────
//  pitch (hauteur) : 1 = voix normale du téléphone.
//    plus petit = plus grave (en dessous de ~0.55 ça devient robotique)
//    plus grand = plus aigu  (au-dessus de ~1.3 ça devient dessin animé)
//  rate (vitesse) : 1 = vitesse normale.
//    1.1 = un peu plus rapide, plus dynamique ; au-delà de ~1.25 on
//    commence à perdre des syllabes.
//  La voix homme est une VRAIE voix masculine du téléphone : on la laisse
//  à sa hauteur naturelle (1). Même 0.95 la rendait robotique — la moindre
//  retouche de hauteur dégrade une voix de synthèse.
const VOICE_TUNING = {
  male: { pitch: 1.0, rate: 1.05 },
  female: { pitch: 1.1, rate: 1.12 },
};

// Coach vocal : synthèse vocale (expo-speech), pas de fichiers audio.
// Module natif → ne peut pas arriver par OTA seule, un nouvel APK est
// nécessaire pour que les testeurs l'entendent réellement.
//
// Réglage vivant ici comme lib/sounds.js (module-level), tenu à jour par
// SettingsContext : les écrans n'ont pas à connaître ce détail.
let enabled = false;

let gender = 'female';

// Android : expo-speech fait `Locale(language)`, qui ne comprend que le code
// de langue seul (« fr ») — « fr-FR » donnait une langue inconnue et
// retombait sur la langue du téléphone. iOS, lui, attend « fr-FR ».
const LANGUAGE = Platform.OS === 'ios' ? 'fr-FR' : 'fr';

// ─── Trouver une vraie voix d'homme sur le téléphone ──────────────────────
// La voix femme = la voix française par défaut du téléphone (aucun choix à
// faire). Pour l'homme, on cherche parmi les voix installées. Le genre n'est
// pas une donnée fournie par Android, on le reconnaît au nom de la voix :
//  - moteur Google : fr-fr-x-frb-… et fr-fr-x-frd-… sont les voix masculines
//    (fra / frc / vlf sont féminines) — même découpage que les voix
//    Standard A-E de Google Cloud (B et D masculines) ;
//  - anciennes versions du moteur Google : « …#male_1-local » dans le nom ;
//  - iOS : « Thomas ».
// Aucune voix reconnue ⇒ pas d'option Homme dans les Paramètres, décision
// utilisateur : « s'il n'y a pas le moyen, autant l'enlever ».
const MALE_HINTS = [/#male/i, /-x-fr[bd]-/i, /thomas/i];
let maleVoiceId = null;
let voicesScanned = false;

const isMaleVoice = (v) => {
  const id = `${v.identifier || ''} ${v.name || ''}`;
  return !/female/i.test(id) && MALE_HINTS.some((re) => re.test(id));
};

// Renvoie { male: bool }. Relancée tant que la liste revient vide : le
// moteur TTS peut ne pas être prêt au tout premier appel.
export const detectVoices = async () => {
  // Voix humaine d'homme fabriquée : l'option Homme existe toujours, même si
  // le téléphone n'a pas de voix masculine.
  if (hasPack('male')) return { male: true };
  if (voicesScanned) return { male: !!maleVoiceId };
  let voices = [];
  for (let attempt = 0; attempt < 3 && !voices.length; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 700));
    try { voices = await Speech.getAvailableVoicesAsync(); } catch { voices = []; }
  }
  if (!voices.length) return { male: false };
  const french = voices.filter((v) => /^fr/i.test(v.language || ''));
  const males = french.filter(isMaleVoice);
  // France avant Canada, puis qualité « Enhanced » (moins robotique), puis
  // voix installée (« local ») avant voix en ligne (« network »), qui ne
  // marche pas sans internet à la salle.
  const score = (v) =>
    (/^fr[-_]fr/i.test(v.language) ? 4 : 0) +
    (v.quality === 'Enhanced' ? 2 : 0) +
    (/local/i.test(v.identifier) ? 1 : 0);
  males.sort((a, b) => score(b) - score(a));
  maleVoiceId = males[0]?.identifier ?? null;
  voicesScanned = true;
  return { male: !!maleVoiceId };
};

const speakOptions = (g) => {
  const useMale = g === 'male' && !!maleVoiceId;
  const tuning = VOICE_TUNING[useMale ? 'male' : 'female'];
  return {
    language: LANGUAGE,
    pitch: tuning.pitch,
    rate: tuning.rate,
    volume: 1,
    // Sans `voice`, expo-speech réapplique la langue, ce qui remet la voix
    // par défaut : la voix femme revient bien après une phrase en homme.
    ...(useMale ? { voice: maleVoiceId } : {}),
  };
};

// ─── Baisser la musique pendant que la voix parle ─────────────────────────
// expo-speech ne demande PAS le focus audio (vérifié dans son code Android,
// SpeechModule.kt) : la voix sortait à son niveau par-dessus une musique à
// fond, donc noyée — alors que les bips, joués par expo-audio en mode
// `duckOthers` (app/_layout.js), font baisser la musique. Retour
// utilisateur du 24/09/2026 : « le son de voix sort beaucoup plus faible
// que la musique, alors que les bips sont bien ».
// Parade : pendant chaque phrase, un lecteur expo-audio joue en boucle un
// fichier SILENCIEUX (assets/sounds/silence.wav). expo-audio demande alors
// le focus audio (AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK) → Android baisse la
// musique de l'utilisateur le temps de la phrase, puis la remonte quand le
// lecteur s'arrête. Même comportement que les bips, sans rien de natif.
const DUCK_TAIL_MS = 250; // laisse finir la dernière syllabe avant de remonter
const DUCK_SAFETY_MS = 8000; // si le moteur TTS ne rappelle jamais
let duckPlayer = null;
let utteranceId = 0;
let releaseTimer = null;

const getDuckPlayer = () => {
  if (duckPlayer) return duckPlayer;
  try {
    duckPlayer = createAudioPlayer(require('../assets/sounds/silence.wav'));
    duckPlayer.loop = true;
  } catch {
    duckPlayer = null;
  }
  return duckPlayer;
};

const holdDuck = () => {
  const p = getDuckPlayer();
  if (!p) return;
  try {
    if (!p.playing) {
      p.seekTo(0);
      p.play();
    }
  } catch {}
};

const releaseDuck = () => {
  clearTimeout(releaseTimer);
  releaseTimer = null;
  try { duckPlayer?.pause(); } catch {}
};

// Dit `text` en baissant la musique pendant la phrase. Un identifiant par
// phrase : seule la DERNIÈRE phrase demandée relâche le focus en finissant.
// Par défaut les phrases s'ENCHAÎNENT (file d'attente du moteur TTS) : deux
// repères à une seconde d'écart (« Envoie ! » puis « Dernière ligne
// droite ! ») se coupaient l'un l'autre. `interrupt` ne sert qu'à l'aperçu
// des Paramètres, où chaque tap doit remplacer le précédent.
const say = (text, options, { interrupt = false, onStart, onEnd } = {}) => {
  const id = ++utteranceId;
  clearTimeout(releaseTimer);
  holdDuck();
  // Filet de sécurité posé AVANT la phrase : si la fin de phrase arrivait
  // avant cette ligne, elle serait écrasée et la musique resterait baissée.
  releaseTimer = setTimeout(releaseDuck, DUCK_SAFETY_MS);
  const done = () => {
    onEnd?.();
    if (id !== utteranceId) return;
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(releaseDuck, DUCK_TAIL_MS);
  };
  try {
    if (interrupt) Speech.stop();
    Speech.speak(text, { ...options, onStart, onDone: done, onStopped: done, onError: done });
  } catch {
    releaseDuck();
  }
};

// ─── Voix humaine : clips MP3 pré-générés ─────────────────────────────────
// Les phrases du coach sont fabriquées d'avance par une voix neuronale
// (scripts/voice-pack/generate.mjs → assets/voices/, index dans
// lib/voiceClipsIndex.js) et jouées comme des sons. Une phrase est découpée en
// clips par lib/voiceLexicon.js ; si UN morceau manque (nom d'exercice écrit
// par l'utilisateur, durée hors bornes, voix pas encore fabriquée), toute la
// phrase est dite par la voix du téléphone comme avant. Rien de natif : ça
// part en mise à jour OTA.
const CLIP_CACHE_MAX = 40; // lecteurs gardés en mémoire (les plus récents)
const JOB_WATCHDOG_MS = 12000; // une phrase ne bloque jamais la file plus longtemps

const hasPack = (g) => Object.keys(VOICE_CLIPS[g] || {}).length > 0;

// Clés des clips d'une phrase, ou null si elle ne peut pas être entièrement
// dite par la voix humaine choisie.
const clipPlan = (text, g) => {
  const pack = VOICE_CLIPS[g];
  if (!pack) return null;
  const keys = textToClips(text);
  return keys && keys.every((k) => pack[k]) ? keys : null;
};

const clipPlayers = new Map(); // `${voix}:${clé}` → lecteur, du moins au plus récent

const getClipPlayer = (g, key) => {
  const id = `${g}:${key}`;
  let p = clipPlayers.get(id);
  if (p) {
    clipPlayers.delete(id);
    clipPlayers.set(id, p);
    return p;
  }
  try { p = createAudioPlayer(VOICE_CLIPS[g][key]); } catch { return null; }
  clipPlayers.set(id, p);
  if (clipPlayers.size > CLIP_CACHE_MAX) {
    const oldest = clipPlayers.keys().next().value;
    try { clipPlayers.get(oldest).remove(); } catch {}
    clipPlayers.delete(oldest);
  }
  return p;
};

// File des phrases : les clips se jouent l'un APRÈS l'autre, les phrases
// s'enchaînent (comme la file d'attente du moteur TTS). `jobGen` change quand
// on coupe la parole : les rappels d'une file abandonnée se taisent.
const jobs = [];
let jobBusy = false;
let jobGen = 0;
let activePlayer = null;

const runNext = () => {
  if (jobBusy) return;
  const job = jobs.shift();
  if (!job) return;
  jobBusy = true;
  const gen = jobGen;
  let finished = false;
  let watchdog = null;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(watchdog);
    if (gen !== jobGen) return;
    jobBusy = false;
    runNext();
  };
  watchdog = setTimeout(finish, JOB_WATCHDOG_MS);
  job(finish);
};

const stopQueue = () => {
  jobGen += 1;
  jobs.length = 0;
  jobBusy = false;
  try { activePlayer?.pause(); } catch {}
  activePlayer = null;
};

// Joue les clips `keys` à la suite, puis appelle `done`.
const playKeys = (g, keys, gen, done) => {
  if (gen !== jobGen) return;
  const [key, ...rest] = keys;
  if (!key) {
    done();
    return;
  }
  const p = getClipPlayer(g, key);
  if (!p) {
    playKeys(g, rest, gen, done);
    return;
  }
  let advanced = false;
  let sub = null;
  let timer = null;
  const advance = () => {
    if (advanced) return;
    advanced = true;
    clearTimeout(timer);
    try { sub?.remove(); } catch {}
    if (activePlayer === p) activePlayer = null;
    playKeys(g, rest, gen, done);
  };
  try {
    sub = p.addListener('playbackStatusUpdate', (status) => {
      if (status?.didJustFinish) advance();
    });
  } catch {}
  let seconds = 0;
  try { seconds = Number(p.duration) || 0; } catch {}
  timer = setTimeout(advance, seconds > 0 ? seconds * 1000 + 300 : 2500);
  activePlayer = p;
  try {
    p.volume = 1;
    p.seekTo(0);
    p.play();
  } catch {
    advance();
  }
};

const sayClips = (keys, g, { onStart, onEnd } = {}) => {
  const id = ++utteranceId;
  clearTimeout(releaseTimer);
  holdDuck();
  releaseTimer = setTimeout(releaseDuck, DUCK_SAFETY_MS);
  jobs.push((finish) => {
    holdDuck();
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(releaseDuck, DUCK_SAFETY_MS);
    onStart?.();
    playKeys(g, keys, jobGen, () => {
      onEnd?.();
      if (id === utteranceId) {
        clearTimeout(releaseTimer);
        releaseTimer = setTimeout(releaseDuck, DUCK_TAIL_MS);
      }
      finish();
    });
  });
  runNext();
};

// Point d'entrée de toute parole : voix humaine si la phrase est couverte,
// sinon voix du téléphone. Une phrase du téléphone attend la fin des clips en
// cours (jamais deux voix en même temps), mais sans clips en cours elle part
// tout de suite, exactement comme avant.
const speak = (text, g, opts = {}) => {
  if (opts.interrupt) {
    stopQueue();
    try { Speech.stop(); } catch {}
  }
  const keys = clipPlan(text, g);
  if (keys) {
    sayClips(keys, g, opts);
    return;
  }
  const options = speakOptions(g);
  if (jobBusy || jobs.length) {
    jobs.push((finish) => say(text, options, { ...opts, onEnd: () => { opts.onEnd?.(); finish(); } }));
    runNext();
    return;
  }
  say(text, options, opts);
};

const silence = () => {
  utteranceId += 1;
  stopQueue();
  try { Speech.stop(); } catch {}
  releaseDuck();
};

// Style de parole : 'essential' (« Essentiel », l'info tranchée en 1-2 s,
// PAR DÉFAUT) ou 'motivating' (« Motivant », phrases de coach, au choix).
// Même moment de parole, seule la phrase change (lib/voiceTexts.js).
let style = 'essential';
const STYLES = ['motivating', 'essential'];

export const configureVoiceCoach = ({ enabled: next, gender: nextGender, style: nextStyle, detail: nextDetail } = {}) => {
  if (typeof next === 'boolean') {
    enabled = next;
    if (!next) silence();
    // Repère la voix homme d'avance, pour qu'elle soit prête dès la
    // première phrase de la séance.
    else detectVoices().catch(() => {});
  }
  if (nextGender === 'male' || nextGender === 'female') gender = nextGender;
  if (STYLES.includes(nextStyle)) style = nextStyle;
  if (nextDetail) setVoiceDetail(nextDetail);
};

export const isVoiceCoachEnabled = () => enabled;

// Exemples joués à l'aperçu (fenêtre « Ton coach » des Paramètres), selon le
// style et le niveau d'annonces choisis.
export const STYLE_SAMPLES = {
  motivating: {
    discreet: "Allez, c'est parti !",
    detailed: "Allez, c'est parti ! 20 secondes de travail.",
  },
  essential: {
    discreet: 'Tour 3 sur 8.',
    detailed: 'Tour 3 sur 8. Travail, 20 secondes.',
  },
};

// Prévisualisation : dit un exemple dans le style, le niveau et la voix
// choisis, sans attendre que le round-trip settings→context ait mis à jour
// le module (React state async) — même principe que previewSound pour le volume.
// Renvoie une promesse résolue quand la voix COMMENCE à parler (ou finit, ou
// échoue, ou après 5 s) : la fenêtre « Ton coach » s'en sert pour montrer un
// chargement pendant que le moteur de voix se prépare.
export const previewVoice = ({ gender: g = gender, style: st = style, detail: d = 'discreet' } = {}) =>
  new Promise((resolve) => {
    if (!enabled) {
      resolve();
      return;
    }
    const samples = STYLE_SAMPLES[st] || STYLE_SAMPLES.motivating;
    const timer = setTimeout(resolve, 5000);
    const finish = () => {
      clearTimeout(timer);
      resolve();
    };
    speak(samples[d] || samples.discreet, g, {
      interrupt: true,
      onStart: finish,
      onEnd: finish,
    });
  });

// Phrases courtes, enchaînées si deux repères tombent presque ensemble.
export const speakCoach = (text) => {
  if (!enabled || !text) return;
  speak(text, gender);
};

// Transforme les repères en une seule phrase, dans le style choisi.
// `ctx` = { prev, cur, mode } : le style Essentiel lit les chiffres
// (tour, temps restant) dans la photo de l'état.
export const cuesToText = (cues, ctx, st = style) => {
  const texts = cues.map((c) => (st === 'essential' ? conciseText(c, ctx) : motivatingText(c, ctx)));
  return texts.filter(Boolean).join(' ');
};

export const speakCues = (cues, ctx) => {
  if (!enabled || !cues?.length) return;
  speakCoach(cuesToText(cues, ctx));
};

// Point d'entrée par tick depuis l'écran Running : compare deux photos de
// l'état du moteur, dit ce qu'il faut dire. `prevSnapshotRef` est tenu par
// l'appelant (une ref React) pour survivre aux re-renders sans state.
export const tickVoiceCoach = (prevSnapshotRef, state, elapsed, mode) => {
  const cur = voiceSnapshot(state, elapsed);
  const prev = prevSnapshotRef.current;
  // Sans photo précédente, decideCues ne répond qu'au tout premier instant
  // d'un MIX (annonce du premier bloc).
  if (enabled) {
    const cues = decideCues(prev, cur, { mode });
    if (cues.length) speakCues(cues, { prev, cur, mode });
  }
  prevSnapshotRef.current = cur;
};

// Fin de séance : phrase dédiée, indépendante du tick (l'écran l'appelle une
// seule fois, au moment de state.isComplete).
export const speakEnd = () =>
  speakCoach(style === 'essential' ? conciseText('end', { cur: {} }) : pickText('end'));

export const resetCoachForNewSession = () => {
  resetVoiceMemory();
};

export const stopVoiceCoach = () => silence();
