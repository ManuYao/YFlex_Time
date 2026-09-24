import React, { useEffect } from 'react';
import { View, Text, StyleSheet, BackHandler, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import GradientBackground from './GradientBackground';
import Button from './Button';
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
  const isDownloading = installer.status === 'downloading';

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

          {/* Titre, message et versions centrés dans la hauteur libre (ils
              étaient collés en haut, un grand vide au milieu) — même mise en
              page que MaintenanceScreen. */}
          <View style={styles.middle}>
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
          </View>

          {downloadUrl ? (
            <Animated.View entering={slideInY(14, D.base, 300)}>
              {installer.canAutoInstall ? (
                <>
                  {/* Pendant le téléchargement : pas de `disabled` (l'estompage
                      à 38 % rendrait le pourcentage illisible) — le reflet est
                      coupé et l'appui est ignoré, comme le faisait l'ancien
                      `disabled`. Vibrations déjà dans useApkInstaller : pas de
                      prop `haptic` sur ces boutons. */}
                  <Button
                    variant="spectrum"
                    fullWidth
                    label={
                      isDownloading
                        ? `Téléchargement… ${Math.round(installer.progress * 100)}%`
                        : 'Installer automatiquement'
                    }
                    shine={!isDownloading}
                    onPress={isDownloading ? undefined : installer.autoInstall}
                    accessibilityLabel="Installer automatiquement la mise à jour"
                  />

                  <Button
                    variant="ghost"
                    size="md"
                    label="Télécharger dans le navigateur"
                    labelStyle={styles.linkText}
                    onPress={installer.openInBrowser}
                    accessibilityLabel="Télécharger dans le navigateur"
                    style={styles.secondaryLink}
                  />

                  {installer.status === 'error' && (
                    <Text style={styles.errorText}>
                      L'installation automatique a échoué — utilise le téléchargement
                      dans le navigateur ci-dessus.
                    </Text>
                  )}
                </>
              ) : (
                <Button
                  variant="spectrum"
                  fullWidth
                  label="Télécharger la mise à jour"
                  onPress={installer.openInBrowser}
                  accessibilityLabel="Télécharger la mise à jour"
                />
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
    justifyContent: 'center',
    gap: 10,
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 24,
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
  // lineHeight à ×1,18 pour Anton (piège n°19) : à 48 pour 46 px, les deux
  // lignes du titre se rognaient et se chevauchaient.
  title: {
    fontFamily: fonts.display,
    fontSize: 46,
    lineHeight: 54,
    letterSpacing: -0.5,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 14,
  },
  body: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 23,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
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
    alignItems: 'center',
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

  // Placement seulement : le rendu des boutons vient de Button
  // (lib/buttonTokens.js).
  secondaryLink: {
    marginTop: 10,
  },
  linkText: {
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
