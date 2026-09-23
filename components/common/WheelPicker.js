import React, { memo, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  interpolateColor,
  Extrapolation,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  runOnJS,
} from 'react-native-reanimated';

import { formatValue } from '../../lib/formatters';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { easeImpact, springBouncy } from '../../lib/animations';

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
// En dessous de cet écart (px) on ne recale pas : c'est du bruit d'arrondi dp -> px.
const SNAP_EPSILON = 1;

// Distance (en nombre d'items) à partir de laquelle l'interpolation continue
// plafonne — au-delà, scale/opacity/rotateX ne bougent plus.
const MAX_D = 2.4;

const WheelItem = memo(function WheelItem({ value, type, index, scrollY, accentColor }) {
  const fmt = formatValue(value, type);
  const isLong = fmt.main.length > 5;

  const style = useAnimatedStyle(() => {
    const center = scrollY.value / ITEM_HEIGHT;
    const d = index - center;
    const absD = Math.min(Math.abs(d), MAX_D);

    const scale = interpolate(absD, [0, 1, 2, MAX_D], [1, 0.8, 0.64, 0.58], Extrapolation.CLAMP);
    const opacity = interpolate(absD, [0, 0.6, 1.2, MAX_D], [1, 0.62, 0.28, 0.1], Extrapolation.CLAMP);
    // Léger effet cylindre : les items s'inclinent en s'éloignant du centre,
    // comme si la roue avait une vraie courbure.
    const rotateX = interpolate(d, [-MAX_D, 0, MAX_D], [42, 0, -42], Extrapolation.CLAMP);
    // Signé : les items se tassent vers le centre, comme sur un cylindre.
    const translateY = interpolate(d, [-MAX_D, 0, MAX_D], [6, 0, -6], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [
        { perspective: 700 },
        { rotateX: `${rotateX}deg` },
        { translateY },
        { scale },
      ],
    };
  });

  const mainStyle = useAnimatedStyle(() => {
    const center = scrollY.value / ITEM_HEIGHT;
    const absD = Math.min(Math.abs(index - center), 1);
    const fontSize = interpolate(
      absD,
      [0, 1],
      [isLong ? 22 : 34, isLong ? 14 : 22],
      Extrapolation.CLAMP
    );
    return { fontSize };
  });

  const unitStyle = useAnimatedStyle(() => {
    const center = scrollY.value / ITEM_HEIGHT;
    const absD = Math.min(Math.abs(index - center), 1);
    const fontSize = interpolate(absD, [0, 1], [13, 10], Extrapolation.CLAMP);
    const color = interpolateColor(absD, [0, 1], [accentColor, 'rgba(255,255,255,0.5)']);
    return { fontSize, color };
  });

  return (
    <Animated.View style={[styles.item, { height: ITEM_HEIGHT }, style]}>
      <View style={styles.itemRow}>
        <Animated.Text
          style={[styles.mainText, { fontFamily: fonts.monoExtraBold }, mainStyle]}
          numberOfLines={1}
        >
          {fmt.main}
        </Animated.Text>
        {fmt.unit ? (
          <Animated.Text style={[styles.unitText, unitStyle]} numberOfLines={1}>
            {fmt.unit}
          </Animated.Text>
        ) : null}
      </View>
    </Animated.View>
  );
});

