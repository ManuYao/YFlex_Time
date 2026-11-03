import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import PressTap from './PressTap';
import AppIcon from './AppIcon';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';

/**
 * Grand groupe de statistiques (« Tes séances », « Tes jeux »), plié au départ.
 * Il range des petits groupes (`FoldPanel foldable`) qui se déplient à leur tour :
 * deux rangées à l'écran au début, et rien n'est construit tant qu'on n'ouvre pas.
 * Les petits groupes apparaissent en dessous, décalés derrière un trait fin qui dit
 * qu'ils appartiennent au grand.
 *
 *  - `summary` { label, value } : le chiffre qui reste visible quand le groupe est plié.
 */
export default function FoldGroup({ icon, title, subtitle, summary = null, children }) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <PressTap
        onPress={() => {
          haptic.selection();
          setOpen((v) => !v);
        }}
        tapScale={0.99}
        accessibilityLabel={`${title}, ${open ? 'replier' : 'déplier'}`}
      >
        <View style={styles.head}>
          <View style={styles.iconWrap}>
            <AppIcon name={icon} size={18} color="#FFFFFF" opacity={0.9} />
          </View>
          <View style={styles.headText}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {summary ? (
            <View style={styles.right}>
              <Text style={styles.rightLabel}>{summary.label}</Text>
              <Text style={styles.rightValue} numberOfLines={1}>
                {summary.value}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.chevron, open ? styles.chevronOpen : styles.chevronClosed]}>›</Text>
        </View>
      </PressTap>
      {open ? (
        <Animated.View entering={FadeIn.duration(240)} style={styles.children}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 12,
  },
  headText: { flexGrow: 1, flexShrink: 1 },
  title: { fontFamily: fonts.sansExtraBold, fontSize: 16, letterSpacing: -0.2, color: '#FFFFFF' },
  subtitle: {
    marginTop: 2,
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.50)',
  },
  right: { alignItems: 'flex-end', marginLeft: 12, maxWidth: 110 },
  rightLabel: {
    fontFamily: fonts.monoRegular,
    fontSize: 9,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.45)',
  },
  rightValue: { marginTop: 2, fontFamily: fonts.monoBold, fontSize: 12, color: '#FFFFFF' },
  chevron: { marginLeft: 12, fontFamily: fonts.sansBold, fontSize: 22, color: 'rgba(255,255,255,0.45)' },
  chevronClosed: { transform: [{ rotate: '90deg' }] },
  chevronOpen: { transform: [{ rotate: '-90deg' }] },
  // Les petits groupes : un trait fin à gauche, ils « pendent » du grand.
  children: {
    gap: 10,
    marginTop: 10,
    marginLeft: 14,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255,255,255,0.12)',
  },
});
