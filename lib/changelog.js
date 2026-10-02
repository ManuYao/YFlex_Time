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
    // 16.2.0 à 16.5.0 n'ont jamais été publiées séparément : une seule entrée,
    // pour que les testeurs voient tout d'un coup (même règle que
    // 12.1.0 / 12.2.0).
    version: '16.6.0',
    date: '1 oct. 2026',
    summary:
      "Un menu global en haut de l'accueil, la page Mix et Partage, des commentaires sur les mix publiés, tes mix publiés enfin modifiables et supprimables, un bouton Lancer dans le constructeur, un temps sous tension exact, un AMRAP plus simple, un Planning plus réactif et une app plus à l'aise dans une petite fenêtre.",
    items: [
      {
        icon: 'user',
        text: "Tu peux mettre des emojis dans ton nom de profil, par exemple Sportif 💪. Ils apparaissent aussi dans le fil public et dans tes commentaires.",
      },
      {
        icon: 'lock',
        text: "Connexion plus fiable : si tu fermes la fenêtre Google avant la fin, l'app ne dit plus que tu es connecté à tort. Et lancer un TABATA ou un MIX puis revenir en arrière pendant le 3-2-1 ne te fait plus perdre une de tes séances gratuites de la semaine.",
      },
      {
        icon: 'chat',
        text: "Commentaires sur les mix publiés : tout le monde peut les lire, il faut un compte pour écrire. Tu peux ouvrir 3 discussions au maximum sur un même mix, mais répondre dans une discussion est illimité, aux autres comme à toi-même. Tu modifies ou supprimes tes commentaires quand tu veux. L'auteur du mix, lui, écrit sans aucune limite.",
      },
      {
        icon: 'amrap',
        text: "AMRAP plus simple et plus clair : il ne reste que la durée sur la carte, et le déroulé tient en deux mots (tes minutes d'effort sans pause, puis le bilan). Il suit la durée que tu choisis et s'affiche aussi pendant la séance.",
      },
      {
        icon: 'hub',
        text: "Un nouveau menu en haut à gauche de l'accueil : tes trois grandes portes au même endroit, Mix et Partage, ton historique et ton planning. Chacune s'ouvre sur sa page, avec un bouton retour.",
      },
      {
        icon: 'mix',
        text: "Le MIX a désormais sa page centrale, Mix et Partage : ton mix du moment, le lancer ou le modifier, retrouver tes mix enregistrés, le fil public, recevoir un mix et envoyer le tien. Un petit raccourci violet te ramène dessus depuis ton historique, ton planning et ton profil.",
      },
      {
        icon: 'play',
        text: "Dans le constructeur de MIX, un grand bouton Lancer à côté d'Enregistrer : tu pars directement sur le compte à rebours, sans repasser par l'accueil. Les limites gratuites de la semaine s'appliquent comme d'habitude.",
      },
      {
        icon: 'calendar',
        text: "Planning : rester appuyé 2 secondes sur un bloc chronométré lance son MIX, et c'est plus réactif. Ça marche même quand ton doigt est posé sur un exercice, la carte se remplit tout de suite, et un petit rappel est écrit dessus.",
      },
      {
        icon: 'dumbbell',
        text: "Quand tu ajoutes un exercice au Planning, la fiche habituelle s'ouvre tout de suite pour régler sa charge, ses séries et son repos. Tu règles ce que tu veux, ou tu la fermes : rien n'est imposé.",
      },
      {
        icon: 'globe',
        text: "Tu as publié un mix ? Tu n'es plus bloqué : tu peux le modifier (nom, orthographe, blocs), le tester et le retirer du fil, depuis Mix et Partage ou directement dans le fil, sans toucher à ton compte. Tes mix publiés sont réunis au même endroit.",
      },
      {
        icon: 'bolt',
        text: "Temps sous tension plus juste : la dernière minute avant d'appuyer sur la fin du chrono est maintenant comptée, et ton Profil l'affiche à la seconde près. Les séances EMOM déjà faites sont remises d'aplomb toutes seules.",
      },
      {
        icon: 'user',
        text: "Dans ton Profil, le bouton pour te connecter passe tout en haut, avant tes disciplines, bien en vue. Il reste facultatif.",
      },
      {
        icon: 'expand',
        text: "Plus à l'aise dans une petite fenêtre, par exemple sur Samsung : l'accueil se réduit à l'essentiel et le bouton Lancer reste toujours visible, les commandes du chrono tiennent même dans une fenêtre étroite, et les autres écrans te demandent d'agrandir la fenêtre quand elle est vraiment trop petite.",
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
