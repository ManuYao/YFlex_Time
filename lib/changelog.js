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
// `title` (facultatif, ajouté le 25/11/2026) = le nom court du bloc, 2 à 4 mots
// (« Coach vocal », « Sécurité »), affiché en gras au-dessus de `text`. À mettre
// sur toute entrée détaillée : dans une grosse mise à jour on parcourt les
// titres d'un coup d'œil avant de lire le détail. Une entrée générique (une
// seule ligne, maintenance) n'en a pas besoin : son texte s'affiche seul.
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
    version: '19.0.0',
    date: '25 nov. 2026',
    summary: "Une voix de coach humaine, trois jeux, 68 trophées et une app plus fluide.",
    items: [
      { icon: 'voice', title: 'Coach vocal', text: "Ton coach a maintenant une vraie voix, femme ou homme, qui marche même sans connexion. Il annonce bien la moitié de la séance, encourage un peu plus en style Motivant, et ne récite plus tout ce que tu as sauté quand tu avances de plusieurs phases d'un coup." },
      { icon: 'puzzle', title: 'Jeux', text: "Trois jeux pour t'entraîner en t'amusant : Le chef d'orchestre, La pyramide et Combo Bi-Exo. Tu notes l'exercice fait, tes scores se rangent par mois et comptent dans ton historique et dans ton bilan de saison." },
      { icon: 'trophies', title: '68 trophées', text: "Paliers, exploits et secrets à gagner. Les grands moments ont leur annonce, les autres une petite notification qu'on balaye." },
      { icon: 'blocks', title: 'MIX', text: "Couleur et note sur tes mix, repos automatiques, exercices à venir qu'on réordonne quand une machine est prise, temps saisis au clavier. Plus d'écrasement silencieux : tes mix ne sont jamais perdus, même si ton Premium s'arrête." },
      { icon: 'scale', title: 'Charges, poids et planning', text: "L'app te dit quand monter ta charge, et un bouton « PDC » met la charge à 0 kg d'un seul appui. Ton suivi de poids reste sur ton téléphone. Tu crées un bloc du planning en touchant les muscles sur un corps." },
      { icon: 'season', title: 'Fluidité et ambiances', text: "Écran de séance, accueil et constructeur allégés. Les décors se coupent quand le téléphone chauffe ou que la batterie est faible. La petite fenêtre flottante est réparée, la police est plus sportive. Noël s'ajoute aux ambiances, et chacun peut retirer les fêtes d'un geste." },
    ],
  },
  {
    version: '18.17.10',
    date: '25 nov. 2026',
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
// affiché. Vidé le 25/11/2026 : son contenu (17.2.0 → 18.17.10, ~140 entrées)
// a été regroupé dans l'entrée 19.0.0 de CHANGELOG_HISTORY, validée par
// l'utilisateur (l'ancien détail : git show 4a73570:lib/changelog.js).
// Si une nouvelle maintenance démarre, y ranger le vrai détail de chaque
// version publiée pendant qu'elle dure (l'entrée affichée reste alors générique).
export const CHANGELOG_BACKLOG = [];
