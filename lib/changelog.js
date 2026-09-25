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
    // Maintenance terminée le 26/09/2026 : toutes les versions publiées
    // pendant la maintenance (14.1.0 à 14.8.0, gardées dans CHANGELOG_BACKLOG
    // ci-dessous) sont regroupées ici en une seule entrée détaillée, comme
    // prévu par la règle (voir CLAUDE.md, section OTA). Le backlog est vidé
    // juste après.
    version: '14.8.0',
    date: '26 sept. 2026',
    summary:
      "Partage de MIX par simple lien, note de jour dans le Planning, un vrai bloc BASIC dans le MIX, et un clavier qui ne cache plus jamais ce que tu écris.",
    items: [
      {
        icon: 'share',
        text: "Nouveau : partage un MIX avec un pote. « Copier le lien » copie l'enchaînement dans le presse-papiers (WhatsApp, Instagram, SMS…) après un aperçu de ce qui sera envoyé. La toute première fois, une carte explique comment ton ami le récupère.",
      },
      {
        icon: 'link',
        text: "Reçu un mix mais le lien n'est pas cliquable (ça arrive avec certaines apps de messagerie) ? Colle-le dans la fenêtre « Partager » : un aperçu s'affiche avant de l'ajouter à ta bibliothèque.",
      },
      {
        icon: 'list',
        text: "Planning : possibilité d'écrire une note libre pour chaque jour (ex. « forme moyenne, bien dormi »), juste sous le titre du jour. Un contour vert confirme qu'elle est enregistrée, sans bouton.",
      },
      {
        icon: 'basic',
        text: "Nouveau bloc BASIC dans le Constructeur MIX : pour les exercices comme les tractions, où le temps de travail se décide sur le moment. Il se règle comme le BASIC normal (repos + tours, travail libre) et affiche une durée estimée (~) tant qu'il n'est pas terminé.",
      },
      {
        icon: 'plus',
        text: "Le bouton « Ajouter un bloc » du Constructeur reste maintenant toujours visible en bas de l'écran, même avec beaucoup de blocs.",
      },
      {
        icon: 'sliders',
        text: "Le clavier ne cache plus rien, nulle part dans l'app : quand tu écris (partage d'un mix, nom d'un bloc, exercices, note du jour…), la fenêtre remonte avec le clavier et tu vois toujours ce que tu tapes et les boutons en dessous.",
      },
      {
        icon: 'blocks',
        text: "Les fenêtres du Constructeur MIX ont un fond plein : on ne voit plus l'écran d'en dessous à travers.",
      },
      {
        icon: 'finish',
        text: "EMOM : sur ton dernier tour, plus besoin d'attendre la fin de la minute — le bouton central devient « FINI », comme sur BASIC, pour terminer ta séance dès que tu es prêt.",
      },
      {
        icon: 'skip',
        text: "EMOM : le bouton « Fin » à droite devient « Next » — il passe directement au tour suivant au lieu de terminer la séance.",
      },
      {
        icon: 'mix',
        text: "Le MIX s'ouvre de nouveau : un bug faisait planter l'app à l'ouverture de cet écran. C'est réparé.",
      },
      {
        icon: 'list',
        text: "Petits écrans : la rangée des jours du Planning et les filtres de l'Historique (AMRAP, BASIC, EMOM, TABATA, MIX) défilent quand ils dépassent de l'écran, et le jour ou le filtre choisi se recentre tout seul.",
      },
      {
        icon: 'check',
        text: "« Quoi de neuf » : le bouton « Compris » arrive en même temps que la fenêtre, au lieu d'apparaître une seconde après.",
      },
      {
        icon: 'pause',
        text: "Pendant la séance, les boutons sont plus nets : plus d'ombre noire autour de Pause, Reset, Passer et Retour, juste un contour fin.",
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
export const CHANGELOG_BACKLOG = [];

