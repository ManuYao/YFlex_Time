import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppIcon from './AppIcon';
import PressTap from './PressTap';
import { fonts } from '../../lib/fonts';
import { useHaptic } from '../../hooks/useHaptic';
import { startBatteryEco, applyEcoPending, subscribeEcoNotice } from '../../lib/batteryEco';

// Écrans où l'on ne montre PAS le message (séance, décompte, démarrage…) : il attend le
// retour sur un écran calme.
const QUIET_ROUTES = ['/running', '/countdown', '/onboarding', '/tutorial', '/season-recap'];
const NOTICE_MS = 8000;

/**
 * Économie de batterie (lib/batteryEco.js) : démarre le suivi de la batterie, applique le
 * changement à chaque CHANGEMENT D'ÉCRAN (jamais pendant qu'on regarde) et affiche un
 * petit message SEMI-TRANSPARENT (plus que les autres fenêtres) quand les décors viennent
 * d'être coupés. Il disparaît tout seul au bout de quelques secondes, ou au toucher.
 */
export default function BatteryEcoGate() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const haptic = useHaptic();
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
      <Animated.View
        entering={FadeInDown.duration(220)}
        exiting={FadeOut.duration(260)}
        style={styles.card}
      >
        <View style={styles.iconWrap}>
          <AppIcon name="bolt" size={16} color="rgba(255,255,255,0.9)" />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>Économie de batterie</Text>
          <Text style={styles.body}>
            Batterie faible : les décors animés sont coupés temporairement.
          </Text>
        </View>
        <PressTap
          tapScale={0.94}
          hitSlop={12}
          onHapticIn={haptic.light}
          onPress={() => setShown(false)}
          accessibilityLabel="Fermer le message"
        >
          <Text style={styles.ok}>OK</Text>
        </PressTap>
      </Animated.View>
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
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  // Volontairement plus transparent que les autres fenêtres de l'app (fond ~55 %), sans
  // flou ni `elevation` : un liseré fin le détache du décor.
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    maxWidth: 380,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(18,18,18,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  textWrap: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.95)',
  },
  body: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 2,
  },
  ok: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 6,
  },
});
