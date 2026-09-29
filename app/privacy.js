import LegalScreen from '../components/common/LegalScreen';

const SECTIONS = [
  {
    heading: 'Notre principe',
    paragraphs: [
      "Flex Timer fonctionne sans compte : tout reste alors sur ton téléphone. Si tu choisis de créer un compte, une partie de tes données est enregistrée en ligne pour que tu la retrouves sur un autre téléphone et pour pouvoir publier tes MIX.",
      "Il n'y a ni publicité, ni traceur publicitaire ou analytique tiers dans l'application.",
    ],
  },
  {
    heading: 'Sans compte : tout reste chez toi',
    paragraphs: [
      "Tes réglages, ton historique de séances, tes timers personnalisés, ton planning et tes MIX sont enregistrés sur ton appareil (stockage local). Tant que tu n'es pas connecté, ces données ne sont envoyées à aucun serveur.",
    ],
  },
  {
    heading: 'Avec un compte : ce qui est enregistré en ligne',
    paragraphs: [
      "Ton adresse email. Si tu t'inscris avec un mot de passe, celui-ci n'est jamais stocké en clair. Si tu te connectes avec Google, nous recevons l'adresse email et le nom de ton compte Google.",
      "Ton pseudo, si tu en choisis un.",
      "Ton historique de séances (type de chrono, durée, tours, date), synchronisé pour que tu le retrouves sur un autre téléphone. Ton planning, tes réglages et tes timers personnalisés ne sont pas envoyés.",
      "Si tu publies un MIX dans le fil public : son nom, son contenu (blocs et notes de blocs), sa catégorie et ton pseudo comme auteur. Les notes (étoiles) et les signalements que tu donnes aux MIX des autres sont aussi enregistrés avec ton compte.",
      "Ces données sont conservées tant que ton compte existe.",
    ],
  },
  {
    heading: 'Ce que les autres peuvent voir',
    paragraphs: [
      "Un MIX publié dans le fil public est visible par tout le monde, même sans compte : son contenu, son pseudo d'auteur et sa note moyenne. Ton adresse email n'est jamais montrée aux autres, et ton historique n'est visible par aucun autre utilisateur.",
      "Les autres utilisateurs ne voient jamais tes notes ni tes signalements : seule la moyenne des notes apparaît sur un MIX.",
    ],
  },
  {
    heading: 'Où sont stockées ces données',
    paragraphs: [
      "Elles sont hébergées chez Supabase, le prestataire de base de données et de connexion utilisé par Flex Timer. Si tu te connectes avec Google, la connexion passe aussi par Google, selon sa propre politique de confidentialité.",
      "Aucune donnée n'est vendue, ni utilisée à des fins publicitaires.",
    ],
  },
  {
    heading: 'Connexions techniques',
    paragraphs: [
      "Pour fonctionner, l'application contacte Expo (pour recevoir les mises à jour) et un fichier public hébergé sur GitHub (pour les messages de maintenance et la version minimale). Ces échanges contiennent des informations techniques (version de l'application, plateforme) et l'adresse IP de ton téléphone, comme toute connexion internet. Aucune donnée personnelle de l'application n'y est jointe.",
    ],
  },
  {
    heading: 'Tes droits et la suppression',
    paragraphs: [
      "Tu peux supprimer ton compte à tout moment : Paramètres › Compte › Supprimer mon compte. Cela efface définitivement ton compte, ton historique synchronisé, tes MIX publiés, tes notes et tes signalements.",
      "Tu peux aussi retirer un de tes MIX du fil public quand tu veux. Les copies déjà enregistrées par d'autres personnes restent sur leur téléphone.",
      "Sur ton téléphone, le bouton « Réinitialiser l'application » (Paramètres) efface les données locales, tout comme désinstaller l'application. La réinitialisation ne supprime pas ton compte en ligne : utilise pour cela « Supprimer mon compte ».",
      "Pour accéder à tes données, les corriger ou poser une question, écris à yaomanuit@gmail.com.",
    ],
  },
  {
    heading: 'Fonctionnalités futures',
    paragraphs: [
      "Si un achat Pro via le Google Play Store est ajouté, les données de transaction seront gérées directement par Google, selon sa propre politique de confidentialité — Flex Timer n'y aura pas accès.",
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [
      'Pour toute question sur cette politique, écris à yaomanuit@gmail.com.',
    ],
  },
];

export default function Privacy() {
  return (
    <LegalScreen
      title="Politique de confidentialité"
      updatedAt="30 septembre 2026 · version bêta"
      sections={SECTIONS}
    />
  );
}
