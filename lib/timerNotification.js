// Notification persistante du chrono de séance (Android uniquement).
//
// Un service de premier plan Notifee garde le processus JS vivant quand
// l'app passe en arrière-plan ou que l'écran s'éteint : le moteur de timer
// (Date.now(), hooks/useTimer.js) continue donc de tourner tel quel, rien
// n'est dupliqué côté natif. La notification affiche la phase, le temps
// restant et des boutons Pause / Reprendre / Passer / Stop ; un tap dessus
// ramène sur l'écran Running (la Stack n'a jamais été démontée).
//
// Deux sources pour le temps affiché :
//   - le corps du texte, réécrit chaque seconde par app/running.js (même
//     valeur que le gros chiffre à l'écran) ;
//   - le chronomètre natif Android (`showChronometer`), rendu par le système
//     lui-même, qui continue de défiler même si le JS venait à être ralenti.
// Le service tourne en `specialUse` (voir plugins/withTimerForegroundService.js).
import { Platform } from 'react-native';

import { formatDuration } from './formatters';

import notifee, {
  hasNotifee,
  AndroidForegroundServiceType,
  AndroidImportance,
  AndroidVisibility,
  EventType,
} from './notifee';

const IS_ANDROID = Platform.OS === 'android' && hasNotifee();
const CHANNEL_ID = 'session-timer';
const NOTIFICATION_ID = 'flextimer-session';
const SMALL_ICON = 'ic_stat_timer';

export const TIMER_ACTIONS = {
  PAUSE: 'timer-pause',
  RESUME: 'timer-resume',
  SKIP: 'timer-skip',
  STOP: 'timer-stop',
};
const ACTION_IDS = new Set(Object.values(TIMER_ACTIONS));

const listeners = new Set();

export const onTimerNotificationAction = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const handleEvent = async ({ type, detail }) => {
  if (type !== EventType.ACTION_PRESS) return;
  const id = detail?.pressAction?.id;
  if (!ACTION_IDS.has(id)) return;
  listeners.forEach((fn) => {
    try {
      fn(id);
    } catch {}
  });
};

let registered = false;

// À appeler au chargement du bundle, hors de tout composant (app/_layout.js) :
// Notifee exige que le handler d'arrière-plan existe avant le premier
// événement, et le runner du service doit être enregistré avant le premier
// displayNotification({ asForegroundService: true }).
export function registerTimerNotification() {
  if (!IS_ANDROID || registered) return;
  registered = true;
  // Le service vit tant que cette promesse ne se résout pas : on l'arrête
  // explicitement via stopForegroundService() à la fin de la séance.
  notifee.registerForegroundService(() => new Promise(() => {}));
  notifee.onForegroundEvent(handleEvent);
  notifee.onBackgroundEvent(handleEvent);
}

let channelPromise = null;

const ensureChannel = () => {
  if (!channelPromise) {
    channelPromise = notifee
      .createChannel({
        id: CHANNEL_ID,
        name: 'Séance en cours',
        description: 'Chrono de la séance et ses commandes',
        // LOW : visible dans la barre de statut et le volet, mais jamais de son
        // ni de bandeau surgissant — les bips de phase restent ceux de l'app.
        importance: AndroidImportance.LOW,
        visibility: AndroidVisibility.PUBLIC,
        vibration: false,
        badge: false,
      })
      .catch(() => {
        channelPromise = null;
      });
  }
  return channelPromise;
};

let active = false;

export async function startTimerNotification() {
  if (!IS_ANDROID) return;
  active = true;
  // Pas de requestPermission() ici : elle faisait surgir la fenêtre système
  // par-dessus le chrono au début d'une séance, et un 2e refus la bloque
  // pour toujours. La demande passe par la page lib/permissionPrimer.js.
  await ensureChannel();
}

const describeRound = (roundLabel) => {
  if (!roundLabel || roundLabel === '—' || roundLabel === '∞') return '';
  if (roundLabel.startsWith('B ')) return ` · Bloc ${roundLabel.slice(2)}`;
  return ` · Tour ${roundLabel}`;
};

export async function updateTimerNotification({
  timerName,
  color,
  phaseLabel,
  roundLabel,
  seconds,
  phaseTotal = 0,
  countUp = false,
  isPaused = false,
  skipLabel = null,
}) {
  if (!IS_ANDROID || !active) return;
  // La première réécriture part avant que start() ait fini de créer le canal :
  // sans canal, Android jette la notification en silence.
  await ensureChannel();
  if (!active) return;

  const whole = Math.max(0, Math.floor(seconds));
  const time = formatDuration(whole);
  const round = describeRound(roundLabel);
  const body = isPaused ? `En pause · ${time}` : `${time} ${countUp ? 'écoulé' : 'restant'}`;
  // Travail libre de BASIC : pas de fin prévue, donc pas de barre.
  const total = Math.round(phaseTotal);
  const progress =
    !countUp && total > 0
      ? { max: total, current: Math.min(total, Math.max(0, total - whole)) }
      : undefined;

  const actions = [
    isPaused
      ? { title: 'Reprendre', pressAction: { id: TIMER_ACTIONS.RESUME } }
      : { title: 'Pause', pressAction: { id: TIMER_ACTIONS.PAUSE } },
  ];
  if (skipLabel) actions.push({ title: skipLabel, pressAction: { id: TIMER_ACTIONS.SKIP } });
  // Stop ramène l'app au premier plan, sur l'écran de fin (« Bravo ») ;
  // Pause / Reprendre / Passer agissent sans ouvrir l'app.
  actions.push({
    title: 'Stop',
    pressAction: { id: TIMER_ACTIONS.STOP, launchActivity: 'default' },
  });

  const now = Date.now();
  try {
    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      // Même hiérarchie que l'écran : la phase et le tour en titre, le mode en
      // petit dans l'en-tête (à côté du nom de l'app).
      title: `${phaseLabel}${round}`,
      subtitle: timerName,
      body,
      android: {
        channelId: CHANNEL_ID,
        asForegroundService: true,
        foregroundServiceTypes: [
          AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
        ],
        ongoing: true,
        autoCancel: false,
        onlyAlertOnce: true,
        smallIcon: SMALL_ICON,
        // `colorized` n'est pas qu'esthétique : Android ne place en tête du
        // volet que les notifs de premier plan COLORÉES. Sans lui, un canal
        // LOW est rangé dans « Silencieuses » (constaté en v13.6.0).
        color,
        colorized: true,
        progress,
        visibility: AndroidVisibility.PUBLIC,
        // Le chronomètre natif ne sait pas se mettre en pause : on le masque
        // pendant la pause, le corps du texte garde la valeur figée.
        showChronometer: !isPaused,
        chronometerDirection: countUp ? 'up' : 'down',
        timestamp: countUp ? now - whole * 1000 : now + whole * 1000,
        pressAction: { id: 'default', launchActivity: 'default' },
        actions,
      },
    });
  } catch {}

  // stop() a pu passer pendant l'attente : ne pas laisser ressusciter la
  // notification par un appel parti juste avant la fin de séance.
  if (!active) await cancelQuietly();
}

const cancelQuietly = async () => {
  try {
    await notifee.stopForegroundService();
  } catch {}
  try {
    await notifee.cancelNotification(NOTIFICATION_ID);
  } catch {}
};

export async function stopTimerNotification() {
  if (!IS_ANDROID) return;
  active = false;
  await cancelQuietly();
}
