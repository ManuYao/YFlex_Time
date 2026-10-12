import { makeMutable } from 'react-native-reanimated';

/**
 * Le zoom d'apparition du vrai écran à la fin de l'intro de démarrage
 * (components/common/LaunchSplash.js). Valeur partagée globale, de 0 (écran « loin » et invisible)
 * à 1 (posé, tel que d'habitude).
 *
 * Elle vaut 1 en temps normal : aucun effet, aucun coût. L'intro la passe à 0 au début de sa
 * sortie (l'écran est alors caché derrière l'intro) puis la ramène à 1 en douceur quand le vide
 * s'ouvre ; l'accueil (app/home.js) en tire une opacité et un petit zoom (0,92 → 1). Elle est
 * toujours remise à 1 à la fin de l'intro, quoi qu'il arrive : un écran ne doit jamais rester
 * invisible.
 */
export const introReveal = makeMutable(1);

/** Écart de zoom au début de l'apparition (0,92 → 1). */
export const INTRO_REVEAL_FROM_SCALE = 0.92;
