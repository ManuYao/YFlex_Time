import React, { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import PressTap from './PressTap';
import { useHoldProgress } from '../../hooks/useHoldProgress';
import { withAlpha } from '../../lib/phase-colors';

// Même tolérance que le Planning : le doigt peut dériver sans annuler le maintien.
const RETENTION = { top: 36, left: 36, right: 36, bottom: 36 };

/**
 * HoldToTag — une zone (un score de jeu) qu'on MAINTIENT pour noter son exercice
 * (voir lib/gameExercises.js). Même mécanique que le Planning (maintenir un bloc pour le
 * lancer, hooks/useHoldProgress.js) pour que la personne SENTE et VOIE que son maintien
 * est pris en compte :
 *  - `invite` : un contour lumineux fixe et discret fait tout le tour (aucune animation) ;
 *  - l'appui : la zone s'enfonce légèrement ;
 *  - le maintien : une barre de la couleur du jeu REMPLIT la zone de gauche à droite
 *    pendant `holdMs`, avec de petites vibrations ; l'ouverture se fait quand elle est
 *    pleine. Relâché trop tôt, elle redescend.
 * La barre est pilotée sur le fil d'interface : rien ne se re-rend pendant le maintien.
 *
 * Props:
 * - color    : hex opaque (la couleur du jeu)
 * - radius   : arrondi de la zone (contour et barre le suivent)
 * - invite   : contour allumé au repos (score pas encore noté)
 * - holdMs   : durée du maintien avant `onHold`
 * - onHold   : appelé une fois le maintien accompli (la vibration de réussite est déjà faite)
 * - style    : style de la zone (comme le `style` de PressTap)
 * Le `ref` pointe la zone (pour la mesurer, ex. une bulle d'explication).
 */
const HoldToTag = forwardRef(function HoldToTag(
  { color, radius = 16, invite = false, holdMs = 1000, onHold, style, children, accessibilityLabel },
  ref
) {
  const hold = useHoldProgress(onHold, holdMs);
  const fillStyle = useAnimatedStyle(() => ({ width: `${hold.progress.value * 100}%` }));

  return (
    <View ref={ref} collapsable={false}>
      <PressTap
        onPressStart={hold.start}
        onPressEnd={hold.cancel}
        pressRetentionOffset={RETENTION}
        tapScale={0.97}
        style={style}
        accessibilityLabel={accessibilityLabel}
      >
        {invite && (
          <View
            pointerEvents="none"
            style={[
              styles.halo,
              {
                borderRadius: radius,
                borderColor: withAlpha(color, 0.45),
                boxShadow: `0 0 14px 1px ${withAlpha(color, 0.25)}`,
              },
            ]}
          />
        )}
        <View pointerEvents="none" style={[styles.clip, { borderRadius: radius }]}>
          <Animated.View style={[styles.fill, { backgroundColor: withAlpha(color, 0.42) }, fillStyle]} />
        </View>
        {children}
      </PressTap>
    </View>
  );
});

export default HoldToTag;

const styles = StyleSheet.create({
  halo: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1.5,
  },
  clip: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
});
