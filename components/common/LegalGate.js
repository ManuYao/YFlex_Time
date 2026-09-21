import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, BackHandler } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  scrollTo,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import PageDots from './PageDots';
import PressTap from './PressTap';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { playDenied } from '../../lib/sounds';
import { D, easeImpact, springBouncy, springSheet } from '../../lib/animations';
import { setLegalAccepted } from '../../lib/legalConsent';

const MODE_DOTS = ['#FF5454', '#FFC933', '#1FC777', '#9575FF'];
const DENY_RED = '#FF5454';
const CARD_RADIUS = 28;
const CARD_BG = '#0C0C0C';

// Même technique que l'aperçu "glisse vers le planning" de app/history.js :
// on dévoile une bande de la page suivante puis on revient en ressort.
const PEEK_PX = 56;
const PEEK_FIRST_DELAY_MS = 1100;
const PEEK_REPLAY_IDLE_MS = 6000;
// Garde-fou anti-harcèlement (même esprit que HINT_MAX_RUNS dans
// components/screens/HistoryPage.js) : au-delà, c'est à l'utilisateur.
const PEEK_MAX_RUNS = 3;
// Durée totale d'un aperçu (aller + maintien + retour en ressort) : sert à
// savoir s'il y en a un en cours sans passer par un callback worklet.
const PEEK_TOTAL_MS = 1700;

const DENY_FLASH_MS = 350;

/**
 * Textes : le cœur de la mission. Ligne de partage nette entre ce que
 * l'app a le droit de faire (recommandations sportives algorithmiques, à
 * titre indicatif — par ex. suggérer d'augmenter une charge) et ce qu'elle
 * ne fait jamais (avis médical, diagnostic). Français simple, sans jargon.
 */
const PAGES = [
  {
    key: 'sport',
    accent: '#1FC777',
    eyebrow: 'Page 1 / 2 · Conseils sportifs',
    title: 'DES CONSEILS,\nPAS DES ORDRES',
    blocks: [
      {
        heading: "Ce que l'application te propose",
        paragraphs: [
          "Flex Timer analyse ton planning et ton historique pour te proposer des recommandations d'entraînement automatiques — par exemple, suggérer d'augmenter la charge d'un exercice qui revient souvent dans tes séances.",
          "Ces recommandations sont calculées par un algorithme, uniquement à partir des données que tu as saisies. Elles sont fournies à titre indicatif, pour t'aider à structurer ta progression.",
        ],
      },
      {
        heading: 'Ce que ces conseils ne sont pas',
        paragraphs: [
          "Ce ne sont ni un programme personnalisé, ni l'avis d'un coach. L'algorithme ne connaît ni ta technique, ni ta fatigue du jour, ni ton matériel, ni ton niveau réel.",
          'Tu restes seul juge : tu peux suivre, adapter ou ignorer chaque suggestion. Une charge proposée n’est jamais une charge obligatoire.',
        ],
      },
      {
        heading: 'Ta responsabilité pendant la séance',
        paragraphs: [
          "L'échauffement, la technique d'exécution, le choix des charges et la sécurité de ton environnement (matériel, espace, pareur) relèvent de toi. En cas de doute sur un mouvement, fais-toi encadrer par un professionnel du sport.",
        ],
      },
    ],
  },
  {
    key: 'medical',
    accent: '#FF5454',
    eyebrow: 'Page 2 / 2 · Santé',
    title: 'AUCUN CONSEIL\nMÉDICAL',
    blocks: [
      {
        heading: "Flex Timer n'est pas un dispositif médical",
        paragraphs: [
          "L'application ne pose aucun diagnostic, ne prescrit aucun traitement et ne fournit aucun avis médical — ni dans ses chronos, ni dans ses recommandations sportives.",
          "Les suggestions de progression ne tiennent pas compte de ton état de santé : blessure, pathologie cardiaque ou articulaire, grossesse, traitement en cours ou toute autre condition médicale.",
        ],
      },
      {
        heading: "Avant et pendant l'effort",
        paragraphs: [
          'Avant de commencer ou de reprendre une activité physique intense, consulte un médecin — surtout si tu as un antécédent médical ou le moindre doute.',
          "Arrête immédiatement l'effort en cas de douleur, de malaise, de vertige ou d'essoufflement anormal, et consulte un professionnel de santé.",
        ],
      },
      {
        heading: 'Ton engagement',
        paragraphs: [
          "En acceptant, tu confirmes être apte à pratiquer une activité physique, utiliser Flex Timer sous ta seule responsabilité, et comprendre que l'éditeur ne peut être tenu responsable d'une blessure ou d'un dommage lié à ta pratique sportive.",
          'Les conditions complètes restent consultables à tout moment dans Paramètres › À propos › Conditions d’utilisation.',
        ],
      },
    ],
  },
];

