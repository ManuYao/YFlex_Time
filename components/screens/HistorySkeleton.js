import React from 'react';
import { View, StyleSheet } from 'react-native';

import { SkeletonGroup, SkeletonBlock } from '../common/Skeleton';

// Hauteur d'une carte de séance (SessionRow : 14 de marge + icône 44 + 14).
const ROW_H = 72;

/**
 * Squelette de la liste de l'Historique, montré à la place du message « Aucune
 * séance » tant que l'historique n'est pas lu : un jour (sa date), puis trois
 * cartes de séance. Se pose dans la zone de défilement de HistoryPage, donc dans
 * les mêmes marges que la vraie liste.
 */
export default function HistorySkeleton() {
  return (
    <SkeletonGroup>
      {[3, 2].map((count, g) => (
        <View key={g} style={styles.group}>
          <View style={styles.label}>
            <SkeletonBlock width={g === 0 ? 96 : 70} height={10} radius={5} />
          </View>
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonBlock key={i} height={ROW_H} radius={18} style={styles.row} />
          ))}
        </View>
      ))}
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: 24,
  },
  // Même hauteur que le libellé de jour réel (10 px de texte + 10 de marge).
  label: {
    height: 24,
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  row: {
    marginBottom: 10,
  },
});
