// Pop-up Premium commun (pur, sans React : testable en Node).
//
// Quand une fonction réservée à Premium est refusée, on ne renvoie plus la
// personne sur la page Premium d'office : on affiche UN petit message avec une
// couronne et « Voir Premium » (le même que celui du Planning). C'est
// components/common/PremiumPromptGate.js, monté une fois à la racine, qui
// l'affiche ; n'importe quel écran ou hook le déclenche avec showPremiumPrompt().
// Les phrases par fonction vivent dans lib/premiumFeatures.js (gatePromptText).

const listeners = new Set();
let nextId = 1;

// Affiche le pop-up Premium avec ce texte (remplace celui déjà affiché).
export function showPremiumPrompt(text) {
  const prompt = { id: nextId++, text: String(text || '') };
  listeners.forEach((fn) => {
    try {
      fn(prompt);
    } catch {
      // Un abonné qui plante ne doit pas empêcher les autres de l'afficher.
    }
  });
}

// S'abonne (retourne la fonction de désabonnement).
export function onPremiumPrompt(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
