import React, { memo } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { BODY_OUTLINE, BODY_PARTS, BODY_VIEWBOX } from '../../lib/bodyMapPaths';
import { HIT_CELL, HIT_GRID, HIT_LETTERS } from '../../lib/bodyMapHit';
import { groupOfSlug, hitGroupAt, toViewBoxPoint } from '../../lib/bodyMap';
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
 *
 * Le toucher n'est PAS confié à react-native-svg (ses tests d'appui sur des
 * petites zones ratent souvent, 08/11/2026) : tout le dessin est un seul
 * Pressable, et le groupe touché se lit dans la carte des touchers
 * (lib/bodyMapHit.js, avec tolérance autour des muscles).
 */
function BodyMap({ side = 'front', height, selected = [], onToggle }) {
  const width = height / BODY_RATIO;
  const onPress = (e) => {
    const { locationX, locationY } = e.nativeEvent;
    const p = toViewBoxPoint(BODY_VIEWBOX[side], width, height, locationX, locationY);
    if (!p) return;
    const group = hitGroupAt(HIT_GRID[side], HIT_CELL, HIT_LETTERS, p.x, p.y);
    if (group) onToggle?.(group);
  };
  return (
    <Pressable
      onPress={onPress}
      style={{ width, height }}
      accessibilityRole="button"
      accessibilityLabel={side === 'front' ? 'Corps vu de face' : 'Corps vu de dos'}
    >
      <View pointerEvents="none">
        <Svg width={width} height={height} viewBox={BODY_VIEWBOX[side]}>
          {BODY_PARTS[side].map((part) => {
            const group = groupOfSlug(part.slug);
            const lit = group && selected.includes(group);
            const fill = lit ? getCategory(group).color : group ? MUSCLE_IDLE : NEUTRAL_FILL;
            return (
              <G key={part.slug}>
                {part.d.map((d, i) => (
                  <Path key={i} d={d} fill={fill} stroke={MUSCLE_STROKE} strokeWidth={3} />
                ))}
              </G>
            );
          })}
          <Path d={BODY_OUTLINE[side]} fill="none" stroke={OUTLINE} strokeWidth={4} />
        </Svg>
      </View>
    </Pressable>
  );
}

export default memo(BodyMap);
