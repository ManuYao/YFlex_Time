// Le mix qu'on est en train de PRÉVISUALISER (bouton « Tester »), en mémoire
// seulement. Un aperçu ne touche jamais au MIX courant ni à « Mes mix » : avant,
// « Tester » posait le mix comme MIX courant, et il finissait rangé dans la
// liste de l'utilisateur sans qu'il l'ait demandé (en contournant la règle des
// noms uniques). Ici rien n'est écrit : l'aperçu disparaît avec l'écran.
let current = null;

export const setPreviewMix = (mix) => {
  current = mix ? { ...mix, blocks: (mix.blocks || []).map((b) => ({ ...b })) } : null;
};

export const getPreviewMix = () => current;

export const clearPreviewMix = () => {
  current = null;
};
