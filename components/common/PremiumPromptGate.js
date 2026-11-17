import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MiniToast from './MiniToast';
import { haptic } from '../../hooks/useHaptic';
import { onPremiumPrompt } from '../../lib/premiumPrompt';

// Pop-up Premium commun, monté une seule fois à la racine (comme LibraryLimitGate).
// Même message que celui du Planning : couronne, deux ou trois mots qui disent CE qui
// est réservé (« Format Premium », sans expliquer le reste), « Voir Premium » ouvre la
// page Premium.
// Il se retire tout seul ; un nouveau refus remplace le message affiché.
const SHOW_MS = 3600;
// Posé AU-DESSUS de la rangée de boutons du bas (56 dp + marge) : le bouton que la
// personne vient de toucher reste visible et atteignable.
const ABOVE_BOTTOM = 84;
const LAYER_H = 64;

export default function PremiumPromptGate() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = useState(null);
  const timer = useRef(null);

  useEffect(
    () =>
      onPremiumPrompt((next) => {
        clearTimeout(timer.current);
        setPrompt(next);
        timer.current = setTimeout(() => setPrompt(null), SHOW_MS);
      }),
    []
  );
  useEffect(() => () => clearTimeout(timer.current), []);

  const openPremium = useCallback(() => {
    haptic.selection();
    clearTimeout(timer.current);
    setPrompt(null);
    router.push('/premium');
  }, [router]);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.layer, { bottom: insets.bottom + ABOVE_BOTTOM }]}
    >
      {!!prompt && (
        <MiniToast
          key={prompt.id}
          text={prompt.text}
          icon="crown"
          actionLabel="Voir Premium"
          onAction={openPremium}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: LAYER_H,
    zIndex: 120,
  },
});
