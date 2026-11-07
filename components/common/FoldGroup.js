import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import PressTap from './PressTap';
import AppIcon from './AppIcon';
import BarChart from './BarChart';
import TickRing from './TickRing';
import { fonts } from '../../lib/fonts';
import { withAlpha } from '../../lib/phase-colors';
import { haptic } from '../../hooks/useHaptic';

/**
 * Grand groupe de statistiques (« Tes séances », « Tes jeux »), plié au départ.
 * Il range des petits groupes (`FoldPanel foldable`) qui se déplient à leur tour.
 *
 * Plié, c'est une GRANDE carte qui se partage la page avec ses voisines (sinon deux
 * petites rangées laissent un gros vide) : le chiffre clé en grand, un petit
 * graphique, trois repères, et un anneau de graduations en filigrane (la signature
 * de l'app). Ouvert, elle se réduit à son en-tête et les petits groupes apparaissent
 * en dessous, décalés derrière un trait fin qui dit qu'ils lui appartiennent. Le
 * contenu n'est construit qu'à l'ouverture, et l'anneau + le graphique seulement tant
 * que la carte est pliée.
 *
 *  - `accent` : la couleur du groupe (cadre, icône, graphique, anneau).
 *  - `hero` { value, label, ring 0..1, bars [], tiles [{label,value}], dots [couleurs] }
 *    : ce que montre la grande carte pliée. Sans `hero`, une simple rangée.
 */
