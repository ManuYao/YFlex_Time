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
export default function useAmbiance() {
  const { settings } = useSettings();
  const mode = normalizeAmbianceMode(settings.ambianceMode);
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(new Date());
    });
    return () => sub.remove();
  }, []);

  return useMemo(() => {
    const id = ambianceIdFor(mode, today);
    // En fin de saison, la suivante se glisse peu à peu (jamais plus de 35 %).
    const base = getAmbiance(id);
    const ambiance = blendAmbiance(base, seasonDrift(today));
    return { mode, id, ambiance };
  }, [mode, today]);
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
