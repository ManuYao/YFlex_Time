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
// détails techniques, éléments proches regroupés, sécurité bien mise en
// avant, aucune limite au nombre de lignes (la feuille défile).
export const CHANGELOG_HISTORY = [
  {
    // Le tutoriel de démarrage seul : 16.8.2 (ci-dessous) a déjà été publiée.
    version: '16.9.0',
    date: '5 oct. 2026',
    summary: "Un tour guidé de 2 minutes pour bien démarrer, proposé sans jamais t'être imposé.",
    items: [
      {
        icon: 'play',
        text: "Un tour guidé pour bien démarrer : on te montre le menu, puis tu lances un premier chrono de test (2 tours, 5 secondes de repos) dans le vrai chronomètre. Rien n'est enregistré dans ton historique.",
      },
      {
        icon: 'help',
        text: "Jamais imposé : l'app te le propose une fois, avec une vibration et un petit son, et tu peux dire plus tard ou non merci. Tu peux l'arrêter à tout moment et le retrouver dans les Paramètres.",
      },
      {
        icon: 'calendar',
        text: "Pour aller plus loin, une suite très courte te montre où trouver l'historique, le planning et ton profil.",
      },
    ],
  },
  {
    // Version précédente : affichée comme simple ligne de résumé
    // (Paramètres > Version). 16.2.0 à 16.8.2 n'ont jamais été annoncées
    // séparément : une seule entrée, comme 12.1.0 / 12.2.0.
    version: '16.8.2',
    date: '5 oct. 2026',
    summary:
      "Le MIX fait un gros bond : page Mix et Partage, plusieurs mix publiables, constructeur plus sûr, commentaires. Et un bilan à partager depuis ton Profil.",
    items: [
      {
        icon: 'mix',
        text: "MIX en grand : une page Mix et Partage pour tout retrouver au même endroit, un bouton Lancer dans le constructeur, des mix publiables en plusieurs exemplaires (un nom différent chacun), modifiables et supprimables, avec des commentaires. Un mix déjà dans ta liste n'est plus ajouté deux fois : on te propose seulement de le mettre à jour.",
      },
      {
        icon: 'sliders',
        text: "Constructeur plus sûr : tout vider d'un geste (avec annulation), avertissement avant de perdre des modifications, enregistrement qui ne te fait plus quitter la page, et Mes mix range tes créations à part de celles des autres.",
      },
      {
        icon: 'share',
        text: "Partage depuis ton Profil : le bilan de ta semaine, de ton mois ou ta dernière séance, sous forme de belle carte. Le Profil s'ouvre aussi plus en douceur.",
      },
      {
        icon: 'hub',
        text: "Un menu en haut à gauche de l'accueil pour accéder à Mix et Partage, à l'historique et au planning, et une app plus à l'aise dans une petite fenêtre.",
      },
      {
        icon: 'calendar',
        text: "Planning plus souple : déplace un bloc d'un jour à l'autre, change le nom d'un bloc ou d'un exercice, retrouve tes réglages quand tu changes le type de chrono d'un exercice. Ta note du jour s'enregistre toute seule dès que tu arrêtes d'écrire, et les boutons de validation ne se déclenchent plus deux fois par erreur.",
      },
      {
        icon: 'bolt',
        text: "Petits plus : l'accueil s'ouvre sur le chrono que tu utilises le plus, avec des chargements plus doux, temps sous tension plus juste, AMRAP plus simple, emojis possibles dans ton nom, connexion Google plus fiable, et une séance TABATA ou MIX ne compte qu'après 40 secondes de chrono.",
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
