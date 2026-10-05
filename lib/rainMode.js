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
  normal: { launch: 0, pause: 0, endWork: 0, skip: 0, finish: 0, reset: 0, quit: 0, select: 0 },
  soft: { launch: 0, pause: 0, endWork: 0, skip: 1000, finish: 1000, reset: 2500, quit: 2000, select: 0 },
  storm: { launch: 1500, pause: 1000, endWork: 1000, skip: 1000, finish: 1000, reset: 2000, quit: 2000, select: 1000 },
};

export const holdDurations = (mode) => TABLE[mode] || TABLE.normal;
