import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import PressTap from './PressTap';
import AppIcon from './AppIcon';
import { ROUND_SIZE, TAP_SCALE, buttonRecipe } from '../../lib/buttonTokens';

/**
 * IconButton — bouton rond à icône seule (retour, réglages, fermer, menu…).
 * Même surface que Button (lib/buttonTokens.js) : verre par défaut — fond
 * translucide, reflet du haut, liseré lumineux, ombre douce — au lieu du
 * simple cercle à contour. Même architecture à deux couches que Button :
 * ombre extérieure (boxShadow) sur la couche animée, tout le reste découpé
 * dans la couche intérieure.
 *
 * Props:
 * - icon     : nom AppIcon ou élément
 * - size     : diamètre (défaut 44, ROUND_SIZE.nav)
 * - iconSize : défaut ≈ 45 % du diamètre
 * - variant  : 'glass' (défaut) | 'solid' | 'accent' | 'ghost'
 * - tone     : 'light' | 'dark' ; color : pour 'accent'
 * - onPress, onLongPress, disabled, haptic, accessibilityLabel
 * - style    : placement (sur la zone d'appui)
 * - flat     : sans ombre portée ni liseré sombre (commandes de séance). Sur
 *              la couleur du mode, l'ombre noire se lisait comme une bordure
 *              noire autour du disque, qui apparaissait et disparaissait au
 *              rythme de la lueur (retour utilisateur, v14.1.1).
 */
export default function IconButton({
  icon,
  size = ROUND_SIZE.nav,
  iconSize,
  variant = 'glass',
  tone = 'light',
  color,
  onPress,
  onLongPress,
  disabled = false,
  haptic,
  accessibilityLabel,
  hitSlop = 8,
  style,
  flat = false,
}) {
  const r = buttonRecipe({ variant, tone, color });
  const press = useSharedValue(0);
  const overlayStyle = useAnimatedStyle(() => ({ opacity: press.value }));
  const glyph = iconSize ?? Math.round(size * 0.45);

  return (
    <PressTap
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      disabled={disabled}
      tapScale={TAP_SCALE.round}
      onHapticIn={disabled ? undefined : haptic}
      pressValue={press}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      containerStyle={style}
      style={[
        { width: size, height: size, borderRadius: size / 2, opacity: disabled ? 0.38 : 1 },
        !disabled && !flat && r.outer ? { boxShadow: r.outer } : null,
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            borderRadius: size / 2,
            backgroundColor: r.backgroundColor,
            borderColor: r.borderColor,
            borderWidth: r.borderWidth,
          },
          !flat && r.inner ? { boxShadow: r.inner } : null,
        ]}
      >
        {r.fill ? (
          <LinearGradient
            colors={r.fill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {r.sheen ? (
          <LinearGradient
            colors={r.sheen}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.sheen}
            pointerEvents="none"
          />
        ) : null}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: r.overlay }, overlayStyle]}
        />
        {typeof icon === 'string' ? <AppIcon name={icon} size={glyph} color={r.textColor} /> : icon}
      </View>
    </PressTap>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
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
});
