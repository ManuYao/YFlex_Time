import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import useAmbiance, { useAmbianceActive } from '../../hooks/useAmbiance';
import { getAmbiance, nextRareDelayMs } from '../../lib/ambiance';
import { ambianceWind } from '../../lib/ambianceMotion';
import AmbianceShape from './AmbianceShapes';

/**
 * AmbianceBackdrop — le décor d'ambiance de saison, à poser DERRIÈRE le contenu d'un écran
 * (il remplit son parent et ne reçoit aucun toucher).
 *
 * Trois couches, toutes très discrètes :
 *   1. LUEUR   trois grandes taches de lumière qui respirent et se déplacent à peine ;
 *   2. MOTIFS  cinq petites formes fines qui flottent seules (feuilles, flocons, braises…) ;
 *   3. PASSAGE un seul grand motif qui traverse l'écran lentement, de loin en loin.
 *
 * `tone` : 'light' → motifs blancs (la plupart des écrans) ; 'dark' → motifs noirs
 * (écran à texte noir, ex. TABATA).
 *
 * Légèreté : rien ne passe par le fil JS en cours d'animation. Tout est `transform` /
 * `opacity` sur des valeurs partagées Reanimated. Quand l'écran n'est pas affiché, que
 * l'app est en arrière-plan ou que « réduire les animations » est actif
 * (`useAmbianceActive()` faux), RIEN ne bouge : le décor reste visible, figé.
 *
 * Le vent (`ambianceWind`, écrit par le carrousel de l'accueil) pousse les motifs avec de
 * la parallaxe pendant un glissé ; il retombe à 0 tout seul au relâché.
 */

const SOFT = Easing.inOut(Easing.sin);
const LINEAR = Easing.linear;
const INK = { light: '#FFFFFF', dark: '#0A0A0A' };

// Passage rare : durée de la traversée et premier délai (20 à 40 s après le montage).
const RARE_MS = 7000;
const RARE_FIRST_MIN_MS = 20000;
const RARE_FIRST_SPREAD_MS = 20000;
const RARE_SIZE = 30;

// Les trois taches de lumière (position et diamètre en fractions de l'écran).
const GLOW_BLOBS = [
  { fx: 0.5, fy: 0, size: 1.15, opacity: 0.22 },
  { fx: 0.12, fy: 0.38, size: 0.8, opacity: 0.1 },
  { fx: 0.9, fy: 0.72, size: 0.7, opacity: 0.08 },
];

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Moitié d'un cycle aller-retour : le cycle entier dure de 14 à 26 s.
const randomHalf = () => (14000 + Math.random() * 12000) / 2;

// [r, g, b] → '#RRGGBB' (react-native-svg veut un hex opaque).
const toHex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

// Tirage pseudo-aléatoire STABLE (même ambiance → mêmes positions de départ), comme la maquette.
function seededRandom(key) {
  let seed = 7;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/**
 * Où poser les motifs au départ. Ils évitent la zone centrale du héros (l'anneau de
 * l'accueil) : |x − largeur/2| < 120 et y entre 20 % et 60 % de la hauteur.
 */
function layoutMotifs(ambiance, w, h) {
  const rnd = seededRandom(ambiance.id);
  return ambiance.motifs.map((kind) => {
    let x = 0;
    let y = 0;
    for (let t = 0; t < 10; t++) {
      x = 8 + rnd() * Math.max(1, w - 32);
      y = 70 + rnd() * Math.max(1, h - 170);
      const inHero = Math.abs(x - w / 2) < 120 && y > h * 0.2 && y < h * 0.6;
      if (!inHero) break;
    }
    const size = 11 + Math.round(rnd() * 6);
    const opacity = 0.3 + rnd() * 0.2;
    const rot = rnd() * 360;
    const depth = 0.3 + rnd() * 0.7; // profondeur : sensibilité au vent
    return { kind, x, y, size, opacity, rot, depth };
  });
}

/**
 * Oscillateur lent : une valeur partagée qui va et vient entre 0 et 1 (easing en sinus),
 * `halfMs` pour un aller. Démarre/s'arrête avec `active` ; à la reprise, il repart de là
 * où il s'était arrêté (aucun saut) : il rejoint d'abord 0 à la même vitesse, puis boucle.
 */
function useOscillator(active, halfMs, start) {
  const sv = useSharedValue(start);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active) return undefined;
    // Au premier démarrage on connaît la valeur ; ensuite on la relit (une seule fois).
    const cur = startedRef.current ? clamp01(sv.value) : start;
    startedRef.current = true;
    sv.value = withSequence(
      withTiming(0, { duration: Math.max(1, cur * halfMs), easing: SOFT }),
      withRepeat(withTiming(1, { duration: halfMs, easing: SOFT }), -1, true)
    );
    return () => cancelAnimation(sv);
  }, [active]);

  return sv;
}

/**
 * Chute / montée linéaire d'un bord à l'autre : 0 → 1 en `durationMs`, puis saut
 * instantané à 0 (le motif est alors hors de l'écran) et on recommence. À la reprise
 * après une pause, finit d'abord le trajet en cours (vitesse constante).
 */
