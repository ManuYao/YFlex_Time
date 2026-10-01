import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import BottomSheet from './BottomSheet';
import IconButton from './IconButton';
import AppIcon from './AppIcon';
import { getMixTotalDuration, hasEstimatedDuration } from '../../lib/mix-blocks';
import { fonts } from '../../lib/fonts';
import { ROUND_SIZE } from '../../lib/buttonTokens';
import { useHaptic } from '../../hooks/useHaptic';

/**
 * « Mes mix » : la bibliothèque des mix enregistrés. Sortie du constructeur
 * (app/mix-builder.js) pour être aussi ouverte depuis le hub Mix et Partage
 * (app/mix-hub.js) — une seule liste, un seul rendu.
 *
 * `hint` : ligne d'aide sous la liste (dépend de l'écran d'où on l'ouvre).
 */
export default function MixLibrarySheet({
  screenH,
  library,
  onClose,
  onLoad,
  onDelete,
  onShare,
  hint = 'Tap = charger · 3s sur Enregistrer = nouveau mix',
  emptyText = 'Aucun mix sauvegardé. Maintiens "Enregistrer" 3s dans le constructeur pour en archiver un.',
}) {
  const haptic = useHaptic();
  // Partager depuis la liste : cette feuille se referme d'abord, la feuille
  // de partage monte ensuite (jamais deux feuilles l'une sur l'autre).
  const shareAfterCloseRef = useRef(null);
  const handleClosed = () => {
    const m = shareAfterCloseRef.current;
    onClose();
    if (m) onShare(m);
  };
  return (
    <BottomSheet screenH={screenH} onClose={handleClosed}>
      {({ close }) => (
        <View>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.kicker}>MES MIX</Text>
              <Text style={styles.title}>
                {library.length} enregistré{library.length > 1 ? 's' : ''}
              </Text>
            </View>
            <IconButton
              icon="close"
              size={ROUND_SIZE.sheet}
              haptic={haptic.light}
              onPress={close}
              accessibilityLabel="Fermer"
            />
          </View>

          <View style={styles.libList}>
            {library.length === 0 && (
              <Text style={styles.libEmpty}>{emptyText}</Text>
            )}
            {library.map((m) => {
              const total = getMixTotalDuration(m.blocks || []);
              const min = Math.floor(total / 60);
              const sec = total % 60;
              return (
                <View key={m.id} style={styles.libRow}>
                  <Pressable
                    onPress={() => {
                      onLoad(m.id);
                      close();
                    }}
                    style={({ pressed }) => [
                      styles.libRowMain,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={[styles.libDot, { backgroundColor: 'rgba(255,255,255,0.40)' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.libName} numberOfLines={1}>{m.name}</Text>
                      <Text style={styles.libMeta}>
                        {(m.blocks?.length || 0)} blocs · {hasEstimatedDuration(m.blocks) ? '~' : ''}{String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      haptic.light();
                      shareAfterCloseRef.current = m;
                      close();
                    }}
                    style={({ pressed }) => [
                      styles.libShare,
                      pressed && { opacity: 0.7 },
                    ]}
                    hitSlop={10}
                  >
                    <AppIcon name="share" size={14} color="rgba(255,255,255,0.55)" />
                  </Pressable>
                  <Pressable
                    onPress={() => onDelete(m.id)}
                    style={({ pressed }) => [
                      styles.libDelete,
                      pressed && { opacity: 0.7 },
                    ]}
                    hitSlop={10}
                  >
                    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                      <Path d="M3 3l8 8M11 3l-8 8" stroke="#FF5454" strokeWidth={2} strokeLinecap="round" />
                    </Svg>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <Text style={styles.libHint}>
            {hint}
          </Text>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  kicker: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    marginBottom: 6,
  },
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  libList: {
    gap: 8,
    marginBottom: 16,
  },
  libEmpty: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    paddingVertical: 24,
  },
  libRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 14,
    paddingRight: 8,
  },
  libRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  libDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  libName: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  libMeta: {
    fontFamily: fonts.monoRegular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  libShare: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  libDelete: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,84,84,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  libHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.40)',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
