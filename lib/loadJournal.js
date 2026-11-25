import AsyncStorage from '@react-native-async-storage/async-storage';

import { computeSessionStats } from './timer-engine';
import { loadPlanning } from './planning';
import { addEntries, sanitizeEntries } from './loadAdviceShape';

// Journal des charges (lib/loadAdviceShape.js) : une ligne par exercice du
// Planning réellement fait dans une séance. Données LOCALES (rien n'est envoyé
// nulle part, rien n'est lié au compte) ; purgées par la réinitialisation
// complète. La forme des lignes est prête pour une synchronisation Supabase
// plus tard (clé = exercice + jour).
export const LOAD_JOURNAL_KEY = 'flexTimer_loadJournal';

export const loadJournal = async () => {
  try {
    const raw = await AsyncStorage.getItem(LOAD_JOURNAL_KEY);
    return raw ? sanitizeEntries(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
};

/**
 * Après une séance : note la charge de chaque exercice du Planning mené
 * jusqu'au bout (MIX lancé depuis le Planning, blocs porteurs de `planRef`).
 * La charge est celle de l'étiquette vivante du Planning, donc celle saisie
 * pendant la séance si elle a été changée. Ne lève jamais : un souci ici ne doit
 * pas gêner l'écran de fin.
 *
 * `timer` = le MIX dans l'ordre réellement joué (voir app/end-session.js).
 */
export const recordPlannedLoads = async ({ timer, elapsed, ctx, now = Date.now() }) => {
  try {
    if (timer?.id !== 'mix') return;
    const blocks = timer._mix?.blocks || [];
    if (!blocks.some((b) => b?.planRef)) return;

    const done = new Set(computeSessionStats(timer, elapsed, ctx).doneBlockIds || []);
    const refs = blocks.filter((b) => b?.planRef && done.has(b.id)).map((b) => b.planRef);
    if (!refs.length) return;

    const planning = await loadPlanning();
    const items = [];
    refs.forEach((ref) => {
      const block = planning?.[ref.dayKey]?.blocks?.find((b) => b.id === ref.blockId);
      const tag = block?.tags?.find((t) => t.id === ref.tagId);
      const weight = Number(tag?.weight);
      if (!tag || !Number.isFinite(weight) || weight <= 0) return;
      items.push({ label: tag.label, category: tag.category, weight });
    });
    if (!items.length) return;

    const next = addEntries(await loadJournal(), items, now);
    await AsyncStorage.setItem(LOAD_JOURNAL_KEY, JSON.stringify(next));
  } catch {}
};
