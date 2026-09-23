import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { formatValue } from '../../lib/formatters';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
// En dessous de cet écart (px) on ne recale pas : c'est du bruit d'arrondi dp -> px.
const SNAP_EPSILON = 1;

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
  const lastIdxRef = useRef(values.indexOf(selectedValue));
  // true = le scroll en cours est notre recalage, pas le doigt de l'utilisateur
  const settlingRef = useRef(false);
  const [activeIdx, setActiveIdx] = useState(values.indexOf(selectedValue));

  useEffect(() => {
    const idx = values.indexOf(selectedValue);
    if (idx >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ y: idx * ITEM_HEIGHT, animated: false });
      lastIdxRef.current = idx;
      setActiveIdx(idx);
    }
  }, []);

  const idxAt = (y) =>
    Math.max(0, Math.min(values.length - 1, Math.round(y / ITEM_HEIGHT)));

  // Point de passage unique : une seule haptique et un seul onChange par index,
  // que la valeur soit retenue pendant le scroll ou confirmée à l'arrêt.
  const commit = (idx) => {
    if (idx === lastIdxRef.current) return;
    lastIdxRef.current = idx;
    setActiveIdx(idx);
    haptic.selection();
    onChange?.(values[idx]);
  };

  const onScroll = (e) => {
    commit(idxAt(e.nativeEvent.contentOffset.y));
  };

  const onScrollBeginDrag = () => {
    // Nouveau geste : un recalage en attente n'a plus de sens.
    settlingRef.current = false;
  };

  // snapToInterval peut immobiliser la liste à quelques pixels d'un multiple exact
  // de ITEM_HEIGHT alors que le rail, lui, est dessiné à une position fixe.
  // À l'arrêt : on confirme l'index retenu et on recale la liste pile dessus.
  const onMomentumScrollEnd = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = idxAt(y);
    const wasSettling = settlingRef.current;
    settlingRef.current = false;
    commit(idx);
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

  return (
    <View style={[styles.root, { height: totalHeight }]}>
      <View
        pointerEvents="none"
        style={[
          styles.rail,
          {
            top: railTop,
            height: ITEM_HEIGHT,
            borderColor: accentColor + '44',
            backgroundColor: accentColor + '14',
          },
        ]}
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={onScroll}
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: railTop }}
      >
        {values.map((v, i) => {
          const distance = Math.abs(i - activeIdx);
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.4 : 0.15;
          const scale = distance === 0 ? 1 : 0.8;
          const isSelected = distance === 0;
          const fmt = formatValue(v, type);
          const isLong = fmt.main.length > 5;

          return (
            <View key={i} style={[styles.item, { height: ITEM_HEIGHT }]}>
              <View
                style={[
                  styles.itemRow,
                  { opacity, transform: [{ scale }] },
                ]}
              >
                <Text
                  style={[
                    styles.mainText,
                    {
                      fontSize: isSelected ? (isLong ? 22 : 34) : (isLong ? 14 : 22),
                      fontFamily: isSelected ? fonts.monoExtraBold : fonts.monoBold,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {fmt.main}
                </Text>
                {fmt.unit ? (
                  <Text
                    style={[
                      styles.unitText,
                      {
                        fontSize: isSelected ? 13 : 10,
                        color: isSelected ? accentColor : 'rgba(255,255,255,0.5)',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {fmt.unit}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

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
  rail: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderWidth: 1,
    borderRadius: 14,
    zIndex: 1,
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
    // PAS de lineHeight fixe. Une boîte de 36 px figée alors que la police passe
    // de 14/22 à 34 px selon la sélection plaçait le chiffre à une hauteur
    // différente dans sa boîte à chaque changement d'état (~5 px de saut, et le
    // chiffre sélectionné ~4 px trop haut dans le rail). Sans lineHeight, la boîte
    // suit la police (ascent + descent, includeFontPadding: false) et styles.item
    // la centre : les chiffres tombent au centre exact de l'item, à toute taille.
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
