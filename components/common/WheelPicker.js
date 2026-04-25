import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { formatValue } from '../../lib/formatters';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const PADDING_ITEMS = Math.floor(VISIBLE_ITEMS / 2);

export default function WheelPicker({
  values,
  selectedValue,
  type = 'rounds',
  accentColor = '#FFFFFF',
  onChange,
}) {
  const scrollRef = useRef(null);
  const lastIdxRef = useRef(values.indexOf(selectedValue));
  const [activeIdx, setActiveIdx] = useState(values.indexOf(selectedValue));

  useEffect(() => {
    const idx = values.indexOf(selectedValue);
    if (idx >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ y: idx * ITEM_HEIGHT, animated: false });
      lastIdxRef.current = idx;
      setActiveIdx(idx);
    }
  }, []);

  const onScroll = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(values.length - 1, Math.round(y / ITEM_HEIGHT)));
    if (idx !== lastIdxRef.current) {
      lastIdxRef.current = idx;
      setActiveIdx(idx);
      haptic.selection();
      onChange?.(values[idx]);
    }
  };

  const totalHeight = ITEM_HEIGHT * VISIBLE_ITEMS;
  const railTop = ITEM_HEIGHT * PADDING_ITEMS;

  return (
    <View style={[styles.root, { height: totalHeight }]}>
      <View
        pointerEvents="none"
        style={[
          styles.rail,
          {
            top: railTop,
            height: ITEM_HEIGHT,
            borderColor: accentColor + '44',
            backgroundColor: accentColor + '14',
          },
        ]}
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: railTop }}
      >
        {values.map((v, i) => {
          const distance = Math.abs(i - activeIdx);
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.4 : 0.15;
          const scale = distance === 0 ? 1 : 0.8;
          const isSelected = distance === 0;
          const fmt = formatValue(v, type);

          return (
            <View key={i} style={[styles.item, { height: ITEM_HEIGHT }]}>
              <View
                style={[
                  styles.itemRow,
                  { opacity, transform: [{ scale }] },
                ]}
              >
                <Text
                  style={[
                    styles.mainText,
                    {
                      fontSize: isSelected ? 34 : 22,
                      fontFamily: isSelected ? fonts.monoExtraBold : fonts.monoBold,
                    },
                  ]}
                >
                  {fmt.main}
                </Text>
                <Text
                  style={[
                    styles.unitText,
                    {
                      fontSize: isSelected ? 13 : 10,
                      color: isSelected ? accentColor : 'rgba(255,255,255,0.5)',
                    },
                  ]}
                >
                  {fmt.unit}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(10,10,10,0.98)', 'transparent']}
        style={[styles.fadeTop, { height: railTop }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(10,10,10,0.98)']}
        style={[styles.fadeBottom, { height: railTop }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    overflow: 'hidden',
  },
  rail: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderWidth: 1,
    borderRadius: 14,
    zIndex: 1,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  mainText: {
    color: '#FFFFFF',
    letterSpacing: -0.7,
    lineHeight: 36,
    includeFontPadding: false,
  },
  unitText: {
    fontFamily: fonts.sansBold,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
});
