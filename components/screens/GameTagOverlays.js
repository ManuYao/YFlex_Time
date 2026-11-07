import React from 'react';

import GameExerciseSheet from './GameExerciseSheet';
import SpotlightTips from './SpotlightTips';

/**
 * Ce que « noter l'exercice d'un score » affiche, commun aux jeux : la fenêtre « Ton exercice »
 * (ouverte seulement quand la personne MAINTIENT un score) et la bulle d'explication du menu
 * du jeu (règle : lib/gameTagTip.js). À poser en dernier enfant de l'écran du jeu.
 *
 * Props:
 * - tag      : le résultat de useGameExerciseTag (hooks/useGameExerciseTag.js)
 * - phase    : phase du jeu ; la bulle ne se montre que sur le menu du jeu ('ready')
 * - screenH  : hauteur de l'écran (BottomSheet)
 * - accent   : couleur du jeu (hex)
 * - initialFor : (score) => string[] — les exercices cochés à l'ouverture. Par défaut ceux déjà
 *                notés ; un jeu peut en proposer d'office (le combo propose ses deux exercices).
 */
export default function GameTagOverlays({ tag, phase, screenH, accent, initialFor }) {
  const { tagScore } = tag;
  return (
    <>
      {!!tagScore && (
        <GameExerciseSheet
          screenH={screenH}
          accent={accent}
          initial={initialFor ? initialFor(tagScore) : tagScore.exercises ?? []}
          custom={tag.customExercises}
          onSave={(exercises) => tag.applyExercises(tagScore.id, exercises)}
          onClose={tag.closeSheet}
        />
      )}

      {/* La bulle vise le dernier score sur le MENU du jeu (jamais sur l'écran de résultat).
          « Passer » la repousse de 3 parties, « Compris » la supprime pour de bon. */}
      {tag.showTip && phase === 'ready' && !!tag.tipTarget && (
        <SpotlightTips
          steps={[
            {
              id: 'score',
              icon: 'edit',
              title: 'Note ton exercice',
              text: 'Tu viens de finir une partie ? Maintiens ton dernier score une seconde pour choisir l’exercice que tu as fait (tractions, pompes…), ou ajouter le tien. Ce n’est pas obligatoire, c’est juste proposé.',
              radius: 16,
            },
          ]}
          onStepEnter={tag.scrollTipRowIntoView}
          measureTarget={tag.measureTipRow}
          onDone={tag.closeTip}
          skipOnLast
        />
      )}
    </>
  );
}
