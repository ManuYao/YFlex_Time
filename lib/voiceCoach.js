import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { decideCues, voiceSnapshot } from './voiceCues';
import { pickText, resetVoiceMemory } from './voiceTexts';

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
//  La voix homme est une VRAIE voix masculine du téléphone (pas la voix
//  femme rendue grave, jugé « trop robotique ») : son pitch reste donc
//  proche de 1.
const VOICE_TUNING = {
  male: { pitch: 0.95, rate: 1.08 },
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
  if (voicesScanned) return { male: !!maleVoiceId };
  let voices = [];
  for (let attempt = 0; attempt < 3 && !voices.length; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 700));
    try { voices = await Speech.getAvailableVoicesAsync(); } catch { voices = []; }
  }
  if (!voices.length) return { male: false };
  const french = voices.filter((v) => /^fr/i.test(v.language || ''));
  const males = french.filter(isMaleVoice);
  // France avant Canada, puis voix installée (« local ») avant voix en
  // ligne (« network »), qui ne marche pas sans internet à la salle.
  const score = (v) =>
    (/^fr[-_]fr/i.test(v.language) ? 2 : 0) + (/local/i.test(v.identifier) ? 1 : 0);
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
// phrase : `Speech.stop()` déclenche le `onStopped` de la phrase coupée,
// qui ne doit pas relâcher le focus que la nouvelle phrase vient de prendre.
const say = (text, options) => {
  const id = ++utteranceId;
  clearTimeout(releaseTimer);
  holdDuck();
  // Filet de sécurité posé AVANT la phrase : si la fin de phrase arrivait
  // avant cette ligne, elle serait écrasée et la musique resterait baissée.
  releaseTimer = setTimeout(releaseDuck, DUCK_SAFETY_MS);
  const done = () => {
    if (id !== utteranceId) return;
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(releaseDuck, DUCK_TAIL_MS);
  };
  try {
    Speech.stop();
    Speech.speak(text, { ...options, onDone: done, onStopped: done, onError: done });
  } catch {
    releaseDuck();
  }
};

const silence = () => {
  utteranceId += 1;
  try { Speech.stop(); } catch {}
  releaseDuck();
};

export const configureVoiceCoach = ({ enabled: next, gender: nextGender } = {}) => {
  if (typeof next === 'boolean') {
    enabled = next;
    if (!next) silence();
    // Repère la voix homme d'avance, pour qu'elle soit prête dès la
    // première phrase de la séance.
    else detectVoices().catch(() => {});
  }
  if (nextGender === 'male' || nextGender === 'female') gender = nextGender;
};

export const isVoiceCoachEnabled = () => enabled;

// Prévisualisation : dit une phrase de test dans la hauteur choisie, sans
// attendre que le round-trip settings→context ait mis à jour `gender`
// (React state async) — même principe que previewSound pour le volume.
export const previewVoiceGender = (g) => {
  if (!enabled) return;
  say("Allez, c'est parti !", speakOptions(g));
};

// Une phrase à la fois : une nouvelle annonce coupe la précédente plutôt
// que de s'empiler derrière (les phrases sont courtes, un chevauchement
// voudrait dire deux événements très rapprochés, pas la peine des deux).
export const speakCoach = (text) => {
  if (!enabled || !text) return;
  say(text, speakOptions(gender));
};

// Combine plusieurs situations (ex. ['rest', 'remaining_3']) en une seule
// phrase parlée, chacune tirée au hasard sans répéter sa dernière variante.
export const speakCues = (cues) => {
  if (!enabled || !cues?.length) return;
  const text = cues.map((c) => pickText(c)).filter(Boolean).join(' ');
  speakCoach(text);
};

// Point d'entrée par tick depuis l'écran Running : compare deux photos de
// l'état du moteur, dit ce qu'il faut dire. `prevSnapshotRef` est tenu par
// l'appelant (une ref React) pour survivre aux re-renders sans state.
export const tickVoiceCoach = (prevSnapshotRef, state, elapsed, mode) => {
  const cur = voiceSnapshot(state, elapsed);
  const prev = prevSnapshotRef.current;
  if (enabled && prev) {
    const cues = decideCues(prev, cur, { mode });
    if (cues.length) speakCues(cues);
  }
  prevSnapshotRef.current = cur;
};

// Fin de séance : phrase dédiée, indépendante du tick (l'écran l'appelle une
// seule fois, au moment de state.isComplete).
export const speakEnd = () => speakCoach(pickText('end'));

export const resetCoachForNewSession = () => {
  resetVoiceMemory();
};

export const stopVoiceCoach = () => silence();
