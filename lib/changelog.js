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
    icon: '🔔',
    text: "Cette fenêtre apparaît désormais dès qu'une nouvelle version est détectée, et reste jusqu'à ce que tu la fermes.",
  },
];
