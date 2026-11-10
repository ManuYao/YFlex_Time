import { useEffect, useState } from 'react';

import { findAnimation } from '../lib/exerciseAnimations';
import { getAnimationCatalog, getAnimationFile } from '../lib/exerciseAnimationStore';

/**
 * Animation d'un exercice : `label` = son nom, `animationId` = choix fait à la
 * main (prioritaire). `download: false` cherche seulement l'animation dans le
 * catalogue sans télécharger le fichier (ex. languette de séance d'un
 * non-Premium : on sait qu'elle existe, on ne la montre pas).
 * Renvoie :
 *   - status : 'loading' (catalogue ou fichier en route), 'ready' (uri prête),
 *     'none' (aucune animation pour ce nom), 'error' (animation connue mais
 *     fichier inaccessible, ex. première fois sans réseau), 'found' (connue,
 *     fichier non demandé) ;
 *   - entry : l'entrée du catalogue (dimensions, groupe, noms) ou null ;
 *   - uri : adresse locale du fichier ;
 *   - catalog : le catalogue entier (pour choisir une autre animation).
 */
export function useExerciseAnimation(label, animationId = null, { download = true } = {}) {
  const [state, setState] = useState({ status: 'loading', entry: null, uri: null, catalog: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      const catalog = await getAnimationCatalog();
      if (!alive) return;
      const entry = findAnimation(catalog, label, animationId);
      if (!entry) {
        setState({ status: 'none', entry: null, uri: null, catalog });
        return;
      }
      if (!download) {
        setState({ status: 'found', entry, uri: null, catalog });
        return;
      }
      setState({ status: 'loading', entry, uri: null, catalog });
      const uri = await getAnimationFile(entry);
      if (alive) setState({ status: uri ? 'ready' : 'error', entry, uri, catalog });
    })();
    return () => {
      alive = false;
    };
  }, [label, animationId, download]);

  return state;
}
