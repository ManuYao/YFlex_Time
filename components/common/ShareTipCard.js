import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import AppIcon from './AppIcon';
import Button from './Button';
import { fonts } from '../../lib/fonts';
import { D, easeImpact, springBouncy } from '../../lib/animations';

const OK_GREEN = '#1FC777';

const STEPS = [
  "Envoie-le à un ami ou à ton partenaire d'entraînement (WhatsApp, Instagram, SMS…).",
  "De son côté, il ouvre Flex Timer, va dans le constructeur MIX, touche le bouton de partage et colle le lien dans « Recevoir un mix ».",
];

/**
 * Explication montrée une seule fois, à la toute première copie d'un lien de
 * MIX (lib/shareOnboarding.js) : pensée pour que les deux personnes
 * comprennent le trajet du lien si elles découvrent l'app en même temps.
 * Carte posée sous le bouton, pas une fenêtre plein écran.
 */
export default function ShareTipCard({ onDismiss }) {
  const appear = useSharedValue(0);

  useEffect(() => {
    appear.value = withSpring(1, springBouncy);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, appear.value * 1.4),
    transform: [
      { translateY: (1 - appear.value) * 14 },
      { scale: 0.96 + appear.value * 0.04 },
    ],
  }));

  const dismiss = () => {
    appear.value = withTiming(0, { duration: D.fast, easing: easeImpact });
    setTimeout(() => onDismiss?.(), D.fast);
  };

  return (
    <Animated.View style={[styles.card, style]}>
      <View style={styles.head}>
        <View style={styles.badge}>
          <AppIcon name="check" size={16} color="#0A0A0A" />
        </View>
        <Text style={styles.title}>Lien copié !</Text>
      </View>
      {STEPS.map((text, i) => (
        <View key={i} style={styles.step}>
          <Text style={styles.stepNum}>{i + 1}</Text>
          <Text style={styles.stepText}>{text}</Text>
        </View>
      ))}
      <Button variant="glass" size="sm" label="Compris" onPress={dismiss} style={styles.cta} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(31,199,119,0.55)',
    backgroundColor: 'rgba(31,199,119,0.10)',
    padding: 16,
    gap: 10,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: OK_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  step: {
    flexDirection: 'row',
    gap: 10,
  },
  stepNum: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    color: OK_GREEN,
    width: 14,
    marginTop: 1,
  },
  stepText: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.78)',
  },
  cta: {
    alignSelf: 'flex-end',
    marginTop: 2,
  },
});
