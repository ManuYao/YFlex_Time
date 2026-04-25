import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useLongPress } from '../../hooks/useLongPress';
import { fonts } from '../../lib/fonts';

export default function LongPressButton({
  label,
  onComplete,
  size = 64,
  duration = 3000,
  borderColor = 'rgba(255,255,255,0.30)',
  ringColor = '#FFFFFF',
  labelColor = 'rgba(255,255,255,0.60)',
  pressedBg = 'rgba(255,255,255,0.12)',
  children,
}) {
  const { isPressing, progress, start, cancel } = useLongPress(onComplete, duration);

  const radius = size / 2 - 3;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;
  const remainingSec = Math.ceil((1 - progress) * (duration / 1000));

  return (
    <View style={styles.wrap}>
      <Pressable
        onPressIn={start}
        onPressOut={cancel}
        style={[
          styles.btn,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor,
            backgroundColor: isPressing ? pressedBg : 'transparent',
          },
        ]}
        hitSlop={6}
      >
        {children}
        {isPressing && (
          <Svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={ringColor}
              strokeWidth={2.5}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
        )}
      </Pressable>
      {!!label && (
        <Text style={[styles.label, { color: labelColor }]}>
          {isPressing && progress < 1 ? `${remainingSec}s...` : label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  btn: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 2.25,
    textTransform: 'uppercase',
    marginTop: 8,
  },
});
