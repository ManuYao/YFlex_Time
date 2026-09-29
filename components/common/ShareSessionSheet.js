import React from 'react';
import { View, Text, StyleSheet, Share, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomSheet from './BottomSheet';
import TickRing from './TickRing';
import AppIcon from './AppIcon';
import Button from './Button';
import { TIMERS } from '../../lib/timers-config';
import { getTokens } from '../../lib/tokens';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { MOCK_LAST_SESSION } from '../../lib/profileMock';

// Tout ce qui entoure la carte dans la feuille (poignée, titre, deux
// boutons, marges) + un peu de voile au-dessus pour qu'on voie encore que
// c'est une feuille. BottomSheet grandit vers le haut sans limite : c'est la
// carte qui s'adapte à la hauteur restante.
const SHEET_CHROME = 300;
const MIN_CARD_H = 220;

export default function ShareSessionSheet({ screenH, onClose }) {
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const session = MOCK_LAST_SESSION;
  const timer = TIMERS.find((t) => t.id === session.timerId) ?? TIMERS[0];
  const tokens = getTokens(timer.textMode);

  const available = (screenH || winH) - SHEET_CHROME - insets.top - insets.bottom;
  const cardH = Math.max(MIN_CARD_H, Math.min((Math.min(240, winW * 0.58) * 16) / 9, available));
  const cardW = (cardH * 9) / 16;

  const ring = Math.round(cardW * 0.66);
  // Les graduations de TickRing ont une longueur fixe (4 + 22 px de chaque
  // côté) : sur un petit anneau le centre libre rétrécit plus vite que
  // l'anneau, d'où le second plafond.
  const durationSize = Math.min(ring * 0.24, (ring - 52) * 0.38);
  const pad = cardW * 0.08;

  const message = `Séance ${session.name} terminée : ${session.duration}, ${session.rounds} tours. Chronométrée avec Flex Timer.`;

  const handleShare = async () => {
    try {
      await Share.share({ message });
    } catch {}
  };

  return (
    <BottomSheet screenH={screenH} onClose={onClose}>
      {({ close }) => (
        <View>
          <Text style={styles.title}>Partager ma séance</Text>
          <Text style={styles.subtitle}>FORMAT STORY · 9:16</Text>

          <View
            style={[
              styles.cardShadow,
              { width: cardW, height: cardH, backgroundColor: timer.bgColors[2] },
            ]}
          >
            <LinearGradient
              colors={timer.bgColors}
              locations={[0, 0.45, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.card}
            >
              <View style={[styles.cardTop, { padding: pad }]}>
                <AppIcon name={timer.id} size={cardW * 0.1} color={tokens.primary} />
                <View style={styles.cardTopText}>
                  <Text
                    style={[styles.eyebrow, { color: tokens.secondary, fontSize: cardW * 0.042 }]}
                    numberOfLines={1}
                  >
                    SÉANCE TERMINÉE
                  </Text>
                  <Text
                    style={[styles.date, { color: tokens.tertiary, fontSize: cardW * 0.052 }]}
                    numberOfLines={1}
                  >
                    {session.dateLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.cardMiddle}>
                <View style={{ width: ring, height: ring }}>
                  <TickRing
                    progress={1}
                    size={ring}
                    colorActive={tokens.ringActive}
                    colorInactive={tokens.ringInactive}
                    animateIn
                  />
                  <View style={styles.ringCenter} pointerEvents="none">
                    <Text
                      style={[
                        styles.duration,
                        {
                          color: tokens.primary,
                          fontSize: durationSize,
                          lineHeight: Math.ceil(durationSize * 1.2),
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {session.duration}
                    </Text>
                    <Text
                      style={[
                        styles.durationLabel,
                        { color: tokens.tertiary, fontSize: Math.max(7, durationSize * 0.28) },
                      ]}
                      numberOfLines={1}
                    >
                      DURÉE
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.modeName,
                    {
                      color: tokens.primary,
                      fontSize: cardW * 0.13,
                      lineHeight: Math.ceil(cardW * 0.13 * 1.2),
                      marginTop: cardW * 0.04,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {session.name}
                </Text>
                <Text
                  style={[styles.rounds, { color: tokens.secondary, fontSize: cardW * 0.048 }]}
                  numberOfLines={1}
                >
                  {session.rounds} {session.rounds > 1 ? 'TOURS' : 'TOUR'}
                </Text>
              </View>

              {/* Bandeau sombre + texte blanc, quel que soit le mode : le bas du
                  dégradé est toujours la teinte la plus foncée, où le texte noir
                  de TABATA deviendrait illisible. */}
              <View style={[styles.cardFooter, { paddingVertical: cardW * 0.045 }]}>
                <Text
                  style={[
                    styles.wordmark,
                    {
                      fontSize: cardW * 0.07,
                      lineHeight: Math.ceil(cardW * 0.07 * 1.2),
                      letterSpacing: cardW * 0.012,
                    },
                  ]}
                >
                  FLEX TIMER
                </Text>
              </View>
            </LinearGradient>
          </View>

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
    marginBottom: 16,
  },
  // Deux couches : l'ombre sur la vue extérieure (fond plein, pas d'elevation),
  // le découpage arrondi sur le dégradé intérieur.
  cardShadow: {
    alignSelf: 'center',
    borderRadius: 22,
    boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
  },
  card: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTopText: {
    marginLeft: 8,
    flexShrink: 1,
  },
  eyebrow: {
    fontFamily: fonts.monoBold,
    letterSpacing: 1.2,
  },
  date: {
    fontFamily: fonts.sansSemibold,
    marginTop: 1,
  },
  cardMiddle: {
    alignItems: 'center',
  },
  // Centré dans un CERCLE : marge en pourcentage pour rester loin des
  // graduations, overflow hidden en garde-fou.
  ringCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: '18%',
    overflow: 'hidden',
  },
  duration: {
    fontFamily: fonts.display,
    includeFontPadding: false,
    textAlign: 'center',
  },
  durationLabel: {
    fontFamily: fonts.monoBold,
    letterSpacing: 1.2,
  },
  modeName: {
    fontFamily: fonts.display,
    includeFontPadding: false,
    textAlign: 'center',
  },
  rounds: {
    fontFamily: fonts.monoBold,
    letterSpacing: 1.4,
    marginTop: 2,
  },
  cardFooter: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  wordmark: {
    fontFamily: fonts.display,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  actions: {
    marginTop: 18,
  },
  closeBtn: {
    marginTop: 6,
  },
});