export default function FoldGroup({ icon, title, subtitle, accent = '#FFFFFF', hero = null, children }) {
  const [open, setOpen] = useState(false);
  const showHero = !open && !!hero;

  const toggle = () => {
    haptic.selection();
    setOpen((v) => !v);
  };

  return (
    <View style={showHero ? styles.rootClosed : null}>
      <PressTap
        onPress={toggle}
        tapScale={0.99}
        accessibilityLabel={`${title}, ${open ? 'replier' : 'déplier'}`}
        containerStyle={showHero ? styles.fill : null}
        style={showHero ? styles.fill : null}
      >
        {showHero ? (
          <Hero icon={icon} title={title} subtitle={subtitle} accent={accent} hero={hero} />
        ) : (
          <View style={[styles.head, { borderColor: withAlpha(accent, 0.3), backgroundColor: withAlpha(accent, 0.08) }]}>
            <View style={[styles.iconWrap, { backgroundColor: withAlpha(accent, 0.16) }]}>
              <AppIcon name={icon} size={18} color={accent} />
            </View>
            <View style={styles.headText}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={2}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {hero ? (
              <View style={styles.right}>
                <Text style={styles.rightLabel}>{hero.label}</Text>
                <Text style={styles.rightValue} numberOfLines={1}>
                  {hero.value}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.chevron, open ? styles.chevronOpen : styles.chevronClosed]}>›</Text>
          </View>
        )}
      </PressTap>
      {open ? (
        <Animated.View entering={FadeIn.duration(240)} style={styles.children}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

// Diamètre de l'anneau en filigrane (dp), et part maximale de ses 60 graduations
// allumées (0,07 = 4 traits, depuis midi).
const RING_SIZE = 200;
const RING_LIT_MAX = 0.07;

// Fond PLEIN des trois repères du bas (accent très dilué sur le fond sombre). Il doit
// être opaque : un fond translucide laisse voir l'anneau de graduations qui passe
// derrière, et ses traits se mettaient à traverser les textes des repères.
function solidTileBg(accent) {
  const m = /^#?([0-9a-f]{6})$/i.exec(accent);
  if (!m) return '#1A1A1A';
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(10 + c * 0.04 + 255 * 0.03));
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}

// Hauteur du milieu des chiffres, mesurée une fois sur le téléphone (elle ne dépend
// que de la police) : les cartes qu'on replie puis rouvre n'attendent plus la mesure.
let measuredDigitMid = null;

// La grande carte pliée.
function Hero({ icon, title, subtitle, accent, hero }) {
  const { value, label, ring = 0, bars = [], tiles = [], dots = [] } = hero;
  const [digitMid, setDigitMid] = useState(measuredDigitMid);
  const tileBg = solidTileBg(accent);
  // Seules quelques graduations s'allument, en partant de midi : c'est le trait un peu
  // plus clair en haut de l'anneau. Un anneau entièrement allumé (la période en cours
  // égale ton meilleur résultat) devenait le premier élément de la carte, alors que ce
  // n'est qu'un filigrane : on plafonne, pour que tous les anneaux se ressemblent.
  const ringLit = Math.min(Math.max(ring, 0), RING_LIT_MAX);

  // Où se trouve le MILIEU des chiffres dans la boîte du texte ? Cela dépend de la
  // police (le vide sous les chiffres, pour les jambages, n'est pas le même partout) :
  // on le lit dans la mise en page réelle du texte (haut des chiffres = ligne de base
  // moins la hauteur des capitales) plutôt que de le deviner.
  const onDigitsLayout = (e) => {
    const line = e.nativeEvent?.lines?.[0];
    if (!line) return;
    const mid = line.y + line.ascender - line.capHeight / 2;
    if (!Number.isFinite(mid) || mid <= 0) return;
    measuredDigitMid = mid;
    setDigitMid((prev) => (prev !== null && Math.abs(prev - mid) < 0.5 ? prev : mid));
  };
  return (
    <View style={[styles.hero, { borderColor: withAlpha(accent, 0.34), backgroundColor: withAlpha(accent, 0.07) }]}>
      {/* Anneau de graduations en filigrane, rogné dans le coin. */}
      <View style={styles.ring} pointerEvents="none">
        <TickRing progress={ringLit} size={RING_SIZE} colorActive={withAlpha(accent, 0.5)} colorInactive="rgba(255,255,255,0.07)" />
      </View>

      <View style={styles.heroHead}>
        <View style={[styles.iconWrap, { backgroundColor: withAlpha(accent, 0.18) }]}>
          <AppIcon name={icon} size={20} color={accent} />
        </View>
        <View style={styles.headText}>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={[styles.openChip, { backgroundColor: withAlpha(accent, 0.18) }]}>
          <Text style={[styles.openChevron, { color: accent }]}>›</Text>
        </View>
      </View>

      <View>
        <View style={styles.bigRow}>
          <Text style={styles.bigValue} numberOfLines={1} onTextLayout={onDigitsLayout}>
            {value}
          </Text>
          {/* Le libellé (et les points) est centré sur les CHIFFRES, pas sur la boîte du texte :
              une boîte deux fois plus haute que le milieu des chiffres, contenu centré dedans. */}
          <View style={[styles.bigSide, digitMid === null ? styles.bigSideWait : { height: digitMid * 2 }]}>
            <Text style={styles.bigLabel}>{label}</Text>
            {dots.length > 0 ? (
              <View style={styles.dots}>
                {dots.map((c) => (
                  <View key={c} style={[styles.dot, { backgroundColor: c }]} />
                ))}
              </View>
            ) : null}
          </View>
        </View>
        {bars.length > 0 ? (
          <View style={styles.bars}>
            <BarChart data={bars} height={52} color={accent} showValue={false} maxBarWidth={16} dimOpacity={0.3} />
          </View>
        ) : null}
      </View>

      <View style={styles.tiles}>
        {tiles.map((t) => (
          <View key={t.label} style={[styles.tile, { backgroundColor: tileBg }]}>
            <Text style={styles.tileLabel} numberOfLines={1}>
              {t.label}
            </Text>
            <Text style={styles.tileValue} numberOfLines={1}>
              {t.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Plié : la carte prend sa part de la page (voir app/analysis.js, qui laisse le
  // contenu s'étirer), avec un minimum et un plafond pour rester belle partout.
  rootClosed: { flexGrow: 1, minHeight: 250, maxHeight: 380 },
  fill: { flexGrow: 1 },

  hero: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // L'anneau tient dans la zone entre l'en-tête et les trois repères (derrière le
  // graphique) et n'est rogné que par le bord droit de la carte ; les repères, opaques
  // et dessinés après lui, le recouvrent si une carte basse le fait déborder.
  ring: { position: 'absolute', right: -62, top: 66 },
  heroHead: { flexDirection: 'row', alignItems: 'center' },
  heroTitle: { fontFamily: fonts.sansExtraBold, fontSize: 19, letterSpacing: -0.3, color: '#FFFFFF' },
  openChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openChevron: { fontFamily: fonts.sansBold, fontSize: 22, marginTop: -2, transform: [{ rotate: '90deg' }] },

  // Les chiffres de cette police se posent plus haut que le milieu de leur boîte de
  // texte (vide en bas, pour les jambages) : ni « en bas » ni « au milieu de la
  // boîte » ne tombe pile en face d'eux. `bigSide` prend donc la hauteur mesurée dans
  // Hero (jusqu'à la mesure, invisible : un instant, à l'ouverture de la page).
  bigRow: { flexDirection: 'row', alignItems: 'flex-start' },
  bigValue: { fontFamily: fonts.display, fontSize: 64, color: '#FFFFFF', includeFontPadding: false },
  bigSide: { marginLeft: 10, justifyContent: 'center' },
  bigSideWait: { opacity: 0 },
  bigLabel: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1.6, color: 'rgba(255,255,255,0.6)' },
  dots: { flexDirection: 'row', gap: 5, marginTop: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  bars: { marginTop: 10 },

  tiles: { flexDirection: 'row', gap: 8 },
  tile: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  tileLabel: { fontFamily: fonts.monoRegular, fontSize: 8.5, letterSpacing: 0.8, color: 'rgba(255,255,255,0.5)' },
  tileValue: { marginTop: 4, fontFamily: fonts.display, fontSize: 21, color: '#FFFFFF', includeFontPadding: false },

  // Ouvert : une simple rangée d'en-tête.
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headText: { flexGrow: 1, flexShrink: 1 },
  title: { fontFamily: fonts.sansExtraBold, fontSize: 16, letterSpacing: -0.2, color: '#FFFFFF' },
  subtitle: {
    marginTop: 2,
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.50)',
  },
  right: { alignItems: 'flex-end', marginLeft: 12, maxWidth: 110 },
  rightLabel: {
    fontFamily: fonts.monoRegular,
    fontSize: 9,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.45)',
  },
  rightValue: { marginTop: 2, fontFamily: fonts.monoBold, fontSize: 12, color: '#FFFFFF' },
  chevron: { marginLeft: 12, fontFamily: fonts.sansBold, fontSize: 22, color: 'rgba(255,255,255,0.45)' },
  chevronClosed: { transform: [{ rotate: '90deg' }] },
  chevronOpen: { transform: [{ rotate: '-90deg' }] },
  // Les petits groupes : un trait fin à gauche, ils « pendent » du grand.
  children: {
    gap: 12,
    marginTop: 12,
    marginLeft: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255,255,255,0.12)',
  },
});
