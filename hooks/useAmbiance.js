import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

import { useSettings } from '../contexts/SettingsContext';
import {
  ambianceIdFor,
  blendAmbiance,
  getAmbiance,
  normalizeAmbianceMode,
  seasonDrift,
} from '../lib/ambiance';

/**
 * L'ambiance du moment : { mode, id, ambiance } — `ambiance` vaut null quand il n'y en a
 * aucune (réglage « Aucune »). Recalculée quand l'app revient au premier plan, pour que
 * le changement de jour (ou de saison) soit pris en compte sans relancer l'app.
 */
// Ambiance du jour, calculée UNE fois par (réglage, jour) pour toute l'app : une
// douzaine de composants la lisent (chaque bouton rond, les décors…), et elle ne
// dépend que de la date du calendrier. Sans ce partage, chacun refaisait le
// mélange de fin de saison et obtenait un objet neuf à chaque retour au premier
// plan, ce qui relançait leurs effets pour rien.
const dayKeyOf = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const computed = new Map();
const ambianceFor = (mode, today) => {
  const key = `${mode}|${dayKeyOf(today)}`;
  const hit = computed.get(key);
  if (hit) return hit;
  const id = ambianceIdFor(mode, today);
  // En fin de saison, la suivante se glisse peu à peu (lib/ambiance.js).
  const base = getAmbiance(id);
  const value = { mode, id, ambiance: blendAmbiance(base, seasonDrift(today)) };
  if (computed.size > 12) computed.clear();
  computed.set(key, value);
  return value;
};

export default function useAmbiance() {
  const { settings } = useSettings();
  const mode = normalizeAmbianceMode(settings.ambianceMode);
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      // Même jour : on garde la date, rien à recalculer ni à re-rendre.
      if (state === 'active') {
        const now = new Date();
        setToday((prev) => (dayKeyOf(prev) === dayKeyOf(now) ? prev : now));
      }
    });
    return () => sub.remove();
  }, []);

  return useMemo(() => ambianceFor(mode, today), [mode, today]);
}

/**
 * Faut-il animer ? Vrai seulement quand l'écran est affiché, que l'app est au premier
 * plan et que « réduire les animations » n'est pas activé sur le téléphone. Tout ce qui
 * bouge de lui-même dans l'ambiance (motifs, lumière, passage rare) s'arrête sinon.
 */
export function useAmbianceActive() {
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');

  useFocusEffect(
    useMemo(
      () => () => {
        setFocused(true);
        return () => setFocused(false);
      },
      []
    )
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => sub.remove();
  }, []);

  return focused && foreground && !reduced;
}
