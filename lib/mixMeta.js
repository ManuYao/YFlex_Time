// Code couleur et note d'un MIX (Constructeur › maintien de « Enregistrer »).
// Deux champs libres posés par la personne pour retrouver ses mix d'un coup d'œil :
//  - `color` : une teinte de la palette ci-dessous (petite barre sur les cartes de
//    « Mes mix » et dans le partage) ;
//  - `note`  : une phrase (« Jambes, jeudi », « Version salle »…).
// Fichier PUR, sans import React Native : testable directement avec `node`.
// Les valeurs reçues d'ailleurs (lien d'un ami, fil public) passent TOUJOURS par
// ces fonctions : une couleur hors palette ou une note trop longue est écartée.

export const MIX_COLORS = [
  { color: '#388EFF', label: 'Bleu' },
  { color: '#2ECC71', label: 'Vert' },
  { color: '#FF8A3D', label: 'Orange' },
  { color: '#A78BFA', label: 'Violet' },
  { color: '#F472B6', label: 'Rose' },
  { color: '#22D3EE', label: 'Cyan' },
  { color: '#FACC15', label: 'Jaune' },
  { color: '#F87171', label: 'Rouge' },
];

export const MAX_MIX_NOTE = 140;

/** La teinte de la palette correspondant à `value` (casse ignorée), sinon `null`. */
export const cleanMixColor = (value) => {
  if (typeof value !== 'string') return null;
  const hit = MIX_COLORS.find((c) => c.color.toLowerCase() === value.trim().toLowerCase());
  return hit ? hit.color : null;
};

/** La note nettoyée (espaces retirés, 140 caractères au plus), ou une chaîne vide. */
export const cleanMixNote = (value) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, MAX_MIX_NOTE) : '';

export const getMixColorLabel = (value) => MIX_COLORS.find((c) => c.color === cleanMixColor(value))?.label ?? null;
