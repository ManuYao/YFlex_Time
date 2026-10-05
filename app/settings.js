import { useEffect, useRef, useState } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MailComposer from 'expo-mail-composer';
import Constants from 'expo-constants';

import GradientBackground from '../components/common/GradientBackground';
import AppIcon from '../components/common/AppIcon';
import Button from '../components/common/Button';
import IconButton from '../components/common/IconButton';
import Toggle from '../components/common/Toggle';
import HighlightPulse from '../components/common/HighlightPulse';
import UpdateSheet from '../components/common/UpdateSheet';
import ContactSheet from '../components/common/ContactSheet';
import ConfirmSheet from '../components/common/ConfirmSheet';
import LegalGate from '../components/common/LegalGate';
import CoachSheet, { COACH_STYLES } from '../components/common/CoachSheet';
import { loadContactNoticeHidden, setContactNoticeHidden } from '../lib/contactNotice';
import {
  isBatteryOptimizationEnabled,
  openBatteryOptimizationSettings,
} from '../lib/batteryOptimization';
import { loadLegalAccepted } from '../lib/legalConsent';
import { loadCustomCategories } from '../lib/exercises';
import { useSettings } from '../contexts/SettingsContext';
import { useTimers } from '../contexts/TimersContext';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from '../hooks/usePremium';
import { useOtaUpdate } from '../hooks/useOtaUpdate';
import { markUpdatePopupSeen, resolveUpdateCandidate } from '../lib/updatePopup';
import { haptic, setHapticStrength } from '../hooks/useHaptic';
import { playDenied, playSound, previewVolumeTap } from '../lib/sounds';
import { detectVoices } from '../lib/voiceCoach';
import { fonts } from '../lib/fonts';
import { DANGER, ROUND_SIZE } from '../lib/buttonTokens';

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
const OK_GREEN = '#1FC777';

// Interrupteur caché pour la bêta : 10 appuis d'affilée sur le bandeau Pro
// l'activent ou le désactivent, pour que les testeurs puissent essayer l'app
// des deux côtés (avec et sans les limites TABATA/MIX) et donner un retour
// fiable. « D'affilée » = jamais plus de 2 s entre deux appuis, sinon le
// compte repart de 1. À retirer avec le reste du mode test au passage en
// version officielle (voir « À faire au passage en version officielle »).
const PRO_TOGGLE_TAPS = 10;
const PRO_TOGGLE_MAX_GAP_MS = 2000;
const PRO_TOGGLE_FEEDBACK_MS = 2200;

