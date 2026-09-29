import React from 'react';
import { StyleSheet, View } from 'react-native';

import AppIcon from './AppIcon';
import PressTap from './PressTap';
import { haptic } from '../../hooks/useHaptic';

// Jaune de TABATA : aucune couleur inventée, et lisible sur fond sombre.
export const STAR_ON = '#FFC933';
const STAR_OFF = 'rgba(255,255,255,0.28)';

/**
 * Cinq étoiles.
 *  - Affichage seul (défaut) : `value` = note moyenne, arrondie à l'étoile.
 *  - Interactif : `onRate(n)` fourni → chaque étoile est un bouton (toucher =
 *    donner cette note ; `value` = ma note actuelle, 0 si pas encore notée).
 */
export default function StarRating({ value = 0, size = 16, gap = 3, onRate, disabled = false }) {
  const filled = Math.round(value);
  const interactive = !!onRate && !disabled;

  return (
    <View style={[styles.row, { gap }]}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= filled;
        const icon = (
          <AppIcon name={on ? 'star-fill' : 'star'} size={size} color={on ? STAR_ON : STAR_OFF} />
        );
        if (!interactive) return <View key={n}>{icon}</View>;
        return (
          <PressTap
            key={n}
            tapScale={0.8}
            hitSlop={6}
            onHapticIn={haptic.selection}
            onPress={() => onRate(n)}
            accessibilityLabel={`Noter ${n} sur 5`}
          >
            {icon}
          </PressTap>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
