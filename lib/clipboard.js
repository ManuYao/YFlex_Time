import { Clipboard } from 'react-native';

// Presse-papiers encore fourni par React Native 0.86 (déprécié, retiré un
// jour) : déjà compilé dans l'APK, donc livrable par OTA. À remplacer par
// expo-clipboard au prochain APK.
export function copyToClipboard(text) {
  try {
    Clipboard.setString(String(text));
    return true;
  } catch {
    return false;
  }
}
