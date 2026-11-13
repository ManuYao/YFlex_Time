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
    version: '18.8.17',
    date: '13 nov. 2026',
    summary: "Petites améliorations et corrections pendant la maintenance.",
    items: [
      { icon: 'sliders', text: "Petites améliorations et corrections pendant la maintenance." },
    ],
  },
  {
    version: '18.8.16',
    date: '13 nov. 2026',
    summary: "Petites améliorations et corrections pendant la maintenance.",
    items: [
      { icon: 'sliders', text: "Petites améliorations et corrections pendant la maintenance." },
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
    version: '18.8.17',
    date: '13 nov. 2026',
    summary: "Mode pluie : Reset se maintient 2 s.",
    items: [
      { icon: 'sliders', text: "En mode Pluie, le bouton Reset se maintient 2 s (au lieu de 2,5 s)." },
    ],
  },
  {
    version: '18.8.16',
    date: '13 nov. 2026',
    summary: "Mode pluie : retour au comportement d'avant.",
    items: [
      { icon: 'sliders', text: "En mode Pluie, la pause et « Fin du travail » redeviennent directs (un appui) ; seuls Retour, Reset, Skip et Quitter se maintiennent. Le maintien complet reste le rôle du mode Orage." },
    ],
  },
  {
    version: '18.8.15',
    date: '12 nov. 2026',
    summary: "Mode pluie : « Fin du travail » se maintient.",
    items: [
      { icon: 'sliders', text: "En mode Pluie, le bouton central « Fin du travail » (qui saute au bloc suivant) demande un maintien de 0,7 s : plus de faux appui avec le téléphone en poche." },
    ],
  },
  {
    version: '18.8.14',
    date: '12 nov. 2026',
    summary: "MIX : temps de travail faux avec plusieurs BASIC.",
    items: [
      { icon: 'sliders', text: "Dans un MIX avec plusieurs blocs BASIC, le temps de travail du récap pouvait dépasser la durée totale (2 h 25 pour 52 min). Corrigé dans le calcul ; les anciennes séances sont bornées à l'affichage." },
    ],
  },
  {
    version: '18.8.13',
    date: '12 nov. 2026',
    summary: "Durées au-delà d'une heure en heures et minutes.",
    items: [
      { icon: 'sliders', text: "Au-delà d'une heure, les durées du récap de fin de séance, du détail d'une séance et de l'historique s'affichent en heures et minutes (1h16) au lieu de 76:00, sans secondes." },
    ],
  },
  {
    version: '18.8.12',
    date: '12 nov. 2026',
    summary: "Durées au-delà d'une heure en HH:MM:SS.",
    items: [
      { icon: 'sliders', text: "Au-delà d'une heure, les durées du récap de fin de séance, du détail d'une séance et de l'historique s'affichent en heures (01:20:00) au lieu de 80:00." },
    ],
  },
  {
    version: '18.8.11',
    date: '11 nov. 2026',
    summary: "L'intro garde la saison quand la batterie est faible.",
    items: [
      { icon: 'sliders', text: "Quand la batterie est faible, l'intro de démarrage garde les couleurs de la saison au lieu de retomber sur l'intro neutre (neutre seulement à 10 % ou moins)." },
    ],
  },
  {
    version: '18.8.10',
    date: '11 nov. 2026',
    summary: "Trophées : section en travaux.",
    items: [
      { icon: 'trophies', text: "La section Trophées du profil est floutée pendant qu'on prépare de nouveaux trophées (objectifs, jeux…)." },
    ],
  },
  {
    version: '18.8.9',
    date: '11 nov. 2026',
    summary: "L'app ne surveille plus la batterie quand elle est fermée.",
    items: [
      { icon: 'sliders', text: "La surveillance de la batterie et de la chauffe s'arrête dès que l'app passe en arrière-plan et reprend à ton retour : le téléphone n'est plus réveillé pour rien." },
    ],
  },
  {
    version: '18.8.9',
    date: '11 nov. 2026',
    summary: "Le bouton Stop de la notification rouvre bien l'app.",
    items: [
      { icon: 'sliders', text: "Quand tu arrêtes la séance depuis la notification, l'app revient bien au premier plan sur l'écran de fin (comme le tap sur la notification). Pause, Reprendre et Passer restent sans ouvrir l'app." },
    ],
  },
  {
    version: '18.8.8',
    date: '11 nov. 2026',
    summary: "Batterie faible : le fond de saison reste, en version fixe.",
    items: [
      { icon: 'sliders', text: "Quand la batterie descend à 20 %, les décors animés s'arrêtent mais le fond aux couleurs de la saison reste, figé, pour garder l'ambiance sans consommer. À 10 %, il disparaît aussi pour économiser le maximum." },
    ],
  },
  {
    version: '18.8.7',
    date: '11 nov. 2026',
    summary: "La notification du chrono est moins sollicitée pendant les longues séances.",
    items: [
      { icon: 'sliders', text: "Pendant une séance, la notification du chrono ne se réécrit plus à chaque seconde : c'est le chronomètre intégré à Android qui fait défiler le temps. Le téléphone chauffe moins et la batterie dure un peu plus sur les longues séances." },
    ],
  },
  {
    version: '18.8.6',
    date: '11 nov. 2026',
    summary: "L'icône de saison et l'annonce de la nouvelle saison changent maintenant exactement le même jour.",
    items: [
      { icon: 'sliders', text: "Le décor de l'écran de démarrage suit désormais le même calendrier que l'icône de l'application : les deux changent de saison le même jour, sans décalage entre les deux." },
    ],
  },
  {
    version: '18.8.4',
    date: '11 nov. 2026',
    summary: "La voix de la pyramide ne saute plus de chiffre.",
    items: [
      { icon: 'voice', text: "Pyramide : la voix compte maintenant chaque série d'un seul trait (« 1, 2, 3… ») au lieu de lancer chaque chiffre à part : plus de chiffre muet ni de chiffre sauté. Elle ralentit par paliers au fil de la pyramide." },
    ],
  },
  {
    version: '18.8.3',
    date: '11 nov. 2026',
    summary: "Écran de repos plus léger : le rappel de « Ma séance » passe tout en bas, la bulle du poids fait n'apparaît que pendant l'exercice.",
    items: [
      { icon: 'sliders', text: "Pendant un repos de MIX, le rappel « Machine prise ? Maintiens le cercle 2 s » est tout en bas, sous les boutons, et ne pousse plus le cercle vers le haut." },
      { icon: 'sliders', text: "La bulle de poids fait n'apparaît que pendant l'exercice en cours, plus pendant le repos (le poids prévu du prochain exercice reste sur la carte « Ensuite »)." },
    ],
  },
  {
    version: '18.8.1',
    date: '11 nov. 2026',
    summary: "« Ma séance » : on maintient le cercle 2 secondes (jauge visible) et on peut avancer ou reculer un exercice d'un cran.",
    items: [
      { icon: 'sliders', text: "Pour ouvrir « Ma séance », tu maintiens le grand cercle 2 secondes : il se remplit pendant l'appui, comme les autres boutons à maintenir. (Le petit rappel affiché pendant les repos a été retiré en 18.8.2 : trop d'éléments à l'écran.)" },
      { icon: 'sliders', text: "En plus de « Faire maintenant » et « Reporter à la fin », chaque exercice à venir peut avancer ou reculer d'un seul cran." },
    ],
  },
  {
    version: '18.8.0',
    date: '11 nov. 2026',
    summary: "Machine occupée en MIX : tu réorganises les exercices à venir ; un petit tutoriel explique le constructeur.",
    items: [
      { icon: 'sliders', text: "Pendant le repos d'un MIX, un appui long sur le grand cercle ouvre « Ma séance » : tu vois ce qui est fait, ce qui vient, et tu peux faire un exercice tout de suite ou le reporter à la fin (utile quand la machine est prise). En plein effort la liste reste en lecture seule." },
      { icon: 'sliders', text: "Un court tutoriel présente le constructeur de MIX à la première visite (blocs, repos, kg et réorganisation) ; il se rouvre depuis les Paramètres." },
    ],
  },
  {
    version: '18.7.3',
    date: '10 nov. 2026',
    summary: "Pendant le repos d'un MIX, tu vois le poids du prochain exercice et tu peux le changer.",
    items: [
      { icon: 'sliders', text: "Pendant un repos, la carte « Ensuite » affiche la charge prévue du prochain exercice (ou « poids de corps »), pour préparer la machine à l'avance, et on peut la modifier d'un geste. La bulle de charge du bas dit clairement qu'elle concerne le poids de l'exercice qui vient d'être fait." },
    ],
  },
  {
    version: '18.7.2',
    date: '10 nov. 2026',
    summary: "Création d'un bloc du planning plus claire : groupes choisis mis en avant.",
    items: [
      { icon: 'sliders', text: "En créant un bloc du planning, la pastille Cardio disparaît sous le corps. Dans la liste d'exercices, les groupes choisis pour le bloc passent en premier, côte à côte, et restent colorés pour passer de l'un à l'autre plus vite." },
    ],
  },
  {
    version: '18.7.1',
    date: '10 nov. 2026',
    summary: "Plus de message quand le téléphone chauffe ou que la batterie est faible.",
    items: [
      { icon: 'bolt', text: "Quand le téléphone chauffe ou que la batterie est faible, les décors se ralentissent ou se coupent toujours tout seuls, mais sans plus aucun message à l'écran." },
    ],
  },
  {
    version: '18.7.0',
    date: '10 nov. 2026',
    summary: "Le petit film qui montrait le mouvement d'un exercice a été retiré.",
    items: [
      { icon: 'sliders', text: "Le petit film qui montrait comment faire un exercice (dans sa fiche, et pendant une séance) a été retiré le temps de le refaire correctement. Tout le reste de la fiche d'exercice fonctionne normalement." },
    ],
  },
  {
    version: '18.6.6',
    date: '11 nov. 2026',
    summary: "Les décors reviennent plus vite après une batterie faible.",
    items: [
      { icon: 'bolt', text: "Après une batterie faible, les décors animés reviennent dès que la batterie reste à 25 % ou plus pendant 3 minutes (avant : 20 minutes)." },
    ],
  },
  {
    version: '18.6.4',
    date: '11 nov. 2026',
    summary: "Mode allégé selon la chauffe, et anneaux de graduations plus légers.",
    items: [
      { icon: 'bolt', text: "Quand le téléphone chauffe, les effets de décor (saisons, braises, lueurs, reflets) ralentissent d'abord, puis s'arrêtent s'il chauffe vraiment ; ils reviennent après dix minutes au frais, jamais devant tes yeux. Les flammes de série restent." },
      { icon: 'sliders', text: "Les anneaux de graduations sont dessinés plus simplement, pour ménager l'accueil et l'écran de séance : l'aspect ne change pas." },
    ],
  },
  {
    version: '18.6.2',
    date: '11 nov. 2026',
    summary: "Économie de batterie : message plus discret.",
    items: [
      { icon: 'bolt', text: "Quand les décors animés se coupent pour économiser la batterie, un petit message semi-transparent l'explique, puis disparaît tout seul ou d'un toucher." },
    ],
  },
  {
    version: '18.6.1',
    date: '11 nov. 2026',
    summary: "Économie de batterie : les décors animés se coupent à 20 %.",
    items: [
      { icon: 'bolt', text: "Quand la batterie du téléphone descend à 20 %, les décors animés (saisons, braises) se coupent d'eux-mêmes pour économiser. Les flammes de série restent. Ils reviennent après 20 minutes à 25 % ou plus, et jamais devant tes yeux : le changement se fait quand tu changes d'écran." },
    ],
  },
  {
    version: '18.6.0',
    date: '10 nov. 2026',
    summary: "APK de mesure : mémoire totale, chauffe et processeur par fil dans l'écran Mémoire.",
    items: [
      { icon: 'sliders', text: "Nouvelle version de l'application avec un outil de mesure plus complet (mémoire totale, chauffe du téléphone, travail de chaque fil), pour repérer ce qui ralentit l'app." },
    ],
  },
  {
    version: '18.5.4',
    date: '10 nov. 2026',
    summary: "Préparation de la mesure de la mémoire totale et de la chauffe.",
    items: [
      { icon: 'sliders', text: "L'écran Mémoire est prêt à afficher la mémoire totale, la chauffe et le processeur dès la prochaine version de l'application." },
    ],
  },
  {
    version: '18.5.3',
    date: '10 nov. 2026',
    summary: "Gros allègement : écran de séance, accueil, constructeur de MIX et synchronisation.",
    items: [
      { icon: 'sliders', text: "Pendant une séance, l'écran travaille environ dix fois moins (il se refaisait en entier dix fois par seconde), donc le téléphone chauffe moins sur un long MIX." },
      { icon: 'sliders', text: "Accueil plus fluide quand on change de mode, et le maintien du cercle ne peut plus s'ouvrir tout seul en plein glissé." },
      { icon: 'sliders', text: "Constructeur de MIX : avec beaucoup de blocs, régler ou déplacer un bloc ne refait plus toute la liste." },
      { icon: 'sliders', text: "La synchronisation de l'historique après une séance rend la main à l'écran, et l'app garde moins de lecteurs audio inutiles." },
    ],
  },
  {
    version: '18.5.2',
    date: '10 nov. 2026',
    summary: "Mesure de fluidité, et maintien du cercle qui ne se déclenche plus tout seul.",
    items: [
      { icon: 'sliders', text: "Le compteur des paramètres mesure maintenant la fluidité : images par seconde, moments où l'app se fige, avec un journal des pires moments." },
      { icon: 'sliders', text: "Un maintien long (le cercle des trophées, par exemple) ne peut plus aboutir tout seul quand le téléphone se fige un instant." },
    ],
  },
  {
    version: '18.5.1',
    date: '9 nov. 2026',
    summary: "Après une séance, l'app libère les sons de la voix du coach.",
    items: [
      { icon: 'voice', text: "Après une longue séance avec le coach vocal, l'app libère maintenant tout ce que la voix avait gardé en mémoire, pour que le menu reste fluide." },
    ],
  },
  {
    version: '18.5.0',
    date: '9 nov. 2026',
    summary: "Accueil plus fluide après un réglage, et un outil pour mesurer la mémoire.",
    items: [
      { icon: 'sliders', text: "Quand tu changes un réglage d'un mode, seule sa carte se met à jour (avant, les cinq se refaisaient), donc passer d'un mode à l'autre reste fluide." },
      { icon: 'sliders', text: "Nouveau dans les paramètres : « Mémoire ». Un petit outil qui mesure ce que l'app garde en mémoire, avec un compteur facultatif sur tous les écrans." },
    ],
  },
  {
    version: '18.4.1',
    date: '9 nov. 2026',
    summary: "Roue des charges : plus fluide, même sur un long défilement.",
    items: [
      { icon: 'sliders', text: "Quand tu fais défiler les charges en pleine séance (de 0 jusqu'à 70 kg par exemple), la roue ne ralentit plus à mesure que tu montes." },
    ],
  },
  {
    version: '18.4.0',
    date: '8 nov. 2026',
    summary: "Planning : changer l'ordre des exercices d'un bloc.",
    items: [
      { icon: 'list', text: "Dans le planning, tu peux changer l'ordre des exercices d'un bloc sans rien supprimer : menu du bloc, « Ordre des exercices », puis les flèches haut et bas." },
    ],
  },
  {
    version: '18.1.1',
    date: '8 nov. 2026',
    summary: "Le corps du planning répond du premier coup.",
    items: [
      { icon: 'sliders', text: "Dans un nouveau bloc du planning, toucher un muscle sur le corps demandait parfois deux ou trois essais. Le corps reconnaît maintenant le muscle visé du premier coup, même si ton doigt tombe juste au bord ou entre deux muscles." },
    ],
  },
  {
    version: '17.12.1',
    date: '8 nov. 2026',
    summary: "Les muscles du corps s'allument bien quand tu les touches.",
    items: [
      { icon: 'sliders', text: "Dans un nouveau bloc du planning, toucher un muscle sur le corps ne faisait rien : le contour du dessin prenait l'appui à sa place. C'est réglé, le muscle s'allume tout de suite." },
    ],
  },
  {
    version: '17.12.0',
    date: '8 nov. 2026',
    summary: "Dans le planning, tu crées un bloc en touchant les muscles sur un corps.",
    items: [
      { icon: 'plus', text: "Nouveau bloc dans le planning : un corps vu de face et de dos s'affiche, tu touches les muscles que tu veux travailler et ils s'allument à la couleur de leur groupe. Le nom du bloc se remplit tout seul, puis la liste des exercices s'ouvre directement sur le bon groupe. Le cardio et tes groupes perso restent à portée de doigt juste en dessous." },
    ],
  },
  {
    version: '17.11.41',
    date: '7 nov. 2026',
    summary: "Une ligne « Tutoriel » dans les Paramètres.",
    items: [
      { icon: 'help', text: "Dans les Paramètres, une ligne « Tutoriel » se déplie pour relancer quand tu veux le tour de l'accueil, l'astuce du maintien du cercle, la proposition des jeux et l'astuce pour noter l'exercice d'un score. Tout est rangé au même endroit, sans allonger la page." },
    ],
  },
  {
    version: '17.11.40',
    date: '7 nov. 2026',
    summary: "Les bulles éclairent maintenant exactement le bon bouton.",
    items: [
      { icon: 'sliders', text: "Dans les visites en bulles de l'accueil, le cercle lumineux tombait parfois un peu à côté du bouton (le Profil par exemple), car on le mesurait pendant que la barre du haut finissait d'apparaître. On attend maintenant qu'elle soit posée." },
    ],
  },
  {
    version: '17.11.39',
    date: '7 nov. 2026',
    summary: "Une petite visite pour montrer le maintien du cercle.",
    items: [
      { icon: 'medal', text: "Après ta 3ᵉ séance, deux bulles te montrent qu'en maintenant le cercle du milieu d'un chrono, sur n'importe quel mode, tu vois tes trophées et des infos sur ce chrono, et que tu les retrouves aussi dans ton Profil. Elle ne vient qu'une fois, et pas du tout si tu as déjà trouvé le maintien toi-même. Pour les testeurs déjà installés, à partir du 15 novembre." },
    ],
  },
  {
    version: '17.11.38',
    date: '7 nov. 2026',
    summary: "Une proposition pour découvrir les jeux.",
    items: [
      { icon: 'puzzle', text: "Une petite fenêtre te propose d'essayer les jeux, une seule fois : à ta 5ᵉ ouverture de l'app si tu viens d'arriver, à partir du 15 novembre pour les testeurs déjà installés. Elle ne revient pas si tu as déjà joué." },
    ],
  },
  {
    version: '17.11.37',
    date: '7 nov. 2026',
    summary: "Noter l'exercice d'un score dans les trois jeux.",
    items: [
      { icon: 'edit', text: "Le chef d'orchestre et le combo ont maintenant, comme la pyramide, le halo sur ton dernier score, le maintien d'une seconde (avec la barre qui se remplit) pour noter l'exercice que tu as fait, et ta liste d'exercices à toi, la même dans les trois jeux. Dans le combo, les deux exercices que tu as écrits sont déjà cochés. L'exercice s'affiche sur la ligne du score et dans l'Historique. La bulle d'explication est la même pour les trois jeux : elle ne s'affiche qu'une fois, jusqu'à ce que tu cliques sur « Compris »." },
    ],
  },
  {
    version: '17.11.36',
    date: '7 nov. 2026',
    summary: "Bulle du maintien validée : elle suit maintenant sa vraie règle.",
    items: [
      { icon: 'edit', text: "La bulle qui explique comment noter l'exercice d'un score est validée. Elle s'affiche à la toute première partie finie ; « Compris » la supprime pour de bon, « Passer » la fait revenir trois parties plus tard (trois fois au plus)." },
    ],
  },
  {
    version: '17.11.35',
    date: '7 nov. 2026',
    summary: "La bulle du maintien s'affiche sur le menu du jeu, sur ton dernier score.",
    items: [
      { icon: 'edit', text: "La bulle qui explique comment noter l'exercice n'apparaît plus sur l'écran de résultat : elle apparaît quand tu reviens au menu du jeu, juste sur ton dernier score (le menu défile tout seul pour te le montrer). Si tu notes un exercice, elle comprend que tu as compris et disparaît. La démo des Paramètres arrive sur ce même menu, avec un score d'exemple." },
    ],
  },
  {
    version: '17.11.34',
    date: '6 nov. 2026',
    summary: "Jeux : la flèche revient au menu du jeu, « Rejouer » rejoue vraiment, bulle revue.",
    items: [
      { icon: 'sliders', text: "Sur l'écran de résultat d'un jeu, la flèche en haut à gauche (et le retour d'Android) te ramène au menu de CE jeu, plus au menu des jeux. Le bouton « Rejouer » rejoue vraiment : le décompte repart tout de suite avec les mêmes réglages. La bulle qui explique le maintien du score a maintenant « Passer » et « Compris » : « Compris » la fait disparaître pour toujours, « Passer » la fait revenir trois parties plus tard (trois fois au plus). Les exercices que tu ajoutes sont bien gardés pour tous tes scores, même depuis la démo." },
    ],
  },
  {
    version: '17.11.33',
    date: '6 nov. 2026',
    summary: "Maintenir un score : une barre se remplit. Astuce rejouable depuis les Paramètres.",
    items: [
      { icon: 'edit', text: "Quand tu maintiens ton score dans la pyramide, une barre de couleur le remplit de gauche à droite avec de petites vibrations, puis la fenêtre de l'exercice s'ouvre ; si tu relâches avant, elle redescend. La bulle qui explique le geste ne s'affiche que si elle a vraiment pu s'afficher, et tu peux la revoir à tout moment depuis les Paramètres (À propos › Revoir l'astuce des jeux), sans jouer." },
    ],
  },
  {
    version: '17.11.32',
    date: '6 nov. 2026',
    summary: "Mes exercices : ajout visible, liste qui défile, gardée pour tous les jeux, suppression.",
    items: [
      { icon: 'edit', text: "Quand tu ajoutes ton propre exercice, il apparaît tout de suite en premier, déjà choisi. La liste des exercices défile s'il y en a beaucoup. Ce que tu ajoutes est gardé une fois pour toutes, pour tous les jeux : tu n'as plus à le retaper. Un petit × sur tes exercices permet de le supprimer de ta liste pour de bon (les parties déjà notées gardent leur texte)." },
    ],
  },
  {
    version: '17.11.31',
    date: '6 nov. 2026',
    summary: "Pyramide : halo fixe et discret, et un retour visuel quand on maintient le score.",
    items: [
      { icon: 'edit', text: "Le halo autour du score ne pulse plus : c'est un contour fixe, plus discret, qui fait tout le tour. Quand tu appuies sur ton score, il s'enfonce légèrement, et si tu le maintiens le contour s'allume peu à peu jusqu'à l'ouverture de la fenêtre ; si tu relâches avant, il retombe." },
    ],
  },
  {
    version: '17.11.30',
    date: '6 nov. 2026',
    summary: "Pyramide : noter l'exercice fait, en maintenant son score.",
    items: [
      { icon: 'edit', text: "Dans la pyramide, ton score est entouré d'un halo tant que tu n'as pas dit quel exercice tu as fait. Maintiens-le une seconde : une petite fenêtre te propose quelques fiches (pompes, tractions, squat…), tu en choisis deux au plus, ou tu ajoutes la tienne. Rien ne s'ouvre tout seul ; la toute première fois, une bulle t'explique le geste. L'exercice s'affiche sur ta ligne de score et dans l'Historique." },
    ],
  },
  {
    version: '17.11.29',
    date: '6 nov. 2026',
    summary: "Les jeux comptent dans l'historique : une catégorie JEU, avec le temps.",
    items: [
      { icon: 'clock', text: "Une partie de jeu est maintenant une vraie séance : elle apparaît dans l'Historique sous la catégorie « JEU » (avec un filtre pour la retrouver), avec son temps, le nombre de répétitions et le jeu joué. Son temps s'ajoute au total, à la série de jours et aux stats du profil, puisque c'est un exercice comme un autre. Les jeux ne donnent pas de trophées de mode, et un bouton « Rejouer » rouvre le jeu depuis le détail." },
    ],
  },
  {
    version: '17.11.28',
    date: '6 nov. 2026',
    summary: "Chef d'orchestre : plus de choix d'exercice, comme la pyramide.",
    items: [
      { icon: 'clock', text: "Dans le chef d'orchestre aussi, plus de choix de muscle ni d'exercice : tu choisis seulement la vitesse (Tranquille, Normal, Rapide) et tu lances. La voix compte au rythme des pompes, et les silences tombent à intervalles variés, ni trop tôt ni trop tard. Plus de nom d'exercice à l'écran, et un seul record pour tous les scores." },
    ],
  },
  {
    version: '17.11.27',
    date: '6 nov. 2026',
    summary: "Pyramide : plus de choix d'exercice, un seul rythme pour tout.",
    items: [
      { icon: 'clock', text: "Dans la pyramide, il n'y a plus de choix de muscle ni d'exercice : tu lances, tu fais l'exercice que tu veux. La voix compte toujours au rythme des pompes, qui convient à la plupart des exercices, et elle ralentit doucement vers la fin. Plus aucun nom d'exercice à l'écran : seulement le chiffre à faire. Le mot « REPOS » est un peu plus clair. Les records se comparent maintenant par format et sommet." },
    ],
  },
  {
    version: '17.11.26',
    date: '6 nov. 2026',
    summary: "Pyramide : le mot REPOS est réglé plus finement.",
    items: [
      { icon: 'clock', text: "Dans la pyramide, le mot « REPOS » au centre de l'anneau est réglé à 76 % de blanc : bien lisible mais légèrement transparent, pour ne pas voler la vedette au chiffre à faire." },
    ],
  },
  {
    version: '17.11.25',
    date: '6 nov. 2026',
    summary: "Pyramide : le chiffre à faire est bien centré.",
    items: [
      { icon: 'clock', text: "Dans la pyramide, le chiffre orange à faire et son mot (« pompes », « tractions »…) sont maintenant l'un sous l'autre, pile au centre, comme le chiffre de l'anneau." },
    ],
  },
  {
    version: '17.11.24',
    date: '6 nov. 2026',
    summary: "Pyramide : le dessin de la pyramide se lit mieux de loin.",
    items: [
      { icon: 'clock', text: "Dans la pyramide, le dessin des séries du bas est plus haut et plus lisible de loin : la barre blanche montre la série en cours (ou la prochaine pendant le repos), on voit tout de suite si ça monte ou si ça redescend." },
    ],
  },
  {
    version: '17.11.23',
    date: '6 nov. 2026',
    summary: "Pyramide : un écran simple, une seule chose à lire.",
    items: [
      { icon: 'clock', text: "Dans la pyramide, l'écran est simplifié : plus de « série 4 sur 15 » ni de « ensuite » (la pyramide du bas montre déjà où tu en es). Sous l'anneau, un seul chiffre orange : combien de répétitions faire dans la série, ou dans la prochaine pendant le repos. Pendant le repos, l'anneau affiche « REPOS » et se remplit, sans chiffre de secondes qui se confondait avec les répétitions." },
    ],
  },
  {
    version: '17.11.22',
    date: '6 nov. 2026',
    summary: "Pyramide : le même écran pendant la série et le repos.",
    items: [
      { icon: 'clock', text: "Dans la pyramide, la série et le repos ont maintenant exactement la même mise en page : seul le contenu change, rien ne bouge ni ne change de taille. Le gros chiffre central devient le décompte en secondes (avec son « s »), et la prochaine série est écrite en grand sous l'anneau. Fini l'effet « tout change d'un coup » entre l'effort et le repos." },
    ],
  },
  {
    version: '17.11.21',
    date: '6 nov. 2026',
    summary: "Pyramide : la série en cours et la suivante se lisent de loin.",
    items: [
      { icon: 'clock', text: "Dans la pyramide, pendant le repos, le nombre de la prochaine série s'affiche en très gros et le décompte garde son « s » : fini le doute entre « 8 secondes » et « 8 répétitions »." },
      { icon: 'clock', text: "Pendant la série, le numéro de série, l'objectif et la série suivante sont écrits en grand pour se lire téléphone posé au sol." },
    ],
  },
  {
    version: '17.11.20',
    date: '5 nov. 2026',
    summary: "Pyramide : la voix ralentit doucement avec la fatigue.",
    items: [
      { icon: 'clock', text: "Dans la pyramide, plus tu avances, plus la voix prend son temps (jusqu'à un quart de temps en plus à la toute dernière répétition, par exemple 2 s puis 2,5 s pour une traction), pour que tu puisses suivre le rythme même fatigué. Le repos ne change pas." },
    ],
  },
  {
    version: '17.11.19',
    date: '5 nov. 2026',
    summary: "La pyramide ne saute plus de chiffre.",
    items: [
      { icon: 'voice', text: "Dans la pyramide, la voix ne saute plus de chiffre d'une série à l'autre : chaque chiffre a maintenant son propre lecteur, prêt dès le décompte, comme les bips." },
    ],
  },
  {
    version: '17.11.18',
    date: '5 nov. 2026',
    summary: "Les jeux comptent à un rythme plus naturel pour les tractions et les jambes.",
    items: [
      { icon: 'clock', text: "Dans les jeux, la voix compte maintenant plus vite pour les tractions (2 s au lieu de 3 s par répétition) et les tractions australiennes, et un peu plus posément pour les squats et les fentes, pour que le rythme colle au vrai mouvement." },
    ],
  },
  {
    version: '17.11.17',
    date: '3 nov. 2026',
    summary: "Pyramide : le dernier chiffre du repos se voit.",
    items: [
      { icon: 'clock', text: "Dans la pyramide, le dernier chiffre du repos (le « 1 ») prend la couleur du jeu, pour ne plus le confondre avec le « 1 » de la première répétition qui suit." },
    ],
  },
  {
    version: '17.11.16',
    date: '3 nov. 2026',
    summary: "Les jeux prennent l'ambiance de la saison, et le décompte se voit mieux.",
    items: [
      { icon: 'palette', text: "Dans les trois jeux, une fois la partie lancée, le décor de la saison apparaît (feuilles en automne, flocons en hiver…). Les écrans de réglage et le menu des jeux restent comme avant." },
      { icon: 'clock', text: "Pendant le décompte, seul le dernier chiffre « 1 » prend la couleur du jeu (orange pour la pyramide, bleu pour le chef d'orchestre, rose pour le combo) : on voit tout de suite que c'est le moment de commencer." },
    ],
  },
  {
    version: '17.11.15',
    date: '3 nov. 2026',
    summary: "Dans les jeux, seul le bip final sonne.",
    items: [
      { icon: 'speaker', text: "Dans les trois jeux, les bips 3, 2, 1 ne sonnent plus : on entend seulement le dernier bip, celui du départ. Fini les séries de bips à chaque repos de la pyramide ; les chiffres 3, 2, 1 restent affichés à l'écran." },
    ],
  },
  {
    version: '17.11.14',
    date: '3 nov. 2026',
    summary: "Les scores des jeux se rangent par jour.",
    items: [
      { icon: 'history', text: "Dans les trois jeux, les trois derniers scores restent visibles et le reste de l'historique se range dans un bloc à déplier, découpé par jour (hier, il y a 2 jours…), avec « Voir plus » : même avec 150 parties, la page reste courte." },
    ],
  },
  {
    version: '17.11.13',
    date: '3 nov. 2026',
    summary: "Les deux anneaux de l'analyse avancée se ressemblent.",
    items: [
      { icon: 'progress', text: "Dans l'analyse avancée, l'anneau de graduations en fond de « Tes jeux » ressemble maintenant à celui de « Tes séances » : seules quelques graduations s'allument en haut, au lieu de tout l'anneau." },
    ],
  },
  {
    version: '17.11.12',
    date: '3 nov. 2026',
    summary: "L'anneau de la carte des jeux est plus discret.",
    items: [
      { icon: 'progress', text: "Dans l'analyse avancée, l'anneau de graduations en fond de la carte « Tes jeux » est plus discret : il se fond dans la carte comme celui de « Tes séances » au lieu de prendre toute la place." },
    ],
  },
  {
    version: '17.11.11',
    date: '3 nov. 2026',
    summary: "La pyramide : des repos beaucoup plus courts.",
    items: [
      { icon: 'clock', text: "Dans le jeu de la pyramide, les repos entre les séries sont bien plus courts : 5 secondes jusqu'à 5 répétitions, puis une seconde de plus par répétition (8 secondes avant une série de 8). Plus de longues attentes au début : on se fatigue vraiment et on peut viser son record. Ça marche pareil en évolutif, en dégressif et en pyramide." },
    ],
  },
  {
    version: '17.11.10',
    date: '3 nov. 2026',
    summary: "L'anneau des grandes cartes ne passe plus sur les textes.",
    items: [
      { icon: 'progress', text: "Dans l'analyse avancée, l'anneau de graduations en fond des grandes cartes est un peu plus petit et passe derrière les trois repères du bas, au lieu de traverser leurs textes." },
    ],
  },
  {
    version: '17.11.9',
    date: '3 nov. 2026',
    summary: "Le « 1 » des jeux est enfin dit à voix haute.",
    items: [
      { icon: 'voice', text: "Dans les jeux qui comptent à voix haute, le « un » se faisait avaler parce que ce petit mot était trop court. Il est maintenant rallongé de silence autour de lui et relancé s'il ne démarre pas, pour qu'on l'entende à chaque fois." },
    ],
  },
  {
    version: '17.11.8',
    date: '3 nov. 2026',
    summary: "Les légendes des grandes cartes sont bien centrées sur les chiffres.",
    items: [
      { icon: 'progress', text: "Dans l'analyse avancée, la légende à côté du gros chiffre (séances, parties) est maintenant vraiment centrée sur les chiffres, sur tous les téléphones." },
    ],
  },
  {
    version: '17.11.7',
    date: '3 nov. 2026',
    summary: "L'analyse avancée est plus aérée.",
    items: [
      { icon: 'progress', text: "L'analyse avancée respire mieux : chaque rubrique d'un groupe a maintenant son propre bloc, bien séparé des autres, et les chiffres des grandes cartes sont mieux alignés avec leur légende." },
    ],
  },
  {
    version: '17.11.6',
    date: '3 nov. 2026',
    summary: "La pyramide : la voix dit enfin tous les chiffres.",
    items: [
      { icon: 'voice', text: "Dans le jeu de la pyramide, la voix compte de nouveau chaque répétition, à chaque série, y compris le « 1 » du départ. Avant, un chiffre déjà dit dans une série précédente restait muet." },
    ],
  },
  {
    version: '17.11.5',
    date: '3 nov. 2026',
    summary: "L'analyse avancée remplit mieux la page avant d'être dépliée.",
    items: [
      { icon: 'progress', text: "Les deux grands groupes de l'analyse avancée sont maintenant de belles cartes qui se partagent la page avant d'être ouvertes : ton chiffre clé en grand, un petit graphique et trois repères, avec l'anneau de graduations en filigrane." },
    ],
  },
  {
    version: '17.11.4',
    date: '3 nov. 2026',
    summary: "L'analyse avancée est rangée en groupes.",
    items: [
      { icon: 'progress', text: "L'analyse avancée est mieux rangée : deux grands groupes seulement, « Tes séances » et « Tes jeux », repliés au départ. Dedans, de petits groupes qui vont ensemble (par exemple le temps sous tension, le temps par format et la répartition des formats), au lieu d'une longue liste de cartes à ouvrir une par une." },
    ],
  },
  {
    version: '17.11.3',
    date: '3 nov. 2026',
    summary: "Les bulles du menu ne s'affichent plus qu'une seule fois.",
    items: [
      { icon: 'bulb', text: "Les petites bulles d'explication du menu ne s'affichent qu'à la toute première ouverture, puis ne reviennent plus." },
    ],
  },
  {
    version: '17.11.2',
    date: '3 nov. 2026',
    summary: "Le défilement des modes du tour guidé est plus doux.",
    items: [
      { icon: 'bulb', text: "Dans le tour guidé, les modes défilent maintenant tranquillement, avec une vraie pause entre chacun, au lieu d'un glissement vif." },
    ],
  },
  {
    version: '17.11.1',
    date: '3 nov. 2026',
    summary: "Le tour guidé montre les modes qui défilent.",
    items: [
      { icon: 'bulb', text: "Dans le tour guidé, pendant que tu lis comment choisir ton mode, le carrousel défile tout seul d'un mode à l'autre pour te les montrer, puis revient où tu étais." },
    ],
  },
  {
    version: '17.11.0',
    date: '3 nov. 2026',
    summary: "Le tour guidé se joue directement sur l'accueil, avec de petites bulles.",
    items: [
      { icon: 'bulb', text: "Le tour guidé de départ est plus rapide et plus simple : trois petites bulles directement sur l'accueil t'expliquent comment choisir un mode, le régler et le lancer. Rien ne démarre pendant l'explication, et il n'y a plus de chrono de test à faire." },
    ],
  },
  {
    version: '17.10.0',
    date: '3 nov. 2026',
    summary: "Le menu t'explique chaque entrée, et le tour guidé est plus court.",
    items: [
      { icon: 'hub', text: "La première fois que tu ouvres le menu, de petites bulles t'expliquent chaque entrée en une phrase : Mix et Partage, Historique, Planning et Jeux. Tu les passes quand tu veux." },
      { icon: 'bulb', text: "Le tour guidé est plus court : une seule page montre tout le menu, puis le Profil, et tu reviens directement à l'accueil." },
    ],
  },
  {
    version: '17.9.1',
    date: '3 nov. 2026',
    summary: "L'analyse avancée se déplie à la demande.",
    items: [
      { icon: 'progress', text: "L'analyse avancée est plus légère à lire : toutes les cartes sont repliées au départ, avec un petit chiffre-résumé visible, et tu ouvres seulement celles qui t'intéressent." },
    ],
  },
  {
    version: '17.9.0',
    date: '3 nov. 2026',
    summary: "Tes jeux ont leurs statistiques, et leur place dans le bilan de saison.",
    items: [
      { icon: 'progress', text: "Tes jeux comptent dans tes statistiques : avec Premium, la page d'analyse avancée montre maintenant tes parties, tes répétitions, tes records battus, ta progression sur tes dernières parties et ton rythme de jeu semaine par semaine. Sans Premium, chaque jeu garde ses scores dans son écran, comme avant." },
      { icon: 'season', text: "Si tu as joué pendant la saison, ton bilan de saison a maintenant une carte « Tes jeux » : parties jouées, répétitions, record de chaque jeu. Elle est identique pour tout le monde, Premium ou non." },
    ],
  },
  {
    version: '17.7.0',
    date: '3 nov. 2026',
    summary: "Nouveau jeu : Combo Bi-Exo.",
    items: [
      { icon: 'repeat', text: "Nouveau jeu, Combo Bi-Exo : tu écris deux mots (par exemple « Haut » et « Bas ») et tu touches un exercice pour chacun. Pendant 3 min 30, la voix crie un des deux mots au hasard et tu fais tout de suite l'exercice qui va avec. Le temps entre deux mots s'adapte aux exercices (quand l'exercice change, le nouveau mot reste plus longtemps pour te laisser comprendre et te mettre en position, par exemple te relever après des pompes ; si le même exercice revient deux fois de suite, le mot suivant arrive plus vite puisque tu es déjà en position), et tu choisis ton rythme : tranquille, normal ou rapide. À la fin, ton score s'affiche directement, sans rien à confirmer. Tes mots et tes exercices sont gardés pour la prochaine partie. Les mots que tu écris sont préchargés avant de jouer : le bouton attend la fin du chargement des audios, pour que le premier mot ne se fasse pas attendre." },
    ],
  },
  {
    version: '17.6.2',
    date: '3 nov. 2026',
    summary: "La pyramide : chiffre du repos plus lisible.",
    items: [
      { icon: 'sliders', text: "Dans La pyramide, le chiffre du repos est maintenant bien visible." },
    ],
  },
  {
    version: '17.6.0',
    date: '3 nov. 2026',
    summary: "Nouveau jeu : La pyramide.",
    items: [
      { icon: 'blocks', text: "Nouveau jeu, La pyramide : des séries qui montent (évolutif), qui descendent (dégressif) ou les deux (pyramide). Une voix compte chaque répétition, puis tu te reposes avant la série suivante, avec le décompte 3-2-1 pour repartir. Tu choisis le sommet et l'exercice, le rythme est toujours normal, et tu vois jusqu'où tu vas. Le jeu a sa propre couleur, un orange terre cuite." },
    ],
  },
  {
    version: '17.5.0',
    date: '2 nov. 2026',
    summary: "Jeux : choisis ton groupe musculaire et ton exercice.",
    items: [
      { icon: 'dumbbell', text: "Le jeu du chef d'orchestre s'ouvre à d'autres exercices au poids du corps : pectoraux (pompes), dos (tractions, tractions australiennes) et jambes (squats, fentes). Tu choisis le groupe puis l'exercice. Le rythme de la voix s'adapte à chaque exercice." },
    ],
  },
  {
    version: '17.4.1',
    date: '2 nov. 2026',
    summary: "« Mes mix » plus clair : privés, publiés et sauvegardés sont séparés.",
    items: [
      { icon: 'sliders', text: "Mes mix mieux rangé : tes créations privées, tes mix publiés en ligne et ceux pris chez d'autres sont maintenant dans trois listes distinctes, chacune avec sa phrase d'explication et son compteur." },
    ],
  },
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
      { icon: 'palette', text: "Nouvelle police : Saira Extra Condensed pour les chiffres et les titres, plus fine et plus sportive que la version précédente." },
    ],
  },
  {
    version: '17.2.2',
    date: '31 oct. 2026',
    summary: "Une police plus lisible pour les textes.",
    items: [
      { icon: 'palette', text: "Textes plus lisibles : une nouvelle police pour les phrases, les chiffres et les titres gardent leur style sportif." },
    ],
  },
  {
    version: '17.3.0',
    date: '31 oct. 2026',
    summary: "Un premier jeu pour faire du sport en s'amusant : Le chef d'orchestre.",
    items: [
      { icon: 'puzzle', text: "Nouveau : des jeux dans le menu. Le premier, Le chef d'orchestre (pompes) : une voix compte à voix haute puis se tait par surprise. Tu t'arrêtes quand elle s'arrête, tu reprends quand elle reprend, et tu vois jusqu'où tu tiens. Ton record est gardé sur ton téléphone." },
    ],
  },
];
