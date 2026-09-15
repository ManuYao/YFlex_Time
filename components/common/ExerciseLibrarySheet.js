import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import PressTap from './PressTap';
import { fonts } from '../../lib/fonts';
import {
  CATEGORIES,
  addCustomExercise,
  categoryChip,
  loadCustomExercises,
} from '../../lib/exercises';
import { haptic } from '../../hooks/useHaptic';

export default function ExerciseLibrarySheet({ screenH, blockName, onClose, onPick }) {
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [customs, setCustoms] = useState([]);
  const [creating, setCreating] = useState(false);
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadCustomExercises().then((list) => {
      if (!cancelled) setCustoms(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const category = CATEGORIES.find((c) => c.id === categoryId);
  const chip = categoryChip(categoryId);
  const exercises = [
    ...category.exercises,
    ...customs.filter((e) => e.category === categoryId).map((e) => e.label),
  ];
  const trimmed = customName.trim();

  const submitCustom = (close) => {
    if (!trimmed) return;
    haptic.medium();
    addCustomExercise({ label: trimmed, category: categoryId });
    onPick({ label: trimmed, category: categoryId });
    close();
  };

  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={92}>
      {({ close }) => (
        <View>
          <Text style={styles.title}>Ajouter un exercice</Text>
          {!!blockName && <Text style={styles.subtitle}>{blockName.toUpperCase()}</Text>}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.catRow}
            contentContainerStyle={styles.catContent}
          >
            {CATEGORIES.map((c) => {
              const isActive = c.id === categoryId;
              return (
                <PressTap
                  key={c.id}
                  onPress={() => {
                    haptic.selection();
                    setCategoryId(c.id);
                  }}
                  tapScale={0.94}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: isActive ? c.color : 'rgba(255,255,255,0.05)',
                      borderColor: isActive ? c.color : 'rgba(255,255,255,0.12)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.catText,
                      { color: isActive ? '#0A0A0A' : 'rgba(255,255,255,0.65)' },
                    ]}
                  >
                    {c.label}
                  </Text>
                </PressTap>
              );
            })}
          </ScrollView>

          {creating ? (
            <View style={styles.createBox}>
              <TextInput
                value={customName}
                onChangeText={setCustomName}
                placeholder="Nom de l'exercice"
                placeholderTextColor="rgba(255,255,255,0.30)"
                selectionColor={category.color}
                maxLength={32}
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={() => submitCustom(close)}
              />
              <Text style={styles.createHint}>
                Il sera gardé dans {category.label} pour tes prochaines séances.
              </Text>

              <View style={styles.createActions}>
                <PressTap
                  onPress={() => {
                    haptic.light();
                    setCreating(false);
                  }}
                  tapScale={0.96}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelText}>Annuler</Text>
                </PressTap>

                <View style={styles.ctaWrap}>
                  <PressTap
                    onPress={() => submitCustom(close)}
                    disabled={!trimmed}
                    tapScale={0.97}
                    style={[styles.cta, !trimmed && styles.ctaDisabled]}
                  >
                    <Text style={styles.ctaText}>AJOUTER</Text>
                  </PressTap>
                </View>
              </View>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {exercises.map((label) => (
                <PressTap
                  key={label}
                  onPress={() => {
                    haptic.medium();
                    onPick({ label, category: categoryId });
                    close();
                  }}
                  tapScale={0.95}
                  style={[
                    styles.exerciseChip,
                    { backgroundColor: chip.bg, borderColor: chip.border },
                  ]}
                >
                  <Text style={[styles.exerciseText, { color: chip.text }]}>
                    {label.toUpperCase()}
                  </Text>
                </PressTap>
              ))}

              <PressTap
                onPress={() => {
                  haptic.light();
                  setCustomName('');
                  setCreating(true);
                }}
                tapScale={0.95}
                style={styles.createChip}
              >
                <Text style={styles.createChipText}>+ CRÉER</Text>
              </PressTap>
            </ScrollView>
          )}
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

  catRow: {
    flexGrow: 0,
    marginTop: 16,
    marginHorizontal: -20,
  },
  catContent: {
    paddingHorizontal: 20,
    gap: 6,
  },
  catChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  catText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.3,
  },

  list: {
    marginTop: 16,
    maxHeight: 260,
  },
  listContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 4,
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
  createChip: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  createChipText: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.45)',
  },

  createBox: {
    marginTop: 16,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.sansSemibold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  createHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 10,
  },
  createActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  cancelText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.70)',
  },
  // PressTap pose son style sur une vue interne : le flex doit vivre sur un
  // wrapper, sinon le bouton se réduit à la largeur de son texte.
  ctaWrap: {
    flex: 1,
  },
  cta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ctaDisabled: {
    opacity: 0.35,
  },
  ctaText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    letterSpacing: 1.2,
    color: '#0A0A0A',
  },
});
