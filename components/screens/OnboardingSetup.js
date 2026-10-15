import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';

import Button from '../common/Button';
import { useSettings } from '../../contexts/SettingsContext';
import { haptic, setHapticEnabled, setHapticStrength } from '../../hooks/useHaptic';
import { RAIN_OPTIONS, RAIN_SUBS } from '../../lib/rainMode';
import { markSeasonNudgeSeen } from '../../lib/seasonNudge';
import { fonts } from '../../lib/fonts';

/**
 * Étape « Tes réglages » de l'onboarding (premier démarrage seulement) : les
 * quatre réglages qu'on remarque le plus — ambiance de saison, coach vocal,
 * vibrations, mode pluie — réglés d'un tap, avant la première séance. Chaque
 * choix s'applique tout de suite (les mêmes réglages que Paramètres) ; ne rien
 * toucher = les réglages par défaut, et « Garder les réglages par défaut »
 * saute directement à la fin.
 */

const AMBIANCE = [
  { value: 'auto', label: 'Auto' },
  { value: 'seasons', label: 'Saisons' },
  { value: 'none', label: 'Aucune' },
];
const AMBIANCE_SUBS = {
  auto: "Les saisons et quelques moments de l'année.",
  seasons: 'Les quatre saisons seulement.',
  none: "L'app reste simple, sans décor de saison.",
};

const COACH = [
  { value: 'off', label: 'Sans' },
  { value: 'essential', label: 'Essentiel' },
  { value: 'motivating', label: 'Motivant' },
];
const COACH_SUBS = {
  off: 'Pas de voix : seulement les bips.',
  essential: 'Une voix courte et claire : « Tour 3 sur 8. »',
  motivating: "Une voix qui t'encourage tout au long de la séance.",
};

const VIBRATION = [
  { value: 'off', label: 'Sans' },
  { value: 'light', label: 'Léger' },
  { value: 'medium', label: 'Moyen' },
  { value: 'strong', label: 'Fort' },
];
const VIBRATION_SUBS = {
  off: 'Aucune vibration.',
  light: 'Un retour discret à chaque action.',
  medium: 'Un retour bien senti à chaque action.',
  strong: 'Un retour appuyé, même à travers un gant.',
};

export default function OnboardingSetup({ width, onSkip }) {
  const { settings, update } = useSettings();

  const ambiance = settings.ambianceMode || 'auto';
  const coach = settings.voiceCoach ? settings.voiceStyle || 'essential' : 'off';
  const vibration = settings.vibrate ? settings.vibrateStrength || 'medium' : 'off';
  const rain = settings.rainMode || 'normal';

  const pickAmbiance = (v) => {
    haptic.selection();
    update('ambianceMode', v);
    // Un choix fait ici est délibéré : l'alerte « ambiance de saison » de
    // l'accueil (lib/seasonNudge.js) n'a plus lieu d'être.
    markSeasonNudgeSeen();
  };
  const pickCoach = (v) => {
    haptic.selection();
    if (v === 'off') {
      update('voiceCoach', false);
      return;
    }
    update('voiceStyle', v);
    update('voiceCoach', true);
  };
  const pickVibration = (v) => {
    if (v === 'off') {
      update('vibrate', false);
      return;
    }
    update('vibrate', true);
    update('vibrateStrength', v);
    // Les réglages n'arrivent au module de vibrations qu'au rendu suivant : on
    // les lui donne tout de suite pour que le tap fasse sentir le niveau choisi.
    setHapticEnabled(true);
    setHapticStrength(v);
    haptic.medium();
  };
  const pickRain = (v) => {
    haptic.selection();
    update('rainMode', v);
  };

  return (
    <View style={[styles.slide, { width }]}>
      <ScrollView
        style={styles.scroll}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.tag}>TES RÉGLAGES</Text>
        <Text style={styles.title}>À ta façon</Text>
        <Text style={styles.lead}>Touche pour choisir. Tout se change plus tard dans les Paramètres.</Text>

        <Group
          label="AMBIANCE DE SAISON"
          options={AMBIANCE}
          value={ambiance}
          onPick={pickAmbiance}
          sub={AMBIANCE_SUBS[ambiance]}
        />
        <Group label="COACH VOCAL" options={COACH} value={coach} onPick={pickCoach} sub={COACH_SUBS[coach]} />
        <Group
          label="VIBRATIONS"
          options={VIBRATION}
          value={vibration}
          onPick={pickVibration}
          sub={VIBRATION_SUBS[vibration]}
        />
        <Group label="MODE PLUIE" options={RAIN_OPTIONS} value={rain} onPick={pickRain} sub={RAIN_SUBS[rain]} />

        <View style={styles.skipWrap}>
          <Button
            variant="ghost"
            size="sm"
            tone="light"
            label="Garder les réglages par défaut"
            onPress={onSkip}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Group({ label, options, value, onPick, sub }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.pills}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onPick(opt.value)}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]} numberOfLines={1}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.groupSub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {},
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  tag: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 4.4,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 30,
    letterSpacing: -0.8,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
  },
  lead: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  group: { marginBottom: 18 },
  groupLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2.4,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 8,
  },
  pills: { flexDirection: 'row', gap: 8 },
  pill: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  pillText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.80)',
  },
  pillTextActive: { color: '#0A0A0A' },
  groupSub: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 8,
    minHeight: 34,
  },
  skipWrap: { alignItems: 'center', marginTop: 2 },
});
