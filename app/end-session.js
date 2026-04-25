import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { TIMERS } from '../lib/timers-config';
import { formatDuration } from '../lib/formatters';
import { fonts } from '../lib/fonts';

export default function EndSession() {
  const router = useRouter();
  const { timerId, elapsed } = useLocalSearchParams();
  const timer = TIMERS.find((t) => t.id === timerId);
  const elapsedNum = Number(elapsed) || 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text style={styles.tag}>SÉANCE TERMINÉE</Text>
        <Text style={[styles.bravo, { color: timer?.color || '#FFFFFF' }]}>
          BRAVO
        </Text>
        <Text style={styles.timerName}>{timer?.name ?? '—'}</Text>
        <Text style={styles.duration}>{formatDuration(elapsedNum)}</Text>
        <Text style={styles.subtitle}>Stub V1 — l'écran complet arrive</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.btnSecondary}
          onPress={() => router.replace('/home')}
        >
          <Text style={styles.btnSecondaryText}>Accueil</Text>
        </Pressable>
        <Pressable
          style={[styles.btnPrimary, { backgroundColor: timer?.color || '#FFFFFF' }]}
          onPress={() =>
            router.replace({ pathname: '/countdown', params: { timerId } })
          }
        >
          <Text
            style={[
              styles.btnPrimaryText,
              { color: timer?.textMode === 'dark' ? '#0A0A0A' : '#FFFFFF' },
            ]}
          >
            Refaire
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000000' },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  tag: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  bravo: {
    fontFamily: fonts.display,
    fontSize: 92,
    letterSpacing: -4,
    lineHeight: 92,
    includeFontPadding: false,
    marginBottom: 24,
  },
  timerName: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  duration: {
    fontFamily: fonts.monoExtraBold,
    fontSize: 48,
    color: '#FFFFFF',
    letterSpacing: -2,
    marginBottom: 32,
  },
  subtitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  btnSecondary: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    color: '#FFFFFF',
    fontFamily: fonts.sansBold,
    fontSize: 14,
  },
  btnPrimary: {
    flex: 1.4,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
  },
});
