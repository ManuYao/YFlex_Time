import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import PressTap from './PressTap';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';

const SUGGESTIONS = ['Pecs / triceps', 'Dos / biceps', 'Jambes', 'Épaules', 'Abdos', 'Cardio'];

export default function BlockSheet({
  screenH,
  initialName = '',
  archived = false,
  onClose,
  onSubmit,
  onArchive,
  onReopen,
  onDelete,
}) {
  const [name, setName] = useState(initialName);
  const isEdit = !!initialName;
  const trimmed = name.trim();

  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={90}>
      {({ close }) => (
        <View>
          <Text style={styles.title}>
            {archived ? initialName : isEdit ? 'Renommer le bloc' : 'Nouveau bloc'}
          </Text>
          {archived && <Text style={styles.subtitle}>BLOC ARCHIVÉ · LECTURE SEULE</Text>}

          {!archived && (
            <>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Pecs / triceps"
                placeholderTextColor="rgba(255,255,255,0.30)"
                selectionColor="#FFFFFF"
                maxLength={28}
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (!trimmed) return;
                  haptic.medium();
                  onSubmit(trimmed);
                  close();
                }}
              />

              {!isEdit && (
                <View style={styles.suggestions}>
                  {SUGGESTIONS.map((s) => (
                    <PressTap
                      key={s}
                      onPress={() => {
                        haptic.selection();
                        setName(s);
                      }}
                      tapScale={0.94}
                      style={styles.suggestionChip}
                    >
                      <Text style={styles.suggestionText}>{s}</Text>
                    </PressTap>
                  ))}
                </View>
              )}

              <PressTap
                onPress={() => {
                  if (!trimmed) return;
                  haptic.medium();
                  onSubmit(trimmed);
                  close();
                }}
                tapScale={0.97}
                disabled={!trimmed}
                style={[styles.cta, !trimmed && styles.ctaDisabled]}
              >
                <Text style={styles.ctaText}>
                  {isEdit ? 'ENREGISTRER' : 'AJOUTER LE BLOC'}
                </Text>
              </PressTap>
            </>
          )}

          {archived && (
            <PressTap
              onPress={() => {
                haptic.success();
                onReopen?.();
                close();
              }}
              tapScale={0.97}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>ROUVRIR CE BLOC</Text>
            </PressTap>
          )}

          {isEdit && !archived && (
            <>
              <PressTap
                onPress={() => {
                  haptic.success();
                  onArchive?.();
                  close();
                }}
                tapScale={0.97}
                style={styles.ghostBtn}
              >
                <Text style={styles.ghostText}>ARCHIVER CE BLOC</Text>
              </PressTap>
              <Text style={styles.ghostHint}>
                Il sera figé en lecture seule et rangé dans tes archives.
              </Text>
            </>
          )}

          {isEdit && (
            <PressTap
              onPress={() => {
                haptic.warning();
                onDelete?.();
                close();
              }}
              tapScale={0.97}
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteText}>Supprimer ce bloc</Text>
            </PressTap>
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
  ghostBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ghostText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 1.1,
    color: '#FFFFFF',
  },
  ghostHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.38)',
    textAlign: 'center',
    marginTop: 8,
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
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  suggestionChip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestionText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.60)',
  },
  cta: {
    marginTop: 20,
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
  deleteBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  deleteText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 12.5,
    color: '#FF5454',
  },
});
