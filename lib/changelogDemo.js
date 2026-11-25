// TEMP (25/11/2026) — aperçu d'une GROSSE mise à jour, pour juger la lisibilité
// de la fenêtre « Quoi de neuf » (components/common/UpdateSheet.js) avec une
// longue liste. Affiché UNIQUEMENT depuis Paramètres > À propos > « Aperçu d'une
// grosse mise à jour » ; ce texte n'est PAS celui d'une vraie version.
// À supprimer avec les autres boutons de test avant la sortie sur les stores.
export const CHANGELOG_DEMO = {
  version: '19.0.0',
  date: 'exemple',
  summary: "Exemple de grosse mise à jour.",
  items: [
    {
      icon: 'voice',
      title: 'Coach à voix humaine',
      text: "Le coach parle maintenant avec une vraie voix, femme ou homme, dans les deux styles. Il continue de t'annoncer la moitié de la séance, les derniers tours et la fin, même sans connexion.",
    },
    {
      icon: 'trophies',
      title: '68 trophées',
      text: "Des trophées pour chaque mode, des exploits et des secrets. Les plus rares ont leur grande annonce, les autres arrivent dans une petite notification que tu balaies. Ils apparaissent aussi dans ton bilan de saison.",
    },
    {
      icon: 'bolt',
      title: 'Des jeux entre deux séances',
      text: "Le chef d'orchestre, la pyramide et le combo à deux exercices. Tes parties comptent dans l'historique, et tes records s'affichent dans l'analyse avancée.",
    },
    {
      icon: 'clock',
      title: 'Planning de la semaine',
      text: "Compose tes jours, lance un bloc ou un MIX enregistré directement depuis le planning, et retrouve des exercices adaptés à ta discipline. Tes anciens blocs sont gardés.",
    },
    {
      icon: 'palette',
      title: 'Saisons et fêtes',
      text: "L'app prend les couleurs de la saison, avec une intro qui change à chaque nouvelle période. Tu peux tout désactiver quand tu veux, et rien ne s'affiche sans ton accord pour les fêtes.",
    },
    {
      icon: 'sliders',
      title: 'Tes réglages dès le départ',
      text: "Au premier lancement, une page te laisse choisir l'ambiance, le coach, les vibrations et le mode pluie, puis tu peux tout changer plus tard dans les Paramètres.",
    },
    {
      icon: 'share',
      title: 'MIX plus complets',
      text: "Donne une couleur et une note à tes MIX, ajoute des repos automatiques entre les blocs et saisis la durée d'un AMRAP au clavier. Les MIX reçus par un ami gardent tout ça.",
    },
    {
      icon: 'sessions',
      title: 'Séances plus sûres',
      text: "Le bouton Quitter garde ta séance, et la remise à zéro te demande confirmation quand tu es déjà bien avancé. Une séance interrompue est récupérée au lancement suivant.",
    },
    {
      icon: 'lock',
      title: 'Sécurité',
      text: "Ton mot de passe n'est jamais gardé en clair, ton historique reste invisible pour les autres, et tu peux supprimer ton compte et toutes tes données depuis les Paramètres.",
    },
    {
      icon: 'user',
      title: 'Profil et poids',
      text: "Suis ton poids avec une courbe claire (hausse, baisse ou stable), gardée seulement sur ton téléphone. Les abonnés Premium accèdent à une analyse plus détaillée de leurs séances.",
    },
  ],
};
