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

// Plancher ABAISSE (demande de l'utilisateur) : le chrono (AMRAP, EMOM, TABATA,
// BASIC) a maintenant des paliers jusqu'au « micro » — juste les chiffres, les
// commandes apparaissent quand on touche le chiffre (lib/windowTiers.js,
// app/running.js). Avant, le plancher etait 300 x 520 dp : en dessous, l'empilement
// vertical ne tenait plus. Android applique de toute facon son propre plancher
// (~220 dp en fenetre flottante) : ces valeurs ne servent qu'aux appareils qui
// laissent descendre plus bas.
//
// Le MIX, lui, GARDE l'ancien minimum 300 x 520 (decision de l'utilisateur) : le
// plancher natif est le meme pour toute l'app, donc c'est l'ecran qui le fait
// respecter (message « Agrandis la fenetre », NOTICE_LIMITS.mix dans lib/windowTiers.js).
// Les autres ecrans (listes, feuilles) ont aussi leur message sous 430 x 270.
const MIN_WIDTH = '200dp';
const MIN_HEIGHT = '120dp';

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
