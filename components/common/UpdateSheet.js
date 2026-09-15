import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';

import BottomSheet from './BottomSheet';
import PressTap from './PressTap';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { CHANGELOG_CURRENT } from '../../lib/changelog';
import { D, slideInY } from '../../lib/animations';

// Le même dégradé 4 couleurs que le launch splash / Confetti : signature
// "toute l'app" plutôt qu'une couleur inventée pour l'occasion.
const MODE_COLORS = ['#FF5454', '#FFC933', '#1FC777', '#9575FF'];

/**
 * Feuille "Nouvelle version" — ouverte depuis Paramètres > À propos, jamais
 * automatiquement (voir hooks/useOtaUpdate.js : le téléchargement se fait
 * en tâche de fond, mais l'app n'impose plus de popup au retour au premier
 * plan). Même coquille que les feuilles du planning (BottomSheet).
 *
 * `mode`:
 * - 'pending' : une mise à jour est déjà téléchargée, CTA "Redémarrer".
 * - 'info'    : pas de mise à jour en attente, juste "quoi de neuf" sur la
 *               version en cours, CTA "Compris" (ferme, ne redémarre rien).
 */
export default function UpdateSheet({ screenH, mode = 'pending', onRestart, onClose }) {
  useEffect(() => {
    haptic.light();
  }, []);

  const isPending = mode === 'pending';

  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={120}>
      {({ close }) => (
        <>
          <LinearGradient
            colors={MODE_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topBar}
          />

          <Animated.View entering={slideInY(10, D.base, 60)} style={styles.eyebrowRow}>
            <View style={styles.dots}>
              {MODE_COLORS.map((c) => (
                <View key={c} style={[styles.dot, { backgroundColor: c }]} />
              ))}
            </View>
            <Text style={styles.eyebrow}>
              {isPending ? 'Mise à jour disponible' : 'Nouveautés de cette version'}
            </Text>
          </Animated.View>

          <Animated.Text entering={slideInY(12, D.base, 120)} style={styles.title}>
            {isPending ? 'NOUVELLE VERSION' : 'QUOI DE NEUF'}
          </Animated.Text>

          <Animated.Text entering={slideInY(12, D.base, 180)} style={styles.body}>
            {isPending
              ? "Flex Timer s'est mis à jour en arrière-plan. Redémarre l'app pour en profiter — ça prend une seconde."
              : "Voici ce que Flex Timer a appris récemment."}
          </Animated.Text>

          <View style={styles.list}>
            {CHANGELOG_CURRENT.map((item, i) => (
              <Animated.View
                key={i}
                entering={slideInY(12, D.base, 220 + i * 70)}
                style={styles.item}
              >
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <Text style={styles.itemText}>{item.text}</Text>
              </Animated.View>
            ))}
          </View>

          <Animated.View entering={slideInY(14, D.base, 220 + CHANGELOG_CURRENT.length * 70)}>
            <PressTap
              onPress={() => {
                haptic.medium();
                if (isPending) onRestart();
                else close();
              }}
              accessibilityLabel={isPending ? 'Redémarrer maintenant' : 'Compris'}
            >
              <LinearGradient
                colors={MODE_COLORS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>
                  {isPending ? 'Redémarrer maintenant' : 'Compris'}
                </Text>
              </LinearGradient>
            </PressTap>

            {isPending && (
              <PressTap onPress={close} tapScale={0.94} style={styles.later} hitSlop={8}>
                <Text style={styles.laterText}>Plus tard</Text>
              </PressTap>
            )}
          </Animated.View>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 3,
    borderRadius: 2,
    marginTop: -4,
    marginBottom: 18,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  eyebrow: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 36,
    letterSpacing: -0.5,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  body: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.70)',
    marginBottom: 20,
  },

  list: {
    gap: 10,
    marginBottom: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 14,
  },
  itemIcon: {
    fontSize: 20,
    lineHeight: 22,
  },
  itemText: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 13.5,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.90)',
  },

  cta: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    letterSpacing: -0.15,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  later: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  laterText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.40)',
  },
});
