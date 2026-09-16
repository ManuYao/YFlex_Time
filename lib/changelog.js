// Contenu affiché par UpdateSheet (feuille "Nouvelle version" / "Quoi de
// neuf", voir components/common/UpdateSheet.js), depuis Paramètres > À
// propos. À tenir à jour à chaque fois qu'on prépare un `eas update` : c'est
// la liste de ce qui est en attente de push (ou déjà poussé, en mode info).
export const CHANGELOG_CURRENT = [
  {
    icon: '🚧',
    text: "Si une maintenance est en cours, l'app te prévient — et tu peux continuer à t'en servir normalement.",
  },
  {
    icon: '⬇️',
    text: "Quand une nouvelle version est vraiment indispensable, l'app t'indique où la télécharger au lieu de te laisser sans explication.",
  },
];
