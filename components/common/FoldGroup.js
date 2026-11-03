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

// La grande carte pliée.
function Hero({ icon, title, subtitle, accent, hero }) {
  const { value, label, ring = 0, bars = [], tiles = [], dots = [] } = hero;
  return (
    <View style={[styles.hero, { borderColor: withAlpha(accent, 0.34), backgroundColor: withAlpha(accent, 0.07) }]}>
      {/* Anneau de graduations en filigrane, rogné dans le coin. */}
      <View style={styles.ring} pointerEvents="none">
        <TickRing progress={ring} size={250} colorActive={withAlpha(accent, 0.5)} colorInactive="rgba(255,255,255,0.07)" />
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
          <Text style={styles.bigValue} numberOfLines={1}>
            {value}
          </Text>
          {/* Le libellé (et les points) est centré sur les CHIFFRES, pas sur la boîte du texte. */}
          <View style={styles.bigSide}>
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
          <View key={t.label} style={styles.tile}>
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
  ring: { position: 'absolute', right: -78, top: 54 },
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
  // texte (vide en bas, pour les jambages) : centré tel quel, le libellé tombait trop
  // bas. Le `marginBottom` remonte son centre de la moitié de sa valeur (18 → 9 dp),
  // le décalage mesuré sur téléphone entre le milieu des chiffres et celui de la boîte.
  bigRow: { flexDirection: 'row', alignItems: 'center' },
  bigValue: { fontFamily: fonts.display, fontSize: 64, color: '#FFFFFF', includeFontPadding: false },
  bigSide: { marginLeft: 10, marginBottom: 18 },
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
    backgroundColor: 'rgba(255,255,255,0.06)',
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