const keyExtractor = (item) => item.key;

function LegalPage({ page, width, height }) {
  return (
    <View style={{ width, height }}>
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageEyebrow, { color: page.accent }]}>{page.eyebrow}</Text>
        <Text style={styles.pageTitle}>{page.title}</Text>
        {page.blocks.map((block) => (
          <View key={block.heading} style={styles.block}>
            <View style={styles.blockHeadRow}>
              <View style={[styles.blockBar, { backgroundColor: page.accent }]} />
              <Text style={styles.blockHeading}>{block.heading}</Text>
            </View>
            {block.paragraphs.map((p) => (
              <Text key={p} style={styles.paragraph}>
                {p}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
      {/* Le texte s'efface vers le bas de la page : dit "il y a la suite"
          sans barre de défilement. */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(12,12,12,0)', CARD_BG]}
        style={styles.pageFade}
      />
    </View>
  );
}

function LockIcon({ color }) {
  return (
    <Svg width={11} height={11} viewBox="0 0 12 12" fill="none">
      <Path
        d="M3.6 5.4V4a2.4 2.4 0 0 1 4.8 0v1.4"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Rect x={2.4} y={5.4} width={7.2} height={5} rx={1.4} stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

/**
 * Validation juridique obligatoire, montée par app/settings.js tant que
 * `flexTimer_legalAccepted` n'est pas posée (lib/legalConsent.js).
 *
 * <Modal> et pas une View absolue à zIndex : voir CLAUDE.md, un overlay
 * absolu enfant d'une ScrollView ne passe jamais au-dessus de ses frères
 * ScrollView au niveau natif Android. Le Modal transparent laisse voir les
 * Paramètres derrière le voile (l'utilisateur voit où il arrive) tout en
 * avalant chaque toucher : rien derrière n'est interactif.
 *
 * Non skippable : pas de croix, le voile n'est pas pressable, et le retour
 * Android est intercepté (`onRequestClose` + BackHandler) pour ne jamais
 * fermer. La seule sortie est la case cochée + « J'accepte ».
 */
export default function LegalGate({ onAccept }) {
  const insets = useSafeAreaInsets();
  const listRef = useAnimatedRef();
  const [pager, setPager] = useState(null);
  const [page, setPage] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [checked, setChecked] = useState(false);
  const [denied, setDenied] = useState(false);

  const locked = !reachedEnd;

  // Tout ce que les callbacks stables (BackHandler, timers) doivent lire
  // sans se refaire à chaque rendu.
  const hint = useRef({ runs: 0, timer: null, stopped: false, peekUntil: 0 });
  const deniedTimer = useRef(null);
  const exitTimer = useRef(null);
  const exiting = useRef(false);

  const cardY = useSharedValue(40);
  const cardA = useSharedValue(0);
  const veilA = useSharedValue(0);
  const shakeX = useSharedValue(0);

  // Décalage programmatique du pager, uniquement pour l'aperçu. Jamais
  // resynchronisé sur le scroll de l'utilisateur (sinon boucle scrollTo →
  // onScroll → scrollTo) : il ne sert que depuis la page 1, et plus du tout
  // une fois la page 2 atteinte.
  const peekX = useSharedValue(0);
  // `useDerivedValue` tourne une première fois avant que la FlatList (montée
  // seulement une fois le pager mesuré) n'existe : sans ce garde, scrollTo
  // tombe sur une ref vide et loggue un warning (cf. app/history.js).
  const mounted = useSharedValue(false);
  // Et jamais depuis la page 2 : une écriture de peekX (même 0) pendant que
  // l'utilisateur y est le ramènerait en page 1.
  const onFirstPage = useSharedValue(true);
  useEffect(() => {
    mounted.value = !!pager;
  }, [pager]);
  useEffect(() => {
    onFirstPage.value = page === 0;
  }, [page]);
  useDerivedValue(() => {
    if (!mounted.value || !onFirstPage.value) return;
    scrollTo(listRef, peekX.value, 0, false);
  });

  // Entrée de la carte pilotée par des sharedValues plutôt que `entering` :
  // la FlatList se monte APRÈS le premier onLayout, donc les enfants de la
  // carte changent juste après le montage — précisément le cas qui bloque
  // une animation d'entrée Reanimated à opacity 0 sur la Nouvelle
  // Architecture (bug documenté dans CLAUDE.md, MaintenanceScreen).
  useEffect(() => {
    veilA.value = withTiming(1, { duration: D.base });
    cardA.value = withTiming(1, { duration: D.slow, easing: easeImpact });
    cardY.value = withTiming(0, { duration: D.slow, easing: easeImpact });
  }, []);

  const peek = useCallback(() => {
    hint.current.peekUntil = Date.now() + PEEK_TOTAL_MS;
    peekX.value = withSequence(
      withTiming(PEEK_PX, { duration: 420, easing: easeImpact }),
      withDelay(680, withSpring(0, springSheet))
    );
  }, []);

  // Remise à zéro instantanée seulement si un aperçu est réellement en
  // cours : poser peekX à 0 hors de ce cas ferait un scrollTo(0) parasite
  // (par ex. un tap pendant l'élan vers la page 2 la ramènerait en arrière).
  const cancelPeek = useCallback(() => {
    const h = hint.current;
    if (Date.now() >= h.peekUntil) return;
    cancelAnimation(peekX);
    peekX.value = 0;
    h.peekUntil = 0;
  }, []);

  const schedulePeek = useCallback(
    (delay) => {
      const h = hint.current;
      clearTimeout(h.timer);
      if (h.stopped || h.runs >= PEEK_MAX_RUNS) return;
      h.timer = setTimeout(() => {
        if (h.stopped || h.runs >= PEEK_MAX_RUNS) return;
        h.runs += 1;
        peek();
        schedulePeek(PEEK_REPLAY_IDLE_MS);
      }, delay);
    },
    [peek]
  );

  const stopPeeks = useCallback(() => {
    const h = hint.current;
    h.stopped = true;
    clearTimeout(h.timer);
    cancelAnimation(peekX);
  }, []);

  useEffect(() => {
    if (!pager) return undefined;
    schedulePeek(PEEK_FIRST_DELAY_MS);
    return () => clearTimeout(hint.current.timer);
  }, [pager, schedulePeek]);

  useEffect(
    () => () => {
      clearTimeout(deniedTimer.current);
      clearTimeout(exitTimer.current);
    },
    []
  );

  const shake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-8, { duration: 45 }),
      withTiming(7, { duration: 45 }),
      withTiming(-4, { duration: 45 }),
      withSpring(0, springBouncy)
    );
  }, []);

  const deny = useCallback(() => {
    haptic.error();
    playDenied();
    shake();
    setDenied(true);
    clearTimeout(deniedTimer.current);
    deniedTimer.current = setTimeout(() => setDenied(false), DENY_FLASH_MS);
  }, [shake]);

  // Refus + on montre le chemin : si la page 2 n'a pas encore été vue, un
  // aperçu part tout de suite (sans compter dans le quota des aperçus
  // automatiques, c'est l'utilisateur qui vient de le déclencher).
  const denyLocked = useCallback(() => {
    deny();
    const h = hint.current;
    if (!h.stopped && Date.now() >= h.peekUntil) {
      clearTimeout(h.timer);
      peek();
      schedulePeek(PEEK_REPLAY_IDLE_MS);
    }
  }, [deny, peek, schedulePeek]);

  // Sur Android, le Modal reçoit lui-même la touche retour (`onRequestClose`)
  // et les listeners BackHandler ne sont pas appelés tant qu'il est visible.
  // On garde quand même l'abonnement : si un jour le Modal cesse de
  // l'intercepter, la validation reste obligatoire.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      denyLocked();
      return true;
    });
    return () => sub.remove();
  }, [denyLocked]);

  const onPagerLayout = (e) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setPager((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
  };

  const markReached = (index) => {
    if (index !== page) {
      setPage(index);
      haptic.selection();
    }
    if (index === PAGES.length - 1 && !hint.current.stopped) {
      stopPeeks();
      setReachedEnd(true);
    }
  };

  const handleMomentumEnd = (e) => {
    if (!pager) return;
    markReached(Math.round(e.nativeEvent.contentOffset.x / pager.w));
  };

  const handleTouch = () => {
    if (hint.current.stopped) return;
    cancelPeek();
    schedulePeek(PEEK_REPLAY_IDLE_MS);
  };

  // Un aperçu en vol est remis à 0 AVANT le scrollToIndex : sinon
  // `stopPeeks` figerait peekX à mi-course, et le prochain retour en page 1
  // (qui réactive le derived value) téléporterait la liste à cet offset.
  const goToPage = (index) => {
    cancelPeek();
    listRef.current?.scrollToIndex({ index, animated: true });
    markReached(index);
  };

  const handleCheckPress = () => {
    if (exiting.current) return;
    if (locked) {
      denyLocked();
      return;
    }
    haptic.selection();
    setChecked((c) => !c);
  };

  const handleConfirm = async () => {
    if (locked) {
      denyLocked();
      return;
    }
    if (!checked) {
      deny();
      return;
    }
    if (exiting.current) return;
    exiting.current = true;
    haptic.success();
    await setLegalAccepted();
    // Le Modal disparaît d'un coup au démontage : on joue la sortie nous-mêmes
    // avant de prévenir le parent.
    veilA.value = withTiming(0, { duration: D.base });
    cardA.value = withTiming(0, { duration: D.base, easing: easeImpact });
    cardY.value = withTiming(24, { duration: D.base, easing: easeImpact });
    exitTimer.current = setTimeout(() => onAccept?.(), D.base);
  };

  const veilStyle = useAnimatedStyle(() => ({ opacity: veilA.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardA.value,
    transform: [{ translateY: cardY.value }],
  }));
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const renderItem = useCallback(
    ({ item }) => <LegalPage page={item} width={pager.w} height={pager.h} />,
    [pager]
  );

  const onLastPage = page === PAGES.length - 1;

  return (
    <Modal visible transparent animationType="none" onRequestClose={denyLocked} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View pointerEvents="none" style={[styles.veil, veilStyle]} />

        <Animated.View style={[styles.card, { marginTop: insets.top + 36 }, cardStyle]}>
          <LinearGradient
            colors={['#1C1C1C', CARD_BG, '#000000']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.header}>
            <View style={styles.eyebrowRow}>
              <View style={styles.dots}>
                {MODE_DOTS.map((c) => (
                  <View key={c} style={[styles.dot, { backgroundColor: c }]} />
                ))}
              </View>
              <Text style={styles.eyebrow}>Avant de continuer</Text>
            </View>
            <Text style={styles.counter}>
              {page + 1}/{PAGES.length}
            </Text>
          </View>

          <View style={styles.pagerWrap} onLayout={onPagerLayout}>
            {pager ? (
              <Animated.FlatList
                ref={listRef}
                data={PAGES}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                horizontal
                pagingEnabled
                bounces={false}
                overScrollMode="never"
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                onTouchStart={handleTouch}
                onScrollBeginDrag={handleTouch}
                onMomentumScrollEnd={handleMomentumEnd}
                getItemLayout={(_, index) => ({
                  length: pager.w,
                  offset: pager.w * index,
                  index,
                })}
              />
            ) : null}
          </View>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 18 }]}>
            <PageDots count={PAGES.length} activeIndex={page} onSelect={goToPage} />
            <Text style={[styles.swipeHint, onLastPage && styles.swipeHintDone]}>
              {onLastPage ? 'Tu as tout lu.' : 'Glisse vers la gauche pour lire la suite →'}
            </Text>

            <Animated.View style={shakeStyle}>
              <PressTap
                onPress={handleCheckPress}
                tapScale={0.98}
                accessibilityLabel="J'ai lu et j'accepte les conditions"
                style={[
                  styles.checkRow,
                  locked && styles.checkRowLocked,
                  denied && styles.checkRowDenied,
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    checked && styles.checkboxOn,
                    denied && styles.checkboxDenied,
                  ]}
                >
                  {checked ? (
                    <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                      <Path
                        d="M2.5 6.2l2.4 2.4 4.6-5"
                        stroke="#0A0A0A"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  ) : locked ? (
                    <LockIcon color={denied ? DENY_RED : 'rgba(255,255,255,0.55)'} />
                  ) : null}
                </View>
                <View style={styles.checkText}>
                  <Text style={[styles.checkLabel, denied && styles.checkLabelDenied]}>
                    J'ai lu et j'accepte les conditions
                  </Text>
                  <Text style={[styles.checkSub, denied && styles.checkSubDenied]}>
                    {locked
                      ? denied
                        ? 'Lis d’abord la page 2 pour déverrouiller cette case.'
                        : 'Se déverrouille une fois la page 2 lue.'
                      : denied
                        ? 'Coche la case pour continuer.'
                        : 'Conseils sportifs indicatifs · aucun avis médical.'}
                  </Text>
                </View>
              </PressTap>
            </Animated.View>

            <PressTap
              onPress={handleConfirm}
              tapScale={0.97}
              accessibilityLabel="J'accepte et je continue"
              style={[styles.cta, !checked && styles.ctaDisabled]}
            >
              <Text style={[styles.ctaText, !checked && styles.ctaTextDisabled]}>
                J'ACCEPTE ET JE CONTINUE
              </Text>
            </PressTap>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
  },

  card: {
    flex: 1,
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: CARD_BG,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 10,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  counter: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.40)',
  },

  pagerWrap: {
    flex: 1,
  },
  pageScroll: {
    flex: 1,
  },
  pageContent: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 40,
  },
  pageFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 36,
  },
  pageEyebrow: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  pageTitle: {
    fontFamily: fonts.display,
    fontSize: 38,
    lineHeight: 40,
    letterSpacing: -0.4,
    color: '#FFFFFF',
    marginBottom: 18,
  },
  block: {
    marginBottom: 16,
  },
  blockHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  blockBar: {
    width: 3,
    height: 14,
    borderRadius: 1.5,
  },
  blockHeading: {
    flex: 1,
    fontFamily: fonts.sansBold,
    fontSize: 14,
    letterSpacing: -0.2,
    color: '#FFFFFF',
  },
  paragraph: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.78)',
    marginBottom: 8,
  },

  footer: {
    paddingHorizontal: 22,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  swipeHint: {
    fontFamily: fonts.monoRegular,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.42)',
    marginTop: 8,
    marginBottom: 12,
  },
  swipeHintDone: {
    color: '#1FC777',
  },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  // Même grisé que les contrôles inactifs de Paramètres (Toggle/Slider
  // désactivés : opacity 0.35 sur le contrôle, texte laissé lisible).
  checkRowLocked: {
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  checkRowDenied: {
    borderColor: 'rgba(255,84,84,0.55)',
    backgroundColor: 'rgba(255,84,84,0.12)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  checkboxDenied: {
    borderColor: DENY_RED,
  },
  checkText: {
    flex: 1,
    minWidth: 0,
  },
  checkLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  checkLabelDenied: {
    color: DENY_RED,
  },
  checkSub: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
  checkSubDenied: {
    color: 'rgba(255,84,84,0.85)',
  },

  cta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
  },
  ctaDisabled: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  ctaText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    letterSpacing: 1.2,
    color: '#0A0A0A',
  },
  ctaTextDisabled: {
    color: 'rgba(255,255,255,0.35)',
  },
});
