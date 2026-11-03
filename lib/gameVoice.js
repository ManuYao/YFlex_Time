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
//
// Un lecteur qui a FINI son clip ne le rejoue pas : play() ne fait rien tant
// qu'on ne le recharge pas. Au chef d'orchestre chaque chiffre n'est dit qu'une
// fois, mais à la pyramide « 1, 2, 3… » revient à chaque série : un chiffre déjà
// dit reste donc marqué « joué » (`spent`) et est rechargé avant de resservir.

const POOL_SIZE = 4;
const START_CHECK_MS = 150; // délai avant de vérifier qu'un chiffre a bien démarré
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
  const spent = Array(POOL_SIZE).fill(false); // ce chiffre a déjà été joué : à recharger

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
    if (loaded[i] !== n || spent[i]) {
      try {
        p.replace(src);
        // Sans cette pause, un lecteur qui a déjà joué repart tout seul dès
        // qu'on lui donne un nouveau clip : les chiffres préparés d'avance
        // sonnaient tous en même temps.
        p.pause();
        loaded[i] = n;
        spent[i] = false;
      } catch {
        loaded[i] = null;
        spent[i] = false;
        return null;
      }
    }
    return p;
  };

  // Filet de sécurité : un play() peut se perdre (le lecteur reste à zéro, ni en
  // lecture ni fini). On regarde peu après ; s'il n'a pas démarré, on le relance
  // une fois. Un chiffre qui joue, ou qui a déjà fini, n'est jamais retouché.
  const ensureStarted = (p) => {
    setTimeout(() => {
      if (!pool || !pool.includes(p)) return; // partie quittée entre-temps
      try {
        if (!p.playing && p.currentTime < 0.02) {
          p.seekTo(0);
          p.play();
        }
      } catch {}
    }, START_CHECK_MS);
  };

  return {
    // Prépare les chiffres à venir (sans les jouer). Au plus 3 d'avance.
    preload(from, count = 2) {
      for (let n = from; n < from + Math.min(count, POOL_SIZE - 1); n++) prepare(n);
    },
    // Dit le chiffre `n`.
    say(n) {
      const p = prepare(n);
      // Coupe tout ancien chiffre encore actif (sauf le précédent, qui finit son mot).
      (pool || []).forEach((q, i) => {
        if (loaded[i] !== null && loaded[i] < n - 1) {
          try { q.pause(); } catch {}
        }
      });
      if (p) {
        try {
          p.volume = 1;
          p.play();
          spent[n % POOL_SIZE] = true;
          ensureStarted(p);
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
      spent.fill(false);
    },
  };
};
