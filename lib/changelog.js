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
  {
    version: '11.0.0',
    date: '17 sept. 2026',
    summary: "Installation automatique de l'APK et halo de maintenance affiné.",
    items: [
      {
        icon: '⬇️',
        text: "Mise à jour obligatoire : le bouton de téléchargement propose maintenant une installation automatique en plus du lien manuel.",
      },
      {
        icon: '✨',
        text: "Halo de maintenance fin et lumineux : spread réduit de 50%, opacité augmentée pour un effet subtil sans être envahissant.",
      },
      {
        icon: '🚧',
        text: "La page de maintenance affiche maintenant bien son message et son bouton Fermer — elle restait vide sur Android auparavant. Fix: utilisation du composant Modal natif pour le layering.",
      },
      {
        icon: '👋',
        text: "Les messages de mise à jour ou de maintenance n'apparaissent plus par-dessus le tutoriel de bienvenue.",
      },
    ],
  },
];

// Rétrocompatibilité de lecture pour tout code qui voudrait juste "la liste
// courante" sans se soucier de l'historique.
export const CHANGELOG_CURRENT = CHANGELOG_HISTORY[0].items;
