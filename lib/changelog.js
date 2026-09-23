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
    version: '13.5.0',
    date: '24 sept. 2026',
    summary:
      "Dans le constructeur MIX, chaque bloc a maintenant un rôle : échauffement, principal, force, récup…",
    items: [
      {
        icon: '🏷️',
        text: "Constructeur MIX : chaque bloc a un rôle — Échauffement, Principal, Force, Récup, Retour au calme ou Repos. Touche un bloc pour le choisir ; il s'affiche en badge sur la carte du bloc.",
      },
      {
        icon: '✨',
        text: "Le rôle se devine tout seul d'après le nom du bloc (un bloc nommé « Échauffement » devient Échauffement). Tes mix déjà créés en profitent sans rien refaire.",
      },
    ],
  },
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
];

// Rétrocompatibilité de lecture pour tout code qui voudrait juste "la liste
// courante" sans se soucier de l'historique.
export const CHANGELOG_CURRENT = CHANGELOG_HISTORY[0].items;
