import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import useAmbiance, { useAmbianceActive } from '../../hooks/useAmbiance';
import { haloOpacities } from '../../lib/ambiance';
import { ambianceWind } from '../../lib/ambianceMotion';

/**
 * AmbianceHalo — la couronne de 36 graduations qui entoure un bouton rond du haut
 * (maquette « Round.dc.html »). Même langage que l'anneau à graduations de l'app :
 * une partie est « allumée » aux couleurs de l'ambiance, côté extérieur de l'écran
 * (haut-gauche ou haut-droite), le reste est à peine visible.
 *
 * Se pose comme enfant d'un conteneur de la taille du bouton : la couronne DÉBORDE
 * du conteneur (position absolue, décalée de -13 dp) et ne reçoit aucun toucher.
 * Ne jamais mettre `overflow: 'hidden'` sur le conteneur.
 *
 * Réactivité : au glissé du carrousel de l'accueil, la couronne tourne comme un
 * cadran (`ambianceWind`, en dp : angle = vent × 0,25, borné à ±40°), puis revient
 * avec un petit rebond. Au repos elle est immobile.
 *
 * Mode `live` : le SEUL bouton animé au repos de toute l'app (le choix de l'ambiance,
 * dans les Paramètres). La couronne tourne très lentement (45° toutes les 4 s) et
 * respire à peine (échelle 1 ↔ 1,05, 4 s dans chaque sens), seulement tant que
 * l'écran est affiché, l'app au premier plan et « réduire les animations » inactif.
 * Sans ambiance (réglage « Aucune »), une couronne blanche plus discrète.
 *
 * Tout passe par transform sur le fil d'interface : aucun setState par image.
 */

const TICKS = 36;
const GAP = 6.5; // écart entre le bord du bouton et le pied des graduations
const LEN = 3.6;
const WIDTH = 1.4;
const PAD = 13; // la couronne dépasse du bouton de 13 dp de chaque côté

// Un tour complet toutes les 32 s = 45° toutes les 4 s. La respiration (8 s par
// cycle) tombe pile 4 fois par tour : une seule horloge pilote les deux, sans à-coup
// quand elle repart après une pause.
const LIVE_PERIOD_MS = 32000;
const BREATH_CYCLES = 4;
const BREATH_AMOUNT = 0.05;
const LIVE_STRENGTH = 0.75;

const MAX_ANGLE = 40;
const WIND_TO_ANGLE = 0.25;

// Rebond léger : le retour du cadran dépasse à peine sa position de repos.
export const WIND_SPRING = { damping: 16, stiffness: 160, mass: 0.9 };

const round2 = (n) => Math.round(n * 100) / 100;

// Segments des 36 graduations, 0° = midi, sens des aiguilles d'une montre.
function tickLines(size) {
  const c = size / 2 + PAD;
  const r1 = size / 2 + GAP;
  const r2 = r1 + LEN;
  return Array.from({ length: TICKS }, (_, k) => {
    const a = ((k * 360) / TICKS) * (Math.PI / 180);
    const s = Math.sin(a);
    const co = Math.cos(a);
    return {
      x1: round2(c + s * r1),
      y1: round2(c - co * r1),
      x2: round2(c + s * r2),
      y2: round2(c - co * r2),
    };
  });
}

export default function AmbianceHalo({ size, side = 'left', live = false }) {
  const { ambiance } = useAmbiance();
  const active = useAmbianceActive();

  const color = ambiance ? ambiance.accent : live ? '#FFFFFF' : null;
  const strength = live ? LIVE_STRENGTH : 1;
  const box = size + PAD * 2;

  // Géométrie et opacités ne changent qu'avec la taille, le côté ou l'ambiance.
  const lines = useMemo(() => tickLines(size), [size]);
  const opacities = useMemo(
    () => haloOpacities(TICKS, side === 'left' ? -45 : 45, strength).map(round2),
    [side, strength]
  );

  // Vent → angle, lissé par un ressort (le relâché du carrousel fait revenir doucement).
  const windAngle = useDerivedValue(() =>
    withSpring(
      Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, ambianceWind.value * WIND_TO_ANGLE)),
      WIND_SPRING
    )
  );

  // Horloge du mode `live` : 0 → 1 en boucle, avancée à chaque image tant qu'elle est
  // active. Elle reprend là où elle s'était arrêtée (pas de saut au retour sur l'écran).
  const clock = useSharedValue(0);
  const onFrame = useCallback(
    (info) => {
      'worklet';
      const dt = info.timeSincePreviousFrame;
      if (dt == null) return; // première image après l'activation
      clock.value = (clock.value + Math.min(dt, 64) / LIVE_PERIOD_MS) % 1;
    },
    [clock]
  );
  const frame = useFrameCallback(onFrame, false);

  useEffect(() => {
    if (!live || !active) return undefined;
    frame.setActive(true);
    return () => frame.setActive(false);
  }, [live, active, frame]);

  const ringStyle = useAnimatedStyle(() => {
    const t = clock.value;
    const turn = live ? t * 360 : 0;
    const breath = live
      ? 1 + BREATH_AMOUNT * (0.5 - 0.5 * Math.cos(t * BREATH_CYCLES * 2 * Math.PI))
      : 1;
    return { transform: [{ rotate: `${windAngle.value + turn}deg` }, { scale: breath }] };
  });

  if (!color) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { width: box, height: box, left: -PAD, top: -PAD }, ringStyle]}
    >
      <Svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
        {lines.map((l, k) => (
          <Line
            key={k}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={color}
            strokeOpacity={opacities[k]}
            strokeWidth={WIDTH}
            strokeLinecap="round"
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
  },
});
