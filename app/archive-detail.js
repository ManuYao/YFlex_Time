import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import GradientBackground from '../components/common/GradientBackground';
import IconButton from '../components/common/IconButton';
import { loadArchives, formatArchiveDate, getDay } from '../lib/planning';
import { categoryChip } from '../lib/exercises';
import { fonts } from '../lib/fonts';
import { ROUND_SIZE } from '../lib/buttonTokens';
import { haptic } from '../hooks/useHaptic';

export default function ArchiveDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  // `loading` distingue « pas encore chargé » de « id inconnu » : sans ça
  // l'écran affiche « Archive introuvable » le temps du premier await.
  const [state, setState] = useState({ loading: true, entry: null });

  useEffect(() => {
    let cancelled = false;
    loadArchives().then((list) => {
      if (cancelled) return;
      setState({ loading: false, entry: list.find((a) => a.id === id) || null });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const { loading, entry } = state;
  const dayInfo = entry ? getDay(entry.dayKey) : null;

  return (
    <GradientBackground colors={['#1A1A1A', '#0A0A0A', '#000000']} ambient>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>ARCHIVES</Text>
        </View>

        <View style={styles.topBar}>
          <IconButton
            icon="back"
            haptic={haptic.light}
            onPress={() => router.back()}
            accessibilityLabel="Retour"
          />

          <View style={styles.topCenter}>
            {entry && (
              <>
                <View style={styles.titleRow}>
                  <Text style={styles.topTitle}>{dayInfo.long}</Text>
                  <LockIcon />
                </View>
                <Text style={styles.archivedAt}>
                  {`ARCHIVÉ · ${formatArchiveDate(entry.date).toUpperCase()}`}
                </Text>
              </>
            )}
          </View>

          <View style={styles.iconBtnGhost} />
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? null : !entry ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Archive introuvable</Text>
              <Text style={styles.emptyHint}>
                Cette archive a peut-être été supprimée
              </Text>
            </View>
          ) : entry.blocks.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Aucun bloc</Text>
              <Text style={styles.emptyHint}>Ce jour a été archivé sans exercice</Text>
            </View>
          ) : (
            entry.blocks.map((block) => <BlockCard key={block.id} block={block} />)
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function BlockCard({ block }) {
  return (
    <View style={styles.card}>
      <Text style={styles.blockName}>{block.name}</Text>
      {block.tags.length > 0 && (
        <View style={styles.chips}>
          {block.tags.map((tag) => (
            <ExerciseChip key={tag.id} tag={tag} />
          ))}
        </View>
      )}
    </View>
  );
}

function ExerciseChip({ tag }) {
  const chip = categoryChip(tag.category, true);
  const hasWeight = tag.weight != null && tag.weight > 0;

  return (
    <View
      style={[styles.chip, { backgroundColor: chip.bg, borderColor: chip.border }]}
    >
      <Text style={[styles.chipText, { color: chip.text }]}>
        {String(tag.label).toUpperCase()}
        {hasWeight && (
          <Text style={styles.chipWeight}>{` · ${tag.weight}KG`}</Text>
        )}
      </Text>
    </View>
  );
}

function LockIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 16 16" fill="none">
      <Path
        d="M5 7V4.5a3 3 0 016 0V7"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3.5 7h9a1.5 1.5 0 011.5 1.5v5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 13.5v-5A1.5 1.5 0 013.5 7z"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  statusBar: {
    paddingHorizontal: 24,
    paddingTop: 4,
    alignItems: 'center',
  },
  statusText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.55)',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  // Même largeur que le bouton retour (ROUND_SIZE.nav) : garde le titre centré.
  iconBtnGhost: {
    width: ROUND_SIZE.nav,
    height: ROUND_SIZE.nav,
  },
  topCenter: {
    flex: 1,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  archivedAt: {
    fontFamily: fonts.monoRegular,
    fontSize: 11,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 3,
  },

  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  empty: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
  },
  emptyHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  blockName: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    letterSpacing: 0.4,
  },
  chipWeight: {
    fontFamily: fonts.monoBold,
    fontSize: 10.5,
    letterSpacing: 0.4,
  },
});
