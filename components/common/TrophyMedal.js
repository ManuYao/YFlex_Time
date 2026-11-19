import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import AppIcon from './AppIcon';
import BadgeMedal from './BadgeMedal';
import { TICKS, buildTickPaths, orEmpty, shadeHex } from '../../lib/medalGeometry';

// Médaille d'un EXPLOIT ou d'un SECRET (trophées v2, 18.16.0). Même anneau à 60 graduations
// que les paliers (components/common/BadgeMedal.js), seul le centre change :
//   - exploit : l'icône dit ce qu'on a fait, la couleur dit d'où il vient (couleur du mode,
//     du jeu, de la saison…) ; plusieurs couleurs = l'anneau se partage entre elles ;
//     un fin cercle entoure la médaille
//   - secret  : un « ? » et un halo en pointillés tant qu'il n'est pas trouvé, aucun indice ;
//     trouvé, il devient une médaille porcelaine à son icône
// Un exploit pas encore gagné reste lisible (icône à sa couleur, cadenas), comme un palier
// verrouillé : c'est l'objectif, pas un trou noir.
//
// ⚠️ Couleurs en hexadécimal OPAQUE seulement (react-native-svg ignore l'alpha d'un rgba()).
const WHITE = '#FFFFFF';
const PORCELAIN = ['#FFFFFF', '#D6D6DC'];
const TICK_OFF = '#FFFFFF';

