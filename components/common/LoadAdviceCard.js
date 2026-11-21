import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import AppIcon from './AppIcon';
import Button from './Button';
import { fonts } from '../../lib/fonts';
import { useHaptic } from '../../hooks/useHaptic';
import { recordTrophyFlag } from '../../lib/trophyFacts';
import { announceTrophies } from '../../lib/badgeCelebration';

// Virgule décimale : l'app est en français, « 62,5 kg » et pas « 62.5 kg ».
export const kgText = (w) => String(w).replace('.', ',');

// « 3 séances de suite à 60 kg » (le conseil, voir lib/loadAdviceShape.js).
export const adviceSummary = ({ count, weight }) =>
  `${count} séances de suite à ${kgText(weight)} kg`;

/**
 * Petit conseil « tu peux monter » posé là où on règle la charge (fiche d'un
 * exercice du Planning, bulle de charge pendant la séance). On propose, on
 * n'impose pas : ignorer la carte ne change rien. Seul le bouton applique la
 * charge conseillée. `color` = couleur de l'exercice ou du mode (hex plein).
 */
export default function LoadAdviceCard({ advice, color = '#FFFFFF', onApply, style }) {
  const haptic = useHaptic();
  if (!advice) return null;
  const target = kgText(advice.suggested);

  return (
    <View style={[styles.card, { borderColor: `${color}55`, backgroundColor: `${color}14` }, style]}>
      <View style={styles.head}>
        <View style={[styles.badge, { backgroundColor: `${color}26` }]}>
          <AppIcon name="up" size={16} color={color} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title}>Tu peux monter à {target} kg</Text>
          <Text style={styles.sub}>{adviceSummary(advice)}</Text>
        </View>
      </View>
      <Button
        variant="solid"
        size="md"
        fullWidth
        label={`Passer à ${target} kg`}
        haptic={haptic.medium}
        onPress={() => {
          // Trophée « Surcharge acceptée » : on a suivi le conseil.
          recordTrophyFlag('overload').then(() => announceTrophies('any'));
          onApply?.(advice.suggested);
        }}
        style={styles.cta}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  sub: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  cta: {
    marginTop: 12,
  },
});
