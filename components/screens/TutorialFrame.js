import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GradientBackground from '../common/GradientBackground';
import Button from '../common/Button';
import { fonts } from '../../lib/fonts';

/**
 * Cadre commun des étapes du tour guidé : fond à la couleur de l'étape, barre
 * du haut avec « Quitter » (TOUJOURS visible — le tutoriel n'est jamais imposé),
 * petits points d'avancement, contenu, puis pied de page (boutons).
 *
 * Mêmes proportions que l'onboarding (app/onboarding.js) pour que les deux se
 * lisent comme une seule famille.
 *
 * Props:
 * - colors, textMode : fond (dégradé d'un mode) et couleur du texte
 * - eyebrow          : petit libellé du haut (« NIVEAU 1 · LE MENU »)
 * - index, total     : point courant / nombre de points (omis = pas de points)
 * - onQuit, quitLabel
 * - footer           : boutons du bas
 */
export default function TutorialFrame({
  colors,
  textMode = 'light',
  eyebrow,
  index,
  total,
  onQuit,
  quitLabel = 'Quitter',
  children,
  footer,
}) {
  const isDark = textMode === 'dark';
  const ink = isDark ? '#0A0A0A' : '#FFFFFF';
  const muted = isDark ? 'rgba(10,10,10,0.55)' : 'rgba(255,255,255,0.65)';
  const dim = isDark ? 'rgba(10,10,10,0.20)' : 'rgba(255,255,255,0.20)';

  return (
    <GradientBackground colors={colors} textMode={textMode}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Text style={[styles.eyebrow, { color: muted }]} numberOfLines={1}>
            {eyebrow}
          </Text>
          <Button
            variant="ghost"
            size="sm"
            tone={textMode}
            label={quitLabel}
            labelStyle={styles.quit}
            onPress={onQuit}
          />
        </View>

        {total ? (
          <View style={styles.dots}>
            {Array.from({ length: total }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: i === index ? 28 : 5,
                    backgroundColor: i === index ? ink : i < index ? muted : dim,
                  },
                ]}
              />
            ))}
          </View>
        ) : (
          <View style={styles.dots} />
        )}

        <View style={styles.content}>{children}</View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    height: 44,
  },
  eyebrow: {
    flex: 1,
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
    marginRight: 12,
  },
  quit: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 14,
    marginTop: 4,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  content: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
    gap: 10,
  },
});
