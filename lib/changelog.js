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
    version: '12.2.0',
    date: '22 sept. 2026',
    summary:
      "La fenêtre « Quoi de neuf » affiche enfin le bon contenu au bon moment, sans se mélanger avec tes trophées.",
    items: [
      {
        icon: '🪟',
        text: "Corrigé : la fenêtre de mise à jour montrait parfois l'ancien contenu à la place du nouveau. Elle attend maintenant d'avoir redémarré pour afficher ce qui a vraiment changé.",
      },
      {
        icon: '🏆',
        text: "« Quoi de neuf » et tes trophées ne se chevauchent plus au démarrage : la mise à jour s'affiche d'abord, puis tes médailles juste après.",
      },
      {
        icon: '🔊',
        text: "Le curseur Volume des Paramètres joue un bip au niveau choisi — plus besoin de régler à l'aveugle.",
      },
    ],
  },
  {
    version: '12.1.0',
    date: '21 sept. 2026',
    summary:
      "Les sons arrivent pour de vrai, ta musique baisse juste le temps du bip, et tes trophées s'annoncent enfin quand tu les gagnes.",
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
        icon: '📳',
        text: "Nouveau réglage d'intensité des vibrations (Léger / Moyen / Fort) — touche un niveau pour le sentir tout de suite.",
      },
      {
        icon: '📊',
        text: "La carte Streak de l'historique réagit enfin à l'appui long, comme Séances et Temps.",
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
        icon: '🔒',
        text: "TABATA et MIX : tes 4 lancements ne se rechargent plus tout seuls au changement de jour. Il faut les avoir utilisés pour lancer le délai de recharge.",
      },
    ],
  },
];

// Rétrocompatibilité de lecture pour tout code qui voudrait juste "la liste
// courante" sans se soucier de l'historique.
export const CHANGELOG_CURRENT = CHANGELOG_HISTORY[0].items;
