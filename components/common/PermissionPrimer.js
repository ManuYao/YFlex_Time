import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  AppState,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import PressTap from './PressTap';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { D, easeImpact, springBouncy } from '../../lib/animations';
import { useLayoutLevel } from '../../lib/responsive';
import {
  getPermissionStatus,
  markPermissionPrimerShown,
  requestNotificationPermission,
} from '../../lib/permissionPrimer';
import { openBatteryOptimizationSettings } from '../../lib/batteryOptimization';

const OK_GREEN = '#1FC777';
const MOCK_PHASE_SECONDS = 20;

// Ligne de phase de l'aperçu, par mode : la fausse notif doit ressembler à
// celle que la personne verra pour la séance qu'elle lance.
const MOCK_LINE = {
  amrap: () => 'AMRAP · en continu',
  basic: () => 'REPOS',
  emom: (r) => `TOUR ${r}/10`,
  tabata: (r) => `TRAVAIL · Tour ${r}/8`,
  mix: (r) => `BLOC ${Math.min(r, 4)}/4`,
};

const isLightColor = (hex) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
};

// Entrée d'un bloc (fondu + montée) pilotée par sharedValue et non par
// `entering` : même prudence que LegalGate/MaintenanceScreen dans un Modal.
function useRise(delay, distance = 18) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withTiming(1, { duration: D.slow, easing: easeImpact }));
  }, []);
  return useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: (1 - v.value) * distance }],
  }));
}

/* ───────────── Icônes (SVG maison, pas d'emoji) ───────────── */

