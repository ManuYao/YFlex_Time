import { useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import GradientBackground from '../components/common/GradientBackground';
import IconButton from '../components/common/IconButton';
import Button from '../components/common/Button';
import PressTap from '../components/common/PressTap';
import { useAuth } from '../contexts/AuthContext';
import { useHaptic } from '../hooks/useHaptic';
import { useKeyboardHeight, scrollToFocusedInput } from '../hooks/useKeyboardHeight';
import { fonts } from '../lib/fonts';
import { validatePseudo } from '../lib/profile';
import { DANGER } from '../lib/buttonTokens';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const router = useRouter();
  const haptic = useHaptic();
  const insets = useSafeAreaInsets();
  const { isConfigured, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  // Champs à entourer en rouge : { email, password, name }.
  const [bad, setBad] = useState({});
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const keyboardHeight = useKeyboardHeight();
  const liftStyle = useAnimatedStyle(() => ({
    height: Math.max(insets.bottom + 24, keyboardHeight.value + 16),
  }));

  const switchMode = (next) => {
    if (next === mode) return;
    haptic.selection();
    setMode(next);
    setBad({});
    setError(null);
    setInfo(null);
  };

  // Renvoie le premier message d'erreur ; entoure en rouge TOUS les champs à corriger.
  const validate = () => {
    const flags = {};
    let message = null;
    if (mode === 'signup' && name.trim()) {
      const check = validatePseudo(name);
      if (!check.ok) {
        flags.name = true;
        message = check.reason;
      }
    }
    if (!EMAIL_RE.test(email.trim())) {
      flags.email = true;
      message = 'Adresse email invalide.';
    }
    if (password.length < 6) {
      flags.password = true;
      message = email.trim() && flags.email ? message : '6 caractères minimum pour le mot de passe.';
    }
    setBad(flags);
    return message;
  };

  const handleSubmit = async () => {
    if (!isConfigured) return;
    const problem = validate();
    if (problem) {
      haptic.warning();
      setError(problem);
      return;
    }
    setError(null);
    setBad({});
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { session } = await signUpWithEmail(
          email,
          password,
          name.trim() ? validatePseudo(name).value : undefined
        );
        haptic.success();
        if (session) {
          router.back();
        } else {
          setInfo('Compte créé. Vérifie ta boîte mail pour confirmer ton adresse.');
        }
      } else {
        await signInWithEmail(email, password);
        haptic.success();
        router.back();
      }
    } catch (e) {
      haptic.warning();
      setError(e?.message || 'Une erreur est survenue.');
      // Identifiants refusés : on ne sait pas lequel est faux, on entoure les deux.
      if (mode === 'signin') setBad({ email: true, password: true });
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    if (!isConfigured) return;
    setError(null);
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
      haptic.success();
      router.back();
    } catch (e) {
      haptic.warning();
      setError(e?.message || 'Une erreur est survenue.');
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <GradientBackground colors={['#1A1A1A', '#0A0A0A', '#000000']} ambient>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <IconButton
            icon="back"
            haptic={haptic.light}
            onPress={() => router.back()}
            accessibilityLabel="Retour"
          />
          <Text style={styles.topTitle}>Connexion</Text>
          <View style={styles.iconBtnGhost} />
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View ref={contentRef} collapsable={false}>
            <Text style={styles.heading}>{mode === 'signup' ? 'Créer un compte' : 'Connecte-toi'}</Text>
            <Text style={styles.subheading}>
              Optionnel : l'app marche très bien sans compte. Un compte sert à retrouver ton
              historique sur un autre téléphone et à publier tes MIX.
            </Text>

            <View style={styles.tabs}>
              <Tab label="Connexion" active={mode === 'signin'} onPress={() => switchMode('signin')} />
              <Tab label="Créer un compte" active={mode === 'signup'} onPress={() => switchMode('signup')} />
            </View>

            {!isConfigured ? (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>La connexion arrive bientôt sur Flex Timer.</Text>
              </View>
            ) : (
              <>
                {mode === 'signup' && (
                  <TextInput
                    value={name}
                    onChangeText={(v) => {
                      setName(v);
                      if (bad.name) setBad((b) => ({ ...b, name: false }));
                    }}
                    onFocus={() => setTimeout(() => scrollToFocusedInput(scrollRef, contentRef), 60)}
                    placeholder="Ton nom ou pseudo (facultatif)"
                    placeholderTextColor="rgba(255,255,255,0.30)"
                    autoCapitalize="words"
                    autoCorrect={false}
                    maxLength={20}
                    style={[styles.input, bad.name && styles.inputBad, { marginBottom: 10 }]}
                    returnKeyType="next"
                  />
                )}
                <TextInput
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    if (bad.email) setBad((b) => ({ ...b, email: false }));
                  }}
                  onFocus={() => setTimeout(() => scrollToFocusedInput(scrollRef, contentRef), 60)}
                  placeholder="Adresse email"
                  placeholderTextColor="rgba(255,255,255,0.30)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, bad.email && styles.inputBad]}
                  returnKeyType="next"
                />
                <TextInput
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    if (bad.password) setBad((b) => ({ ...b, password: false }));
                  }}
                  onFocus={() => setTimeout(() => scrollToFocusedInput(scrollRef, contentRef), 60)}
                  placeholder="Mot de passe"
                  placeholderTextColor="rgba(255,255,255,0.30)"
                  secureTextEntry
                  autoCapitalize="none"
                  style={[styles.input, bad.password && styles.inputBad, { marginTop: 10 }]}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                {info ? <Text style={styles.infoText}>{info}</Text> : null}

                <Button
                  variant="solid"
                  size="lg"
                  fullWidth
                  style={{ marginTop: 18 }}
                  label={mode === 'signup' ? 'Créer un compte' : 'Se connecter'}
                  onPress={handleSubmit}
                  disabled={busy}
                >
                  {busy ? <ActivityIndicator color="#0A0A0A" /> : undefined}
                </Button>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OU</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Button
                  variant="glass"
                  size="lg"
                  fullWidth
                  label="Continuer avec Google"
                  onPress={handleGoogle}
                  disabled={googleBusy}
                >
                  {googleBusy ? <ActivityIndicator color="#FFFFFF" /> : undefined}
                </Button>

                <Text style={styles.legalNote}>
                  En continuant, tu acceptes les{' '}
                  <Text style={styles.legalLink} onPress={() => router.push('/terms')}>
                    conditions d'utilisation
                  </Text>{' '}
                  et la{' '}
                  <Text style={styles.legalLink} onPress={() => router.push('/privacy')}>
                    politique de confidentialité
                  </Text>
                  .
                </Text>
              </>
            )}
          </View>
          <Animated.View style={liftStyle} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function Tab({ label, active, onPress }) {
  return (
    <PressTap
      onPress={onPress}
      containerStyle={styles.tabContainer}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </PressTap>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  topTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  iconBtnGhost: { width: 44, height: 44 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subheading: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.60)',
    marginTop: 8,
    marginBottom: 24,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tabContainer: {
    flex: 1,
  },
  tab: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  tabText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontFamily: fonts.sansSemibold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  inputBad: {
    borderColor: DANGER,
    borderWidth: 1.5,
  },
  errorText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    color: DANGER,
    marginTop: 12,
  },
  infoText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dividerText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.35)',
    marginHorizontal: 12,
  },
  legalNote: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginTop: 18,
  },
  legalLink: {
    color: 'rgba(255,255,255,0.75)',
    textDecorationLine: 'underline',
  },
  noticeBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 18,
  },
  noticeText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
  },
});
