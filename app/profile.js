import React, { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { BlurTargetView } from 'expo-blur';

import GradientBackground from '../components/common/GradientBackground';
import IconButton from '../components/common/IconButton';
import ModeStatsSheet from '../components/common/ModeStatsSheet';
import DisciplineSheet from '../components/common/DisciplineSheet';
import MixPublicSheet from '../components/common/MixPublicSheet';
import ShareSessionSheet from '../components/common/ShareSessionSheet';
import ConfirmSheet from '../components/common/ConfirmSheet';
import ProfileHeader from '../components/screens/ProfileHeader';
import ProfileAccount from '../components/screens/ProfileAccount';
import ProfileAnalytics from '../components/screens/ProfileAnalytics';
import ProfileMixShare from '../components/screens/ProfileMixShare';
import ProfileGamification from '../components/screens/ProfileGamification';
import { useTimers } from '../contexts/TimersContext';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from '../hooks/usePremium';
import { haptic } from '../hooks/useHaptic';
import { fonts } from '../lib/fonts';
import { getBadgeProgress } from '../lib/badges';
import { loadProfile, saveProfile, formatMemberSince, initialsOf } from '../lib/profile';
import { computeProfileStats } from '../lib/profileStats';
import { loadHistory } from '../lib/history';

/**
 * Hub Profil — remplace l'accès direct aux Paramètres depuis l'accueil.
 * Données réelles : profil persisté, historique, disciplines, stats calculées.
 */
export default function Profile() {
  const router = useRouter();
  const { height: screenH } = useWindowDimensions();
  const { timers } = useTimers();
  const { isPremium } = usePremium();
  const { user, signOut } = useAuth();
  const blurTargetRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [disciplineSheet, setDisciplineSheet] = useState(false);
  const [publicMixSheet, setPublicMixSheet] = useState(false);
  const [statsTimerId, setStatsTimerId] = useState(null);
  const [shareSheet, setShareSheet] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  // Charger le profil et l'historique au montage et au focus
  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const prof = await loadProfile();
        setProfile(prof);
        const hist = await loadHistory();
        setSessions(hist);
      })();
    }, [])
  );

  // Persister les disciplines quand elles changent
  const handleDisciplinesChange = async (newIds) => {
    if (profile) {
      const updated = await saveProfile({ ...profile, disciplineIds: newIds });
      setProfile(updated);
    }
  };

  // Calculer les vraies stats
  const stats = useMemo(() => computeProfileStats(sessions, timers), [sessions, timers]);

  // Identité du profil
  const identity = useMemo(
    () =>
      profile
        ? {
            pseudo: profile.pseudo,
            initials: initialsOf(profile.pseudo),
            memberSince: formatMemberSince(profile, stats.oldestSessionDate),
          }
        : { pseudo: 'Athlète', initials: 'A', memberSince: 'jamais' },
    [profile, stats.oldestSessionDate]
  );

  // Trophées réels
  const trophies = useMemo(() => {
    let unlocked = 0;
    for (const t of timers) {
      const count = stats.badgeCounts?.[t.id] ?? 0;
      unlocked += getBadgeProgress(t.id, count).tiers.filter((x) => x.unlocked).length;
    }
    return { unlocked, total: timers.length * 3 };
  }, [timers, stats.badgeCounts]);

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
                identity={identity}
                disciplineIds={profile?.disciplineIds ?? []}
                isPremium={isPremium}
                streak={stats.streak}
                bestStreak={stats.bestStreak}
                trophyCount={trophies.unlocked}
                trophyTotal={trophies.total}
                onEditDisciplines={() => setDisciplineSheet(true)}
                accountConnected={!!user}
                onAccountPress={() => setLogoutConfirm(true)}
              />
              <ProfileAccount />
              <ProfileAnalytics stats={stats} isPremium={isPremium} onGoPremium={() => router.push('/premium')} />
              <ProfileMixShare onOpenPublic={() => setPublicMixSheet(true)} />
              <ProfileGamification
                badgeCounts={stats.badgeCounts}
                hasSession={!!stats.lastSession}
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
          value={profile?.disciplineIds ?? []}
          onChange={handleDisciplinesChange}
          onClose={() => setDisciplineSheet(false)}
        />
      )}
      {publicMixSheet && <MixPublicSheet screenH={screenH} onClose={() => setPublicMixSheet(false)} />}
      {shareSheet && stats.lastSession && (
        <ShareSessionSheet session={stats.lastSession} screenH={screenH} onClose={() => setShareSheet(false)} />
      )}
      {statsTimer && (
        <ModeStatsSheet
          timer={statsTimer}
          stats={{
            count: stats.badgeCounts?.[statsTimer.id] ?? 0,
            totalSeconds: stats.modeSeconds?.[statsTimer.id] ?? 0,
            timeLabel: stats.modeTimeLabels?.[statsTimer.id] ?? '0min',
          }}
          screenH={screenH}
          blurTargetRef={blurTargetRef}
          onClose={() => setStatsTimerId(null)}
        />
      )}
      {logoutConfirm && (
        <ConfirmSheet
          screenH={screenH}
          title="Se déconnecter ?"
          body={user?.email}
          confirmLabel="Déconnexion"
          cancelLabel="Annuler"
          destructive={false}
          onConfirm={signOut}
          onClose={() => setLogoutConfirm(false)}
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
