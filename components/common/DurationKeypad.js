import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

import { fonts } from '../../lib/fonts';

/**
 * Saisie d'une durée au clavier numérique du système, à la place de la roue :
 * « 12 min » (accueil, AMRAP) ou « 12 min 30 s » (bloc AMRAP du constructeur).
 * Pour qui sait déjà ce qu'il veut, c'est bien plus rapide que de faire défiler.
 *
 * `onChange(totalSeconds, valid)` est appelé à chaque frappe ; `valid` dit si la
 * valeur est dans les bornes (`minTotalSeconds` … `maxMinutes` minutes). L'appelant
 * ne retient que les valeurs valides : une saisie en cours (« 1 » avant « 12 »)
 * ne doit jamais écraser le réglage. Le composant garde son propre texte (aucun
 * état remonté), donc taper ne refait pas la feuille qui le porte.
 */
export default function DurationKeypad({
  seconds = 0,
  withSeconds = false,
  maxMinutes = 60,
  minTotalSeconds = 60,
  color = '#FFFFFF',
  onChange,
  autoFocus = true,
}) {
  const [minText, setMinText] = useState(String(Math.floor(seconds / 60)));
  const [secText, setSecText] = useState(String(seconds % 60).padStart(2, '0'));
  const [valid, setValid] = useState(true);
  const secRef = useRef(null);

  const report = (m, s) => {
    const mins = parseInt(m || '0', 10) || 0;
    const secs = Math.min(59, parseInt(s || '0', 10) || 0);
    const total = withSeconds ? mins * 60 + secs : mins * 60;
    const ok = total >= minTotalSeconds && total <= maxMinutes * 60;
    setValid(ok);
    onChange?.(total, ok);
  };

  const digits = (t) => t.replace(/\D/g, '');

  const limitText = withSeconds
    ? `De ${minTotalSeconds} secondes à ${maxMinutes} minutes`
    : `Entre ${Math.max(1, Math.round(minTotalSeconds / 60))} et ${maxMinutes} minutes`;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          value={minText}
          onChangeText={(t) => {
            const v = digits(t).slice(0, 2);
            setMinText(v);
            report(v, secText);
          }}
          keyboardType="number-pad"
          maxLength={2}
          autoFocus={autoFocus}
          selectTextOnFocus
          selectionColor={color}
          style={[styles.input, !valid && styles.inputInvalid]}
          accessibilityLabel="Minutes"
          returnKeyType={withSeconds ? 'next' : 'done'}
          onSubmitEditing={() => secRef.current?.focus()}
        />
        <Text style={styles.unit}>min</Text>
        {withSeconds ? (
          <>
            <TextInput
              ref={secRef}
              value={secText}
              onChangeText={(t) => {
                const v = digits(t).slice(0, 2);
                setSecText(v);
                report(minText, v);
              }}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              selectionColor={color}
              style={[styles.input, !valid && styles.inputInvalid]}
              accessibilityLabel="Secondes"
            />
            <Text style={styles.unit}>s</Text>
          </>
        ) : null}
      </View>
      <Text style={[styles.limit, !valid && styles.limitInvalid]}>{limitText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8 },
  input: {
    minWidth: 84,
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
  inputInvalid: { borderColor: '#FF5454' },
  unit: { fontFamily: fonts.sansBold, fontSize: 15, color: 'rgba(255,255,255,0.60)', marginRight: 6 },
  limit: {
    marginTop: 12,
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  limitInvalid: { color: '#FF5454' },
});
