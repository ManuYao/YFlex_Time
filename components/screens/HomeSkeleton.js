import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SkeletonGroup, SkeletonBlock } from '../common/Skeleton';
import { BOTTOM_GAP, BUTTON_HEIGHT, ROUND_SIZE, SIDE_GAP } from '../../lib/buttonTokens';
import { scaled, useLayoutLevel, useUiScale } from '../../lib/responsive';

/**
 * Squelette de l'accueil : la silhouette d'une carte de timer (barre du haut,
 * anneau, trois réglages, points, bouton Lancer) en gris sur fond noir.
 *
 * Volontairement NEUTRE (ni la couleur d'un mode, ni son nom) : on ne sait pas
 * encore sur quel timer l'accueil va s'ouvrir — c'est justement ce que le
 * démarrage intelligent (lib/smartStart.js) est en train de décider. Une couleur
 * devinée à tort ferait un éclair avant la bonne.
 *
 * Mêmes tailles que la vraie carte (anneau 320, 260 en fenêtre courte, plus
 * d'anneau en mini) : au fondu, rien ne saute. Si la mise en page de l'accueil
 * change, la mettre à jour ici aussi.
 */
export default function HomeSkeleton() {
  const insets = useSafeAreaInsets();
  const ui = useUiScale();
  const level = useLayoutLevel();
  const isMini = level === 'mini';
  const isCompact = level === 'compact';
  const ring = scaled(isCompact ? 260 : 320, ui);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <SkeletonGroup style={styles.group}>
        {/* ── Barre du haut : menu, étiquette du mode, profil ── */}
        <View style={styles.topBar}>
          <SkeletonBlock width={ROUND_SIZE.nav} height={ROUND_SIZE.nav} radius={ROUND_SIZE.nav / 2} />
          <SkeletonBlock width={92} height={12} radius={6} />
          <SkeletonBlock width={ROUND_SIZE.nav} height={ROUND_SIZE.nav} radius={ROUND_SIZE.nav / 2} />
        </View>

        {/* ── Carte : description, anneau (ou ligne en mini), réglages ── */}
        <View style={styles.card}>
          {!isMini && (
            <View style={styles.description}>
              <SkeletonBlock width="72%" height={11} radius={6} />
              <SkeletonBlock width="48%" height={11} radius={6} />
            </View>
          )}
          {isMini ? (
            <SkeletonBlock width="70%" height={44} radius={14} style={styles.miniHero} />
          ) : (
            <SkeletonBlock width={ring} height={ring} radius={ring / 2} style={styles.ring} />
          )}
          {!isMini && (
            <View style={styles.stats}>
              <SkeletonBlock height={64} radius={16} style={styles.stat} />
              <SkeletonBlock height={64} radius={16} style={styles.stat} />
              <SkeletonBlock height={64} radius={16} style={styles.stat} />
            </View>
          )}
        </View>

        {/* ── Bas : points de pagination, bouton Lancer ── */}
        <View style={styles.bottom}>
          {!isMini && (
            <View style={styles.dots}>
              {[0, 1, 2, 3, 4].map((i) => (
                <SkeletonBlock key={i} width={i === 0 ? 22 : 8} height={8} radius={4} />
              ))}
            </View>
          )}
          <SkeletonBlock height={BUTTON_HEIGHT.lg} radius={BUTTON_HEIGHT.lg / 2} />
        </View>
      </SkeletonGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  group: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  description: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  ring: {
    marginBottom: 24,
  },
  miniHero: {
    marginTop: 8,
  },
  stats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 10,
  },
  stat: {
    flex: 1,
    width: undefined,
  },
  bottom: {
    paddingHorizontal: SIDE_GAP,
    paddingBottom: BOTTOM_GAP,
    gap: 18,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
