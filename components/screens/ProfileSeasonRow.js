import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AppIcon from '../common/AppIcon';
import PressTap from '../common/PressTap';
import { AMBIANCES } from '../../lib/ambiance';
import { fonts } from '../../lib/fonts';
import { latestRecapRange } from '../../lib/seasonRecap';
import { haptic } from '../../hooks/useHaptic';

// Rangée du Profil qui rouvre le bilan de saison (app/season-recap.js) : la
// dernière saison finie qui en a un, sinon la saison en cours. Rien tant que la
// personne n'a pas assez de séances (MIN_SEASON_SESSIONS).
export default function ProfileSeasonRow({ sessions, onOpen }) {
  const range = useMemo(() => latestRecapRange(sessions), [sessions]);
  if (!range) return null;
  const accent = AMBIANCES[range.id].accent;
  const inProgress = Date.now() < range.to.getTime();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Bilan de saison</Text>
      <PressTap
        onPress={() => onOpen(range.key)}
        onHapticIn={haptic.light}
        accessibilityRole="button"
        accessibilityLabel={`Bilan ${range.label} ${range.yearLabel}`}
      >
        <View style={[styles.card, { borderColor: accent + '66' }]}>
          <View style={[styles.iconWrap, { backgroundColor: accent + '26' }]}>
            <AppIcon name="season" size={22} color={accent} />
          </View>
          <View style={styles.text}>
            <Text style={styles.title}>{`${range.label} ${range.yearLabel}`}</Text>
            <Text style={styles.sub}>{inProgress ? 'EN COURS · APERÇU' : 'TON BILAN EST PRÊT'}</Text>
          </View>
          <AppIcon name="arrow" size={18} color="rgba(255,255,255,0.6)" />
        </View>
      </PressTap>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  title: { fontFamily: fonts.display, fontSize: 20, lineHeight: 26, color: '#FFFFFF' },
  sub: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
});
