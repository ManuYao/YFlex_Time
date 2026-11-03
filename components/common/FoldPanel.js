import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import PressTap from './PressTap';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';

/**
 * Carte de statistiques, pliable. Pliée au départ : seul l'en-tête se voit (titre,
 * sous-titre et un petit chiffre-résumé), le contenu n'est même pas construit tant
 * qu'on ne l'ouvre pas. `foldable` faux = la carte d'avant, toujours ouverte, avec
 * le même en-tête (le Profil s'en sert tel quel).
 *
 *  - `summary` { label, value } : le chiffre qui reste visible quand la carte est pliée.
 *  - `rightLabel` / `rightValue` : le chiffre d'en-tête quand elle est ouverte (ou
 *    toujours, sans `summary`).
 *  - `dot` : pastille de couleur devant le titre (une couleur de jeu).
 */
export default function FoldPanel({
  title,
  subtitle,
  summary = null,
  rightLabel,
  rightValue,
  dot,
  foldable = false,
  children,
}) {
  const [open, setOpen] = useState(false);
  const expanded = !foldable || open;

  const right = foldable && !open && summary
    ? summary
    : rightValue
      ? { label: rightLabel, value: rightValue }
      : null;

  const header = (
    <View style={[styles.head, expanded && styles.headOpen]}>
      <View style={styles.headText}>
        <View style={styles.titleRow}>
          {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? (
        <View style={styles.right}>
          {right.label ? <Text style={styles.rightLabel}>{right.label}</Text> : null}
          <Text style={styles.rightValue} numberOfLines={1}>
            {right.value}
          </Text>
        </View>
      ) : null}
      {foldable ? <Text style={[styles.chevron, open ? styles.chevronOpen : styles.chevronClosed]}>›</Text> : null}
    </View>
  );

  return (
    <View style={styles.card}>
      {foldable ? (
        <PressTap
          onPress={() => {
            haptic.selection();
            setOpen((v) => !v);
          }}
          tapScale={0.99}
          accessibilityLabel={`${title}, ${open ? 'replier' : 'déplier'}`}
        >
          {header}
        </PressTap>
      ) : (
        header
      )}
      {expanded ? (
        foldable ? (
          <Animated.View entering={FadeIn.duration(240)}>{children}</Animated.View>
        ) : (
          children
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    padding: 16,
  },
  head: { flexDirection: 'row', alignItems: 'center' },
  headOpen: { alignItems: 'flex-start', marginBottom: 14 },
  headText: { flexGrow: 1, flexShrink: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  title: { flexShrink: 1, fontFamily: fonts.sansBold, fontSize: 14, color: '#FFFFFF' },
  subtitle: {
    marginTop: 2,
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.50)',
  },
  right: { alignItems: 'flex-end', marginLeft: 12, maxWidth: 130 },
  rightLabel: {
    fontFamily: fonts.monoRegular,
    fontSize: 9,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.45)',
  },
  rightValue: { marginTop: 2, fontFamily: fonts.monoBold, fontSize: 12, color: '#FFFFFF' },
  // « › » tourné : vers le bas quand c'est plié, vers le haut quand c'est ouvert.
  chevron: { marginLeft: 12, fontFamily: fonts.sansBold, fontSize: 22, color: 'rgba(255,255,255,0.45)' },
  chevronClosed: { transform: [{ rotate: '90deg' }] },
  chevronOpen: { transform: [{ rotate: '-90deg' }] },
});
