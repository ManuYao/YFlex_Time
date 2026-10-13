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
    // Publiée pendant la maintenance : entrée générique, détail dans CHANGELOG_BACKLOG.
    version: '16.22.1',
    date: '13 oct. 2026',
    summary: "Petites améliorations et corrections pendant la maintenance.",
    items: [
      {
        icon: 'gear',
        text: "Petites améliorations et corrections pendant la maintenance.",
      },
    ],
  },
  {
    // Publiée pendant la maintenance : entrée générique, détail dans CHANGELOG_BACKLOG.
    version: '16.22.0',
    date: '13 oct. 2026',
    summary: "Petites améliorations et corrections pendant la maintenance.",
    items: [
      {
        icon: 'gear',
        text: "Petites améliorations et corrections pendant la maintenance.",
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
export const CHANGELOG_BACKLOG = [
  {
    version: '16.22.1',
    date: '13 oct. 2026',
    items: [
      "Pendant une maintenance simple (sans blocage), une mise à jour ne lance plus que l'intro de base, courte, sans « NOUVELLE VERSION ».",
      "Retrait de la section « Test » des Paramètres (forcer une saison, rejouer l'intro).",
    ],
  },
  {
    version: '16.22.0',
    date: '13 oct. 2026',
    items: [
      "Ambiance de saison : la saison suivante prend désormais toute la place en fin de saison (environ 50 % vers le milieu des trois dernières semaines, 100 % le dernier jour) au lieu de s'arrêter à 35 %. Couleurs mélangées, motifs remplacés un à un.",
    ],
  },
  {
    version: '16.21.1',
    date: '13 oct. 2026',
    items: [
      "Intro de mise à jour : l'écart entre le logo et « NOUVELLE VERSION » est réglé (un peu moins grand qu'avant, un peu plus grand que dans la 16.21.0).",
    ],
  },
  {
    version: '16.21.0',
    date: '13 oct. 2026',
    items: [
      "Ambiance de saison : pendant les trois dernières semaines d'une saison, la suivante se glisse peu à peu dans les couleurs et les motifs (jamais plus de 35 %). Une note dans le réglage prévient que les effets demandent un peu plus de puissance sur un téléphone ancien.",
      "Fin de séance : décor et confettis aux couleurs de la saison (rien si l'ambiance est sur « Aucune »).",
      "Nettoyage : retrait de l'ancien code de partage de texte (bilan, app), plus utilisé depuis le retrait des boutons.",
      "Intro de mise à jour : « NOUVELLE VERSION » un peu remonté.",
    ],
  },
  {
    version: '16.20.0',
    date: '13 oct. 2026',
    items: [
      "Intro de démarrage déclinée pour chaque saison et chaque fête (fond, lumières et motifs de la saison). Version longue : le nom de la saison s'écrit tout en bas, à chaque mise à jour et à chaque nouvelle saison ou nouveau moment (Halloween, fin d'année…). « FLEX TIMER » ne chevauche plus la fine couronne.",
      "Lancement d'un chrono : l'animation ne part plus de côté après un glissé gauche ou droite ; couleurs adaptées au mode (plus de jaune sur jaune sur TABATA).",
      "Corrigé : quitter le décompte ou la séance pouvait ramener dans le Profil. Le retour Android annule maintenant proprement le lancement ou le décompte, et les retours à l'accueil vident la pile.",
      "Paramètres : boutons de test pour forcer une saison et rejouer l'intro (courte, longue mise à jour, longue nouvelle saison) sur place.",
    ],
  },
  {
    version: '16.19.0',
    date: '13 oct. 2026',
    items: [
      "Intro de démarrage : un zoom dans l'espace vers le logo. Décor d'espace teinté de la couleur de la saison (brun chaud en automne), étoiles fines à trois profondeurs, quelques motifs de la saison qui passent ; l'emblème grossit doucement ; l'anneau (proportions du reel, graduations fines aux quatre couleurs) tourne autour du F une fois, ou deux si la page derrière met du temps à charger ; à la fin tous les éléments disparaissent, un court instant de vide, puis le vrai écran apparaît avec un petit zoom. L'intro dure le temps du chargement (6 s de patience au plus).",
      "Version longue (après une mise à jour) : deux tours, NOUVELLE VERSION, se referme à la fin du dernier son.",
      "Nouveau composant SpaceBackdrop (décor d'espace) réutilisable comme temps de chargement ailleurs.",
    ],
  },
  {
    version: '16.18.2',
    date: '13 oct. 2026',
    items: [
      "Intro de démarrage simplifiée : notre icône (anneau aux quatre couleurs, fine couronne, F) sur un fond dessiné, qui apparaît en fondu doux. Plus d'ouverture « en porte », plus d'étincelles ni d'éléments qui bougent. Un seul dessin pour l'instant (pas de variante par saison), en version courte et en version longue (après une mise à jour).",
      "Paramètres : un seul bouton de test reste, il rejoue l'intro en alternant courte / longue ; les autres boutons de test sont retirés.",
    ],
  },
  {
    version: '16.18.1',
    date: '13 oct. 2026',
    items: [
      "Transition de lancement refaite en élément partagé : l'anneau de la carte reste en place, le point lumineux du bouton Lancer le rejoint, puis l'anneau tourne sur lui-même comme une pièce et glisse jusqu'à sa place exacte du décompte (même position, même taille). Plus lente (2,8 s).",
      "Intro de démarrage : l'emblème (anneau et F) tourne comme une pièce en perspective, les graduations prennent leurs couleurs en vague, le F se pose ; une vraie pause pour le lire (3,3 s au total, avant 1,9 s) ; nom FLEX TIMER ajouté.",
      "Chaque animation (intro, transition, décompte) ne démarre qu'une fois tout monté et dessiné, pour éviter un à-coup au départ ; le son part avec l'image.",
    ],
  },
  {
    version: '16.18.0',
    date: '13 oct. 2026',
    items: [
      "Nouvelle transition de lancement : le bouton Lancer devient un point lumineux qui allume l'anneau, puis le décompte s'enchaîne sans coupure (anneau qui se remplit jusqu'au GO). Aux couleurs de la saison quand l'ambiance est active.",
      "Nouvelle intro de démarrage (anneau et F de l'icône qui s'allument), pétillante, avec le fond, les couleurs et un petit mot de la saison si l'ambiance est active. Courte au quotidien ; plus longue après une mise à jour (les deux sons), elle se referme quand le dernier son est fini.",
      "L'intro attend que l'accueil soit prêt avant de se refermer ; après une mise à jour, « Quoi de neuf » apparaît après une courte pause.",
      "Bilan de saison : le décor suit la saison racontée ; boutons de partage de texte retirés.",
    ],
  },
  {
    version: '16.17.1',
    date: '12 oct. 2026',
    items: [
      "Après une mise à jour, le démarrage joue l'intro puis une seconde mélodie.",
    ],
  },
  {
    version: '16.17.0',
    date: '12 oct. 2026',
    items: [
      "Bilan de saison : à chaque fin de saison (3 mois), un récap animé de tes stats ; plus de cartes avec Premium. Rouvrable depuis le Profil.",
      "Publier un mix, télécharger un mix du fil et partager l'app sont proposés à trois endroits de l'app, avec une phrase qui explique.",
      "Boutons ronds sans couronne de graduations, points de pagination blancs.",
    ],
  },
  {
    version: '16.16.0',
    date: '12 oct. 2026',
    items: [
      "Ambiance de saison : fond, lumière et décors discrets qui suivent la date (Paramètres › Ambiance de saison : Auto / Saisons / Aucune).",
      "TABATA et MIX : lancements illimités et gratuits ; la bibliothèque de MIX est limitée en gratuit (3 créés, 5 téléchargés, 4 publiés).",
      "Séance : l'anneau et la barre du haut ne reculent plus jamais.",
      "Boutons et icônes retouchés (halo, liseré).",
    ],
  },
  {
    version: '16.15.0',
    date: '12 oct. 2026',
    items: [
      "Une séance MIX allume aussi la flamme de chaque mode qu'elle contient (une par mode).",
      "Un nouveau bloc du MIX n'a plus de nom imposé (affiché « Sans nom » tant qu'il n'est pas nommé).",
      "Bloc REPOS du MIX : durée réglée en minutes entières (1 à 5 min).",
    ],
  },
];
