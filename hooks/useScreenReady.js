import { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/**
 * Chargement fluide d'un écran : le squelette (components/common/Skeleton.js) est
 * montré tant que l'écran n'est pas prêt, puis il s'efface en fondu pendant que
 * le vrai contenu apparaît dessous.
 *
 * Pourquoi : monter d'un coup tout l'arbre lourd d'un écran (cartes à 60 graduations
 * SVG, graphiques, listes) fige le fil JavaScript le temps du montage — un
 * « micro-gel » pendant la transition. Ici le squelette respire sur le fil
 * d'interface (il ne dépend pas du JavaScript), pendant que le contenu réel se
 * monte derrière, une fois les données lues.
 *
 * « Prêt » = les données de l'écran sont là (`dataReady`) ET la transition de
 * navigation est terminée (`waitForInteractions`). Une minuterie de sécurité
 * (`timeoutMs`) lève la deuxième condition si elle traîne : un état lent ne doit
 * jamais bloquer l'écran sur son squelette. `softReady` = une condition annexe
 * (connexion, réglage Premium…) que cette même minuterie peut lever aussi.
 *
 *   const { ready, skeletonGone, skeletonStyle, contentStyle } =
 *     useScreenReady({ dataReady: loaded });
 *   {ready && <Animated.View style={contentStyle}>…</Animated.View>}
 *   {!skeletonGone && (
 *     <Animated.View style={[StyleSheet.absoluteFill, skeletonStyle]} pointerEvents="none">
 *       <MonSquelette />
 *     </Animated.View>
 *   )}
 *
 * Pas de `entering` sur le contenu : un fondu piloté à la main évite le piège
 * d'une entrée figée à opacité 0 quand les enfants changent juste après le
 * montage (voir MaintenanceScreen). `contentStyle` est facultatif : un écran qui
 * doit s'afficher tout de suite sous le squelette (l'accueil) ne l'utilise pas.
 */
export function useScreenReady({
  dataReady = true,
  softReady = true,
  waitForInteractions = true,
  timeoutMs = 1500,
  fadeMs = 260,
} = {}) {
  const [settled, setSettled] = useState(!waitForInteractions);
  const [timedOut, setTimedOut] = useState(false);

  const ready = dataReady && (settled || timedOut) && (softReady || timedOut);

  // Déjà prêt au tout premier rendu (données en mémoire, rien à attendre) : pas
  // de squelette du tout — le montrer une fraction de seconde puis l'effacer
  // serait un clignotement, pas un chargement.
  const [skeletonGone, setSkeletonGone] = useState(ready);
  const fade = useSharedValue(ready ? 1 : 0);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    let task = null;
    if (waitForInteractions) task = InteractionManager.runAfterInteractions(() => setSettled(true));
    return () => {
      task?.cancel?.();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    fade.value = withTiming(1, { duration: fadeMs }, (finished) => {
      if (finished) runOnJS(setSkeletonGone)(true);
    });
  }, [ready]);

  const contentStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const skeletonStyle = useAnimatedStyle(() => ({ opacity: 1 - fade.value }));

  return { ready, skeletonGone, contentStyle, skeletonStyle };
}
