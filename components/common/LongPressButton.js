import React, { useEffect } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useLongPress } from '../../hooks/useLongPress';
import { fonts } from '../../lib/fonts';
import { spring } from '../../lib/animations';
import { buttonRecipe } from '../../lib/buttonTokens';

/**
 * Bouton rond à appui long (Reset, Passer, Fin, Retour) : un disque de verre
 * (recette 'glass' de lib/buttonTokens.js — fond translucide, reflet du haut,
 * liseré lumineux) + l'anneau qui se remplit pendant l'appui.
 *
 * L'ombre est un boxShadow extérieur sur la couche animée, JAMAIS une
 * elevation : sur Android l'elevation d'un disque translucide se voit à
 * travers lui en polygone sombre (piège n°22).
 */
export default function LongPressButton({
  label,
  onComplete,
  size = 64,
  duration = 3000,
  tone = 'light',
  ringColor = '#FFFFFF',
  labelColor = 'rgba(255,255,255,0.60)',
  children,
}) {
  const { isPressing, progress, start, cancel } = useLongPress(onComplete, duration);
  const r = buttonRecipe({ variant: 'glass', tone });

  const radius = size / 2 - 3;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;
  const remainingSec = Math.ceil((1 - progress) * (duration / 1000));

  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSpring(isPressing ? 0.92 : 1, spring);
  }, [isPressing]);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          { width: size, height: size, borderRadius: size / 2, boxShadow: r.outer },
          scaleStyle,
        ]}
      >
        <Pressable
          onPressIn={start}
          onPressOut={cancel}
          style={[
            styles.btn,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: r.backgroundColor,
              borderColor: r.borderColor,
              borderWidth: r.borderWidth,
              boxShadow: r.inner,
            },
          ]}
          hitSlop={6}
        >
          <LinearGradient
            colors={r.sheen}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.sheen}
            pointerEvents="none"
          />
          {isPressing && (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: r.overlay }]}
            />
          )}
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
      </Animated.View>
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
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '55%',
  },
  label: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 2.25,
    textTransform: 'uppercase',
    marginTop: 8,
  },
});
