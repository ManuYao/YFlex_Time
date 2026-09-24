import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import BottomSheet from './BottomSheet';
import PressTap from './PressTap';
import Button from './Button';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';

// Les trois accents viennent des modes de chrono (AMRAP / EMOM / TABATA) :
// pas de nouvelle couleur introduite pour cet écran.
const POINTS = [
  {
    color: '#FF5454',
    title: 'Un souci ?',
    text: "Raconte ce que tu faisais et ce qui s'est passé. Même « le bouton ne répond pas » m'aide.",
  },
  {
    color: '#1FC777',
    title: 'Une idée ?',
    text: 'Dis-moi ce qui te manque ou ce que tu changerais. Rien n’est trop bête à proposer.',
  },
  {
    color: '#FFC933',
    title: 'Une photo, une vidéo',
    text: "Joins une capture ou un petit enregistrement à ton mail : c'est ce qui aide le plus.",
  },
];

/**
 * Feuille d'information affichée avant d'ouvrir l'application mail depuis
 * Paramètres > Contact. Le voile et la croix ferment sans rien envoyer ;
 * seul le bouton ouvre le mail.
 */
export default function ContactSheet({ screenH, onClose, onOpenMail }) {
  const [dontShow, setDontShow] = useState(false);

  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={96}>
      {({ close }) => (
        <View>
          <Text style={styles.title}>Avant d'écrire</Text>
          <Text style={styles.subtitle}>CONTACT</Text>

          <View style={styles.points}>
            {POINTS.map((p) => (
              <View key={p.title} style={styles.point}>
                <View style={[styles.dot, { backgroundColor: p.color }]} />
                <View style={styles.pointText}>
                  <Text style={styles.pointTitle}>{p.title}</Text>
                  <Text style={styles.pointBody}>{p.text}</Text>
                </View>
              </View>
            ))}
          </View>

          <PressTap
            onPress={() => {
              haptic.selection();
              setDontShow((v) => !v);
            }}
            tapScale={0.98}
            style={styles.checkRow}
          >
            <View style={[styles.checkbox, dontShow && styles.checkboxOn]}>
              {dontShow && (
                <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                  <Path
                    d="M2.5 6.2l2.4 2.4 4.6-5"
                    stroke="#0A0A0A"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              )}
            </View>
            <Text style={styles.checkLabel}>Ne plus afficher ce message</Text>
          </PressTap>

          <Button
            variant="solid"
            fullWidth
            label="Ouvrir mon mail"
            onPress={() => {
              haptic.medium();
              onOpenMail(dontShow);
              close();
            }}
            style={styles.cta}
          />

          <Button
            variant="ghost"
            size="md"
            label="Plus tard"
            haptic={haptic.light}
            onPress={close}
            style={styles.cancel}
          />
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

  points: {
    marginTop: 20,
    gap: 16,
  },
  point: {
    flexDirection: 'row',
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  pointText: {
    flex: 1,
    minWidth: 0,
  },
  pointTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 13.5,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  pointBody: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 2,
  },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
    paddingVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  checkLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },

  cta: {
    marginTop: 18,
  },
  cancel: {
    marginTop: 4,
  },
});
