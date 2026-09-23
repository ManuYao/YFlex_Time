import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Linking,
  StyleSheet,
  useWindowDimensions,
  AppState,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MailComposer from 'expo-mail-composer';
import Constants from 'expo-constants';
import Svg, { Path } from 'react-native-svg';

import GradientBackground from '../components/common/GradientBackground';
import Toggle from '../components/common/Toggle';
import UpdateSheet from '../components/common/UpdateSheet';
import ContactSheet from '../components/common/ContactSheet';
import ConfirmSheet from '../components/common/ConfirmSheet';
import LegalGate from '../components/common/LegalGate';
import { loadContactNoticeHidden, setContactNoticeHidden } from '../lib/contactNotice';
import {
  isBatteryOptimizationEnabled,
  openBatteryOptimizationSettings,
} from '../lib/batteryOptimization';
import { loadLegalAccepted } from '../lib/legalConsent';
import { loadCustomCategories } from '../lib/exercises';
import { useSettings } from '../contexts/SettingsContext';
import { useTimers } from '../contexts/TimersContext';
import { usePremium } from '../hooks/usePremium';
import { useOtaUpdate } from '../hooks/useOtaUpdate';
import { markUpdatePopupSeen, resolveUpdateCandidate } from '../lib/updatePopup';
import { haptic, setHapticStrength } from '../hooks/useHaptic';
import { playDenied, previewSound } from '../lib/sounds';
import { fonts } from '../lib/fonts';

const CONTACT_EMAIL = 'yaomanuit@gmail.com';

const STATUS_LABEL = {
  idle: 'pas encore vérifié',
  checking: 'vérification…',
  'up-to-date': 'à jour',
  found: 'nouvelle version trouvée et téléchargée',
  error: 'erreur',
};

// Lu depuis app.json (expo.version) : ne JAMAIS ré-écrire "Flex Timer X.Y.Z"
// en dur ici, sinon on retombe dans le bug qui a fait dire à l'utilisateur
// "la version affichée n'est pas la bonne" — un seul endroit à changer
// (app.json + package.json) pour que Paramètres suive automatiquement.
const APP_VERSION = Constants.expoConfig?.version ?? '?.?.?';

const GOLD = '#F0C954';
const DENY_RED = '#FF5454';

