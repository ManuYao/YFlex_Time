import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Onboarding() {
  const router = useRouter();

  const handleFinish = async () => {
    await AsyncStorage.setItem('flexTimer_onboarded', '1');
    router.replace('/home');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Flex Timer</Text>
      <Text style={styles.subtitle}>Onboarding (stub)</Text>
      <Pressable style={styles.cta} onPress={handleFinish}>
        <Text style={styles.ctaText}>Commencer</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 12,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    marginBottom: 40,
  },
  cta: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
  },
  ctaText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});
