import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import PressTap from './PressTap';
import Button from './Button';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { DANGER } from '../../lib/buttonTokens';

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

              <Button
                variant="solid"
                fullWidth
                label={isEdit ? 'Enregistrer' : 'Ajouter le bloc'}
                disabled={!trimmed}
                onPress={() => {
                  if (!trimmed) return;
                  haptic.medium();
                  onSubmit(trimmed);
                  close();
                }}
                style={styles.cta}
              />
            </>
          )}

          {archived && (
            <Button
              variant="solid"
              fullWidth
              label="Rouvrir ce bloc"
              onPress={() => {
                haptic.success();
                onReopen?.();
                close();
              }}
              style={styles.cta}
            />
          )}

          {isEdit && !archived && (
            <>
              <Button
                variant="glass"
                fullWidth
                label="Archiver ce bloc"
                onPress={() => {
                  haptic.success();
                  onArchive?.();
                  close();
                }}
                style={styles.secondary}
              />
              <Text style={styles.ghostHint}>
                Il sera figé en lecture seule et rangé dans tes archives.
              </Text>
            </>
          )}

          {isEdit && (
            <Button
              variant="ghost"
              size="md"
              label="Supprimer ce bloc"
              labelStyle={styles.deleteText}
              onPress={() => {
                haptic.warning();
                onDelete?.();
                close();
              }}
              style={styles.deleteLink}
            />
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
  },
  secondary: {
    marginTop: 12,
  },
  deleteLink: {
    marginTop: 4,
  },
  deleteText: {
    color: DANGER,
  },
});
