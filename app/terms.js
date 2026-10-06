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
    heading: '2. Compte facultatif',
    paragraphs: [
      "Flex Timer s'utilise sans compte : tous les chronos fonctionnent sur ton téléphone, sans inscription.",
      "Tu peux créer un compte (email et mot de passe, ou Google) pour retrouver ton historique sur un autre téléphone et publier tes MIX dans le fil public. Tu es responsable de la confidentialité de ton mot de passe.",
      "Tu peux supprimer ton compte à tout moment dans Paramètres › Compte. Les données concernées sont décrites dans la politique de confidentialité.",
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
    heading: '4. Fil public de MIX',
    paragraphs: [
      "Ce que tu publies (nom du MIX, contenu, notes de blocs, pseudo) est visible par tous. Tu es responsable de ce que tu publies : pas de contenu illégal, injurieux, haineux, trompeur ou dangereux, et pas de pseudo qui usurpe l'identité d'une autre personne.",
      "Tu gardes tes droits sur tes MIX. En les publiant, tu autorises les autres utilisateurs à les voir, les tester et les copier dans leur application. Tu peux les retirer du fil quand tu veux.",
      "Les commentaires sous un MIX publié sont visibles par tous et suivent les mêmes règles que le reste : pas de contenu illégal, injurieux, haineux, trompeur ou dangereux. Tu peux signaler un MIX ou un commentaire, et bloquer un auteur (ses mix et ses commentaires sont alors masqués pour toi seulement).",
      "Un MIX ou un commentaire signalé par trois personnes est masqué automatiquement. L'auteur d'un MIX peut retirer un commentaire sur son MIX : le retrait est indiqué à l'écran. L'éditeur peut aussi retirer un contenu ou fermer un compte en cas d'abus.",
      "Les MIX du fil sont créés par des utilisateurs : l'éditeur ne les vérifie pas et n'est pas responsable de leur contenu ni de leur intensité. Vérifie qu'un MIX te convient avant de le suivre.",
    ],
  },
  {
    heading: '5. Fonctionnalités Pro',
    paragraphs: [
      "Certains modes (TABATA, MIX) ont un nombre de lancements gratuits limité par semaine (4 pour TABATA, 3 pour MIX), qui revient chaque lundi. Un accès Pro illimité est prévu, avec un vrai paiement via le Google Play Store à la sortie officielle de l'application.",
    ],
  },
  {
    heading: '6. Responsabilité',
    paragraphs: [
      "L'application est fournie « en l'état », sans garantie d'absence d'erreur ou d'interruption. Les services en ligne (compte, synchronisation, fil public) peuvent être interrompus ou modifiés à tout moment. L'éditeur ne pourra être tenu responsable d'un dommage direct ou indirect résultant de l'utilisation de l'application.",
    ],
  },
  {
    heading: '7. Modification des présentes conditions',
    paragraphs: [
      "Ces conditions peuvent être mises à jour, notamment à la sortie de la version publique. La date de dernière mise à jour est indiquée en haut de cette page.",
    ],
  },
  {
    heading: '8. Contact',
    paragraphs: [
      'Pour toute question, écris à yaomanuit@gmail.com.',
    ],
  },
];

export default function Terms() {
  return (
    <LegalScreen
      title="Conditions d'utilisation"
      updatedAt="6 octobre 2026 · version bêta"
      sections={SECTIONS}
    />
  );
}
