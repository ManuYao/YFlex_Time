import * as Speech from 'expo-speech';
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
const VOICE_TUNING = {
  male: { pitch: 0.62, rate: 1.08 },
  female: { pitch: 1.1, rate: 1.12 },
};

// Coach vocal : synthèse vocale (expo-speech), pas de fichiers audio.
// Module natif → ne peut pas arriver par OTA seule, un nouvel APK est
// nécessaire pour que les testeurs l'entendent réellement.
//
// Réglage vivant ici comme lib/sounds.js (module-level), tenu à jour par
// SettingsContext : les écrans n'ont pas à connaître ce détail.
let enabled = false;

// Homme/Femme : expo-speech n'expose pas de façon fiable le genre des voix
// système sur tous les appareils (dépend du moteur TTS installé — Google,
// Samsung… — et du fabricant), donc pas de vraie sélection de voix ici :
// c'est la même voix du téléphone, rendue plus grave ou plus aiguë. Une
// vraie sélection de voix système serait un chantier séparé — voir CLAUDE.md.
let gender = 'female';

const speakOptions = (g) => {
  const tuning = VOICE_TUNING[g === 'male' ? 'male' : 'female'];
  return { language: 'fr-FR', pitch: tuning.pitch, rate: tuning.rate };
};

export const configureVoiceCoach = ({ enabled: next, gender: nextGender } = {}) => {
  if (typeof next === 'boolean') {
    enabled = next;
    if (!next) {
      try { Speech.stop(); } catch {}
    }
  }
  if (nextGender === 'male' || nextGender === 'female') gender = nextGender;
};

export const isVoiceCoachEnabled = () => enabled;

// Prévisualisation : dit une phrase de test dans la hauteur choisie, sans
// attendre que le round-trip settings→context ait mis à jour `gender`
// (React state async) — même principe que previewSound pour le volume.
export const previewVoiceGender = (g) => {
  if (!enabled) return;
  try {
    Speech.stop();
    Speech.speak("Allez, c'est parti !", speakOptions(g));
  } catch {}
};

// Une phrase à la fois : une nouvelle annonce coupe la précédente plutôt
// que de s'empiler derrière (les phrases sont courtes, un chevauchement
// voudrait dire deux événements très rapprochés, pas la peine des deux).
export const speakCoach = (text) => {
  if (!enabled || !text) return;
  try {
    Speech.stop();
    Speech.speak(text, speakOptions(gender));
  } catch {}
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

export const stopVoiceCoach = () => {
  try { Speech.stop(); } catch {}
};
