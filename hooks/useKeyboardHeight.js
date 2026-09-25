import { TextInput } from 'react-native';
import { useAnimatedKeyboard } from 'react-native-reanimated';

// Seul point d'entrée vers useAnimatedKeyboard. Sans ces deux options,
// Reanimated repasse la fenêtre en mode « non bord à bord » quand le dernier
// abonné se désabonne (WindowsInsetsManager.kt) : tout l'écran sauterait à la
// fermeture d'une feuille. Avec elles, la hauteur va du bas de l'écran au
// haut du clavier.
// Ne marche que dans la fenêtre principale : dans une <Modal>, Android
// n'envoie ni les événements du clavier ni ses insets à React Native.
const OPTIONS = {
  isStatusBarTranslucentAndroid: true,
  isNavigationBarTranslucentAndroid: true,
};

export function useKeyboardHeight() {
  return useAnimatedKeyboard(OPTIONS).height;
}

// Fait défiler `scrollRef` pour amener le champ en cours de saisie en haut de
// la zone visible. `contentRef` = la vue qui enveloppe le contenu du ScrollView
// (collapsable={false}), repère de la mesure.
export function scrollToFocusedInput(scrollRef, contentRef, offset = 24) {
  const input = TextInput.State.currentlyFocusedInput();
  if (!input || !scrollRef.current || !contentRef.current) return;
  try {
    input.measureLayout(
      contentRef.current,
      (x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - offset), animated: true }),
      () => {}
    );
  } catch {}
}
