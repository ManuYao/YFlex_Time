import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

import DotsLoader from './DotsLoader';
import { fonts } from '../../lib/fonts';

// Fond des animations : elles sont rendues sur ce noir exact (atelier
// d'animation, build_webp.mjs) pour rester légères (~100 Ko) ; la carte doit
// avoir le MÊME fond, sinon un cadre plus clair ou plus sombre apparaît.
export const ANIMATION_BG = '#0A0A0A';

/**
 * Image animée d'un exercice (WebP en boucle), dans une carte arrondie à ses
 * proportions. `uri` absente : la carte garde sa place avec des points de
 * chargement (pas de saut de mise en page à l'arrivée du fichier).
 * `paused` arrête l'animation (feuille repliée, écran quitté). `failed` : le
 * fichier n'a pas pu arriver (première fois sans réseau) → un mot l'explique
 * au lieu de points qui tourneraient sans fin.
 */
function ExerciseAnimation({ entry, uri, paused = false, failed = false, maxHeight = 220, label }) {
  if (!entry) return null;
  return (
    <View style={[styles.frame, { aspectRatio: entry.width / entry.height, maxHeight }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          autoplay={!paused}
          transition={180}
          accessibilityLabel={label ? `Animation : ${label}` : 'Animation de l’exercice'}
        />
      ) : failed ? (
        <View style={styles.loading}>
          <Text style={styles.failed}>Animation indisponible sans connexion pour l’instant.</Text>
        </View>
      ) : (
        <View style={styles.loading}>
          <DotsLoader color="rgba(255,255,255,0.45)" size={5} />
        </View>
      )}
    </View>
  );
}

export default memo(ExerciseAnimation);

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: ANIMATION_BG,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  failed: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.45)',
  },
});
