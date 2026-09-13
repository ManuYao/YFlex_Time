import LegalScreen from '../components/common/LegalScreen';

const SECTIONS = [
  {
    heading: 'Notre principe',
    paragraphs: [
      "Flex Timer ne collecte aucune donnée personnelle. Il n'y a ni compte, ni serveur, ni publicité, ni traceur publicitaire ou analytique tiers dans l'application.",
    ],
  },
  {
    heading: 'Ce qui est stocké, et où',
    paragraphs: [
      "Tes réglages, ton historique de séances, tes timers personnalisés et ton MIX sont enregistrés uniquement sur ton appareil (stockage local). Ces données ne quittent jamais ton téléphone et ne sont transmises à aucun serveur.",
    ],
  },
  {
    heading: 'Aucun partage avec des tiers',
    paragraphs: [
      "Aucune donnée n'est vendue, partagée ou transmise à un tiers, à des fins publicitaires ou autres.",
    ],
  },
  {
    heading: 'Suppression de tes données',
    paragraphs: [
      "Le bouton « Réinitialiser l'application », dans Paramètres, efface immédiatement toutes les données stockées localement. Désinstaller l'application supprime également toutes ces données.",
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
      updatedAt="version bêta"
      sections={SECTIONS}
    />
  );
}
