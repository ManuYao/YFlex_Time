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
    version: '17.2.1',
    date: '29 oct. 2026',
    summary: "Petites améliorations et corrections pendant la maintenance.",
    items: [
      { icon: 'sliders', text: "Petites améliorations et corrections pendant la maintenance." },
    ],
  },
  {
    version: '17.2.0',
    date: '29 oct. 2026',
    summary: "Une voix de coach beaucoup plus humaine, une nouvelle police et la saisie des secondes au clavier.",
    items: [
      { icon: 'voice', text: "Une vraie voix de coach : fini le ton de robot, le coach parle maintenant avec une voix naturelle, au choix femme ou homme, dans les deux styles. Elle marche sans connexion, même à la salle." },
      { icon: 'palette', text: "Nouvelle police : des chiffres et des titres plus nets et plus sportifs, lisibles d'un coup d'œil." },
      { icon: 'sliders', text: "Saisie plus simple : les minutes et les secondes se tapent maintenant chacune dans leur case, au clavier." },
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
export const CHANGELOG_BACKLOG = [
  {
    // Publiée AVANT la mise en maintenance : à afficher dans la première
    // entrée détaillée une fois la maintenance levée.
    version: '17.2.0',
    date: '29 oct. 2026',
    summary: "Une voix de coach beaucoup plus humaine, une nouvelle police et la saisie des secondes au clavier.",
    items: [
      { icon: 'voice', text: "Une vraie voix de coach : fini le ton de robot, le coach parle maintenant avec une voix naturelle, au choix femme ou homme, dans les deux styles. Elle marche sans connexion, même à la salle." },
      { icon: 'sliders', text: "Saisie plus simple : les minutes et les secondes se tapent maintenant chacune dans leur case, au clavier." },
    ],
  },
  {
    version: '17.2.1',
    date: '29 oct. 2026',
    summary: "Une nouvelle police plus sportive, aux chiffres plus fins.",
    items: [
      { icon: 'palette', text: "Nouvelle police : Saira Extra Condensed pour les chiffres et les titres, Saira pour le texte, plus fines et plus sportives que la version précédente." },
    ],
  },
];
