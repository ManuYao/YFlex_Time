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
// ⚠️ Gist de maintenance relu avant push (28/09/2026) : is_maintenance true.
// Règle CLAUDE.md confirmée par l'utilisateur — entrée générique ici, vrai
// détail dans CHANGELOG_BACKLOG, à regrouper en une seule entrée au premier
// envoi après la fin de la maintenance.
export const CHANGELOG_HISTORY = [
  {
    version: '14.14.1',
    date: '28 sept. 2026',
    summary: "Quelques correctifs et ajouts pendant la maintenance.",
    items: [
      {
        icon: 'sliders',
        text: "Quelques correctifs et ajouts pendant la maintenance.",
      },
    ],
  },
  {
    // Dernière version publiée avec un vrai détail, avant le retour en
    // maintenance — reste affichée comme résumé (Paramètres > Version)
    // tant que la maintenance dure.
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
export const CHANGELOG_BACKLOG = [
  {
    version: '14.9.0',
    date: '28 sept. 2026',
    items: [
      {
        icon: 'mix',
        text: "Après avoir lancé un MIX, le bouton pour le modifier ne répondait parfois pas au premier essai. Corrigé : il s'ouvre maintenant à chaque fois.",
      },
    ],
  },
  {
    version: '14.10.0',
    date: '28 sept. 2026',
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
    version: '14.11.0',
    date: '28 sept. 2026',
    items: [
      {
        icon: 'clock',
        text: "Une séance quittée avant même d'avoir fini son premier tour (ou son premier repos) est maintenant proposée à la suppression, comme les séances de quelques secondes — avec la possibilité d'annuler si tu changes d'avis.",
      },
      {
        icon: 'speaker',
        text: "Pour le fun : en réglant le volume, chaque appui joue un son différent du compte à rebours (3, 2, 1, top départ), pour mieux juger le niveau choisi.",
      },
    ],
  },
  {
    version: '14.12.0',
    date: '28 sept. 2026',
    items: [
      {
        icon: 'sliders',
        text: "Quand tu ouvres l'explication d'un mode (comment il fonctionne), tu vois maintenant aussi ses réglages actuels (travail, repos, tours...) — pratique pour comprendre d'un coup d'œil. Ça ne se modifie pas ici, c'est juste pour information.",
      },
    ],
  },
  {
    version: '14.13.0',
    date: '28 sept. 2026',
    items: [
      {
        icon: 'clock',
        text: "Quand une séance est proposée à la suppression, tu as maintenant une journée complète pour changer d'avis, au lieu d'une heure, avant qu'elle ne disparaisse pour de bon.",
      },
    ],
  },
  {
    version: '14.14.0',
    date: '28 sept. 2026',
    items: [
      {
        icon: 'voice',
        text: "Si tu n'as jamais essayé la voix du coach, l'app te le propose maintenant à l'ouverture — avec un petit guide vers le réglage si tu dis oui. Tu peux dire non pour de bon si ça ne t'intéresse pas.",
      },
    ],
  },
  {
    version: '14.14.1',
    date: '28 sept. 2026',
    items: [
      {
        icon: 'sliders',
        text: "Corrige un affichage où on voyait la fiche du dessous transparaître derrière les réglages actuels, dans l'explication d'un mode.",
      },
    ],
  },
];
