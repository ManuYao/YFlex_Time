import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import AppIcon from './AppIcon';
import IconButton from './IconButton';
import Button from './Button';
import { fonts } from '../../lib/fonts';
import { formatValue } from '../../lib/formatters';
import { haptic } from '../../hooks/useHaptic';
import { getHowToItems } from '../../lib/timers-config';
import { ROUND_SIZE } from '../../lib/buttonTokens';
import { D, easeImpact, springSheet, slideInY } from '../../lib/animations';

/**
 * Sous-fenêtre ouverte depuis ModeStatsSheet (bouton "Comment ça marche ?").
 * Empilée par-dessus le panneau stats/badges — même structure de sheet
 * (translateY + backdrop), mais sans BlurView : un deuxième flou par-dessus
 * celui de ModeStatsSheet ferait ressortir le banding du dégradé de fond
 * (voir le commentaire dans ModeStatsSheet.js), donc simple voile sombre ici.
 */
export default function HowToSheet({ timer, screenH, onClose }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(screenH);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    backdropOpacity.value = withTiming(1, { duration: D.base, easing: easeImpact });
    translateY.value = withSpring(0, springSheet);

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, []);

  const handleClose = () => {
    backdropOpacity.value = withTiming(0, { duration: D.fast });
    translateY.value = withTiming(screenH, { duration: D.fast, easing: easeImpact }, (done) => {
      if (done) runOnJS(onClose)();
    });
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const items = getHowToItems(timer);
  // Opaque (FF, pas F2) : avec la section RÉGLAGES en plus, on voyait la
  // feuille Stats derrière transparaître (nombres qui se superposent aux
  // pastilles, capture utilisateur du 28/09/2026) — cette feuille doit
  // rester strictement au-dessus, rien ne doit transparaître derrière elle.
  const sheetTint = timer.bgColors[1] + 'FF';
  // Réglages actuels du mode (TRAVAIL/REPOS/TOURS...) — donne du contexte
  // avant de lire les explications, en lecture seule (rien ne se modifie
  // ici). MIX n'a aucun stat `editable` (sa config est une liste de blocs,
  // pas un réglage chiffré) : la section ne s'affiche simplement pas.
  const settingsStats = timer.stats.filter((s) => s.editable);

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
      <Pressable style={styles.tap} onPress={handleClose} />

      {/* Bas de feuille calé sur la zone sûre : sous la barre de geste
          Android, la dernière ligne n'était plus confortable à lire. */}
      <Animated.View
        style={[
          styles.sheet,
          sheetStyle,
          { backgroundColor: sheetTint, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        <View style={styles.header}>
          <AppIcon name={timer.id} size={22} />
          <Text style={styles.title}>Comment ça marche</Text>
          <IconButton
            icon="close"
            size={ROUND_SIZE.sheet}
            tone={timer.textMode}
            onPress={handleClose}
            haptic={haptic.light}
            hitSlop={10}
            accessibilityLabel="Fermer"
          />
        </View>

        {settingsStats.length > 0 && (
          <View style={styles.settingsSection}>
            <View style={styles.settingsLabelRow}>
              <AppIcon name="sliders" size={11} opacity={0.7} />
              <Text style={styles.settingsLabel}>RÉGLAGES ACTUELS</Text>
            </View>
            <View style={styles.settingsRow}>
              {settingsStats.map((stat) => {
                const fmt = stat.type === 'seconds' ? formatValue(stat.value, stat.type) : null;
                const displayValue = fmt ? fmt.main : stat.value;
                const displayUnit = fmt ? fmt.unit : stat.unit;
                return (
                  <View key={stat.key} style={styles.settingBox}>
                    <Text style={styles.settingBoxLabel} numberOfLines={1}>{stat.label}</Text>
                    <View style={styles.settingValueRow}>
                      <Text style={styles.settingValue} numberOfLines={1}>{displayValue}</Text>
                      {!!displayUnit && (
                        <Text style={styles.settingUnit} numberOfLines={1}>{displayUnit}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.list}>
          {items.map((item, i) => (
            <Animated.View
              key={i}
              entering={slideInY(12, D.base, 80 + i * 70)}
              style={styles.item}
            >
              <View style={styles.itemIconBox}>
                <AppIcon name={item.icon} size={17} />
              </View>
              <Text style={styles.itemText}>
                <Text style={styles.itemLead}>{item.lead}. </Text>
                {item.text}
              </Text>
            </Animated.View>
          ))}
        </View>

        {/* Va plus loin que le mécanisme ci-dessus : d'où vient le format,
            dans quels sports on le retrouve. Une vraie page (pas une feuille
            de plus empilée) : sujet assez long pour mériter de défiler et de
            se lire tranquillement. */}
        <Button
          variant="glass"
          fullWidth
          label="En savoir plus"
          icon="arrow"
          haptic={haptic.light}
          onPress={() => {
            router.push({ pathname: '/mode-guide', params: { id: timer.id } });
            handleClose();
          }}
          style={styles.moreCta}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 95,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  tap: {
    flex: 1,
  },
  // paddingBottom posé en ligne (zone sûre + 24).
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },

  handleWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.30)',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  title: {
    flex: 1,
    fontFamily: fonts.sansBold,
    fontSize: 17,
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },

  // Réglages actuels (lecture seule) — fond sombre pour se distinguer des
  // items d'explication en dessous : ici, rien ne se touche.
  settingsSection: {
    marginBottom: 18,
  },
  settingsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  settingsLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.6)',
  },
  settingsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  settingBox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  settingBoxLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 9,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 4,
  },
  settingValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  settingValue: {
    fontFamily: fonts.monoBold,
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
  },
  settingUnit: {
    fontFamily: fonts.monoRegular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    marginLeft: 3,
  },

  list: {
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    padding: 14,
  },
  // Pastille de 30 et texte décalé de 5 : la première ligne (20 de haut)
  // tombe pile au milieu de l'icône. Fond SOMBRE translucide : une icône
  // blanche sur une pastille blanchâtre s'effaçait (« blanc sur blanc »).
  itemIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 13.5,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.90)',
    paddingTop: 5,
  },
  itemLead: {
    fontFamily: fonts.sansBold,
    fontSize: 14.5,
    color: '#FFFFFF',
  },

  moreCta: {
    marginTop: 16,
  },
});
