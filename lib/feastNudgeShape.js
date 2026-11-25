import { isFeast } from './ambiance';

/**
 * Règle PURE de la proposition « les fêtes, chacun à sa façon » (stockage : lib/feastNudge.js).
 *
 * Demande de l'utilisateur (08/11/2026, « pour moi, c'est hyper important la croyance ») :
 * Halloween, Noël et la Saint-Valentin ne parlent pas à toutes les croyances. Quand l'app se met
 * aux couleurs d'une de ces fêtes, on propose UNE FOIS PAR AN de ne garder que les saisons
 * (réglage « Saisons », qui retire toutes les fêtes) :
 *   - seulement si le réglage est « Auto » (les fêtes sont affichées) ;
 *   - seulement pendant une fête (`feast: true` dans lib/ambiance.js) ;
 *   - jamais deux fois à moins de FEAST_NUDGE_GAP_DAYS jours : Halloween et Noël tombant à
 *     ~6 semaines d'écart, une seule des deux pose la question chaque année ;
 *   - qui garde les fêtes se la voit reposer l'année suivante ; qui passe en « Saisons » ne la
 *     revoit plus (sauf s'il remet « Auto »).
 */
export const FEAST_NUDGE_GAP_DAYS = 300;

const DAY_MS = 86400000;

export function shouldShowFeastNudge({ lastAt, ambianceMode, ambianceId, now = Date.now() }) {
  if (ambianceMode !== 'auto') return false;
  if (!isFeast(ambianceId)) return false;
  if (lastAt == null) return true;
  return now - lastAt >= FEAST_NUDGE_GAP_DAYS * DAY_MS;
}

/** « aux couleurs de Noël » : le complément du nom de la fête, pour la phrase de la feuille. */
export const FEAST_OF = {
  christmas: 'de Noël',
  halloween: "d'Halloween",
  valentine: 'de la Saint-Valentin',
};

export function feastPhrase(id) {
  return FEAST_OF[id] || 'des fêtes';
}
