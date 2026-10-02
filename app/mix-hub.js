import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';

import GradientBackground from '../components/common/GradientBackground';
import IconButton from '../components/common/IconButton';
import Button from '../components/common/Button';
import PressTap from '../components/common/PressTap';
import AppIcon from '../components/common/AppIcon';
import MixLibrarySheet from '../components/common/MixLibrarySheet';
import MixShareSheet from '../components/common/MixShareSheet';
import MixPublicSheet from '../components/common/MixPublicSheet';
import { MIX_COLOR } from '../components/common/MixPill';
import { useTimers } from '../contexts/TimersContext';
import { useCooldown } from '../hooks/useCooldown';
import { usePremium } from '../hooks/usePremium';
import { useMixLauncher } from '../hooks/useMixLauncher';
import { haptic } from '../hooks/useHaptic';
import { fonts } from '../lib/fonts';
import { D, slideInY } from '../lib/animations';
import { getBlockType, getBlockDuration, getMixTotalDuration, hasEstimatedDuration } from '../lib/mix-blocks';
import { formatDuration } from '../lib/formatters';
import { isDefaultMix } from '../lib/mixes';

const FALLBACK_MIX_BG = ['#9575FF', '#4B2FC9', '#1A0D52'];

/**
 * Mix et Partage (v16.2.0) — la page centrale du MIX.
 *
 * Le MIX est ce qui distingue Flex Timer d'un simple chrono : une séance
 * composée de plusieurs blocs, qui se lance, se partage entre utilisateurs et
 * coachs, et qui porte le freemium (quota hebdomadaire). Tout ce qui touche au
 * MIX est réuni ici — créer, lancer, retrouver, recevoir, envoyer — au lieu
 * d'être éparpillé entre le constructeur, le profil et l'accueil.
 *
 *   « Ton MIX »      le mix courant : Lancer / Modifier, et le quota restant
 *   Mes mix          la bibliothèque enregistrée
 *   Fil public       les mix publiés par la communauté
 *   Recevoir / Envoyer   par lien, sans compte (ou publication dans le fil)
 *   Depuis ton planning  un bloc du planning devient un MIX
 */