function useFall(active, durationMs, start) {
  const sv = useSharedValue(start);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active) return undefined;
    const cur = startedRef.current ? clamp01(sv.value) : start;
    startedRef.current = true;
    sv.value = withSequence(
      withTiming(1, { duration: Math.max(1, (1 - cur) * durationMs), easing: LINEAR }),
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(1, { duration: durationMs, easing: LINEAR })
        ),
        -1,
        false
      )
    );
    return () => cancelAnimation(sv);
  }, [active]);

  return sv;
}

// ─── 1. LUEUR ──────────────────────────────────────────────────────────────

function Glow({ ambiance, w, h, active }) {
  // Durées et phases de départ tirées UNE fois par tache (pas à chaque rendu).
  const [plans] = useState(() =>
    GLOW_BLOBS.map(() => ({
      x0: Math.random(),
      y0: Math.random(),
      b0: Math.random(),
      xHalf: randomHalf(),
      yHalf: randomHalf(),
      bHalf: randomHalf(),
    }))
  );
  const color = toHex(ambiance.glow);

  return (
    <>
      {GLOW_BLOBS.map((blob, i) => (
        <GlowBlob
          key={i}
          gid={`ambGlow${i}`}
          color={color}
          blob={blob}
          intensity={ambiance.glowK}
          plan={plans[i]}
          w={w}
          h={h}
          active={active}
        />
      ))}
    </>
  );
}

