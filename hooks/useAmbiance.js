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
import { useAmbianceOverride } from '../lib/ambianceTest'; // TEMP (bouton de test des Paramètres)

/**
 * L'ambiance du moment : { mode, id, ambiance } — `ambiance` vaut null quand il n'y en a
 * aucune (réglage « Aucune »). Recalculée quand l'app revient au premier plan, pour que
 * le changement de jour (ou de saison) soit pris en compte sans relancer l'app.
 */
export default function useAmbiance() {
  const { settings } = useSettings();
  const mode = normalizeAmbianceMode(settings.ambianceMode);
  const [today, setToday] = useState(() => new Date());
  const override = useAmbianceOverride(); // TEMP : ambiance forcée depuis les Paramètres

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(new Date());
    });
    return () => sub.remove();
  }, []);

  return useMemo(() => {
    // TEMP : une ambiance forcée l'emporte sur le réglage et sur la date.
    const id = override ?? ambianceIdFor(mode, today);
    // En fin de saison, la suivante se glisse peu à peu (jamais plus de 35 %).
    const base = getAmbiance(id);
    const ambiance = override ? base : blendAmbiance(base, seasonDrift(today));
    return { mode, id, ambiance };
  }, [mode, today, override]);
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
