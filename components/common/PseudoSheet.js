import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import Button from './Button';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { DANGER } from '../../lib/buttonTokens';
import { validatePseudo, PSEUDO_MAX, DEFAULT_PSEUDO } from '../../lib/profile';

/**
 * Feuille « Ton nom » du Profil : le nom affiché en haut du Profil. Sert aussi
 * à la première demande après une connexion sans nom (Google, par exemple).
 */
export default function PseudoSheet({ screenH, initialValue = '', welcome = false, onClose, onSubmit }) {
  const [value, setValue] = useState(initialValue === DEFAULT_PSEUDO ? '' : initialValue);
  const [error, setError] = useState(null);

  const submit = (close) => {
    const check = validatePseudo(value);
    if (!check.ok) {
      haptic.warning();
      setError(check.reason);
      return;
    }
    haptic.medium();
    onSubmit(check.value);
    close();
  };

  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={95} keyboardAware>
      {({ close }) => (
        <View>
          <Text style={styles.title}>{welcome ? 'Comment on t’appelle ?' : 'Ton nom'}</Text>
          <Text style={styles.hint}>
            C’est le nom affiché en haut de ton Profil. Tu pourras le changer quand tu veux.
          </Text>

          <TextInput
            value={value}
            onChangeText={(t) => {
              setValue(t);
              setError(null);
            }}
            placeholder="Ton nom ou pseudo"
            placeholderTextColor="rgba(255,255,255,0.30)"
            selectionColor="#FFFFFF"
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={PSEUDO_MAX}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={() => submit(close)}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            variant="solid"
            fullWidth
            label="Enregistrer"
            onPress={() => submit(close)}
            style={styles.cta}
          />
          {welcome && (
            <Button
              variant="ghost"
              size="md"
              label="Plus tard"
              haptic={haptic.light}
              onPress={close}
              style={styles.later}
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
  },
  hint: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 4,
    marginBottom: 14,
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
  error: {
    fontFamily: fonts.sansSemibold,
    fontSize: 12.5,
    color: DANGER,
    marginTop: 8,
  },
  cta: {
    marginTop: 20,
  },
  later: {
    marginTop: 4,
  },
});
