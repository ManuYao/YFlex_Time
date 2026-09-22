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
    version: '12.3.0',
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
        text: "Bloqué à 0 ? Tu peux « cramer » une place pour lancer quand même une dernière séance — le prochain cycle aura juste une place en moins.",
      },
    ],
  },
  {
    version: '12.2.1',
    date: '22 sept. 2026',
    summary:
      "Les sons, tes trophées qui s'annoncent, et une fenêtre de mise à jour enfin fiable — la grosse soirée.",
    items: [
      {
        icon: '🔊',
        text: "Les sons sont là : un décompte sonore sur les 3 dernières secondes de chaque phase, des bips sur le 3-2-1-GO, et un son au démarrage de l'app.",
      },
      {
        icon: '🎵',
        text: "Tu peux écouter ta musique à fond : elle baisse toute seule le temps du bip, puis remonte. Le volume de l'app se règle à part, dans Paramètres.",
      },
      {
        icon: '🏆',
        text: "Tes trophées s'annoncent : quand tu franchis un palier (10, 50 ou 150 séances sur un mode), une médaille apparaît en fin de séance. Si tu la rates, elle revient au prochain lancement.",
      },
      {
        icon: '🔍',
        text: "Tape une médaille dans le panneau d'un mode pour voir sa fiche : progression détaillée, et un aperçu de ce qui arrivera à débloquer plus tard.",
      },
      {
        icon: '📳',
        text: "Nouveau réglage d'intensité des vibrations (Léger / Moyen / Fort) — touche un niveau pour le sentir tout de suite.",
      },
      {
        icon: '🎚️',
        text: "Le curseur Volume des Paramètres joue un bip au niveau choisi — plus besoin de régler à l'aveugle.",
      },
      {
        icon: '📊',
        text: "La carte Streak de l'historique réagit enfin à l'appui long, comme Séances et Temps.",
      },
      {
        icon: '🔒',
        text: "TABATA et MIX : tes 4 lancements ne se rechargent plus tout seuls au changement de jour. Il faut les avoir utilisés pour lancer le délai de recharge.",
      },
      {
        icon: '🪟',
        text: "La fenêtre « Quoi de neuf » est plus fiable : elle affiche maintenant le bon contenu au bon moment, et ne se mélange plus avec l'affichage de tes trophées.",
      },
    ],
  },
];

// Rétrocompatibilité de lecture pour tout code qui voudrait juste "la liste
// courante" sans se soucier de l'historique.
export const CHANGELOG_CURRENT = CHANGELOG_HISTORY[0].items;
