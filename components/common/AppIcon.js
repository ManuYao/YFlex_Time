import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

/**
 * Icônes maison de Flex Timer : AUCUN emoji dans l'interface.
 *
 * Un emoji se dessine différemment sur chaque téléphone (et parfois pas du
 * tout) et casse l'identité de l'app. Ici tout est tracé à la main sur une
 * grille de 24, trait de 2, bouts ronds : la même grammaire que
 * BlockRoleIcon (rôles des blocs MIX) et les icônes de PermissionPrimer.
 *
 *   <AppIcon name="crown" size={16} color={tokens.primary} />
 *
 * `color` accepte un hex OU un token rgba(), découpé plus bas en couleur
 * opaque + opacité. Un nom inconnu ne dessine rien (et prévient en dev).
 *
 * Les cinq modes ont chacun leur « cadran » (name = id du mode) : un anneau,
 * comme le TickRing, dont le découpage dessine le rythme du mode.
 *   amrap  : anneau continu fléché, on enchaîne les tours sans coupure
 *   basic  : un secteur plein, le repos minuté qui se décompte
 *   emom   : six segments égaux, une minute chacun
 *   tabata : effort long, repos court (trait, point, trait, point)
 *   mix    : trois blocs de durées différentes
 */

// react-native-svg ignore la composante alpha d'un rgba() passé à `stroke`
// ou `fill` (piège n°13 de CLAUDE.md) : la couleur sortirait pleine. On la
// sépare donc en hex opaque + opacité, pour que les écrans puissent passer
// leurs tokens tels quels ('rgba(10,10,10,0.92)').
export function splitColor(color) {
  if (typeof color !== 'string') return { hex: '#FFFFFF', alpha: 1 };
  const c = color.trim();
  const rgb = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (rgb) {
    const channel = (v) => Math.max(0, Math.min(255, Number(v))).toString(16).padStart(2, '0');
    const alpha = rgb[4] == null ? 1 : Math.max(0, Math.min(1, Number(rgb[4])));
    return { hex: `#${channel(rgb[1])}${channel(rgb[2])}${channel(rgb[3])}`.toUpperCase(), alpha };
  }
  if (/^#[0-9a-f]{8}$/i.test(c)) {
    return { hex: c.slice(0, 7).toUpperCase(), alpha: parseInt(c.slice(7), 16) / 255 };
  }
  if (/^#[0-9a-f]{3}$/i.test(c)) {
    return { hex: `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`.toUpperCase(), alpha: 1 };
  }
  return { hex: c, alpha: 1 };
}

/* ───────────── Géométrie des cadrans de mode ───────────── */

const R = 8.5;
const DIAL_STROKE = 2.2;
// Écart entre deux segments, mesuré sur l'axe du trait : 1,8 px visibles plus
// les deux demi-bouts ronds, sinon les segments se touchent à petite taille.
const GAP_DEG = ((1.8 + DIAL_STROKE) / (2 * Math.PI * R)) * 360;

