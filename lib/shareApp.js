import { Share } from 'react-native';

/**
 * Partager l'app à un ami (règle des trois fois : Profil, fin de séance,
 * Paramètres › À propos passent tous par cette seule fonction).
 *
 * On envoie le SITE, pas un fichier : l'ami y trouve l'app et son installation.
 * Le texte part par la feuille de partage native (WhatsApp, SMS, Instagram…) ;
 * l'adresse est dans le message lui-même, c'est ce que toutes les applis de
 * messagerie savent rendre cliquable.
 */
export const APP_SITE_URL = 'https://flextimer.fit';

export const APP_SHARE_MESSAGE =
  `Je m'entraîne avec Flex Timer, un chrono de sport (AMRAP, EMOM, TABATA, mix perso) sans pub. Essaie-le : ${APP_SITE_URL}`;

// Libellés communs des trois entrées (même mot partout, pour qu'on les reconnaisse).
export const SHARE_APP_TITLE = "Partager l'app";
export const SHARE_APP_SUB = "Envoie le site à un ami : il y trouvera l'app à installer.";

/**
 * Ouvre la feuille de partage. Ne lève jamais : renvoie true si la personne a
 * bien envoyé le message, false si elle a fermé la feuille (ou si le partage
 * n'est pas disponible).
 */
export async function shareApp() {
  try {
    const res = await Share.share({ message: APP_SHARE_MESSAGE });
    return res?.action === Share.sharedAction;
  } catch {
    return false;
  }
}
