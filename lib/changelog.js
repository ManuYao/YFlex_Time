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
    version: '17.1.0',
    date: '15 oct. 2026',
    summary: "Les saisons, un MIX plus complet, plus de confort et une nouvelle icône.",
    items: [
      { icon: 'season', text: "Les saisons : l'app prend les couleurs, la lumière et les décors de la saison ou de la fête du moment, avec une intro de démarrage qui change à chaque saison et une transition de lancement refaite. À chaque fin de saison, un bilan animé de tes stats (plus de cartes avec Premium). Tout se coupe dans les réglages, et une alerte te le propose si ton téléphone est plus ancien." },
      { icon: 'mix', text: "MIX plus complet : une couleur et une note par mix, un repos automatique entre les blocs, tes créations bien séparées des mix sauvegardés, et « Tout vider » qui repart d'un mix neuf sans écraser l'ancien." },
      { icon: 'sessions', text: "Séance plus claire : un bouton Quitter qui garde ce que tu as déjà fait, un coach vocal qui annonce toujours la mi-séance, et un anneau qui ne recule plus jamais." },
      { icon: 'sliders', text: "Plus de confort : tous les réglages (durées, tours, repos) se tapent aussi au clavier, des réglages guidés au premier démarrage, un suivi du poids dans le Profil, un planning qui propose les exercices de ta discipline, et un accueil plus fluide." },
      { icon: 'crown', text: "Gratuit et Premium : tous les modes restent illimités et gratuits, le planning aussi. La bibliothèque de mix est limitée en gratuit (3 créés, 5 téléchargés, 3 publiés) ; Premium ajoute le lancement depuis le planning, l'analyse avancée et plus de cartes dans le bilan de saison." },
      { icon: 'stopwatch', text: "Nouvelle icône et nouvel écran de démarrage." },
    ],
  },
  {
    version: '17.0.0',
    date: '15 oct. 2026',
    summary: "Nouvelle icône et nouvel écran de démarrage.",
    items: [
      { icon: 'stopwatch', text: "Nouvelle icône et nouvel écran de démarrage." },
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
