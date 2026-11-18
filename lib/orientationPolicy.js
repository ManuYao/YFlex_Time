// Politique d'orientation de l'app — PUR (aucun import React Native), testable en Node.
//
// Contexte : l'app était verrouillée en portrait au niveau du manifeste Android
// (`orientation: "portrait"`). Sur Samsung, en fenêtre flottante (« pop-up view »),
// un testeur ne pouvait pas rétrécir la largeur ni la diagonale (le concurrent, si).
// Hypothèse (non confirmée) : Samsung bride le redimensionnement libre d'une fenêtre
// dont l'appli exige le portrait.
//
// Parade : le manifeste n'impose plus rien (`unspecified`) et c'est le JS qui décide,
// à chaud, via expo-screen-orientation :
//   - app en PLEIN ÉCRAN      → 'portrait' (verrou comme avant, le téléphone ne tourne pas)
//   - app en FENÊTRE RÉDUITE  → 'free'     (aucune exigence : redimensionnement libre)
// Comme c'est du JS, on peut ajuster les seuils ou la règle par mise à jour à distance
// (OTA), sans nouvel APK.

// Tolérances (en dp) entre la fenêtre mesurée et l'écran physique. En plein écran la
// fenêtre peut être un peu plus petite que l'écran à cause des barres système
// (état + navigation : ≤ ~100 dp) ; en fenêtre flottante ou écran partagé l'écart est
// bien plus grand. Valeurs volontairement larges : un téléphone normal en plein écran
// ne doit JAMAIS basculer en 'free'.
export const REDUCED_WIDTH_TOLERANCE = 24;
export const REDUCED_HEIGHT_TOLERANCE = 140;

// win / screen : { width, height } en dp. Mesure absente ou invalide → on ne sait pas →
// on reste sur le comportement historique (portrait).
export function isReducedWindow(win, screen) {
  if (!win || !screen) return false;
  const { width: ww, height: wh } = win;
  const { width: sw, height: sh } = screen;
  if (!(ww > 0 && wh > 0 && sw > 0 && sh > 0)) return false;
  return ww < sw - REDUCED_WIDTH_TOLERANCE || wh < sh - REDUCED_HEIGHT_TOLERANCE;
}

// 'portrait' = verrouiller en portrait · 'free' = lever tout verrou.
export function orientationPolicy(win, screen) {
  return isReducedWindow(win, screen) ? 'free' : 'portrait';
}
