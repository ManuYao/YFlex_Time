// Retour d'une connexion par navigateur (Google) ou d'un lien de confirmation
// d'email : petits outils partagés entre contexts/AuthContext.js et l'écran
// app/auth-callback.js.
import { supabase, isSupabaseConfigured } from './supabase';

// Un code d'authentification (flux PKCE) ne sert qu'UNE fois. Deux chemins
// peuvent recevoir le même code presque en même temps : le retour
// d'openAuthSessionAsync (AuthContext) et l'écran auth-callback, ouvert par le
// lien profond. Sans ce partage, le second appel échouerait et afficherait une
// fausse erreur alors que la connexion a réussi.
const inflight = new Map();

export function exchangeCodeOnce(code) {
  if (!isSupabaseConfigured || !code) return Promise.resolve({ error: new Error('no-code') });
  if (inflight.has(code)) return inflight.get(code);
  const promise = supabase.auth
    .exchangeCodeForSession(code)
    .then(({ error }) => ({ error: error || null }))
    .catch((error) => ({ error }))
    .then((result) => {
      // Un échec (réseau coupé...) ne doit pas condamner ce code : on laisse
      // la porte ouverte à un nouvel essai.
      if (result.error) inflight.delete(code);
      return result;
    });
  inflight.set(code, promise);
  return promise;
}

// « Une connexion Google est en cours depuis l'écran Connexion » : dans ce cas
// c'est ce chemin qui finit le travail (échange du code, retour à l'écran
// d'avant), et l'écran auth-callback — juste le passage du lien profond — n'a
// qu'à s'effacer. Le drapeau reste levé un court instant après la fin : le
// lien peut arriver un peu après le retour du navigateur.
let googleFlow = false;
let googleFlowTimer = null;
const GOOGLE_FLOW_GRACE_MS = 1500;

export function beginGoogleFlow() {
  clearTimeout(googleFlowTimer);
  googleFlow = true;
}

export function endGoogleFlow() {
  clearTimeout(googleFlowTimer);
  googleFlowTimer = setTimeout(() => {
    googleFlow = false;
  }, GOOGLE_FLOW_GRACE_MS);
}

export const isGoogleFlowActive = () => googleFlow;
