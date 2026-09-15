import { useEffect, useState } from 'react';
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
import UpdateGate from '../components/common/UpdateGate';
import LaunchSplash from '../components/common/LaunchSplash';
import { shouldShowSplash, markSplashShown, onSplashRequest } from '../lib/splash';
import { TimersProvider } from '../contexts/TimersContext';
import { SettingsProvider } from '../contexts/SettingsContext';

setAudioModeAsync({
  playsInSilentMode: true,
  shouldPlayInBackground: false,
  shouldRouteThroughEarpiece: false,
  interruptionMode: 'mixWithOthers',
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

  useEffect(() => {
    let cancelled = false;
    shouldShowSplash().then((show) => {
      if (cancelled) return;
      if (show) markSplashShown();
      setSplash(show ? 'show' : 'hide');
    });
    const unsubscribe = onSplashRequest(() => setSplash('show'));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

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
                <Stack.Screen
                  name="session-detail"
                  options={{ animation: 'fade' }}
                />
                <Stack.Screen name="day-archives" options={{ animation: 'fade' }} />
                <Stack.Screen name="archive-detail" options={{ animation: 'fade' }} />
              </Stack>
              <UpdateGate />
              <GrainOverlay opacity={0.06} tint="#FFFFFF" />
              {splash === 'pending' && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 1000, backgroundColor: '#000000' }]} />
              )}
              {splash === 'show' && <LaunchSplash onDone={() => setSplash('hide')} />}
            </View>
          </TimersProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
