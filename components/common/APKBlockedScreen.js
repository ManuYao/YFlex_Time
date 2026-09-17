import React, { useEffect } from 'react';
import { View, Text, StyleSheet, BackHandler, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import GradientBackground from './GradientBackground';
import PressTap from './PressTap';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { useApkInstaller } from '../../hooks/useApkInstaller';
import { D, slideInY } from '../../lib/animations';

const MODE_COLORS = ['#FF5454', '#FFC933', '#1FC777', '#9575FF'];

const DEFAULT_MESSAGE =
  "Cette version de Flex Timer n'est plus utilisable. Télécharge la nouvelle pour continuer — tes séances et ton planning sont conservés.";

/**
 * Blocage plein écran quand une mise à jour est obligatoire
 * (lib/apkVersionCheck.js). Aucune sortie : pas de bouton retour, le bouton
 * retour Android est neutralisé, et l'écran est monté par-dessus toute
 * l'app dans app/_layout.js.
 *
 * Volontairement rouge (AMRAP) et non un dégradé neutre : c'est le seul
 * écran de l'app dont on veut qu'il soit impossible à confondre avec un
 * message d'information.
 */
export default function APKBlockedScreen({
  message,
  downloadUrl,
  currentVersion,
  minVersion,
}) {
  const insets = useSafeAreaInsets();
  const installer = useApkInstaller(downloadUrl);

  useEffect(() => {
    haptic.warning();
    // Rien à fermer : on avale le retour Android au lieu de laisser
    // l'utilisateur sortir de l'app par réflexe.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <GradientBackground colors={['#FF5454', '#0A0A0A', '#000000']} ambient>
        <View
          style={[
            styles.content,
            { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 28 },
          ]}
        >
          <Animated.View entering={slideInY(10, D.base, 60)} style={styles.eyebrowRow}>
            <View style={styles.dots}>
              {MODE_COLORS.map((c) => (
                <View key={c} style={[styles.dot, { backgroundColor: c }]} />
              ))}
            </View>
            <Text style={styles.eyebrow}>Mise à jour requise</Text>
          </Animated.View>

          <Animated.Text entering={slideInY(12, D.base, 120)} style={styles.title}>
            {'MISE À JOUR\nOBLIGATOIRE'}
          </Animated.Text>

          <Animated.Text entering={slideInY(12, D.base, 180)} style={styles.body}>
            {message || DEFAULT_MESSAGE}
          </Animated.Text>

          <Animated.View entering={slideInY(12, D.base, 240)} style={styles.versions}>
            <View style={styles.versionCell}>
              <Text style={styles.versionLabel}>Installée</Text>
              <Text style={styles.versionValue}>{currentVersion || '—'}</Text>
            </View>
            <Text style={styles.versionArrow}>→</Text>
            <View style={styles.versionCell}>
              <Text style={styles.versionLabel}>Requise</Text>
              <Text style={[styles.versionValue, styles.versionTarget]}>
                {minVersion || '—'}
              </Text>
            </View>
          </Animated.View>

          <View style={styles.spacer} />

          {downloadUrl ? (
            <Animated.View entering={slideInY(14, D.base, 300)}>
              {installer.canAutoInstall ? (
                <>
                  <PressTap
                    onPress={installer.autoInstall}
                    disabled={installer.status === 'downloading'}
                    accessibilityLabel="Installer automatiquement la mise à jour"
                  >
                    <LinearGradient
                      colors={MODE_COLORS}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.cta, installer.status === 'downloading' && styles.ctaBusy]}
                    >
                      <Text style={styles.ctaText}>
                        {installer.status === 'downloading'
                          ? `Téléchargement… ${Math.round(installer.progress * 100)}%`
                          : 'Installer automatiquement'}
                      </Text>
                    </LinearGradient>
                  </PressTap>

                  <PressTap
                    onPress={installer.openInBrowser}
                    accessibilityLabel="Télécharger dans le navigateur"
                    style={styles.secondaryBtn}
                  >
                    <Text style={styles.secondaryBtnText}>Télécharger dans le navigateur</Text>
                  </PressTap>

                  {installer.status === 'error' && (
                    <Text style={styles.errorText}>
                      L'installation automatique a échoué — utilise le téléchargement
                      dans le navigateur ci-dessus.
                    </Text>
                  )}
                </>
              ) : (
                <PressTap onPress={installer.openInBrowser} accessibilityLabel="Télécharger la mise à jour">
                  <LinearGradient
                    colors={MODE_COLORS}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.cta}
                  >
                    <Text style={styles.ctaText}>Télécharger la mise à jour</Text>
                  </LinearGradient>
                </PressTap>
              )}
              <Text style={styles.hint} numberOfLines={2}>
                {downloadUrl}
              </Text>
            </Animated.View>
          ) : (
            <Animated.Text entering={slideInY(14, D.base, 300)} style={styles.hint}>
              Aucun lien de téléchargement n'a été fourni. Contacte-nous depuis
              le mail de l'app pour recevoir la nouvelle version.
            </Animated.Text>
          )}
        </View>
      </GradientBackground>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  eyebrow: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 46,
    lineHeight: 48,
    letterSpacing: -0.5,
    color: '#FFFFFF',
    marginBottom: 14,
  },
  body: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 23,
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 24,
  },

  versions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  versionCell: {
    flex: 1,
    gap: 4,
  },
  versionLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
  },
  versionValue: {
    fontFamily: fonts.monoExtraBold,
    fontSize: 20,
    color: 'rgba(255,255,255,0.90)',
  },
  versionTarget: {
    color: '#1FC777',
  },
  versionArrow: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    color: 'rgba(255,255,255,0.35)',
  },

  spacer: {
    flex: 1,
    minHeight: 24,
  },

  cta: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBusy: {
    opacity: 0.7,
  },
  ctaText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    letterSpacing: -0.15,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  secondaryBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryBtnText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 14,
    letterSpacing: -0.1,
    color: 'rgba(255,255,255,0.72)',
    textDecorationLine: 'underline',
  },
  errorText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: '#FF8A8A',
    marginTop: 8,
  },
  hint: {
    fontFamily: fonts.monoRegular,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.38)',
    marginTop: 14,
  },
});
