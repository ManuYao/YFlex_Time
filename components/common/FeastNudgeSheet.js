import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import Button from './Button';
import AppIcon from './AppIcon';
import { fonts } from '../../lib/fonts';
import { PAIR_GAP } from '../../lib/buttonTokens';
import { feastPhrase } from '../../lib/feastNudgeShape';
import { haptic } from '../../hooks/useHaptic';

/**
 * Proposition annuelle « les fêtes, chacun à sa façon » (règle : lib/feastNudgeShape.js).
 * Pendant Halloween, Noël ou la Saint-Valentin, elle rappelle que ces fêtes ne parlent pas à
 * toutes les croyances et propose de ne garder que les saisons. « Seulement les saisons » passe
 * le réglage sur « Saisons » tout de suite (le décor de fête disparaît derrière) ; « Garder les
 * fêtes » ne change rien et la question reviendra l'an prochain. `onClose` couvre tout chemin de
 * fermeture (voile, retour Android, boutons).
 */
export default function FeastNudgeSheet({ screenH, feastId, onSeasonsOnly, onClose }) {
  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={130}>
      {({ close }) => (
        <View>
          <View style={styles.iconBox}>
            <AppIcon name="season" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Les fêtes, chacun à sa façon</Text>
          <Text style={styles.body}>
            {`L’app se met aux couleurs ${feastPhrase(feastId)} en ce moment. Halloween, Noël, la Saint-Valentin : ces fêtes ne correspondent pas à toutes les croyances, et c’est normal. Si tu préfères, garde seulement les saisons (printemps, été, automne, hiver), sans aucun décor de fête.`}
          </Text>
          <Text style={styles.hint}>
            Si tu gardes les fêtes, on te reposera la question l’an prochain. Tu peux aussi changer à tout moment dans les Paramètres.
          </Text>

          {/* Empilés : les deux libellés sont trop longs pour tenir côte à côte sur un petit écran. */}
          <View style={styles.actions}>
            <Button
              variant="solid"
              label="Seulement les saisons"
              fullWidth
              onPress={() => {
                haptic.medium();
                onSeasonsOnly();
                close();
              }}
            />
            <Button variant="glass" label="Garder les fêtes" fullWidth haptic={haptic.light} onPress={close} />
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
    lineHeight: 17,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 8,
  },
  actions: { gap: PAIR_GAP, marginTop: 22 },
});
