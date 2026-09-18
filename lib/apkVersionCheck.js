import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { isVersionOutdated } from './versionCompare';

/**
 * Vérification d'APK distante — « est-ce que cette version installée a encore
 * le droit de tourner, et y a-t-il une maintenance en cours ? »
 *
 * ⚠️ N'a RIEN à voir avec les mises à jour OTA (hooks/useOtaUpdate.js,
 * expo-updates) et ne doit pas s'y mêler :
 * - OTA = remplacer le code JS tout seul, sans réinstaller. Impossible dès
 *   qu'un changement natif est en jeu (nouvelle lib native, bump de SDK).
 * - Ce fichier = le filet de sécurité pour justement ces cas-là : quand un
 *   nouvel APK est indispensable, l'OTA ne peut pas l'apporter, donc on
 *   affiche un écran de blocage avec le lien de téléchargement.
 *
 * Source de vérité : un Gist GitHub édité à la main (aucune console admin
 * pour l'instant). Le fichier distant peut donc contenir n'importe quoi :
 * tout est validé et rien ne fait planter l'app — en cas de doute on laisse
 * passer plutôt que de bloquer quelqu'un par accident.
 */

// ⚠️ À REMPLACER après création du Gist (voir TUTO-MAINTENANCE.md).
// Tant que "YOUR_GIST_ID" est là, aucune requête réseau n'est faite : le
// système reste dormant au lieu de partir en 404 à chaque lancement.
export const GIST_URL =
  'https://gist.githubusercontent.com/ManuYao/89e9d1e109074c02232e3a962fbaae75/raw/apk-version.json';

// Dernière réponse exploitable + date de la dernière requête réseau.
export const APK_CHECK_CACHE_KEY = 'flexTimer_apkCheck';
// Message de maintenance dont la pop-up a déjà été vue (elle ne s'affiche
// qu'une fois par message ; le bandeau, lui, reste tant que la maintenance
// est annoncée).
export const MAINTENANCE_SEEN_KEY = 'flexTimer_maintenanceSeen';

// Throttle demandé : une requête réseau par 24h maximum.
const THROTTLE_MS = 24 * 60 * 60 * 1000;
// Au-delà, on abandonne : un réseau qui traîne ne doit pas retenir l'app.
const FETCH_TIMEOUT_MS = 8000;

// Historique des vérifications forcées manuellement (bouton Paramètres),
// PAS du check automatique au démarrage/retour au premier plan — celui-ci
// reste sur son throttle 24h normal, sans lien avec cette limite.
export const FORCE_CHECK_LOG_KEY = 'flexTimer_apkForceCheckLog';
export const FORCE_CHECK_LIMIT = 5;
const FORCE_CHECK_WINDOW_MS = 60 * 60 * 1000; // 1h glissante, pas "par heure d'horloge"

export const isGistConfigured = () => !GIST_URL.includes('YOUR_GIST_ID');

/**
 * Version de l'APK installé. Lue dans app.json via expo-constants — jamais
 * écrite en dur, comme Paramètres > À propos (CLAUDE.md). Volontairement ''
 * et pas '0.0.0' en cas d'échec de lecture : '0.0.0' serait plus ancien que
 * n'importe quel minimum et bloquerait tout le monde. Une chaîne vide est
 * illisible pour compareVersions, qui répond alors "à jour".
 * Pas de repli sur Constants.manifest : ce champ lève dans un APK standalone.
 * @returns {string}
 */
export const getCurrentVersion = () =>
  Constants.expoConfig?.version ?? '';

const emptyState = (extra = {}) => ({
  checked: false,
  isBlockedByForcedUpdate: false,
  isMaintenance: false,
  maintenanceMessage: '',
  forcedUpdateMessage: '',
  downloadUrl: '',
  minVersion: '',
  currentVersion: getCurrentVersion(),
  fromCache: false,
  error: null,
  ...extra,
});

const asText = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * Traduit la réponse brute du Gist en état exploitable par l'UI.
 *
 * Le blocage exige DEUX conditions réunies :
 *   1. `is_forced_update` est vrai — l'interrupteur d'urgence ;
 *   2. la version installée est réellement plus ancienne que
 *      `min_apk_version`.
 * Sans la seconde, laisser le drapeau à `true` bloquerait aussi les gens
 * déjà à jour, y compris après qu'ils aient téléchargé le nouvel APK.
 *
 * @param {import('./apkCheckTypes').APKCheckResponse} payload
 * @returns {import('./apkCheckTypes').APKCheckState}
 */
const toState = (payload, extra = {}) => {
  const current = getCurrentVersion();
  const minVersion = asText(payload?.min_apk_version);
  const outdated = minVersion ? isVersionOutdated(current, minVersion) : false;

  return emptyState({
    checked: true,
    isBlockedByForcedUpdate: payload?.is_forced_update === true && outdated,
    isMaintenance: payload?.is_maintenance === true,
    maintenanceMessage: asText(payload?.maintenance_message),
    forcedUpdateMessage: asText(payload?.forced_update_message),
    downloadUrl: asText(payload?.download_url),
    minVersion,
    currentVersion: current,
    ...extra,
  });
};

