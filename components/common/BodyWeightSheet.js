import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import Button from './Button';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { DANGER } from '../../lib/buttonTokens';
import {
  MAX_KG,
  MIN_KG,
  dayKey,
  formatKg,
  formatLongDate,
  parseWeightInput,
} from '../../lib/bodyWeightShape';

/**
 * Feuille « Mon poids » du Profil : un champ, le poids en kg. La date est celle
 * du téléphone, posée toute seule au moment d'enregistrer. Une seule pesée par
 * jour : en saisir une deuxième le même jour remplace la première (dit sous le
 * champ quand c'est le cas).
 *
 * `entries` : pesées déjà enregistrées (plus ancienne → plus récente), pour
 * proposer la dernière valeur comme point de départ.
 */
export default function BodyWeightSheet({ screenH, entries = [], onSubmit, onClose }) {
  const last = entries[entries.length - 1] ?? null;
  const today = dayKey(Date.now());
  const todayEntry = entries.find((e) => dayKey(e.at) === today) ?? null;

  const [value, setValue] = useState(last ? formatKg(last.kg) : '');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (close) => {
    if (busy) return;
    const kg = parseWeightInput(value);
    if (kg === null) {
      haptic.warning();
      setError(`Entre un poids entre ${MIN_KG} et ${MAX_KG} kg (ex. 72,5).`);
      return;
    }
    setBusy(true);
    await onSubmit(kg);
    setBusy(false);
    haptic.success();
    close();
  };

  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={95} keyboardAware>
      {({ close }) => (
        <View>
          <Text style={styles.title}>Mon poids</Text>
          <Text style={styles.hint}>{`Pesée du ${formatLongDate()}. La date vient de ton téléphone.`}</Text>

          <View style={styles.inputRow}>
            <TextInput
              value={value}
              onChangeText={(t) => {
                setValue(t);
                setError(null);
              }}
              placeholder="0,0"
              placeholderTextColor="rgba(255,255,255,0.25)"
              selectionColor="#FFFFFF"
              keyboardType="decimal-pad"
              maxLength={6}
              selectTextOnFocus
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={() => submit(close)}
              accessibilityLabel="Poids en kilos"
            />
            <Text style={styles.unit}>kg</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!error && todayEntry ? (
            <Text style={styles.note}>
              {`Tu as déjà noté ${formatKg(todayEntry.kg)} kg aujourd’hui : cette pesée la remplace.`}
            </Text>
          ) : null}

          <Button variant="solid" fullWidth label="Enregistrer" onPress={() => submit(close)} style={styles.cta} />
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
  hint: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 4,
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontFamily: fonts.display,
    fontSize: 38,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  unit: {
    marginLeft: 10,
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: 'rgba(255,255,255,0.55)',
  },
  error: {
    fontFamily: fonts.sansSemibold,
    fontSize: 12.5,
    color: DANGER,
    marginTop: 8,
  },
  note: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 8,
  },
  cta: {
    marginTop: 20,
  },
});
