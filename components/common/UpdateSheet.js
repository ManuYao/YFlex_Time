import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

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
// Au-delà de 5 lignes, les suivantes arrivent ensemble : elles sont de toute
// façon sous le pli de la liste, les faire attendre ne servait qu'à ralentir.
const ITEM_STAGGER_MAX = 5;
// Fond de la feuille (BottomSheet) : le fondu de bas de liste doit finir
// exactement dessus pour ne pas se voir comme une bande.
const SHEET_BG = '#0A0A0A';
const SHEET_BG_CLEAR = 'rgba(10,10,10,0)';
// À partir de ce nombre de nouveautés, l'en-tête se compacte : la ligne du haut
// les compte (« 12 nouveautés ») et la phrase d'intro disparaît, pour rendre sa
// place à la liste. En dessous, l'en-tête reste celui d'avant.
const COUNT_FROM = 4;
// Hauteur de la feuille hors liste (poignée, en-tête, bouton, marges) : sert à
// donner à la liste TOUTE la place qui reste, sans dépasser l'écran.
const SHEET_FIXED_H = 260;
const SHEET_FIXED_H_COMPACT = 225;

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
 *
 * Lisibilité des grosses mises à jour (refonte du 25/11/2026) : chaque
 * nouveauté peut porter un `title` court (2 à 4 mots) affiché en gras au-dessus
 * de son explication, pour qu'on parcoure la liste d'un coup d'œil avant de
 * lire le détail. Sans `title` (entrée générique, anciennes entrées), le texte
 * s'affiche seul, comme avant.
 */
