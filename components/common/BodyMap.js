import React, { memo } from 'react';
import Svg, { G, Path } from 'react-native-svg';

import { BODY_OUTLINE, BODY_PARTS, BODY_VIEWBOX } from '../../lib/bodyMapPaths';
import { groupOfSlug } from '../../lib/bodyMap';
import { getCategory } from '../../lib/exercises';

// Couleurs du corps au repos : sombres, juste au-dessus du fond de la feuille
// (#0A0A0A), pour que seul ce qui est choisi ressorte. Un muscle se distingue
// un peu de ce qui n'en est pas (tête, mains, pieds, genoux, avant-bras), qui
// n'est pas touchable. Hex opaques uniquement : react-native-svg ignore
// l'alpha d'un rgba() (piège n° 12 de CLAUDE.md).
const MUSCLE_IDLE = '#2C2C37';
const MUSCLE_STROKE = '#0A0A0A';
const NEUTRAL_FILL = '#18181F';
const OUTLINE = '#3A3A46';

const [, , VB_W, VB_H] = BODY_VIEWBOX.front.split(' ').map(Number);
export const BODY_RATIO = VB_H / VB_W;

/**
 * Une silhouette (face ou dos). `selected` = ids de groupes allumés (dans la
 * couleur de leur groupe), `onToggle(groupId)` au toucher d'une zone. Rien
 * d'animé : un simple changement de couleur, la vibration vient de l'appelant.
 */
function BodyMap({ side = 'front', height, selected = [], onToggle }) {
  const width = height / BODY_RATIO;
  return (
    <Svg
      width={width}
      height={height}
      viewBox={BODY_VIEWBOX[side]}
      accessibilityLabel={side === 'front' ? 'Corps vu de face' : 'Corps vu de dos'}
    >
      {BODY_PARTS[side].map((part) => {
        const group = groupOfSlug(part.slug);
        const lit = group && selected.includes(group);
        const fill = lit ? getCategory(group).color : group ? MUSCLE_IDLE : NEUTRAL_FILL;
        const press = group ? () => onToggle?.(group) : undefined;
        // L'appui est posé sur chaque tracé (pas sur le groupe <G>) : c'est le
        // tracé touché qui reçoit l'événement. Ce qui n'est pas un muscle ne
        // capte rien.
        return (
          <G key={part.slug}>
            {part.d.map((d, i) => (
              <Path
                key={i}
                d={d}
                fill={fill}
                stroke={MUSCLE_STROKE}
                strokeWidth={3}
                onPress={press}
                pointerEvents={group ? 'auto' : 'none'}
              />
            ))}
          </G>
        );
      })}
      {/* Contour dessiné PAR-DESSUS les muscles mais transparent au toucher :
          sur Android, react-native-svg teste l'appui sur la surface du tracé
          même sans remplissage (RenderableView.hitTest), le contour avalait
          donc tous les appuis du corps (bug vu sur téléphone le 08/11). */}
      <Path d={BODY_OUTLINE[side]} fill="none" stroke={OUTLINE} strokeWidth={4} pointerEvents="none" />
    </Svg>
  );
}

export default memo(BodyMap);
