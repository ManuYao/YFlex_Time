// Contenu affiché par UpdateSheet (feuille "Nouvelle version" / "Quoi de
// neuf", voir components/common/UpdateSheet.js), depuis Paramètres > À
// propos. À tenir à jour à chaque fois qu'on prépare un `eas update` : c'est
// la liste de ce qui est en attente de push (ou déjà poussé, en mode info).
export const CHANGELOG_CURRENT = [
  {
    icon: '📅',
    text: "Historique : les séances sont maintenant groupées par jour, avec un bouton \"Voir plus\" pour charger le reste progressivement.",
  },
  {
    icon: '🧹',
    text: "Paramètres nettoyés : les mentions de test ont été retirées de l'aperçu de mise à jour.",
  },
];
