import { AppState } from 'react-native';

import { getNativeStats, isNativeMemoryAvailable } from './nativeMemory';
import { restoreBatteryEco, feedBattery } from './batteryEco';
import { feedHeat, applyLightPending } from './lightMode';

// Surveillance du téléphone : UN seul relevé natif (PerfProbe, APK 18.6.0+) par minute, au
// premier plan, qui alimente à la fois l'économie de batterie (batterie) et le mode allégé
// (chauffe). Sans le module natif (ancien APK, iOS) : rien n'est lu, rien ne change.
// Ne rien changer à l'écran à la lecture : c'est applyLightPending (changement d'écran) qui
// applique, jamais cette surveillance.

const POLL_MS = 60 * 1000;

let started = false;
let sampling = false;

async function sample() {
  if (sampling) return;
  sampling = true;
  try {
    const stats = await getNativeStats();
    if (!stats) return;
    feedBattery(stats.batteryPct);
    feedHeat(stats);
  } finally {
    sampling = false;
  }
}

/** Démarre la surveillance (une seule fois, au lancement de l'app). */
export async function startDeviceWatch() {
  if (started) return;
  started = true;
  if (!isNativeMemoryAvailable()) return;
  await restoreBatteryEco();
  await sample();
  // Au démarrage l'écran n'a encore rien montré : on applique tout de suite.
  applyLightPending();
  setInterval(sample, POLL_MS);
  AppState.addEventListener('change', (s) => {
    if (s === 'active') sample();
  });
}
