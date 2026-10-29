import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

import { fonts } from '../../lib/fonts';

// 70 → « 1 min 10 s », 120 → « 2 min », 45 → « 45 s ».
const fmtSeconds = (n) => {
  const m = Math.floor(n / 60);
  const s = n % 60;
  if (m === 0) return `${s} s`;
  return s === 0 ? `${m} min` : `${m} min ${s} s`;
};

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
  // Secondes : deux cases « min » et « s » (1 min 10 s se tape 1 et 10), jamais « 70 s ».
  const [minText, setMinText] = useState(String(Math.floor(value / 60)));
  const [secText, setSecText] = useState(String(value % 60));
  const [total, setTotal] = useState(value);
  const secRef = useRef(null);

  if (unit === 's') {
    const report = (m, s) => {
      const t = (parseInt(m || '0', 10) || 0) * 60 + (parseInt(s || '0', 10) || 0);
      const ok = t >= min && t <= max;
      setTotal(t);
      setValid(ok);
      onChange?.(t, ok);
    };
    const digits = (t) => t.replace(/\D/g, '').slice(0, 2);
    return (
      <View style={styles.wrap}>
        <View style={styles.row}>
          <TextInput
            value={minText}
            onChangeText={(t) => {
              const v = digits(t);
              setMinText(v);
              report(v, secText);
            }}
            keyboardType="number-pad"
            maxLength={2}
            autoFocus={autoFocus && value >= 60}
            selectTextOnFocus
            selectionColor={color}
            style={[styles.input, compact && styles.inputCompact, !valid && styles.inputInvalid]}
            accessibilityLabel="Minutes"
            returnKeyType="next"
            onSubmitEditing={() => secRef.current?.focus()}
          />
          <Text style={styles.unit}>min</Text>
          <TextInput
            ref={secRef}
            value={secText}
            onChangeText={(t) => {
              const v = digits(t);
              setSecText(v);
              report(minText, v);
            }}
            keyboardType="number-pad"
            maxLength={2}
            autoFocus={autoFocus && value < 60}
            selectTextOnFocus
            selectionColor={color}
            style={[styles.input, compact && styles.inputCompact, !valid && styles.inputInvalid]}
            accessibilityLabel="Secondes"
            returnKeyType="done"
          />
          <Text style={styles.unit}>s</Text>
        </View>
        <Text style={[styles.limit, compact && styles.limitCompact, !valid && styles.limitInvalid]}>
          {`${fmtSeconds(total)} · de ${fmtSeconds(min)} à ${fmtSeconds(max)}`}
        </Text>
      </View>
    );
  }

  const limitText = `Entre ${min} et ${max}`;

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
          accessibilityLabel="Nombre"
          returnKeyType="done"
        />
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
  unit: { fontFamily: fonts.sansBold, fontSize: 15, color: 'rgba(255,255,255,0.60)', marginRight: 4 },
  limit: {
    marginTop: 12,
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  limitCompact: { marginTop: 8, fontSize: 10, textAlign: 'center' },
  limitInvalid: { color: '#FF5454' },
});
