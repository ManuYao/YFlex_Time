import { useCallback } from 'react';
import { playSound, preloadSound } from '../lib/sounds';

// Les lecteurs et le reglage (volume/actif) vivent dans lib/sounds.js, tenus
// a jour par SettingsContext. Ce hook n'est plus qu'une facade pour les
// ecrans ; il ne cree ni ne detruit rien au montage.
export function useSound() {
  return {
    playCountdown: useCallback((step) => playSound(`countdown${step}`), []),
    playGo: useCallback(() => playSound('go'), []),
    playNextPhase: useCallback((step) => playSound(`next${step}`), []),
    playIntro: useCallback(() => playSound('intro'), []),
    playUpdate: useCallback(() => playSound('update'), []),
    preload: useCallback((key) => preloadSound(key), []),
  };
}
