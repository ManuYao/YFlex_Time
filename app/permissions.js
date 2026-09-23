import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, Linking, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

import GradientBackground from '../components/common/GradientBackground';
import PressTap from '../components/common/PressTap';
import { fonts } from '../lib/fonts';
import { useHaptic } from '../hooks/useHaptic';
import { isNotificationPermissionGranted } from '../lib/notificationPrompt';
import { requestNotificationPermission } from '../lib/permissionPrimer';
import { isBatteryOptimizationEnabled, openBatteryOptimizationSettings } from '../lib/batteryOptimization';

const IS_ANDROID = Platform.OS === 'android';

/**
 * Paramètres › Autorisations : état réel de chaque autorisation, relu au
 * retour des réglages système. Une autorisation déjà accordée est grisée
 * avec une coche (demande utilisateur du 24/09/2026) ; « Activer » passe par
 * la même demande que la page du tutoriel (lib/permissionPrimer.js).
 */

const ACCENT = '#FFFFFF';

function BellIcon({ size = 22, color = ACCENT }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.5c-3 0-5 2.2-5 5.4v3.2c0 .8-.3 1.6-.9 2.2L5 15.5h14l-1.1-1.2a3.2 3.2 0 0 1-.9-2.2V8.9c0-3.2-2-5.4-5-5.4Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path
        d="M9.5 18.5a2.6 2.6 0 0 0 5 0"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function BatteryIcon({ size = 22, color = ACCENT }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="7.5" width="15" height="9" rx="2" stroke={color} strokeWidth={1.6} />
      <Path d="M20 10v4" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path
        d="M12.5 9.5 9.5 13h3l-1 3.5 3-4h-3l1-3Z"
        fill={color}
      />
    </Svg>
  );
}

