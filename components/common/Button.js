import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import PressTap from './PressTap';
import AppIcon from './AppIcon';
import ShineSweep from './ShineSweep';
import { fonts } from '../../lib/fonts';
import {
  BUTTON_FONT,
  BUTTON_HEIGHT,
  BUTTON_ICON,
  BUTTON_PAD_X,
  TAP_SCALE,
  buttonRecipe,
} from '../../lib/buttonTokens';

/**
 * Button — la capsule de Flex Timer, pour TOUS les boutons texte de l'app.
 * Recettes, tailles et placement : lib/buttonTokens.js.
 *
 *   <Button variant="accent" color={timer.color} tone={timer.textMode}
 *           icon="play" label={`Lancer ${timer.name}`} onPress={…} fullWidth />
 *
 * Deux couches, pour une raison précise :
 *  - dehors (animée par PressTap) : l'ombre extérieure (lueur + ombre portée).
 *    Fond transparent : l'ombre boxShadow est découpée hors de la forme, elle
 *    ne se voit donc jamais à travers le verre (≠ elevation, piège n°22).
 *  - dedans (overflow: hidden) : remplissage, reflet, liseré, reflet qui
 *    traverse, voile d'enfoncement. overflow: hidden découpe tout ça à la
 *    capsule ; il est sur la couche intérieure pour ne pas rogner la lueur.
 *
 * Props:
 * - variant : 'solid' | 'accent' | 'glass' | 'danger' | 'premium' | 'spectrum' | 'ghost'
 * - size    : 'lg' (56, action principale) | 'md' (48) | 'nav' (44, barre du
 *             haut, aligné sur les boutons ronds) | 'sm' (36)
 * - tone    : 'light' | 'dark' (texte noir, ex. TABATA) — le textMode du mode
 * - color   : couleur du mode, pour 'accent'
 * - label, icon (nom AppIcon ou élément), iconPosition 'left' | 'right'
 * - children : contenu libre à la place du label
 * - fullWidth, disabled, shine (force le reflet on/off), onPress, onLongPress
 * - haptic : appelée au toucher (ex. haptic.light)
 * - style : placement du bouton (marges, flex, alignSelf) — posé sur la zone
 *   d'appui, pour qu'un `flex: 1` fasse bien grandir le bouton dans une rangée
 * - labelStyle
 */
export default function Button({
  variant = 'solid',
  size = 'lg',
  tone = 'light',
  color,
  label,
  icon,
  iconPosition = 'left',
  children,
  fullWidth = false,
  disabled = false,
  shine,
  onPress,
  onLongPress,
  haptic,
  style,
  labelStyle,
  accessibilityLabel,
}) {
  const r = buttonRecipe({ variant, tone, color });
  const height = BUTTON_HEIGHT[size];
  const radius = height / 2;
  const press = useSharedValue(0);
  const [box, setBox] = useState({ w: 0, h: height });

  // Le reflet est monté dès le départ si la variante en a un (voir
  // ShineSweep : jamais d'enfant qui apparaît après la mesure) ; `active`
  // ne fait que l'allumer ou l'éteindre.
  const hasShine = shine ?? r.shine;

  const overlayStyle = useAnimatedStyle(() => ({ opacity: press.value }));

  const iconNode =
    typeof icon === 'string' ? (
      <AppIcon name={icon} size={BUTTON_ICON[size]} color={r.textColor} />
    ) : (
      icon ?? null
    );

  return (
    <PressTap
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      disabled={disabled}
      tapScale={TAP_SCALE[size]}
      onHapticIn={disabled ? undefined : haptic}
      pressValue={press}
      accessibilityLabel={accessibilityLabel ?? label}
      containerStyle={[fullWidth && styles.fullWidth, style]}
      style={[
        { borderRadius: radius, opacity: disabled ? 0.38 : 1 },
        !disabled && r.outer ? { boxShadow: r.outer } : null,
      ]}
    >
      <View
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          if (w !== box.w || h !== box.h) setBox({ w, h });
        }}
        style={[
          styles.inner,
          {
            minHeight: height,
            borderRadius: radius,
            paddingHorizontal: BUTTON_PAD_X[size],
            backgroundColor: r.backgroundColor,
            borderColor: r.borderColor,
            borderWidth: r.borderWidth,
          },
          r.inner ? { boxShadow: r.inner } : null,
        ]}
      >
        {r.fill ? (
          <LinearGradient
            colors={r.fill}
            start={r.fillDirection === 'horizontal' ? { x: 0, y: 0.5 } : { x: 0.5, y: 0 }}
            end={r.fillDirection === 'horizontal' ? { x: 1, y: 0.5 } : { x: 0.5, y: 1 }}
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
        {hasShine ? <ShineSweep width={box.w} height={box.h} active={!disabled} /> : null}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: r.overlay }, overlayStyle]}
        />

        {iconNode && iconPosition === 'left' ? <View style={styles.iconLeft}>{iconNode}</View> : null}
        {children ??
          (label != null ? (
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[
                styles.label,
                { color: r.textColor, fontSize: BUTTON_FONT[size] },
                size === 'sm' && styles.labelSm,
                labelStyle,
              ]}
            >
              {label}
            </Text>
          ) : null)}
        {iconNode && iconPosition === 'right' ? <View style={styles.iconRight}>{iconNode}</View> : null}
      </View>
    </PressTap>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    alignSelf: 'stretch',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Reflet du haut : lumière qui tombe sur la moitié supérieure.
  sheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '55%',
  },
  // flexShrink : dans la rangée (icône + texte), un libellé trop long doit
  // se réduire (adjustsFontSizeToFit, jusqu'à 80 %) puis se couper, au lieu
  // de déborder de la capsule — deux boutons côte à côte sur 360 dp.
  label: {
    flexShrink: 1,
    fontFamily: fonts.sansExtraBold,
    letterSpacing: -0.1,
    includeFontPadding: false,
  },
  labelSm: {
    fontFamily: fonts.sansBold,
    letterSpacing: 0.4,
  },
  iconLeft: { marginRight: 10 },
  iconRight: { marginLeft: 10 },
});
