import React, { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import AmbianceShape from './AmbianceShapes';
import { exitA, flightField, mixHex, rgbToHex, starField } from '../../lib/launchVisuals';

/**
 * Le décor « espace » : on a l'impression de voler vers quelque chose, pas d'être sur une feuille
 * blanche. Entièrement fixe sauf le zoom, qui est piloté de l'extérieur par des valeurs
 * partagées — c'est ce qui le rend réutilisable (intro de démarrage aujourd'hui ; un temps de
 * chargement entre deux écrans lourds demain).
 *
 * Couches, de l'arrière vers l'avant :
 *   1. un fond très sombre teinté de la couleur de la saison (neutre sans ambiance) ;
 *   2. la lumière de la saison : deux grandes taches douces, une forte en haut à gauche, une
 *      faible en bas à droite — comme le brun d'automne de l'accueil ;
 *   3. trois couches d'étoiles fines (lointaines, moyennes, proches) qui grossissent à des
 *      vitesses différentes : la profondeur vient de cette parallaxe ;
 *   4. quelques motifs de la saison (feuilles, pétales, flocons…) qui passent doucement, très
 *      peu et très discrets — seulement avec une ambiance ;
 *   5. des bords assombris.
 *
 * Valeurs partagées (posées par le parent) :
 *   zoom   0 → 1 : le zoom principal, déjà adouci (courbe du parent) ;
 *   finale 0 → 1 : la sortie en trois temps (lib/launchVisuals.js) — ici, au temps A tous les
 *                  éléments (lumière, étoiles, motifs, bords) disparaissent et il ne reste que le
 *                  fond sombre : le vide ;
 *   drift  0 → 1 : une très lente dérive qui continue tant que l'intro dure, pour que l'attente
 *                  ne soit jamais un écran figé.
 * `play` : tant qu'il est faux le décor est noir ; à vrai il apparaît en FONDU SUR PLACE (jamais
 * une ouverture qui grandit depuis le centre : ça fait « porte qui s'ouvre »).
 * `reduced` : « réduire les animations » — décor posé, ni zoom ni motifs.
 */

const FAR = { count: 34, rMin: 0.5, rMax: 1.0, aMin: 0.25, aMax: 0.5, zoomTo: 0.25 };
const MID = { count: 20, rMin: 0.9, rMax: 1.5, aMin: 0.35, aMax: 0.6, zoomTo: 0.8 };
const NEAR = { count: 9, rMin: 1.3, rMax: 2.0, aMin: 0.45, aMax: 0.75, zoomTo: 2.2 };
const NEBULA_ZOOM = 0.3;

// Sans ambiance (réglage « Aucune ») : un bleu-gris froid, neutre.
const NEUTRAL_GLOW = '#7C86B8';

export function spaceTone(ambiance) {
  const glow = ambiance ? rgbToHex(ambiance.glow) : NEUTRAL_GLOW;
  return {
    glow,
    base: mixHex(glow, '#000000', 0.9),
    // L'hiver est la saison la plus lumineuse (glowK 1,5) : on plafonne pour rester sombre.
    peak: Math.min(0.4, 0.3 * (ambiance?.glowK ?? 1)),
  };
}

function SpaceBackdrop({ width, height, ambiance, zoom, finale, drift, play, reduced }) {
  const tone = useMemo(() => spaceTone(ambiance), [ambiance]);
  const appear = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (!play || reduced) return;
    appear.value = withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) });
  }, [play]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: appear.value }));
  // Au temps A de la sortie tout s'efface ; le fond (la couleur de base) reste : c'est le vide.
  const elementsStyle = useAnimatedStyle(() => ({ opacity: 1 - exitA(finale.value) }));

  // Profondeur du zoom : le zoom principal, plus le zoom final, plus la lente dérive.
  const nebStyle = useAnimatedStyle(() => {
    const z = reduced ? 0 : zoom.value + 0.08 * finale.value + 0.05 * drift.value;
    return { transform: [{ scale: 1 + NEBULA_ZOOM * z }] };
  });
  const farStyle = useLayerStyle(zoom, finale, drift, FAR.zoomTo, reduced);
  const midStyle = useLayerStyle(zoom, finale, drift, MID.zoomTo, reduced);
  const nearStyle = useLayerStyle(zoom, finale, drift, NEAR.zoomTo, reduced);

  const motifs = useMemo(
    () =>
      ambiance && !reduced
        ? flightField({
            seed: `space-${ambiance.id}`,
            count: 6,
            kinds: ambiance.motifs,
            minSize: 12,
            maxSize: 20,
            alpha: 0.5,
          })
        : [],
    [ambiance, reduced]
  );
  const rmax = Math.hypot(width, height) / 2;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: tone.base }, rootStyle]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, elementsStyle]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, nebStyle]} pointerEvents="none">
        <Nebula width={width} height={height} color={tone.glow} peak={tone.peak} />
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, farStyle]} pointerEvents="none">
        <Stars width={width} height={height} layer={FAR} seed="far" />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, midStyle]} pointerEvents="none">
        <Stars width={width} height={height} layer={MID} seed="mid" />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, nearStyle]} pointerEvents="none">
        <Stars width={width} height={height} layer={NEAR} seed="near" />
      </Animated.View>

      {motifs.length ? (
        <View pointerEvents="none" style={[styles.anchor, { left: width / 2, top: height / 2 }]}>
          {motifs.map((m, i) => (
            <FlightMotif
              key={i}
              m={m}
              zoom={zoom}
              rmax={rmax}
              ink="#FFFFFF"
              accent={ambiance.accent}
            />
          ))}
        </View>
      ) : null}

      <Vignette width={width} height={height} />
      </Animated.View>
    </Animated.View>
  );
}

