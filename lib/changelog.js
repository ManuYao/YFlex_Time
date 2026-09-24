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
    // Publiée pendant une maintenance (Gist `is_maintenance: true`) : entrée
    // volontairement générique, le détail est gardé dans CHANGELOG_BACKLOG
    // plus bas et sera regroupé dans la première mise à jour d'après. Les
    // versions successives de la maintenance réutilisent CETTE entrée (numéro
    // mis à jour) plutôt que d'empiler des lignes génériques identiques.
    version: '14.1.1',
    date: '24 sept. 2026',
    summary: 'Petites améliorations et corrections pendant la maintenance.',
    items: [
      {
        icon: 'bandage',
        text: 'Petites améliorations et corrections pendant la maintenance.',
      },
    ],
  },
  {
    version: '14.0.0',
    date: '24 sept. 2026',
    summary:
      "Nouvelle icône, un coach vocal qui annonce la séance à voix haute, et toutes les icônes et tous les boutons de l'app redessinés maison.",
    items: [
      {
        icon: 'palette',
        text: "Nouvelle icône : l'anneau à graduations aux couleurs des quatre modes, avec le F de Flex Timer au centre. Elle s'adapte aussi aux icônes à thème d'Android.",
      },
      {
        icon: 'voice',
        text: "Nouveau : la voix du coach (Paramètres > Audio et haptique, désactivée par défaut). Elle t'annonce les tours, les repos, la moitié, les dix dernières secondes et la fin, sans que tu aies à regarder l'écran.",
      },
      {
        icon: 'sliders',
        text: "« Personnaliser le coach » ouvre sa fenêtre de réglages. Style Essentiel par défaut, l'info tranchée en une ou deux secondes (« Tour 3 sur 8. », « Repos. 30 secondes. », « Reprise dans 10 secondes. »), ou style Motivant, avec des phrases de coach qui t'encouragent. Touche un choix pour l'écouter.",
      },
      {
        icon: 'voices',
        text: "Voix femme, ou vraie voix d'homme si ton téléphone en a une installée. Chaque mode a ses propres annonces : en repos on récupère puis on se prépare, en EMOM la voix t'annonce la prochaine vague.",
      },
      {
        icon: 'mix',
        text: "En MIX, la voix annonce chaque exercice par son nom (« Bloc 2 sur 5 : Pompes. 4 tours. »), compte les tours à l'intérieur du bloc, et te prévient dix secondes avant le changement (« Ensuite : Burpees. »).",
      },
      {
        icon: 'bandage',
        text: "MIX : le repos qui suit le dernier tour d'un bloc TABATA affichait 00 pendant toute sa durée, sans bips avant l'exercice suivant, et « Passer » n'y faisait rien. C'est corrigé. Un bloc repos sans nom s'affiche maintenant « REPOS » (et non plus « REST »).",
      },
      {
        icon: 'headphones',
        text: "Si tu écoutes de la musique, elle baisse le temps que la voix parle, puis remonte, comme pour les bips.",
      },
      {
        icon: 'speaker',
        text: "Le décompte de lancement (3-2-1-Go) et les 3 dernières secondes d'une phase restent des bips.",
      },
      {
        icon: 'palette',
        text: "Fini les emojis : toutes les icônes de l'app sont dessinées maison, dans le style de l'anneau à graduations. Chaque mode a son cadran, qui dessine son rythme : une boucle pour AMRAP, six minutes égales pour EMOM, effort long et repos court pour TABATA…",
      },
      {
        icon: 'medal',
        text: "Les trophées pas encore commencés se lisent enfin : chacun garde sa couleur (bronze, argent, or), affiche l'objectif et porte un vrai cadenas. Sous chaque trophée : le nombre de séances à faire, ta progression (« 4 / 10 ») ou « OBTENU ».",
      },
      {
        icon: 'flame',
        text: "La flamme de série de l'accueil se colore à mesure que ta série grandit : jaune au début, puis dorée, orange, et rouge-orangé avec des étincelles quand tu enchaînes les séances.",
      },
      {
        icon: 'play',
        text: "Les boutons de la séance (lecture, pause, passer, recommencer, fin) sont dessinés eux aussi : même rendu sur tous les téléphones.",
      },
      {
        icon: 'pulse',
        text: "Pendant la séance, les boutons sont remontés d'un cran : plus faciles à atteindre quand le téléphone est posé sur un support. Le bouton central respire doucement à la couleur du mode tant que le chrono tourne, et s'arrête net en pause.",
      },
      {
        icon: 'bolt',
        text: "Tous les boutons de l'app sont redessinés : plus d'aplats posés, mais des capsules en relief. Le bouton principal prend la couleur du mode en dégradé, avec un liseré lumineux, une lueur à sa couleur et un reflet qui le traverse de temps en temps. Il s'enfonce sous le doigt.",
      },
      {
        icon: 'back',
        text: "Les boutons secondaires sont en verre translucide. Les boutons retour, réglages et fermer sont les mêmes ronds sur tous les écrans, avec une petite vibration au toucher.",
      },
      {
        icon: 'check',
        text: "Plus lisible : sur le vert d'EMOM et le gris de BASIC, le texte des boutons passe en noir, il était presque illisible en blanc. Même chose pour « Refaire la séance » après un TABATA.",
      },
      {
        icon: 'progress',
        text: "Les boutons du bas sont à la même hauteur sur tous les écrans, un peu plus loin du bord. Dans le Planning, les points de pagination ne sautent plus quand on passe de l'Historique au Planning.",
      },
      {
        icon: 'crown',
        text: "Sur TABATA, la couronne, la pastille PRO et le bandeau « Débloque avec Premium » passent en noir : ils étaient blancs sur fond jaune, difficiles à lire.",
      },
      {
        icon: 'drop',
        text: "La page de maintenance est plus claire : titre et message centrés, et un fin contour arc-en-ciel fait le tour du message à la place du grand halo délavé. L'écran de mise à jour obligatoire est recentré lui aussi, et son titre n'est plus rogné.",
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
    version: '14.1.1',
    items: [
      {
        icon: 'pause',
        text: "Pendant la séance, les boutons sont plus nets : plus d'ombre noire autour de Pause, Reset, Passer et Retour, juste un contour fin. La lueur du bouton central respire plus doucement.",
      },
    ],
  },
  {
    version: '14.1.0',
    items: [
      {
        icon: 'mix',
        text: "Le MIX s'ouvre de nouveau : depuis la 14.0.0, ouvrir l'écran MIX faisait planter l'app. C'est réparé.",
      },
      {
        icon: 'list',
        text: "Petits écrans : la rangée des jours du Planning et les filtres de l'Historique (AMRAP, BASIC, EMOM, TABATA, MIX) défilent quand ils dépassent de l'écran. Le jour ou le filtre choisi se recentre tout seul, et le dimanche n'est plus coupé.",
      },
      {
        icon: 'check',
        text: "« Quoi de neuf » : le bouton « Compris » arrive en même temps que la fenêtre, au lieu d'apparaître une seconde après.",
      },
    ],
  },
];
