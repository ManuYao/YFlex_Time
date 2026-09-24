import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { previewVoice } from '../../lib/voiceCoach';

// Fenêtre « Ton coach » (Paramètres > Audio et haptique > Personnaliser le
// coach). Regroupe TOUS les réglages de la voix du coach, pour que les
// prochaines options (packs de voix, fréquence des annonces…) viennent
// s'ajouter ici au lieu d'allonger la page Paramètres.
//
// Chaque choix se fait entendre tout de suite (exemple dans la voix et le
// style choisis) : on juge une voix à l'oreille, pas sur une description.

// Essentiel en premier : c'est le style par défaut (décision utilisateur,
// « en général ils voudront un truc court et rapide »).
export const COACH_STYLES = [
  {
    value: 'essential',
    label: 'Essentiel',
    desc: "Juste l'info, tranchée, en une ou deux secondes.",
    sample: '« 3 sur 8. »  « Repos. 30 secondes. »',
  },
  {
    value: 'motivating',
    label: 'Motivant',
    desc: "Des phrases de coach qui t'encouragent et te disent où tu en es.",
    sample: '« Moitié du repos, respire profondément. »',
  },
];

const GENDERS = [
  { value: 'female', label: 'FEMME' },
  { value: 'male', label: 'HOMME' },
];

export default function CoachSheet({
  screenH,
  style,
  gender,
  maleVoiceAvailable,
  onChangeStyle,
  onChangeGender,
  onClose,
}) {
  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={95}>
      {({ close }) => (
        <View>
          <Text style={styles.title}>Ton coach</Text>
          <Text style={styles.subtitle}>TOUCHE UN CHOIX POUR L'ÉCOUTER</Text>

          <Text style={styles.sectionLabel}>FAÇON DE PARLER</Text>
          {COACH_STYLES.map((opt) => {
            const active = opt.value === style;
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  haptic.selection();
                  onChangeStyle(opt.value);
                  previewVoice({ style: opt.value, gender });
                }}
                style={({ pressed }) => [
                  styles.card,
                  active && styles.cardActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.cardHead}>
                  <Text style={[styles.cardLabel, !active && styles.dim]}>{opt.label}</Text>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active && <View style={styles.radioDot} />}
                  </View>
                </View>
                <Text style={[styles.cardDesc, !active && styles.dim]}>{opt.desc}</Text>
                <Text style={[styles.cardSample, !active && styles.dim]}>{opt.sample}</Text>
              </Pressable>
            );
          })}

          {/* Proposé seulement si le téléphone a une vraie voix d'homme en
              français — sinon on reste en voix femme, sans option. */}
          {maleVoiceAvailable && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 18 }]}>VOIX</Text>
              <View style={styles.genderRow}>
                {GENDERS.map((opt) => {
                  const active = opt.value === gender;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        haptic.selection();
                        onChangeGender(opt.value);
                        previewVoice({ style, gender: opt.value });
                      }}
                      style={[styles.genderChip, active && styles.genderChipActive]}
                      hitSlop={4}
                    >
                      <Text style={[styles.genderLabel, active && styles.genderLabelActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* Les prochains réglages du coach viendront ici. */}

          <Pressable
            onPress={() => {
              haptic.light();
              close();
            }}
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.ctaText}>C'EST BON</Text>
          </Pressable>
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
    marginBottom: 14,
  },
  subtitle: {
    fontFamily: fonts.monoRegular,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.40)',
    marginTop: -10,
    marginBottom: 18,
  },
  sectionLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.50)',
    marginBottom: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  cardActive: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  cardDesc: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.75)',
  },
  cardSample: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 6,
    fontStyle: 'italic',
  },
  dim: {
    opacity: 0.6,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: '#FFFFFF',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderChip: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  genderChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  genderLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.75)',
  },
  genderLabelActive: {
    color: '#0A0A0A',
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
});
