import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import PressTap from './PressTap';
import AppIcon from './AppIcon';
import DotsLoader from './DotsLoader';
import ShineSweep from './ShineSweep';
import { WIND_SPRING } from './AmbianceHalo';
import useAmbiance from '../../hooks/useAmbiance';
import { rgba } from '../../lib/ambiance';
import { ambianceWind } from '../../lib/ambianceMotion';
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
 * - loading : le libellé est remplacé par cinq points animés (DotsLoader) et
 *   les appuis sont ignorés — le bouton garde exactement sa taille (le contenu
 *   reste en place, invisible) et sa couleur (≠ disabled, qui l'éteint)
 * - haptic : appelée au toucher (ex. haptic.light)
 * - style : placement du bouton (marges, flex, alignSelf) — posé sur la zone
 *   d'appui, pour qu'un `flex: 1` fasse bien grandir le bouton dans une rangée
 * - labelStyle
 * - ambientRim : ambiance de saison (bouton Lancer de l'accueil, variante
 *   'accent' seulement). Le liseré prend la teinte de l'ambiance et un reflet
 *   suit le doigt pendant un glissé du carrousel (voir le bas du fichier).
 *   Faux (défaut) ou sans ambiance : exactement le bouton d'avant, sans un
 *   hook ni une vue de plus (Button sert dans des dizaines d'écrans).
 */
function PlainButton({
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
  loading = false,
  shine,
  onPress,
  onLongPress,
  haptic,
  style,
  labelStyle,
  accessibilityLabel,
  rimColor, // interne : liseré teinté de l'ambiance (posé par AmbientButton)
  renderAmbient, // interne : (largeur) => reflet de l'ambiance (posé par AmbientButton)
}) {
  const r = buttonRecipe({ variant, tone, color });
  // Chargement : plus aucun appui (ni animation, ni vibration), mais le bouton
  // garde son apparence pleine — c'est une attente, pas un refus.
  const inactive = disabled || loading;
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

  const content = (
    <>
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
    </>
  );

  return (
    <PressTap
      onPress={inactive ? undefined : onPress}
      onLongPress={inactive ? undefined : onLongPress}
      disabled={inactive}
      tapScale={TAP_SCALE[size]}
      onHapticIn={inactive ? undefined : haptic}
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
            borderColor: rimColor ?? r.borderColor,
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
        {hasShine ? <ShineSweep width={box.w} height={box.h} active={!inactive} /> : null}
        {/* Reflet de l'ambiance : sous le contenu (posé avant lui), découpé à la capsule. */}
        {renderAmbient ? renderAmbient(box.w) : null}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: r.overlay }, overlayStyle]}
        />

        {/* En chargement, le contenu reste en place mais invisible : le bouton
            garde sa largeur et sa hauteur, les points se posent par-dessus.
            Hors chargement, aucune vue de plus : la mise en page de tous les
            boutons de l'app reste celle d'avant. */}
        {loading ? <View style={styles.hidden}>{content}</View> : content}

        {loading ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.loadingLayer]}>
            <DotsLoader color={r.textColor} size={size === 'sm' ? 5 : 6} />
          </View>
        ) : null}
      </View>
    </PressTap>
  );
}

/* ───────────── Ambiance de saison (prop `ambientRim`) ───────────── */

const REFLECT_W = 110; // largeur de la bande de reflet (dp)
const REFLECT_FADE = ['rgba(255,255,255,0)', 'rgba(255,255,255,0.40)', 'rgba(255,255,255,0)'];

// Reflet qui suit le doigt (maquette Launch.dc.html) : une bande inclinée dont la
// position vient du vent du carrousel (`ambianceWind`, en dp ; positif = le doigt va à
// droite) — centrée au repos, poussée de vent × 1,1, bornée au bouton — et dont
// l'opacité monte avec la force du vent (0 au repos, 0,9 au plus). Les deux sont
// lissées par un ressort : au relâché, la bande revient avec un petit rebond. Tout
// passe par transform et opacity sur le fil d'interface ; rien ne boucle.
function WindReflection({ width }) {
  const x = useDerivedValue(() => {
    const target = (width - REFLECT_W) / 2 + ambianceWind.value * 1.1;
    return withSpring(Math.max(-REFLECT_W, Math.min(width, target)), WIND_SPRING);
  });
  const strength = useDerivedValue(() =>
    withSpring(Math.max(0, Math.min(0.9, Math.abs(ambianceWind.value) / 70)), WIND_SPRING)
  );
  const style = useAnimatedStyle(() => ({
    // Le ressort peut dépasser un peu : on borne une dernière fois.
    opacity: Math.max(0, Math.min(0.9, strength.value)),
    transform: [{ translateX: x.value }, { skewX: '-18deg' }],
  }));

  if (!(width > 0)) return null; // pas encore mesuré

  return (
    <Animated.View pointerEvents="none" style={[styles.reflect, style]}>
      <LinearGradient
        colors={REFLECT_FADE}
        start={{ x: 0, y: 0.45 }}
        end={{ x: 1, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

// Identité stable : PlainButton ne refait pas rendre le reflet pour rien.
const renderWindReflection = (width) => <WindReflection width={width} />;

// Lit l'ambiance du moment. Sans ambiance (réglage « Aucune ») ou hors variante
// 'accent' (bouton verrouillé en verre), on rend le même PlainButton, sans liseré
// teinté ni reflet. Le choix se fait ICI et non dans l'export par défaut : le type
// du composant ne change jamais quand le bouton passe d'accent à verre.
function AmbientButton(props) {
  const { ambiance } = useAmbiance();
  const on = !!ambiance && props.variant === 'accent';
  return (
    <PlainButton
      {...props}
      rimColor={on ? rgba(ambiance.rim, 0.8) : undefined}
      renderAmbient={on ? renderWindReflection : undefined}
    />
  );
}

export default function Button(props) {
  // Sans `ambientRim` : le bouton d'avant, sans un hook de plus.
  if (!props.ambientRim) return <PlainButton {...props} />;
  return <AmbientButton {...props} />;
}

const styles = StyleSheet.create({
  fullWidth: {
    alignSelf: 'stretch',
  },
  // Bande de reflet : déborde un peu en haut et en bas (elle est inclinée) ; la
  // capsule intérieure (overflow hidden) la découpe, elle n'est jamais visible dehors.
  reflect: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    left: 0,
    width: REFLECT_W,
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
  // Contenu masqué pendant le chargement : même rangée centrée que `inner`.
  hidden: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
  },
  loadingLayer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