function TrophyMedal({
  kind = 'unique',
  size = 64,
  locked = false,
  // Part du chemin parcouru (0 à 1) : les graduations allumées d'un exploit qui avance.
  progress = 0,
  icon = 'bolt',
  colors = [WHITE],
  // Secret : trouvé ou pas.
  revealed = true,
  glow = false,
  // Fraction de la boîte occupée par l'anneau (voir BadgeMedal) : < 1 laisse la place de la
  // couronne de rayons de l'annonce.
  ringRatio = 1,
}) {
  const hidden = kind === 'secret' && !revealed;
  const isSecret = kind === 'secret';
  const list = (Array.isArray(colors) && colors.length ? colors : [WHITE]).slice(0, 5);
  const multi = list.length > 1;
  const main = multi ? WHITE : list[0];
  const porcelain = multi || isSecret || main.toUpperCase() === WHITE;
  const [coreA, coreB] = porcelain ? PORCELAIN : [main, shadeHex(main, 0.3)];

  const c = size / 2;
  const ring = size * ringRatio;
  const outer = ring / 2 - ring * 0.033;
  const coreR = ring * 0.283;
  const dark = locked || hidden;
  const dashed = locked || hidden;

  const active = hidden ? 0 : locked ? Math.round(TICKS * Math.max(0, Math.min(1, progress))) : TICKS;
  const ticks = useMemo(
    () => buildTickPaths({ c, outer, ring, active, slots: hidden ? 1 : list.length }),
    // `list` change de référence à chaque rendu : la clé de couleurs suffit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [c, outer, ring, active, hidden, list.join('|')]
  );
  const offMinorOpacity = hidden ? 0.13 : 0.24;
  const offMajorOpacity = hidden ? 0.26 : 0.45;

  const gid = `trophy-${coreA.slice(1)}-${coreB.slice(1)}`;
  const glowId = `${gid}-glow`;

  // Fin cercle autour de la médaille (au-delà des graduations). Secret : des points.
  const bezelDots = isSecret;
  const bezelOpacity = hidden ? 0.4 : isSecret ? 0.75 : locked ? 0.2 : 0.55;

  // Fermoir-cadenas d'un exploit verrouillé (le secret caché n'en a pas : il a son « ? »).
  const showClasp = locked && !hidden;
  const claspR = ring * 0.115;
  const claspY = c + ring * 0.285;
  const lockScale = claspR / 12;

  // Icône au centre.
  let iconName = icon;
  let iconColor = '#0A0A0A';
  let iconOpacity = 1;
  let iconSize = ring * 0.36;
  let lift = 0;
  if (hidden) {
    iconName = 'question';
    iconColor = WHITE;
    iconOpacity = 0.85;
    iconSize = ring * 0.42;
  } else if (locked) {
    iconColor = main;
    iconOpacity = 0.95;
    iconSize = ring * 0.3;
    lift = ring * 0.075;
  }

  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={coreA} stopOpacity={1} />
            <Stop offset="1" stopColor={coreB} stopOpacity={1} />
          </LinearGradient>
          {glow && (
            <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={coreA} stopOpacity={0.32} />
              <Stop offset="0.55" stopColor={coreB} stopOpacity={0.12} />
              <Stop offset="1" stopColor={coreB} stopOpacity={0} />
            </RadialGradient>
          )}
        </Defs>
        {glow && <Circle cx={c} cy={c} r={c} fill={`url(#${glowId})`} />}

        <Path
          d={orEmpty(ticks.off.minor)}
          fill="none"
          stroke={TICK_OFF}
          strokeOpacity={offMinorOpacity}
          strokeWidth={ring * 0.015}
          strokeLinecap="round"
        />
        <Path
          d={orEmpty(ticks.off.major)}
          fill="none"
          stroke={TICK_OFF}
          strokeOpacity={offMajorOpacity}
          strokeWidth={ring * 0.025}
          strokeLinecap="round"
        />
        {ticks.lit.map((slot, i) => {
          const color = list[i] || main;
          return (
            <React.Fragment key={i}>
              <Path d={orEmpty(slot.minor)} fill="none" stroke={color} strokeWidth={ring * 0.015} strokeLinecap="round" />
              <Path d={orEmpty(slot.major)} fill="none" stroke={color} strokeWidth={ring * 0.025} strokeLinecap="round" />
            </React.Fragment>
          );
        })}

        <Circle
          cx={c}
          cy={c}
          r={ring * 0.493}
          fill="none"
          stroke={main}
          strokeOpacity={bezelOpacity}
          strokeWidth={ring * (bezelDots ? 0.014 : 0.009)}
          strokeDasharray={bezelDots ? `0.01,${ring * 0.032}` : undefined}
          strokeLinecap="round"
        />

        <Circle
          cx={c}
          cy={c}
          r={coreR}
          fill={dark ? '#000000' : `url(#${gid})`}
          fillOpacity={hidden ? 0.55 : locked ? 0.45 : 1}
        />
        <Circle
          cx={c}
          cy={c}
          r={coreR}
          fill="none"
          stroke={main}
          strokeOpacity={hidden ? 0.45 : locked ? 0.9 : 1}
          strokeWidth={ring * 0.018}
          strokeDasharray={dashed ? `${ring * 0.05},${ring * 0.04}` : undefined}
        />

        {showClasp && (
          <>
            <Circle
              cx={c}
              cy={claspY}
              r={claspR}
              fill="#FFFFFF"
              stroke="#000000"
              strokeOpacity={0.25}
              strokeWidth={ring * 0.012}
            />
            <G transform={`translate(${c - 12 * lockScale} ${claspY - 12 * lockScale}) scale(${lockScale})`}>
              <Rect x={6.5} y={10.5} width={11} height={9} rx={2.2} fill="#0A0A0A" />
              <Path
                d="M9 10.5V8.3a3 3 0 0 1 6 0v2.2"
                fill="none"
                stroke="#0A0A0A"
                strokeWidth={2.4}
                strokeLinecap="round"
              />
            </G>
          </>
        )}
      </Svg>

      <View style={[styles.center, lift ? { paddingBottom: lift } : null]} pointerEvents="none">
        <AppIcon
          name={iconName}
          size={Math.max(8, Math.round(iconSize))}
          color={iconColor}
          opacity={iconOpacity}
          strokeWidth={hidden ? 2.6 : undefined}
        />
      </View>
    </View>
  );
}

export default React.memo(TrophyMedal);

/**
 * La médaille qui correspond à un trophée évalué (lib/trophies.js) : pour un trophée à
 * paliers, celle du palier `tierIndex` ; sinon la médaille de l'exploit ou du secret.
 */
function TrophyStateMedalBase({ state, tierIndex = 0, size, glow = false, ringRatio = 1 }) {
  if (!state) return null;
  if (state.kind === 'tier') {
    const tier = state.tiers[Math.max(0, Math.min(state.tiers.length - 1, tierIndex))];
    return (
      <BadgeMedal
        tier={tier.key}
        size={size}
        locked={!tier.unlocked}
        progress={tier.progress}
        value={tier.short}
        glow={glow}
        ringRatio={ringRatio}
      />
    );
  }
  return (
    <TrophyMedal
      kind={state.kind}
      size={size}
      locked={!state.unlocked}
      progress={state.progress}
      icon={state.def.icon}
      colors={state.def.colors}
      revealed={state.unlocked}
      glow={glow}
      ringRatio={ringRatio}
    />
  );
}
export const TrophyStateMedal = React.memo(TrophyStateMedalBase);

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
