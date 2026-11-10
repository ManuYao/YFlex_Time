import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import BottomSheet from '../common/BottomSheet';
import AppIcon from '../common/AppIcon';
import Button from '../common/Button';
import IconButton from '../common/IconButton';
import { ROUND_SIZE } from '../../lib/buttonTokens';
import { fonts } from '../../lib/fonts';
import { useHaptic } from '../../hooks/useHaptic';
import { MIX_TUTORIAL_STEPS } from '../../lib/mixTutorial';

/**
 * Tutoriel du MIX en une feuille de quatre pages (voir lib/mixTutorial.js).
 * Jamais imposé : la croix et « Passer » ferment à tout moment. `onDone` est
 * appelé une seule fois, quelle que soit la façon de sortir (le tutoriel est
 * alors considéré comme vu).
 */
export default function MixTutorialSheet({ screenH, onDone }) {
  const haptic = useHaptic();
  const [i, setI] = useState(0);
  const doneRef = useRef(false);
  const step = MIX_TUTORIAL_STEPS[i];
  const isLast = i === MIX_TUTORIAL_STEPS.length - 1;

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone?.();
  };

  return (
    <BottomSheet screenH={screenH} onClose={finish}>
      {({ close }) => (
        <View>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.kicker}>TUTORIEL MIX</Text>
              <Text style={styles.count}>
                {i + 1}/{MIX_TUTORIAL_STEPS.length}
              </Text>
            </View>
            <IconButton
              icon="close"
              size={ROUND_SIZE.sheet}
              haptic={haptic.light}
              onPress={close}
              accessibilityLabel="Fermer"
            />
          </View>

          <Animated.View key={step.id} entering={FadeIn.duration(220)} style={styles.page}>
            <View style={styles.iconWrap}>
              <AppIcon name={step.icon} size={30} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.text}>{step.text}</Text>
          </Animated.View>

          <View style={styles.dots}>
            {MIX_TUTORIAL_STEPS.map((s, k) => (
              <View key={s.id} style={[styles.dot, k === i && styles.dotOn]} />
            ))}
          </View>

          <View style={styles.actions}>
            {isLast ? (
              <View />
            ) : (
              <Button variant="ghost" size="sm" label="Passer" onPress={close} />
            )}
            <Button
              variant="solid"
              size="md"
              label={isLast ? 'Compris' : 'Suivant'}
              icon={isLast ? 'check' : 'arrow'}
              iconPosition={isLast ? 'left' : 'right'}
              onPress={() => {
                haptic.light();
                if (isLast) close();
                else setI((v) => v + 1);
              }}
            />
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  kicker: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    marginBottom: 6,
  },
  count: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.70)',
  },
  // Hauteur minimale fixe : la feuille ne saute pas d'une page à l'autre.
  page: {
    minHeight: 170,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(149,117,255,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(149,117,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 22,
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  text: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.84)',
    marginTop: 10,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 14,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  dotOn: {
    width: 20,
    backgroundColor: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