export default function WheelPicker({
  values,
  selectedValue,
  type = 'rounds',
  accentColor = '#FFFFFF',
  onChange,
  // (V) La roue tient 5 valeurs par défaut. En fenêtre réduite la feuille
  // ne peut pas les loger : elle passe à 3 et reste utilisable (une valeur
  // au-dessus, une en dessous — assez pour comprendre qu'on peut défiler).
  // ITEM_HEIGHT ne bouge PAS : tout le centrage et le recalage en dépendent.
  // Impair uniquement, sinon la valeur sélectionnée n'a pas de ligne centrale.
  visibleItems = VISIBLE_ITEMS,
}) {
  const visible = visibleItems % 2 === 0 ? visibleItems - 1 : visibleItems;
  const paddingItems = Math.floor(visible / 2);
  const scrollRef = useRef(null);
  const initialIdx = Math.max(0, values.indexOf(selectedValue));
  // true = le scroll en cours est notre recalage, pas le doigt de l'utilisateur
  const settlingRef = useRef(false);
  // Les flèches du rail mordraient sur la valeur dans une colonne étroite
  // (Mix Builder : 2 à 3 roues côte à côte) : affichées seulement si la place.
  const [width, setWidth] = useState(0);
  const showChevrons = width >= 240;

  // Position de scroll continue, pilote toute l'interpolation visuelle des
  // items sur UI thread — aucun re-render React pendant le défilement.
  const scrollY = useSharedValue(initialIdx * ITEM_HEIGHT);
  const lastIdxShared = useSharedValue(initialIdx);
  const railPulse = useSharedValue(1);
  const railGlow = useSharedValue(0.1);

  useEffect(() => {
    // Respiration continue et discrète du halo du rail — signale que la
    // roue est un élément "vivant", pas une simple liste.
    railGlow.value = withRepeat(
      withTiming(0.22, { duration: 1400, easing: easeImpact }),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    if (initialIdx >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ y: initialIdx * ITEM_HEIGHT, animated: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const idxAt = (y) =>
    Math.max(0, Math.min(values.length - 1, Math.round(y / ITEM_HEIGHT)));

  // Point de passage unique : une seule haptique et un seul onChange par
  // index, que la valeur soit retenue pendant le scroll ou confirmée à
  // l'arrêt. Le filtre anti-doublon vit déjà côté UI thread (scrollHandler),
  // donc pas besoin de re-vérifier ici.
  const commit = (idx) => {
    haptic.selection();
    railPulse.value = withSequence(
      withTiming(1.035, { duration: 90, easing: easeImpact }),
      withSpring(1, springBouncy)
    );
    onChange?.(values[idx]);
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
      const idx = Math.max(
        0,
        Math.min(values.length - 1, Math.round(e.contentOffset.y / ITEM_HEIGHT))
      );
      if (idx !== lastIdxShared.value) {
        lastIdxShared.value = idx;
        runOnJS(commit)(idx);
      }
    },
  });

  const onScrollBeginDrag = () => {
    // Nouveau geste : un recalage en attente n'a plus de sens.
    settlingRef.current = false;
  };

  // snapToInterval peut immobiliser la liste à quelques pixels d'un multiple
  // exact de ITEM_HEIGHT alors que le rail, lui, est dessiné à une position
  // fixe. À l'arrêt : on recale la liste pile dessus si besoin.
  const onMomentumScrollEnd = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = idxAt(y);
    const wasSettling = settlingRef.current;
    settlingRef.current = false;
    // Sur Android, notre scrollTo animé déclenche lui-même un momentum end :
    // on ne le recale pas une seconde fois, sinon aller-retour possible.
    if (wasSettling) return;
    const target = idx * ITEM_HEIGHT;
    if (Math.abs(y - target) > SNAP_EPSILON && scrollRef.current) {
      settlingRef.current = true;
      scrollRef.current.scrollTo({ y: target, animated: true });
    }
  };

  const totalHeight = ITEM_HEIGHT * visible;
  const railTop = ITEM_HEIGHT * paddingItems;

  const railStyle = useAnimatedStyle(() => ({
    transform: [{ scale: railPulse.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: railGlow.value,
  }));

  return (
    <View
      style={[styles.root, { height: totalHeight }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.railGlow,
          {
            top: railTop - 6,
            height: ITEM_HEIGHT + 12,
            backgroundColor: accentColor,
          },
          glowStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.rail,
          {
            top: railTop,
            height: ITEM_HEIGHT,
            borderColor: accentColor + 'AA',
            backgroundColor: accentColor + '1C',
          },
          railStyle,
        ]}
      >
        <LinearGradient
          colors={[accentColor + '26', 'transparent', accentColor + '14']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {showChevrons && (
          <>
            <View style={[styles.chevron, styles.chevronLeft, { borderLeftColor: accentColor }]} />
            <View style={[styles.chevron, styles.chevronRight, { borderRightColor: accentColor }]} />
          </>
        )}
      </Animated.View>

      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={scrollHandler}
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: railTop }}
      >
        {values.map((v, i) => (
          <WheelItem
            key={i}
            value={v}
            type={type}
            index={i}
            scrollY={scrollY}
            accentColor={accentColor}
          />
        ))}
      </Animated.ScrollView>

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(10,10,10,0.98)', 'transparent']}
        style={[styles.fadeTop, { height: railTop }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(10,10,10,0.98)']}
        style={[styles.fadeBottom, { height: railTop }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    overflow: 'hidden',
  },
  railGlow: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderRadius: 20,
    zIndex: 0,
  },
  rail: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderWidth: 1.5,
    borderRadius: 14,
    zIndex: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  chevron: {
    position: 'absolute',
    top: '50%',
    marginTop: -5,
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  chevronLeft: {
    left: 10,
    borderLeftWidth: 7,
  },
  chevronRight: {
    right: 10,
    borderRightWidth: 7,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  mainText: {
    color: '#FFFFFF',
    letterSpacing: -0.7,
    // PAS de lineHeight fixe. Une boîte figée alors que la police passe de
    // 14/22 à 34 px selon la position dans la roue plaçait le chiffre à une
    // hauteur différente dans sa boîte à chaque frame. Sans lineHeight, la
    // boîte suit la police (ascent + descent, includeFontPadding: false) et
    // styles.item la centre : les chiffres tombent au centre exact, à toute
    // taille et à toute frame d'interpolation.
    includeFontPadding: false,
    textAlign: 'center',
  },
  unitText: {
    fontFamily: fonts.sansBold,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginLeft: 8,
    marginBottom: 4,
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
});
