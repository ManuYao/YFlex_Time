import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import Button from './Button';
import IconButton from './IconButton';
import PressTap from './PressTap';
import { useSettings } from '../../contexts/SettingsContext';
import useAmbiance from '../../hooks/useAmbiance';
import { haptic } from '../../hooks/useHaptic';
import { fonts } from '../../lib/fonts';

// Feuille « Ambiance de saison » (Paramètres > Apparence). Trois choix, une
// phrase qui suit le choix, et l'ambiance du moment. Le choix s'applique tout
// de suite (la feuille reste ouverte) : on voit l'effet derrière, sur le
// bouton du haut, avant même de la fermer.

export const AMBIANCE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'seasons', label: 'Saisons' },
  { value: 'none', label: 'Aucune' },
];

const DESCRIPTIONS = {
  auto: "Les saisons et quelques moments de l'année.",
  seasons: 'Les quatre saisons seulement.',
  none: "L'app reste comme avant. Chacun choisit.",
};

// Résumé affiché sous la ligne des Paramètres : « Auto · Automne », « Aucune ».
export function ambianceSummary(mode, ambiance) {
  if (mode === 'none' || !ambiance) return 'Aucune';
  const name = AMBIANCE_OPTIONS.find((o) => o.value === mode)?.label ?? 'Auto';
  return `${name} · ${ambiance.label}`;
}

export default function AmbianceSheet({ screenH, onClose }) {
  const { settings, update } = useSettings();
  // `mode` est déjà ramené à une valeur connue ; `ambiance` vaut null en « Aucune ».
  const { mode, ambiance } = useAmbiance();

  const choose = (value) => {
    haptic.light();
    if (value !== settings.ambianceMode) update('ambianceMode', value);
  };

  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={95}>
      {({ close }) => (
        <View>
          <View style={styles.header}>
            {/* Décoratif : montre la couronne d'ambiance, rien à déclencher. */}
            <IconButton
              icon="season"
              halo="right"
              haloLive
              size={44}
              haptic={haptic.light}
              accessibilityLabel="Ambiance de saison"
            />
            <View style={styles.headerText}>
              <Text style={styles.title}>Ambiance de saison</Text>
              <Text style={styles.subtitle}>UNE TOUCHE DE SAISON SUR L'APP</Text>
            </View>
          </View>

          <View style={styles.segment}>
            {AMBIANCE_OPTIONS.map((opt) => {
              const active = opt.value === mode;
              return (
                <PressTap
                  key={opt.value}
                  onPress={() => choose(opt.value)}
                  tapScale={0.96}
                  accessibilityLabel={active ? `${opt.label}, choisi` : opt.label}
                  containerStyle={styles.segmentTap}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                >
                  <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                    {opt.label}
                  </Text>
                </PressTap>
              );
            })}
          </View>

          <Text style={styles.desc}>{DESCRIPTIONS[mode] ?? DESCRIPTIONS.auto}</Text>

          {mode !== 'none' && ambiance ? (
            <View style={styles.nowRow}>
              <View style={[styles.nowDot, { backgroundColor: ambiance.accent }]} />
              <Text style={styles.nowText}>
                En ce moment : <Text style={styles.nowLabel}>{ambiance.label}</Text>
              </Text>
            </View>
          ) : null}

          {mode !== 'none' ? (
            <Text style={styles.perfNote}>
              Les effets de saison demandent un peu plus de puissance : sur un téléphone ancien,
              l'app peut être moins fluide. Choisis « Aucune » si tu le remarques.
            </Text>
          ) : null}

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
  // La couronne du bouton déborde de 13 dp : on laisse de l'air autour.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 6,
    marginBottom: 22,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: fonts.monoRegular,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 4,
  },

  // Contrôle à trois choix : verre, le choisi est une pastille claire
  // (même langage que la maquette « Boutons », cellule Réglage).
  segment: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  segmentTap: {
    flex: 1,
  },
  segmentItem: {
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
  },
  segmentLabelActive: {
    fontFamily: fonts.sansBold,
    color: '#0A0A0A',
  },

  desc: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 14,
  },
  nowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 14,
  },
  nowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nowText: {
    flexShrink: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.55)',
  },
  nowLabel: {
    fontFamily: fonts.sansBold,
    color: '#FFFFFF',
  },
  perfNote: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.38)',
    marginTop: 14,
  },
  cta: {
    marginTop: 22,
  },
});
