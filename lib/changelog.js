// Contenu affiché par UpdateSheet (feuille "Nouvelle version" / "Quoi de
// neuf", voir components/common/UpdateSheet.js), depuis Paramètres > À
// propos. À tenir à jour à chaque fois qu'on prépare un `eas update` : c'est
// la liste de ce qui est en attente de push (ou déjà poussé, en mode info).
export const CHANGELOG_CURRENT = [
  {
    icon: '⬇️',
    text: "Mise à jour obligatoire et page de maintenance : le bouton de téléchargement propose maintenant une installation automatique en plus du lien manuel.",
  },
  {
    icon: '✨',
    text: "Halo de maintenance fin et lumineux : spread réduit de 50%, opacité augmentée pour un effet subtil sans être envahissant.",
  },
  {
    icon: '🚧',
    text: "La page de maintenance affiche maintenant bien son message et son bouton Fermer — elle restait vide sur Android auparavant. Fix: utilisation du composant Modal natif pour le layering.",
  },
  {
    icon: '👋',
    text: "Les messages de mise à jour ou de maintenance n'apparaissent plus par-dessus le tutoriel de bienvenue.",
  },
];
