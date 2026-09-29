import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import PressTap from './PressTap';
import { fonts } from '../../lib/fonts';
import { easeImpact } from '../../lib/animations';
import { haptic } from '../../hooks/useHaptic';

const VALUE_SPACE = 18;
const LABEL_SPACE = 18;

// Barre sélectionnée (la dernière par défaut) pleine, les autres atténuées.
// `colorFor(value, index)` : une couleur par barre (ex. échelle de chaleur),
// sinon `color` pour toutes.
export default function BarChart({
  data,
  labels,
  height = 132,
  color = '#FFFFFF',
  colorFor,
  interactive = false,
  showValue = true,
  formatValue = (v) => String(v),
  maxBarWidth = 26,
  dimOpacity = 0.28,
}) {
  const n = data.length;
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState(n - 1);

  const max = Math.max(1, ...data);
  const hasLabels = Array.isArray(labels) && labels.length === n;
  const valueSpace = showValue ? VALUE_SPACE : 0;
  const labelSpace = hasLabels ? LABEL_SPACE : 0;
  const plotH = Math.max(0, height - valueSpace - labelSpace);
  const colW = width > 0 ? width / n : 0;
  const barW = Math.min(maxBarWidth, colW * 0.58);

  const select = (i) => {
    if (i === selected) return;
    haptic.selection();
    setSelected(i);
  };

  return (
    <View
      style={{ height }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w !== width) setWidth(w);
      }}
    >
      <View style={[styles.baseline, { bottom: labelSpace }]} />
      {width > 0 ? (
        <View style={styles.row}>
          {data.map((v, i) => {
            const active = i === selected;
            const column = (
              <View style={{ width: colW, height }}>
                <View style={[styles.plot, { height: plotH + valueSpace }]}>
                  {showValue && active ? (
                    <Text style={styles.value} numberOfLines={1}>
                      {formatValue(v)}
                    </Text>
                  ) : null}
                  <Bar
                    index={i}
                    targetHeight={(v / max) * plotH}
                    width={barW}
                    color={colorFor ? colorFor(v, i) : color}
                    opacity={active ? 1 : dimOpacity}
                  />
                </View>
                {hasLabels ? (
                  <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                    {labels[i]}
                  </Text>
                ) : null}
              </View>
            );
            if (!interactive) return <View key={i}>{column}</View>;
            return (
              <PressTap
                key={i}
                tapScale={0.94}
                onPress={() => select(i)}
                accessibilityLabel={hasLabels ? `${labels[i]} : ${formatValue(v)}` : formatValue(v)}
              >
                {column}
              </PressTap>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function Bar({ index, targetHeight, width, color, opacity }) {
  const grow = useSharedValue(0);

  useEffect(() => {
    grow.value = withDelay(index * 45, withTiming(1, { duration: 520, easing: easeImpact }));
  }, []);

  const style = useAnimatedStyle(() => ({
    height: Math.max(2, targetHeight * grow.value),
  }));

  return <Animated.View style={[styles.bar, { width, backgroundColor: color, opacity }, style]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  plot: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  value: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    color: '#FFFFFF',
    marginBottom: 4,
    includeFontPadding: false,
  },
  label: {
    height: LABEL_SPACE,
    paddingTop: 5,
    textAlign: 'center',
    fontFamily: fonts.monoRegular,
    fontSize: 9,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.42)',
    includeFontPadding: false,
  },
  labelActive: {
    fontFamily: fonts.monoBold,
    color: '#FFFFFF',
  },
});
