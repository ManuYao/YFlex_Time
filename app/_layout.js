import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import {
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
  InterTight_800ExtraBold,
} from '@expo-google-fonts/inter-tight';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
  JetBrainsMono_800ExtraBold,
} from '@expo-google-fonts/jetbrains-mono';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync } from 'expo-audio';

import GrainOverlay from '../components/common/GrainOverlay';
import LaunchSplash from '../components/common/LaunchSplash';
import UpdateGate from '../components/common/UpdateGate';
import APKBlockedScreen from '../components/common/APKBlockedScreen';
import MaintenanceBanner from '../components/common/MaintenanceBanner';
import MaintenanceScreen from '../components/common/MaintenanceScreen';
import { useAPKCheck } from '../hooks/useAPKCheck';
import { useOtaUpdate } from '../hooks/useOtaUpdate';
import { shouldShowSplash, markSplashShown, markSplashCleared, onSplashRequest } from '../lib/splash';
import { loadCustomCategories } from '../lib/exercises';
import { registerTimerNotification } from '../lib/timerNotification';
import { TimersProvider } from '../contexts/TimersContext';
import { SettingsProvider } from '../contexts/SettingsContext';

// Hydrate le cache des catégories perso avant que le premier écran du
// planning ne rende ses chips : getCategory() est synchrone et lit ce cache.
loadCustomCategories().catch(() => {});

// Service de premier plan + handlers des boutons de la notification de
// séance : doivent exister dès le chargement du bundle, avant tout écran.
registerTimerNotification();

