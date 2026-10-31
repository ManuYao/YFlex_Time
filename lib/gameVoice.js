import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { createAudioPlayer } from 'expo-audio';

import { VOICE_CLIPS } from './voiceClipsIndex';

// Annonceur de chiffres du jeu « Le chef d'orchestre ». Joue le clip MP3 du
// chiffre (voix humaine, fabriqué par scripts/voice-pack/generate.mjs, clés
// `count_N`) ; sans clip, la voix du téléphone dit le chiffre. Les clips des
// prochains chiffres sont préparés d'avance : décoder un MP3 au moment de le
// jouer ferait un retard audible, et un rythme de compte doit être régulier.

// Peu de lecteurs ouverts en même temps : Android finit par refuser d'en créer
// (la voix se taisait par moments alors que le compte continuait).
const CACHE_MAX = 6;
const LANGUAGE = Platform.OS === 'ios' ? 'fr-FR' : 'fr';

const clipOf = (gender, n) => VOICE_CLIPS[gender]?.[`count_${n}`] ?? null;

// Voix humaine demandée, ou l'autre si elle seule est fabriquée.
const pickPack = (gender) => {
  if (VOICE_CLIPS[gender] && Object.keys(VOICE_CLIPS[gender]).length) return gender;
  const other = gender === 'male' ? 'female' : 'male';
  return VOICE_CLIPS[other] && Object.keys(VOICE_CLIPS[other]).length ? other : null;
};

export const createNumberCaller = (gender = 'female') => {
  const pack = pickPack(gender);
  const players = new Map(); // n → lecteur, du moins au plus récent

  const playerFor = (n) => {
    if (!pack) return null;
    let p = players.get(n);
    if (p) {
      players.delete(n);
      players.set(n, p);
      return p;
    }
    const src = clipOf(pack, n);
    if (!src) return null;
    try {
      p = createAudioPlayer(src);
    } catch {
      return null;
    }
    players.set(n, p);
    if (players.size > CACHE_MAX) {
      const oldest = players.keys().next().value;
      try { players.get(oldest).remove(); } catch {}
      players.delete(oldest);
    }
    return p;
  };

  // Libère les chiffres déjà dits (le précédent peut encore sonner : on le garde).
  const releaseBefore = (n) => {
    for (const key of [...players.keys()]) {
      if (key < n - 1) {
        try { players.get(key).remove(); } catch {}
        players.delete(key);
      }
    }
  };

  return {
    // Prépare les chiffres à venir (sans les jouer).
    preload(from, count = 3) {
      for (let n = from; n < from + count; n++) playerFor(n);
    },
    // Dit le chiffre `n`.
    say(n) {
      releaseBefore(n);
      const p = playerFor(n);
      if (p) {
        try {
          p.volume = 1;
          p.seekTo(0);
          p.play();
          return;
        } catch {}
      }
      try {
        Speech.speak(String(n), { language: LANGUAGE, rate: 1.1, volume: 1 });
      } catch {}
    },
    // Coupe la parole en cours et libère les lecteurs.
    dispose() {
      try { Speech.stop(); } catch {}
      players.forEach((p) => {
        try { p.pause(); } catch {}
        try { p.remove(); } catch {}
      });
      players.clear();
    },
  };
};