export default function UpdateSheet({ screenH, mode = 'pending', showHistory = false, onRestart, onClose }) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    haptic.light();
    playSound('update');
  }, []);

  const isPending = mode === 'pending';
  const [latest, previous] = CHANGELOG_HISTORY;
  const count = latest.items.length;
  const compact = !isPending && count >= COUNT_FROM;
  // La liste peut dépasser la hauteur de la feuille : sans borne, BottomSheet
  // grandit vers le haut sans limite et déborde au-dessus de l'écran
  // (constaté sur v11.1.0, 8 items). Elle prend donc toute la place restante
  // (avant : 300 dp au plus, soit deux nouveautés visibles à la fois).
  const listMaxHeight = Math.max(
    180,
    Math.min(
      600,
      screenH - insets.top - insets.bottom - (compact ? SHEET_FIXED_H_COMPACT : SHEET_FIXED_H) - 44
    )
  );

  // Fondus de haut et de bas de liste : le bas dit « il y en a encore » tant
  // qu'on n'a pas tout vu, le haut dit « tu as déjà défilé ». Pilotés par des
  // valeurs partagées : aucun re-rendu de la liste pendant le défilement.
  const topFade = useSharedValue(0);
  const bottomFade = useSharedValue(0);
  const metrics = useRef({ layout: 0, content: 0, y: 0, top: false, bottom: false });
  const topFadeStyle = useAnimatedStyle(() => ({ opacity: topFade.value }));
  const bottomFadeStyle = useAnimatedStyle(() => ({ opacity: bottomFade.value }));

  const refreshFades = useCallback(() => {
    const m = metrics.current;
    if (m.layout <= 0 || m.content <= 0) return;
    const top = m.y > 6;
    const bottom = m.content - (m.y + m.layout) > 6;
    if (top !== m.top) {
      m.top = top;
      topFade.value = withTiming(top ? 1 : 0, { duration: 160 });
    }
    if (bottom !== m.bottom) {
      m.bottom = bottom;
      bottomFade.value = withTiming(bottom ? 1 : 0, { duration: 160 });
    }
  }, []);

  const onListLayout = useCallback((e) => {
    metrics.current.layout = e.nativeEvent.layout.height;
    refreshFades();
  }, [refreshFades]);
  const onContentSizeChange = useCallback((_w, h) => {
    metrics.current.content = h;
    refreshFades();
  }, [refreshFades]);
  const onScroll = useCallback((e) => {
    metrics.current.y = e.nativeEvent.contentOffset.y;
    refreshFades();
  }, [refreshFades]);

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
            <Text style={styles.eyebrow} numberOfLines={1}>
              {isPending
                ? 'Mise à jour disponible'
                : compact
                  ? `${count} nouveautés`
                  : 'Nouveautés de cette version'}
            </Text>
            {!isPending && !!latest.version && (
              <Text style={styles.version}>V{latest.version}</Text>
            )}
          </Animated.View>

          <Animated.Text entering={slideInY(12, D.base, 120)} style={styles.title}>
            {isPending ? 'NOUVELLE VERSION' : 'QUOI DE NEUF'}
          </Animated.Text>

          {compact ? (
            <View style={styles.titleGap} />
          ) : (
            <Animated.Text entering={slideInY(12, D.base, 180)} style={styles.body}>
              {isPending
                ? "Flex Timer s'est mis à jour en arrière-plan. Redémarre l'app pour l'installer — ça prend une seconde."
                : "Voici ce que Flex Timer a appris récemment."}
            </Animated.Text>
          )}

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
            <View style={styles.listWrap}>
              <ScrollView
                style={[styles.list, { maxHeight: listMaxHeight }]}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={32}
                onLayout={onListLayout}
                onContentSizeChange={onContentSizeChange}
                onScroll={onScroll}
              >
                {latest.items.map((item, i) => {
                  const color = MODE_COLORS[i % MODE_COLORS.length];
                  return (
                    <Animated.View
                      key={i}
                      entering={slideInY(12, D.base, 220 + Math.min(i, ITEM_STAGGER_MAX) * 60)}
                      style={styles.item}
                    >
                      {/* Chaque icône prend une des 4 couleurs de la barre du
                          haut, à tour de rôle : en blanc sur une pastille
                          blanche, elles s'effaçaient (retour utilisateur). */}
                      <View style={[styles.itemIconBox, { backgroundColor: `${color}26` }]}>
                        <AppIcon name={item.icon} size={18} color={color} />
                      </View>
                      <View style={styles.itemBody}>
                        {!!item.title && <Text style={styles.itemTitle}>{item.title}</Text>}
                        <Text style={item.title ? styles.itemText : styles.itemTextAlone}>
                          {item.text}
                        </Text>
                      </View>
                    </Animated.View>
                  );
                })}

                {showHistory && !!previous && (
                  <View style={styles.historyRow}>
                    <Text style={styles.historyLabel}>
                      AVANT ÇA · V{previous.version}
                    </Text>
                    <Text style={styles.historyText}>{previous.summary}</Text>
                  </View>
                )}
              </ScrollView>

              <Animated.View pointerEvents="none" style={[styles.fade, styles.fadeTop, topFadeStyle]}>
                <LinearGradient colors={[SHEET_BG, SHEET_BG_CLEAR]} style={StyleSheet.absoluteFill} />
              </Animated.View>
              <Animated.View pointerEvents="none" style={[styles.fade, styles.fadeBottom, bottomFadeStyle]}>
                <LinearGradient colors={[SHEET_BG_CLEAR, SHEET_BG]} style={StyleSheet.absoluteFill} />
              </Animated.View>
            </View>
          )}

          {/* Le bouton arrive AVEC le reste de la feuille, pas après la liste :
              calé sur la fin de la liste, il attendait 220 ms + 70 ms par
              nouveauté — plus d'une seconde avec les 14 lignes de la 14.0.0
              (retour utilisateur : « il apparaît plus tard, pas direct avec
              le menu complet »). */}
          <Animated.View entering={slideInY(14, D.base, 220)}>
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
    flex: 1,
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  // Numéro de version, à droite de la ligne d'intro : discret, il sert de
  // repère quand on compare avec un message de testeur.
  version: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.38)',
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
  // En-tête compact (grosse mise à jour) : pas de phrase d'intro, juste un peu
  // d'air entre le titre et la liste.
  titleGap: {
    height: 4,
  },
  pendingHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.42)',
    marginBottom: 28,
  },

  listWrap: {
    marginBottom: 16,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: 8,
    paddingBottom: 14,
  },
  // Fondus posés par-dessus la liste (jamais dans son flux) : ils ne prennent
  // aucune place et laissent passer les doigts.
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 34,
  },
  fadeTop: {
    top: 0,
  },
  fadeBottom: {
    bottom: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  // Même pastille que HowToSheet (fond teinté passé en ligne).
  itemIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
    gap: 3,
  },
  // Le titre court : c'est lui qu'on parcourt des yeux ; l'icône (34 de haut)
  // et sa première ligne (20) sont centrées l'une sur l'autre.
  itemTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 15.5,
    lineHeight: 20,
    color: '#FFFFFF',
    paddingTop: 7,
  },
  itemText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.64)',
  },
  // Sans titre : le texte porte seul le message, donc plus clair et plus
  // grand, avec le même décalage que le titre pour rester aligné sur l'icône.
  itemTextAlone: {
    fontFamily: fonts.sansMedium,
    fontSize: 13.5,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.90)',
    paddingTop: 7,
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