function BellIcon({ size = 18, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.5c-3 0-5 2.2-5 5.4v3.2c0 .8-.3 1.6-.9 2.2L5 15.5h14l-1.1-1.2a3.2 3.2 0 0 1-.9-2.2V8.9c0-3.2-2-5.4-5-5.4Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M9.5 18.5a2.6 2.6 0 0 0 5 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function BatteryIcon({ size = 18, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="7.5" width="15" height="9" rx="2" stroke={color} strokeWidth={1.8} />
      <Path d="M20 10v4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M12.5 9.5 9.5 13h3l-1 3.5 3-4h-3l1-3Z" fill={color} />
    </Svg>
  );
}

function ShieldIcon({ size = 14, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3 5 6v5.5c0 4.3 2.9 8 7 9.5 4.1-1.5 7-5.2 7-9.5V6l-7-3Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="m9 12 2 2 4-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TimerGlyph({ size = 12, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="13.5" r="7.5" stroke={color} strokeWidth={2.4} />
      <Path d="M12 13.5V9.5M10 3h4" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

/* ───────────── Aperçu animé de la notification de séance ───────────── */

function NotificationMock({ accent, compact, mode, modeName }) {
  const [elapsed, setElapsed] = useState(0);
  const drop = useSharedValue(0);
  const float = useSharedValue(0);
  const bell = useSharedValue(0);
  const progress = useSharedValue(1);
  const onAccent = isLightColor(accent) ? '#0A0A0A' : '#FFFFFF';

  useEffect(() => {
    const START_DELAY = 250;
    drop.value = withDelay(START_DELAY, withSpring(1, { damping: 14, stiffness: 160, mass: 1 }));
    float.value = withDelay(
      1100,
      withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
    // La cloche "sonne" brièvement toutes les ~3 s, comme une notif qui arrive.
    bell.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 80 }),
          withTiming(-1, { duration: 80 }),
          withTiming(0.6, { duration: 80 }),
          withTiming(-0.6, { duration: 80 }),
          withTiming(0, { duration: 80 }),
          withDelay(2600, withTiming(0, { duration: 1 }))
        ),
        -1,
        false
      )
    );
    progress.value = withDelay(
      START_DELAY,
      withRepeat(
        withTiming(0, { duration: MOCK_PHASE_SECONDS * 1000, easing: Easing.linear }),
        -1,
        false
      )
    );
    const t0 = Date.now() + START_DELAY;
    const id = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - t0) / 1000)));
    }, 250);
    return () => clearInterval(id);
  }, []);

  const secondsLeft = MOCK_PHASE_SECONDS - (elapsed % MOCK_PHASE_SECONDS);
  const round = 2 + (Math.floor(elapsed / MOCK_PHASE_SECONDS) % 7);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(drop.value, [0, 0.4, 1], [0, 1, 1]),
    transform: [
      { translateY: interpolate(drop.value, [0, 1], [-120, 0]) + float.value * -4 },
      { scale: interpolate(drop.value, [0, 1], [0.92, 1]) },
    ],
  }));
  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bell.value * 16}deg` }],
  }));
  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <Animated.View style={[styles.mock, cardStyle]}>
      <View style={styles.mockHead}>
        <View style={[styles.mockAppIcon, { backgroundColor: accent }]}>
          <TimerGlyph color={onAccent} />
        </View>
        <Text style={styles.mockApp}>Flex Timer</Text>
        <Text style={styles.mockWhen}>· en cours</Text>
      </View>

      <View style={styles.mockBody}>
        <View style={styles.mockBodyText}>
          <Text style={styles.mockTitle} numberOfLines={1}>
            {(MOCK_LINE[mode] || MOCK_LINE.tabata)(round)}
          </Text>
          <Text style={styles.mockSub} numberOfLines={1}>
            {modeName}
          </Text>
        </View>
        <Text style={[styles.mockTime, { color: accent }]}>
          00:{String(secondsLeft).padStart(2, '0')}
        </Text>
      </View>

      <View style={styles.mockTrack}>
        <Animated.View style={[styles.mockFill, { backgroundColor: accent }, barStyle]} />
      </View>

      {!compact && (
        <View style={styles.mockActions}>
          {['PAUSE', 'PASSER', 'STOP'].map((label) => (
            <Text key={label} style={[styles.mockAction, { color: accent }]}>
              {label}
            </Text>
          ))}
        </View>
      )}

      <Animated.View style={[styles.mockBell, { backgroundColor: accent }, bellStyle]}>
        <BellIcon size={17} color={onAccent} />
      </Animated.View>
    </Animated.View>
  );
}

/* ───────────── Ligne de la checklist ───────────── */

function CheckBadge({ visible }) {
  const s = useSharedValue(visible ? 1 : 0);
  useEffect(() => {
    s.value = visible ? withSpring(1, springBouncy) : withTiming(0, { duration: D.fast });
  }, [visible]);
  const style = useAnimatedStyle(() => ({
    opacity: s.value,
    transform: [{ scale: interpolate(s.value, [0, 1], [0.3, 1]) }],
  }));
  return (
    <Animated.View style={[styles.checkBadge, style]}>
      <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
        <Path d="M2.5 7.2 5.6 10.2 11.5 3.8" stroke="#0A0A0A" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

function PermissionRow({ Icon, title, reason, tag, granted, loaded, onPress, hint, accent, delay }) {
  const rise = useRise(delay);
  const g = useSharedValue(granted ? 1 : 0);
  useEffect(() => {
    g.value = withTiming(granted ? 1 : 0, { duration: D.medium, easing: easeImpact });
  }, [granted]);
  // Autorisé = la ligne se grise (demande utilisateur) et la coche prend le relais.
  const dimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(g.value, [0, 1], [1, 0.5]),
  }));

  return (
    <Animated.View style={rise}>
      <PressTap onPress={onPress} disabled={granted || !loaded} tapScale={0.98} style={styles.row}>
        <Animated.View style={[styles.rowInner, dimStyle]}>
          <View style={[styles.rowIcon, { borderColor: granted ? 'rgba(255,255,255,0.12)' : accent + '55' }]}>
            <Icon size={20} color={granted ? 'rgba(255,255,255,0.6)' : '#FFFFFF'} />
          </View>
          <View style={styles.rowText}>
            <View style={styles.rowTitleLine}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {title}
              </Text>
              <Text style={[styles.rowTag, { color: granted ? 'rgba(255,255,255,0.5)' : accent }]}>{tag}</Text>
            </View>
            <Text style={styles.rowReason}>{granted ? 'Activé' : reason}</Text>
          </View>
        </Animated.View>
        <View style={styles.rowRight}>
          {loaded && !granted && (
            <View style={[styles.rowPill, { borderColor: accent }]}>
              <Text style={[styles.rowPillText, { color: accent }]}>Activer</Text>
            </View>
          )}
          <View style={styles.checkSlot} pointerEvents="none">
            <CheckBadge visible={loaded && granted} />
          </View>
        </View>
      </PressTap>
      {!!hint && !granted && <Text style={styles.rowHint}>{hint}</Text>}
    </Animated.View>
  );
}

/* ───────────── Page ───────────── */

/**
 * Page "chrono fiable à 100 %" : explique AVANT la fenêtre système Android,
 * et affiche l'état réel de chaque autorisation (relu au retour des
 * réglages). <Modal> et pas une vue absolue : voir CLAUDE.md, bug zIndex /
 * ScrollView Android.
 *
 * moment : 'onboarding' | 'firstSession' (textes + enregistrement "déjà vu").
 * preview : aperçu depuis Paramètres — n'enregistre rien (sinon l'ouvrir pour
 * voir couperait le vrai déclenchement du tutoriel / d'avant séance).
 * onDone(result) : 'done' (notifications actives) | 'later' | 'dismissed'
 * (bouton retour Android : à traiter comme une annulation).
 */
export default function PermissionPrimer({
  moment = 'onboarding',
  accent = '#FFC933',
  mode = 'tabata',
  modeName = 'TABATA',
  preview = false,
  onDone,
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const level = useLayoutLevel();
  const isMini = level === 'mini';
  const isCompact = level === 'compact';

  const [status, setStatus] = useState({ notifications: false, battery: false, loaded: false });
  const [denied, setDenied] = useState(false);
  const [batteryTapped, setBatteryTapped] = useState(false);
  const prevRef = useRef(null);
  const closingRef = useRef(false);

  const veil = useSharedValue(0);
  const exit = useSharedValue(0);

  const refresh = useCallback(async () => {
    const s = await getPermissionStatus();
    const prev = prevRef.current;
    if (prev && ((!prev.notifications && s.notifications) || (!prev.battery && s.battery))) {
      haptic.success();
    }
    prevRef.current = s;
    setStatus({ ...s, loaded: true });
  }, []);

  useEffect(() => {
    veil.value = withTiming(1, { duration: D.base });
    if (!preview) markPermissionPrimerShown(moment);
    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, []);

  const close = useCallback(
    (result) => {
      if (closingRef.current) return;
      closingRef.current = true;
      // Le Modal disparaît d'un coup au démontage : la sortie est jouée ici.
      exit.value = withTiming(1, { duration: D.base, easing: easeImpact });
      setTimeout(() => onDone?.(result), D.base);
    },
    [onDone]
  );

  const activateNotifications = useCallback(async () => {
    haptic.light();
    setDenied(false);
    const result = await requestNotificationPermission();
    if (result === 'granted') refresh();
    else if (result === 'denied') {
      haptic.warning();
      setDenied(true);
    }
    // 'settings' : l'état sera relu au retour (AppState 'active').
  }, [refresh]);

  const activateBattery = useCallback(() => {
    haptic.light();
    setBatteryTapped(true);
    openBatteryOptimizationSettings();
  }, []);

  const onPrimary = () => {
    if (!status.notifications) {
      activateNotifications();
      return;
    }
    haptic.medium();
    close('done');
  };

  const onLater = () => {
    haptic.selection();
    close(status.notifications ? 'done' : 'later');
  };

  const onBack = () => {
    haptic.selection();
    close('dismissed');
  };

  const rootStyle = useAnimatedStyle(() => ({
    opacity: veil.value * (1 - exit.value),
  }));
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: exit.value * 24 }],
  }));

  const eyebrowStyle = useRise(120);
  const titleStyle = useRise(200, 24);
  const subStyle = useRise(300);
  const trustStyle = useRise(650);
  const footerStyle = useRise(720, 28);

  const isSession = moment === 'firstSession';
  const primaryLabel = !status.notifications
    ? 'Activer les notifications'
    : isSession
    ? 'Lancer la séance'
    : 'Continuer';
  const titleSize = isCompact || isMini ? 34 : 44;
  const glowR = Math.max(width, height) * 0.75;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onBack} statusBarTranslucent>
      <Animated.View style={[styles.root, rootStyle]}>
        <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
          <Defs>
            <RadialGradient id="primerGlow" cx={width / 2} cy={-height * 0.05} r={glowR} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={accent} stopOpacity={0.34} />
              <Stop offset="0.55" stopColor={accent} stopOpacity={0.07} />
              <Stop offset="1" stopColor={accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={width} height={height} fill="url(#primerGlow)" />
        </Svg>

        <Animated.View style={[styles.flex, contentStyle]}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.scroll,
              { paddingTop: insets.top + (isMini ? 16 : 28) },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {!isMini && (
              <View style={styles.mockWrap}>
                <NotificationMock accent={accent} compact={isCompact} mode={mode} modeName={modeName} />
              </View>
            )}

            <Animated.Text style={[styles.eyebrow, { color: accent }, eyebrowStyle]}>
              {isSession ? 'AVANT TA SÉANCE' : 'DERNIÈRE ÉTAPE'}
            </Animated.Text>
            <Animated.Text
              style={[
                styles.title,
                { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.18) },
                titleStyle,
              ]}
            >
              {'TON CHRONO\nRESTE VISIBLE'}
            </Animated.Text>
            <Animated.Text style={[styles.sub, subStyle]}>
              Écran éteint ou dans une autre appli : la phase, le temps et les boutons Pause · Passer ·
              Stop restent dans tes notifications.
            </Animated.Text>

            <View style={styles.rows}>
              <PermissionRow
                Icon={BellIcon}
                title="Notifications"
                tag="ESSENTIEL"
                reason="Voir et piloter ta séance sans rouvrir l'app"
                granted={status.notifications}
                loaded={status.loaded}
                onPress={activateNotifications}
                accent={accent}
                delay={450}
                hint={
                  denied
                    ? "Pas de souci : tu pourras les activer quand tu veux dans Paramètres › Autorisations."
                    : null
                }
              />
              <PermissionRow
                Icon={BatteryIcon}
                title="Batterie sans restriction"
                tag="RECOMMANDÉ"
                reason="Empêche ton téléphone de couper le chrono en arrière-plan"
                granted={status.battery}
                loaded={status.loaded}
                onPress={activateBattery}
                accent={accent}
                delay={550}
                hint={batteryTapped ? 'Dans la liste, choisis Flex Timer puis « Ne pas optimiser ».' : null}
              />
            </View>

            <Animated.View style={[styles.trust, trustStyle]}>
              <ShieldIcon color="rgba(255,255,255,0.5)" />
              <Text style={styles.trustText}>Jamais de pub ni de spam : seulement ta séance en cours.</Text>
            </Animated.View>
          </ScrollView>

          <Animated.View style={[styles.footer, { paddingBottom: insets.bottom + 16 }, footerStyle]}>
            <PressTap onPress={onPrimary} tapScale={0.97} style={styles.cta}>
              <Text style={styles.ctaText}>{primaryLabel}</Text>
            </PressTap>
            {!status.notifications && (
              <PressTap onPress={onLater} tapScale={0.97} style={styles.later} hitSlop={8}>
                <Text style={styles.laterText}>{isSession ? 'Plus tard, lancer la séance' : 'Plus tard'}</Text>
              </PressTap>
            )}
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: {
    flex: 1,
    backgroundColor: '#050505',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },

  mockWrap: {
    paddingTop: 10,
    marginBottom: 30,
  },
  mock: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: '#1B1B1D',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  mockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  mockAppIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  mockApp: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  mockWhen: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginLeft: 4,
  },
  mockBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mockBodyText: { flex: 1, minWidth: 0, marginRight: 12 },
  mockTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  mockSub: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 3,
  },
  mockTime: {
    fontFamily: fonts.monoExtraBold,
    fontSize: 28,
    letterSpacing: -1,
    includeFontPadding: false,
  },
  mockTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  mockFill: {
    height: 4,
    borderRadius: 2,
  },
  mockActions: {
    flexDirection: 'row',
    gap: 22,
    marginTop: 14,
  },
  mockAction: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  mockBell: {
    position: 'absolute',
    top: -14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#050505',
  },

  eyebrow: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 11,
    letterSpacing: 2.2,
    marginBottom: 10,
  },
  title: {
    fontFamily: fonts.display,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  sub: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.66)',
    marginTop: 12,
  },

  rows: {
    marginTop: 26,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 12,
  },
  rowInner: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 8,
  },
  rowTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  rowTag: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 9,
    letterSpacing: 1.4,
  },
  rowReason: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.58)',
    marginTop: 3,
  },
  rowRight: {
    marginLeft: 10,
    minWidth: 30,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rowPill: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  rowPillText: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 12,
  },
  checkSlot: {
    position: 'absolute',
    right: 0,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: OK_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 8,
    paddingHorizontal: 6,
  },

  trust: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
    paddingHorizontal: 4,
  },
  trustText: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.5)',
  },

  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  cta: {
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 16,
    color: '#0A0A0A',
    letterSpacing: -0.2,
  },
  later: {
    alignSelf: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  laterText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
});