export default function MixHub() {
  const router = useRouter();
  const { height: screenH } = useWindowDimensions();
  const {
    timers,
    currentMix,
    library,
    saveCurrentMix,
    saveAsLibraryEntry,
    loadFromLibrary,
    removeFromLibrary,
  } = useTimers();
  const { isPremium } = usePremium();
  const { getStatus } = useCooldown();
  const launchMix = useMixLauncher();
  const launchingRef = useRef(false);

  // null | 'library' | 'feed' | 'mine' | { type: 'share', tab, mix }
  const [sheet, setSheet] = useState(null);

  const mixTimer = timers.find((t) => t.id === 'mix');
  const mixBg = mixTimer?.bgColors ?? FALLBACK_MIX_BG;
  const blocks = currentMix?.blocks ?? [];
  const hasMix = blocks.length > 0;
  const totalSec = hasMix ? getMixTotalDuration(blocks) : 0;

  // Quota hebdomadaire (lib/cooldown.js) : montré ici pour que le freemium se
  // lise AVANT d'appuyer, pas seulement quand ça refuse.
  const status = isPremium ? null : getStatus('mix');
  const locked = !!status?.isLocked;

  const handleLaunch = async () => {
    if (!hasMix || launchingRef.current) return;
    launchingRef.current = true;
    try {
      await launchMix(currentMix);
    } finally {
      launchingRef.current = false;
    }
  };

  const openShare = (tab, mix) => {
    haptic.light();
    setSheet({ type: 'share', tab, mix });
  };

  // « Tester » depuis le fil public : le mix devient le MIX courant, la carte
  // du haut se met à jour sous les yeux — sans quitter la page.
  // L'ancien MIX, s'il a été modifié et n'est pas déjà enregistré, est rangé
  // dans « Mes mix » avant d'être remplacé : rien ne se perd (même règle que
  // « Tester » depuis le profil).
  const stashCurrent = async () => {
    if (
      currentMix?.blocks?.length &&
      !isDefaultMix(currentMix) &&
      !library.some((m) => m.id === currentMix.id)
    ) {
      await saveAsLibraryEntry(currentMix);
    }
  };

  const handleTestFromFeed = async (mix) => {
    await stashCurrent();
    await saveCurrentMix(mix);
  };

  return (
    <GradientBackground colors={[MIX_COLOR, '#0A0A0A', '#000000']} ambient textMode="light">
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>MIX ET PARTAGE</Text>
        </View>

        <View style={styles.topBar}>
          <IconButton
            icon="back"
            haptic={haptic.light}
            onPress={() => router.back()}
            accessibilityLabel="Retour"
          />
          <Text style={styles.topTitle}>Mix et Partage</Text>
          <IconButton
            icon="gear"
            haptic={haptic.light}
            onPress={() => router.push('/settings')}
            accessibilityLabel="Réglages"
          />
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Ton MIX ── */}
          <Animated.View entering={slideInY(24, D.big, 0)} style={styles.current}>
            <LinearGradient
              colors={mixBg}
              locations={[0, 0.5, 1]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.currentKicker}>TON MIX</Text>
            <Text style={styles.currentName} numberOfLines={2}>
              {hasMix ? currentMix?.name || 'Mon mix' : 'Pas encore de mix'}
            </Text>
            <Text style={styles.currentMeta}>
              {hasMix
                ? `${blocks.length} bloc${blocks.length > 1 ? 's' : ''} · ${
                    hasEstimatedDuration(blocks) ? '~' : ''
                  }${formatDuration(totalSec)}`
                : 'Compose ta séance bloc par bloc : AMRAP, EMOM, TABATA, repos…'}
            </Text>

            {hasMix && (
              <View style={styles.timeline}>
                {blocks.map((b) => {
                  const type = getBlockType(b.type);
                  return (
                    <View
                      key={b.id}
                      style={[
                        styles.timelineSeg,
                        {
                          flex: Math.max(0.001, getBlockDuration(b)) / Math.max(1, totalSec),
                          backgroundColor: type?.color || '#FFFFFF',
                        },
                      ]}
                    />
                  );
                })}
              </View>
            )}

            {hasMix ? (
              <View style={styles.currentActions}>
                <Button
                  variant="glass"
                  label="Modifier"
                  haptic={haptic.light}
                  onPress={() => router.push('/mix-builder')}
                />
                <Button
                  variant={locked ? 'glass' : 'accent'}
                  color={MIX_COLOR}
                  icon={locked ? 'crown' : 'play'}
                  label={locked ? 'Illimité avec Premium' : 'Lancer'}
                  onPress={handleLaunch}
                  accessibilityLabel={locked ? 'Débloquer avec Premium' : 'Lancer ce mix'}
                  style={styles.launchSlot}
                />
              </View>
            ) : (
              <Button
                variant="solid"
                icon="plus"
                label="Créer mon premier mix"
                haptic={haptic.light}
                onPress={() => router.push('/mix-builder')}
                fullWidth
                style={styles.createCta}
              />
            )}

            {status?.limited && (
              <Text style={styles.quota}>
                {locked
                  ? 'Quota MIX atteint · il revient lundi, ou passe en Premium.'
                  : `${status.remaining} lancement${status.remaining > 1 ? 's' : ''} MIX gratuit${
                      status.remaining > 1 ? 's' : ''
                    } cette semaine`}
              </Text>
            )}
          </Animated.View>

          {/* ── Bibliothèque et partage ── */}
          <Text style={styles.sectionTitle}>RETROUVER ET PARTAGER</Text>
          <View style={styles.tiles}>
            <Tile
              delay={80}
              icon="list"
              title="Mes mix"
              summary={`${library.length} enregistré${library.length > 1 ? 's' : ''}`}
              onPress={() => {
                haptic.light();
                setSheet('library');
              }}
            />
            <Tile
              delay={130}
              icon="globe"
              title="Fil public"
              summary="Les mix de la communauté"
              onPress={() => {
                haptic.light();
                setSheet('feed');
              }}
            />
            <Tile
              delay={180}
              icon="link"
              title="Recevoir un mix"
              summary="Colle un lien reçu d'un ami ou d'un coach"
              onPress={() => openShare('receive', currentMix)}
            />
            <Tile
              delay={230}
              icon="share"
              title="Envoyer mon mix"
              summary="Par lien, ou dans le fil public"
              onPress={() => openShare('send', currentMix)}
            />
            {/* Ce que j'ai publié : modifier, tester, retirer — sans passer par
                la suppression du compte (v16.3.0). */}
            <Tile
              delay={280}
              icon="user"
              title="Mes publications"
              summary="Modifier, tester ou retirer tes mix publiés"
              onPress={() => {
                haptic.light();
                setSheet('mine');
              }}
            />
          </View>

          {/* ── Depuis le planning ── */}
          <Animated.View entering={slideInY(24, D.big, 340)}>
            <PressTap
              onPress={() => {
                haptic.light();
                router.push({ pathname: '/history', params: { page: 'planning' } });
              }}
              tapScale={0.98}
              accessibilityLabel="Ouvrir mon planning"
              style={styles.planningRow}
            >
              <View style={styles.planningIcon}>
                <AppIcon name="calendar" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.planningText}>
                <Text style={styles.planningTitle}>Depuis ton planning</Text>
                <Text style={styles.planningSub}>
                  Maintiens un bloc 2 s : il devient un MIX prêt à lancer.
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </PressTap>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Feuilles hors SafeAreaView : elles ajoutent elles-mêmes la zone sûre du bas. */}
      {sheet === 'library' && (
        <MixLibrarySheet
          screenH={screenH}
          library={library}
          onClose={() => setSheet(null)}
          onLoad={async (id) => {
            haptic.medium();
            // L'ancien MIX n'est jamais perdu : rangé dans Mes mix s'il n'y est pas.
            await stashCurrent();
            await loadFromLibrary(id);
          }}
          onDelete={async (id) => {
            haptic.warning();
            await removeFromLibrary(id);
          }}
          onShare={(m) => setSheet({ type: 'share', tab: 'send', mix: m })}
          hint="Tap = en faire ton MIX · croix = supprimer"
          emptyText="Aucun mix enregistré. Dans le constructeur, maintiens « Enregistrer » 2 s pour en archiver un."
        />
      )}

      {sheet?.type === 'share' && (
        <MixShareSheet
          screenH={screenH}
          mix={sheet.mix}
          initialTab={sheet.tab}
          onClose={() => setSheet(null)}
          onOpenFeed={() => setSheet('feed')}
        />
      )}

      {sheet === 'feed' && (
        <MixPublicSheet
          launchOnTest
          screenH={screenH}
          onClose={() => setSheet(null)}
          onTest={handleTestFromFeed}
        />
      )}

      {sheet === 'mine' && (
        <MixPublicSheet
          mine
          launchOnTest
          screenH={screenH}
          onClose={() => setSheet(null)}
          onTest={handleTestFromFeed}
        />
      )}
    </GradientBackground>
  );
}

