import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppIcon from './AppIcon';
import Button from './Button';
import { fonts } from '../../lib/fonts';
import { isWindowTooSmall, noticeKind, useWindowSize } from '../../lib/responsive';
import { haptic } from '../../hooks/useHaptic';

/**
 * Message « agrandis la fenêtre » — à monter une seule fois dans app/_layout.js,
 * au-dessus de la Stack. Il recouvre l'écran courant quand la fenêtre (mode
 * multi-fenêtres / pop-up view de Samsung) est trop petite pour qu'il reste
 * utilisable ; il disparaît tout seul dès qu'on agrandit.
 *
 * Seuils et raisons : lib/windowTiers.js (NOTICE_LIMITS). Le chrono (hors MIX) descend très
 * bas (il a un palier « micro ») ; le MIX garde son ancien minimum, donc le message revient
 * dès que la fenêtre est plus petite que celui-ci.
 */
export default function SmallWindowNotice() {
  const { width, height } = useWindowSize();
  const pathname = usePathname();
  const router = useRouter();
  const params = useGlobalSearchParams();

  const timerId = Array.isArray(params?.timerId) ? params.timerId[0] : params?.timerId;
  const kind = noticeKind(pathname, timerId === 'mix');
  if (!isWindowTooSmall(width, height, kind)) return null;

  const onHome = pathname === '/' || pathname === '/home';
  // Très bas : on supprime ce qui n'est pas indispensable pour que le texte
  // tienne quand même.
  const cramped = height < 300;

  return (
    <View style={styles.root} pointerEvents="auto">
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          {!cramped && <AppIcon name="expand" size={34} color="rgba(255,255,255,0.9)" />}
          <Text style={styles.title} numberOfLines={2}>
            Fenêtre trop petite
          </Text>
          <Text style={styles.body}>
            {kind === 'mix'
              ? 'Le MIX a besoin d’un peu plus de place : agrandis la fenêtre.'
              : 'Agrandis la fenêtre pour utiliser cet écran.'}
          </Text>
          {!onHome && (
            <Button
              variant="glass"
              size="md"
              label="Retour à l'accueil"
              haptic={haptic.light}
              onPress={() => router.replace('/home')}
              style={styles.cta}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Opaque : en dessous, l'écran est de toute façon illisible à cette taille.
  // zIndex sous la cinématique de démarrage (1000) et le blocage d'APK (2000).
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 700,
    backgroundColor: '#0A0A0A',
  },
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
  cta: {
    marginTop: 6,
  },
});
