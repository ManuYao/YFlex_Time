import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import IconButton from './IconButton';
import AppIcon from './AppIcon';
import { getTimerDescription } from '../../lib/timers-config';
import { fonts } from '../../lib/fonts';
import { ROUND_SIZE } from '../../lib/buttonTokens';
import { useHaptic } from '../../hooks/useHaptic';
import HoldOverlay from './HoldOverlay';
import { useSettings } from '../../contexts/SettingsContext';
import { holdDurations } from '../../lib/rainMode';

/**
 * Aperçu rapide des 5 formats, ouvert en tapant les points de pagination de
 * Home — avant, un tap sautait directement au timer visé. Pensé pour
 * quelqu'un qui ne connaît pas encore les formats : une vue d'ensemble avant
 * de choisir, plutôt qu'un saut à l'aveugle (demande utilisateur, v14.15.0).
 * Le saut direct existe toujours par ailleurs : glisser le carrousel, ou un
 * appui long sur un point donne un aperçu sans quitter l'écran (IndicatorDot,
 * app/home.js).
 */
export default function ModePickerSheet({ screenH, timers, activeIndex, onPick, onClose }) {
  const haptic = useHaptic();
  const { settings } = useSettings();
  // Mode pluie « orage » : choisir un timer demande de le maintenir 1 s.
  const selectHold = holdDurations(settings.rainMode).select;

  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={120}>
      {({ close }) => {
        const pick = (i) => {
          haptic.medium();
          onPick(i);
          close();
        };
        return (
        <View>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>5 FORMATS</Text>
              <Text style={styles.title}>Lequel choisir ?</Text>
            </View>
            <IconButton
              icon="close"
              size={ROUND_SIZE.sheet}
              haptic={haptic.light}
              onPress={close}
              accessibilityLabel="Fermer"
            />
          </View>

          <View style={styles.list}>
            {timers.map((timer, i) => (
              <Pressable
                key={timer.id}
                onPress={selectHold > 0 ? undefined : () => pick(i)}
                style={({ pressed }) => [
                  styles.row,
                  i === activeIndex && styles.rowActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: `${timer.color}22` }]}>
                  <AppIcon name={timer.id} size={20} color={timer.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowName}>{timer.name}</Text>
                    <View style={[styles.tag, { backgroundColor: `${timer.color}22` }]}>
                      <Text style={[styles.tagText, { color: timer.color }]}>{timer.tag}</Text>
                    </View>
                  </View>
                  <Text style={styles.rowDesc} numberOfLines={2}>
                    {getTimerDescription(timer)}
                  </Text>
                </View>
                {selectHold > 0 && (
                  <HoldOverlay color="#FFFFFF" radius={16} duration={selectHold} onComplete={() => pick(i)} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
        );
      }}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  kicker: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    marginBottom: 6,
  },
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    padding: 12,
  },
  rowActive: {
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  rowName: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontFamily: fonts.sansBold,
    fontSize: 8.5,
    letterSpacing: 1,
  },
  rowDesc: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.55)',
  },
});