function InstallIcon({ size = 22, color = ACCENT }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4v10.5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Path
        d="M8 11.5 12 15.5 16 11.5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 17.5v1.2c0 .7.6 1.3 1.3 1.3h11.4c.7 0 1.3-.6 1.3-1.3v-1.2"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function MicIcon({ size = 22, color = ACCENT }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="3.5" width="6" height="10" rx="3" stroke={color} strokeWidth={1.6} />
      <Path
        d="M6 11.5a6 6 0 0 0 12 0"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Line x1="12" y1="17.5" x2="12" y2="20.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1="8.5" y1="20.5" x2="15.5" y2="20.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export default function Permissions() {
  const router = useRouter();
  const haptic = useHaptic();

  const [notifGranted, setNotifGranted] = useState(null);
  const [batteryOptimized, setBatteryOptimized] = useState(null);

  const refresh = useCallback(() => {
    isNotificationPermissionGranted().then(setNotifGranted);
    isBatteryOptimizationEnabled().then(setBatteryOptimized);
  }, []);

  // useFocusEffect ne se redéclenche pas au retour des réglages système
  // (l'écran n'a jamais perdu le focus) : AppState prend le relais.
  useFocusEffect(refresh);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return (
    <GradientBackground colors={['#1A1A1A', '#0A0A0A', '#000000']} ambient>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <PressTap onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path
                d="M9 2L3 7l6 5"
                stroke="#FFFFFF"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </PressTap>
          <Text style={styles.topTitle}>Autorisations</Text>
          <View style={styles.iconBtnGhost} />
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.intro}>
            Voici ce que Flex Timer peut te demander, et pourquoi — avant que ton téléphone
            te pose la question directement.
          </Text>

          {IS_ANDROID && (
            <PermissionCard
              Icon={BellIcon}
              title="Notifications"
              body="Pour afficher la phase et le temps qui défile pendant une séance, même écran éteint ou dans une autre appli. Sans elles, le chrono continue mais tu ne vois plus rien tant que tu n'as pas rouvert Flex Timer."
              status={notifGranted === null ? null : notifGranted ? 'Activé' : 'Non autorisé'}
              statusOk={notifGranted}
              granted={notifGranted === true}
              actionLabel="Activer"
              onPress={async () => {
                haptic.light();
                if ((await requestNotificationPermission()) === 'granted') {
                  haptic.success();
                  refresh();
                }
              }}
            />
          )}

          {IS_ANDROID && (
            <PermissionCard
              Icon={BatteryIcon}
              title="Optimisation batterie"
              body="Certains téléphones (Xiaomi, Huawei, Samsung en mode économie…) coupent les applications en arrière-plan pour économiser la batterie — y compris ton chrono en cours. Exclure Flex Timer de cette optimisation garde la séance fiable, même en arrière-plan."
              status={
                batteryOptimized === null ? null : batteryOptimized ? 'Optimisation active' : 'Activé'
              }
              statusOk={batteryOptimized === false}
              granted={batteryOptimized === false}
              actionLabel="Activer"
              onPress={() => {
                haptic.light();
                openBatteryOptimizationSettings();
              }}
            />
          )}

          {IS_ANDROID && (
            <PermissionCard
              Icon={InstallIcon}
              title="Installer des applications"
              body="Quand une mise à jour importante n'est pas livrable directement (changement technique majeur), Flex Timer peut te proposer d'installer le nouvel APK sans passer par le navigateur. Ton téléphone demandera une confirmation la première fois."
              status={null}
              actionLabel="Ouvrir les réglages de l'app"
              onPress={() => {
                haptic.light();
                Linking.openSettings();
              }}
            />
          )}

          <PermissionCard
            Icon={MicIcon}
            title="Microphone"
            body="Flex Timer ne l'utilise pas et ne le demande jamais — ton téléphone ne t'affichera aucun dialogue à ce sujet."
            status="Jamais demandé"
            statusOk
            muted
          />

          <Text style={styles.footnote}>
            Une ligne grisée et cochée est déjà réglée. « Activer » ouvre la demande de ton
            téléphone, ou le bon réglage si tu avais refusé avant.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function PermissionCard({ Icon, title, body, status, statusOk, actionLabel, onPress, muted = false, granted = false }) {
  return (
    <View style={[styles.card, muted && styles.cardMuted, granted && styles.cardGranted]}>
      <View style={styles.cardHead}>
        <View style={[styles.cardIconWrap, muted && styles.cardIconWrapMuted]}>
          <Icon color={muted ? 'rgba(255,255,255,0.45)' : ACCENT} />
        </View>
        <View style={styles.cardHeadText}>
          <Text style={[styles.cardTitle, (muted || granted) && styles.cardTitleMuted]}>{title}</Text>
          {!!status && (
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusOk ? '#1FC777' : statusOk === false ? '#FF5454' : 'rgba(255,255,255,0.3)' },
                ]}
              />
              <Text style={styles.statusText}>{status}</Text>
            </View>
          )}
        </View>
        {granted && (
          <View style={styles.checkBadge}>
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path d="M2.5 7.2 5.6 10.2 11.5 3.8" stroke="#0A0A0A" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
        )}
      </View>

      <Text style={styles.cardBody}>{body}</Text>

      {!!onPress && !granted && (
        <PressTap onPress={onPress} style={styles.cardCta} tapScale={0.97}>
          <Text style={styles.cardCtaText}>{actionLabel}</Text>
        </PressTap>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnGhost: { width: 40, height: 40 },
  topTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  intro: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.60)',
    marginBottom: 22,
  },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 18,
    marginBottom: 14,
  },
  cardGranted: {
    opacity: 0.55,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1FC777',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMuted: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconWrapMuted: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cardHeadText: { flex: 1, minWidth: 0 },
  cardTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  cardTitleMuted: {
    color: 'rgba(255,255,255,0.55)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
  },

  cardBody: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.60)',
    marginBottom: 14,
  },

  cardCta: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  cardCtaText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 0.2,
    color: '#FFFFFF',
  },

  footnote: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 8,
  },
});