const readCache = async () => {
  try {
    const raw = await AsyncStorage.getItem(APK_CHECK_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed; // { at: number, payload: object }
  } catch {
    return null;
  }
};

const writeCache = async (payload) => {
  try {
    await AsyncStorage.setItem(
      APK_CHECK_CACHE_KEY,
      JSON.stringify({ at: Date.now(), payload })
    );
  } catch {}
};

const fetchGist = async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // Suffixe anti-cache : les URL "raw" de GitHub passent par un CDN, sans
    // ça une correction du Gist pourrait mettre plusieurs minutes à arriver.
    const res = await fetch(`${GIST_URL}?t=${Date.now()}`, {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      throw new Error('Format inattendu');
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Vérifie l'état de l'APK. Une requête réseau par 24h maximum ; entre deux,
 * on rejoue la dernière réponse mise en cache — sinon une mise à jour
 * obligatoire ne s'appliquerait que le jour de la requête, et l'app
 * redeviendrait utilisable le lendemain matin.
 *
 * Ne lève jamais : réseau coupé, Gist supprimé, JSON cassé → l'app continue
 * normalement (log console, pas de crash, pas de retry automatique).
 *
 * @param {{ force?: boolean }} [options] force : ignore le throttle 24h.
 * @returns {Promise<import('./apkCheckTypes').APKCheckState>}
 */
export async function checkAPKVersion({ force = false } = {}) {
  if (!isGistConfigured()) {
    return emptyState({ error: 'Gist non configuré' });
  }

  const cached = await readCache();
  const fresh = cached?.at && Date.now() - cached.at < THROTTLE_MS;

  if (!force && fresh && cached.payload) {
    return toState(cached.payload, { fromCache: true });
  }

  try {
    const payload = await fetchGist();
    await writeCache(payload);
    return toState(payload);
  } catch (e) {
    const message = e?.name === 'AbortError' ? 'Délai dépassé' : e?.message ?? 'Erreur réseau';
    console.log('[apkVersionCheck]', message);
    // Réseau indisponible : on se rabat sur la dernière réponse connue, même
    // périmée. Un blocage déjà annoncé le reste hors ligne — sinon il
    // suffirait de couper le wifi pour passer outre.
    if (cached?.payload) return toState(cached.payload, { fromCache: true, error: message });
    return emptyState({ error: message });
  }
}

/**
 * Timestamps (ms) des vérifications forcées manuelles encore dans la fenêtre
 * d'1h glissante, triés du plus ancien au plus récent. Persisté (pas un
 * simple compteur en mémoire comme le compteur de swipes d'UpdateSheet) :
 * sinon fermer/rouvrir l'app suffirait à contourner la limite.
 */
const readForceCheckLog = async () => {
  try {
    const raw = await AsyncStorage.getItem(FORCE_CHECK_LOG_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    const cutoff = Date.now() - FORCE_CHECK_WINDOW_MS;
    return list.filter((t) => typeof t === 'number' && t > cutoff);
  } catch {
    return [];
  }
};

/**
 * Quota restant pour le bouton "Vérifier maintenant" des Paramètres, sans
 * consommer de tentative — sert juste à afficher "3/5 restantes".
 * @returns {Promise<{ remaining: number, limit: number, retryAt: number|null }>}
 *   retryAt : timestamp où une place se libère (null si pas au maximum).
 */
export async function getForceCheckQuota() {
  const log = await readForceCheckLog();
  const remaining = Math.max(0, FORCE_CHECK_LIMIT - log.length);
  const retryAt = remaining === 0 ? log[0] + FORCE_CHECK_WINDOW_MS : null;
  return { remaining, limit: FORCE_CHECK_LIMIT, retryAt };
}

/**
 * Vérification forcée déclenchée à la main (bouton Paramètres), plafonnée à
 * `FORCE_CHECK_LIMIT` par heure glissante — le Gist est en frais gratuit
 * GitHub, mais rien n'empêche quelqu'un de rester le doigt sur le bouton.
 *
 * Contrairement à `checkAPKVersion({ force: true })` seul, celle-ci refuse
 * de partir en réseau une fois le quota épuisé : elle retourne alors le
 * dernier état connu (cache) avec `error` expliquant pourquoi, plutôt que de
 * laisser passer silencieusement.
 *
 * @returns {Promise<import('./apkCheckTypes').APKCheckState & { quotaExceeded?: boolean, retryAt?: number }>}
 */
export async function forceCheckAPKVersion() {
  const log = await readForceCheckLog();

  if (log.length >= FORCE_CHECK_LIMIT) {
    const retryAt = log[0] + FORCE_CHECK_WINDOW_MS;
    const cached = await readCache();
    const base = cached?.payload
      ? toState(cached.payload, { fromCache: true })
      : emptyState();
    return {
      ...base,
      error: `Limite de ${FORCE_CHECK_LIMIT} vérifications/heure atteinte`,
      quotaExceeded: true,
      retryAt,
    };
  }

  // Le créneau est consommé AVANT la requête, pas après : même un échec
  // réseau compte comme une tentative, sinon la limite ne freine jamais
  // quelqu'un dont le Gist est temporairement injoignable.
  try {
    await AsyncStorage.setItem(FORCE_CHECK_LOG_KEY, JSON.stringify([...log, Date.now()]));
  } catch {}

  return checkAPKVersion({ force: true });
}

/** La pop-up de maintenance a-t-elle déjà été vue pour CE message ? */
export const hasSeenMaintenanceMessage = async (message) => {
  if (!message) return true;
  try {
    return (await AsyncStorage.getItem(MAINTENANCE_SEEN_KEY)) === message;
  } catch {
    return true; // en cas de doute, ne pas imposer la pop-up
  }
};

export const markMaintenanceMessageSeen = async (message) => {
  if (!message) return;
  try {
    await AsyncStorage.setItem(MAINTENANCE_SEEN_KEY, message);
  } catch {}
};
