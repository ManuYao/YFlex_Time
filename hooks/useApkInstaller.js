import { useCallback, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';

import { installApkFromUrl } from '../lib/apkInstall';
import { haptic } from './useHaptic';

/**
 * État + actions pour les deux boutons "mise à jour APK" (écran de blocage
 * ET écran de maintenance, lib/apkVersionCheck.js) : téléchargement manuel
 * via le navigateur (marche partout, toujours proposé) et installation
 * automatique (Android seulement, lib/apkInstall.js) — les deux options
 * restent visibles en même temps, l'utilisateur choisit.
 */
export function useApkInstaller(downloadUrl) {
  const [status, setStatus] = useState('idle'); // idle | downloading | error
  const [progress, setProgress] = useState(0);
  const runningRef = useRef(false);

  const canAutoInstall = Platform.OS === 'android' && !!downloadUrl;

  const autoInstall = useCallback(async () => {
    if (!downloadUrl || runningRef.current || Platform.OS !== 'android') return;
    runningRef.current = true;
    setStatus('downloading');
    setProgress(0);
    haptic.medium();

    const result = await installApkFromUrl(downloadUrl, { onProgress: setProgress });
    runningRef.current = false;

    if (result.ok) {
      setStatus('idle');
      setProgress(0);
    } else {
      setStatus('error');
      haptic.error();
    }
  }, [downloadUrl]);

  const openInBrowser = useCallback(async () => {
    if (!downloadUrl) return;
    haptic.medium();
    try {
      await Linking.openURL(downloadUrl);
    } catch {
      // Lien cassé côté Gist : rien de plus à faire ici, l'adresse reste
      // affichée à l'écran pour être recopiée à la main.
    }
  }, [downloadUrl]);

  return {
    canAutoInstall,
    status,
    progress,
    autoInstall,
    openInBrowser,
  };
}
