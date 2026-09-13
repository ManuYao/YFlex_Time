import LegalScreen from '../components/common/LegalScreen';

const SECTIONS = [
  {
    heading: '1. Objet',
    paragraphs: [
      "Flex Timer est une application de chronométrage sportif (AMRAP, EMOM, TABATA, BASIC, MIX). Elle est éditée par un développeur indépendant, joignable à yaomanuit@gmail.com.",
      "L'application est actuellement en version bêta : certaines fonctionnalités peuvent évoluer, être ajoutées ou retirées sans préavis.",
    ],
  },
  {
    heading: '2. Aucun compte requis',
    paragraphs: [
      "Flex Timer ne demande aucune inscription ni création de compte. Toutes tes données (réglages, historique, timers personnalisés) restent sur ton appareil.",
    ],
  },
  {
    heading: '3. Usage sportif — avertissement',
    paragraphs: [
      "Flex Timer est un simple outil de chronométrage. Ce n'est pas un dispositif médical et l'application ne fournit aucun avis médical ou sportif personnalisé.",
      "Consulte un professionnel de santé avant de démarrer une activité physique intense, en particulier en cas de condition médicale préexistante. Tu es seul responsable de l'usage que tu fais de l'application pendant tes séances.",
    ],
  },
  {
    heading: '4. Fonctionnalités Pro',
    paragraphs: [
      "Certains modes (TABATA, MIX) sont limités en usage quotidien gratuit. Un accès Pro illimité est prévu, avec un vrai paiement via le Google Play Store à la sortie officielle de l'application.",
    ],
  },
  {
    heading: '5. Responsabilité',
    paragraphs: [
      "L'application est fournie « en l'état », sans garantie d'absence d'erreur ou d'interruption. L'éditeur ne pourra être tenu responsable d'un dommage direct ou indirect résultant de l'utilisation de l'application.",
    ],
  },
  {
    heading: '6. Modification des présentes conditions',
    paragraphs: [
      "Ces conditions peuvent être mises à jour, notamment à la sortie de la version publique. La date de dernière mise à jour est indiquée en haut de cette page.",
    ],
  },
  {
    heading: '7. Contact',
    paragraphs: [
      'Pour toute question, écris à yaomanuit@gmail.com.',
    ],
  },
];

export default function Terms() {
  return (
    <LegalScreen
      title="Conditions d'utilisation"
      updatedAt="version bêta"
      sections={SECTIONS}
    />
  );
}
