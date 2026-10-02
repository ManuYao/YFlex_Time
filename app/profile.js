import React, { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, InteractionManager, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { BlurTargetView } from 'expo-blur';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import GradientBackground from '../components/common/GradientBackground';
import IconButton from '../components/common/IconButton';
import MixPill from '../components/common/MixPill';
import ModeStatsSheet from '../components/common/ModeStatsSheet';
import DisciplineSheet from '../components/common/DisciplineSheet';
import MixPublicSheet from '../components/common/MixPublicSheet';
import ShareRecapSheet from '../components/common/ShareRecapSheet';
import ConfirmSheet from '../components/common/ConfirmSheet';
import PseudoSheet from '../components/common/PseudoSheet';
import ProfileSkeleton from '../components/screens/ProfileSkeleton';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadProfile,
  saveProfile,
  formatMemberSince,
  initialsOf,
  validatePseudo,
  DEFAULT_PSEUDO,
} from '../lib/profile';
import { computeProfileStats } from '../lib/profileStats';
import { loadHistory } from '../lib/history';

/**
 * Hub Profil — remplace l'accès direct aux Paramètres depuis l'accueil.
 * Données réelles : profil persisté, historique, disciplines, stats calculées.
 */
export default function Profile() {
  const router = useRouter();
  // Marges de sécurité lues côté JS (connues dès le premier rendu) au lieu du
  // SafeAreaView natif : celui-ci appliquait sa marge un instant APRÈS le
  // premier affichage d'un écran, la page « montait » puis redescendait.
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const { timers } = useTimers();
  const { isPremium, loaded: premiumLoaded } = usePremium();
  const { user, signOut, updateDisplayName, hydrated: authHydrated } = useAuth();
  const blurTargetRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [disciplineSheet, setDisciplineSheet] = useState(false);
  const [publicMixSheet, setPublicMixSheet] = useState(false);
  const [feedRefresh, setFeedRefresh] = useState(0);
  const [statsTimerId, setStatsTimerId] = useState(null);
  const [shareSheet, setShareSheet] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [pseudoSheet, setPseudoSheet] = useState(null); // null | 'edit' | 'welcome'
  const nameSyncedForRef = useRef(null);

  // Chargement en deux temps : un SQUELETTE d'abord (blocs gris qui respirent),
  // le vrai contenu ensuite. Avant, l'écran montait d'un coup tout son arbre
  // lourd (graphiques, flou, anneau) PENDANT l'animation d'ouverture — d'où le
  // petit gel — et montrait d'abord des valeurs par défaut (« Athlète », des
  // zéros) avant les vraies. Le contenu réel n'apparaît que lorsque les données
  // sont lues ET que la transition d'écran est terminée, avec un fondu depuis
  // le squelette. Aux retours sur l'écran (depuis les Paramètres…), on
  // rafraîchit les données sans remontrer le squelette.
  //
  // « Prêt » = tout ce qui peut changer la HAUTEUR de la page est connu : le
  // profil et l'historique lus, la transition d'écran finie, l'état de la
  // connexion (la carte « Se connecter » n'existe que sans compte, ~110 px) et
  // le réglage Premium (l'analyse avancée n'a pas la même forme verrouillée ou
  // non). Sans ça, la page changeait de taille après coup : trop haute quelques
  // secondes, puis elle « redescendait ». Une minuterie de sécurité (1,5 s)
  // évite qu'un état lent bloque l'écran sur le squelette.
  const [dataLoaded, setDataLoaded] = useState(false);
  const [settled, setSettled] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [skeletonGone, setSkeletonGone] = useState(false);
  const fade = useSharedValue(0);

  React.useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setSettled(true));
    const timer = setTimeout(() => setTimedOut(true), 1500);
    return () => {
      task.cancel?.();
      clearTimeout(timer);
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      (async () => {
        const [prof, hist] = await Promise.all([loadProfile(), loadHistory()]);
        if (cancelled) return;
        setProfile(prof);
        setSessions(hist);
        setDataLoaded(true);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const ready = dataLoaded && settled && ((premiumLoaded && authHydrated) || timedOut);

  React.useEffect(() => {
    if (!ready) return;
    fade.value = withTiming(1, { duration: 260 }, (finished) => {
      if (finished) runOnJS(setSkeletonGone)(true);
    });
  }, [ready]);

  // Pas de `entering` sur le contenu : un fondu piloté à la main évite le piège
  // d'une entrée figée à opacité 0 quand les enfants changent juste après le
  // montage (voir MaintenanceScreen).
  const contentStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const skeletonStyle = useAnimatedStyle(() => ({ opacity: 1 - fade.value }));

  // Persister les disciplines quand elles changent
  const handleDisciplinesChange = async (newIds) => {
    if (profile) {
      const updated = await saveProfile({ ...profile, disciplineIds: newIds });
      setProfile(updated);
    }
  };

  // Nom du compte ↔ nom du Profil (une fois par connexion) : sur un nouveau
  // téléphone le nom du compte est repris ; sinon le nom local part sur le
  // compte ; sans aucun nom, on le demande une seule fois.
  React.useEffect(() => {
    if (!user || !profile || nameSyncedForRef.current === user.id) return;
    nameSyncedForRef.current = user.id;
    const meta = validatePseudo(user.user_metadata?.display_name);
    const localIsDefault = profile.pseudo === DEFAULT_PSEUDO;
    (async () => {
      if (meta.ok && localIsDefault) {
        setProfile(await saveProfile({ ...profile, pseudo: meta.value }));
      } else if (!meta.ok && !localIsDefault) {
        updateDisplayName(profile.pseudo).catch(() => {});
      } else if (!meta.ok && localIsDefault) {
        const asked = await AsyncStorage.getItem('flexTimer_namePrompted');
        if (asked !== user.id) {
          await AsyncStorage.setItem('flexTimer_namePrompted', user.id);
          setPseudoSheet('welcome');
        }
      }
    })();
  }, [user, profile, updateDisplayName]);

  const handlePseudoSubmit = async (name) => {
    if (!profile) return;
    setProfile(await saveProfile({ ...profile, pseudo: name }));
    if (user) updateDisplayName(name).catch(() => {});
  };

  // Calculer les vraies stats — seulement une fois l'écran prêt : ce calcul
  // parcourt tout l'historique, il n'a pas à se jouer pendant la transition.
  const stats = useMemo(
    () => computeProfileStats(ready ? sessions : [], timers),
    [ready, sessions, timers]
  );

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
          <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            {/* Fil conducteur : le MIX reste à un tap (MixPill). */}
            <View style={styles.statusBar}>
              <MixPill />
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

            <View style={styles.body}>
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              scrollEnabled={ready}
            >
              {ready && (
              <Animated.View style={contentStyle}>
              <ProfileHeader
                identity={identity}
                disciplineIds={profile?.disciplineIds ?? []}
                isPremium={isPremium}
                streak={stats.streak}
                bestStreak={stats.bestStreak}
                trophyCount={trophies.unlocked}
                trophyTotal={trophies.total}
                onEditDisciplines={() => setDisciplineSheet(true)}
                onEditPseudo={() => setPseudoSheet('edit')}
                accountConnected={!!user}
                onAccountPress={() => setLogoutConfirm(true)}
                accountSlot={<ProfileAccount />}
              />
              <ProfileAnalytics stats={stats} isPremium={isPremium} onGoPremium={() => router.push('/premium')} />
              <ProfileMixShare
                onOpenPublic={() => setPublicMixSheet(true)}
                onOpenHub={() => router.push('/mix-hub')}
                refreshKey={feedRefresh}
              />
              <ProfileGamification
                badgeCounts={stats.badgeCounts}
                hasData={stats.hasData}
                onOpenModeStats={setStatsTimerId}
                onShare={() => setShareSheet(true)}
              />
              </Animated.View>
              )}
            </ScrollView>

            {/* Squelette par-dessus, il s'efface en fondu puis se retire. */}
            {!skeletonGone && (
              <Animated.View style={[styles.skeletonLayer, skeletonStyle]} pointerEvents="none">
                <ProfileSkeleton showAccount={!user} />
              </Animated.View>
            )}
            </View>
          </View>
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
      {pseudoSheet && (
        <PseudoSheet
          screenH={screenH}
          initialValue={profile?.pseudo ?? ''}
          welcome={pseudoSheet === 'welcome'}
          onSubmit={handlePseudoSubmit}
          onClose={() => setPseudoSheet(null)}
        />
      )}
      {publicMixSheet && (
        <MixPublicSheet
          screenH={screenH}
          onClose={() => {
            setPublicMixSheet(false);
            setFeedRefresh((k) => k + 1);
          }}
        />
      )}
      {shareSheet && stats.hasData && (
        <ShareRecapSheet
          screenH={screenH}
          sessions={sessions}
          timers={timers}
          badgeCounts={stats.badgeCounts}
          lastSession={stats.lastSession}
          identity={{ pseudo: identity.pseudo, initials: identity.initials }}
          onClose={() => setShareSheet(false)}
        />
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
  body: { flex: 1 },
  list: { flex: 1 },
  skeletonLayer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
});
