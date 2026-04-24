import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function Countdown() {
  const router = useRouter();
  const { timerId } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Countdown (stub)</Text>
      <Text style={styles.subtitle}>Timer: {timerId}</Text>
      <Pressable style={styles.btn} onPress={() => router.back()}>
        <Text style={styles.btnText}>Retour</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { color: '#FFF', fontSize: 32, fontWeight: '800', marginBottom: 12 },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 32 },
  btn: {
    borderColor: 'rgba(255,255,255,0.35)',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 999,
  },
  btnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
