import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import Button from './Button';
import AppIcon from './AppIcon';
import { fonts } from '../../lib/fonts';
import { PAIR_GAP } from '../../lib/buttonTokens';
import { haptic } from '../../hooks/useHaptic';

/**
 * Popup de découverte du coach vocal (settings.voiceCoach), proposée au
 * démarrage tant qu'il n'est pas activé (voir lib/coachNudge.js pour le
 * cooldown de 7 jours + le dismiss permanent).
 *
 * `onClose` couvre TOUT chemin de fermeture (voile, retour Android, "Plus
 * tard", "Activer") — BottomSheet l'appelle une seule fois, à la fin de son
 * animation, quel que soit le bouton pressé (close() le déclenche toujours).
 * C'est donc l'endroit générique pour remettre le délai de 7 jours à zéro.
 * "Activer" et "Ne plus me le proposer" font chacun UNE chose EN PLUS de la
 * fermeture générique (naviguer / dismiss permanent).
 */
export default function CoachNudgeSheet({ screenH, onActivate, onNeverShow, onClose }) {
  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={130}>
      {({ close }) => (
        <View>
          <View style={styles.iconBox}>
            <AppIcon name="voice" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Un coach qui te parle</Text>
          <Text style={styles.body}>
            Active la voix du coach pour être guidé pendant l'effort — les phases et les tours annoncés à voix haute, sans regarder l'écran.
          </Text>

          <View style={styles.actions}>
            <Button variant="glass" label="Plus tard" haptic={haptic.light} onPress={close} />
            <Button
              variant="solid"
              label="Activer"
              onPress={() => {
                haptic.medium();
                onActivate();
                close();
              }}
              style={styles.confirm}
            />
          </View>

          <Pressable
            onPress={() => {
              haptic.light();
              onNeverShow();
              close();
            }}
            hitSlop={8}
            style={styles.neverShow}
          >
            <Text style={styles.neverShowText}>Ne plus me le proposer</Text>
          </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: PAIR_GAP,
    marginTop: 22,
  },
  confirm: {
    flex: 1,
  },
  neverShow: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  neverShowText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.40)',
    textDecorationLine: 'underline',
  },
});
