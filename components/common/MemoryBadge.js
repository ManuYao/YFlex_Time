import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '../../lib/fonts';
import { formatMb } from '../../lib/memoryProbeShape';
import { loadMemoryBadge, subscribeMemoryBadge, subscribeMemory } from '../../lib/memoryProbe';

/**
 * Petit compteur flottant de la mémoire du code (Paramètres › Mémoire). Monté
 * en permanence mais invisible et SANS minuteur tant que le réglage est coupé.
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
  useEffect(() => subscribeMemory(setStats), []);
  if (!stats || stats.now == null) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 2 }]}>
      <Text style={styles.text}>
        {formatMb(stats.now)} · bas {formatMb(stats.min)}
      </Text>
    </View>
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
  },
  text: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    color: '#7CF0B4',
  },
});
