// Historique des mises à jour, la plus récente en tête. Deux niveaux
// d'affichage seulement (components/common/UpdateSheet.js) :
//   - popup "Quoi de neuf" au démarrage → items de HISTORY[0] uniquement.
//   - Paramètres > À propos > Version   → items de HISTORY[0] EN PLUS
//     d'une ligne de résumé pour HISTORY[1].
// Rien au-delà de l'avant-dernière n'est jamais affiché nulle part : à
// chaque nouvelle entrée ajoutée en tête, supprime la plus ancienne si le
// tableau dépasse 2 entrées (pas la peine de garder du texte mort ici).
//
// 12.2.0 et 12.1.0 ont été FUSIONNÉES en une seule entrée 12.2.1 le
// 22/09/2026 : les deux avaient été livrées le même soir, dans la même
// session de travail — les séparer en deux annonces coupait le second push
// (12.2.0, correctifs) du premier (12.1.0, le gros du contenu : sons,
// trophées...), donc quiconque passait directement à 12.2.0 ratait le detail
// de 12.1.0 (relégué en simple ligne de résumé). Demande explicite de
// l'utilisateur : « tout affiché à l'utilisateur pour montrer que ça y est »
// — les bêta-testeurs doivent voir l'ensemble d'un coup.
export const CHANGELOG_HISTORY = [
  {
    version: '13.1.0',
    date: '23 sept. 2026',
    summary:
      "Le sélecteur de temps est repensé : plus fluide, plus lisible, et il propose des valeurs qui ont vraiment un sens pour l'entraînement.",
    items: [
      {
        icon: '🎡',
        text: "Nouvelle roue de sélection, partout dans l'app (réglages des timers, constructeur MIX, planning) : effet de roue en relief, défilement plus fluide, valeur choisie mieux mise en avant.",
      },
      {
        icon: '⏱️',
        text: "Les temps proposés (TABATA, EMOM, BASIC, et les blocs du MIX) suivent des paliers pensés pour l'entraînement : à la seconde près sous 30 s, puis de 5 en 5, de 10 en 10… Tu trouves ta valeur en deux gestes au lieu de faire défiler seconde par seconde.",
      },
    ],
  },
  {
    version: '13.0.0',
    date: '23 sept. 2026',
    summary:
      "L'app reste utilisable en petite fenêtre, pour garder ton programme d'entraînement visible à côté du chrono.",
    items: [
      {
        icon: '🪟',
        text: "En fenêtre flottante ou en écran partagé, l'app reste lisible et utilisable même très réduite — chrono, boutons et réglages restent visibles et faciles à toucher.",
      },
      {
        icon: '🌗',
        text: "Pendant une séance, le fond s'assombrit doucement le temps du repos entre les séries, et se rallume au travail — chaque mode garde sa couleur.",
      },
      {
        icon: '🔄',
        text: "Le bouton Reset en cours de séance a été corrigé.",
      },
    ],
  },
];

// Rétrocompatibilité de lecture pour tout code qui voudrait juste "la liste
// courante" sans se soucier de l'historique.
export const CHANGELOG_CURRENT = CHANGELOG_HISTORY[0].items;
