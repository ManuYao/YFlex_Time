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
    version: '13.9.4',
    date: '24 sept. 2026',
    summary:
      "Un coach vocal peut annoncer les phases, les tours et la progression à voix haute pendant la séance (réglage Paramètres, désactivé par défaut, voix homme/femme).",
    items: [
      {
        icon: '🗣️',
        text: "Nouveau réglage « Voix du coach » (Paramètres > Audio et haptique, désactivé par défaut) : une voix annonce « Go », « Repos », le dernier tour, la moitié, les dix dernières secondes de la phase ou de la séance...",
      },
      {
        icon: '🚻',
        text: "Voix femme par défaut, et une vraie voix d'homme si ton téléphone en a une installée (le choix n'apparaît que dans ce cas). Des phrases de coach variées et énergiques. Chaque mode a ses propres annonces : pendant le repos la voix t'aide à récupérer puis à te préparer (« Dix secondes, prépare-toi ! ») ; en EMOM elle t'annonce la prochaine vague ; « Moitié de la séance » et « Moitié de l'effort » sont bien distingués.",
      },
      {
        icon: '🎧',
        text: "Si tu écoutes de la musique, elle baisse le temps que la voix parle, puis remonte, comme pour les bips.",
      },
      {
        icon: '🔇',
        text: "Le décompte de lancement (3-2-1-Go) et le compte à rebours des 3 dernières secondes d'une phase restent des bips, la voix ne s'ajoute que pour les phrases.",
      },
    ],
  },
  {
    version: '13.7.0',
    date: '24 sept. 2026',
    summary:
      "La notification de séance retrouve sa couleur et n'est plus rangée en silencieux ; Stop ouvre directement l'écran de fin.",
    items: [
      {
        icon: '🎨',
        text: "La notification de séance retrouve le fond à la couleur du mode. Sans lui, ton téléphone la rangeait dans les notifications silencieuses.",
      },
      {
        icon: '⏹️',
        text: "Le bouton Stop de la notification ouvre maintenant l'app directement sur l'écran de fin de séance. Pause et Passer continuent d'agir sans ouvrir l'app.",
      },
      {
        icon: '📊',
        text: "La barre qui avance avec la phase et le titre « TRAVAIL · Tour 6/8 » sont conservés.",
      },
    ],
  },
];

// Rétrocompatibilité de lecture pour tout code qui voudrait juste "la liste
// courante" sans se soucier de l'historique.
export const CHANGELOG_CURRENT = CHANGELOG_HISTORY[0].items;
