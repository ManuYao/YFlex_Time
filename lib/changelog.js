// Historique des mises à jour, la plus récente en tête. Deux niveaux
// d'affichage seulement (components/common/UpdateSheet.js) :
//   - popup "Quoi de neuf" au démarrage → items de HISTORY[0] uniquement.
//   - Paramètres > À propos > Version   → items de HISTORY[0] EN PLUS
//     d'une ligne de résumé pour HISTORY[1].
// Rien au-delà de l'avant-dernière n'est jamais affiché nulle part : à
// chaque nouvelle entrée ajoutée en tête, supprime la plus ancienne si le
// tableau dépasse 2 entrées (pas la peine de garder du texte mort ici).
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
    version: '13.4.0',
    date: '24 sept. 2026',
    summary:
      "Les séances lancées par erreur (moins de 6 s) se retirent d'elles-mêmes de l'Historique.",
    items: [
      {
        icon: '🗑️',
        text: "Une séance arrêtée avant 6 secondes apparaît dans l'Historique déjà prête à être supprimée. Touche « Annuler la suppression » pour la garder, ou glisse-la dans l'autre sens pour la supprimer tout de suite. Sans rien faire, elle disparaît d'elle-même au bout d'une heure.",
      },
      {
        icon: '🏅',
        text: "Tant que tu ne l'as pas gardée, elle ne compte ni pour tes trophées ni pour ta série.",
      },
    ],
  },
  {
    version: '13.3.1',
    date: '24 sept. 2026',
    summary:
      "Nouvelle roue de réglage, TABATA jusqu'à 5 min avec sa durée totale au centre, et une page claire pour activer les notifications.",
    items: [
      {
        icon: '🔔',
        text: "À la fin du tutoriel, une nouvelle page te montre à quoi ressemble la notification de séance et t'aide à activer les notifications et la batterie sans restriction, avant que ton téléphone ne te pose la question.",
      },
      {
        icon: '✅',
        text: "Une autorisation déjà activée apparaît grisée avec une coche verte, sur cette page comme dans Paramètres › Autorisations.",
      },
      {
        icon: '🚫',
        text: "Plus de fenêtre d'autorisation qui surgit par-dessus le chrono au début d'une séance. Si les notifications sont coupées, la page s'affiche une seule fois avant une séance, et « Plus tard » lance quand même ta séance.",
      },
      {
        icon: '⚙️',
        text: "Paramètres › Autorisations : « Activer » ouvre directement la demande de ton téléphone, et l'état se met à jour dès que tu reviens des réglages.",
      },
      {
        icon: '👀',
        text: "Paramètres › À propos : un bouton « Aperçu » permet de revoir la page des autorisations quand tu veux.",
      },
      {
        icon: '🎡',
        text: "Nouvelle roue de sélection partout dans l'app (réglages des timers, constructeur MIX, planning) : effet de roue en relief, défilement plus fluide, valeur choisie mieux mise en avant.",
      },
      {
        icon: '⏱️',
        text: "Les temps proposés (TABATA, EMOM, BASIC et les blocs du MIX) suivent des paliers pensés pour l'entraînement : à la seconde près sous 30 s, puis de 5 en 5, de 10 en 10… Tu trouves ta valeur en deux gestes.",
      },
      {
        icon: '⏳',
        text: "TABATA : le travail et le repos se règlent jusqu'à 5 min (au lieu de 2 min et 1 min), dans les réglages comme dans le constructeur MIX.",
      },
      {
        icon: '🧮',
        text: "Sur l'accueil, le cercle de TABATA affiche la durée totale de ta séance, calculée comme le vrai chrono, au lieu du nombre de tours. Les tours restent visibles juste en dessous.",
      },
      {
        icon: '✏️',
        text: "La phrase sous TABATA passe en minutes au-delà d'une minute (« 1:30 min » au lieu de « 90s »).",
      },
    ],
  },
];

// Rétrocompatibilité de lecture pour tout code qui voudrait juste "la liste
// courante" sans se soucier de l'historique.
export const CHANGELOG_CURRENT = CHANGELOG_HISTORY[0].items;
