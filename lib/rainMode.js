// MODE PLUIE — combien de temps maintenir chaque bouton des TIMERS (écran de
// lancement de l'accueil + écran de séance). Mains mouillées, gants, bus :
// un appui raté ne doit pas arrêter une séance. Ne concerne PAS les menus.
//
//  normal : un appui = une action (0 = direct).
//  soft   : l'ancien comportement (quitter / reset / passer en maintenant).
//  storm  : tout se maintient, lancement et pause compris, ainsi que le
//           réglage des valeurs (temps, pause) et le choix du timer (`select`).
//
// Durées en ms. Jamais au-delà de 2 s : plus long devient pénible.
export const RAIN_MODES = ['normal', 'soft', 'storm'];

const TABLE = {
  // `finish` = « Quitter » (arrête la séance en la gardant) : jamais direct, même
  // en normal, un appui raté en plein effort coûterait la fin de la séance.
  normal: { launch: 0, pause: 0, endWork: 0, skip: 0, finish: 700, reset: 0, quit: 0, select: 0 },
  soft: { launch: 0, pause: 0, endWork: 0, skip: 1000, finish: 1000, reset: 2500, quit: 2000, select: 0 },
  storm: { launch: 1500, pause: 1000, endWork: 1000, skip: 1000, finish: 1500, reset: 2000, quit: 2000, select: 1000 },
};

export const holdDurations = (mode) => TABLE[mode] || TABLE.normal;

// Libellés partagés par les Paramètres et la configuration guidée du premier
// démarrage (components/screens/OnboardingSetup.js) : un seul endroit à tenir à jour.
export const RAIN_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'soft', label: 'Pluie' },
  { value: 'storm', label: 'Orage' },
];
export const RAIN_SUBS = {
  normal: 'Mains sèches : un appui suffit (Quitter se maintient un instant)',
  soft: 'Retour, Reset, Skip et Quitter se maintiennent : pas de faux appui',
  storm: 'Tout se maintient dans les chronos, lancement et pause compris',
};
