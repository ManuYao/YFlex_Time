// Comparaison de numéros de version "X.Y.Z" (le schéma X.C.A décrit dans
// CLAUDE.md). Sert uniquement à la vérification d'APK distante
// (lib/apkVersionCheck.js) : l'éligibilité OTA, elle, ne dépend pas du
// numéro de version mais de l'empreinte native — ne pas confondre les deux.
//
// Règle de prudence appliquée partout ici : une donnée illisible (champ
// absent, texte libre, version tronquée) ne doit JAMAIS aboutir à bloquer
// quelqu'un. En cas de doute, on considère la version comme à jour.

const parse = (version) => {
  if (typeof version !== 'string') return null;
  // Tolère "1.2.0-beta" ou "v1.2" : on ne garde que les nombres du début.
  const parts = version.trim().replace(/^v/i, '').split('.').slice(0, 3);
  if (!parts.length || parts[0] === '') return null;
  const nums = parts.map((p) => {
    const n = parseInt(p, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  });
  if (nums.some((n) => n === null)) return null;
  // "1.2" est traité comme "1.2.0".
  while (nums.length < 3) nums.push(0);
  return nums;
};

/**
 * Compare deux versions semver.
 * @returns {number} -1 si a < b, 0 si égales, 1 si a > b.
 *                   0 également si l'une des deux est illisible (voir en-tête).
 */
export const compareVersions = (a, b) => {
  const va = parse(a);
  const vb = parse(b);
  if (!va || !vb) return 0;
  for (let i = 0; i < 3; i += 1) {
    if (va[i] > vb[i]) return 1;
    if (va[i] < vb[i]) return -1;
  }
  return 0;
};

/**
 * La version installée est-elle inférieure au minimum exigé ?
 * @param {string} current version de l'APK installé (app.json → expo.version)
 * @param {string} minimum champ `min_apk_version` du Gist
 * @returns {boolean} false si l'une des deux est illisible.
 */
export const isVersionOutdated = (current, minimum) =>
  compareVersions(current, minimum) < 0;
