import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { springBouncy } from '../../lib/animations';

function Dot({ isActive, onPress, activeColor, inactiveColor }) {
  const width = useSharedValue(isActive ? 24 : 4);

  useEffect(() => {
    width.value = withSpring(isActive ? 24 : 4, springBouncy);
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({ width: width.value }));

  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <Animated.View
        style={[
          styles.dot,
          animStyle,
          { backgroundColor: isActive ? activeColor : inactiveColor },
        ]}
      />
    </Pressable>
  );
}

export default function PageDots({
  count,
  activeIndex,
  onSelect,
  activeColor = '#FFFFFF',
  inactiveColor = 'rgba(255,255,255,0.22)',
}) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <Dot
          key={i}
          isActive={i === activeIndex}
          onPress={() => onSelect?.(i)}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 12,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
});
