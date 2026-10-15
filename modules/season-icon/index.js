import { requireOptionalNativeModule } from 'expo';

// Icône de l'application (module natif Android, voir plugins/withSeasonIcons.js).
// Sans le module (ancien APK, Expo Go, iOS) : tout est ignoré sans erreur.
const Native = requireOptionalNativeModule('SeasonIcon');

export const getSeasonIcon = () => {
  try {
    return Native ? Native.getIcon() : null;
  } catch {
    return null;
  }
};

export const setSeasonIcon = (name) => {
  try {
    return Native ? !!Native.setIcon(name) : false;
  } catch {
    return false;
  }
};
