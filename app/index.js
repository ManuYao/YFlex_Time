import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const onboarded = await AsyncStorage.getItem('flexTimer_onboarded');
      router.replace(onboarded ? '/home' : '/onboarding');
    })();
  }, []);

  return <View style={{ flex: 1, backgroundColor: '#000000' }} />;
}
