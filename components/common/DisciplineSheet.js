import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import BottomSheet from './BottomSheet';
import AppIcon from './AppIcon';
import PressTap from './PressTap';
import Button from './Button';
import { fonts } from '../../lib/fonts';
import { DANGER } from '../../lib/buttonTokens';
import { haptic } from '../../hooks/useHaptic';
import {
  DISCIPLINES,
  DISCIPLINE_RANK_LABELS,
  MAX_DISCIPLINES,
  toggleDiscipline,
} from '../../lib/disciplines';

/**
 * Choix des disciplines (2 au maximum). L'ordre de sélection fait le rang :
 * la première touchée est la principale. Au-delà du maximum, rien n'est
 * remplacé en douce : la consigne vire au rouge et la grille tremble.
 */
export default function DisciplineSheet({ screenH, value, onChange, onClose }) {
  const [ids, setIds] = useState(value);
  const [denied, setDenied] = useState(false);
  const deniedTimer = useRef(null);
  const shake = useSharedValue(0);

  useEffect(() => () => clearTimeout(deniedTimer.current), []);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const handleToggle = (id) => {
    const next = toggleDiscipline(ids, id);
    if (!next) {
      haptic.warning();
      setDenied(true);
      clearTimeout(deniedTimer.current);
      deniedTimer.current = setTimeout(() => setDenied(false), 1600);
      shake.value = withSequence(
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 70 }),
        withTiming(-3, { duration: 60 }),
        withTiming(0, { duration: 50 })
      );
      return;
    }
    haptic.selection();
    setDenied(false);
    setIds(next);
  };

  const handleSwap = () => {
    haptic.light();
    setIds((cur) => [cur[1], cur[0]]);
  };

  return (
    <BottomSheet screenH={screenH} onClose={onClose}>
      {({ close }) => (
        <View>
          <Text style={styles.title}>Tes disciplines</Text>
          <Text style={[styles.hint, denied && styles.hintDenied]}>
            {denied
              ? `${MAX_DISCIPLINES} maximum : retire-en une d'abord.`
              : `Jusqu'à ${MAX_DISCIPLINES}. La première choisie est ta discipline principale.`}
          </Text>

          <Animated.View style={[styles.grid, shakeStyle]}>
            {DISCIPLINES.map((d) => {
              const rank = ids.indexOf(d.id);
              const selected = rank >= 0;
              return (
                <PressTap
                  key={d.id}
                  onPress={() => handleToggle(d.id)}
                  tapScale={0.95}
                  containerStyle={styles.tileWrap}
                  style={[styles.tile, selected && styles.tileSelected]}
                  accessibilityLabel={d.label}
                >
                  <View style={[styles.tileIcon, selected && styles.tileIconSelected]}>
                    <AppIcon name={d.icon} size={20} color={selected ? '#0A0A0A' : '#FFFFFF'} />
                  </View>
                  <Text style={styles.tileLabel} numberOfLines={1}>
                    {d.label}
                  </Text>
                  <Text style={[styles.tileRank, !selected && styles.tileRankOff]}>
                    {selected ? DISCIPLINE_RANK_LABELS[rank] : d.short}
                  </Text>
                  {selected && (
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankBadgeText}>{rank + 1}</Text>
                    </View>
                  )}
                </PressTap>
              );
            })}
          </Animated.View>

          <View style={styles.actions}>
            {ids.length === MAX_DISCIPLINES && (
              <Button variant="glass" size="lg" icon="repeat" label="Inverser" onPress={handleSwap} />
            )}
            <Button
              variant="solid"
              size="lg"
              label="Valider"
              haptic={haptic.medium}
              onPress={() => {
                onChange(ids);
                close();
              }}
              style={styles.validate}
            />
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  hint: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    marginBottom: 18,
  },
  hintDenied: {
    color: DANGER,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 20,
  },
  tileWrap: {
    width: '48.5%',
  },
  tile: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  tileSelected: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.55)',
  },
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tileIconSelected: {
    backgroundColor: '#FFFFFF',
  },
  tileLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  tileRank: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
  },
  tileRankOff: {
    color: 'rgba(255,255,255,0.4)',
  },
  rankBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontFamily: fonts.monoExtraBold,
    fontSize: 11,
    color: '#0A0A0A',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  validate: {
    flex: 1,
  },
});
