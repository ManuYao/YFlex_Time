// Icône de l'application qui change avec la saison / la fête (Android).
//
// Une « activity-alias » par variante (base, printemps, été, automne, hiver,
// fin d'année, Halloween, Saint-Valentin), une seule activée à la fois par le
// module natif modules/season-icon (PackageManager). MainActivity perd son
// filtre LAUNCHER (sinon deux icônes dans le lanceur) : ce sont les alias qui
// portent le lancement ; ses autres filtres (liens profonds) restent.
// Les images viennent de design/android-icons/<variante>/ (fg, bg, legacy),
// réduites par design/build-android-icons.js.
//
// ATTENTION : changement natif → nouvel APK obligatoire.
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins');

const VARIANTS = ['base', 'spring', 'summer', 'autumn', 'winter', 'yearend', 'halloween', 'valentine'];
const SRC = path.join(__dirname, '..', 'design', 'android-icons');

const withAliases = (config) =>
  withAndroidManifest(config, (cfg) => {
    const pkg = cfg.android?.package;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    const main = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);

    main['intent-filter'] = (main['intent-filter'] || []).filter(
      (f) =>
        !(f.category || []).some((c) => c.$['android:name'] === 'android.intent.category.LAUNCHER')
    );

    const aliases = (app['activity-alias'] || []).filter(
      (a) => !String(a.$['android:name']).includes('.SeasonIcon_')
    );
    for (const v of VARIANTS) {
      aliases.push({
        $: {
          'android:name': `${pkg}.SeasonIcon_${v}`,
          'android:enabled': v === 'base' ? 'true' : 'false',
          'android:exported': 'true',
          'android:icon': `@mipmap/ic_season_${v}`,
          'android:roundIcon': `@mipmap/ic_season_${v}`,
          'android:label': '@string/app_name',
          'android:targetActivity': '.MainActivity',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
            category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
          },
        ],
      });
    }
    app['activity-alias'] = aliases;
    return cfg;
  });

const withImages = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const res = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
      const put = (from, toDir, toName) => {
        fs.mkdirSync(path.join(res, toDir), { recursive: true });
        fs.copyFileSync(from, path.join(res, toDir, toName));
      };
      for (const v of VARIANTS) {
        const dir = path.join(SRC, v);
        put(path.join(dir, 'fg.png'), 'drawable-nodpi', `ic_season_${v}_fg.png`);
        put(path.join(dir, 'bg.png'), 'drawable-nodpi', `ic_season_${v}_bg.png`);
        put(path.join(dir, 'legacy.png'), 'mipmap-xxxhdpi', `ic_season_${v}.png`);
        fs.mkdirSync(path.join(res, 'mipmap-anydpi-v26'), { recursive: true });
        fs.writeFileSync(
          path.join(res, 'mipmap-anydpi-v26', `ic_season_${v}.xml`),
          `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n  <background android:drawable="@drawable/ic_season_${v}_bg"/>\n  <foreground android:drawable="@drawable/ic_season_${v}_fg"/>\n</adaptive-icon>\n`
        );
      }
      return cfg;
    },
  ]);

module.exports = (config) => withImages(withAliases(config));
module.exports.VARIANTS = VARIANTS;
