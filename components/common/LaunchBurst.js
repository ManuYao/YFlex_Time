import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import AmbianceShape from './AmbianceShapes';

/**
 * Une rafale de particules qui jaillit d'un point (le centre de l'anneau) : des points de
 * couleur, ou des formes d'ambiance (feuilles, flocons, pétales…) quand `kind` est donné.
 *
 * Tout est piloté par UNE seule valeur partagée `progress` (0 → 1, posée par le parent : une
 * fois, ou en boucle). Chaque particule en déduit son propre avancement avec son retard, puis
 * sa position, sa rotation, sa taille et son opacité — uniquement `transform` et `opacity`,
 * sur le fil d'interface.
 *
 * Le conteneur est un point de 0 × 0 posé en (x, y) ; chaque particule se place avec un
 * left/top explicite (surtout pas d'alignItems ici : Yoga l'appliquerait aussi aux enfants
 * absolus et décalerait tout).
 *
 * particles : voir burstParticles (lib/launchVisuals.js).
 * ink / accent : couleurs des formes d'ambiance.
 */
function LaunchBurst({ progress, particles, x, y, ink = '#FFFFFF', accent = '#FFFFFF' }) {
  return (
    <View pointerEvents="none" style={[styles.anchor, { left: x, top: y }]}>
      {particles.map((p, i) => (
        <Particle key={i} p={p} progress={progress} ink={ink} accent={accent} />
      ))}
    </View>
  );
}

export default memo(LaunchBurst);

const Particle = memo(function Particle({ p, progress, ink, accent }) {
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (progress.value - p.delay) / (1 - p.delay)));
    const e = 1 - Math.pow(1 - t, 3); // sort vite puis ralentit
    // Apparaît tout de suite, s'éteint longuement : une étincelle, pas un confetti qui disparaît d'un coup.
    const fade = t <= 0 ? 0 : t < 0.14 ? t / 0.14 : 1 - (t - 0.14) / 0.86;
    return {
      opacity: fade * p.alpha,
      transform: [
        { translateX: Math.cos(p.angle) * p.dist * e },
        { translateY: Math.sin(p.angle) * p.dist * e + p.drift * t * t },
        { rotate: `${p.spin * t}deg` },
        { scale: 0.35 + 0.65 * Math.min(1, t * 5) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        { width: p.size, height: p.size, left: -p.size / 2, top: -p.size / 2 },
        style,
      ]}
    >
      {p.kind ? (
        <AmbianceShape kind={p.kind} size={p.size} ink={ink} accent={accent} />
      ) : (
        <View
          style={{
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: p.color,
          }}
        />
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  particle: {
    position: 'absolute',
    opacity: 0,
  },
});
