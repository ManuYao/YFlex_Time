import { playSound, preloadSound } from './sounds';

// REGLE DES JEUX (decision de l'utilisateur, 03/11/2026) : dans un jeu, quel qu'il
// soit, les bips 3-2-1 ne sonnent jamais (ils enchainaient trop souvent, surtout a
// chaque repos de la pyramide). Seul le bip final « go » est joue ; les chiffres
// 3-2-1 restent affiches a l'ecran. Tout nouveau jeu passe par ces deux fonctions,
// jamais par playSound('countdown1' / 'countdown2' / 'countdown3') directement.
// Les chronos (AMRAP, EMOM, TABATA, BASIC, MIX) gardent leurs bips habituels.
export function preloadGameSounds() {
  preloadSound('go');
}

export function playGameGo() {
  playSound('go');
}
