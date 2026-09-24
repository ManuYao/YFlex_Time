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
    version: '13.10.1',
    date: '24 sept. 2026',
    summary:
      "Un coach vocal peut t'annoncer la séance à voix haute : court et tranché (« Tour 3 sur 8 ») ou motivant, voix femme ou homme.",
    items: [
      {
        icon: '🗣️',
        text: "Nouveau : la voix du coach (Paramètres > Audio et haptique, désactivée par défaut). Elle t'annonce les tours, les repos, la moitié, les dix dernières secondes et la fin, sans que tu aies à regarder l'écran.",
      },
      {
        icon: '🎚️',
        text: "« Personnaliser le coach » ouvre sa fenêtre de réglages. Style Essentiel par défaut, l'info tranchée en une ou deux secondes (« Tour 3 sur 8. », « Repos. 30 secondes. », « Reprise dans 10 secondes. »), ou style Motivant, avec des phrases de coach qui t'encouragent. Touche un choix pour l'écouter.",
      },
      {
        icon: '🚻',
        text: "Voix femme, ou vraie voix d'homme si ton téléphone en a une installée. Chaque mode a ses propres annonces : en repos on récupère puis on se prépare, en EMOM la voix t'annonce la prochaine vague.",
      },
      {
        icon: '🎧',
        text: "Si tu écoutes de la musique, elle baisse le temps que la voix parle, puis remonte, comme pour les bips.",
      },
      {
        icon: '🔇',
        text: "Le décompte de lancement (3-2-1-Go) et les 3 dernières secondes d'une phase restent des bips.",
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