const round2 = (n) => Math.round(n * 100) / 100;
// Angle en degrés, 0 = midi, sens des aiguilles d'une montre.
const polar = (deg, r = R) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [round2(12 + r * Math.cos(a)), round2(12 + r * Math.sin(a))];
};
const arc = (from, to, r = R) => {
  const [x0, y0] = polar(from, r);
  const [x1, y1] = polar(to, r);
  return `M${x0} ${y0}A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};

const EMOM_PATH = [0, 1, 2, 3, 4, 5]
  .map((k) => arc(60 * k + GAP_DEG / 2, 60 * k + 60 - GAP_DEG / 2))
  .join('');

// Par quart de tour : un trait long (l'effort) puis un point (le repos).
const TABATA_LONG = 90 - 2 * GAP_DEG;
const TABATA_PATH = [0, 1, 2, 3]
  .map((k) => arc(90 * k + GAP_DEG / 2, 90 * k + GAP_DEG / 2 + TABATA_LONG))
  .join('');
const TABATA_DOTS = [0, 1, 2, 3].map((k) => polar(90 * k + 90 - GAP_DEG / 2));

const MIX_PATH = (() => {
  const free = 360 - 3 * GAP_DEG;
  let at = GAP_DEG / 2;
  return [0.45, 0.32, 0.23]
    .map((share) => {
      const from = at;
      at = from + share * free;
      const d = arc(from, at);
      at += GAP_DEG;
      return d;
    })
    .join('');
})();

const BASIC_WEDGE = (() => {
  const r = 5.2;
  const [x0, y0] = polar(0, r);
  const [x1, y1] = polar(120, r);
  return `M12 12L${x0} ${y0}A${r} ${r} 0 0 1 ${x1} ${y1}Z`;
})();

// Flamme (même tracé que l'échauffement de BlockRoleIcon), partagée avec
// StreakFlame qui la colore selon la série.
export const FLAME_OUTER =
  'M12 2.5c.8 3.6 5.5 6 5.5 11.5a5.5 5.5 0 0 1-11 0c0-2.6 1.3-4.5 2.8-5.8.3 2 1.2 3.1 2.4 3.5-.4-3.2-.3-6.2.3-9.2z';
export const FLAME_INNER =
  'M12 19.5a2.3 2.3 0 0 1-2.3-2.3c0-1.3 1-2.2 2.3-3.7 1.3 1.5 2.3 2.4 2.3 3.7a2.3 2.3 0 0 1-2.3 2.3z';

// Médaille miniature : 12 graduations autour d'un cœur, le trophée de l'app.
const MEDAL_TICKS = Array.from({ length: 12 }, (_, i) => [polar(i * 30, 7.3), polar(i * 30, 10.2)]);

const TIER_RINGS = [
  { cx: 6.6, color: '#E8A863' },
  { cx: 17.4, color: '#F7D778' },
  { cx: 12, color: '#E4E7EC' },
];

export const ICON_NAMES = [
  'amrap', 'basic', 'emom', 'tabata', 'mix', 'rest',
  'crown', 'flame', 'sessions', 'clock', 'help', 'trophies', 'medal', 'lock', 'check', 'close',
  'loop', 'pulse', 'dumbbell', 'repeat', 'stopwatch', 'bolt', 'link', 'blocks', 'puzzle',
  'voice', 'sliders', 'voices', 'bandage', 'headphones', 'speaker', 'drop', 'stop', 'progress',
  'infinity', 'no-ads', 'palette',
  'reset', 'play', 'pause', 'finish', 'skip',
  'back', 'plus', 'gear', 'more', 'arrow', 'list',
];

export default function AppIcon({ name, size = 20, color = '#FFFFFF', opacity = 1, strokeWidth, style }) {
  const { hex, alpha } = splitColor(color);
  const op = alpha * opacity;
  const line = {
    stroke: hex,
    strokeOpacity: op,
    strokeWidth: strokeWidth ?? 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  };
  const dial = { ...line, strokeWidth: strokeWidth ?? DIAL_STROKE };
  const solid = { fill: hex, fillOpacity: op };
  // Aplat discret sous un contour : donne du corps à une icône minuscule
  // (la flamme d'une série fait 12 px) sans en faire une silhouette pleine.
  const tint = { fill: hex, fillOpacity: op * 0.2 };
  // Forme pleine aux coins arrondis : même couleur en trait fin autour.
  const rounded = { ...solid, stroke: hex, strokeOpacity: op, strokeWidth: 1.6, strokeLinejoin: 'round' };

  let body;
  switch (name) {
    case 'amrap':
      body = (
        <>
          <Circle {...dial} cx={12} cy={12} r={R} />
          <Path {...dial} d="M10.6 1.3 12.9 3.5 10.6 5.7" />
          <Circle {...solid} cx={12} cy={12} r={1.5} />
        </>
      );
      break;
    case 'basic':
      body = (
        <>
          <Circle {...dial} cx={12} cy={12} r={R} />
          <Path {...solid} d={BASIC_WEDGE} />
        </>
      );
      break;
    case 'emom':
      body = (
        <>
          <Path {...dial} d={EMOM_PATH} />
          <Circle {...solid} cx={12} cy={12} r={1.5} />
        </>
      );
      break;
    case 'tabata':
      body = (
        <>
          <Path {...dial} d={TABATA_PATH} />
          {TABATA_DOTS.map(([x, y]) => (
            <Circle key={`${x}-${y}`} {...solid} cx={x} cy={y} r={DIAL_STROKE / 2} />
          ))}
          <Circle {...solid} cx={12} cy={12} r={1.5} />
        </>
      );
      break;
    case 'mix':
      body = (
        <>
          <Path {...dial} d={MIX_PATH} />
          <Circle {...solid} cx={12} cy={12} r={1.5} />
        </>
      );
      break;
    case 'rest':
      body = <Path {...line} strokeWidth={strokeWidth ?? 2.6} d="M9 6v12M15 6v12" />;
      break;

    case 'crown':
      body = (
        <>
          <Path {...line} {...tint} d="M4.5 17 3 8.5l4.8 3.7L12 6l4.2 6.2L21 8.5 19.5 17z" />
          <Path {...line} d="M5.5 20.5h13" />
        </>
      );
      break;
    case 'flame':
      body = (
        <>
          <Path {...line} {...tint} d={FLAME_OUTER} />
          <Path {...line} d={FLAME_INNER} />
        </>
      );
      break;
    case 'sessions':
      body = (
        <>
          <Circle {...line} cx={12} cy={12} r={9} />
          <Path {...line} d="M8.2 12.4l2.6 2.6 5-5.4" />
        </>
      );
      break;
    case 'clock':
      body = (
        <>
          <Circle {...line} cx={12} cy={12} r={9.5} />
          <Path {...line} d="M12 6.8V12l3.6 2" />
        </>
      );
      break;
    case 'help':
      body = (
        <>
          <Circle {...line} cx={12} cy={12} r={9.5} />
          <Path {...line} d="M9.3 9.4a2.8 2.8 0 0 1 5.4.9c0 1.9-2.7 2.4-2.7 4.1" />
          <Circle {...solid} cx={12} cy={17.4} r={1.2} />
        </>
      );
      break;
    case 'trophies':
      // Les trois paliers enlacés, à leurs couleurs : `color` n'y change rien.
      body = TIER_RINGS.map((ring) => (
        <Circle
          key={ring.cx}
          cx={ring.cx}
          cy={12}
          r={4.6}
          fill="none"
          stroke={ring.color}
          strokeOpacity={opacity}
          strokeWidth={strokeWidth ?? 2}
        />
      ));
      break;
    case 'medal':
      body = (
        <>
          {MEDAL_TICKS.map(([[x1, y1], [x2, y2]]) => (
            <Line key={`${x1}-${y1}`} {...line} strokeWidth={1.7} x1={x1} y1={y1} x2={x2} y2={y2} />
          ))}
          <Circle {...line} {...tint} strokeWidth={1.7} cx={12} cy={12} r={4.3} />
        </>
      );
      break;
    case 'lock':
      body = (
        <>
          <Rect {...line} x={5.5} y={10.5} width={13} height={10} rx={2.5} />
          <Path {...line} d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" />
          <Circle {...solid} cx={12} cy={15.5} r={1.3} />
        </>
      );
      break;
    case 'check':
      body = <Path {...line} d="M5 12.5l4.5 4.5L19 7.5" />;
      break;
    case 'close':
      body = <Path {...line} d="M6.5 6.5l11 11M17.5 6.5l-11 11" />;
      break;

    case 'loop':
      body = <Path {...line} d="M16 5.07A8 8 0 1 1 8 5.07M4.06 4.37 8 5.07 6.63 8.83" />;
      break;
    case 'pulse':
      body = <Path {...line} d="M3 12h3.6l2.1-4.6 3.6 9.2 2.4-6.4 1.5 1.8H21" />;
      break;
    case 'dumbbell':
      body = (
        <>
          <Path {...line} d="M9 12h6M3.5 10v4M20.5 10v4" />
          <Rect {...line} x={6} y={6.5} width={3} height={11} rx={1} />
          <Rect {...line} x={15} y={6.5} width={3} height={11} rx={1} />
        </>
      );
      break;
    case 'repeat':
      body = (
        <Path
          {...line}
          d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H19M16 3l3 3-3 3M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H5M8 21l-3-3 3-3"
        />
      );
      break;
    case 'stopwatch':
      body = (
        <>
          <Circle {...line} cx={12} cy={13.5} r={7.5} />
          <Path {...line} d="M12 13.5V9.5M10 3h4M17.8 7.7l1.4-1.4" />
        </>
      );
      break;
    case 'bolt':
      body = <Path {...line} {...tint} d="M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8z" />;
      break;
    case 'link':
      body = (
        <Path
          {...line}
          d="M10 14a4.24 4.24 0 0 0 6 0l3-3a4.24 4.24 0 0 0-6-6l-1 1M14 10a4.24 4.24 0 0 0-6 0l-3 3a4.24 4.24 0 0 0 6 6l1-1"
        />
      );
      break;
    case 'blocks':
      body = (
        <>
          <Rect {...line} x={4} y={3.5} width={16} height={3.5} rx={1.5} />
          <Rect {...line} x={4} y={10.25} width={10} height={3.5} rx={1.5} />
          <Rect {...line} x={4} y={17} width={13} height={3.5} rx={1.5} />
        </>
      );
      break;
    case 'puzzle':
      body = <Path {...line} d="M4 8h4.2a2.3 2.3 0 1 1 3.6 0H17v4.2a2.3 2.3 0 1 1 0 3.6V20H4z" />;
      break;

    case 'voice':
      body = (
        <>
          <Path
            {...line}
            d="M5 4.5h14A1.5 1.5 0 0 1 20.5 6v9a1.5 1.5 0 0 1-1.5 1.5h-9l-4.5 3.5v-3.5H5A1.5 1.5 0 0 1 3.5 15V6A1.5 1.5 0 0 1 5 4.5z"
          />
          <Path {...line} d="M9 9v3M12 7.8v5.4M15 9v3" />
        </>
      );
      break;
    case 'sliders':
      body = (
        <>
          <Path {...line} d="M4 7h8M16 7h4M4 17h4M12 17h8" />
          <Circle {...line} cx={14} cy={7} r={2} />
          <Circle {...line} cx={10} cy={17} r={2} />
        </>
      );
      break;
    case 'voices':
      body = (
        <>
          <Circle {...line} cx={9} cy={8} r={3.2} />
          <Path {...line} d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
          <Circle {...line} cx={16.5} cy={8.5} r={2.5} />
          <Path {...line} d="M15.3 14.2a4.8 4.8 0 0 1 5.2 5.3" />
        </>
      );
      break;
    case 'bandage':
      body = (
        <>
          <Rect {...line} x={2.8} y={8.2} width={18.4} height={7.6} rx={3.8} transform="rotate(-45 12 12)" />
          <Circle {...solid} cx={10.9} cy={10.9} r={0.95} />
          <Circle {...solid} cx={13.1} cy={10.9} r={0.95} />
          <Circle {...solid} cx={10.9} cy={13.1} r={0.95} />
          <Circle {...solid} cx={13.1} cy={13.1} r={0.95} />
        </>
      );
      break;
    case 'headphones':
      body = (
        <>
          <Path {...line} d="M4 15.5V12a8 8 0 0 1 16 0v3.5" />
          <Rect {...line} x={3} y={14} width={4.2} height={6.5} rx={1.6} />
          <Rect {...line} x={16.8} y={14} width={4.2} height={6.5} rx={1.6} />
        </>
      );
      break;
    case 'speaker':
      body = (
        <>
          <Path {...line} {...tint} d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
          <Path {...line} d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18.3 6.7a7.5 7.5 0 0 1 0 10.6" />
        </>
      );
      break;
    case 'drop':
      body = (
        <>
          <Path {...line} {...tint} d="M12 3.5c3.2 4.2 6 7 6 10.6a6 6 0 0 1-12 0C6 10.5 8.8 7.7 12 3.5z" />
          <Path {...line} d="M9.2 14.4a2.9 2.9 0 0 0 2.4 2.7" />
        </>
      );
      break;
    case 'stop':
      body = (
        <>
          <Circle {...line} cx={12} cy={12} r={9.5} />
          <Rect {...solid} x={8.6} y={8.6} width={6.8} height={6.8} rx={1.4} />
        </>
      );
      break;
    case 'progress':
      body = (
        <>
          <Rect {...line} x={2.5} y={8.5} width={19} height={7} rx={3.5} />
          <Rect {...solid} x={5} y={11} width={8.5} height={2} rx={1} />
        </>
      );
      break;

    case 'infinity':
      body = (
        <Path
          {...line}
          d="M12 12c-2.1-2.7-3.8-4-5.6-4a4 4 0 0 0 0 8c1.8 0 3.5-1.3 5.6-4zm0 0c2.1 2.7 3.8 4 5.6 4a4 4 0 0 0 0-8c-1.8 0-3.5 1.3-5.6 4z"
        />
      );
      break;
    case 'no-ads':
      body = (
        <>
          <Path {...line} d="M4 9.5h3l8-4.5v14l-8-4.5H4z" />
          <Path {...line} d="M3 3l18 18" />
        </>
      );
      break;
    case 'palette':
      body = (
        <>
          <Path
            {...line}
            d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.9-.8 1.9-1.8 0-1.1-1-1.5-1-2.6 0-1 .8-1.7 1.8-1.7h2.2a3.6 3.6 0 0 0 3.6-3.6c0-4.2-3.8-7.3-8.5-7.3z"
          />
          <Circle {...solid} cx={7.6} cy={11.3} r={1.2} />
          <Circle {...solid} cx={9.4} cy={7.6} r={1.2} />
          <Circle {...solid} cx={13.6} cy={6.9} r={1.2} />
          <Circle {...solid} cx={16.6} cy={9.8} r={1.2} />
        </>
      );
      break;

    // Commandes de séance : formes pleines, lisibles d'un coup d'œil en plein effort.
    case 'reset':
      body = <Path {...line} strokeWidth={strokeWidth ?? 2.2} d="M8 5.07A8 8 0 1 0 16 5.07M19.94 4.37 16 5.07 17.37 8.83" />;
      break;
    case 'play':
      body = <Path {...rounded} d="M8.5 5.5v13l10.5-6.5z" />;
      break;
    case 'pause':
      body = (
        <>
          <Rect {...solid} x={6} y={5} width={4.2} height={14} rx={1.4} />
          <Rect {...solid} x={13.8} y={5} width={4.2} height={14} rx={1.4} />
        </>
      );
      break;
    case 'finish':
      body = <Rect {...solid} x={6} y={6} width={12} height={12} rx={2.4} />;
      break;
    case 'skip':
      body = <Path {...rounded} d="M3.5 6.5v11l8-5.5zM12 6.5v11l8-5.5z" />;
      break;

    // Navigation et boutons d'action (système de boutons, lib/buttonTokens.js).
    case 'back':
      body = <Path {...line} strokeWidth={strokeWidth ?? 2.4} d="M14.5 5.5 8 12l6.5 6.5" />;
      break;
    case 'plus':
      body = <Path {...line} strokeWidth={strokeWidth ?? 2.4} d="M12 5.5v13M5.5 12h13" />;
      break;
    // Liste (bibliothèque des mix enregistrés).
    case 'list':
      body = <Path {...line} d="M5 7h14M5 12h14M5 17h9" />;
      break;
    // Flèche « suivant » (tutoriel).
    case 'arrow':
      body = <Path {...line} strokeWidth={strokeWidth ?? 2.4} d="M4.5 12h14M13 6.5l5.5 5.5-5.5 5.5" />;
      break;
    // Menu « ⋮ » (en-tête des blocs du Planning).
    case 'more':
      body = (
        <>
          <Circle {...solid} cx={12} cy={5.5} r={1.8} />
          <Circle {...solid} cx={12} cy={12} r={1.8} />
          <Circle {...solid} cx={12} cy={18.5} r={1.8} />
        </>
      );
      break;
    // Engrenage déjà dessiné à la main dans la barre de l'accueil, rapatrié ici.
    case 'gear':
      body = (
        <>
          <Circle {...line} cx={12} cy={12} r={3} />
          <Path
            {...line}
            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
          />
        </>
      );
      break;

    default:
      if (__DEV__) console.warn(`AppIcon : icône inconnue « ${name} »`);
      return null;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {body}
    </Svg>
  );
}
