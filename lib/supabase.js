// Client Supabase (backend + base de données). Pur point d'entrée réseau,
// aucune logique métier ici — voir contexts/AuthContext.js pour la connexion.
//
// `isSupabaseConfigured` reste `false` tant que l'URL/clé du projet ne sont
// pas renseignées dans app.json > expo.extra (voir TUTO-SUPABASE.md) : le
// reste de l'app doit pouvoir tourner sans planter avant que ce soit fait,
// comme le coach vocal ou les autres briques qui se dégradent sans crash.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

const extra = Constants.expoConfig?.extra ?? {};
const SUPABASE_URL = extra.supabaseUrl || '';
const SUPABASE_ANON_KEY = extra.supabaseAnonKey || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // On gère nous-mêmes l'URL de retour du OAuth (expo-web-browser +
        // deep link flextimer://), pas de détection automatique dans une URL
        // de navigateur qui n'existe pas côté React Native.
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;
