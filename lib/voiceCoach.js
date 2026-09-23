import * as Speech from 'expo-speech';
import { decideCues, voiceSnapshot } from './voiceCues';
import { pickText, resetVoiceMemory } from './voiceTexts';

// Coach vocal : synthèse vocale (expo-speech), pas de fichiers audio.
// Module natif → ne peut pas arriver par OTA seule, un nouvel APK est
// nécessaire pour que les testeurs l'entendent réellement.
//
// Réglage vivant ici comme lib/sounds.js (module-level), tenu à jour par
// SettingsContext : les écrans n'ont pas à connaître ce détail.
let enabled = false;

export const configureVoiceCoach = ({ enabled: next } = {}) => {
  if (typeof next === 'boolean') {
    enabled = next;
    if (!next) {
      try { Speech.stop(); } catch {}
    }
  }
};

export const isVoiceCoachEnabled = () => enabled;

// Une phrase à la fois : une nouvelle annonce coupe la précédente plutôt
// que de s'empiler derrière (les phrases sont courtes, un chevauchement
// voudrait dire deux événements très rapprochés, pas la peine des deux).
export const speakCoach = (text) => {
  if (!enabled || !text) return;
  try {
    Speech.stop();
    Speech.speak(text, { language: 'fr-FR', pitch: 1.0, rate: 1.05 });
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
