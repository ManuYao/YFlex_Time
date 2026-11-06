import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import BottomSheet from '../common/BottomSheet';
import Button from '../common/Button';
import PressTap from '../common/PressTap';
import { haptic } from '../../hooks/useHaptic';
import { fonts } from '../../lib/fonts';
import {
  GAME_EXERCISE_MAX,
  MAX_GAME_EXERCISES,
  cleanExerciseLabel,
  exerciseOptions,
  normalizeExercises,
  toggleExercise,
} from '../../lib/gameExercises';

const tint = (hex, alpha) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

/**
 * « Ton exercice » — la fenêtre qui s'ouvre quand on MAINTIENT un score de jeu.
 * Volontairement légère (retour du 06/11 : « trop d'éléments ») : une poignée de fiches
 * à toucher (2 au plus), une case pour ajouter la sienne, un bouton. Rien ne s'ouvre
 * seule : c'est la personne qui décide de noter son exercice.
 *
 * Props:
 * - screenH  : hauteur de l'écran (BottomSheet)
 * - accent   : couleur du jeu (hex)
 * - initial  : exercices déjà notés pour ce score
 * - recent   : exercices utilisés dans les dernières parties
 * - custom   : exercices ajoutés par la personne
 * - onSave   : (exercises: string[]) => void, appelé au « Enregistrer »
 * - onClose  : la fenêtre est fermée (avec ou sans enregistrement)
 */
export default function GameExerciseSheet({ screenH, accent, initial, recent, custom, onSave, onClose }) {
  const [selected, setSelected] = useState(() => normalizeExercises(initial));
  const [draft, setDraft] = useState('');
  // Les fiches se figent à l'ouverture, plus celles qu'on ajoute : elles ne bougent pas
  // sous le doigt quand on en touche une.
  const [extra, setExtra] = useState([]);
  const [options] = useState(() => exerciseOptions({ selected: initial, recent, custom }));
  const shown = [...options, ...extra.filter((x) => !options.some((o) => o.toLowerCase() === x.toLowerCase()))];

  const touch = (label) => {
    haptic.selection();
    setSelected((s) => toggleExercise(s, label));
  };

  const addDraft = () => {
    const label = cleanExerciseLabel(draft);
    if (!label) return;
    haptic.light();
    if (!shown.some((x) => x.toLowerCase() === label.toLowerCase())) setExtra((e) => [...e, label]);
    setSelected((s) =>
      s.some((x) => x.toLowerCase() === label.toLowerCase()) ? s : toggleExercise(s, label)
    );
    setDraft('');
  };

  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={140} keyboardAware>
      {({ close }) => (
        <View>
          <Text style={styles.kicker}>TON EXERCICE</Text>
          <Text style={styles.title}>Qu’as-tu fait ?</Text>
          <Text style={styles.hint}>Touche pour choisir ({MAX_GAME_EXERCISES} au maximum).</Text>

          <View style={styles.chips}>
            {shown.map((label) => {
              const on = selected.some((x) => x.toLowerCase() === label.toLowerCase());
              return (
                <PressTap
                  key={label}
                  onPress={() => touch(label)}
                  tapScale={0.96}
                  style={[
                    styles.chip,
                    on && { backgroundColor: accent, borderColor: accent },
                  ]}
                  accessibilityLabel={`${label}${on ? ', choisi' : ''}`}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
                    {label}
                  </Text>
                </PressTap>
              );
            })}
          </View>

          <View style={[styles.addRow, { borderColor: tint(accent, 0.35) }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ajouter le mien"
              placeholderTextColor="rgba(255,255,255,0.35)"
              selectionColor="#FFFFFF"
              maxLength={GAME_EXERCISE_MAX}
              returnKeyType="done"
              onSubmitEditing={addDraft}
              style={styles.input}
            />
            <PressTap
              onPress={addDraft}
              tapScale={0.92}
              style={[styles.addBtn, { backgroundColor: tint(accent, 0.22) }]}
              accessibilityLabel="Ajouter cet exercice"
            >
              <Text style={[styles.addText, { color: '#FFFFFF' }]}>Ajouter</Text>
            </PressTap>
          </View>

          <Button
            variant="solid"
            icon="check"
            label="Enregistrer"
            haptic={haptic.medium}
            onPress={() => {
              onSave(selected);
              close();
            }}
            fullWidth
            style={styles.cta}
          />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 4,
  },
  hint: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  chipText: { fontFamily: fonts.sansBold, fontSize: 13, color: '#FFFFFF' },
  chipTextOn: { color: '#1A0C04' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingLeft: 16,
    paddingRight: 6,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  input: {
    flex: 1,
    fontFamily: fonts.sansSemibold,
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  addBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontFamily: fonts.sansBold, fontSize: 13 },
  cta: { marginTop: 18 },
});
