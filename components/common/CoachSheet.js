import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import Button from './Button';
import AppIcon from './AppIcon';
import DotsLoader from './DotsLoader';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { previewVoice, STYLE_SAMPLES } from '../../lib/voiceCoach';

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
  },
  {
    value: 'motivating',
    label: 'Motivant',
    desc: "Des phrases de coach qui t'encouragent et te disent où tu en es.",
  },
];

// Niveau d'annonces : Discret = le comportement d'avant la V1.2 (par défaut,
// pour qui écoute de la musique), Détaillé = en plus la durée de l'effort et
// du repos, dite une fois puis quand elle change.
export const COACH_DETAILS = [
  {
    value: 'discreet',
    label: 'Discret',
    desc: 'Parle peu : le tour et le repos.',
  },
  {
    value: 'detailed',
    label: 'Détaillé',
    desc: "Ajoute la durée de l'effort et du repos.",
  },
];

const GENDERS = [
  { value: 'female', label: 'FEMME' },
  { value: 'male', label: 'HOMME' },
];

// Ce que la carte affiche = ce que la voix dit à l'aperçu (même source).
const sampleText = (style, detail) => {
  const s = STYLE_SAMPLES[style] || STYLE_SAMPLES.essential;
  return `« ${s[detail] || s.discreet} »`;
};

export default function CoachSheet({
  screenH,
  style,
  gender,
  detail = 'discreet',
  maleVoiceAvailable,
  onChangeStyle,
  onChangeDetail,
  onChangeGender,
  onClose,
}) {
  // Aperçu en cours (la voix met un moment à démarrer) : { 'style:essential' }
  const [loadingKey, setLoadingKey] = useState(null);
  const play = (key, params) => {
    setLoadingKey(key);
    previewVoice(params).finally(() => setLoadingKey((k) => (k === key ? null : k)));
  };

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
                  play(`style:${opt.value}`, { style: opt.value, gender, detail });
                }}
                style={({ pressed }) => [
                  styles.card,
                  active && styles.cardActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.cardHead}>
                  <Text style={[styles.cardLabel, !active && styles.dim]}>{opt.label}</Text>
                  {loadingKey === `style:${opt.value}` ? (
                    <DotsLoader size={4} />
                  ) : (
                    <View style={[styles.radio, active && styles.radioActive]}>
                      {active && <View style={styles.radioDot} />}
                    </View>
                  )}
                </View>
                <Text style={[styles.cardDesc, !active && styles.dim]}>{opt.desc}</Text>
                <Text style={[styles.cardSample, !active && styles.dim]}>
                  {sampleText(opt.value, detail)}
                </Text>
              </Pressable>
            );
          })}

          <Text style={[styles.sectionLabel, { marginTop: 8 }]}>NIVEAU D'ANNONCES</Text>
          <View style={styles.detailRow}>
            {COACH_DETAILS.map((opt) => {
              const active = opt.value === detail;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    haptic.selection();
                    onChangeDetail?.(opt.value);
                    play(`detail:${opt.value}`, { style, gender, detail: opt.value });
                  }}
                  style={({ pressed }) => [
                    styles.detailCard,
                    active && styles.cardActive,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.detailHead}>
                    <AppIcon
                      name="bulb"
                      size={22}
                      color="#FFFFFF"
                      opacity={active ? 1 : 0.4}
                    />
                    {loadingKey === `detail:${opt.value}` && <DotsLoader size={4} />}
                  </View>
                  <Text style={[styles.cardLabel, !active && styles.dim]}>{opt.label}</Text>
                  <Text style={[styles.detailDesc, !active && styles.dim]}>{opt.desc}</Text>
                  <Text style={[styles.cardSample, !active && styles.dim]}>
                    {sampleText(style, opt.value)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

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
                        play(`gender:${opt.value}`, { style, gender: opt.value, detail });
                      }}
                      style={[styles.genderChip, active && styles.genderChipActive]}
                      hitSlop={4}
                    >
                      {loadingKey === `gender:${opt.value}` ? (
                        <DotsLoader size={4} color={active ? '#0A0A0A' : '#FFFFFF'} />
                      ) : (
                        <Text style={[styles.genderLabel, active && styles.genderLabelActive]}>
                          {opt.label}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* Les prochains réglages du coach viendront ici. */}

          <Button
            variant="solid"
            label="C'est bon"
            fullWidth
            onPress={() => {
              haptic.light();
              close();
            }}
            style={styles.cta}
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
    borderRadius: 20,
    padding: 16,
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
  detailRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  detailCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  detailHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 22,
  },
  detailDesc: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.75)',
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
  },
});
