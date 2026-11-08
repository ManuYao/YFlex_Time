// Demandes d'animations d'exercices (étape 6, 08/11/2026) : quand un exercice
// n'a pas son animation, la personne peut demander qu'on la fasse.
//   - connectée : la demande part dans la table Supabase `animation_requests`
//     (DATA/supabase-animation-requests.sql, RLS : chacun ne voit que les
//     siennes) ;
//   - sans compte : elle peut se connecter, ou nous écrire par mail (pré-rempli).
// Le téléphone garde aussi la liste de SES demandes (`flexTimer_animRequests`)
// pour afficher « Demande envoyée » puis « Ajoutée suite à ta demande ! ».
// La logique pure (clés, états, mail) est dans lib/animationRequestsShape.js.
//
// Même contrat que lib/blocks.js : aucune fonction ne lève, chacune rend
// `{ ok: true }` ou `{ ok: false, reason }` avec reason ∈ 'auth' (pas de compte),
// 'invalid', 'unavailable' (Supabase non configuré ou table pas encore créée),
// 'limit' (30 demandes en attente), 'network'.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from './supabase';
import { cleanLabel, requestKey, sanitizeRequests } from './animationRequestsShape';

export const ANIM_REQUESTS_KEY = 'flexTimer_animRequests';
const TABLE = 'animation_requests';

export const loadRequests = async () => {
  try {
    const raw = await AsyncStorage.getItem(ANIM_REQUESTS_KEY);
    return sanitizeRequests(raw ? JSON.parse(raw) : null);
  } catch {
    return {};
  }
};

const saveRequests = async (requests) => {
  try {
    await AsyncStorage.setItem(ANIM_REQUESTS_KEY, JSON.stringify(requests));
  } catch {}
  return requests;
};

/** La personne a vu l'annonce « Ajoutée » : on ne la lui refait pas. */
export const markRequestSeen = async (label) => {
  const key = requestKey(label);
  const requests = await loadRequests();
  if (!requests[key] || requests[key].seen) return requests;
  return saveRequests({ ...requests, [key]: { ...requests[key], seen: true } });
};

const isMissingTable = (error) =>
  error?.code === 'PGRST205' ||
  error?.code === '42P01' ||
  /schema cache|does not exist/i.test(error?.message || '');

/**
 * Envoie la demande de la personne connectée (`userId`). Une demande déjà
 * envoyée pour le même exercice compte comme réussie (rien n'est doublé).
 */
export const submitRequest = async ({ label, userId }) => {
  const name = cleanLabel(label);
  const key = requestKey(label);
  if (key.length < 2) return { ok: false, reason: 'invalid' };
  if (!userId) return { ok: false, reason: 'auth' };
  if (!isSupabaseConfigured) return { ok: false, reason: 'unavailable' };
  let already = false;
  try {
    const { error } = await supabase
      .from(TABLE)
      .insert({ user_id: userId, exercise: name, exercise_key: key });
    if (error) {
      if (error.code === '23505') already = true; // déjà demandée : tout va bien
      else if (error.code === 'P0001' || /limite/i.test(error.message || '')) {
        return { ok: false, reason: 'limit' };
      } else if (isMissingTable(error)) return { ok: false, reason: 'unavailable' };
      else return { ok: false, reason: 'network' };
    }
  } catch {
    return { ok: false, reason: 'network' };
  }
  const requests = await loadRequests();
  if (!requests[key]) {
    await saveRequests({ ...requests, [key]: { label: name, at: Date.now(), seen: false } });
  }
  return { ok: true, already };
};
