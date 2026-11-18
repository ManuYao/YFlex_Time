import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import Button from './Button';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';

/**
 * « Ce mix est publié » — s'ouvre quand on enregistre un mix déjà en ligne dont
 * le contenu a changé (constructeur MIX). Trois issues :
 *  - `onUpdate` : mettre à jour le fil public ET enregistrer (même mix, les
 *                 étoiles et commentaires sont gardés) ;
 *  - `onKeep`   : garder cette version pour soi : elle est rangée à part dans les
 *                 créations privées, le mix publié ne bouge pas ;
 *  - fermer (« Annuler » ou retour) : rien n'est enregistré, on continue d'éditer.
 *
 * zIndex 130 : même niveau que ConfirmSheet / UnsavedChangesSheet.
 */
export default function PublishedSaveSheet({ screenH, mixName, onUpdate, onKeep, onClose }) {
  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={130}>
      {({ close }) => (
        <View>
          <Text style={styles.title}>Ce mix est publié</Text>
          <Text style={styles.body}>
            {mixName ? `« ${mixName} » est` : 'Ce mix est'} en ligne dans le fil public, et tu l'as
            modifié. Que veux-tu en faire ?
          </Text>

          <View style={styles.actions}>
            <Button
              variant="solid"
              label="Mettre à jour le fil public"
              haptic={haptic.medium}
              onPress={() => {
                onUpdate();
                close();
              }}
              fullWidth
            />
            <Text style={styles.hint}>
              Tout le monde verra la nouvelle version. Les étoiles et les commentaires sont gardés.
            </Text>

            <Button
              variant="glass"
              label="Garder pour moi"
              haptic={haptic.light}
              onPress={() => {
                onKeep();
                close();
              }}
              fullWidth
            />
            <Text style={styles.hint}>
              Ta version est rangée à part, dans tes créations privées. Le mix publié ne change pas.
            </Text>

            <Button variant="ghost" size="md" label="Annuler" haptic={haptic.light} onPress={close} fullWidth />
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
  hint: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
});
