import { useCallback, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import GradientBackground from '../components/common/GradientBackground';
import IconButton from '../components/common/IconButton';
import {
  loadArchives,
  archivesForDay,
  countArchive,
  formatArchiveDate,
  removeArchive,
  getDay,
} from '../lib/planning';
import { fonts } from '../lib/fonts';
import { ROUND_SIZE } from '../lib/buttonTokens';
import { useHaptic } from '../hooks/useHaptic';

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

export default function DayArchives() {
  const router = useRouter();
  const haptic = useHaptic();
  const { day } = useLocalSearchParams();
  const dayInfo = getDay(day);
  const [archives, setArchives] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadArchives().then((list) => {
        if (!cancelled) setArchives(list);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const handleDelete = async (id) => {
    haptic.warning();
    const next = await removeArchive(id);
    setArchives(next ?? archives.filter((a) => a.id !== id));
  };

  const entries = archivesForDay(archives, dayInfo.key);

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
            <Text style={styles.topTitle}>{`Historique · ${dayInfo.long}`}</Text>
          </View>

          <View style={styles.iconBtnGhost} />
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {entries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Aucune archive</Text>
              <Text style={styles.emptyHint}>
                Fais un appui long sur un jour du planning pour l'archiver
              </Text>
            </View>
          ) : (
            entries.map((entry) => (
              <ArchiveRow
                key={entry.id}
                entry={entry}
                onPress={() => {
                  haptic.light();
                  router.push({
                    pathname: '/archive-detail',
                    params: { id: entry.id },
                  });
                }}
                onDelete={() => handleDelete(entry.id)}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function ArchiveRow({ entry, onPress, onDelete }) {
  const swipeRef = useRef(null);
  const counts = countArchive(entry);
  const summary = `${plural(counts.blocks, 'bloc')} · ${plural(counts.tags, 'exercice')}`;

  const renderRightActions = () => (
    <Pressable
      onPress={() => {
        swipeRef.current?.close();
        onDelete?.();
      }}
      style={({ pressed }) => [
        styles.deleteAction,
        pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
      ]}
    >
      <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
        <Path
          d="M3 5h12M7 5V3h4v2M5 5l1 10h6l1-10M8 8v5M10 8v5"
          stroke="#FFFFFF"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={styles.deleteLabel}>Supprimer</Text>
    </Pressable>
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      >
        <View style={styles.rowInfo}>
          <Text style={styles.rowDate}>{formatArchiveDate(entry.date)}</Text>
          <Text style={styles.rowSummary}>{summary}</Text>
        </View>

        <Svg width={8} height={12} viewBox="0 0 8 12" fill="none">
          <Path
            d="M2 2l4 4-4 4"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
    </Swipeable>
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
  topTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.4,
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

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#0A0A0A',
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowDate: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  rowSummary: {
    fontFamily: fonts.monoRegular,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },

  deleteAction: {
    width: 96,
    backgroundColor: '#FF5454',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteLabel: {
    color: '#FFFFFF',
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
