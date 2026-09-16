// Contenu affiché par UpdateSheet (feuille "Nouvelle version" / "Quoi de
// neuf", voir components/common/UpdateSheet.js), depuis Paramètres > À
// propos. À tenir à jour à chaque fois qu'on prépare un `eas update` : c'est
// la liste de ce qui est en attente de push (ou déjà poussé, en mode info).
export const CHANGELOG_CURRENT = [
  {
    icon: '⏹️',
    text: 'EMOM : un bouton Fin pour arrêter la séance en gardant tes tours dans l\'historique.',
  },
  {
    icon: '📊',
    text: 'Les commandes remontent, et la barre du haut se découpe par phase.',
  },
  {
    icon: '👆',
    text: 'Historique : appui long sur Séances ou Temps pour voir ton jour puis ta semaine.',
  },
  {
    icon: '🏷️',
    text: 'Planning : appui long pour supprimer une étiquette, et tes propres groupes musculaires.',
  },
];
