import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MiniToast from './MiniToast';
import { startBatteryEco, applyEcoPending, subscribeEcoNotice } from '../../lib/batteryEco';

// Écrans où l'on ne montre PAS le message (séance, décompte, démarrage…) : il attend le
// retour sur un écran calme.
const QUIET_ROUTES = ['/running', '/countdown', '/onboarding', '/tutorial', '/season-recap'];
const NOTICE_MS = 6000;

/**
 * Économie de batterie (lib/batteryEco.js) : démarre le suivi de la batterie, applique le
 * changement à chaque CHANGEMENT D'ÉCRAN (jamais pendant qu'on regarde) et affiche une
 * petite note quand les décors viennent d'être coupés. Ne dessine rien d'autre.
 */
export default function BatteryEcoGate() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const first = useRef(true);
  const [wantNotice, setWantNotice] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    startBatteryEco();
    return subscribeEcoNotice(() => setWantNotice(true));
  }, []);

  // Un changement d'écran = le bon moment pour rattraper l'état voulu (le premier rendu
  // ne compte pas : le démarrage est géré par startBatteryEco).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    applyEcoPending();
  }, [pathname]);

  // Le message attend un écran calme, puis disparaît tout seul.
  const quiet = !QUIET_ROUTES.includes(pathname);
  useEffect(() => {
    if (wantNotice && quiet) {
      setWantNotice(false);
      setShown(true);
    }
  }, [wantNotice, quiet]);
  useEffect(() => {
    if (!shown) return undefined;
    const id = setTimeout(() => setShown(false), NOTICE_MS);
    return () => clearTimeout(id);
  }, [shown]);

  if (!shown) return null;
  return (
    <View pointerEvents="box-none" style={[styles.layer, { bottom: insets.bottom + 72 }]}>
      <MiniToast icon="bolt" text="Batterie faible : les décors animés sont coupés pour économiser." />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 0,
    zIndex: 8000,
  },
});
