import React from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

/**
 * Petites formes de l'ambiance de saison (tracés repris de la maquette « Motifs du fond »).
 *
 * Toutes se dessinent dans un viewBox de 12 x 12 centré sur 0 (« -6 -6 12 12 »), au trait
 * fin comme les icônes de l'app (AppIcon).
 *
 *   leaf     feuille (automne)          flake  flocon (hiver)
 *   petal    pétale (printemps)         mote   point de lumière cerclé (été)
 *   star     étoile à quatre branches   bat    chauve-souris (Halloween, passage rare)
 *   heart    coeur                      ember  braise
 *   dot      petit point
 *
 * Props :
 *   kind         une des formes ci-dessus (une forme inconnue ne dessine rien)
 *   size         côté en dp
 *   ink          couleur du trait (hex)
 *   accent       couleur de remplissage (hex)
 *   strokeWidth  épaisseur du trait, EN UNITÉS DU viewBox (pas en dp) ; par défaut elle
 *                vaut 1,1 dp visuel quelle que soit la taille : 1,1 * 12 / size.
 *
 * ⚠️ react-native-svg ignore l'alpha d'un rgba() : couleurs toujours en hex opaque, la
 * transparence passe par fillOpacity / strokeOpacity.
 */
export const AMBIANCE_SHAPE_KINDS = [
  'leaf',
  'flake',
  'dot',
  'ember',
  'petal',
  'mote',
  'star',
  'bat',
  'heart',
];

function renderKind(kind, ink, accent, sw) {
  switch (kind) {
    case 'leaf':
      return (
        <>
          <Path
            d="M0 -5C3.4 -3 4.2 1.8 0 5C-4.2 1.8 -3.4 -3 0 -5Z"
            fill={accent}
            fillOpacity={0.28}
            stroke={ink}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path
            d="M0 -3.4L0 5.6"
            fill="none"
            stroke={ink}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeOpacity={0.6}
          />
        </>
      );
    case 'flake':
      return (
        <Path
          d="M-4.6 0L4.6 0M-2.3 -4L2.3 4M-2.3 4L2.3 -4"
          fill="none"
          stroke={ink}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      );
    case 'dot':
      return <Circle r={1.7} fill={ink} fillOpacity={0.8} />;
    case 'ember':
      return (
        <>
          <Circle r={2.2} fill={accent} fillOpacity={0.9} />
          <Circle r={4.4} fill={accent} fillOpacity={0.18} />
        </>
      );
    case 'petal':
      return (
        <Ellipse
          rx={2.6}
          ry={4.4}
          fill={accent}
          fillOpacity={0.32}
          stroke={ink}
          strokeWidth={sw}
        />
      );
    case 'mote':
      return (
        <>
          <Circle r={2.6} fill={accent} fillOpacity={0.6} />
          <Circle
            r={4.8}
            fill="none"
            stroke={accent}
            strokeOpacity={0.55}
            strokeWidth={sw}
          />
        </>
      );
    case 'star':
      return (
        <Path
          d="M0 -5.2Q0.7 -0.7 5.2 0Q0.7 0.7 0 5.2Q-0.7 0.7 -5.2 0Q-0.7 -0.7 0 -5.2Z"
          fill={accent}
          fillOpacity={0.6}
          stroke={ink}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      );
    case 'bat':
      // Tracé dessiné en grand (±30) puis réduit pour tenir dans le viewBox de 12.
      return (
        <G scale={0.19}>
          <Path
            d="M0 -6C3 -10 6 -10 8 -6C14 -12 22 -12 30 -6C26 -4 25 0 26 6C22 2 18 3 16 8C13 4 9 5 8 10C6 6 2 6 0 12C-2 6 -6 6 -8 10C-9 5 -13 4 -16 8C-18 3 -22 2 -26 6C-25 0 -26 -4 -30 -6C-22 -12 -14 -12 -8 -6C-6 -10 -3 -10 0 -6Z"
            fill={ink}
            fillOpacity={0.88}
          />
          <Path d="M-6 -7L-4 -15L0 -9L4 -15L6 -7Z" fill={ink} fillOpacity={0.88} />
        </G>
      );
    case 'heart':
      return (
        <Path
          d="M0 -1.2C-0.6 -3.2 -4.2 -3 -4.2 -0.2C-4.2 1.8 -1.2 3.5 0 4.7C1.2 3.5 4.2 1.8 4.2 -0.2C4.2 -3 0.6 -3.2 0 -1.2Z"
          fill={accent}
          fillOpacity={0.38}
          stroke={ink}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      );
    default:
      return null;
  }
}

function AmbianceShape({ kind, size = 14, ink = '#FFFFFF', accent = '#FFFFFF', strokeWidth }) {
  // 1,1 dp visuels quelle que soit la taille (le viewBox fait 12 unités de large).
  const sw = strokeWidth ?? Math.round(((1.1 * 12) / size) * 100) / 100;
  return (
    <Svg width={size} height={size} viewBox="-6 -6 12 12">
      {renderKind(kind, ink, accent, sw)}
    </Svg>
  );
}

// Mémoïsé : un motif ne se redessine jamais tant que ses props ne changent pas (il bouge
// par transform sur le fil d'interface, pas par re-rendu).
export default React.memo(AmbianceShape);
