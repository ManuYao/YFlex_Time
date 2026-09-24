import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import Button from './Button';
import { fonts } from '../../lib/fonts';
import { PAIR_GAP } from '../../lib/buttonTokens';
import { haptic } from '../../hooks/useHaptic';

/**
 * Confirmation destructive, dans la charte de l'app — remplace `Alert.alert`
 * (popup système, hors design system : police par défaut, fond clair,
 * boutons génériques, rien à voir avec le reste de l'app). Même coquille
 * que les autres feuilles (`BottomSheet`), zIndex au-dessus de toutes les
 * autres pour pouvoir s'ouvrir par-dessus une feuille déjà affichée
 * (ex : suppression d'un exercice depuis la bibliothèque).
 */
export default function ConfirmSheet({
  screenH,
  title,
  body,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  destructive = true,
  onConfirm,
  onClose,
}) {
  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={130}>
      {({ close }) => (
        <View>
          <Text style={styles.title}>{title}</Text>
          {!!body && <Text style={styles.body}>{body}</Text>}

          {/* Système de boutons (lib/buttonTokens.js) : « Annuler » en verre à
              la largeur de son texte, la confirmation prend le reste. */}
          <View style={styles.actions}>
            <Button variant="glass" label={cancelLabel} haptic={haptic.light} onPress={close} />
            <Button
              variant={destructive ? 'danger' : 'solid'}
              label={confirmLabel}
              onPress={() => {
                // Une seule vibration, au relâcher. L'alerte est réservée aux
                // actions destructives : « Autoriser » ou « Cramer et lancer »
                // vibraient jusqu'ici comme une suppression.
                if (destructive) haptic.warning();
                else haptic.medium();
                onConfirm();
                close();
              }}
              style={styles.confirm}
            />
          </View>
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
  body: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 10,
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PAIR_GAP,
    marginTop: 22,
  },
  confirm: {
    flex: 1,
  },
});
