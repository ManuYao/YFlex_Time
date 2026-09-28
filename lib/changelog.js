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
  {
    // Maintenance terminée le 26/09/2026 : toutes les versions publiées
    // pendant la maintenance (14.1.0 à 14.8.0, gardées dans CHANGELOG_BACKLOG
    // ci-dessous) sont regroupées ici en une seule entrée détaillée, comme
    // prévu par la règle (voir CLAUDE.md, section OTA). Le backlog est vidé
    // juste après.
    version: '14.8.1',
    date: '26 sept. 2026',
    summary:
      "Partage tes MIX avec tes potes, ajoute une note à ta journée, un vrai bloc BASIC dans le MIX, et le clavier qui ne cache plus rien.",
    items: [
      {
        icon: 'share',
        text: "Partage un de tes MIX avec un ami : un bouton copie le lien, à envoyer où tu veux (SMS, WhatsApp, Instagram…). La première fois, un petit message t'explique comment ton ami le récupère.",
      },
      {
        icon: 'link',
        text: "Pour récupérer un MIX qu'on t'a envoyé, colle simplement le lien dans l'app : tu vois un aperçu avant de l'ajouter chez toi.",
      },
      {
        icon: 'list',
        text: "Dans le Planning, tu peux écrire une petite note sur chaque jour (par exemple « fatigué aujourd'hui »).",
      },
      {
        icon: 'basic',
        text: "Nouveau type de bloc dans le MIX : le BASIC, pour les exercices comme les tractions, où c'est toi qui décides quand une série est terminée.",
      },
      {
        icon: 'sliders',
        text: "Le clavier ne cache plus jamais ce que tu écris ni les boutons, partout dans l'app.",
      },
      {
        icon: 'finish',
        text: "Sur le dernier tour d'un EMOM, tu peux terminer ta séance directement, sans attendre la fin de la minute.",
      },
      {
        icon: 'skip',
        text: "Pendant un EMOM, un nouveau bouton te permet de passer directement au tour suivant.",
      },
      {
        icon: 'mix',
        text: "Un bug qui empêchait parfois d'ouvrir le MIX est corrigé.",
      },
      {
        icon: 'list',
        text: "Sur les petits écrans, les jours du Planning et les filtres de l'Historique se font défiler correctement, plus rien n'est coupé.",
      },
      {
        icon: 'pause',
        text: "Les boutons de la séance sont un peu plus nets visuellement.",
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

