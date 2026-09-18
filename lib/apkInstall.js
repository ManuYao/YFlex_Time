import { Platform } from 'react-native';

/**
 * Installation directe d'un APK depuis l'app (mise à jour obligatoire /
 * maintenance, lib/apkVersionCheck.js), en plus du simple lien de
 * téléchargement (Linking.openURL, déjà utilisé partout).
 *
 * Android uniquement : télécharge l'APK dans le cache de l'app puis ouvre
 * l'écran d'installation système via une URI content:// (FileProvider géré
 * par expo-file-system — `getContentUriAsync` existe précisément pour ce cas
 * d'usage, sans plugin de config supplémentaire). Nécessite le permission
 * `REQUEST_INSTALL_PACKAGES` (app.json) ; l'utilisateur voit quand même
 * l'écran système "Autoriser cette source" la première fois et la
 * confirmation d'installation ensuite — impossible à sauter, c'est une
 * protection Android, pas une limite de ce code.
 *
 * ⚠️ `expo-file-system`/`expo-intent-launcher` sont requis avec un `require()`
 * DYNAMIQUE, à l'intérieur de la fonction, jamais en `import` statique en tête
 * de fichier. Ce projet a `inlineRequires: false` dans sa config Metro
 * (@expo/metro-config), donc un `import` statique s'exécute immédiatement
 * dès que ce fichier est chargé — `expo-intent-launcher` fait lui-même un
 * `requireNativeModule('ExpoIntentLauncher')` synchrone au chargement de son
 * propre module, qui LÈVE si le module natif n'est pas lié (typiquement dans
 * Expo Go, ou tout dev-client construit avant l'ajout de cette lib). Comme
 * `apkInstall.js` est importé (via `hooks/useApkInstaller.js`) depuis
 * `APKBlockedScreen.js`, lui-même importé statiquement par `app/_layout.js`,
 * un import statique ici pouvait planter le chargement du bundle entier
 * avant même qu'un bouton soit touché — bug constaté le 17/09/2026, corrigé
 * en rendant le require paresseux. (`MaintenanceScreen.js` importait aussi
 * ce chemin jusqu'au 18/09/2026 ; son bouton de téléchargement a été retiré,
 * voir CLAUDE.md section maintenance — seul `APKBlockedScreen` l'utilise
 * encore.)
 *
 * Ne lève jamais : réseau coupé, dossier cache indisponible, action refusée
 * par l'utilisateur, module natif absent → on renvoie { ok:false, reason } et
 * l'appelant retombe sur le lien de téléchargement classique.
 */

const APK_FILENAME = 'flextimer-update.apk';

/**
 * @param {string} url lien direct vers le fichier .apk
 * @param {{ onProgress?: (ratio: number) => void }} [options]
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function installApkFromUrl(url, { onProgress } = {}) {
  if (Platform.OS !== 'android') {
    return { ok: false, reason: 'unsupported-platform' };
  }
  if (!url) {
    return { ok: false, reason: 'no-url' };
  }

  let FileSystem;
  let IntentLauncher;
  try {
    FileSystem = require('expo-file-system/legacy');
    IntentLauncher = require('expo-intent-launcher');
  } catch (e) {
    return { ok: false, reason: 'native-module-unavailable' };
  }

  if (!FileSystem.cacheDirectory) {
    return { ok: false, reason: 'no-cache-dir' };
  }

  const fileUri = FileSystem.cacheDirectory + APK_FILENAME;

  try {
    const resumable = FileSystem.createDownloadResumable(
      url,
      fileUri,
      {},
      (data) => {
        if (!onProgress || !data?.totalBytesExpectedToWrite) return;
        onProgress(data.totalBytesWritten / data.totalBytesExpectedToWrite);
      }
    );

    const result = await resumable.downloadAsync();
    if (!result?.uri) throw new Error('Téléchargement incomplet');

    const contentUri = await FileSystem.getContentUriAsync(result.uri);

    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      type: 'application/vnd.android.package-archive',
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION — indispensable pour une URI content://
    });

    await FileSystem.deleteAsync(fileUri, { idempotent: true });
    return { ok: true };
  } catch (e) {
    // On tente quand même un nettoyage du fichier partiel, sans faire
    // planter le retour d'erreur si ça échoue aussi.
    try {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    } catch {}
    return { ok: false, reason: e?.message || 'unknown-error' };
  }
}
