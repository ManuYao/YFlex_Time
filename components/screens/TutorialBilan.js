import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import TutorialFrame from './TutorialFrame';
import TickRing from '../common/TickRing';
import AppIcon from '../common/AppIcon';
import Button from '../common/Button';
import Confetti from '../common/Confetti';
import { fonts } from '../../lib/fonts';
import { useHaptic } from '../../hooks/useHaptic';

// Retour du chrono de test. Deux variantes :
//  - réussi (`success`) : on félicite, on rappelle les 3 choses à retenir, puis
//    on PROPOSE la suite (niveau 2) sans jamais l'imposer ;
//  - interrompu : aucun reproche, on propose de refaire le test ou de quitter.

const TAKEAWAYS = [
  { icon: 'stopwatch', text: "Un grand chiffre au centre : c'est le temps de la phase en cours." },
  { icon: 'play', text: 'Un bouton au centre pour avancer : REPOS, FINI ou pause, selon le mode.' },
  { icon: 'mix', text: 'Les 5 modes marchent pareil. Tu règles, tu lances, tu suis le chiffre.' },
];

const GREEN = ['#1FC777', '#047442', '#022A18'];
const GREY = ['#3A3A3A', '#1A1A1A', '#050505'];

export default function TutorialBilan({ success, onContinue, onFinish, onRetry }) {
  const haptic = useHaptic();
  const { height: screenH } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const ring = Math.max(96, Math.min(150, screenH - 560));

  // La coche arrive avec un rebond : c'est le moment gratifiant du tour.
  const pop = useSharedValue(reduceMotion ? 1 : 0.5);
  useEffect(() => {
    if (success) {
      haptic.success();
      if (!reduceMotion) pop.value = withDelay(150, withSpring(1, { damping: 9, stiffness: 200 }));
    }
  }, []);
  const popStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.4 - 0.2),
    transform: [{ scale: pop.value }],
  }));

  const colors = success ? GREEN : GREY;

  const footer = success ? (
    <>
      <Button
        variant="solid"
        fullWidth
        icon="arrow"
        iconPosition="right"
        label="Continuer vers l'étape 2"
        haptic={haptic.medium}
        onPress={onContinue}
      />
      <Button
        variant="glass"
        size="md"
        fullWidth
        label="Terminer et ouvrir l'app"
        haptic={haptic.light}
        onPress={onFinish}
      />
    </>
  ) : (
    <>
      <Button
        variant="solid"
        fullWidth
        icon="reset"
        label="Refaire le test"
        haptic={haptic.medium}
        onPress={onRetry}
      />
      <Button
        variant="glass"
        size="md"
        fullWidth
        label="Quitter le tuto"
        haptic={haptic.light}
        onPress={onFinish}
      />
    </>
  );

  return (
    <TutorialFrame
      colors={colors}
      textMode="light"
      eyebrow={success ? 'Tour guidé · Niveau 1 · Bilan' : 'Tour guidé · Test interrompu'}
      index={success ? 2 : undefined}
      total={success ? 3 : undefined}
      onQuit={onFinish}
      footer={footer}
    >
      {success ? <Confetti /> : null}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View style={[{ width: ring, height: ring }, popStyle]}>
          <TickRing
            progress={success ? 1 : 0.4}
            size={ring}
            colorActive="#FFFFFF"
            colorInactive="rgba(255,255,255,0.22)"
          />
          <View style={styles.ringCenter} pointerEvents="none">
            <AppIcon name={success ? 'check' : 'pause'} size={Math.round(ring * 0.36)} color="#FFFFFF" />
          </View>
        </Animated.View>

        <Text style={styles.title}>{success ? 'BIEN JOUÉ' : 'PAS DE SOUCI'}</Text>
        <Text style={styles.sub}>
          {success
            ? "Étape 1 terminée : tu viens de faire un vrai chrono. Voilà ce qu'il faut retenir. L'étape 2 (30 s, sans chrono) te montre où trouver le reste de l'app."
            : "Tu as quitté le test. Tu peux le refaire, ou t'arrêter ici : le tour reste dans les Paramètres."}
        </Text>

        {success ? (
          <View style={styles.list}>
            {TAKEAWAYS.map((row, i) => (
              <Animated.View
                key={row.icon}
                entering={FadeInDown.delay(320 + i * 110).duration(320)}
                style={styles.row}
              >
                <View style={styles.rowIcon}>
                  <AppIcon name={row.icon} size={16} color="#FFFFFF" />
                </View>
                <Text style={styles.rowText}>{row.text}</Text>
              </Animated.View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </TutorialFrame>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 8,
  },
  ringCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 48,
    // Anton : ×1,18 (piège n°19).
    lineHeight: 57,
    letterSpacing: 1,
    includeFontPadding: false,
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  sub: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.80)',
    textAlign: 'center',
    maxWidth: 320,
    marginTop: 6,
  },
  list: {
    width: '100%',
    maxWidth: 360,
    gap: 8,
    marginTop: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.92)',
  },
});
