// Historique des mises à jour, la plus récente en tête. Deux niveaux
// d'affichage seulement (components/common/UpdateSheet.js) :
//   - popup "Quoi de neuf" au démarrage → items de HISTORY[0] uniquement.
//   - Paramètres > À propos > Version   → items de HISTORY[0] EN PLUS
//     d'une ligne de résumé pour HISTORY[1].
// Rien au-delà de l'avant-dernière n'est jamais affiché nulle part : à
// chaque nouvelle entrée ajoutée en tête, supprime la plus ancienne si le
// tableau dépasse 2 entrées (pas la peine de garder du texte mort ici).
//
// `icon` = le NOM d'une icône maison (components/common/AppIcon.js, liste
// complète dans ICON_NAMES : 'voice', 'palette', 'medal'...), jamais un
// emoji. Un nom inconnu n'affiche aucune icône.
//
// 12.2.0 et 12.1.0 ont été FUSIONNÉES en une seule entrée 12.2.1 le
// 22/09/2026 : les deux avaient été livrées le même soir, dans la même
// session de travail — les séparer en deux annonces coupait le second push
// (12.2.0, correctifs) du premier (12.1.0, le gros du contenu : sons,
// trophées...), donc quiconque passait directement à 12.2.0 ratait le detail
// de 12.1.0 (relégué en simple ligne de résumé). Demande explicite de
// l'utilisateur : « tout affiché à l'utilisateur pour montrer que ça y est »
// — les bêta-testeurs doivent voir l'ensemble d'un coup.
//
// Le détail des versions 14.9.0 → 16.0.0, publiées pendant la maintenance,
// a été REGROUPÉ le 30/09/2026 dans une seule entrée détaillée (16.0.1), à
// livrer avec la première mise à jour à distance qui suit la sortie de l'APK
// 16.0.0, au moment où la maintenance est levée (règle CLAUDE.md : pas de
// « Quoi de neuf » détaillé tant qu'une maintenance est annoncée).
// Écriture demandée par l'utilisateur : simple, compréhensible vite, sans
// détails techniques, éléments proches regroupés. Depuis le 02/10/2026 :
// 4 à 6 blocs au maximum, une ou deux phrases chacun (le testeur ne relit pas
// l'annonce, il va juger l'expérience). Voir CLAUDE.md, RÈGLE DU « QUOI DE NEUF ».
export const CHANGELOG_HISTORY = [
  {
    // Modération des commentaires, étoiles gardées, conditions à jour.
    version: '16.12.0',
    date: '6 oct. 2026',
    summary: "Des commentaires plus sûrs, des étoiles qui ne repartent plus à zéro et des conditions à jour.",
    items: [
      {
        icon: 'chat',
        text: "Des commentaires plus sûrs : tu peux signaler un commentaire ou bloquer un auteur, et l'auteur d'un mix peut retirer un commentaire gênant sur son mix. Les personnes bloquées se retrouvent dans les Paramètres.",
      },
      {
        icon: 'star-fill',
        text: "Corriger un mix déjà publié garde ses étoiles et ses commentaires : plus rien ne repart à zéro.",
      },
      {
        icon: 'mix',
        text: "Vider le constructeur MIX efface aussi le nom : tu repars vraiment d'une page blanche.",
      },
      {
        icon: 'lock',
        text: "Conditions d'utilisation et confidentialité mises à jour : elles parlent maintenant des commentaires, du signalement et du blocage.",
      },
    ],
  },
  {
    // Version précédente : affichée comme simple ligne de résumé
    // (Paramètres > Version).
    version: '16.11.0',
    date: '6 oct. 2026',
    summary: "Ta séance ne se perd plus, et le MIX te montre toujours ce qui vient ensuite.",
    items: [
      {
        icon: 'history',
        text: "Ta séance est sauvegardée au fil de l'eau : si le téléphone s'éteint ou que l'app se ferme en plein effort, tu retrouves ta séance dans l'historique, jusqu'à ta dernière série terminée.",
      },
      {
        icon: 'mix',
        text: "Un MIX plus clair : pendant le repos, une carte te montre l'exercice suivant avec sa durée et sa charge. Le compteur ne compte plus que les exercices, et tu vois à quel tour tu en es dans chaque bloc.",
      },
      {
        icon: 'tabata',
        text: "Un TABATA qui finit au bon moment dans un MIX : plus de repos inutile après le dernier effort, on enchaîne directement sur la suite.",
      },
      {
        icon: 'play',
        text: "Ta charge reste sous la main, tout en bas à côté des commandes du chrono.",
      },
    ],
  },
];

// Rétrocompatibilité de lecture pour tout code qui voudrait juste "la liste
// courante" sans se soucier de l'historique.
export const CHANGELOG_CURRENT = CHANGELOG_HISTORY[0].items;

// Détail des versions publiées pendant une maintenance. Exporté mais JAMAIS
// affiché. Vide depuis le 30/09/2026 : son contenu (14.9.0 → 16.0.0) a été
// regroupé dans l'entrée 16.0.1 de CHANGELOG_HISTORY. Si une nouvelle
// maintenance démarre, y ranger le vrai détail de chaque version publiée
// pendant qu'elle dure (l'entrée affichée reste alors générique).
export const CHANGELOG_BACKLOG = [];
