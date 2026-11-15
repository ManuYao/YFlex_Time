import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AppIcon from './AppIcon';
import { usePremium } from '../../hooks/usePremium';
import { fonts } from '../../lib/fonts';

const GOLD = '#F0C954';

/**
 * Petite pastille dorée « couronne + PREMIUM » : repère des fonctions réservées
 * à Premium (jeux, formats). Elle ne s'affiche que pour quelqu'un qui n'a PAS
 * Premium : un abonné n'a plus rien à se faire rappeler (règle 3 de
 * lib/premiumFeatures.js). Rien non plus tant que le statut n'est pas lu, pour
 * ne pas la faire clignoter chez un abonné.
 */
export default function PremiumTag({ label = 'PREMIUM', style }) {
  const { isPremium, loaded } = usePremium();
  if (!loaded || isPremium) return null;
  return (
    <View style={[styles.pill, style]}>
      <AppIcon name="crown" size={11} color={GOLD} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(240,201,84,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(240,201,84,0.4)',
  },
  text: { fontFamily: fonts.sansBold, fontSize: 9, letterSpacing: 1.6, color: GOLD },
});
