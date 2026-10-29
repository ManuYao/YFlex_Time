import React from 'react';
import { View } from 'react-native';

import { cleanMixColor } from '../../lib/mixMeta';

/**
 * Petite barre du code couleur d'un MIX (lib/mixMeta.js) : posée à côté du nom
 * sur les cartes du fil, dans le partage et dans l'aperçu d'un mix reçu. Rien
 * n'est dessiné sans couleur valide.
 */
export default function MixColorBar({ color, height = 16, style }) {
  const c = cleanMixColor(color);
  if (!c) return null;
  return (
    <View
      pointerEvents="none"
      style={[{ width: 4, height, borderRadius: 2, backgroundColor: c }, style]}
    />
  );
}
