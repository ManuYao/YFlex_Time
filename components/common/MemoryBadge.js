import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '../../lib/fonts';
import { formatMb, formatMs, perfLevel } from '../../lib/memoryProbeShape';
import {
  loadMemoryBadge,
  subscribeMemoryBadge,
  subscribeMemory,
  subscribePerf,
} from '../../lib/memoryProbe';
import PerfMeter from './PerfMeter';

const LEVEL_COLOR = { ok: '#7CF0B4', warn: '#FFC933', bad: '#FF5454' };

/**
 * Petit compteur flottant (Paramètres › Mémoire) : mémoire du code, images par
 * seconde, pire image et pire gel du code sur la dernière seconde. Monté en
 * permanence mais invisible et SANS minuteur tant que le réglage est coupé.
 * Il ne capte aucun appui (pointerEvents none).
 */
export default function MemoryBadge() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    loadMemoryBadge();
    return subscribeMemoryBadge(setOn);
  }, []);

  if (!on) return null;
  return <BadgeBody />;
}

function BadgeBody() {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState(null);
  const [perf, setPerf] = useState(null);
  useEffect(() => subscribeMemory(setStats), []);
  useEffect(() => subscribePerf(setPerf), []);

  const level = perfLevel(perf);
  const hasMem = stats && stats.now != null;
  const hasPerf = perf && perf.fps != null;
  return (
    <>
      <PerfMeter />
      {hasMem || hasPerf ? (
        <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 2 }]}>
          {hasMem ? (
            <Text style={styles.text}>
              {formatMb(stats.now)} · bas {formatMb(stats.min)}
            </Text>
          ) : null}
          {hasPerf ? (
            <Text style={[styles.text, { color: LEVEL_COLOR[level] }]}>
              {perf.fps} i/s · img {formatMs(perf.worstFrame)} · JS {formatMs(perf.stall)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 8,
    zIndex: 9000,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'flex-end',
  },
  text: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    color: '#7CF0B4',
  },
});
