// Taille minimale de la fenetre en mode multi-fenetres (split-screen et
// fenetre flottante / "pop-up view" Samsung).
//
// Signale par un testeur : en reduisant la fenetre flottante, l'app finit par
// afficher n'importe quoi (l'anneau a ticks et les chiffres geants sont
// dimensionnes en dur). Android sait refuser lui-meme de descendre sous un
// plancher, via l'element <layout> de l'activite (API 24+) — c'est la
// premiere ligne de defense, avant le facteur d'echelle de lib/responsive.js.
//
// ATTENTION : changement natif. Une fois modifie, il faut reconstruire un APK
// (eas build), un `eas update` ne peut pas le livrer.
const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

// En dessous, l'empilement vertical de /running (barre du haut + anneau +
// pastilles de phase + commandes) ne tient plus, meme reduit : seuls l'anneau
// et les chiffres se reduisent, la hauteur du reste est fixe (~210dp).
// A 480dp de haut ca passait au dp pres, d'ou cette marge.
// Valeurs a reajuster si un testeur trouve la fenetre minimale trop grande.
const MIN_WIDTH = '300dp';
const MIN_HEIGHT = '520dp';

module.exports = (config) =>
  withAndroidManifest(config, (cfg) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);
    activity.layout = [
      {
        $: {
          'android:minWidth': MIN_WIDTH,
          'android:minHeight': MIN_HEIGHT,
        },
      },
    ];
    return cfg;
  });
