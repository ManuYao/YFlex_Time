import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

import { fonts } from '../../lib/fonts';

/**
 * Saisie d'un nombre entier au clavier numérique du système, à la place de la
 * roue : secondes (travail, repos, intervalle) ou nombre de tours. Même idée que
 * DurationKeypad (durée AMRAP), pour les réglages qui n'ont qu'une seule case.
 *
 * `onChange(value, valid)` est appelé à chaque frappe ; l'appelant ne retient que
 * les valeurs valides (une saisie en cours comme « 4 » avant « 45 » ne doit
 * jamais écraser le réglage). Le composant garde son propre texte : taper ne
 * refait pas la feuille qui le porte.
 */
export default function NumberKeypad({
  value = 0,
  min = 1,
  max = 99,
  unit = '',
  color = '#FFFFFF',
  compact = false,
  onChange,
  autoFocus = true,
}) {
  const maxDigits = String(max).length;
  const [text, setText] = useState(String(value));
  const [valid, setValid] = useState(true);

  const limitText = unit === 's' ? `De ${min} à ${max} secondes` : `Entre ${min} et ${max}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          value={text}
          onChangeText={(t) => {
            const v = t.replace(/\D/g, '').slice(0, maxDigits);
            setText(v);
            const n = parseInt(v || '0', 10) || 0;
            const ok = n >= min && n <= max;
            setValid(ok);
            onChange?.(n, ok);
          }}
          keyboardType="number-pad"
          maxLength={maxDigits}
          autoFocus={autoFocus}
          selectTextOnFocus
          selectionColor={color}
          style={[styles.input, compact && styles.inputCompact, !valid && styles.inputInvalid]}
          accessibilityLabel={unit === 's' ? 'Secondes' : 'Nombre'}
          returnKeyType="done"
        />
        {unit === 's' ? <Text style={styles.unit}>s</Text> : null}
      </View>
      <Text style={[styles.limit, compact && styles.limitCompact, !valid && styles.limitInvalid]}>
        {limitText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6 },
  input: {
    minWidth: 96,
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    fontFamily: fonts.display,
    fontSize: 52,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  // Trois colonnes côte à côte dans le constructeur MIX : une case plus petite.
  inputCompact: { minWidth: 60, fontSize: 34, paddingHorizontal: 6, borderRadius: 12 },
  inputInvalid: { borderColor: '#FF5454' },
  unit: { fontFamily: fonts.sansBold, fontSize: 15, color: 'rgba(255,255,255,0.60)' },
  limit: {
    marginTop: 12,
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  limitCompact: { marginTop: 8, fontSize: 10, textAlign: 'center' },
  limitInvalid: { color: '#FF5454' },
});
