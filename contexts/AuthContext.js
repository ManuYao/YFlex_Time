// Connexion utilisateur — optionnelle, comme partout ailleurs dans l'app
// (voir CLAUDE.md, section IDÉE FUTURE — Profil utilisateur) : rien ici ne
// doit empêcher l'usage 100% local qui existe déjà. Ce contexte expose juste
// une session en plus, jamais une condition d'accès.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Nécessaire pour que le retour du navigateur système (Google) referme
// proprement la session ouverte par openAuthSessionAsync.
WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext(null);

// Même scheme que le partage de MIX (flextimer://) : deep link déjà vivant
// dans l'app, pas un nouveau mécanisme.
const REDIRECT_URL = Linking.createURL('auth-callback');

const AUTH_ERRORS = {
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'User already registered': 'Un compte existe déjà avec cet email.',
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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
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

  const signUpWithEmail = useCallback(async (email, password) => {
    if (!isSupabaseConfigured) throw new Error('La connexion arrive bientôt.');
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
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
    const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL);
    if (result.type === 'success' && result.url) {
      await applySessionFromUrl(result.url);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
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
      signOut,
    }),
    [session, hydrated, signUpWithEmail, signInWithEmail, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
