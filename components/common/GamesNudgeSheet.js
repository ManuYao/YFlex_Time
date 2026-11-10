import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import Button from './Button';
import AppIcon from './AppIcon';
import { fonts } from '../../lib/fonts';
import { PAIR_GAP } from '../../lib/buttonTokens';
import { haptic } from '../../hooks/useHaptic';

/**
 * Proposition « Essaie les jeux » (lib/gamesNudge.js), montrée une seule fois dans la file de
 * démarrage de l'accueil. « Voir les jeux » ouvre le menu des jeux ; « Plus tard » la ferme. Dans
 * les deux cas elle ne revient pas : `onClose` couvre tout chemin de fermeture (voile, retour
 * Android, boutons), c'est là qu'on la marque « vue ».
 */
export default function GamesNudgeSheet({ screenH, onOpen, onClose }) {
  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={130}>
      {({ close }) => (
        <View>
          <View style={styles.iconBox}>
            <AppIcon name="puzzle" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Essaie les jeux</Text>
          <Text style={styles.body}>
            Plein de jeux pour se muscler en s’amusant, seul ou entre amis.
          </Text>
          <Text style={styles.hint}>Tu les retrouves à tout moment dans le menu.</Text>

          <View style={styles.actions}>
            <Button variant="glass" label="Plus tard" haptic={haptic.light} onPress={close} />
            <Button
              variant="solid"
              label="Voir les jeux"
              onPress={() => {
                haptic.medium();
                onOpen();
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
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontFamily: fonts.sansBold, fontSize: 17, color: '#FFFFFF' },
  body: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.60)',
    marginTop: 10,
  },
  hint: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 8,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: PAIR_GAP, marginTop: 22 },
  confirm: { flex: 1 },
});
