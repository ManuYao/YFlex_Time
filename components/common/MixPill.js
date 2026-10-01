import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

import PressTap from './PressTap';
import AppIcon from './AppIcon';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';

// Violet du mode MIX (lib/timers-config.js) — jamais une couleur inventée.
export const MIX_COLOR = '#9575FF';

/**
 * Pastille « MIX ET PARTAGE » : le fil conducteur de l'app (v16.2.0).
 *
 * Le MIX est le point névralgique de Flex Timer — ce qui le distingue d'un
 * simple chrono, ce qui porte le freemium, ce qui se partage entre
 * utilisateurs et coachs. Cette pastille est posée en tête de chaque grande
 * page (hub, historique, planning, profil) pour que, où qu'on soit, il reste à
 * un tap : même forme, même violet, même destination (/mix-hub).
 *
 * Elle se retire d'elle-même sur la page Mix et Partage (pas de lien qui
 * pointe sur place) — et sert alors de simple repère si `label` est donné.
 */
export default function MixPill({ label = 'MIX ET PARTAGE', style }) {
  const router = useRouter();
  const pathname = usePathname();
  if (pathname === '/mix-hub') return null;

  return (
    <PressTap
      onPress={() => {
        haptic.light();
        router.push('/mix-hub');
      }}
      tapScale={0.95}
      hitSlop={12}
      accessibilityLabel="Ouvrir Mix et Partage"
      style={[styles.pill, style]}
    >
      <AppIcon name="mix" size={14} color={MIX_COLOR} />
      <Text style={styles.text}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </PressTap>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${MIX_COLOR}66`,
    backgroundColor: `${MIX_COLOR}1F`,
  },
  text: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2.2,
    color: '#FFFFFF',
  },
  chevron: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    lineHeight: 15,
    color: MIX_COLOR,
    marginTop: -1,
  },
});
