import React, { useEffect, useRef } from 'react';
import { Pressable, Animated } from 'react-native';

export default function Toggle({ value, onChange, color = '#1FC777' }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      friction: 7,
      tension: 80,
    }).start();
  }, [value]);

  const left = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });
  const bg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.08)', color],
  });
  const border = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.15)', color],
  });

  return (
    <Pressable onPress={() => onChange(!value)} hitSlop={8}>
      <Animated.View
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          borderWidth: 1,
          backgroundColor: bg,
          borderColor: border,
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            top: 2,
            left,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 3,
          }}
        />
      </Animated.View>
    </Pressable>
  );
}