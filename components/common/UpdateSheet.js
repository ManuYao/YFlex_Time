import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';

import BottomSheet from './BottomSheet';
import PressTap from './PressTap';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { playSound } from '../../lib/sounds';
import { CHANGELOG_HISTORY } from '../../lib/changelog';
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
 *
 * `showHistory` : ajoute une ligne de résumé pour l'avant-dernière version
 * (lib/changelog.js, CHANGELOG_HISTORY[1]) sous la liste. Réservé à
 * l'ouverture manuelle depuis Paramètres > Version — le popup automatique
 * (UpdateGate) reste volontairement centré sur la seule nouveauté du
 * moment, sans historique.
 */
export default function UpdateSheet({ screenH, mode = 'pending', showHistory = false, onRestart, onClose }) {
  useEffect(() => {
    haptic.light();
    playSound('update');
  }, []);

  const isPending = mode === 'pending';
  const [latest, previous] = CHANGELOG_HISTORY;
  // La liste peut dépasser la hauteur de la feuille (8 items ou plus avec
  // des textes longs) : sans borne, BottomSheet grandit vers le haut sans
  // limite et déborde au-dessus de l'écran (constaté sur v11.1.0, 8 items).
  const listMaxHeight = Math.min(300, screenH * 0.36);

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

          <ScrollView
            style={[styles.list, { maxHeight: listMaxHeight }]}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {latest.items.map((item, i) => (
              <Animated.View
                key={i}
                entering={slideInY(12, D.base, 220 + i * 70)}
                style={styles.item}
              >
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <Text style={styles.itemText}>{item.text}</Text>
              </Animated.View>
            ))}

            {showHistory && !!previous && (
              <View style={styles.historyRow}>
                <Text style={styles.historyLabel}>
                  AVANT ÇA · V{previous.version}
                </Text>
                <Text style={styles.historyText}>{previous.summary}</Text>
              </View>
            )}
          </ScrollView>

          <Animated.View entering={slideInY(14, D.base, 220 + latest.items.length * 70)}>
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
    marginBottom: 24,
  },
  listContent: {
    gap: 10,
    paddingBottom: 2,
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

  historyRow: {
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  historyLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 9.5,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 4,
  },
  historyText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.50)',
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
