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
    version: '19.0.2',
    date: '25 nov. 2026',
    summary: "La grosse mise à jour : voix humaine, trois jeux, 68 trophées, planning, charges et une app plus fluide.",
    items: [
      { icon: 'voice', title: 'Coach vocal', text: "Une vraie voix de coach, femme ou homme, qui marche même sans connexion. Il annonce la moitié de ta séance, encourage un peu plus en style Motivant, et quand tu sautes plusieurs phases d'un coup il ne te raconte plus tout ce que tu viens de passer." },
      { icon: 'puzzle', title: 'Jeux', text: "Trois jeux pour t'entraîner en t'amusant : Le chef d'orchestre, La pyramide et Combo Bi-Exo. Tu choisis ton exercice et ton groupe musculaire, tes scores se rangent par mois et comptent dans ton historique et ton bilan de saison. Seul le bip final sonne, la voix dit tous les chiffres et le décor de saison reste immobile pour garder le jeu léger. Combo Bi-Exo et deux formats de la pyramide sont réservés à Premium." },
      { icon: 'trophies', title: '68 trophées', text: "Paliers, exploits et secrets à gagner. Les grands moments ont leur grande annonce, les autres une petite notification qu'on balaye, et les trophées gagnés pendant la saison apparaissent dans ton bilan de saison." },
      { icon: 'blocks', title: 'MIX', text: "Couleur et note sur tes mix, repos automatiques entre les blocs, « Mes mix » qui sépare tes créations et ceux que tu as sauvegardés. Plus d'écrasement silencieux ni de faux « Enregistré » : tes mix ne sont jamais perdus, même si ton Premium s'arrête. Les mix de la communauté se lancent, mais ne se modifient plus en gratuit." },
      { icon: 'move', title: 'MIX en séance', text: "Machine occupée ? Pendant un repos, tu réorganises les exercices à venir. Tu vois aussi le poids du prochain exercice et tu peux le changer." },
      { icon: 'calendar', title: 'Planning', text: "Tu crées un bloc en touchant les muscles sur un corps, tu changes l'ordre des exercices d'un bloc, et un mix généré depuis le planning ne mélange plus deux exercices." },
      { icon: 'scale', title: 'Charges, poids et profil', text: "L'app te dit quand monter ta charge, et un bouton « PDC » met la charge à 0 kg d'un seul appui. Ton suivi de poids reste sur ton téléphone. Ton temps sous tension du mois se lit sans Premium, et l'analyse avancée est rangée en groupes." },
      { icon: 'stopwatch', title: 'Séance', text: "Quitter une séance se fait d'un seul appui et la séance est gardée. Le bouton de remise à zéro te demande confirmation quand tu as déjà fait plus de 30 % de la séance. Le bouton Stop de la notification rouvre bien l'app, les durées au-delà d'une heure s'écrivent en heures, et tous les réglages se saisissent aussi au clavier." },
      { icon: 'bolt', title: 'Fluidité et batterie', text: "Écran de séance, accueil et constructeur de MIX allégés, et retour à l'accueil sans petit gel après une séance. Quand ton téléphone chauffe ou que la batterie passe à 20 %, les décors animés ralentissent puis se coupent d'eux-mêmes ; l'app ne surveille plus la batterie quand elle est fermée." },
      { icon: 'season', title: 'Ambiances et fêtes', text: "L'icône de l'app et l'annonce de la nouvelle saison changent le même jour. Noël arrive du 1er au 26 décembre, et chacun peut retirer toutes les fêtes (Halloween, Noël, Saint-Valentin) d'un geste." },
      { icon: 'sliders', title: 'Confort', text: "La petite fenêtre flottante se redimensionne librement, la police est plus sportive et plus lisible, le tour guidé se joue sur l'accueil avec de petites bulles et le menu t'explique chaque entrée. Les messages Premium sont plus clairs et ne s'affichent plus quand tu l'es déjà." },
    ],
  },
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
