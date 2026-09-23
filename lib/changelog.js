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
    version: '13.0.0',
    date: '23 sept. 2026',
    summary:
      "L'app reste utilisable en petite fenêtre, pour garder ton programme d'entraînement visible à côté du chrono.",
    items: [
      {
        icon: '🪟',
        text: "En fenêtre flottante ou en écran partagé, l'app reste lisible et utilisable même très réduite, et ne peut plus devenir trop petite pour ça.",
      },
      {
        icon: '⏱️',
        text: "Pendant une séance en petite fenêtre, le temps restant s'affiche en grand, et Pause, Passer et Reset restent faciles à viser.",
      },
      {
        icon: '👆',
        text: "Tes réglages (durée, tours, travail, repos) restent lisibles et modifiables quelle que soit la taille de la fenêtre.",
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
  {
    version: '12.3.2',
    date: '22 sept. 2026',
    summary:
      "TABATA passe à 6 lancements gratuits, et tu peux désormais « cramer » une place en trop au lieu d'être bloqué net.",
    items: [
      {
        icon: '⚡',
        text: "TABATA passe de 4 à 6 lancements gratuits avant verrouillage. MIX reste à 4.",
      },
      {
        icon: '🔥',
        text: "Bloqué à 0 ? Tu peux « cramer » une place pour lancer quand même une séance de plus. Le compte : une fois le verrou passé, tu retrouves ton quota — mais avec une place en moins (5 au lieu de 6 sur TABATA), et ça jusqu'à ce que tu laisses un cycle complet filer sans cramer.",
      },
    ],
  },
];

// Rétrocompatibilité de lecture pour tout code qui voudrait juste "la liste
// courante" sans se soucier de l'historique.
export const CHANGELOG_CURRENT = CHANGELOG_HISTORY[0].items;
