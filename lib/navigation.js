/**
 * Retour à l'accueil PROPRE : vide d'abord la pile de navigation, puis remplace l'écran courant
 * par l'accueil.
 *
 * Pourquoi : `router.back()` remonte la pile, et `router.replace('/home')` n'en retire rien. Si
 * l'utilisateur est passé par le Profil ou les Paramètres avant de lancer un chrono, la pile est
 * [accueil, profil, …] et « annuler » ou « retour » en fin de séance le ramenait… dans le Profil.
 * Ici la pile est ramenée à la racine avant le remplacement : il ne reste que l'accueil, et le
 * bouton retour d'Android ne peut plus tomber sur un écran oublié dessous. Même technique que
 * hooks/useMixLauncher.js (qui lance un chrono depuis un écran profond).
 *
 * `params` : paramètres de l'accueil (ex. { lastTimerId }), facultatifs.
 */
export function goHomeClean(router, params) {
  try {
    if (router.canDismiss?.()) router.dismissAll();
  } catch {
    // Pile déjà à la racine : rien à retirer.
  }
  router.replace(params ? { pathname: '/home', params } : '/home');
}
