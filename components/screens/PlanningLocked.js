import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import AppIcon from '../common/AppIcon';
import Button from '../common/Button';
import IconButton from '../common/IconButton';
import MixPill from '../common/MixPill';
import PageDots from '../common/PageDots';
import { categoryChip } from '../../lib/exercises';
import { DAYS, loadPlanning, countDay } from '../../lib/planning';
import { goBackSafe } from '../../lib/navigation';
import { GOLD } from '../../lib/buttonTokens';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';

// Fondu de l'exemple : net en haut, noir en bas (même recette que l'aperçu de
// l'analyse avancée, components/screens/ProfileAnalytics.js).
const FADE_COLORS = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,1)'];
const FADE_LOCATIONS = [0, 0.4, 0.75, 1];

// Exemple purement illustratif (jamais les données de la personne).
const DEMO_BLOCKS = [
  { name: 'Jambes', category: 'jambes', tags: ['SQUAT', 'FENTES'] },
  { name: 'Dos / biceps', category: 'dos', tags: ['TRACTIONS', 'ROWING BARRE'] },
];

const BENEFITS = [
  {
    icon: 'calendar',
    title: 'Ta semaine, jour par jour',
    desc: 'Prépare chaque séance avec ses exercices, ses charges et ses repos.',
  },
  {
    icon: 'play',
    title: 'Lance un bloc en MIX',
    desc: 'Maintiens 2 s sur un bloc : il devient un MIX prêt à partir. Lance aussi un de tes mix enregistrés.',
  },
  {
    icon: 'history',
    title: 'Archives et progression',
    desc: 'Retrouve tes semaines passées, et l’app te dit quand augmenter une charge.',
  },
];

/**
 * Page « Mon planning » d'une personne SANS Premium : le planning est une
 * fonction Premium (décision du 15/10/2026), il n'existe donc pas pour elle.
 * Plutôt que de cacher la page, on la montre verrouillée — un exemple en
 * fondu et ce que Premium apporte — pour que la fonction se découvre. Même
 * entête et mêmes points de page que PlanningPage : on glisse entre
 * l'historique et le planning comme d'habitude.
 *
 * Les blocs déjà créés avant ce choix ne sont JAMAIS effacés : ils attendent,
 * et reviennent tels quels avec Premium (c'est dit ici, pour rassurer).
 */
export default function PlanningLocked({ width, height, pageIndex, onSelectPage }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Nombre de blocs déjà créés (0 pour la plupart) — pour la phrase qui rassure.
  const [savedBlocks, setSavedBlocks] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadPlanning().then((p) => {
      if (cancelled) return;
      setSavedBlocks(DAYS.reduce((n, d) => n + countDay(p, d.key).blocks, 0));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={[styles.page, { width, height }]}>
      <View style={styles.statusBar}>
        <MixPill />
      </View>

      <View style={styles.topBar}>
        <IconButton
          icon="back"
          halo="left"
          haptic={haptic.light}
          onPress={() => goBackSafe(router)}
          accessibilityLabel="Retour"
        />
        <Text style={styles.topTitle}>Mon planning</Text>
        <IconButton
          icon="gear"
          halo="right"
          haptic={haptic.light}
          onPress={() => router.push('/settings')}
          accessibilityLabel="Réglages"
        />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        {/* Exemple en fondu : la semaine et deux blocs, pour voir à quoi ça ressemble. */}
        <View style={styles.demo} pointerEvents="none">
          <View style={styles.demoDays}>
            {DAYS.map((d) => (
              <View key={d.key} style={[styles.demoDay, d.key === 'tue' && styles.demoDayActive]}>
                <Text style={[styles.demoDayText, d.key === 'tue' && styles.demoDayTextActive]}>{d.short}</Text>
              </View>
            ))}
          </View>
          {DEMO_BLOCKS.map((b) => {
            const chip = categoryChip(b.category);
            return (
              <View key={b.name} style={styles.demoBlock}>
                <Text style={styles.demoBlockName}>{b.name}</Text>
                <View style={styles.demoTags}>
                  {b.tags.map((t) => (
                    <View key={t} style={[styles.demoTag, { backgroundColor: chip.bg, borderColor: chip.border }]}>
                      <Text style={[styles.demoTagText, { color: chip.text }]}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
          <LinearGradient colors={FADE_COLORS} locations={FADE_LOCATIONS} style={StyleSheet.absoluteFill} />
          <Text style={styles.demoLabel}>EXEMPLE</Text>
        </View>

        <View style={styles.head}>
          <AppIcon name="crown" size={26} color={GOLD} />
          <Text style={styles.title}>Le planning est réservé à Premium</Text>
          <Text style={styles.lead}>Les chronos restent gratuits. Le planning, lui, est le confort des Premium.</Text>
        </View>

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <AppIcon name={b.icon} size={18} color={GOLD} />
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitDesc}>{b.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {savedBlocks > 0 && (
          <Text style={styles.kept}>
            {`Tes ${savedBlocks} bloc${savedBlocks > 1 ? 's' : ''} déjà créé${savedBlocks > 1 ? 's' : ''} sont gardés : ils reviennent tels quels avec Premium.`}
          </Text>
        )}

        <View style={styles.cta}>
          <Button
            variant="premium"
            size="lg"
            fullWidth
            icon="crown"
            label="Voir Premium"
            haptic={haptic.medium}
            onPress={() => router.push('/premium')}
          />
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: 8 + insets.bottom }]}>
        <PageDots count={2} activeIndex={pageIndex} onSelect={onSelectPage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  statusBar: { paddingHorizontal: 24, paddingTop: 4, alignItems: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  topTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 24, paddingBottom: 24 },

  demo: { marginBottom: 20, borderRadius: 18, overflow: 'hidden', maxHeight: 250 },
  demoDays: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  demoDay: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoDayActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  demoDayText: { fontFamily: fonts.sansBold, fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,0.55)' },
  demoDayTextActive: { color: '#0A0A0A' },
  demoBlock: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(149,117,255,0.30)',
    marginBottom: 10,
  },
  demoBlockName: { fontFamily: fonts.sansBold, fontSize: 16, color: '#FFFFFF', marginBottom: 10 },
  demoTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  demoTag: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  demoTagText: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 0.6 },
  demoLabel: {
    position: 'absolute',
    top: 4,
    right: 6,
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.45)',
  },

  head: { alignItems: 'center', marginBottom: 18 },
  title: {
    marginTop: 10,
    fontFamily: fonts.sansExtraBold,
    fontSize: 20,
    letterSpacing: -0.4,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  lead: {
    marginTop: 6,
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.60)',
    textAlign: 'center',
  },

  benefits: { gap: 12, marginBottom: 16 },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(240,201,84,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: { flex: 1 },
  benefitTitle: { fontFamily: fonts.sansBold, fontSize: 14, color: '#FFFFFF' },
  benefitDesc: {
    marginTop: 2,
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.55)',
  },

  kept: {
    fontFamily: fonts.sansSemibold,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginBottom: 14,
  },
  cta: { marginTop: 4 },

  bottom: { paddingHorizontal: 24, paddingTop: 12 },
});
