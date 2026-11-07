import { useEffect } from 'react';
import { AppState } from 'react-native';

import useAmbiance from './useAmbiance';
import { getSeasonIcon, setSeasonIcon } from '../modules/season-icon';

// Met l'icône de l'application (celle du lanceur) à la couleur de la saison ou de la
// fête du moment, comme l'ambiance (lib/ambiance.js). Réglage « Aucune » → icône de base.
// Sans le module natif (ancien APK), rien ne se passe.
//
// Le changement ne se fait JAMAIS pendant que l'app est à l'écran : Android peut alors
// recréer la fenêtre de l'app, d'où un écran noir en pleine intro (le son continue, l'image
// non). On note l'icône voulue et on l'applique quand l'app passe en arrière-plan ; si le
// système ferme l'app juste après, ça ne se voit pas, et le lanceur montre déjà la bonne icône.
let wantedIcon = null;
let listening = false;

const applyWanted = () => {
  if (!wantedIcon) return;
  if (getSeasonIcon() !== wantedIcon) setSeasonIcon(wantedIcon);
};

const ensureListener = () => {
  if (listening) return;
  listening = true;
  AppState.addEventListener('change', (state) => {
    if (state === 'background') applyWanted();
  });
};

export default function useSeasonIcon() {
  const { id } = useAmbiance();
  useEffect(() => {
    wantedIcon = id || 'base';
    ensureListener();
  }, [id]);
}
