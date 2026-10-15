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

/**
 * Retour sûr : revient à l'écran précédent s'il y en a un, sinon à l'accueil.
 *
 * `router.back()` sans écran derrière ne fait rien (en développement : l'erreur
 * « The action 'GO_BACK' was not handled by any navigator »), et un bouton retour
 * qui ne répond pas laisse la personne bloquée. Cela arrive quand la pile a été
 * vidée juste avant — par exemple après avoir lancé un mix depuis le Planning
 * (hooks/useMixLauncher.js vide la pile puis remplace par le décompte), puis
 * quitté très vite. Partout où l'on voulait `router.back()`, on appelle ceci.
 */
export function goBackSafe(router, fallback = '/home') {
  try {
    if (router.canGoBack?.()) {
      router.back();
      return;
    }
  } catch {
    // Rien derrière : on passe au repli.
  }
  router.replace(fallback);
}
