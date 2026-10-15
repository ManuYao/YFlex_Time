import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import Button from './Button';
import AppIcon from './AppIcon';
import { fonts } from '../../lib/fonts';
import { PAIR_GAP } from '../../lib/buttonTokens';
import { haptic } from '../../hooks/useHaptic';

/**
 * Alerte unique de lancement (lib/seasonNudge.js) : l'ambiance de saison anime
 * des décors, ce qui demande un peu de puissance. « Désactiver » la coupe tout
 * de suite (l'app redevient exactement comme avant) ; « Garder » ne change rien.
 * Dans les deux cas elle ne revient pas. `onClose` couvre tout chemin de
 * fermeture (voile, retour Android, boutons) : c'est là qu'on la marque « vue ».
 */
export default function SeasonNudgeSheet({ screenH, onDisable, onClose }) {
  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={130}>
      {({ close }) => (
        <View>
          <View style={styles.iconBox}>
            <AppIcon name="season" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Une app plus légère ?</Text>
          <Text style={styles.body}>
            L’ambiance de saison ajoute des décors animés, qui demandent un peu de puissance. Si ton téléphone est un peu ancien et que l’app te semble moins fluide, tu peux la désactiver.
          </Text>
          <Text style={styles.hint}>Tu peux la changer à tout moment dans les Paramètres.</Text>

          <View style={styles.actions}>
            <Button variant="glass" label="Garder" haptic={haptic.light} onPress={close} />
            <Button
              variant="solid"
              label="Désactiver"
              onPress={() => {
                haptic.medium();
                onDisable();
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
