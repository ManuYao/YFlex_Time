import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import Button from './Button';
import AppIcon from './AppIcon';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { MAX_MIX_NOTE, MIX_COLORS, cleanMixColor, cleanMixNote } from '../../lib/mixMeta';

/**
 * Feuille « Couleur et note » d'un MIX (Constructeur : maintien de 3 s sur
 * « Enregistrer », ou touche sur la pastille de couleur). Une teinte de la
 * palette (la petite barre des cartes de « Mes mix » et du partage) et une note
 * courte. Rien n'est écrit tant qu'on ne touche pas un des deux boutons du bas :
 * ils reçoivent `{ color, note }` et enregistrent comme leur nom l'indique.
 *
 * `primary` / `secondary` : { label, onPress(meta) } — l'action principale et
 * l'autre façon d'enregistrer (voir app/mix-builder.js).
 */
export default function MixMetaSheet({ screenH, color = null, note = '', primary, secondary, onClose }) {
  const [pickedColor, setPickedColor] = useState(cleanMixColor(color));
  const [text, setText] = useState(cleanMixNote(note));
  const [busy, setBusy] = useState(false);

  const run = async (action, close) => {
    if (busy || !action) return;
    setBusy(true);
    await action.onPress({ color: pickedColor || undefined, note: cleanMixNote(text) });
    setBusy(false);
    close();
  };

  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={95} keyboardAware>
      {({ close }) => (
        <View>
          <Text style={styles.title}>Couleur et note</Text>
          <Text style={styles.hint}>
            Pour retrouver ce mix d’un coup d’œil : une petite barre de couleur sur sa carte, et ta note, qui suivent le mix quand tu le partages.
          </Text>

          <Text style={styles.label}>COULEUR</Text>
          <View style={styles.swatches}>
            <Pressable
              onPress={() => {
                haptic.selection();
                setPickedColor(null);
              }}
              accessibilityLabel="Aucune couleur"
              accessibilityState={{ selected: !pickedColor }}
              style={[styles.swatch, styles.swatchNone, !pickedColor && styles.swatchSelected]}
            >
              <AppIcon name="close" size={14} color="rgba(255,255,255,0.55)" />
            </Pressable>
            {MIX_COLORS.map((c) => {
              const selected = pickedColor === c.color;
              return (
                <Pressable
                  key={c.color}
                  onPress={() => {
                    haptic.selection();
                    setPickedColor(c.color);
                  }}
                  accessibilityLabel={c.label}
                  accessibilityState={{ selected }}
                  style={[styles.swatch, { backgroundColor: c.color }, selected && styles.swatchSelected]}
                >
                  {selected ? <AppIcon name="check" size={16} color="#0A0A0A" /> : null}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.noteHead}>
            <Text style={styles.label}>NOTE</Text>
            <Text style={styles.counter}>{`${text.length}/${MAX_MIX_NOTE}`}</Text>
          </View>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Ex. Jambes · jeudi · version salle"
            placeholderTextColor="rgba(255,255,255,0.30)"
            selectionColor="#FFFFFF"
            maxLength={MAX_MIX_NOTE}
            multiline
            style={styles.input}
            accessibilityLabel="Note du mix"
          />

          {primary ? (
            <Button
              variant="solid"
              fullWidth
              label={primary.label}
              onPress={() => run(primary, close)}
              style={styles.cta}
            />
          ) : null}
          {secondary ? (
            <Button
              variant="ghost"
              size="md"
              label={secondary.label}
              haptic={haptic.light}
              onPress={() => run(secondary, close)}
              style={styles.second}
            />
          ) : null}
        </View>
      )}
    </BottomSheet>
  );
}

const SWATCH = 38;

const styles = StyleSheet.create({
  title: { fontFamily: fonts.sansBold, fontSize: 17, color: '#FFFFFF' },
  hint: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 4,
    marginBottom: 16,
  },
  label: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2.4,
    color: 'rgba(255,255,255,0.55)',
  },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10, marginBottom: 18 },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchNone: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  swatchSelected: { borderColor: '#FFFFFF' },
  noteHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counter: { fontFamily: fonts.monoRegular, fontSize: 10, color: 'rgba(255,255,255,0.40)' },
  input: {
    marginTop: 8,
    minHeight: 76,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.sansSemibold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  cta: { marginTop: 20 },
  second: { marginTop: 4 },
});
