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
    // Séance sauvegardée au fil de l'eau + MIX plus lisible.
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
  {
    // Version précédente : affichée comme simple ligne de résumé
    // (Paramètres > Version).
    version: '16.10.0',
    date: '6 oct. 2026',
    summary: "Une app plus fluide et plus agréable : transitions douces, coach vocal au choix, stats qui comptent mieux ton MIX.",
    items: [
      {
        icon: 'bolt',
        text: "Tout glisse mieux : en passant d'un chrono à l'autre, le fond change en douceur, l'anneau s'allume tranquillement et plus rien ne clignote. Les écrans plus lourds s'ouvrent avec un petit chargement au lieu de rester figés.",
      },
      {
        icon: 'voice',
        text: "Un coach vocal à ta façon : discret comme avant, ou détaillé pour qu'il annonce aussi la durée de chaque effort et de chaque repos. Il te prévient quand tu passes en repos, et les exemples des réglages sont exactement ce qu'il dit.",
      },
      {
        icon: 'mix',
        text: "Des statistiques qui comprennent le MIX : chaque exercice d'un MIX compte vraiment, avec des barres de couleur qui montrent de quoi ta séance était faite.",
      },
      {
        icon: 'play',
        text: "Une séance plus agréable : un rappel de ta charge sous la main, un déroulé plus discret, un fond qui prend la couleur du bloc en cours, et un mode pluie pour ne rien déclencher par erreur avec les mains mouillées.",
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
