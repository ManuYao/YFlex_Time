import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import Button from './Button';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';

const DANGER = '#FF5454';

/**
 * « Attention, vos modifications non sauvegardées vont être perdues. » —
 * s'ouvre quand on s'apprête à remplacer le mix en cours d'édition par un
 * autre (choisi dans Mes mix ou dans le fil public).
 *
 * Trois issues, la plus sûre en premier :
 *  - `onSave`    : enregistrer le mix modifié (dans Mes mix) PUIS continuer ;
 *  - `onDiscard` : continuer sans enregistrer (les modifications sont perdues) ;
 *  - fermer la feuille (bouton « Rester » ou retour) : on ne change rien.
 *
 * zIndex 130 : elle s'ouvre par-dessus la feuille d'où l'on vient (Mes mix, fil
 * public), comme ConfirmSheet.
 */
export default function UnsavedChangesSheet({ screenH, mixName, leaving = false, onSave, onDiscard, onClose }) {
  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={130}>
      {({ close }) => (
        <View>
          <Text style={styles.title}>Modifications non sauvegardées</Text>
          <Text style={styles.body}>
            Attention, vos modifications{mixName ? ` de « ${mixName} »` : ''} non sauvegardées vont
            être perdues. Voulez-vous enregistrer avant de quitter ?
          </Text>

          <View style={styles.actions}>
            <Button
              variant="solid"
              label={leaving ? 'Enregistrer et quitter' : 'Enregistrer, puis continuer'}
              haptic={haptic.medium}
              onPress={() => {
                onSave();
                close();
              }}
              fullWidth
            />
            <Button
              variant="ghost"
              size="md"
              label={leaving ? 'Quitter sans enregistrer' : 'Continuer sans enregistrer'}
              labelStyle={{ color: DANGER }}
              haptic={haptic.warning}
              onPress={() => {
                onDiscard();
                close();
              }}
              fullWidth
            />
            <Button
              variant="glass"
              size="md"
              label={leaving ? 'Rester ici' : 'Rester sur ce mix'}
              haptic={haptic.light}
              onPress={close}
              fullWidth
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
    color: 'rgba(255,255,255,0.60)',
    marginTop: 10,
  },
  actions: {
    gap: 8,
    marginTop: 22,
  },
});
