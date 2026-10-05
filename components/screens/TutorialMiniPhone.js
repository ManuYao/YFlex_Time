import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

import AppIcon from '../common/AppIcon';
import TickRing from '../common/TickRing';
import { fonts } from '../../lib/fonts';

// Illustration du niveau 2 : un téléphone très simplifié qui montre OÙ taper.
// Même grammaire que l'accueil (menu en haut à gauche, profil en haut à
// droite, anneau au centre, bouton Lancer en bas) pour qu'on reconnaisse
// l'endroit sans qu'il y ait besoin de le décrire.
//
// Props:
// - target  : 'hub' (menu, en haut à gauche) | 'profile' (en haut à droite)
// - popover : 'history' | 'planning' | null — le petit menu qui s'ouvre sous
//             le bouton de gauche, avec la ligne visée mise en évidence
// - dark    : le texte de la page est noir (fond jaune de TABATA)
// - k       : échelle (1 = 170 × 300), réduite dans une fenêtre basse

const PHONE_W = 170;
const PHONE_H = 300;

export default function TutorialMiniPhone({ target, popover = null, dark = false, k = 1 }) {
  const reduceMotion = useReducedMotion();
  const ink = dark ? '#0A0A0A' : '#FFFFFF';
  const inkSoft = dark ? 'rgba(10,10,10,0.14)' : 'rgba(255,255,255,0.16)';
  const inkLine = dark ? 'rgba(10,10,10,0.45)' : 'rgba(255,255,255,0.50)';
  const inverse = dark ? '#FFFFFF' : '#0A0A0A';
  const s = (v) => Math.round(v * k);

  // Cercle qui s'élargit autour du bouton visé : « tape ici ».
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return undefined;
    pulse.value = 0;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 0 })
      ),
      -1
    );
    return () => cancelAnimation(pulse);
  }, [target]);
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.5 : 0.8 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.9 }],
  }));

  // Le petit menu s'ouvre après un instant, comme dans l'app.
  const open = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    open.value = reduceMotion ? 1 : 0;
    if (popover && !reduceMotion) open.value = withDelay(450, withSpring(1, { damping: 14, stiffness: 240 }));
  }, [popover]);
  const popStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, open.value),
    transform: [{ scale: 0.82 + 0.18 * Math.min(1, open.value) }],
  }));

  const circle = (name, isTarget, side) => (
    <View style={[{ width: s(36), height: s(36) }, side]}>
      {isTarget ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: s(18), borderWidth: 2, borderColor: ink },
            pulseStyle,
          ]}
        />
      ) : null}
      <View
        style={[
          styles.circle,
          {
            width: s(36),
            height: s(36),
            borderRadius: s(18),
            borderColor: inkLine,
            backgroundColor: isTarget ? ink : inkSoft,
          },
        ]}
      >
        <AppIcon name={name} size={s(17)} color={isTarget ? inverse : ink} />
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.phone,
        {
          width: s(PHONE_W),
          height: s(PHONE_H),
          borderRadius: s(30),
          borderColor: inkLine,
          backgroundColor: inkSoft,
        },
      ]}
    >
      <View style={[styles.bar, { top: s(14), left: s(12), right: s(12) }]}>
        {circle('hub', target === 'hub')}
        {circle('user', target === 'profile')}
      </View>

      <View style={[styles.ringWrap, { top: s(92) }]}>
        <TickRing
          progress={0.75}
          size={s(108)}
          colorActive={ink}
          colorInactive={inkLine}
        />
      </View>

      <View
        style={[
          styles.cta,
          { left: s(24), right: s(24), bottom: s(20), height: s(34), borderRadius: s(17), backgroundColor: ink },
        ]}
      />

      {popover ? (
        <Animated.View
          style={[
            styles.popover,
            { top: s(56), left: s(10), width: s(132), borderRadius: s(14), padding: s(6) },
            popStyle,
          ]}
        >
          <PopRow icon="history" label="Historique" active={popover === 'history'} k={k} ink={ink} />
          <PopRow icon="calendar" label="Planning" active={popover === 'planning'} k={k} ink={ink} />
        </Animated.View>
      ) : null}
    </View>
  );
}

function PopRow({ icon, label, active, k, ink }) {
  const s = (v) => Math.round(v * k);
  return (
    <View
      style={[
        styles.popRow,
        {
          borderRadius: s(10),
          paddingVertical: s(7),
          paddingHorizontal: s(8),
          backgroundColor: active ? 'rgba(255,255,255,0.20)' : 'transparent',
        },
      ]}
    >
      <AppIcon name={icon} size={s(15)} color="#FFFFFF" opacity={active ? 1 : 0.6} />
      <Text
        style={[
          styles.popLabel,
          { fontSize: s(12), color: '#FFFFFF', opacity: active ? 1 : 0.6 },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  phone: {
    borderWidth: 2,
    overflow: 'visible',
    alignSelf: 'center',
  },
  bar: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  circle: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cta: {
    position: 'absolute',
  },
  popover: {
    position: 'absolute',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    transformOrigin: 'top left',
  },
  popRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  popLabel: {
    fontFamily: fonts.sansBold,
    flexShrink: 1,
  },
});
