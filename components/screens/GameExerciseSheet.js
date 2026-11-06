import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import AppIcon from '../common/AppIcon';
import BottomSheet from '../common/BottomSheet';
import Button from '../common/Button';
import PressTap from '../common/PressTap';
import { haptic } from '../../hooks/useHaptic';
import { fonts } from '../../lib/fonts';
import {
  GAME_EXERCISE_MAX,
  MAX_GAME_EXERCISES,
  addToLibrary,
  cleanExerciseLabel,
  exerciseOptions,
  isBuiltInExercise,
  normalizeExercises,
  removeFromLibrary,
  toggleExercise,
} from '../../lib/gameExercises';
import { addGameExercise, removeGameExercise } from '../../lib/gameExercisesStore';

const tint = (hex, alpha) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

const same = (a, b) => a.toLowerCase() === b.toLowerCase();

// Hauteur max de la zone des fiches : au-delà, elle défile (la liste grandit avec les
// exercices ajoutés) et la fenêtre reste sur l'écran.
const CHIPS_MAX_HEIGHT = 190;

/**
 * « Ton exercice » — la fenêtre qui s'ouvre quand on MAINTIENT un score de jeu.
 * Légère : une zone de fiches à toucher (2 au plus, elle défile s'il y en a beaucoup),
 * une case pour ajouter la sienne, un bouton. Rien ne s'ouvre seule.
 *
 * Les exercices ajoutés à la main sont gardés TOUT DE SUITE dans une liste commune à tous
 * les jeux (lib/gameExercisesStore.js) : on ne les retape jamais. Un petit × les supprime
 * de la liste pour de bon (les parties déjà notées gardent leur texte).
 *
 * Props:
 * - screenH  : hauteur de l'écran (BottomSheet)
 * - accent   : couleur du jeu (hex)
 * - initial  : exercices déjà notés pour ce score
 * - custom   : la liste des exercices ajoutés par la personne (le plus récent en premier)
 * - persist  : faux = démo, ajouts et suppressions ne touchent pas à la liste enregistrée
 * - onSave   : (exercises: string[]) => void, appelé au « Enregistrer »
 * - onClose  : la fenêtre est fermée (avec ou sans enregistrement)
 */
export default function GameExerciseSheet({
  screenH,
  accent,
  initial,
  custom,
  persist = true,
  onSave,
  onClose,
}) {
  const scrollRef = useRef(null);
  const [selected, setSelected] = useState(() => normalizeExercises(initial));
  const [draft, setDraft] = useState('');
  // Les fiches gardent l'ordre de l'ouverture : elles ne bougent pas sous le doigt quand on
  // en touche une. Seuls les exercices qu'on ajoute arrivent EN TÊTE (toujours visibles).
  const [base] = useState(() => exerciseOptions({ selected: initial, custom }));
  const [added, setAdded] = useState([]);
  const [removed, setRemoved] = useState([]);
  const [library, setLibrary] = useState(() => (Array.isArray(custom) ? custom : []));

  const shown = [...added, ...base.filter((x) => !added.some((a) => same(a, x)))].filter(
    (x) => !removed.some((r) => same(r, x))
  );
  const isOn = (label) => selected.some((x) => same(x, label));
  const isCustom = (label) => library.some((x) => same(x, label));

  const touch = (label) => {
    haptic.selection();
    setSelected((s) => toggleExercise(s, label));
  };

  // Ajoute l'exercice écrit : gardé dans la liste commune tout de suite, mis en tête des
  // fiches et déjà choisi pour ce score.
  const addDraft = () => {
    const label = cleanExerciseLabel(draft);
    if (!label) return;
    haptic.light();
    if (!isBuiltInExercise(label) && !isCustom(label)) {
      setLibrary((l) => addToLibrary(l, label));
      if (persist) addGameExercise(label);
    }
    setRemoved((r) => r.filter((x) => !same(x, label)));
    if (!shown.some((x) => same(x, label))) setAdded((a) => [label, ...a]);
    setSelected((s) => (s.some((x) => same(x, label)) ? s : toggleExercise(s, label)));
    setDraft('');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Supprime un exercice ajouté : retiré de la liste commune (donc de tous les jeux).
  const removeCustom = (label) => {
    haptic.warning();
    setLibrary((l) => removeFromLibrary(l, label));
    setRemoved((r) => [...r, label]);
    setSelected((s) => s.filter((x) => !same(x, label)));
    if (persist) removeGameExercise(label);
  };

  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={140} keyboardAware>
      {({ close }) => (
        <View>
          <Text style={styles.kicker}>TON EXERCICE</Text>
          <Text style={styles.title}>Qu’as-tu fait ?</Text>
          <Text style={styles.hint}>Touche pour choisir ({MAX_GAME_EXERCISES} au maximum).</Text>

          <ScrollView
            ref={scrollRef}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chips}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {shown.map((label) => {
              const on = isOn(label);
              const own = isCustom(label);
              return (
                <View
                  key={label}
                  style={[styles.chip, on && { backgroundColor: accent, borderColor: accent }]}
                >
                  <PressTap
                    onPress={() => touch(label)}
                    tapScale={0.96}
                    containerStyle={styles.chipTap}
                    style={[styles.chipMain, { paddingRight: own ? 6 : 16 }]}
                    accessibilityLabel={`${label}${on ? ', choisi' : ''}`}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
                      {label}
                    </Text>
                  </PressTap>
                  {own && (
                    <PressTap
                      onPress={() => removeCustom(label)}
                      tapScale={0.8}
                      hitSlop={8}
                      containerStyle={styles.chipXTap}
                      style={styles.chipX}
                      accessibilityLabel={`Supprimer ${label} de ma liste`}
                    >
                      <AppIcon
                        name="close"
                        size={12}
                        color={on ? '#1A0C04' : 'rgba(255,255,255,0.65)'}
                      />
                    </PressTap>
                  )}
                </View>
              );
            })}
          </ScrollView>

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
              blurOnSubmit={false}
              style={styles.input}
            />
            <PressTap
              onPress={addDraft}
              tapScale={0.92}
              style={[styles.addBtn, { backgroundColor: tint(accent, 0.22) }]}
              accessibilityLabel="Ajouter cet exercice"
            >
              <Text style={styles.addText}>Ajouter</Text>
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
  chipsScroll: { maxHeight: CHIPS_MAX_HEIGHT },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: {
    height: 40,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  chipTap: { justifyContent: 'center' },
  chipMain: { paddingLeft: 16, justifyContent: 'center' },
  chipText: { fontFamily: fonts.sansBold, fontSize: 13, color: '#FFFFFF' },
  chipTextOn: { color: '#1A0C04' },
  chipXTap: { justifyContent: 'center', paddingRight: 8 },
  chipX: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
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
  addText: { fontFamily: fonts.sansBold, fontSize: 13, color: '#FFFFFF' },
  cta: { marginTop: 18 },
});
