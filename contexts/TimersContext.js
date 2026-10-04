import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { TIMERS } from '../lib/timers-config';
import {
  addToLibrary as persistAddToLibrary,
  receiveMix as persistReceiveMix,
  removeFromLibrary as persistRemoveFromLibrary,
  saveCurrentMix as persistCurrentMix,
  loadLibrary,
  saveLibrary,
  hydrateMixState,
  LIBRARY_KEY,
  CURRENT_KEY,
  LEGACY_ACTIVE_KEY,
  LIBRARY_MIGRATION_KEY,
} from '../lib/mixes';
import { getMixTotalDuration, hasEstimatedDuration } from '../lib/mix-blocks';
import { ensureUid } from '../lib/mixIdentity';

const STORAGE_KEY = 'flexTimer_timerOverrides';

const TimersContext = createContext(null);

const formatComputedTotal = (totalSec) => {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (s === 0) return `${String(m).padStart(2, '0')}:00`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const applyMixToTimer = (timer, currentMix) => {
  if (timer.id !== 'mix') return timer;
  const blocks = currentMix?.blocks || [];
  const total = getMixTotalDuration(blocks);
  const nameValue = currentMix?.name?.toUpperCase() || '—';
  const stats = timer.stats.map((s) => {
    if (s.key === 'name') return { ...s, value: nameValue };
    if (s.key === 'blocks') return { ...s, value: String(blocks.length) };
    if (s.key === 'duration') {
      const prefix = hasEstimatedDuration(blocks) ? '~' : '';
      return { ...s, value: `${prefix}${formatComputedTotal(total)}` };
    }
    return s;
  });
  const phases = blocks.length === 0
    ? ['EMPTY']
    : blocks
        .slice(0, 5)
        .map((b) => (b.label || b.type || '—').toUpperCase().slice(0, 8))
        .concat(blocks.length > 5 ? ['…'] : []);
  return { ...timer, stats, phases, _mix: currentMix || null };
};

const applyOverrides = (timers, overrides, currentMix) =>
  timers.map((t) => {
    const ovs = overrides[t.id] || {};
    let nextStats = t.stats.map((s) => (s.key in ovs ? { ...s, value: ovs[s.key] } : s));

    if (t.id === 'emom') {
      const interval = nextStats.find((s) => s.key === 'interval')?.value ?? 0;
      const rounds = nextStats.find((s) => s.key === 'rounds')?.value ?? 0;
      nextStats = nextStats.map((s) =>
        s.key === 'total' ? { ...s, value: formatComputedTotal(interval * rounds) } : s
      );
    }

    const withOverrides = { ...t, stats: nextStats };
    return applyMixToTimer(withOverrides, currentMix);
  });

export function TimersProvider({ children }) {
  const [overrides, setOverrides] = useState({});
  const [library, setLibrary] = useState([]);
  const [currentMix, setCurrentMixState] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  // Dernier MIX courant, lisible depuis les callbacks sans les recréer.
  const currentMixRef = useRef(null);
  currentMixRef.current = currentMix;

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setOverrides(JSON.parse(raw));
      } catch {}
      try {
        const { currentMix: cur, library: lib } = await hydrateMixState();
        setLibrary(lib);
        setCurrentMixState(cur);
      } catch {}
      setHydrated(true);
    })();
  }, []);

  const persist = useCallback(async (next) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const updateStat = useCallback(
    (timerId, statKey, value) => {
      setOverrides((prev) => {
        const next = {
          ...prev,
          [timerId]: { ...(prev[timerId] || {}), [statKey]: value },
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const resetTimer = useCallback(
    (timerId) => {
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[timerId];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const saveCurrentMix = useCallback(async (mixIn) => {
    // Le lien vers la publication (`publishedId`) suit le mix : un brouillon
    // recopié sans ce champ ne doit pas le perdre (même règle que la
    // bibliothèque, lib/mixes.js addToLibrary).
    const prev = currentMixRef.current;
    // Tout mix a sa clé unique (lib/mixIdentity.js) : un mix fabriqué à la volée
    // (généré depuis le Planning) n'en a pas encore, il la reçoit ici. Un mix qui
    // remplace le courant sans la porter (même id) hérite de celle de l'ancien.
    const withUid =
      mixIn && !mixIn.uid && prev?.uid && prev.id && prev.id === mixIn.id ? { ...mixIn, uid: prev.uid } : mixIn;
    const keepLink =
      withUid && !withUid.publishedId && prev?.publishedId && prev.id === withUid.id
        ? { ...withUid, publishedId: prev.publishedId }
        : withUid;
    const mix = ensureUid(keepLink);
    setCurrentMixState(mix);
    await persistCurrentMix(mix);
  }, []);

  // Relie (ou délie, `publishedId` nul) un mix à sa publication dans le fil
  // public — dans « Mes mix » ET comme MIX courant s'il s'agit du même. C'est ce
  // lien, et non le nom, qui permet de publier plusieurs mix sans qu'ils
  // s'écrasent entre eux.
  const markPublished = useCallback(async (mixId, publishedId) => {
    if (!mixId) return;
    const apply = (m) => {
      const next = { ...m };
      if (publishedId) next.publishedId = publishedId;
      else delete next.publishedId;
      return next;
    };
    const list = await loadLibrary();
    if (list.some((m) => m.id === mixId)) {
      const next = list.map((m) => (m.id === mixId ? apply(m) : m));
      await saveLibrary(next);
      setLibrary(next);
    }
    const cur = currentMixRef.current;
    if (cur && cur.id === mixId) {
      const next = apply(cur);
      setCurrentMixState(next);
      await persistCurrentMix(next);
    }
  }, []);

  // Rend l'entrée telle qu'elle est ENREGISTRÉE : si le mix portait l'uid d'une
  // entrée existante, c'est celle-là qui est mise à jour (garde anti-doublon de
  // lib/mixes.js addToLibrary), avec son id à elle — pas forcément celui passé.
  const saveAsLibraryEntry = useCallback(async (mix) => {
    const next = await persistAddToLibrary(mix);
    setLibrary(next);
    return next.find((m) => m.id === mix.id) || next.find((m) => m.uid && m.uid === mix.uid) || null;
  }, []);

  // Reçoit un mix venu d'ailleurs (lien, fil public) : l'unique porte d'entrée,
  // qui refuse la double sauvegarde et ne propose que la mise à jour
  // (lib/mixes.js receiveMix). Si l'entrée mise à jour est aussi le MIX courant,
  // celui-ci suit : sinon l'accueil afficherait encore l'ancienne version.
  const receiveMix = useCallback(async (incoming, options) => {
    const res = await persistReceiveMix(incoming, options);
    setLibrary(res.library);
    if (res.status === 'updated') {
      const cur = currentMixRef.current;
      if (cur && cur.id === res.entry.id) {
        const next = { ...res.entry };
        setCurrentMixState(next);
        await persistCurrentMix(next);
      }
    }
    return res;
  }, []);

  const removeFromLibrary = useCallback(async (id) => {
    const next = await persistRemoveFromLibrary(id);
    setLibrary(next);
  }, []);

  const loadFromLibrary = useCallback(async (id) => {
    const target = library.find((m) => m.id === id);
    if (!target) return null;
    setCurrentMixState(target);
    await persistCurrentMix(target);
    return target;
  }, [library]);

  // Réinitialisation complète (écran Settings) : efface les overrides de
  // stats et l'état MIX à la fois en stockage ET en mémoire. Sans ça, les
  // écrans restent affichés avec les anciennes valeurs jusqu'au prochain
  // vrai redémarrage de l'app (le state du Provider ne se relit pas tout
  // seul quand AsyncStorage est vidé par un autre écran). Réutilise
  // hydrateMixState pour reproduire exactement l'état d'une install neuve
  // (mix par défaut recréé, bibliothèque vide, migration re-marquée faite).
  const resetAll = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEY, LIBRARY_KEY, CURRENT_KEY, LEGACY_ACTIVE_KEY, LIBRARY_MIGRATION_KEY]);
    } catch {}
    setOverrides({});
    try {
      const { currentMix: cur, library: lib } = await hydrateMixState();
      setLibrary(lib);
      setCurrentMixState(cur);
    } catch {
      setLibrary([]);
      setCurrentMixState(null);
    }
  }, []);

  // Une publication a été retirée du fil (ici ou depuis « Mes publications ») :
  // les mix qui y étaient reliés redeviennent privés.
  const clearPublication = useCallback(async (publishedId) => {
    if (!publishedId) return;
    const list = await loadLibrary();
    if (list.some((m) => m.publishedId === publishedId)) {
      const next = list.map((m) => {
        if (m.publishedId !== publishedId) return m;
        const { publishedId: _gone, ...rest } = m;
        return rest;
      });
      await saveLibrary(next);
      setLibrary(next);
    }
    const cur = currentMixRef.current;
    if (cur && cur.publishedId === publishedId) {
      const { publishedId: _gone, ...rest } = cur;
      setCurrentMixState(rest);
      await persistCurrentMix(rest);
    }
  }, []);

  const timers = useMemo(
    () => applyOverrides(TIMERS, overrides, currentMix),
    [overrides, currentMix]
  );

  const value = useMemo(
    () => ({
      timers,
      updateStat,
      resetTimer,
      resetAll,
      hydrated,
      library,
      currentMix,
      saveCurrentMix,
      saveAsLibraryEntry,
      receiveMix,
      removeFromLibrary,
      loadFromLibrary,
      markPublished,
      clearPublication,
    }),
    [timers, updateStat, resetTimer, resetAll, hydrated, library, currentMix, saveCurrentMix, saveAsLibraryEntry, receiveMix, removeFromLibrary, loadFromLibrary, markPublished, clearPublication]
  );

  return <TimersContext.Provider value={value}>{children}</TimersContext.Provider>;
}

export function useTimers() {
  const ctx = useContext(TimersContext);
  if (!ctx) throw new Error('useTimers must be used within TimersProvider');
  return ctx;
}