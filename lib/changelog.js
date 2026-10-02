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
    // 16.2.0 à 16.7.0 n'ont jamais été publiées séparément : une seule entrée,
    // pour que les testeurs voient tout d'un coup (même règle que
    // 12.1.0 / 12.2.0).
    version: '16.7.13',
    date: '2 oct. 2026',
    summary:
      "Le MIX fait un gros bond : page Mix et Partage, plusieurs mix publiables, constructeur plus sûr, commentaires. Et un bilan à partager depuis ton Profil.",
    items: [
      {
        icon: 'mix',
        text: "MIX en grand : une page Mix et Partage pour tout retrouver au même endroit, un bouton Lancer dans le constructeur, des mix publiables en plusieurs exemplaires (un nom différent chacun), modifiables et supprimables, avec des commentaires.",
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
        icon: 'bolt',
        text: "Petits plus : temps sous tension plus juste, AMRAP plus simple, emojis possibles dans ton nom, connexion Google plus fiable, et une séance TABATA ou MIX ne compte qu'après 40 secondes de chrono.",
      },
    ],
  },
  {
    // Version précédente : affichée comme simple ligne de résumé
    // (Paramètres > Version).
    version: '16.1.3',
    date: '1 oct. 2026',
    summary: "Comptes et sauvegarde en ligne, fil public de MIX, Profil, Planning complet, sécurité renforcée et limites gratuites simplifiées.",
    items: [
      {
        icon: 'user',
        text: "Compte facultatif, avec ton email ou Google : ton historique est sauvegardé en ligne et tu le retrouves si tu changes de téléphone. Sans compte, rien ne change. Tu choisis aussi ton nom de profil.",
      },
      {
        icon: 'lock',
        text: "Sécurité, un point d'honneur : mot de passe jamais gardé en clair, historique invisible pour les autres, et l'app ne révèle jamais si un email a déjà un compte. Tu peux supprimer ton compte depuis les Paramètres : tout est effacé pour de bon (compte, historique en ligne, MIX publiés).",
      },
      {
        icon: 'no-ads',
        text: "Conditions d'utilisation et confidentialité réécrites clairement : ce qui reste sur ton téléphone, ce qui va en ligne, et pourquoi. L'app demande aussi moins d'autorisations (plus de micro ni d'accès aux fichiers). Toujours aucune pub, aucune revente de données.",
      },
      {
        icon: 'globe',
        text: "Fil public : les MIX d'autres sportifs, triés par catégorie ou par notes, à tester tout de suite. Avec un compte, tu peux les enregistrer et les noter de 1 à 5 étoiles. Sans compte, tu peux regarder et tester.",
      },
      {
        icon: 'share',
        text: "Publie ton propre MIX dans le fil public (catégorie au choix) et retire-le quand tu veux. Le partage est refait, avec un onglet envoyer, un onglet recevoir et un aperçu. Envoyer un MIX par lien à un ami marche toujours, compte ou non. Un MIX signalé par trois personnes disparaît du fil.",
      },
      {
        icon: 'trophies',
        text: "Un vrai Profil depuis l'accueil : disciplines (deux maximum), régularité, calendrier, séances par format et trophées, à partir de tes vraies séances. Tu peux partager ta dernière séance. Les Paramètres sont derrière l'engrenage.",
      },
      {
        icon: 'clock',
        text: "Planning plus complet : chaque exercice peut avoir son chrono (AMRAP, BASIC, EMOM ou TABATA), avec tours et repos alignés sur tes séries. Le repos s'écrit 1 min 30, et une charge à zéro s'affiche PDC (poids du corps). Reste appuyé 2 secondes sur un bloc chronométré pour composer une séance qui enchaîne ses exercices.",
      },
      {
        icon: 'note',
        text: "Chaque bloc d'un MIX peut avoir une note (par exemple Pompes 3x15, Dips 3x12), écrite ou importée depuis ton Planning. Elle suit le MIX quand tu le partages.",
      },
      {
        icon: 'help',
        text: "Mieux comprendre les formats : les points de l'accueil ouvrent un aperçu des 5 formats, et chaque explication montre tes réglages et mène à une page sur son origine et ses sports. Si tu n'as jamais essayé la voix du coach, l'app te la propose après quelques séances.",
      },
      {
        icon: 'crown',
        text: "Limites gratuites plus simples : 4 séances TABATA et 3 séances MIX par semaine, remises à zéro chaque lundi, sans délai d'attente qui s'allonge. Premium reste sans limite. L'option pour cramer une séance en plus disparaît.",
      },
      {
        icon: 'sessions',
        text: "Une séance très courte, ou arrêtée tout au début, est proposée à la suppression. Tu as une journée pour changer d'avis.",
      },
      {
        icon: 'sliders',
        text: "Petits plus : à la connexion, le champ à corriger s'entoure en rouge ; le bouton pour modifier un MIX répond à chaque fois ; en réglant le volume, chaque appui joue un son du compte à rebours ; copier un lien de MIX est plus fiable. L'installation automatique d'une mise à jour depuis l'app est réparée. Pour la bêta, 10 appuis sur le bandeau Pro dans les Paramètres activent (ou coupent) le mode Pro.",
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
