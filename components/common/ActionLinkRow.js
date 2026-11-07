import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import PressTap from './PressTap';
import AppIcon from './AppIcon';
import { haptic } from '../../hooks/useHaptic';
import { fonts } from '../../lib/fonts';

/**
 * Petite rangée d'action discrète : icône, titre court, UNE phrase qui dit ce
 * que ça fait, flèche. Même langage que les rangées du Hub Profil
 * (ProfileMixShare) ; sert aux entrées de la « règle des trois fois » (publier
 * un mix, parcourir le fil, partager l'app) là où elles n'ont pas déjà leur
 * propre rangée. Jamais un gros bandeau.
 *
 * La rangée vibre toute seule au toucher : le gestionnaire ne doit donc pas
 * vibrer lui-même (jamais deux vibrations pour un appui).
 */
export default function ActionLinkRow({ icon, title, sub, onPress, accessibilityLabel, style }) {
  return (
    <PressTap
      onPress={onPress}
      onHapticIn={haptic.light}
      tapScale={0.98}
      accessibilityLabel={accessibilityLabel || title}
      style={[styles.row, style]}
    >
      <View style={styles.iconBox}>
        <AppIcon name={icon} size={18} color="#FFFFFF" />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.sub} numberOfLines={2}>{sub}</Text>
      </View>
      <AppIcon name="arrow" size={16} color="rgba(255,255,255,0.40)" />
    </PressTap>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  sub: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
});
