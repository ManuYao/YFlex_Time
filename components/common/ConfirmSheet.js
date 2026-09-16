import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import PressTap from './PressTap';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';

const RED = '#FF5454';

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

          <View style={styles.actions}>
            <PressTap onPress={close} tapScale={0.97} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </PressTap>

            <View style={styles.confirmWrap}>
              <PressTap
                onPress={() => {
                  haptic.warning();
                  onConfirm();
                  close();
                }}
                tapScale={0.97}
                style={[styles.confirmBtn, destructive && styles.confirmBtnDestructive]}
              >
                <Text
                  style={[styles.confirmText, destructive && styles.confirmTextDestructive]}
                >
                  {confirmLabel}
                </Text>
              </PressTap>
            </View>
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
    gap: 10,
    marginTop: 22,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  cancelText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.70)',
  },
  // PressTap pose son style sur une vue interne : le flex doit vivre sur un
  // wrapper, sinon le bouton se réduit à la largeur de son texte.
  confirmWrap: {
    flex: 1,
  },
  confirmBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmBtnDestructive: {
    backgroundColor: RED,
  },
  confirmText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    letterSpacing: 1.2,
    color: '#0A0A0A',
  },
  confirmTextDestructive: {
    color: '#FFFFFF',
  },
});