export default function Settings() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { settings, update, reset } = useSettings();
  const { resetAll: resetAllTimers } = useTimers();
  const { isPremium, setIsPremium } = usePremium();
  const { user, signOut, deleteAccount } = useAuth();
  const [premiumDenied, setPremiumDenied] = useState(false);
  // null | 'on' | 'off' — confirmation brève après le 10e appui.
  const [premiumToggled, setPremiumToggled] = useState(null);
  const premiumTaps = useRef({ count: 0, last: 0 });
  const premiumTimers = useRef([]);
  useEffect(() => {
    const timers = premiumTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);
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
  // Suppression du compte en ligne (section « Compte », visible seulement si
  // on est connecté).
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [accountDeleted, setAccountDeleted] = useState(false);
  const [accountError, setAccountError] = useState(null);
  // Fenêtre « Ton coach » (style de parole, voix…). Le choix Homme/Femme
  // n'y apparaît que si le téléphone a une vraie voix d'homme en français
  // (lib/voiceCoach.js, detectVoices) — sinon voix femme, sans option.
  const [coachSheet, setCoachSheet] = useState(false);
  const [maleVoiceAvailable, setMaleVoiceAvailable] = useState(false);
  // Surbrillance brève de la ligne "Voix du coach" (app/home.js,
  // CoachNudgeSheet -> router.push avec ce param) — un seul passage par
  // montage de l'écran : si l'utilisateur quitte avant la fin, l'écran se
  // démonte et HighlightPulse s'arrête avec lui, sans jamais reprendre.
  const [highlightVoiceCoach, setHighlightVoiceCoach] = useState(false);
  useEffect(() => {
    if (params.highlight !== 'voiceCoach') return undefined;
    const t = setTimeout(() => setHighlightVoiceCoach(true), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!settings.voiceCoach) return undefined;
    let alive = true;
    detectVoices()
      .then((r) => { if (alive) setMaleVoiceAvailable(r.male); })
      .catch(() => {});
    return () => { alive = false; };
  }, [settings.voiceCoach]);
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
  // /premium, juste un refus visuel + haptique clair. Sauf au 10e appui
  // d'affilée : là, on bascule le mode Pro de test (voir PRO_TOGGLE_TAPS).
  const handlePremiumPress = () => {
    const now = Date.now();
    const taps = premiumTaps.current;
    taps.count = now - taps.last > PRO_TOGGLE_MAX_GAP_MS ? 1 : taps.count + 1;
    taps.last = now;

    if (taps.count >= PRO_TOGGLE_TAPS) {
      taps.count = 0;
      const next = !isPremium;
      setIsPremium(next);
      playSound('achievement');
      if (next) haptic.success();
      else haptic.warning();
      setPremiumDenied(false);
      setPremiumToggled(next ? 'on' : 'off');
      premiumTimers.current.push(
        setTimeout(() => setPremiumToggled(null), PRO_TOGGLE_FEEDBACK_MS)
      );
      return;
    }

    haptic.error();
    playDenied();
    setPremiumDenied(true);
    premiumTimers.current.push(setTimeout(() => setPremiumDenied(false), 350));
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
        'flexTimer_historyDeleted',
        'flexTimer_namePrompted',
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
        'flexTimer_shareOnboarded',
        // Popup de découverte du coach vocal (lib/coachNudge.js) : redevient
        // proposable après un reset, comme les autres rappels ci-dessus.
        'flexTimer_coachNudge',
        // Tutoriel de démarrage (lib/tutorial.js) : après un reset la personne
        // repart de zéro, le pop-up qui le propose peut revenir.
        'flexTimer_tutorial',
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
    // Le compte (connexion optionnelle) n'est pas stocké dans les clés
    // ci-dessus : sans ça, un reset complet laisserait une session Supabase
    // active alors que tout le reste est reparti de zéro.
    await signOut();
    router.replace('/onboarding');
  };

  const handleDeleteAccount = () => {
    haptic.light();
    setAccountError(null);
    setDeleteConfirm(true);
  };

  const runDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      haptic.success();
      setAccountDeleted(true);
    } catch (e) {
      haptic.error();
      setAccountError(e?.message || "Impossible de supprimer le compte pour l'instant.");
    } finally {
      setDeletingAccount(false);
    }
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
          <IconButton
            icon="back"
            haptic={haptic.light}
            onPress={() => router.back()}
            accessibilityLabel="Retour"
          />
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
              premiumToggled && styles.premiumBannerToggled,
              pressed && !premiumDenied && { opacity: 0.85 },
            ]}
          >
            <AppIcon name="crown" size={26} color={GOLD} />
            <View style={styles.rowText}>
              <Text
                style={[
                  styles.premiumTitle,
                  premiumDenied && styles.premiumTitleDenied,
                  premiumToggled && styles.premiumTitleToggled,
                ]}
              >
                {isPremium ? 'Tu es Pro' : 'Passer Pro'}
              </Text>
              <Text style={styles.premiumSub}>
                {premiumToggled === 'on'
                  ? 'Mode Pro de test activé.'
                  : premiumToggled === 'off'
                    ? 'Mode Pro de test désactivé.'
                    : isPremium
                      ? 'Mode Pro de test actif — 10 appuis d\'affilée sur ce bandeau pour le désactiver.'
                      : "Version bêta test — pas encore disponible. Pour essayer le mode Pro : 10 appuis d'affilée sur ce bandeau."}
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
                    // Cycle 3-2-1-GO-fin à chaque tap, voir previewVolumeTap.
                    previewVolumeTap(v / 100);
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
              highlight={highlightVoiceCoach}
            />
            {settings.voiceCoach && (
              <LinkRow
                label="Personnaliser le coach"
                sub={coachSummary(settings, maleVoiceAvailable)}
                onPress={() => {
                  haptic.light();
                  setCoachSheet(true);
                }}
              />
            )}
            <Row
              label="Vibrations"
              sub="Retour haptique sur les actions"
              control={<Toggle value={settings.vibrate} onChange={(v) => update('vibrate', v)} />}
              isLast={!settings.vibrate}
            />
            {settings.vibrate && (
            <Row
              label="Intensité"
              sub="Touche un niveau pour le sentir"
              control={
                <Choice
                  value={settings.vibrateStrength}
                  options={STRENGTH_OPTIONS}
                  onChange={(v) => update('vibrateStrength', v)}
                  onSelect={setHapticStrength}
                  color="#9575FF"
                />
              }
              isLast
            />
            )}
          </Section>

          <Section title="Timers">
            <Row
              label="Mode pluie"
              sub={RAIN_SUBS[settings.rainMode] || RAIN_SUBS.normal}
              control={
                <Choice
                  value={settings.rainMode || 'normal'}
                  options={RAIN_OPTIONS}
                  onChange={(v) => update('rainMode', v)}
                  color="#4A90FF"
                />
              }
            />
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

          {(user || accountDeleted) && (
            <Section title="Compte">
              {user ? (
                <>
                  <Row label="Connecté" sub={user.email} />
                  <LinkRow
                    label="Supprimer mon compte"
                    sub={accountError || 'Efface ton compte, ton historique en ligne et tes mixes publiés'}
                    subStyle={accountError ? styles.rowSubError : null}
                    danger
                    disabled={deletingAccount}
                    onPress={handleDeleteAccount}
                    isLast
                  />
                </>
              ) : (
                <Row
                  label="Compte supprimé"
                  sub="Ton compte et tes données en ligne ont été effacés. Les données de ce téléphone restent."
                  isLast
                />
              )}
            </Section>
          )}

          <Section title="À propos">
            <LinkRow
              label="Version"
              sub={pending ? 'Mise à jour prête à installer' : `Flex Timer ${APP_VERSION} · build 42`}
              subPrefix={pending ? <ModeDots /> : null}
              onPress={() => setUpdateSheet(updateCandidate?.mode || 'info')}
            />
            <LinkRow
              label="Revoir le tutoriel"
              sub="Le tour guidé, en 2 minutes"
              onPress={() => {
                haptic.light();
                router.push({ pathname: '/tutorial', params: { step: 'menu' } });
              }}
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

          {/* Action destructive : lien texte en rouge (DANGER), comme
              « Supprimer ce bloc » dans BlockSheet. La vibration vient de
              handleResetAll (une seule). */}
          <Button
            variant="ghost"
            size="md"
            label="Réinitialiser l'application"
            labelStyle={styles.resetLabel}
            onPress={handleResetAll}
            style={styles.resetBtn}
          />
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

        {coachSheet && (
          <CoachSheet
            screenH={screenH}
            style={settings.voiceStyle}
            gender={settings.voiceGender}
            maleVoiceAvailable={maleVoiceAvailable}
            onChangeStyle={(v) => update('voiceStyle', v)}
            onChangeGender={(v) => update('voiceGender', v)}
            onClose={() => setCoachSheet(false)}
          />
        )}

        {resetConfirm && (
          <ConfirmSheet
            screenH={screenH}
            title="Réinitialiser l'application"
            body={
              "Tous tes réglages, timers personnalisés, ton planning et l'historique seront supprimés. Cette action est irréversible." +
              (user
                ? " Ton compte en ligne et les données synchronisées ne sont pas supprimés : pour cela, utilise « Supprimer mon compte »."
                : '')
            }
            confirmLabel="Réinitialiser"
            onConfirm={runResetAll}
            onClose={() => setResetConfirm(false)}
          />
        )}

        {deleteConfirm && (
          <ConfirmSheet
            screenH={screenH}
            title="Supprimer mon compte"
            body="Ton compte, ton historique synchronisé, tes mixes publiés, tes notes et tes signalements seront effacés définitivement. Les données de ce téléphone ne sont pas touchées. Cette action est irréversible."
            confirmLabel="Supprimer"
            onConfirm={runDeleteAccount}
            onClose={() => setDeleteConfirm(false)}
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

function Row({ label, sub, control, isLast, highlight }) {
  const content = (
    <>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <View>{control}</View>
    </>
  );
  // HighlightPulse seulement pour la ligne qui en a besoin — les dizaines
  // d'autres Row de cet écran gardent le View simple, sans le coût d'un
  // shared value Reanimated par ligne pour rien.
  if (highlight !== undefined) {
    return (
      <HighlightPulse active={highlight} style={[styles.row, !isLast && styles.rowBorder]}>
        {content}
      </HighlightPulse>
    );
  }
  return <View style={[styles.row, !isLast && styles.rowBorder]}>{content}</View>;
}

// Les quatre couleurs des modes en pastilles dessinées (plus d'emojis ronds,
// dont les teintes changeaient d'un téléphone à l'autre).
const MODE_DOT_COLORS = ['#FF5454', '#FFC933', '#1FC777', '#9575FF'];

function ModeDots() {
  return (
    <View style={styles.modeDots}>
      {MODE_DOT_COLORS.map((c) => (
        <View key={c} style={[styles.modeDot, { backgroundColor: c }]} />
      ))}
    </View>
  );
}

function LinkRow({ label, sub, subPrefix, subStyle, danger, onPress, isLast, disabled }) {
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
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {!!sub &&
          (subPrefix ? (
            <View style={styles.subRow}>
              {subPrefix}
              <Text style={[styles.rowSub, styles.subRowText]}>{sub}</Text>
            </View>
          ) : (
            <Text style={[styles.rowSub, subStyle]}>{sub}</Text>
          ))}
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

const RAIN_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'soft', label: 'Pluie' },
  { value: 'storm', label: 'Orage' },
];
const RAIN_SUBS = {
  normal: 'Mains sèches : un appui suffit partout dans les chronos',
  soft: 'Quitter, reset et passer se maintiennent (2 s) : pas de faux appui',
  storm: 'Tout se maintient dans les chronos, lancement et pause compris',
};
const STRENGTH_OPTIONS = [
  { value: 'light', label: 'LÉGER' },
  { value: 'medium', label: 'MOYEN' },
  { value: 'strong', label: 'FORT' },
];

// Résumé affiché sous « Personnaliser le coach » : ce qu'on entendra.
const coachSummary = (settings, maleVoiceAvailable) => {
  const style = COACH_STYLES.find((s) => s.value === settings.voiceStyle) ?? COACH_STYLES[0];
  if (!maleVoiceAvailable) return style.label;
  return `${style.label} · voix ${settings.voiceGender === 'male' ? 'homme' : 'femme'}`;
};

/**
 * Sélecteur à crans pour un réglage qui n'a que quelques valeurs nommées —
 * un curseur continu laisserait croire à une amplitude libre, alors
 * qu'expo-haptics n'expose que trois styles d'impact.
 * Le tap joue l'intensité choisie : on la sent au moment où on la choisit,
 * plutôt que d'avoir à relancer une séance pour comparer.
 */
function Choice({ value, options, onChange, onSelect, color = '#FFFFFF', disabled = false }) {
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
              // `onSelect` est l'effet immédiat propre à CE réglage (ex.
              // setHapticStrength pour l'intensité des vibrations) — ne
              // jamais le coder en dur ici : ce composant est réutilisé pour
              // d'autres choix (voix du coach…) qui n'ont rien à voir avec
              // les vibrations.
              onSelect?.(opt.value);
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
  // Même largeur que le bouton retour (ROUND_SIZE.nav) : garde le titre centré.
  iconBtnGhost: { width: ROUND_SIZE.nav, height: ROUND_SIZE.nav },
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
  premiumBannerToggled: {
    backgroundColor: 'rgba(31,199,119,0.16)',
    borderColor: 'rgba(31,199,119,0.5)',
  },
  premiumTitleToggled: {
    color: OK_GREEN,
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
  rowLabelDanger: {
    color: DANGER,
  },
  rowSub: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 2,
  },
  rowSubError: {
    color: DANGER,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 3,
  },
  subRowText: {
    marginTop: 0,
    flexShrink: 1,
  },
  modeDots: {
    flexDirection: 'row',
    gap: 3,
  },
  modeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
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
    marginTop: 8,
  },
  resetLabel: {
    color: DANGER,
  },
});