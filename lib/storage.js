import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async get(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};
