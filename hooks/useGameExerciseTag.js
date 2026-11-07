import { useCallback, useEffect, useRef, useState } from 'react';

import { normalizeExercises, shouldHalo } from '../lib/gameExercises';
import {
  decideGameTagTip,
  loadGameExercises,
  recordGameTagTipOutcome,
} from '../lib/gameExercisesStore';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const measureWindowRect = (node) =>
  new Promise((resolve) => {
    if (!node?.measureInWindow) {
      resolve(null);
      return;
    }
    node.measureInWindow((x, y, width, h) => resolve({ x, y, width, height: h }));
  });

/**
 * « Noter l'exercice d'un score » — TOUT ce qui est commun aux jeux (pyramide, chef d'orchestre,
 * combo), pour qu'un jeu n'ait qu'à brancher ses scores :
 *  - maintenir un score (HoldToTag) ouvre la fenêtre « Ton exercice » (GameExerciseSheet) ;
 *  - un halo invite sur le DERNIER score tant qu'il n'a pas d'exercice (shouldHalo) ;
 *  - une bulle sur le MENU du jeu explique le geste, selon la règle de lib/gameTagTip.js
 *    (1re partie, « Passer » = retour 3 parties plus tard, « Compris » = jamais plus).
 * Rien ne s'ouvre tout seul à part la bulle. Voir components/screens/GameTagOverlays.js
 * pour l'affichage de la fenêtre et de la bulle.
 *
 * @param {object}   p
 * @param {string}   p.phase           phase du jeu ; le menu du jeu est la phase 'ready'
 * @param {object[]} p.scores          la liste « Mes scores » TELLE QU'AFFICHÉE, le plus récent
 *                                     en premier (la démo de la pyramide y ajoute un faux score)
 * @param {Function} p.saveExercises   async (scoreId, exercises) : enregistre l'exercice dans les
 *                                     scores du jeu ET dans la séance JEU de l'Historique
 * @param {boolean} [p.isDemo]         démo de la bulle : elle est due d'emblée, rien n'est compté
 */
export function useGameExerciseTag({ phase, scores, saveExercises, isDemo = false }) {
  const [tagId, setTagId] = useState(null); // le score dont on note l'exercice
  const [customExercises, setCustomExercises] = useState([]);
  // `tipDue` = une partie vient de se finir et la règle dit « montre la bulle » ; `showTip` = elle
  // est à l'écran.
  const [tipDue, setTipDue] = useState(isDemo);
  const [showTip, setShowTip] = useState(false);

  const firstRowRef = useRef(null); // la ligne du dernier score (la cible de la bulle)
  const readyScrollRef = useRef(null); // le défilement du menu du jeu
  const scrollYRef = useRef(0);
  const tipShownRef = useRef(false); // la bulle a réellement pu s'afficher (zone mesurée)

  const tagScore = tagId ? scores.find((s) => s.id === tagId) ?? null : null;
  // La bulle vise le DERNIER score tant qu'il n'a pas d'exercice noté (même condition que le halo).
  const tipTarget = shouldHalo(scores[0], scores[0]) ? scores[0] : null;

  // La bulle apparaît sur le menu du jeu, une fois la liste à l'écran.
  useEffect(() => {
    if (!tipDue || phase !== 'ready' || !tipTarget) return undefined;
    const timer = setTimeout(() => setShowTip(true), 900);
    return () => clearTimeout(timer);
  }, [tipDue, phase, tipTarget?.id]);

  // À appeler quand une partie vient d'être enregistrée (score > 0) : la règle décide si la
  // bulle sera montrée, sur le menu du jeu, dès qu'on y revient.
  const noteGameFinished = useCallback(() => {
    decideGameTagTip().then((show) => {
      if (show) setTipDue(true);
    });
  }, []);

  // Ouvre « Ton exercice » : seulement sur un geste volontaire (le maintien). La liste des exercices
  // ajoutés est relue à l'ouverture : toujours à jour, même après un ajout fait dans un autre jeu.
  const openTag = useCallback(async (id) => {
    if (!id) return;
    // (La vibration de réussite est déjà faite par le maintien : HoldToTag.)
    setCustomExercises(await loadGameExercises());
    setTagId(id);
  }, []);

  const closeSheet = useCallback(() => setTagId(null), []);

  // « Enregistrer » dans la fenêtre. Noter un exercice = avoir compris le geste : la bulle n'a plus
  // lieu d'être. (Les exercices ajoutés à la main sont déjà gardés par la fenêtre, tout de suite.)
  const applyExercises = useCallback(
    async (id, exercises) => {
      setTipDue(false);
      if (!isDemo && normalizeExercises(exercises).length) recordGameTagTipOutcome('done');
      await saveExercises(id, exercises);
    },
    [saveExercises, isDemo]
  );

  // Amène la ligne du dernier score à l'écran (elle est sous « Lancer ») avant de la mesurer.
  const scrollTipRowIntoView = useCallback(async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const row = await measureWindowRect(firstRowRef.current);
      const box = await measureWindowRect(readyScrollRef.current);
      if (!row || !box || row.width <= 0) {
        await sleep(150);
        continue;
      }
      // La ligne vers le haut du défilement : la bulle se pose dessous.
      const delta = row.y - (box.y + box.height * 0.3);
      if (Math.abs(delta) > 12) {
        readyScrollRef.current?.scrollTo({ y: Math.max(0, scrollYRef.current + delta), animated: true });
        await sleep(500);
      }
      return;
    }
  }, []);

  // Mesure la ligne du dernier score ; réessaie si l'écran n'est pas encore posé. Si elle reste
  // introuvable la bulle n'apparaît pas — et elle ne sera PAS comptée comme vue.
  const measureTipRow = useCallback(async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const rect = await measureWindowRect(firstRowRef.current);
      if (rect && rect.width > 0 && rect.height > 0) {
        tipShownRef.current = true;
        return rect;
      }
      await sleep(150);
    }
    return null;
  }, []);

  // « Compris » = comprise (elle ne revient plus) ; « Passer » ou retour = elle reviendra 3 parties
  // plus tard. Rien n'est compté si elle ne s'est pas affichée, ni en démo.
  const closeTip = useCallback(
    ({ reason } = {}) => {
      if (tipShownRef.current && !isDemo) {
        recordGameTagTipOutcome(reason === 'skip' ? 'skip' : 'done');
      }
      tipShownRef.current = false;
      setTipDue(false);
      setShowTip(false);
    },
    [isDemo]
  );

  // À brancher sur le ScrollView du menu du jeu (onScroll) : sert à placer la ligne ciblée.
  const onReadyScroll = useCallback((e) => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  return {
    // fenêtre « Ton exercice »
    tagScore,
    customExercises,
    openTag,
    closeSheet,
    applyExercises,
    // bulle
    showTip,
    tipTarget,
    noteGameFinished,
    scrollTipRowIntoView,
    measureTipRow,
    closeTip,
    // à brancher sur le menu du jeu
    firstRowRef,
    readyScrollRef,
    onReadyScroll,
  };
}
