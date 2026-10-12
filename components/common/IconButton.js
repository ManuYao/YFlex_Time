import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import PressTap from './PressTap';
import AppIcon from './AppIcon';
import AmbianceHalo, { WIND_SPRING } from './AmbianceHalo';
import useAmbiance from '../../hooks/useAmbiance';
import { rgba } from '../../lib/ambiance';
import { ambianceWind } from '../../lib/ambianceMotion';
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
 * - halo     : 'left' | 'right' — ambiance de saison (voir le bas du fichier) :
 *              couronne de 36 graduations autour du bouton, liseré teinté,
 *              glyphe légèrement teinté, et réaction au glissé du carrousel
 *              de l'accueil. Sans `halo`, rien ne change : même arbre qu'avant.
 *              Le bouton est alors posé dans un conteneur de sa taille, qui
 *              reçoit `style` (placement) et laisse déborder la couronne.
 * - haloLive : le halo tourne et respire seul, même au repos (le SEUL bouton
 *              animé de l'app : le choix de l'ambiance, dans les Paramètres).
 */
function PlainIconButton({
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
  rimColor, // interne : liseré teinté de l'ambiance (posé par WindIconButton)
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
            borderColor: rimColor ?? r.borderColor,
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

/* ───────────── Ambiance de saison (props `halo` / `haloLive`) ───────────── */

// Mouvement lissé par un ressort, tiré du vent du carrousel (`ambianceWind`, en dp :
// positif = le doigt va à droite). `factor` convertit des dp en pixels ou en degrés,
// `max` borne le résultat. Au relâché, retour avec un petit rebond (maquette Round :
// gx = vent × 0,035 à ±4 ; gr = vent × 0,06 à ±8° ; mx = vent × 0,02 à ±3).
function useWindSpring(factor, max) {
  return useDerivedValue(() =>
    withSpring(Math.max(-max, Math.min(max, ambianceWind.value * factor)), WIND_SPRING)
  );
}

// Le glyphe suit le doigt de quelques pixels et s'incline un peu.
function WindGlyph({ children }) {
  const dx = useWindSpring(0.035, 4);
  const deg = useWindSpring(0.06, 8);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: dx.value }, { rotate: `${deg.value}deg` }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

// Bouton posé dans un conteneur de sa taille : la couronne passe derrière et déborde
// (jamais d'overflow hidden ici), le bouton glisse de quelques dp comme un aimant.
function WindIconButton({
  halo,
  haloLive,
  ambiance,
  icon,
  size = ROUND_SIZE.nav,
  iconSize,
  variant = 'glass',
  tone = 'light',
  color,
  style,
  ...rest
}) {
  const r = buttonRecipe({ variant, tone, color });
  const glyph = iconSize ?? Math.round(size * 0.45);
  const glide = useWindSpring(0.02, 3);
  const glideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: glide.value }] }));

  // Sans ambiance (réglage « Aucune ») : aucune teinte, seulement la couronne blanche du mode live.
  const accent = ambiance ? ambiance.accent : undefined;
  // Le liseré teinté ne vaut que pour le verre ; les autres variantes gardent le leur.
  const rimColor = ambiance && variant === 'glass' ? rgba(ambiance.rim, 0.7) : undefined;
  const glyphEl =
    typeof icon === 'string' ? (
      <AppIcon name={icon} size={glyph} color={r.textColor} accent={accent} />
    ) : (
      icon
    );

  return (
    <View style={[{ width: size, height: size }, style]}>
      {/* Couronne de graduations : seulement pour le bouton « live » (jugée trop voyante ailleurs, 12/10). */}
      {haloLive ? <AmbianceHalo size={size} side={halo} live={haloLive} /> : null}
      <Animated.View style={[{ width: size, height: size }, glideStyle]}>
        <PlainIconButton
          {...rest}
          icon={<WindGlyph>{glyphEl}</WindGlyph>}
          size={size}
          iconSize={iconSize}
          variant={variant}
          tone={tone}
          color={color}
          rimColor={rimColor}
        />
      </Animated.View>
    </View>
  );
}

// Lit l'ambiance du moment ; s'il n'y en a aucune (et pas de mode live), le bouton
// reste exactement le bouton ordinaire.
function AmbientIconButton(props) {
  const { ambiance } = useAmbiance();
  if (!ambiance && !props.haloLive) return <PlainIconButton {...props} />;
  return <WindIconButton {...props} ambiance={ambiance} />;
}

export default function IconButton(props) {
  // Sans `halo` : le bouton d'avant, sans un hook de plus (IconButton sert partout).
  if (!props.halo) return <PlainIconButton {...props} />;
  return <AmbientIconButton {...props} />;
}