const GlowBlob = memo(function GlowBlob({ gid, color, blob, intensity, plan, w, h, active }) {
  const d = blob.size * w;
  const base = blob.opacity * intensity;
  const ox = useOscillator(active, plan.xHalf, plan.x0);
  const oy = useOscillator(active, plan.yHalf, plan.y0);
  const ob = useOscillator(active, plan.bHalf, plan.b0);

  const style = useAnimatedStyle(() => ({
    opacity: base * (0.65 + 0.7 * ob.value), // ×0,65 à ×1,35
    transform: [
      { translateX: (ox.value - 0.5) * 2 * 0.12 * w }, // ±12 % de la largeur
      { translateY: (oy.value - 0.5) * 2 * 0.05 * h }, // ±5 % de la hauteur
      { scale: 0.92 + 0.22 * ob.value }, // 0,92 à 1,14
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.fixed,
        { left: blob.fx * w - d / 2, top: blob.fy * h - d / 2, width: d, height: d },
        style,
      ]}
    >
      <Svg width={d} height={d}>
        <Defs>
          <RadialGradient id={gid} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="0.93" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gid})`} />
      </Svg>
    </Animated.View>
  );
});

// ─── 2. MOTIFS ─────────────────────────────────────────────────────────────

/**
 * Motif qui traverse l'écran de bord à bord (`dir` 1 : il descend, −1 : il monte), avec un
 * balancement horizontal de ±20 dp et une rotation lente de ±45°.
 */
const FloatingMotif = memo(function FloatingMotif({ spec, dir, ink, accent, h, active }) {
  const { kind, x, y, size, opacity, rot, depth } = spec;
  const span = h + size + 8; // trajet complet : de juste hors de l'écran à juste hors de l'écran
  const [plan] = useState(() => ({
    // 90 à 140 s d'un bord à l'autre (6 à 9 dp/s) : une dérive très lente, comme la maquette.
    fallMs: 90000 + Math.random() * 50000,
    swayHalf: randomHalf(),
    sway0: Math.random(),
    // Phase de départ : le motif commence là où la mise en page l'a posé.
    fall0: clamp01(dir > 0 ? (y + size + 4) / span : (h + 4 - y) / span),
  }));
  const fall = useFall(active, plan.fallMs, plan.fall0);
  const sway = useOscillator(active, plan.swayHalf, plan.sway0);

  const style = useAnimatedStyle(() => {
    const wind = ambianceWind.value * 0.12 * depth;
    const f = fall.value;
    const ty = dir > 0 ? -size - 4 + f * span : h + 4 - f * span;
    return {
      transform: [
        { translateX: x + (sway.value - 0.5) * 40 + wind },
        { translateY: ty },
        { rotate: `${rot + (sway.value - 0.5) * 90 + wind}deg` },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.fixed, { width: size, height: size, opacity }, style]}
    >
      <AmbianceShape kind={kind} size={size} ink={ink} accent={accent} />
    </Animated.View>
  );
});

/**
 * Motif qui se promène sur place et scintille à peine (points de lumière, étoiles) :
 * ±26 dp en x, ±22 dp en y, rotation ±25°, opacité entre 0,2 et 0,6.
 */
const WanderingMotif = memo(function WanderingMotif({ spec, ink, accent, active }) {
  const { kind, x, y, size, rot, depth } = spec;
  const [plan] = useState(() => ({
    xHalf: randomHalf(),
    yHalf: randomHalf(),
    x0: Math.random(),
    y0: Math.random(),
  }));
  const ox = useOscillator(active, plan.xHalf, plan.x0);
  const oy = useOscillator(active, plan.yHalf, plan.y0);

  const style = useAnimatedStyle(() => {
    const wind = ambianceWind.value * 0.12 * depth;
    return {
      opacity: 0.2 + 0.4 * (0.5 * ox.value + 0.5 * oy.value),
      transform: [
        { translateX: x + (ox.value - 0.5) * 52 + wind },
        { translateY: y + (oy.value - 0.5) * 44 },
        { rotate: `${rot + (ox.value - 0.5) * 50 + wind}deg` },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.fixed, { width: size, height: size, opacity: 0.4 }, style]}
    >
      <AmbianceShape kind={kind} size={size} ink={ink} accent={accent} />
    </Animated.View>
  );
});

// ─── 3. PASSAGE RARE ───────────────────────────────────────────────────────

// Lueur douce derrière le grand motif.
function Halo({ color, size }) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="ambRareHalo" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={color} stopOpacity="0.4" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#ambRareHalo)" />
    </Svg>
  );
}

const HALO_SIZE = RARE_SIZE * 2.4;

/**
 * Un seul grand motif, en diagonale de la gauche (hors écran) vers le bas à droite, en
 * ~7 s. Premier passage 20 à 40 s après le montage, puis un nouveau tous les
 * `nextRareDelayMs()`. Une seule instance à la fois (le délai court après la fin du
 * passage). Planifié par setTimeout, coupé dès que l'animation n'est plus active.
 */
function RarePass({ kind, ink, accent, w, h, active }) {
  const progress = useSharedValue(0);
  const startY = useSharedValue(h * 0.15);

  useEffect(() => {
    if (!active) return undefined;
    let timer = null;
    const fire = () => {
      startY.value = h * (0.06 + Math.random() * 0.22);
      progress.value = 0;
      progress.value = withTiming(1, { duration: RARE_MS, easing: LINEAR });
      timer = setTimeout(fire, RARE_MS + nextRareDelayMs());
    };
    timer = setTimeout(fire, RARE_FIRST_MIN_MS + Math.random() * RARE_FIRST_SPREAD_MS);
    return () => {
      clearTimeout(timer);
      cancelAnimation(progress);
      progress.value = 0; // hors pause, le motif ne reste jamais figé à l'écran
    };
  }, [active, h]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.25, 0.75, 1], [0, 0.85, 0.85, 0]),
      transform: [
        { translateX: -40 + p * (w + 50) },
        { translateY: startY.value + p * h * 0.5 },
        { rotate: `${p * 230}deg` },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.fixed, { width: RARE_SIZE, height: RARE_SIZE, opacity: 0 }, style]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.fixed,
          {
            left: (RARE_SIZE - HALO_SIZE) / 2,
            top: (RARE_SIZE - HALO_SIZE) / 2,
            width: HALO_SIZE,
            height: HALO_SIZE,
          },
        ]}
      >
        <Halo color={accent} size={HALO_SIZE} />
      </View>
      <AmbianceShape kind={kind} size={RARE_SIZE} ink={ink} accent={accent} />
    </Animated.View>
  );
}

// ─── Assemblage ────────────────────────────────────────────────────────────

function Scene({ ambiance, ink, w, h, active }) {
  const motifs = useMemo(() => layoutMotifs(ambiance, w, h), [ambiance, w, h]);

  return (
    <>
      <Glow ambiance={ambiance} w={w} h={h} active={active} />
      {motifs.map((spec, i) =>
        ambiance.dir === 0 ? (
          <WanderingMotif
            key={i}
            spec={spec}
            ink={ink}
            accent={ambiance.accent}
            active={active}
          />
        ) : (
          <FloatingMotif
            key={i}
            spec={spec}
            dir={ambiance.dir}
            ink={ink}
            accent={ambiance.accent}
            h={h}
            active={active}
          />
        )
      )}
      {ambiance.rare ? (
        <RarePass
          kind={ambiance.rare}
          ink={ink}
          accent={ambiance.accent}
          w={w}
          h={h}
          active={active}
        />
      ) : null}
    </>
  );
}

// `ambianceId` : impose une ambiance précise (bilan de saison) au lieu de celle du jour.
export default function AmbianceBackdrop({ tone = 'light', ambianceId = null }) {
  const current = useAmbiance().ambiance;
  const ambiance = ambianceId ? getAmbiance(ambianceId) : current;
  const active = useAmbianceActive();
  const [size, setSize] = useState({ w: 0, h: 0 });

  const handleLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    const w = Math.round(width);
    const h = Math.round(height);
    setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
  }, []);

  // Réglage « Aucune » : rien du tout (les hooks ci-dessus sont appelés quand même).
  if (!ambiance) return null;

  const ink = tone === 'dark' ? INK.dark : INK.light;

  return (
    <View style={styles.root} pointerEvents="none" onLayout={handleLayout}>
      {size.w > 0 && size.h > 0 ? (
        // La clé reconstruit proprement le décor quand l'ambiance (ou la taille) change.
        <Scene
          key={`${ambiance.id}:${ambiance.drift ? ambiance.drift.swap : 0}:${size.w}x${size.h}`}
          ambiance={ambiance}
          ink={ink}
          w={size.w}
          h={size.h}
          active={active}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  // Chaque élément est posé en haut à gauche ; sa position réelle vient du transform.
  fixed: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
