import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import BottomSheet from './BottomSheet';
import PressTap from './PressTap';
import { fonts } from '../../lib/fonts';
import { categoryChip, getCategory } from '../../lib/exercises';
import { haptic } from '../../hooks/useHaptic';

// Virgule décimale : l'app est en français, « 62,5 kg » et pas « 62.5 kg ».
const kg = (w) => String(w).replace('.', ',');

/**
 * Conseil de surcharge progressive, déclenché depuis l'accueil quand un
 * exercice revient depuis des semaines à la même charge (lib/progression.js).
 * Ton volontairement d'ami : on propose, on n'impose pas — le voile, le
 * retour Android et « Pas maintenant » ferment sans rien changer. Seul le
 * bouton principal emmène vers l'étiquette pour ajuster.
 */
export default function ProgressionSheet({ screenH, suggestion, onAdjust, onClose }) {
  const { label, category, weight, suggested, count, weeks } = suggestion;
  const cat = getCategory(category);
  const chip = categoryChip(category);
  // La navigation attend la fin de l'animation de fermeture : partir vers le
  // planning pendant qu'elle joue laisserait le BackHandler de la feuille
  // armé sous l'écran suivant le temps de la transition.
  const adjustRef = useRef(false);

  return (
    <BottomSheet
      screenH={screenH}
      onClose={() => {
        if (adjustRef.current) onAdjust();
        onClose();
      }}
      zIndex={95}
    >
      {({ close }) => (
        <View>
          <Text style={styles.title}>Et si tu montais un peu ?</Text>
          <Text style={styles.subtitle}>SURCHARGE PROGRESSIVE</Text>

          <View style={styles.exerciseRow}>
            <View
              style={[styles.exerciseChip, { backgroundColor: chip.bg, borderColor: chip.border }]}
            >
              <Text style={[styles.exerciseText, { color: chip.text }]}>
                {label.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.catText, { color: cat.text }]}>{cat.label}</Text>
          </View>

          <View style={styles.weights}>
            <View style={styles.weightCol}>
              <Text style={styles.weightLabel}>AUJOURD'HUI</Text>
              <View style={styles.weightRow}>
                <Text style={[styles.weightValue, styles.weightValueDim]}>{kg(weight)}</Text>
                <Text style={[styles.weightUnit, styles.weightValueDim]}>kg</Text>
              </View>
            </View>

            <Svg width={22} height={22} viewBox="0 0 22 22" fill="none" style={styles.arrow}>
              <Path
                d="M4 11h13M12 6l5 5-5 5"
                stroke={cat.color}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>

            <View style={styles.weightCol}>
              <Text style={[styles.weightLabel, { color: cat.text }]}>PROCHAINE</Text>
              <View style={styles.weightRow}>
                <Text style={styles.weightValue}>{kg(suggested)}</Text>
                <Text style={styles.weightUnit}>kg</Text>
              </View>
            </View>
          </View>

          <Text style={styles.body}>
            Tu l'as fait {count} fois sur {weeks} semaines, toujours à {kg(weight)} kg. Ton corps
            s'est adapté : c'est le bon moment pour ajouter un cran. Un petit pas à la fois,
            c'est comme ça qu'on progresse sans se blesser.
          </Text>

          <PressTap
            onPress={() => {
              haptic.medium();
              adjustRef.current = true;
              close();
            }}
            tapScale={0.97}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>AJUSTER LA CHARGE</Text>
          </PressTap>

          <PressTap onPress={close} tapScale={0.97} style={styles.cancel}>
            <Text style={styles.cancelText}>Pas maintenant</Text>
          </PressTap>

          <Text style={styles.disclaimer}>
            Conseil indicatif, à adapter à ta forme du jour. Ce n'est pas un avis médical.
          </Text>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: fonts.monoRegular,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 3,
  },

  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  exerciseChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exerciseText: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    letterSpacing: 0.6,
  },
  catText: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.6,
    opacity: 0.7,
  },

  weights: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginTop: 22,
    paddingVertical: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  weightCol: {
    alignItems: 'center',
    minWidth: 96,
  },
  weightLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.40)',
    marginBottom: 4,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  weightValue: {
    fontFamily: fonts.display,
    fontSize: 44,
    lineHeight: 48,
    includeFontPadding: false,
    color: '#FFFFFF',
  },
  weightUnit: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  weightValueDim: {
    color: 'rgba(255,255,255,0.40)',
  },
  arrow: {
    marginTop: 14,
  },

  body: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.60)',
    marginTop: 18,
  },

  cta: {
    marginTop: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    letterSpacing: 1.2,
    color: '#0A0A0A',
  },
  cancel: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
  },
  disclaimer: {
    fontFamily: fonts.sansMedium,
    fontSize: 10.5,
    lineHeight: 14,
    color: 'rgba(255,255,255,0.30)',
    textAlign: 'center',
    marginTop: 6,
  },
});
