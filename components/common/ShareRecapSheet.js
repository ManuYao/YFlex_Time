import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Share, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import BottomSheet from './BottomSheet';
import Button from './Button';
import PressTap from './PressTap';
import AppIcon from './AppIcon';
import RecapShareCard from './RecapShareCard';
import SessionShareCard from './SessionShareCard';
import { computeRecap, computeTrophyTally, recapShareText } from '../../lib/shareRecap';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';

// Tout ce qui entoure la carte dans la feuille (poignée, titre, sous-menu à trois
// choix, deux boutons, marges) + un peu de voile au-dessus pour qu'on voie encore
// que c'est une feuille. BottomSheet grandit vers le haut sans limite : c'est la
// carte qui s'adapte à la hauteur restante.
const SHEET_CHROME = 360;
const MIN_CARD_H = 300;

const MODES = [
  { id: 'week', label: 'Semaine', icon: 'calendar' },
  { id: 'month', label: 'Mois', icon: 'history' },
  { id: 'session', label: 'Dernière séance', icon: 'stopwatch' },
];

/**
 * « Partager » depuis le Profil. Un petit sous-menu de trois choix — bilan de la
 * semaine, bilan du mois, dernière séance — et, dessous, la carte prête à être
 * partagée (aperçu au format Story 9:16, avec l'emplacement du futur QR code).
 *
 * Le partage envoie un TEXTE : exporter la carte en image demande un module
 * natif (capture de vue), donc un nouvel APK — à faire plus tard, la carte est
 * déjà dessinée pour ça.
 *
 * Props : sessions (historique brut), timers, badgeCounts, lastSession,
 * identity { pseudo, initials }.
 */
export default function ShareRecapSheet({
  screenH,
  sessions,
  timers,
  badgeCounts,
  lastSession,
  identity,
  initialMode = 'week',
  onClose,
}) {
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const modes = useMemo(() => (lastSession ? MODES : MODES.filter((m) => m.id !== 'session')), [lastSession]);
  const [mode, setMode] = useState(modes.some((m) => m.id === initialMode) ? initialMode : modes[0].id);

  const recaps = useMemo(
    () => ({
      week: computeRecap(sessions, timers, 'week'),
      month: computeRecap(sessions, timers, 'month'),
    }),
    [sessions, timers]
  );
  const trophies = useMemo(() => computeTrophyTally(badgeCounts, timers), [badgeCounts, timers]);

  const available = (screenH || winH) - SHEET_CHROME - insets.top - insets.bottom;
  const cardH = Math.max(MIN_CARD_H, Math.min((Math.min(240, winW * 0.6) * 16) / 9, available));
  const cardW = (cardH * 9) / 16;

  const recap = recaps[mode];
  const message =
    mode === 'session'
      ? `Séance ${lastSession.name} terminée : ${lastSession.duration}, ${lastSession.rounds} tours. Chronométrée avec Flex Timer.`
      : recapShareText(recap, { pseudo: identity.pseudo, trophies });

  const handleShare = async () => {
    try {
      await Share.share({ message });
    } catch {}
  };

  return (
    <BottomSheet screenH={screenH} onClose={onClose}>
      {({ close }) => (
        <View>
          <Text style={styles.title}>Partager</Text>
          <Text style={styles.subtitle}>FORMAT STORY · 9:16</Text>

          {/* Sous-menu : que veut-on montrer ? */}
          <View style={styles.menu}>
            {modes.map((m) => {
              const active = m.id === mode;
              return (
                <PressTap
                  key={m.id}
                  tapScale={0.96}
                  onHapticIn={haptic.selection}
                  onPress={() => setMode(m.id)}
                  accessibilityLabel={m.id === 'session' ? 'Partager la dernière séance' : `Bilan : ${m.label}`}
                  containerStyle={styles.menuSlot}
                  style={[styles.menuItem, active && styles.menuItemActive]}
                >
                  <AppIcon name={m.icon} size={14} color={active ? '#0A0A0A' : 'rgba(255,255,255,0.75)'} />
                  <Text style={[styles.menuText, active && styles.menuTextActive]} numberOfLines={1}>
                    {m.label}
                  </Text>
                </PressTap>
              );
            })}
          </View>

          <Animated.View key={mode} entering={FadeIn.duration(180)}>
            {mode === 'session' ? (
              <SessionShareCard session={lastSession} cardW={cardW} cardH={cardH} />
            ) : (
              <RecapShareCard recap={recap} trophies={trophies} identity={identity} cardW={cardW} cardH={cardH} />
            )}
          </Animated.View>

          <View style={styles.actions}>
            <Button
              variant="solid"
              size="lg"
              label="Partager"
              icon="share"
              haptic={haptic.medium}
              onPress={handleShare}
              fullWidth
            />
            <Button
              variant="ghost"
              size="md"
              label="Fermer"
              haptic={haptic.light}
              onPress={close}
              fullWidth
              style={styles.closeBtn}
            />
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: fonts.monoRegular,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 3,
    marginBottom: 12,
  },
  menu: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  menuSlot: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  menuItemActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  menuText: {
    flexShrink: 1,
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.80)',
  },
  menuTextActive: {
    color: '#0A0A0A',
  },
  actions: {
    marginTop: 18,
  },
  closeBtn: {
    marginTop: 6,
  },
});
