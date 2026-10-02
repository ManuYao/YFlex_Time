// Connexion utilisateur — optionnelle, comme partout ailleurs dans l'app
// (voir CLAUDE.md, section IDÉE FUTURE — Profil utilisateur) : rien ici ne
// doit empêcher l'usage 100% local qui existe déjà. Ce contexte expose juste
// une session en plus, jamais une condition d'accès.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isPseudoTaken, PSEUDO_TAKEN_TEXT } from '../lib/pseudos';
import { exchangeCodeOnce, beginGoogleFlow, endGoogleFlow } from '../lib/authCode';

// Nécessaire pour que le retour du navigateur système (Google) referme
// proprement la session ouverte par openAuthSessionAsync.
WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext(null);

// Même scheme que le partage de MIX (flextimer://) : deep link déjà vivant
// dans l'app, pas un nouveau mécanisme.
const REDIRECT_URL = Linking.createURL('auth-callback');

// « User already registered » n'est PAS traduit littéralement : confirmer
// qu'un email a déjà un compte permettrait à quelqu'un de tester une liste
// d'adresses pour savoir lesquelles sont inscrites (énumération de comptes).
// Message volontairement ambigu, qui oriente sans confirmer.
const AUTH_ERRORS = {
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'User already registered':
    "Impossible de créer ce compte avec cet email. Si tu en as déjà un, essaie plutôt de te connecter.",
  'Email not confirmed': "Confirme d'abord ton email avant de te connecter.",
};

// Message affichable en français, jamais le texte brut Supabase (souvent en
// anglais et parfois technique).
const friendlyAuthError = (error) => {
  if (!error) return null;
  return AUTH_ERRORS[error.message] || "Une erreur est survenue, réessaie dans un instant.";
};

// Les tokens reviennent soit en `code` (flux PKCE, le cas normal ici), soit
// en fragment `#access_token=...` (repli, au cas où un fournisseur renvoie
// encore l'ancien flux implicite).
async function applySessionFromUrl(url) {
  const { queryParams } = Linking.parse(url);
  const code = queryParams?.code;
  if (code) {
    // Partagé avec l'écran auth-callback (lib/authCode.js) : le même code peut
    // arriver par les deux chemins, il ne doit être échangé qu'une fois.
    const { error } = await exchangeCodeOnce(code);
    if (error) throw error;
    return;
  }
  const hash = url.split('#')[1];
  if (!hash) return;
  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setHydrated(true);
      return undefined;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session ?? null);
      setHydrated(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUpWithEmail = useCallback(async (email, password, displayName) => {
    if (!isSupabaseConfigured) throw new Error('La connexion arrive bientôt.');
    // Pseudo unique entre comptes : on prévient avant de créer le compte.
    if (displayName) {
      const check = await isPseudoTaken(displayName);
      if (check.ok && check.taken) throw new Error(PSEUDO_TAKEN_TEXT);
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Le lien de confirmation du mail rouvre l'app (app/auth-callback.js)
        // au lieu d'une page web. Doit figurer dans Supabase > Authentication
        // > URL Configuration > Redirect URLs, sinon Supabase l'ignore.
        emailRedirectTo: REDIRECT_URL,
        ...(displayName ? { data: { display_name: displayName } } : {}),
      },
    });
    if (error) throw new Error(friendlyAuthError(error));
    return data;
  }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    if (!isSupabaseConfigured) throw new Error('La connexion arrive bientôt.');
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(friendlyAuthError(error));
    return data;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured) throw new Error('La connexion arrive bientôt.');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: REDIRECT_URL, skipBrowserRedirect: true },
    });
    if (error) throw new Error(friendlyAuthError(error));
    // Pendant tout le trajet navigateur, l'écran auth-callback sait qu'il n'a
    // qu'à s'effacer (voir lib/authCode.js).
    beginGoogleFlow();
    try {
      const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL);
      if (result.type === 'success' && result.url) {
        await applySessionFromUrl(result.url);
      }
      // On ne dit « connecté » que si une session existe VRAIMENT. Avant, un
      // navigateur refermé (ou une page d'erreur) passait pour un succès : le
      // bouton jouait la vibration de réussite et quittait l'écran Connexion
      // sans personne de connecté.
      const { data: current } = await supabase.auth.getSession();
      if (current?.session) return 'signed-in';
      if (result.type === 'success') {
        throw new Error("La connexion Google n'a pas abouti. Réessaie dans un instant.");
      }
      return 'cancelled';
    } finally {
      endGoogleFlow();
    }
  }, []);

  // Le nom vit dans les métadonnées du compte : il suit la personne sur un
  // autre téléphone, sans table de base de données en plus.
  const updateDisplayName = useCallback(async (name) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.updateUser({ data: { display_name: name } });
    if (error) throw new Error(friendlyAuthError(error));
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  }, []);

  // Efface le compte ET tout ce qui y est rattaché côté serveur (historique
  // synchronisé, mixes publiés, notes, signalements) : la fonction SQL
  // delete_my_account() (supabase-durcissement.sql) supprime l'utilisateur et
  // la suppression se propage aux tables en cascade. Les données stockées sur
  // ce téléphone ne sont pas touchées.
  const deleteAccount = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      // PGRST202 : la fonction n'existe pas encore côté Supabase.
      throw new Error(
        error.code === 'PGRST202'
          ? "La suppression du compte n'est pas encore disponible. Réessaie plus tard."
          : "Impossible de supprimer le compte pour l'instant. Réessaie dans un instant."
      );
    }
    // Le compte n'existe plus : on ferme la session ici seulement, sans appel
    // serveur (il répondrait « utilisateur introuvable »).
    await supabase.auth.signOut({ scope: 'local' });
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      hydrated,
      isConfigured: isSupabaseConfigured,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      updateDisplayName,
      signOut,
      deleteAccount,
    }),
    [
      session,
      hydrated,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      updateDisplayName,
      signOut,
      deleteAccount,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
