// BROUILLON DE SÉANCE — la séance en cours est sauvegardée au fil de l'eau.
//
// Retour utilisateur du 06/10/2026 : le téléphone s'est déchargé à la toute fin
// d'un MIX de 30 minutes, et rien n'a été enregistré. L'historique n'était
// écrit qu'à l'arrivée sur l'écran de fin (app/end-session.js).
//
// Principe : pendant le chrono, app/running.js écrit un petit brouillon (le
// timer, le temps écoulé, les « Fin du travail » déjà validés) à chaque
// changement de phase, toutes les 10 secondes, à chaque série validée et quand
// l'app passe en arrière-plan. Si la séance se termine normalement,
// end-session l'enregistre puis efface le brouillon. Sinon (batterie vide,
// plantage, app fermée de force), le brouillon est encore là au prochain
// démarrage : ensureSessionRecovered() le transforme en séance de
// l'historique, avec exactement le même calcul que l'écran de fin.
//
// Tout est silencieux : ne lève jamais, une écriture ratée ne gêne pas le chrono.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { computeSessionStats, computeExpectedDuration } from './timer-engine';
import { HISTORY_KEY, isEarlyQuit, notifyHistoryChanged } from './history';

export const DRAFT_KEY = 'flexTimer_sessionDraft';

// En dessous, ce n'est pas une séance (lancée puis quittée dans la foulée).
export const MIN_RECOVER_SECONDS = 6;

// L'entrée d'historique d'une séance : UNE seule définition, partagée par
// l'écran de fin et la récupération, pour qu'une séance récupérée soit
// indiscernable d'une séance terminée normalement (mêmes stats, mêmes champs).
export const buildHistoryEntry = ({ timer, elapsed, ctx, date = new Date(), extra = {} }) => {
  const stats = computeSessionStats(timer, elapsed, ctx);
  return {
    id: Date.now().toString(),
    timerId: timer.id,
    name: timer.name,
    color: timer.color,
    intensity: timer.tag,
    durationSeconds: elapsed,
    completedRounds: stats.completedRounds,
    totalRounds: stats.totalRounds,
    workTotal: stats.workTotal,
    ...(stats.blockBreakdown ? { blockBreakdown: stats.blockBreakdown } : {}),
    ...(Number.isFinite(stats.exerciseCount) ? { exerciseCount: stats.exerciseCount } : {}),
    restTotal: stats.restTotal,
    date: date.toISOString(),
    ...(isEarlyQuit(elapsed, computeExpectedDuration(timer)) ? { pendingDelete: true } : {}),
    ...extra,
  };
};

// Toutes les opérations sur le brouillon passent les unes derrière les autres :
// une écriture en retard ne doit jamais ressusciter un brouillon qu'on vient
// d'effacer (la séance serait alors comptée deux fois au prochain démarrage).
let chain = Promise.resolve();
const enqueue = (op) => {
  chain = chain.then(op).catch(() => {});
  return chain;
};

// Fermé tant qu'aucune séance n'est en cours : les écritures sont ignorées.
// Rouvert par beginSessionDraft() à l'arrivée sur l'écran du chrono.
let open = false;

export const beginSessionDraft = () => {
  open = true;
};

export const saveSessionDraft = ({ timer, elapsed, ctx }, startedAt) => {
  if (!open || !timer || !Number.isFinite(elapsed)) return Promise.resolve();
  const payload = JSON.stringify({
    v: 1,
    timer,
    elapsed,
    ctx: ctx || null,
    startedAt,
    savedAt: Date.now(),
  });
  return enqueue(async () => {
    if (!open) return;
    await AsyncStorage.setItem(DRAFT_KEY, payload);
  });
};

export const clearSessionDraft = () => {
  open = false;
  return enqueue(() => AsyncStorage.removeItem(DRAFT_KEY));
};

// Au démarrage : s'il reste un brouillon, c'est que la séance n'a jamais
// atteint l'écran de fin. Une seule tentative par lancement (promesse
// mémorisée) : _layout.js la lance tôt, l'accueil attend la même promesse
// avant de compter les trophées. Rend l'entrée ajoutée, ou null.
let recovery = null;
export const ensureSessionRecovered = () => {
  if (!recovery) recovery = recover();
  return recovery;
};

const recover = async () => {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    // Effacé AVANT d'être traité : un plantage pendant la récupération ne doit
    // pas la rejouer à chaque lancement.
    await AsyncStorage.removeItem(DRAFT_KEY);
    const draft = JSON.parse(raw);
    if (!draft || !draft.timer || !Number.isFinite(draft.elapsed)) return null;
    if (draft.elapsed < MIN_RECOVER_SECONDS) return null;

    const listRaw = await AsyncStorage.getItem(HISTORY_KEY);
    const list = listRaw ? JSON.parse(listRaw) : [];
    // Garde-fou : la séance a déjà été enregistrée (le brouillon n'avait juste
    // pas pu être effacé) → rien à récupérer.
    const startedAt = Number(draft.startedAt) || 0;
    if (
      startedAt &&
      list.some((s) => s.timerId === draft.timer.id && new Date(s.date).getTime() >= startedAt)
    ) {
      return null;
    }

    // Daté du dernier instant où la séance était vivante, pas du démarrage de
    // l'app : une séance coupée à 23 h 55 reste dans sa journée.
    const entry = buildHistoryEntry({
      timer: draft.timer,
      elapsed: draft.elapsed,
      ctx: draft.ctx || undefined,
      date: new Date(Number(draft.savedAt) || Date.now()),
      extra: { recovered: true },
    });
    list.push(entry);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    notifyHistoryChanged();
    return entry;
  } catch {
    return null;
  }
};
