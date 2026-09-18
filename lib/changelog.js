// Contenu affiché par UpdateSheet (feuille "Nouvelle version" / "Quoi de
// neuf", voir components/common/UpdateSheet.js), depuis Paramètres > À
// propos. À tenir à jour à chaque fois qu'on prépare un `eas update` : c'est
// la liste de ce qui est en attente de push (ou déjà poussé, en mode info).
export const CHANGELOG_CURRENT = [
  {
    icon: '📈',
    text: "Nouveau : quand un exercice de ton planning stagne à la même charge depuis plusieurs semaines, l'accueil te propose de l'augmenter un peu.",
  },
  {
    icon: '🏷️',
    text: "La bibliothèque d'exercices s'ouvre maintenant directement sur le bon groupe musculaire selon le nom de ton bloc.",
  },
  {
    icon: '🎯',
    text: "Le sélecteur de temps/tours ne saute plus de quelques pixels quand tu changes de valeur.",
  },
  {
    icon: '⚖️',
    text: "Ajout d'un texte d'information sur les conseils sportifs (indicatifs, jamais médicaux), à valider une fois dans Paramètres.",
  },
  {
    icon: '⬇️',
    text: "Mise à jour obligatoire : le bouton de téléchargement propose maintenant une installation automatique en plus du lien manuel.",
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
