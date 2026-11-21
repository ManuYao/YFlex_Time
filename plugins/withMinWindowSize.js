// FENÊTRE FLOTTANTE / ÉCRAN PARTAGÉ : ne RIEN déclarer pour la taille de la fenêtre.
//
// Historique : ce plugin ajoutait au manifeste Android un plancher de taille
// (<layout android:minWidth / android:minHeight>, d'abord 300 x 520 dp puis 200 x 120 dp) et
// un drapeau android:resizeableActivity="true" explicite, pour éviter qu'une fenêtre
// flottante Samsung trop petite n'affiche n'importe quoi.
//
// Constat du 21/11/2026 (testeurs Samsung, glisser-déposer vers la « vue pop-up ») : la
// pop-up de notre app s'ouvre GRANDE (≈ 85 % de la largeur de l'écran, ≈ 67 % de sa hauteur,
// forme de portrait) et se redimensionne mal (une seule direction à la fois), alors que celle
// de SmartWOD (concurrent, React Native lui aussi) s'ouvre toute petite et se redimensionne
// librement dans tous les sens. Lecture du manifeste de SmartWOD v1.47.1 (téléchargé sur un
// miroir public, jamais exécuté, supprimé après lecture) : sa MainActivity est celle de React
// Native par défaut. Elle ne déclare AUCUN <layout>, AUCUN resizeableActivity, AUCUNE
// orientation, AUCUNE métadonnée Samsung ; même launchMode (singleTask) et mêmes
// configChanges que nous (screenSize|smallestScreenSize|screenLayout|orientation|uiMode|
// keyboard|keyboardHidden) ; et son code ne contient aucun appel de verrouillage d'orientation.
// SmartWOD ne fait donc rien de spécial : sa liberté vient de ce qu'il ne touche à rien.
//
// Nous déclarions en plus : le <layout> ci-dessus, resizeableActivity explicite, et (en JS,
// components/common/OrientationGate.js) un verrou portrait posé en plein écran. Le verrou se
// teste sans APK (Paramètres › Mémoire › « Fenêtre flottante »). Ce plugin règle la partie
// NATIVE : il RETIRE le <layout> et le drapeau explicite, pour que notre manifeste soit celui
// de SmartWOD. Le plancher n'est plus nécessaire : les paliers du chrono et de l'accueil
// (lib/windowTiers.js, lib/responsive.js) savent afficher une très petite fenêtre, et Android
// garde son propre plancher.
//
// Le plugin reste dans app.json exprès : il documente la décision et retire ces deux
// déclarations si un autre plugin ou un modèle les ajoute un jour.
//
// ATTENTION : changement natif (il change l'empreinte). Il ne part qu'avec un nouvel APK (eas
// build), jamais en mise à jour à distance, et ne se commite qu'au moment du build.
const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

module.exports = (config) =>
  withAndroidManifest(config, (cfg) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);
    delete activity.layout;
    delete activity.$['android:resizeableActivity'];
    return cfg;
  });
