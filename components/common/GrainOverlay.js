import React from 'react';

// GRAIN DÉSACTIVÉ — à réactiver une fois la mise en page stabilisée.
//
// Historique : le grain était produit par un filtre SVG <FeTurbulence>, que
// react-native-svg n'implémente pas sur natif. Le <Rect> s'affichait donc avec
// son fill brut, soit un aplat opaque plein écran.
// La reprise en <Image resizeMode="repeat"> + tintColor ne tuile pas
// correctement sur Android : une tuile unique apparaissait en bas à droite.
// Piste pour plus tard : deux PNG pré-teintés (blanc / noir) sans tintColor,
// ou un shader via @shopify/react-native-skia.
export default function GrainOverlay() {
  return null;
}