export default function Settings() {
  const router = useRouter();
  const { settings, update, reset } = useSettings();
  const { resetAll: resetAllTimers } = useTimers();
  const { isPremium } = usePremium();
  const [premiumDenied, setPremiumDenied] = useState(false);
  const { height: screenH } = useWindowDimensions();
  const { pending, updateId, runningUpdateId, restart, checkNow, status, lastCheckAt, lastError, diagnostics } =
    useOtaUpdate();
  // Même dérivation que la feuille automatique (components/common/UpdateGate.js) :
  // consulter "Version" depuis Paramètres doit compter comme "vu" pour de bon,
  // sinon la feuille automatique revient quand même au lancement suivant alors
  // qu'aucune nouvelle version n'a été publiée entre-temps.
  const updateCandidate = resolveUpdateCandidate({ pending, updateId, runningUpdateId });
  // null | 'pending' | 'info' — ouverture manuelle de la même feuille que
  // UpdateGate (app/_layout.js) affiche dès qu'une version pas encore vue est détectée ;
  // ici accessible à tout moment depuis la ligne "Version".
  const [updateSheet, setUpdateSheet] = useState(null);
  const [contactSheet, setContactSheet] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  // null = pas encore lu : on n'affiche la validation juridique qu'une fois
  // sûr qu'elle manque, sinon elle flasherait à chaque ouverture chez ceux
  // qui ont déjà accepté. Relu à chaque montage de l'écran : après un reset
  // complet (qui purge la clé), le prochain passage ici la redemande.
  const [legalAccepted, setLegalAcceptedState] = useState(null);
  useEffect(() => {
    let cancelled = false;
    loadLegalAccepted().then((ok) => {
      if (!cancelled) setLegalAcceptedState(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // null = pas encore lu. Relu à chaque retour au premier plan : l'utilisateur
  // revient ici juste après avoir changé le réglage système, la ligne doit
  // refléter le nouvel état sans rouvrir l'écran.
  const [batteryOptimized, setBatteryOptimized] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const read = () =>
      isBatteryOptimizationEnabled().then((on) => {
        if (!cancelled) setBatteryOptimized(on);
      });
    read();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') read();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  // Achat Premium désactivé pendant la bêta — pas de navigation vers
  // /premium, juste un refus visuel + haptique clair.
  const handlePremiumPress = () => {
    haptic.error();
    playDenied();
    setPremiumDenied(true);
    setTimeout(() => setPremiumDenied(false), 350);
  };

  // Confirmation dans la charte de l'app (`ConfirmSheet`) plutôt que
  // `Alert.alert` : la popup système tranchait complètement avec le reste,
  // police et fond par défaut au milieu d'une app 100 % custom.
  const handleResetAll = () => {
    haptic.light();
    setResetConfirm(true);
  };

  const runResetAll = async () => {
    try {
      // Ne jamais ajouter flexTimer_cooldown, flexTimer_premium ou
      // flexTimer_apkForceCheckLog à cette liste : un reset complet ne doit
      // pas devenir un moyen de contourner la limite quotidienne TABATA/MIX,
      // de perdre le statut Pro, ou de remettre à zéro le quota de 5
      // vérifications manuelles/heure (sinon ce n'est plus une limite).
      await AsyncStorage.multiRemove([
        'flexTimer_settings',
        'flexTimer_history',
        'flexTimer_onboarded',
        'flexTimer_planning',
        'flexTimer_planningArchives',
        'flexTimer_customExercises',
        'flexTimer_customCategories',
        // L'utilisateur repart de zéro : le rappel avant l'envoi d'un
        // mail redevient utile.
        'flexTimer_contactNoticeHidden',
        // Purge la marque "déjà vue" de la feuille de mise à jour :
        // après un reset, une version déjà en attente redevient
        // une nouveauté à montrer (UpdateGate, jusqu'à confirmation).
        'flexTimer_updatePopupSeen',
        // Vérification d'APK distante : on repart d'une lecture fraîche du
        // Gist, et un message de maintenance déjà lu redevient à montrer.
        // Sans effet sur un blocage en cours — il est recalculé à partir de
        // la version installée, pas d'un drapeau local.
        'flexTimer_apkCheck',
        'flexTimer_maintenanceSeen',
        // Validation juridique (conseils sportifs / exclusion médicale) :
        // un utilisateur qui repart de zéro doit relire et réaccepter.
        'flexTimer_legalAccepted',
        // Conseils de surcharge progressive déjà montrés (lib/progression.js) :
        // après un reset, un conseil déjà vu redevient à proposer.
        'flexTimer_progressionSeen',
        // Proposition d'exclusion de l'optimisation batterie (fin de la
        // première séance) : redemandée après un reset.
        'flexTimer_batteryPromptSeen',
        // Rappel mensuel notifications (lib/notificationPrompt.js) : reparti
        // à zéro après un reset, comme les autres rappels ci-dessus.
        'flexTimer_notificationPromptLastShown',
        'flexTimer_permissionPrimerSeen',
        // Compteur et date de lancement (lib/splash.js) : après un reset
        // l'app redevient une première ouverture, donc la cinématique est
        // rejouée et le cycle de 8 repart de zéro.
        'flexTimer_launchCount',
        'flexTimer_lastOpen',
      ]);
    } catch {}
    // Le cache mémoire des catégories perso survivrait à la purge du
    // stockage (l'app ne redémarre pas) : on le relit, donc vide.
    await loadCustomCategories();
    await resetAllTimers();
    reset();
    router.replace('/onboarding');
  };

  // Rappel de ce qui aide vraiment (contexte + pièces jointes) AVANT le
  // client mail : une fois dans l'app mail, il est trop tard pour le dire.
  const handleContact = async () => {
    haptic.light();
    if (await loadContactNoticeHidden()) {
      openMail();
      return;
    }
    setContactSheet(true);
  };

  const openMail = async (rememberChoice = false) => {
    if (rememberChoice) setContactNoticeHidden(true);
    const body = [
      'Décris ici ton problème ou ton idée.',
      "N'hésite pas à joindre une photo ou une vidéo : c'est ce qui aide le plus.",
      '',
      '',
      '—',
      `Flex Timer ${APP_VERSION}`,
    ].join('\n');

    try {
      const available = await MailComposer.isAvailableAsync();
      if (available) {
        await MailComposer.composeAsync({
          recipients: [CONTACT_EMAIL],
          subject: 'Flex Timer — contact',
          body,
        });
        return;
      }
    } catch {}
    Linking.openURL(
      `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
        'Flex Timer — contact'
      )}&body=${encodeURIComponent(body)}`
    ).catch(() => {});
  };

  return (
    <GradientBackground colors={['#1A1A1A', '#0A0A0A', '#000000']} ambient>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>PARAMÈTRES</Text>
        </View>

        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path
                d="M9 2L3 7l6 5"
                stroke="#FFFFFF"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
          <Text style={styles.topTitle}>Paramètres</Text>
          <View style={styles.iconBtnGhost} />
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={handlePremiumPress}
            style={({ pressed }) => [
              styles.premiumBanner,
              premiumDenied && styles.premiumBannerDenied,
              pressed && !premiumDenied && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.premiumEmoji}>👑</Text>
            <View style={styles.rowText}>
              <Text style={[styles.premiumTitle, premiumDenied && styles.premiumTitleDenied]}>
                {isPremium ? 'Tu es Pro' : 'Passer Pro'}
              </Text>
              <Text style={styles.premiumSub}>
                Version bêta test — désactivé pour l'instant, disponible dans une prochaine mise à jour.
              </Text>
            </View>
          </Pressable>

          <Section title="Audio et haptique">
            <Row
              label="Sons"
              sub="Décompte, changements de phase et fin de séance"
              control={<Toggle value={settings.sound} onChange={(v) => update('sound', v)} />}
            />
            <Row
              label="Volume"
              sub="Indépendant de ta musique : elle baisse le temps du bip, puis remonte"
              control={
                <Slider
                  value={settings.volume}
                  onChange={(v) => {
                    update('volume', v);
                    // Bip de test au niveau choisi : sans lui, régler le
                    // volume se faisait à l'aveugle (retour utilisateur).
                    previewSound('countdown1', v / 100);
                  }}
                  color="#1FC777"
                  disabled={!settings.sound}
                />
              }
            />
            <Row
              label="Voix du coach"
              sub="Annonce les phases et les tours à voix haute, sans regarder l'écran"
              control={<Toggle value={settings.voiceCoach} onChange={(v) => update('voiceCoach', v)} />}
            />
            <Row
              label="Vibrations"
              sub="Retour haptique sur les actions"
              control={<Toggle value={settings.vibrate} onChange={(v) => update('vibrate', v)} />}
            />
            <Row
              label="Intensité"
              sub="Touche un niveau pour le sentir"
              control={
                <Choice
                  value={settings.vibrateStrength}
                  options={STRENGTH_OPTIONS}
                  onChange={(v) => update('vibrateStrength', v)}
                  color="#9575FF"
                  disabled={!settings.vibrate}
                />
              }
              isLast
            />
          </Section>

          <Section title="Timers">
            <Row
              label="Écran toujours allumé"
              sub="Garde ton téléphone éveillé pendant la séance"
              control={
                <Toggle
                  value={settings.keepScreenOn}
                  onChange={(v) => update('keepScreenOn', v)}
                  color="#FFC933"
                />
              }
              isLast={Platform.OS !== 'android'}
            />
            {Platform.OS === 'android' && (
              <LinkRow
                label="Chrono en arrière-plan"
                sub={
                  batteryOptimized === null
                    ? 'Vérification…'
                    : batteryOptimized
                    ? "Optimisation batterie active — touche pour l'exclure"
                    : 'Exclu de l’optimisation batterie ✓'
                }
                onPress={() => {
                  haptic.light();
                  openBatteryOptimizationSettings();
                }}
                isLast
              />
            )}
          </Section>

          <Section title="Notifications">
            <Row
              label="Rappels quotidiens"
              sub="Pour garder ta streak · bientôt disponible"
              control={<Toggle value={false} onChange={() => {}} disabled />}
              isLast
            />
          </Section>

          <Section title="À propos">
            <LinkRow
              label="Version"
              sub={pending ? '🔴🟡🟢🟣 Mise à jour prête à installer' : `Flex Timer ${APP_VERSION} · build 42`}
              onPress={() => setUpdateSheet(updateCandidate?.mode || 'info')}
            />
            <LinkRow label="Conditions d'utilisation" onPress={() => router.push('/terms')} />
            <LinkRow label="Politique de confidentialité" onPress={() => router.push('/privacy')} />
            <LinkRow
              label="Autorisations"
              sub="Ce que l'app peut te demander, et pourquoi"
              onPress={() => {
                haptic.light();
                router.push('/permissions');
              }}
            />
            <LinkRow label="Contact" sub={CONTACT_EMAIL} onPress={handleContact} isLast />
          </Section>

          {/* TEMP — à retirer avant publication : "console" visuelle pour
              vérifier l'état réel d'EAS Update sur un APK sans ordinateur ni
              Metro (impossible à brancher sur un build standalone). */}
          <Section title="Diagnostic mise à jour (test)">
            <View style={styles.diagBox}>
              <DiagLine label="OTA actif" value={diagnostics.isEnabled ? 'oui' : 'non (dev/Expo Go)'} />
              <DiagLine label="Canal" value={diagnostics.channel || '—'} />
              <DiagLine label="Runtime version" value={diagnostics.runtimeVersion || '—'} />
              <DiagLine label="Version en cours" value={diagnostics.runningUpdateId || '—'} />
              <DiagLine label="Mise à jour prête" value={pending ? 'oui' : 'non'} />
              <DiagLine label="Dernier check" value={STATUS_LABEL[status] || status} />
              {!!lastCheckAt && (
                <DiagLine label="À" value={new Date(lastCheckAt).toLocaleTimeString('fr-FR')} />
              )}
              {!!lastError && <DiagLine label="Erreur" value={lastError} isError />}
            </View>
            <LinkRow
              label="Vérifier maintenant"
              sub="Force un checkForUpdateAsync (voir le résultat ci-dessus)"
              onPress={checkNow}
              isLast
            />
          </Section>

          <Pressable
            onPress={handleResetAll}
            style={({ pressed }) => [
              styles.resetBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.resetText}>Réinitialiser l'application</Text>
          </Pressable>
        </ScrollView>


        {updateSheet && (
          <UpdateSheet
            screenH={screenH}
            mode={updateSheet}
            showHistory
            onRestart={() => {
              if (updateCandidate) markUpdatePopupSeen(updateCandidate.id, updateCandidate.mode);
              restart();
            }}
            onClose={() => {
              if (updateCandidate) markUpdatePopupSeen(updateCandidate.id, updateCandidate.mode);
              setUpdateSheet(null);
            }}
          />
        )}

        {contactSheet && (
          <ContactSheet
            screenH={screenH}
            onOpenMail={openMail}
            onClose={() => setContactSheet(false)}
          />
        )}

        {resetConfirm && (
          <ConfirmSheet
            screenH={screenH}
            title="Réinitialiser l'application"
            body="Tous tes réglages, timers personnalisés, ton planning et l'historique seront supprimés. Cette action est irréversible."
            confirmLabel="Réinitialiser"
            onConfirm={runResetAll}
            onClose={() => setResetConfirm(false)}
          />
        )}

        {legalAccepted === false && <LegalGate onAccept={() => setLegalAcceptedState(true)} />}
      </SafeAreaView>
    </GradientBackground>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, sub, control, isLast }) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <View>{control}</View>
    </View>
  );
}

function LinkRow({ label, sub, onPress, isLast, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        disabled && { opacity: 0.4 },
        pressed && !disabled && { opacity: 0.6 },
      ]}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function DiagLine({ label, value, isError }) {
  return (
    <View style={styles.diagLine}>
      <Text style={styles.diagLabel}>{label}</Text>
      <Text style={[styles.diagValue, isError && styles.diagValueError]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const STRENGTH_OPTIONS = [
  { value: 'light', label: 'LÉGER' },
  { value: 'medium', label: 'MOYEN' },
  { value: 'strong', label: 'FORT' },
];

/**
 * Sélecteur à crans pour un réglage qui n'a que quelques valeurs nommées —
 * un curseur continu laisserait croire à une amplitude libre, alors
 * qu'expo-haptics n'expose que trois styles d'impact.
 * Le tap joue l'intensité choisie : on la sent au moment où on la choisit,
 * plutôt que d'avoir à relancer une séance pour comparer.
 */
function Choice({ value, options, onChange, color = '#FFFFFF', disabled = false }) {
  return (
    <View style={[styles.choiceWrap, disabled && styles.sliderWrapDisabled]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            disabled={disabled}
            onPress={() => {
              onChange(opt.value);
              setHapticStrength(opt.value);
              haptic.medium();
            }}
            style={[
              styles.choiceItem,
              active && { backgroundColor: color, borderColor: color },
            ]}
            hitSlop={4}
          >
            <Text style={[styles.choiceLabel, active && styles.choiceLabelActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Slider({ value, onChange, color = '#FFFFFF', min = 0, max = 100, disabled = false }) {
  const [width, setWidth] = useState(0);

  const handlePress = (e) => {
    if (disabled || !width) return;
    const x = e.nativeEvent.locationX;
    const ratio = Math.max(0, Math.min(1, x / width));
    const newValue = Math.round(min + ratio * (max - min));
    onChange(newValue);
  };

  const percent = ((value - min) / (max - min)) * 100;

  return (
    <View style={[styles.sliderWrap, disabled && styles.sliderWrapDisabled]}>
      <Pressable
        onPress={handlePress}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={styles.sliderTrack}
        hitSlop={8}
        disabled={disabled}
      >
        <View
          style={[
            styles.sliderFill,
            { width: `${percent}%`, backgroundColor: color },
          ]}
        />
      </Pressable>
      <Text style={styles.sliderValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  statusBar: {
    paddingHorizontal: 24,
    paddingTop: 4,
    alignItems: 'center',
  },
  statusText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.55)',
  },

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
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },

  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(240,201,84,0.12)',
    borderColor: 'rgba(240,201,84,0.35)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
  },
  premiumBannerDenied: {
    backgroundColor: 'rgba(255,84,84,0.16)',
    borderColor: 'rgba(255,84,84,0.5)',
  },
  premiumTitleDenied: {
    color: DENY_RED,
  },
  premiumEmoji: {
    fontSize: 26,
  },
  premiumTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: GOLD,
    letterSpacing: -0.2,
  },
  premiumSub: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },

  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionBody: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  rowSub: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 2,
  },
  metaText: {
    fontFamily: fonts.monoRegular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.40)',
  },
  chevron: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    color: 'rgba(255,255,255,0.30)',
  },

  diagBox: {
    padding: 14,
    gap: 8,
  },
  diagLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  diagLabel: {
    fontFamily: fonts.monoRegular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
  diagValue: {
    flex: 1,
    fontFamily: fonts.monoBold,
    fontSize: 11,
    color: '#1FC777',
    textAlign: 'right',
  },
  diagValueError: {
    color: '#FF5454',
  },

  choiceWrap: {
    flexDirection: 'row',
    gap: 6,
  },
  choiceItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  choiceLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.6)',
  },
  choiceLabelActive: {
    color: '#0A0A0A',
  },

  sliderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: 130,
  },
  sliderWrapDisabled: {
    opacity: 0.35,
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 2,
  },
  sliderValue: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    color: '#FFFFFF',
    minWidth: 26,
    textAlign: 'right',
  },

  resetBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  resetText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.40)',
    textTransform: 'uppercase',
  },
});