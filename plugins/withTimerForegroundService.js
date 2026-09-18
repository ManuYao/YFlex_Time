// Service de premier plan pour le chrono de séance (notification persistante
// Notifee, voir lib/timerNotification.js).
//
// Le core Notifee déclare son service avec `foregroundServiceType="shortService"`
// — Android 14+ coupe un tel service au bout de 3 minutes, inutilisable pour
// une séance de 20 min. On remplace le type par `specialUse` (aucun type
// standard ne couvre un chronomètre) et on ajoute un drawable monochrome pour
// l'icône de barre de statut (le launcher icon coloré rend un carré blanc).
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SERVICE = 'app.notifee.core.ForegroundService';
const ICON_NAME = 'ic_stat_timer';

// Glyphe "timer" Material Icons (Apache 2.0), blanc : Android le teinte lui-même.
const ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
  <path
      android:fillColor="#FFFFFFFF"
      android:pathData="M15,1H9v2h6V1zM11,14h2V8h-2v6zM19.03,7.39l1.42,-1.42c-0.43,-0.51 -0.9,-0.99 -1.41,-1.41l-1.42,1.42C16.07,4.74 14.12,4 12,4c-4.97,0 -9,4.03 -9,9s4.02,9 9,9 9,-4.03 9,-9c0,-2.12 -0.74,-4.07 -1.97,-5.61zM12,20c-3.87,0 -7,-3.13 -7,-7s3.13,-7 7,-7 7,3.13 7,7 -3.13,7 -7,7z" />
</vector>
`;

const withServiceType = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    manifest.manifest.$ = manifest.manifest.$ || {};
    manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    app.service = (app.service || []).filter((s) => s.$?.['android:name'] !== SERVICE);
    app.service.push({
      $: {
        'android:name': SERVICE,
        'android:exported': 'false',
        'android:foregroundServiceType': 'specialUse',
        'tools:replace': 'android:foregroundServiceType',
      },
      property: [
        {
          $: {
            'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
            'android:value':
              'Chronometre de seance sportive : le temps restant et les commandes restent visibles dans la notification pendant tout l entrainement.',
          },
        },
      ],
    });
    return cfg;
  });

const withStatusBarIcon = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/drawable');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${ICON_NAME}.xml`), ICON_XML);
      return cfg;
    },
  ]);

module.exports = (config) => withStatusBarIcon(withServiceType(config));
