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
    version: '17.11.21',
    date: '6 nov. 2026',
    summary: "Petites améliorations et corrections pendant la maintenance.",
    items: [
      { icon: 'sliders', text: "Petites améliorations et corrections pendant la maintenance." },
    ],
  },
  {
    version: '17.11.20',
    date: '5 nov. 2026',
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
