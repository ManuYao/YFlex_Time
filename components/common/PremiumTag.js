import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AppIcon from './AppIcon';
import { fonts } from '../../lib/fonts';

const GOLD = '#F0C954';

/**
 * Petite pastille dorée « couronne + PREMIUM » : repère unique des fonctions
 * réservées à Premium (jeux, formats). Toujours visible, même pour un Premium :
 * elle dit « ceci fait partie de Premium », pas « tu n'y as pas droit ».
 */
export default function PremiumTag({ label = 'PREMIUM', style }) {
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
