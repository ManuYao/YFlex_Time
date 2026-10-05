import React, { useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import TutorialFrame from './TutorialFrame';
import TutorialMiniPhone from './TutorialMiniPhone';
import Button from '../common/Button';
import { fonts } from '../../lib/fonts';
import { useHaptic } from '../../hooks/useHaptic';

// Niveau 2 (facultatif, proposé à la fin du niveau 1) : Historique, Planning,
// Profil — le strict nécessaire pour savoir OÙ aller. Trois cartes, un tap
// chacune, une illustration qui montre le bouton à toucher. Rien à lire en
// détail : l'app se découvre ensuite en la pratiquant.
//
// Couleurs reprises des modes (aucune couleur inventée) : une par page, le
// jaune de TABATA gardant son texte noir.
const SLIDES = [
  {
    id: 'history',
    name: 'HISTORIQUE',
    colors: ['#FFC933', '#E08500', '#5C2E00'],
    textMode: 'dark',
    target: 'hub',
    popover: 'history',
    body: "Toutes tes séances, jour par jour, avec ton temps total et ta série. Ouvre le menu en haut à gauche, puis touche Historique.",
  },
  {
    id: 'planning',
    name: 'PLANNING',
    colors: ['#1FC777', '#047442', '#022A18'],
    textMode: 'light',
    target: 'hub',
    popover: 'planning',
    body: "Prépare ta semaine : blocs, exercices, charges. Même menu, ou glisse l'Historique vers la gauche.",
  },
  {
    id: 'profile',
    name: 'PROFIL',
    colors: ['#9575FF', '#4B2FC9', '#1A0D52'],
    textMode: 'light',
    target: 'profile',
    popover: null,
    body: "Ta régularité, tes stats, tes trophées et tes mix partagés. C'est le bouton en haut à droite.",
  },
];

export default function TutorialTour({ onDone, onQuit }) {
  const haptic = useHaptic();
  const { height: screenH } = useWindowDimensions();
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const isLast = i === SLIDES.length - 1;
  const dark = slide.textMode === 'dark';
  const ink = dark ? '#0A0A0A' : '#FFFFFF';
  const body = dark ? 'rgba(10,10,10,0.78)' : 'rgba(255,255,255,0.84)';

  // Le téléphone rétrécit dans une fenêtre basse au lieu de déborder.
  const k = Math.max(0.55, Math.min(1, (screenH - 430) / 300));

  return (
    <TutorialFrame
      colors={slide.colors}
      textMode={slide.textMode}
      eyebrow="Tour guidé · Niveau 2 · Les écrans"
      index={i}
      total={SLIDES.length}
      onQuit={onQuit}
      footer={
        <Button
          variant="solid"
          tone={slide.textMode}
          fullWidth
          icon={isLast ? 'play' : 'arrow'}
          iconPosition={isLast ? 'left' : 'right'}
          label={isLast ? "C'est parti" : 'Suivant'}
          haptic={isLast ? haptic.medium : haptic.light}
          onPress={() => (isLast ? onDone() : setI(i + 1))}
        />
      }
    >
      {/* key = la page : tout le contenu se remonte, donc l'illustration et le
          texte rejouent leur entrée à chaque carte. */}
      <Animated.View key={slide.id} entering={FadeIn.duration(260)} style={styles.page}>
        <TutorialMiniPhone target={slide.target} popover={slide.popover} dark={dark} k={k} />
        <Animated.View entering={FadeInDown.delay(120).duration(300)} style={styles.text}>
          <Text style={[styles.name, { color: ink }]}>{slide.name}</Text>
          <Text style={[styles.body, { color: body }]}>{slide.body}</Text>
        </Animated.View>
      </Animated.View>
    </TutorialFrame>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 22,
  },
  text: {
    alignItems: 'center',
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 38,
    // Anton : ×1,18 (piège n°19).
    lineHeight: 45,
    letterSpacing: 1,
    includeFontPadding: false,
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: 6,
  },
});