setAudioModeAsync({
  playsInSilentMode: true,
  // Les bips de phase doivent sonner écran éteint : le service de premier
  // plan garde le processus vivant, expo-audio ne doit plus couper les
  // lecteurs au passage en arrière-plan. Aucune notification média n'est
  // créée pour autant (elle n'apparaît qu'avec des commandes d'écran de
  // verrouillage, jamais demandées ici).
  shouldPlayInBackground: true,
  shouldRouteThroughEarpiece: false,
  // duckOthers, pas mixWithOthers : un bip superpose a de la musique a fort
  // volume est inaudible. Avec le ducking, l'app demande le focus audio et le
  // lecteur de l'utilisateur baisse tout seul pendant le bip, puis remonte —
  // le reglage Volume des Parametres ne pilote que nos propres lecteurs, donc
  // les deux volumes restent independants.
  interruptionMode: 'duckOthers',
}).catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Anton_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
    InterTight_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
    JetBrainsMono_800ExtraBold,
  });

  // 'pending' : on masque tout en noir le temps de lire AsyncStorage, sinon
  // le Home apparaîtrait une fraction de seconde avant le splash.
  const [splash, setSplash] = useState('pending');

  // Vérification d'APK distante (Gist) : mise à jour obligatoire ou
  // maintenance annoncée. Indépendante de l'OTA (voir lib/apkVersionCheck.js).
  // Tant qu'elle n'a pas répondu, tout est à false : l'app démarre
  // normalement, la vérification ne retarde jamais l'affichage.
  const apk = useAPKCheck();
  const ota = useOtaUpdate();
  const [bannerClosed, setBannerClosed] = useState(false);
  // Le splash (zIndex 1000) recouvre entièrement le bandeau (150) et la page
  // (900) de maintenance : sans ce garde-fou, ils se montent et jouent leur
  // animation d'entrée CACHÉS derrière, et n'apparaissent qu'une fois déjà
  // figés à leur état final quand le splash se retire — d'où l'impression de
  // "pas de halo" puis "ça disparaît" (c'est le splash qui se ferme, pas
  // eux). Une fois passé à true, ça ne redevient jamais false : si
  // `onSplashRequest` rejoue le splash plus tard (redémarrage OTA), il ne
  // doit pas re-masquer une page déjà affichée entre-temps.
  const [splashCleared, setSplashCleared] = useState(false);

  useEffect(() => {
    let cancelled = false;
    shouldShowSplash().then((show) => {
      if (cancelled) return;
      if (show) markSplashShown();
      setSplash(show ? 'show' : 'hide');
      if (!show) {
        setSplashCleared(true);
        markSplashCleared();
      }
    });
    const unsubscribe = onSplashRequest(() => setSplash('show'));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Refetch du Gist quand un nouvel OTA arrive (une nouvelle version a été
  // téléchargée ou appliquée). Cela vérifie si la maintenance ou le blocage
  // forcé est toujours actuel, ou si l'état a changé entre le lancement et
  // l'arrivée de l'OTA.
  const lastOtaIdRef = useRef(null);
  useEffect(() => {
    const currentOtaId = ota.updateId || ota.runningUpdateId;
    if (currentOtaId && currentOtaId !== lastOtaIdRef.current) {
      // OTA détecté : refetch du Gist
      apk.recheck();
      lastOtaIdRef.current = currentOtaId;
    }
  }, [ota.updateId, ota.runningUpdateId, apk]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <TimersProvider>
            <View style={{ flex: 1 }}>
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'fade',
                  animationDuration: 250,
                  contentStyle: { backgroundColor: '#0A0A0A' },
                }}
              >
                <Stack.Screen name="index" options={{ animation: 'fade' }} />
                <Stack.Screen name="home" options={{ animation: 'fade' }} />
                <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
                <Stack.Screen
                  name="countdown"
                  options={{ animation: 'fade', animationDuration: 300 }}
                />
                <Stack.Screen
                  name="running"
                  options={{ animation: 'fade', animationDuration: 350 }}
                />
                <Stack.Screen
                  name="end-session"
                  options={{ animation: 'fade', animationDuration: 400 }}
                />
                <Stack.Screen name="settings" options={{ animation: 'fade' }} />
                <Stack.Screen name="terms" options={{ animation: 'fade' }} />
                <Stack.Screen name="privacy" options={{ animation: 'fade' }} />
                <Stack.Screen name="history" options={{ animation: 'fade' }} />
                <Stack.Screen name="mix-builder" options={{ animation: 'fade' }} />
                <Stack.Screen name="import-mix" options={{ animation: 'fade' }} />
                <Stack.Screen
                  name="session-detail"
                  options={{ animation: 'fade' }}
                />
                <Stack.Screen name="day-archives" options={{ animation: 'fade' }} />
                <Stack.Screen name="archive-detail" options={{ animation: 'fade' }} />
              </Stack>
              <UpdateGate />

              {splashCleared && !apk.isBlockedByForcedUpdate && apk.isMaintenance && !bannerClosed && (
                <MaintenanceBanner
                  message={apk.maintenanceMessage}
                  onPress={apk.openMaintenanceScreen}
                  onDismiss={() => setBannerClosed(true)}
                />
              )}
              {splashCleared && !apk.isBlockedByForcedUpdate && apk.showMaintenanceScreen && (
                <MaintenanceScreen
                  message={apk.maintenanceMessage}
                  onClose={apk.dismissMaintenanceScreen}
                />
              )}

              <GrainOverlay opacity={0.06} tint="#FFFFFF" />
              {splash === 'pending' && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 1000, backgroundColor: '#000000' }]} />
              )}
              {splash === 'show' && (
                <LaunchSplash
                  onDone={() => {
                    setSplash('hide');
                    setSplashCleared(true);
                    markSplashCleared();
                  }}
                />
              )}

              {/* En dernier, et au zIndex le plus haut : rien ne doit passer
                  au-dessus du blocage, pas même la cinématique de démarrage. */}
              {apk.isBlockedByForcedUpdate && (
                <APKBlockedScreen
                  message={apk.forcedUpdateMessage}
                  downloadUrl={apk.downloadUrl}
                  currentVersion={apk.currentVersion}
                  minVersion={apk.minVersion}
                />
              )}
            </View>
          </TimersProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
