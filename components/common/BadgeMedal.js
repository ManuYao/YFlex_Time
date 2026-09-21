import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { fonts } from '../../lib/fonts';
import { BADGE_TIERS, BADGE_THRESHOLDS } from '../../lib/badges';

// Même grammaire que TickRing : 60 graduations, une sur cinq plus longue.
// Le trophée est donc l'anneau de l'app, pas une médaille générique — et les
// graduations allumées encodent le palier (un tiers, deux tiers, complet),
// donc la forme dit déjà lequel on regarde avant même de lire le chiffre.
const TICKS = 60;

// ⚠️ Couleurs en hexadécimal OPAQUE uniquement, jamais en `rgba()` :
// react-native-svg ignore la composante alpha d'un rgba() passé à `stopColor`
// ou `stroke` et rend la couleur pleine. Un palier verrouillé décrit en
// rgba(255,255,255,0.06) s'affichait donc en disque BLANC PLEIN. La
// transparence passe par `stopOpacity` / `strokeOpacity`, séparément.
export const TIER_PALETTE = {
  bronze: { base: '#CD7F32', hi: '#E8A863', fill: 1 / 3 },
  argent: { base: '#9BA3AE', hi: '#E4E7EC', fill: 2 / 3 },
  or: { base: '#D9A521', hi: '#F7D778', fill: 1 },
};

const LOCKED = { base: '#15151A', hi: '#3A3A44', fill: 0 };
const TICK_OFF = '#FFFFFF';
const TICK_OFF_OPACITY = 0.14;

export const tierThreshold = (timerId, tierKey) => {
  const i = BADGE_TIERS.findIndex((t) => t.key === tierKey);
  return (BADGE_THRESHOLDS[timerId] || BADGE_THRESHOLDS.amrap)[i];
};

export default function BadgeMedal({
  tier,
  size = 96,
  locked = false,
  value,
  timerId,
  // Fraction de la boite occupee par l'anneau. < 1 laisse une marge autour,
  // pour que la couronne de rayons de la celebration tienne dans la MEME
  // boite que la medaille : deux vues superposees de dimensions identiques
  // partagent forcement leur centre, alors que deux boites de tailles
  // differentes se decalent des que l'une est centree par le parent.
  ringRatio = 1,
  glow = false,
  // Part du chemin parcouru vers CE palier (0→1), fournie par
  // getBadgeProgress. Absente, l'anneau retombe sur son état figé.
  progress,
}) {
  const tierPalette = TIER_PALETTE[tier] || TIER_PALETTE.bronze;
  const palette = locked ? LOCKED : tierPalette;
  const c = size / 2;
  const ring = size * ringRatio;
  const outer = ring / 2 - ring * 0.033;
  const coreR = ring * 0.283;
  // Chaque palier a son niveau de remplissage caractéristique (`fill` : un
  // tiers, deux tiers, complet) et `progress` dit où on en est VERS lui. Sans
  // cette multiplication, trois paliers acquis rempliraient tous l'anneau à
  // 100 % et deviendraient indiscernables.
  const ratio = tierPalette.fill * (progress != null ? Math.max(0, Math.min(1, progress)) : 1);
  const active = Math.round(TICKS * ratio);
  // Un palier en cours garde ses graduations à SA couleur : voir l'anneau de
  // l'or se remplir en doré motive plus qu'un gris uniforme.
  const tickOn = locked ? tierPalette.hi : palette.hi;
  const started = active > 0;
  const gradId = `badge-${tier}-${locked ? 'off' : 'on'}`;
  const glowId = `${gradId}-glow`;

  const label = value ?? (timerId ? tierThreshold(timerId, tier) : null);

  const ticks = [];
  for (let i = 0; i < TICKS; i++) {
    const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
    const major = i % 5 === 0;
    const inner = outer - ring * (major ? 0.108 : 0.075);
    ticks.push(
      <Line
        key={i}
        x1={c + Math.cos(a) * inner}
        y1={c + Math.sin(a) * inner}
        x2={c + Math.cos(a) * outer}
        y2={c + Math.sin(a) * outer}
        stroke={i < active ? tickOn : TICK_OFF}
        strokeOpacity={i < active ? 1 : TICK_OFF_OPACITY}
        strokeWidth={ring * (major ? 0.025 : 0.015)}
        strokeLinecap="round"
      />
    );
  }

  return (
    // `overflow: 'hidden'` est une ceinture de sécurité, pas de la décoration :
    // quoi qu'il arrive au texte (police custom aux métriques inattendues,
    // libellé plus long que prévu), il ne peut plus s'écrire PAR-DESSUS le
    // libellé du palier rendu sous la médaille. Le SVG, lui, tient déjà
    // entièrement dans size × size.
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.hi} stopOpacity={1} />
            <Stop offset="1" stopColor={palette.base} stopOpacity={1} />
          </LinearGradient>
          {glow && (
            <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={palette.hi} stopOpacity={0.32} />
              <Stop offset="0.55" stopColor={palette.base} stopOpacity={0.12} />
              <Stop offset="1" stopColor={palette.base} stopOpacity={0} />
            </RadialGradient>
          )}
        </Defs>
        {glow && <Circle cx={c} cy={c} r={c} fill={`url(#${glowId})`} />}
        {ticks}
        {/* Verrouillé : aplat sombre NEUTRE plutôt que le dégradé du palier.
            La feuille laisse voir le fond coloré du mode, et un cœur
            translucide en prenait la teinte — sur AMRAP le badge virait au
            rouge sombre et se confondait avec l'arrière-plan. */}
        <Circle
          cx={c}
          cy={c}
          r={coreR}
          fill={locked ? '#0A0A0A' : `url(#${gradId})`}
          fillOpacity={locked ? 0.62 : 1}
        />
        <Circle
          cx={c}
          cy={c}
          r={coreR}
          fill="none"
          stroke={palette.hi}
          strokeWidth={ring * 0.018}
          strokeDasharray={locked ? `${ring * 0.05},${ring * 0.04}` : undefined}
        />
        {locked && !started && (
          // Anse de cadenas : un verrou dessiné, pas l'emoji 🔒 dont le rendu
          // change d'un téléphone à l'autre.
          <Path
            d={`M ${c - ring * 0.07} ${c - ring * 0.01}
                v ${-ring * 0.06}
                a ${ring * 0.07} ${ring * 0.07} 0 0 1 ${ring * 0.14} 0
                v ${ring * 0.06}`}
            fill="none"
            stroke={palette.hi}
            strokeWidth={ring * 0.028}
            strokeLinecap="round"
          />
        )}
      </Svg>

      {(!locked || started) && label != null && (
        // Chiffre en <Text> natif plutôt qu'en <Text> SVG : Anton est chargée
        // par expo-font et react-native-svg ne la résout pas de façon fiable.
        <View style={styles.center} pointerEvents="none">
          <Text
            style={[
              styles.value,
              { fontSize: ring * 0.26, color: locked ? tierPalette.hi : '#0A0A0A' },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Centrage par flexbox, pas par `textAlignVertical` (Android seulement, et
  // capricieux avec une police custom). Et surtout PAS
  // d'`adjustsFontSizeToFit` : sur Android il fait DÉBORDER le texte de sa
  // boîte au lieu de le réduire — le seuil se retrouvait écrit par-dessus le
  // libellé du palier, sous la médaille.
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: fonts.display,
    includeFontPadding: false,
    textAlign: 'center',
  },
});
