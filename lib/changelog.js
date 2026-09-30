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
    version: '16.1.1',
    date: '30 sept. 2026',
    summary: "Limites gratuites plus simples (4 TABATA, 3 MIX par semaine) et connexion plus claire.",
    items: [
      {
        icon: 'clock',
        text: "Les limites gratuites sont beaucoup plus simples : 4 séances TABATA et 3 séances MIX par semaine. Le compteur repart chaque lundi, sans délai d'attente qui s'allonge. Avec Premium, c'est sans limite. L'option pour « cramer » une séance en plus disparaît.",
      },
    ],
  },
  {
    version: '16.0.1',
    date: '30 sept. 2026',
    summary:
      "Comptes et sauvegarde en ligne, fil public de MIX, vrai Profil, Planning plus complet et une sécurité renforcée.",
    items: [
      {
        icon: 'user',
        text: "Tu peux créer un compte, si tu veux : avec ton email ou avec Google. Ce n'est pas obligatoire, l'app marche exactement comme avant sans compte. Avec un compte, ton historique est gardé en ligne : tu le retrouves si tu changes de téléphone ou si tu réinstalles l'app, et tes médailles déjà gagnées ne s'affichent pas une deuxième fois. Tu peux aussi choisir le nom qui s'affiche sur ton Profil.",
      },
      {
        icon: 'lock',
        text: "Ta sécurité, c'est un point d'honneur. Ton mot de passe n'est jamais gardé en clair, aucun autre utilisateur ne peut voir ton historique, et l'app ne dit jamais si une adresse email a déjà un compte. Tu gardes aussi la main : depuis les Paramètres, tu peux supprimer ton compte quand tu veux. Tout est alors effacé pour de bon : ton compte, ton historique en ligne et tes MIX publiés.",
      },
      {
        icon: 'no-ads',
        text: "Les conditions d'utilisation et la politique de confidentialité sont réécrites avec des mots simples : ce qui reste sur ton téléphone, ce qui est enregistré en ligne, et pourquoi. L'app demande aussi moins d'autorisations (plus de micro, plus d'accès aux fichiers), parce qu'elle n'en a jamais eu besoin. Toujours aucune pub, et tes données ne sont jamais vendues.",
      },
      {
        icon: 'globe',
        text: "Découvre le fil public : des MIX créés par d'autres sportifs. Trie-les par catégorie ou par meilleures notes, et teste-les tout de suite. Avec un compte, tu peux en enregistrer chez toi et leur donner de 1 à 5 étoiles. Sans compte, tu peux regarder et tester, mais pas enregistrer ni noter.",
      },
      {
        icon: 'share',
        text: "Tu peux publier ton propre MIX dans le fil public, en choisissant sa catégorie, et le retirer quand tu veux. Le menu de partage est refait : un onglet pour envoyer, un pour recevoir, avec un aperçu avant d'envoyer. Envoyer un MIX à un ami par lien marche toujours, avec ou sans compte. Un MIX qui ne va pas peut être signalé : à trois signalements, il disparaît du fil tout seul.",
      },
      {
        icon: 'trophies',
        text: "Un vrai Profil t'attend depuis l'accueil : tes disciplines (deux au maximum), ta régularité, ton calendrier d'entraînement, tes séances par format et tes trophées, calculés avec tes vraies séances. Tu peux aussi partager ta dernière séance. Les Paramètres sont maintenant dedans, derrière l'engrenage.",
      },
      {
        icon: 'clock',
        text: "Le Planning devient plus complet : chaque exercice peut avoir son propre chrono (AMRAP, BASIC, EMOM ou TABATA), dont les tours et le repos suivent tes séries et ton repos. Le repos s'écrit plus clairement (1 min 30 au lieu de 90 s) et une charge à zéro s'affiche PDC, pour poids du corps. Quand un bloc a un chrono, sa carte s'allume : reste appuyé 2 secondes dessus pour composer une séance qui enchaîne ses exercices, avec un petit repos entre chacun.",
      },
      {
        icon: 'note',
        text: "Chaque bloc d'un MIX peut avoir sa note (par exemple Pompes 3x15, Dips 3x12), bien visible dans la liste pour te rappeler ce qu'il contient. Tu l'écris toi-même ou tu l'importes depuis un jour de ton Planning, et elle part avec le MIX quand tu le partages.",
      },
      {
        icon: 'help',
        text: "Pour mieux comprendre chaque format : les points en bas de l'accueil ouvrent un aperçu des 5 formats (un appui long montre à quoi sert chacun). Dans l'explication d'un format, tu vois tes réglages actuels, et un bouton mène à une page plus complète : d'où il vient et dans quels sports on le retrouve. Et si tu n'as jamais essayé la voix du coach, l'app te la propose après quelques séances.",
      },
      {
        icon: 'sessions',
        text: "Une séance très courte, ou arrêtée tout au début, est proposée à la suppression. Tu as une journée entière pour changer d'avis avant qu'elle disparaisse pour de bon.",
      },
      {
        icon: 'crown',
        text: "Pour la bêta : appuie 10 fois d'affilée sur le bandeau Pro, dans les Paramètres, pour passer en mode Pro et tout essayer sans limite (10 nouveaux appuis te ramènent en arrière). Dans le Profil, l'analyse avancée s'affiche en aperçu tant que tu n'es pas Pro.",
      },
      {
        icon: 'sliders',
        text: "Petits plus : juste après avoir lancé un MIX, le bouton pour le modifier répond maintenant à chaque fois. En réglant le volume, chaque appui joue un son du compte à rebours pour mieux juger le niveau. Copier le lien d'un MIX est aussi devenu plus fiable.",
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
