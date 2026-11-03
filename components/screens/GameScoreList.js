import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import PressTap from '../common/PressTap';
import { haptic } from '../../hooks/useHaptic';
import { fonts } from '../../lib/fonts';
import { DAY_PAGE, groupScores, partiesLabel } from '../../lib/gameScoreGroups';

const tint = (hex, alpha) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

/**
 * « Mes scores » d'un jeu, commun aux trois jeux. Les 3 derniers scores sont
 * toujours visibles ; le reste est rangé par jour (Hier, Il y a 2 jours…) dans
 * un bloc « Historique » à déplier, chaque jour se dépliant à son tour et
 * montrant ses lignes par paquets (« Voir plus »). Rien de caché n'est monté :
 * 150 parties ne coûtent que quelques en-têtes tant qu'on ne déplie pas.
 *
 * - scores : liste déjà filtrée pour le jeu
 * - getValue(score) : le chiffre du score (pour le « meilleur » d'un jour)
 * - renderRow(score, inDay) : la ligne du jeu ; `inDay` vrai = le jour est déjà
 *   dit par l'en-tête du bloc, inutile de le répéter dans la ligne
 */
function GameScoreList({ scores, accent, getValue, renderRow, label = 'MES SCORES' }) {
  const [allOpen, setAllOpen] = useState(false);
  const [openDays, setOpenDays] = useState({});
  const [shown, setShown] = useState({});

  const { head, groups } = useMemo(() => groupScores(scores, getValue), [scores, getValue]);
  const restCount = groups.reduce((n, g) => n + g.items.length, 0);

  if (head.length === 0) return null;

  const boxStyle = { backgroundColor: tint(accent, 0.07), borderColor: tint(accent, 0.18) };

  const toggleDay = (key) => {
    haptic.light();
    setOpenDays((o) => ({ ...o, [key]: !o[key] }));
  };

  return (
    <View style={styles.history}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {head.map((s) => (
        <React.Fragment key={s.id}>{renderRow(s, false)}</React.Fragment>
      ))}

      {restCount > 0 && (
        <PressTap
          onPress={() => {
            haptic.light();
            setAllOpen((v) => !v);
          }}
          tapScale={0.98}
          style={[styles.toggle, boxStyle]}
          accessibilityLabel={allOpen ? 'Replier l’historique' : 'Déplier l’historique'}
        >
          <Text style={styles.toggleTitle}>Historique</Text>
          <Text style={styles.toggleMeta}>{partiesLabel(restCount)}</Text>
          <Text style={[styles.chevron, allOpen && styles.chevronOpen]}>›</Text>
        </PressTap>
      )}

      {allOpen &&
        groups.map((g) => {
          const open = !!openDays[g.key];
          const visible = Math.min(g.items.length, shown[g.key] || DAY_PAGE);
          const hidden = g.items.length - visible;
          return (
            <View key={g.key} style={styles.day}>
              <PressTap
                onPress={() => toggleDay(g.key)}
                tapScale={0.98}
                style={styles.dayHead}
                accessibilityLabel={`${g.label}, ${partiesLabel(g.items.length)}`}
              >
                <Text style={styles.dayLabel} numberOfLines={1}>
                  {g.label}
                </Text>
                <Text style={styles.dayMeta} numberOfLines={1}>
                  {partiesLabel(g.items.length)}
                  {g.best > 0 ? ` · meilleur ${g.best}` : ''}
                </Text>
                <Text style={[styles.chevron, open && styles.chevronOpen]}>›</Text>
              </PressTap>

              {open && (
                <View style={styles.dayRows}>
                  {g.items.slice(0, visible).map((s) => (
                    <React.Fragment key={s.id}>{renderRow(s, true)}</React.Fragment>
                  ))}
                  {hidden > 0 && (
                    <PressTap
                      onPress={() => {
                        haptic.light();
                        setShown((m) => ({ ...m, [g.key]: visible + DAY_PAGE }));
                      }}
                      tapScale={0.98}
                      style={[styles.more, { borderColor: tint(accent, 0.35) }]}
                      accessibilityLabel={`Voir plus de parties, ${g.label}`}
                    >
                      <Text style={[styles.moreText, { color: accent }]}>
                        Voir plus ({Math.min(hidden, DAY_PAGE)} sur {hidden})
                      </Text>
                    </PressTap>
                  )}
                </View>
              )}
            </View>
          );
        })}
    </View>
  );
}

export default GameScoreList;

const styles = StyleSheet.create({
  history: { marginTop: 10, gap: 8 },
  sectionLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2.4,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  toggleTitle: { fontFamily: fonts.sansBold, fontSize: 14, color: '#FFFFFF' },
  toggleMeta: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  chevron: {
    fontFamily: fonts.sansBold,
    fontSize: 20,
    color: 'rgba(255,255,255,0.5)',
    transform: [{ rotate: '90deg' }],
  },
  chevronOpen: { transform: [{ rotate: '-90deg' }] },
  day: { gap: 8 },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  dayLabel: { fontFamily: fonts.sansBold, fontSize: 13, color: '#FFFFFF' },
  dayMeta: {
    flex: 1,
    textAlign: 'right',
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  dayRows: { gap: 8, paddingLeft: 10 },
  more: {
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  moreText: { fontFamily: fonts.sansBold, fontSize: 13 },
});
