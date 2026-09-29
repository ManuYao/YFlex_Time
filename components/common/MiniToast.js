import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import AppIcon from './AppIcon';
import PressTap from './PressTap';
import { fonts } from '../../lib/fonts';

/**
 * Petit message qui apparaît puis disparaît tout seul (c'est le parent qui le
 * monte, puis le démonte au bout de quelques secondes). Pensé pour dire
 * « connecte-toi pour ça » sans fenêtre ni bouton à fermer.
 *
 * Se pose en bas de son parent (position absolue) : le parent doit être une
 * vue qui englobe le contenu de la feuille. Fond plein et sans `elevation`
 * (piège n°22) : un simple liseré suffit à le détacher du fond.
 *
 * Props : text, icon (nom AppIcon, 'lock' par défaut), actionLabel + onAction
 * (petit lien à droite, facultatif).
 */
export default function MiniToast({ text, icon = 'lock', actionLabel, onAction }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(180)}
      exiting={FadeOut.duration(220)}
      style={styles.wrap}
      pointerEvents="box-none"
    >
      <View style={styles.pill}>
        <AppIcon name={icon} size={14} color="rgba(255,255,255,0.75)" />
        <Text style={styles.text} numberOfLines={2}>{text}</Text>
        {!!actionLabel && (
          <PressTap tapScale={0.94} hitSlop={10} onPress={onAction}>
            <Text style={styles.action}>{actionLabel}</Text>
          </PressTap>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 6,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  text: {
    flexShrink: 1,
    fontFamily: fonts.sansSemibold,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  action: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 12,
    color: '#9575FF',
  },
});
