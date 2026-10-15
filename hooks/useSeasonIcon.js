import { useEffect } from 'react';

import useAmbiance from './useAmbiance';
import { getSeasonIcon, setSeasonIcon } from '../modules/season-icon';

// Met l'icône de l'application (celle du lanceur) à la couleur de la saison ou de la
// fête du moment, comme l'ambiance (lib/ambiance.js). Réglage « Aucune » → icône de base.
// Appelé à l'ouverture de l'accueil : le changement se voit dans le lanceur, jamais en
// plein usage. Sans le module natif (ancien APK), rien ne se passe.
export default function useSeasonIcon() {
  const { id } = useAmbiance();
  useEffect(() => {
    const want = id || 'base';
    if (getSeasonIcon() !== want) setSeasonIcon(want);
  }, [id]);
}
