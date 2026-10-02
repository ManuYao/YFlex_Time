import React from 'react';
import Svg, { Rect } from 'react-native-svg';

/**
 * Emplacement RÉSERVÉ au futur QR code des cartes de partage (renvoi vers
 * l'app). Aujourd'hui c'est un cadre en pointillés avec les trois repères
 * d'angle d'un QR code : il garde la place dans la mise en page, pour qu'ajouter
 * le vrai code plus tard ne décale rien.
 *
 * Le jour où une bibliothèque de QR code sera installée, c'est ici (et
 * seulement ici) qu'il faudra l'encoder : `value` = le lien à encoder. Pas de
 * bibliothèque ajoutée pour l'instant, donc pas de changement natif.
 *
 * Blanc translucide uniquement (fillOpacity / strokeOpacity, jamais de rgba()
 * dans react-native-svg : piège n°13).
 */
export default function QrSlot({ size = 48, value = null }) {
  // eslint-disable-next-line no-unused-vars
  const _future = value;
  const pad = size * 0.06;
  const finder = size * 0.28;
  const stroke = Math.max(1, size * 0.035);
  const innerPad = finder * 0.28;
  const white = '#FFFFFF';

  const Finder = ({ x, y }) => (
    <>
      <Rect
        x={x}
        y={y}
        width={finder}
        height={finder}
        rx={finder * 0.18}
        fill="none"
        stroke={white}
        strokeOpacity={0.55}
        strokeWidth={stroke}
      />
      <Rect
        x={x + innerPad + stroke}
        y={y + innerPad + stroke}
        width={finder - 2 * (innerPad + stroke)}
        height={finder - 2 * (innerPad + stroke)}
        rx={1}
        fill={white}
        fillOpacity={0.55}
      />
    </>
  );

  const near = pad + stroke;
  const far = size - pad - stroke - finder;
  const dot = size * 0.07;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect
        x={stroke / 2}
        y={stroke / 2}
        width={size - stroke}
        height={size - stroke}
        rx={size * 0.12}
        fill="none"
        stroke={white}
        strokeOpacity={0.35}
        strokeWidth={stroke}
        strokeDasharray={[size * 0.07, size * 0.05]}
      />
      <Finder x={near} y={near} />
      <Finder x={far} y={near} />
      <Finder x={near} y={far} />
      <Rect x={size * 0.56} y={size * 0.56} width={dot} height={dot} fill={white} fillOpacity={0.4} />
      <Rect x={size * 0.7} y={size * 0.7} width={dot} height={dot} fill={white} fillOpacity={0.4} />
      <Rect x={size * 0.56} y={size * 0.76} width={dot} height={dot} fill={white} fillOpacity={0.4} />
      <Rect x={size * 0.78} y={size * 0.56} width={dot} height={dot} fill={white} fillOpacity={0.4} />
    </Svg>
  );
}
