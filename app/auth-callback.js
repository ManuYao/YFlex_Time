import { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import GradientBackground from '../components/common/GradientBackground';
import Button from '../components/common/Button';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { exchangeCodeOnce, isGoogleFlowActive } from '../lib/authCode';
import { fonts } from '../lib/fonts';

// Arrivée du lien profond flextimer://auth-callback : retour d'un lien de
// confirmation d'email, ou passage du retour de Google. Sans cet écran,
// expo-router afficherait « route introuvable » derrière le navigateur.
export default function AuthCallback() {
  const router = useRouter();
  const { code, error } = useLocalSearchParams();
  const [failed, setFailed] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return undefined;
    startedRef.current = true;
    let cancelled = false;

    // Connexion Google lancée depuis l'écran Connexion : c'est lui qui finit
    // le travail et qui ramène à l'écran d'avant. On s'efface pour lui laisser
    // la place, sinon son retour arrière ferait tomber ici et non plus là où
    // il faut.
    if (isGoogleFlowActive()) {
      if (router.canGoBack()) router.back();
      else router.replace('/home');
      return undefined;
    }

    (async () => {
      let ok = false;
      if (isSupabaseConfigured) {
        const codeValue = Array.isArray(code) ? code[0] : code;
        if (codeValue && !error) {
          const result = await exchangeCodeOnce(codeValue);
          ok = !result.error;
        }
        if (!ok) {
          // Une session peut déjà être ouverte par un autre chemin.
          const { data } = await supabase.auth.getSession();
          ok = !!data?.session;
        }
      }
      if (cancelled) return;
      if (!ok) {
        setFailed(true);
        return;
      }
      // Pile propre : plus d'écran « Connexion » sous le Profil.
      if (router.canDismiss()) router.dismissAll();
      router.replace('/home');
      router.push('/profile');
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <GradientBackground colors={['#1A1A1A', '#0A0A0A', '#000000']} ambient>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          {failed ? (
            <>
              <Text style={styles.title}>Ce lien n'a pas fonctionné</Text>
              <Text style={styles.body}>
                Il a peut-être expiré, ou il a été ouvert sur un autre téléphone. Reviens à
                l'accueil et connecte-toi de nouveau.
              </Text>
              <Button
                variant="solid"
                size="lg"
                fullWidth
                label="Retour à l'accueil"
                style={styles.cta}
                onPress={() => router.replace('/home')}
              />
            </>
          ) : (
            <>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.body}>Connexion en cours…</Text>
            </>
          )}
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.60)',
    textAlign: 'center',
    marginTop: 12,
  },
  cta: { marginTop: 24 },
});
