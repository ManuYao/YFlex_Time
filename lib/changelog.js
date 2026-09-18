// Historique des mises à jour, la plus récente en tête. Deux niveaux
// d'affichage seulement (components/common/UpdateSheet.js) :
//   - popup "Quoi de neuf" au démarrage → items de HISTORY[0] uniquement.
//   - Paramètres > À propos > Version   → items de HISTORY[0] EN PLUS
//     d'une ligne de résumé pour HISTORY[1].
// Rien au-delà de l'avant-dernière n'est jamais affiché nulle part : à
// chaque nouvelle entrée ajoutée en tête, supprime la plus ancienne si le
// tableau dépasse 2 entrées (pas la peine de garder du texte mort ici).
export const CHANGELOG_HISTORY = [
  {
    version: '12.0.0',
    date: '18 sept. 2026',
    summary:
      "Le chrono continue en arrière-plan, avec une notification qui affiche le temps et des boutons Pause / Passer / Stop.",
    items: [
      {
        icon: '⏱️',
        text: "Nouveau : quand tu quittes l'app ou éteins l'écran pendant une séance, une notification affiche la phase en cours et le temps qui défile, en direct.",
      },
      {
        icon: '⏸️',
        text: "Depuis le volet de notifications, tu peux mettre en pause, reprendre, passer la phase ou arrêter la séance sans rouvrir l'app.",
      },
      {
        icon: '🔔',
        text: "Les bips et vibrations de changement de phase sonnent maintenant aussi écran éteint ou dans une autre appli.",
      },
      {
        icon: '🔋',
        text: "À la fin de ta première séance, l'app te propose de l'exclure de l'optimisation batterie pour un chrono fiable partout (modifiable dans Paramètres › Timers).",
      },
    ],
  },
  {
    version: '11.1.0',
    date: '18 sept. 2026',
    summary:
      "Conseil de surcharge progressive, groupe musculaire présélectionné et sélecteur de temps stabilisé.",
    items: [
      {
        icon: '📈',
        text: "Nouveau : quand un exercice de ton planning stagne à la même charge depuis plusieurs semaines, l'accueil te propose de l'augmenter un peu.",
      },
      {
        icon: '🏷️',
        text: "La bibliothèque d'exercices s'ouvre maintenant directement sur le bon groupe musculaire selon le nom de ton bloc.",
      },
      {
        icon: '🎯',
        text: "Le sélecteur de temps/tours ne saute plus de quelques pixels quand tu changes de valeur.",
      },
      {
        icon: '⚖️',
        text: "Ajout d'un texte d'information sur les conseils sportifs (indicatifs, jamais médicaux), à valider une fois dans Paramètres.",
      },
    ],
  },
];

// Rétrocompatibilité de lecture pour tout code qui voudrait juste "la liste
// courante" sans se soucier de l'historique.
export const CHANGELOG_CURRENT = CHANGELOG_HISTORY[0].items;
