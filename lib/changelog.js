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
export const CHANGELOG_HISTORY = [
  {
    version: '15.0.0',
    date: '28 sept. 2026',
    summary:
      "Ajoute une note à chaque bloc de ton MIX pour te rappeler quel exercice il contient.",
    items: [
      {
        icon: 'note',
        text: "Chaque bloc d'un MIX peut avoir sa propre note (par exemple « Pompes 3x15, Dips 3x12 »), visible directement dans la liste — pratique pour se souvenir de ce qu'il y a dedans avant de lancer la séance.",
      },
      {
        icon: 'note',
        text: "Tu peux remplir cette note toi-même, ou l'importer directement depuis un jour de ton Planning, pour ne pas retaper ce que tu as déjà noté.",
      },
      {
        icon: 'share',
        text: "Quand tu partages un MIX avec un ami, les notes de chaque bloc partent avec.",
      },
    ],
  },
  {
    version: '14.9.0',
    date: '28 sept. 2026',
    summary:
      "Le bouton pour modifier ton MIX répond enfin à chaque fois.",
    items: [
      {
        icon: 'mix',
        text: "Après avoir lancé un MIX, le bouton pour le modifier ne répondait parfois pas au premier essai. Corrigé : il s'ouvre maintenant à chaque fois.",
      },
    ],
  },
];

// Rétrocompatibilité de lecture pour tout code qui voudrait juste "la liste
// courante" sans se soucier de l'historique.
export const CHANGELOG_CURRENT = CHANGELOG_HISTORY[0].items;

// Détail des versions publiées pendant une maintenance. Exporté mais JAMAIS
// affiché : au premier envoi après la fin de la maintenance (Gist repassé à
// `is_maintenance: false`), tout ce qui est ici est regroupé dans UNE entrée
// détaillée en tête de CHANGELOG_HISTORY, puis ce tableau est vidé et les
// entrées génériques retirées.
export const CHANGELOG_BACKLOG = [];

