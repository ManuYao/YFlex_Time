import React, { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurTargetView } from 'expo-blur';

import GradientBackground from '../components/common/GradientBackground';
import IconButton from '../components/common/IconButton';
import ModeStatsSheet from '../components/common/ModeStatsSheet';
import DisciplineSheet from '../components/common/DisciplineSheet';
import MixPublicSheet from '../components/common/MixPublicSheet';
import ShareSessionSheet from '../components/common/ShareSessionSheet';
import ProfileHeader from '../components/screens/ProfileHeader';
import ProfileAnalytics from '../components/screens/ProfileAnalytics';
import ProfileMixShare from '../components/screens/ProfileMixShare';
import ProfileGamification from '../components/screens/ProfileGamification';
import { useTimers } from '../contexts/TimersContext';
import { usePremium } from '../hooks/usePremium';
import { haptic } from '../hooks/useHaptic';
import { fonts } from '../lib/fonts';
import { getBadgeProgress } from '../lib/badges';
import { MOCK_IDENTITY, MOCK_REGULARITY, MOCK_BADGE_COUNTS, MOCK_MODE_TIME } from '../lib/profileMock';

/**
 * Hub Profil — remplace l'accès direct aux Paramètres depuis l'accueil (les
 * Paramètres restent à un tap, via l'engrenage en haut). Étape maquette :
 * tout le contenu vient de lib/profileMock.js, rien n'est persisté.
 */
export default function Profile() {
  const router = useRouter();
  const { height: screenH } = useWindowDimensions();
  const { timers } = useTimers();
  const { isPremium } = usePremium();
  const blurTargetRef = useRef(null);

  const [disciplineIds, setDisciplineIds] = useState(MOCK_IDENTITY.disciplineIds);
  const [disciplineSheet, setDisciplineSheet] = useState(false);
  const [publicMixSheet, setPublicMixSheet] = useState(false);
  const [statsTimerId, setStatsTimerId] = useState(null);
  const [shareSheet, setShareSheet] = useState(false);

  const trophies = useMemo(() => {
    let unlocked = 0;
    for (const t of timers) {
      unlocked += getBadgeProgress(t.id, MOCK_BADGE_COUNTS[t.id] ?? 0).tiers.filter((x) => x.unlocked).length;
    }
    return { unlocked, total: timers.length * 3 };
  }, [timers]);

  const statsTimer = statsTimerId ? timers.find((t) => t.id === statsTimerId) : null;

  return (
    <View style={styles.root}>
      <BlurTargetView ref={blurTargetRef} style={StyleSheet.absoluteFill}>
        <GradientBackground colors={['#1A1A1A', '#0A0A0A', '#000000']} ambient>
          <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <View style={styles.statusBar}>
              <Text style={styles.statusText}>PROFIL</Text>
            </View>

            <View style={styles.topBar}>
              <IconButton
                icon="back"
                haptic={haptic.light}
                onPress={() => router.back()}
                accessibilityLabel="Retour"
              />
              <Text style={styles.topTitle}>Profil</Text>
              <IconButton
                icon="gear"
                haptic={haptic.light}
                onPress={() => router.push('/settings')}
                accessibilityLabel="Paramètres"
              />
            </View>

            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              <ProfileHeader
                identity={MOCK_IDENTITY}
                disciplineIds={disciplineIds}
                isPremium={isPremium}
                streak={MOCK_REGULARITY.streak}
                bestStreak={MOCK_REGULARITY.bestStreak}
                trophyCount={trophies.unlocked}
                trophyTotal={trophies.total}
                onEditDisciplines={() => setDisciplineSheet(true)}
              />
              <ProfileAnalytics isPremium={isPremium} onGoPremium={() => router.push('/premium')} />
              <ProfileMixShare onOpenPublic={() => setPublicMixSheet(true)} />
              <ProfileGamification
                onOpenModeStats={setStatsTimerId}
                onShareSession={() => setShareSheet(true)}
              />
            </ScrollView>
          </SafeAreaView>
        </GradientBackground>
      </BlurTargetView>

      {/* Feuilles hors SafeAreaView : elles ajoutent elles-mêmes la zone sûre du bas. */}
      {disciplineSheet && (
        <DisciplineSheet
          screenH={screenH}
          value={disciplineIds}
          onChange={setDisciplineIds}
          onClose={() => setDisciplineSheet(false)}
        />
      )}
      {publicMixSheet && <MixPublicSheet screenH={screenH} onClose={() => setPublicMixSheet(false)} />}
      {shareSheet && <ShareSessionSheet screenH={screenH} onClose={() => setShareSheet(false)} />}
      {statsTimer && (
        <ModeStatsSheet
          timer={statsTimer}
          stats={{ count: MOCK_BADGE_COUNTS[statsTimer.id] ?? 0, totalSeconds: 0, timeLabel: MOCK_MODE_TIME[statsTimer.id] ?? '0min' }}
          screenH={screenH}
          blurTargetRef={blurTargetRef}
          onClose={() => setStatsTimerId(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
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
  topTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
});