export default memo(SpaceBackdrop);

// Style d'une couche d'étoiles : elle grossit autour du centre, d'autant plus qu'elle est proche.
function useLayerStyle(zoom, finale, drift, zoomTo, reduced) {
  return useAnimatedStyle(() => {
    const z = reduced ? 0 : zoom.value + 0.08 * finale.value + 0.05 * drift.value;
    return { transform: [{ scale: 1 + zoomTo * z }] };
  });
}

const Nebula = memo(function Nebula({ width, height, color, peak }) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="spaceNebA" cx="28%" cy="40%" rx="85%" ry="70%" fx="28%" fy="40%">
          <Stop offset="0" stopColor={color} stopOpacity={peak} />
          <Stop offset="0.5" stopColor={color} stopOpacity={peak * 0.35} />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="spaceNebB" cx="82%" cy="78%" rx="60%" ry="45%">
          <Stop offset="0" stopColor={color} stopOpacity={peak * 0.4} />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#spaceNebA)" />
      <Rect width="100%" height="100%" fill="url(#spaceNebB)" />
    </Svg>
  );
});

const Stars = memo(function Stars({ width, height, layer, seed }) {
  const dots = useMemo(
    () =>
      starField({
        seed: `stars-${seed}`,
        count: layer.count,
        width,
        height,
        rMin: layer.rMin,
        rMax: layer.rMax,
        aMin: layer.aMin,
        aMax: layer.aMax,
      }),
    [width, height, layer, seed]
  );
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      {dots.map((d, i) => (
        <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#FFFFFF" fillOpacity={d.a} />
      ))}
    </Svg>
  );
});

const Vignette = memo(function Vignette({ width, height }) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="spaceVignette" cx="50%" cy="45%" rx="75%" ry="65%" fx="50%" fy="45%">
          <Stop offset="0" stopColor="#000000" stopOpacity="0" />
          <Stop offset="0.6" stopColor="#000000" stopOpacity="0.1" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0.5" />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#spaceVignette)" />
    </Svg>
  );
});

/**
 * Un motif de la saison qui passe : il part près du centre, file vers l'extérieur en grossissant
 * (il est « proche »), se détache doucement puis s'éteint avant de sortir de l'écran. Un seul
 * `zoom` pilote tout ; transform et opacity seulement.
 */
const FlightMotif = memo(function FlightMotif({ m, zoom, rmax, ink, accent }) {
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (zoom.value - m.delay) / (1 - m.delay)));
    const r = m.r0 * rmax * (1 + m.g * t);
    const fadeIn = Math.min(1, t / 0.2);
    const out = Math.min(1, Math.max(0, (rmax * 1.1 - r) / (rmax * 0.3)));
    return {
      opacity: t > 0 ? fadeIn * out * m.alpha : 0,
      transform: [
        { translateX: Math.cos(m.angle) * r },
        { translateY: Math.sin(m.angle) * r },
        { rotate: `${m.spin * t}deg` },
        { scale: 0.5 + 0.3 * m.g * t },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.motif,
        { width: m.size, height: m.size, left: -m.size / 2, top: -m.size / 2 },
        style,
      ]}
    >
      <AmbianceShape kind={m.kind} size={m.size} ink={ink} accent={accent} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  // Point de 0 × 0 posé au centre de l'écran ; chaque motif se place avec un left/top explicite
  // (surtout pas d'alignItems ici : Yoga l'appliquerait aussi aux enfants absolus).
  anchor: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  motif: {
    position: 'absolute',
    opacity: 0,
  },
});
