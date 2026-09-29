import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import PressTap from '../common/PressTap';
import AppIcon from '../common/AppIcon';
import { BlockStrip } from '../common/MixPublicSheet';
import { haptic } from '../../hooks/useHaptic';
import { fonts } from '../../lib/fonts';
import { MOCK_PUBLIC_MIXES } from '../../lib/profileMock';

// Aperçu du fil : les blocs des mixes à la suite, pour que la rangée annonce
// déjà la couleur de ce qu'on va y trouver.
const PUBLIC_PREVIEW = MOCK_PUBLIC_MIXES.flatMap((m) => m.blocks).slice(0, 12);

function NavRow({ icon, title, sub, onPress, children }) {
  return (
    <PressTap onPress={onPress} onHapticIn={haptic.light} tapScale={0.98} style={styles.row}>
      <View style={styles.iconBox}>
        <AppIcon name={icon} size={18} color="#FFFFFF" />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.rowSub} numberOfLines={2}>{sub}</Text>
        <View style={styles.preview}>{children}</View>
      </View>
      <AppIcon name="arrow" size={16} color="rgba(255,255,255,0.40)" />
    </PressTap>
  );
}

export default function ProfileMixShare({ onOpenPublic }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>MIX</Text>
      <View style={styles.card}>
        <NavRow
          icon="share"
          title="Fil public"
          sub="Les mixes des autres, à tester en un geste."
          onPress={onOpenPublic}
        >
          <Text style={styles.countText}>{MOCK_PUBLIC_MIXES.length} MIX À TESTER</Text>
          <BlockStrip blocks={PUBLIC_PREVIEW} height={4} style={styles.strip} />
        </NavRow>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
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
    alignSelf: 'flex-start',
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  rowSub: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  preview: {
    marginTop: 10,
    alignItems: 'flex-start',
  },
  countText: {
    fontFamily: fonts.monoBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.70)',
  },
  strip: {
    alignSelf: 'stretch',
    marginTop: 8,
  },
});
