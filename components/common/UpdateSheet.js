import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';

import BottomSheet from './BottomSheet';
import Button from './Button';
import AppIcon from './AppIcon';
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
              ? "Flex Timer s'est mis à jour en arrière-plan. Redémarre l'app pour l'installer — ça prend une seconde."
              : "Voici ce que Flex Timer a appris récemment."}
          </Animated.Text>

          {/* Pas de liste de nouveautés en mode 'pending' : le contenu de la
              mise à jour téléchargée ne peut PAS être lu avant que son propre
              JS n'ait tourné une première fois — `latest` ici décrit encore
              la version EN COURS D'EXÉCUTION, pas celle qui arrive. L'afficher
              sous un titre "NOUVELLE VERSION" laissait croire que c'était le
              contenu à venir, alors que c'était l'ancien (confusion signalée
              par l'utilisateur le 22/09/2026). Le vrai contenu, lu depuis le
              bundle correctement rebooté, s'affiche au lancement suivant en
              mode 'info' — voir lib/updatePopup.js (suivi par mode) et
              lib/updateGateSignal.js pour la garantie qu'il ne sera pas
              escamoté. */}
          {isPending ? (
            <Animated.Text entering={slideInY(12, D.base, 220)} style={styles.pendingHint}>
              Le détail de cette mise à jour s'affichera juste après le redémarrage.
            </Animated.Text>
          ) : (
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
                  {/* Chaque icône prend une des 4 couleurs de la barre du
                      haut, à tour de rôle : en blanc sur une pastille
                      blanche, elles s'effaçaient (retour utilisateur). */}
                  <View
                    style={[
                      styles.itemIconBox,
                      { backgroundColor: `${MODE_COLORS[i % MODE_COLORS.length]}26` },
                    ]}
                  >
                    <AppIcon name={item.icon} size={17} color={MODE_COLORS[i % MODE_COLORS.length]} />
                  </View>
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
          )}

          <Animated.View entering={slideInY(14, D.base, isPending ? 300 : 220 + latest.items.length * 70)}>
            {/* Capsule « spectrum » (lib/buttonTokens.js) : les quatre couleurs
                des modes, avec reflet, liseré et lueur. Texte noir : le blanc
                ne se lisait pas sur le jaune et le vert, l'ombre de texte qui
                compensait faisait bon marché. */}
            <Button
              variant="spectrum"
              fullWidth
              label={isPending ? 'Redémarrer maintenant' : 'Compris'}
              onPress={() => {
                haptic.medium();
                if (isPending) onRestart();
                else close();
              }}
            />

            {isPending && (
              <Button
                variant="ghost"
                size="md"
                label="Plus tard"
                haptic={haptic.light}
                onPress={close}
                style={styles.later}
              />
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
  pendingHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.42)',
    marginBottom: 28,
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
  // Même pastille que HowToSheet (fond teinté passé en ligne) : texte décalé
  // de 5 pour que sa première ligne (20 de haut) tombe au milieu de l'icône.
  itemIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
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

  later: {
    marginTop: 6,
  },
});
