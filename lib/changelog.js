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
    version: '15.5.1',
    date: '29 sept. 2026',
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
        text: "Une séance quittée très tôt par rapport à sa durée normale (environ ses 15 premiers pourcents) est maintenant proposée à la suppression, comme les séances de quelques secondes — avec la possibilité d'annuler si tu changes d'avis.",
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
        text: "Si tu n'as jamais essayé la voix du coach, l'app te le propose après quelques séances — avec un petit guide vers le réglage si tu dis oui. Tu peux dire non pour de bon si ça ne t'intéresse pas.",
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
  {
    version: '14.16.0',
    date: '28 sept. 2026',
    items: [
      {
        icon: 'mix',
        text: "Les points en bas de l'écran d'accueil ouvrent maintenant un aperçu des 5 formats au lieu de sauter directement — pratique si tu ne connais pas encore leurs différences. Un appui un peu plus long sur un point t'en montre l'utilité, sans quitter l'écran.",
      },
      {
        icon: 'arrow',
        text: "Dans l'explication d'un mode, un nouveau bouton t'emmène vers une page plus complète : d'où vient le format et dans quels sports on le retrouve.",
      },
    ],
  },
  {
    version: '14.18.0',
    date: '28 sept. 2026',
    items: [
      {
        icon: 'clock',
        text: "Dans le Planning, chaque exercice d'un bloc peut maintenant avoir son propre chrono (AMRAP, BASIC, EMOM ou TABATA) avec ses réglages — pratique pour préparer à l'avance comment tu comptes l'exécuter.",
      },
      {
        icon: 'mix',
        text: "Dès qu'un bloc a au moins un exercice avec un chrono réglé, sa carte s'allume et scintille légèrement. Reste appuyé 2 secondes dessus pour composer une séance qui enchaîne tous ses exercices, avec un petit repos entre chacun — tu peux encore tout ajuster avant de lancer.",
      },
    ],
  },
  {
    // Maquette : le profil affiche des données d'exemple, rien n'est encore
    // branché. À reformuler au moment d'annoncer la vraie version.
    version: '14.19.0',
    date: '28 sept. 2026',
    items: [
      {
        icon: 'user',
        text: "Nouvel écran Profil, accessible depuis l'accueil : tes disciplines (deux au maximum), ta régularité, tes graphiques, le partage de MIX et tes trophées. Les Paramètres sont maintenant dans le Profil, via l'engrenage.",
      },
    ],
  },
  {
    version: '14.19.1',
    date: '28 sept. 2026',
    items: [
      {
        icon: 'clock',
        text: "Dans la fiche d'un exercice du Planning, le choix du chrono est maintenant dans le même ordre que sur l'accueil (AMRAP, BASIC, EMOM, TABATA), avec des icônes plus grandes et plus lisibles.",
      },
      {
        icon: 'mix',
        text: "Pour composer une séance depuis un bloc du Planning, il suffit maintenant de rester appuyé 2 secondes au lieu de 3.",
      },
    ],
  },
  {
    version: '14.19.2',
    date: '29 sept. 2026',
    items: [
      {
        icon: 'user',
        text: "Le Profil est plus simple : la partie MIX ne garde que le fil public, pour découvrir les MIX des autres.",
      },
    ],
  },
  {
    version: '14.19.3',
    date: '29 sept. 2026',
    items: [
      {
        icon: 'bar',
        text: "Dans le Profil, le graphique de tes séances passe en blanc, plus doux à l'œil, et l'analyse avancée se déplie avec « Voir plus » pour une page moins longue.",
      },
    ],
  },
  {
    version: '14.20.0',
    date: '29 sept. 2026',
    items: [
      {
        icon: 'user',
        text: "Le Profil affiche maintenant tes vraies données, plus des exemples : ta régularité, ton calendrier d'entraînement, ta répartition par format et tes trophées viennent de ton historique réel. Les disciplines que tu choisis sont enregistrées.",
      },
      {
        icon: 'share',
        text: "Le bouton « Partager ma séance » utilise ta dernière séance réelle, et reste grisé tant que tu n'en as pas terminé une.",
      },
    ],
  },
  {
    version: '15.0.0',
    date: '29 sept. 2026',
    items: [
      {
        icon: 'user',
        text: "Tu peux maintenant créer un compte, si tu veux (par email ou avec Google) — depuis le Profil. C'est complètement facultatif, l'app continue de marcher pareil sans connexion.",
      },
    ],
  },
  {
    version: '15.0.1',
    date: '29 sept. 2026',
    items: [
      {
        icon: 'clock',
        text: "Dans la fiche d'un exercice du Planning, le repos s'écrit maintenant « 1 min 30 » au lieu de « 90 s », et une charge à zéro s'affiche « PDC » (poids du corps).",
      },
      {
        icon: 'sliders',
        text: "Quand tu choisis un chrono pour un exercice, ses tours et son repos reprennent tes séries et ton repos. Si tu changes l'un, l'autre suit.",
      },
    ],
  },
  {
    version: '15.1.0',
    date: '29 sept. 2026',
    items: [
      {
        icon: 'user',
        text: "Une fois connecté, ton Profil affiche juste un petit point vert sur ton avatar au lieu d'une grosse ligne « Déconnexion » qui prenait de la place.",
      },
    ],
  },
  {
    version: '15.1.1',
    date: '29 sept. 2026',
    items: [
      {
        icon: 'clock',
        text: "Dans la fiche d'un exercice du Planning, les tours et le repos du chrono se mettent à jour tout de suite quand tu changes tes séries ou ton repos, sans avoir à changer de chrono puis revenir.",
      },
      {
        icon: 'sliders',
        text: "Les choix de chrono (AMRAP, BASIC, EMOM, TABATA) sont mieux centrés et un peu plus grands : l'icône et le nom tiennent bien dans leur case.",
      },
    ],
  },
  {
    version: '15.1.2',
    date: '29 sept. 2026',
    items: [
      {
        icon: 'lock',
        text: "Petit renforcement de la sécurité de la connexion : le message d'erreur à l'inscription ne confirme plus si un email a déjà un compte.",
      },
    ],
  },
  {
    version: '15.2.0',
    date: '29 sept. 2026',
    items: [
      {
        icon: 'user',
        text: "Si tu es connecté, ton historique de séances est maintenant sauvegardé en ligne : tu le retrouves si tu changes de téléphone ou réinstalles l'app. Sans compte, rien ne change.",
      },
    ],
  },
  {
    version: '15.3.0',
    date: '29 sept. 2026',
    items: [
      {
        icon: 'user',
        text: "Tu peux maintenant choisir ton nom : en créant ton compte, ou plus tard en touchant ton nom en haut du Profil. Il s'affiche sur ton Profil et te suit si tu changes de téléphone.",
      },
    ],
  },
  {
    version: '15.4.0',
    date: '29 sept. 2026',
    items: [
      {
        icon: 'crown',
        text: "Pour la bêta : en appuyant 10 fois d'affilée sur le bandeau Pro dans les Paramètres, tu passes en mode Pro pour essayer l'app sans les limites — et 10 nouveaux appuis te font revenir en arrière. Ça permet de tester les deux côtés et de donner un avis plus juste.",
      },
    ],
  },
  {
    version: '15.5.0',
    date: '29 sept. 2026',
    items: [
      {
        icon: 'share',
        text: "Le menu de partage d'un MIX est refait : un onglet pour envoyer, un pour recevoir, avec un aperçu de ton mix avant de l'envoyer.",
      },
      {
        icon: 'globe',
        text: "Si tu as un compte, tu peux publier ton MIX dans le fil public et choisir sa catégorie. Tu peux le retirer quand tu veux.",
      },
      {
        icon: 'mix',
        text: "Le fil public montre maintenant les vrais MIX publiés par les autres, à trier par catégorie ou par meilleures notes.",
      },
      {
        icon: 'star',
        text: "Avec un compte, tu peux tester un MIX du fil, l'enregistrer chez toi et lui donner de 1 à 5 étoiles.",
      },
      {
        icon: 'lock',
        text: "Sans compte, tu peux regarder le fil public, mais pas tester, enregistrer ni noter. Envoyer un lien à un ami reste possible pour tout le monde.",
      },
    ],
  },
  {
    version: '15.5.1',
    date: '30 sept. 2026',
    items: [
      {
        icon: 'crown',
        text: "Dans le Profil, l'analyse avancée sans Premium montre maintenant un aperçu : les premières statistiques sont visibles, puis tout s'estompe doucement vers la suite (toujours la même, pour ne pas dévoiler le reste). Toucher l'aperçu ouvre la page Premium.",
      },
    ],
  },
];
