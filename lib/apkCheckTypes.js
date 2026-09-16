// Équivalent du `src/types/apkCheck.ts` du brief. Le projet est en
// JavaScript (choix assumé dans CLAUDE.md « JavaScript, pas TypeScript pour
// rester simple ») : les contrats sont donc décrits en JSDoc plutôt qu'en
// interfaces TS. VS Code les lit et complète pareil, sans imposer une
// chaîne de compilation TypeScript à un projet qui n'en a pas.
//
// Ce fichier n'exporte aucun code exécutable — il ne sert qu'à la doc et à
// l'autocomplétion (`@type {import('./apkCheckTypes').APKCheckState}`).

/**
 * Contenu attendu du Gist distant (apk-version.json). Tous les champs sont
 * optionnels côté code : le Gist est édité à la main, une faute de frappe ne
 * doit pas casser l'app.
 *
 * @typedef {Object} APKCheckResponse
 * @property {string}  [min_apk_version]        Version minimale acceptée, ex "10.6.0".
 * @property {string}  [download_url]           Lien direct vers le nouvel APK.
 * @property {boolean} [is_maintenance]         Affiche le bandeau + la pop-up de maintenance.
 * @property {string}  [maintenance_message]    Texte affiché pendant la maintenance.
 * @property {boolean} [is_forced_update]       Active le blocage plein écran.
 * @property {string}  [forced_update_message]  Texte affiché sur l'écran de blocage.
 */

/**
 * État exposé par checkAPKVersion() puis par le hook useAPKCheck().
 *
 * @typedef {Object} APKCheckState
 * @property {boolean} checked                  Une réponse (réseau ou cache) a été exploitée.
 * @property {boolean} isBlockedByForcedUpdate  Mise à jour obligatoire ET version installée trop ancienne.
 * @property {boolean} isMaintenance            Maintenance annoncée.
 * @property {string}  maintenanceMessage       Message de maintenance (vide si aucun).
 * @property {string}  forcedUpdateMessage      Message de blocage (vide si aucun).
 * @property {string}  downloadUrl              Lien de téléchargement de l'APK (vide si aucun).
 * @property {string}  minVersion               Version minimale exigée (vide si inconnue).
 * @property {string}  currentVersion           Version installée, lue dans app.json.
 * @property {boolean} fromCache                Réponse issue du cache 24h, pas du réseau.
 * @property {string|null} error                Message d'erreur technique, ou null.
 */

export {};
