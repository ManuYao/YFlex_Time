import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import BottomSheet from './BottomSheet';
import Button from './Button';
import AppIcon from './AppIcon';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { useBlockedUsers } from '../../hooks/useBlockedUsers';

// Paramètres > Compte > Personnes bloquées. La liste de ceux que JE bloque (depuis
// le fil public ou les commentaires) : leurs mix et leurs commentaires sont
// masqués chez moi, et rien d'autre ne change pour eux. Un bouton pour débloquer.
export default function BlockedUsersSheet({ screenH, onClose }) {
  const blocks = useBlockedUsers();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const unblock = async (id) => {
    if (busyId) return;
    setBusyId(id);
    setError(null);
    const res = await blocks.unblock(id);
    setBusyId(null);
    if (!res.ok) {
      haptic.error();
      setError('Impossible de débloquer, vérifie ta connexion.');
      return;
    }
    haptic.light();
  };

  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={95}>
      {({ close }) => (
        <View>
          <Text style={styles.title}>Personnes bloquées</Text>
          <Text style={styles.subtitle}>
            Tu ne vois plus leurs mix ni leurs commentaires. Elles ne savent pas que tu les as bloquées.
          </Text>

          <ScrollView
            style={{ maxHeight: Math.min(320, screenH * 0.4) }}
            contentContainerStyle={styles.list}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {blocks.list.length === 0 ? (
              <View style={styles.empty}>
                <AppIcon name="user" size={22} color="rgba(255,255,255,0.40)" />
                <Text style={styles.emptyTitle}>Personne n'est bloqué</Text>
                <Text style={styles.emptyText}>
                  Pour bloquer quelqu'un, touche « Bloquer » sur l'un de ses mix ou de ses commentaires.
                </Text>
              </View>
            ) : (
              blocks.list.map((b) => (
                <View key={b.id} style={styles.row}>
                  <Text style={styles.name} numberOfLines={1}>
                    {b.name || 'Athlète'}
                  </Text>
                  <Button
                    variant="glass"
                    size="sm"
                    label="Débloquer"
                    loading={busyId === b.id}
                    disabled={!!busyId && busyId !== b.id}
                    onPress={() => unblock(b.id)}
                  />
                </View>
              ))
            )}
          </ScrollView>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Button variant="glass" size="lg" label="Fermer" onPress={close} style={{ marginTop: 16 }} />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 22,
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.60)',
    marginTop: 6,
    marginBottom: 14,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  name: {
    flex: 1,
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    gap: 6,
  },
  emptyTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 6,
  },
  emptyText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  error: {
    fontFamily: fonts.sansSemibold,
    fontSize: 12,
    color: '#FF5454',
    marginTop: 10,
  },
});
