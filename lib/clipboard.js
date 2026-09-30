import * as Clipboard from 'expo-clipboard';

// Copie un texte dans le presse-papiers avec expo-clipboard (module natif,
// dans l'APK depuis la v16.0.0 : il remplace le Clipboard déprécié de React
// Native). Asynchrone : attendre le résultat avant d'afficher « Lien copié ».
// Renvoie false si la copie a échoué.
export async function copyToClipboard(text) {
  try {
    const ok = await Clipboard.setStringAsync(String(text));
    return ok !== false;
  } catch {
    return false;
  }
}
