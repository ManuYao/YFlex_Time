import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { createAudioPlayer } from 'expo-audio';

import { VOICE_CLIPS } from './voiceClipsIndex';

// Annonceur de chiffres du jeu « Le chef d'orchestre ». Joue le clip MP3 du
// chiffre (voix humaine, fabriqué par scripts/voice-pack/generate.mjs, clés
// `count_N`) ; sans clip, la voix du téléphone dit le chiffre.
//
// Quatre lecteurs fixes, réutilisés à tour de rôle (`replace`) : en créer puis
// détruire un par chiffre finissait par échouer au bout d'une quarantaine
// (la voix se taisait pendant que le compte continuait). Le chiffre n passe
// toujours par le lecteur n % 4 : en disant n on peut préparer n+1 et n+2 sans
// toucher au lecteur de n-1, qui peut encore sonner (un nombre long dure ~2 s).

const POOL_SIZE = 4;
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
  let pool = null;
  const loaded = Array(POOL_SIZE).fill(null); // chiffre chargé dans chaque lecteur

  const getPool = () => {
    if (pool) return pool;
    try {
      pool = Array.from({ length: POOL_SIZE }, () => createAudioPlayer(null));
    } catch {
      pool = [];
    }
    return pool;
  };

  // Charge le clip de `n` dans son lecteur ; renvoie le lecteur ou null.
  const prepare = (n) => {
    if (!pack) return null;
    const src = clipOf(pack, n);
    const players = getPool();
    if (!src || !players.length) return null;
    const i = n % POOL_SIZE;
    const p = players[i];
    if (loaded[i] !== n) {
      try {
        p.replace(src);
        loaded[i] = n;
      } catch {
        loaded[i] = null;
        return null;
      }
    }
    return p;
  };

  return {
    // Prépare les chiffres à venir (sans les jouer). Au plus 3 d'avance.
    preload(from, count = 2) {
      for (let n = from; n < from + Math.min(count, POOL_SIZE - 1); n++) prepare(n);
    },
    // Dit le chiffre `n`.
    say(n) {
      const p = prepare(n);
      if (p) {
        try {
          p.volume = 1;
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
      (pool || []).forEach((p) => {
        try { p.pause(); } catch {}
        try { p.remove(); } catch {}
      });
      pool = null;
      loaded.fill(null);
    },
  };
};
