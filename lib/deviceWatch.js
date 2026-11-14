import { AppState } from 'react-native';

import {
  getNativeStats,
  isNativeMemoryAvailable,
  supportsNativeEvents,
  subscribeDeviceEvents,
} from './nativeMemory';
import { restoreBatteryEco, feedBattery } from './batteryEco';
import { feedHeat, applyLightPending } from './lightMode';

// Surveillance du téléphone, au premier plan seulement. Elle alimente l'économie de batterie
// (batterie + mode économie d'énergie du téléphone) et le mode allégé (chauffe).
//
// APK récent : on ÉCOUTE le système (changement de batterie, de mode économie d'énergie, de
// statut thermique) au lieu de la lire à la minute : zéro lecture tant que rien ne bouge.
// Ancien APK avec la sonde seule : relevé complet toutes les 60 s (secours). Sans module
// natif (Expo Go, iOS) : rien n'est lu, rien ne change.
// Ne rien changer à l'écran à la lecture : c'est applyLightPending (changement d'écran) qui
// applique, jamais cette surveillance.

const POLL_MS = 60 * 1000;
// Les décisions « dans le temps » (retour des décors après 3 min à 25 %, fin de chauffe après
// 10 min) ont besoin d'une relecture même si plus aucun événement n'arrive : UN seul rappel
// unique, jamais une boucle.
const RECHECK_MS = 3 * 60 * 1000 + 1000;

let started = false;
let sampling = false;

// Dernières valeurs connues (les événements n'en portent qu'une partie).
let last = { batteryPct: null, batteryTempC: null, isPowerSaveMode: false, thermalStatus: null };

function feedAll() {
  if (last.batteryPct != null) feedBattery(last.batteryPct, Date.now(), last.isPowerSaveMode === true);
  feedHeat({ thermalStatus: last.thermalStatus, batteryTempC: last.batteryTempC });
}

async function sample() {
  if (sampling) return;
  sampling = true;
  try {
    const stats = await getNativeStats();
    if (!stats) return;
    last = {
      batteryPct: stats.batteryPct,
      batteryTempC: stats.batteryTempC,
      isPowerSaveMode: stats.isPowerSaveMode === true,
      thermalStatus: stats.thermalStatus,
    };
    feedAll();
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
  const events = supportsNativeEvents();
  await sample(); // premier état, tout de suite
  // Au démarrage l'écran n'a encore rien montré : on applique tout de suite.
  applyLightPending();

  let timer = null; // secours : relevé à la minute (ancien APK)
  let recheck = null; // rappel unique
  let unsubscribe = null;

  const scheduleRecheck = () => {
    if (recheck != null) clearTimeout(recheck);
    recheck = setTimeout(() => {
      recheck = null;
      feedAll();
    }, RECHECK_MS);
  };

  const onDevice = (e) => {
    last = {
      ...last,
      batteryPct: e.batteryPct != null ? e.batteryPct : last.batteryPct,
      batteryTempC: e.batteryTempC != null ? e.batteryTempC : last.batteryTempC,
      isPowerSaveMode: e.isPowerSaveMode != null ? e.isPowerSaveMode === true : last.isPowerSaveMode,
    };
    feedAll();
    scheduleRecheck();
  };
  const onThermal = (e) => {
    if (e.thermalStatus != null) last = { ...last, thermalStatus: e.thermalStatus };
    feedAll();
    scheduleRecheck();
  };

  const start = () => {
    if (events) {
      if (!unsubscribe) unsubscribe = subscribeDeviceEvents(onDevice, onThermal);
    } else if (timer == null) {
      timer = setInterval(sample, POLL_MS);
    }
  };
  const stop = () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    if (timer != null) {
      clearInterval(timer);
      timer = null;
    }
    if (recheck != null) {
      clearTimeout(recheck);
      recheck = null;
    }
  };

  // En arrière-plan on coupe tout (le natif retire ses récepteurs) ; au retour, l'écoute
  // reprend avec un état frais (le natif renvoie l'état courant dès qu'on l'écoute).
  if (AppState.currentState === 'active') start();
  AppState.addEventListener('change', (s) => {
    if (s === 'active') {
      if (!events) sample();
      start();
    } else {
      stop();
    }
  });
}