function Tile({ icon, title, summary, onPress, delay }) {
  return (
    <Animated.View entering={slideInY(24, D.big, delay)} style={styles.tileWrap}>
      <PressTap
        onPress={onPress}
        tapScale={0.97}
        accessibilityLabel={title}
        containerStyle={styles.tileContainer}
        style={styles.tile}
      >
        <View style={styles.tileIcon}>
          <AppIcon name={icon} size={22} color={MIX_COLOR} />
        </View>
        <Text style={styles.tileTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.tileSummary} numberOfLines={3}>
          {summary}
        </Text>
      </PressTap>
    </Animated.View>
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
  topTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  // « Ton MIX » : overflow hidden pour découper le dégradé aux coins.
  current: {
    borderRadius: 28,
    overflow: 'hidden',
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  currentKicker: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.78)',
    marginBottom: 8,
  },
  currentName: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.6,
    color: '#FFFFFF',
  },
  currentMeta: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.3,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
  },
  timeline: {
    flexDirection: 'row',
    height: 6,
    gap: 2,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 16,
  },
  timelineSeg: {
    height: 6,
    borderRadius: 2,
  },
  currentActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  launchSlot: {
    flex: 1,
  },
  createCta: {
    marginTop: 18,
  },
  quota: {
    fontFamily: fonts.sansSemibold,
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    marginTop: 12,
  },

  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 26,
    marginBottom: 12,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tileWrap: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 140,
  },
  tileContainer: {
    flex: 1,
  },
  tile: {
    flex: 1,
    minHeight: 132,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${MIX_COLOR}26`,
    borderWidth: 1,
    borderColor: `${MIX_COLOR}59`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tileTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 15,
    letterSpacing: -0.2,
    color: '#FFFFFF',
  },
  tileSummary: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
  },

  planningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  planningIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planningText: {
    flex: 1,
    minWidth: 0,
  },
  planningTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  planningSub: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  chevron: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    color: 'rgba(255,255,255,0.45)',
  },
});
