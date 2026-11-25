import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import PressTap from '../common/PressTap';
import { haptic } from '../../hooks/useHaptic';
import { fonts } from '../../lib/fonts';
import {
  MONTHS_PAGE,
  PAGE,
  groupMeta,
  groupScores,
  olderCount,
  partiesLabel,
} from '../../lib/gameScoreGroups';

const tint = (hex, alpha) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

/**
 * « Mes scores » d'un jeu, commun aux trois jeux. Les 3 derniers scores sont
 * toujours visibles ; le reste tient derrière UN bloc « Historique ». Ouvert, il
 * range les parties PAR MOIS : un mois = une ligne (nom, nombre de parties,
 * meilleur score) qui se déplie et montre directement ses parties, 10 par 10
 * (« Voir plus »). Jamais de bloc dans un bloc ; le mois le plus récent est déjà
 * ouvert ; les mois sont montrés 3 par 3, les plus anciens sur demande ; avec un
 * seul mois, pas de ligne de mois du tout. Rien de caché n'est monté : 150
 * parties ne coûtent que quelques lignes tant qu'on ne déplie pas.
 *
 * - scores : liste déjà filtrée pour le jeu
 * - getValue(score) : le chiffre du score (pour le « meilleur » d'un mois)
 * - renderRow(score) : la ligne du jeu (avec sa date : le mois ne dit pas le jour)
 */
function GameScoreList({ scores, accent, getValue, renderRow, label = 'MES SCORES' }) {
  const [allOpen, setAllOpen] = useState(false);
  const [openMonths, setOpenMonths] = useState({}); // absent = règle par défaut (le 1er est ouvert)
  const [shown, setShown] = useState({}); // parties montrées par mois
  const [monthsShown, setMonthsShown] = useState(MONTHS_PAGE);

  const { head, groups } = useMemo(() => groupScores(scores, getValue), [scores, getValue]);
  const restCount = groups.reduce((n, g) => n + g.items.length, 0);

  if (head.length === 0) return null;

  const boxStyle = { backgroundColor: tint(accent, 0.07), borderColor: tint(accent, 0.18) };
  const single = groups.length === 1; // un seul mois : pas besoin de sa ligne
  const isOpen = (g, index) => single || (g.key in openMonths ? openMonths[g.key] : index === 0);

  const toggleMonth = (g, index) => {
    haptic.light();
    setOpenMonths((o) => ({ ...o, [g.key]: !isOpen(g, index) }));
  };

  const olderMonths = groups.length - monthsShown;

  return (
    <View style={styles.history}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {head.map((s) => (
        <React.Fragment key={s.id}>{renderRow(s)}</React.Fragment>
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
        groups.slice(0, monthsShown).map((g, index) => {
          const open = isOpen(g, index);
          const visible = Math.min(g.items.length, shown[g.key] || PAGE);
          const hidden = g.items.length - visible;
          return (
            <View key={g.key} style={styles.month}>
              {!single && (
                <PressTap
                  onPress={() => toggleMonth(g, index)}
                  tapScale={0.98}
                  style={styles.monthHead}
                  accessibilityLabel={`${g.label}, ${groupMeta(g)}`}
                >
                  <View style={styles.monthText}>
                    <Text style={styles.monthLabel} numberOfLines={1}>
                      {g.label}
                    </Text>
                    <Text style={styles.monthMeta} numberOfLines={1}>
                      {groupMeta(g)}
                    </Text>
                  </View>
                  <Text style={[styles.chevron, open && styles.chevronOpen]}>›</Text>
                </PressTap>
              )}

              {open && (
                <View style={single ? styles.rows : styles.monthRows}>
                  {g.items.slice(0, visible).map((s) => (
                    <React.Fragment key={s.id}>{renderRow(s)}</React.Fragment>
                  ))}
                  {hidden > 0 && (
                    <PressTap
                      onPress={() => {
                        haptic.light();
                        setShown((m) => ({ ...m, [g.key]: visible + PAGE }));
                      }}
                      tapScale={0.98}
                      style={[styles.more, { borderColor: tint(accent, 0.35) }]}
                      accessibilityLabel={`Voir plus de parties, ${g.label}`}
                    >
                      <Text style={[styles.moreText, { color: accent }]}>
                        Voir plus ({Math.min(hidden, PAGE)} sur {hidden})
                      </Text>
                    </PressTap>
                  )}
                </View>
              )}
            </View>
          );
        })}

      {allOpen && olderMonths > 0 && (
        <PressTap
          onPress={() => {
            haptic.light();
            setMonthsShown((n) => n + MONTHS_PAGE);
          }}
          tapScale={0.98}
          style={[styles.more, { borderColor: tint(accent, 0.35) }]}
          accessibilityLabel="Voir les mois plus anciens"
        >
          <Text style={[styles.moreText, { color: accent }]}>
            Voir les mois plus anciens ({partiesLabel(olderCount(groups, monthsShown))})
          </Text>
        </PressTap>
      )}
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
  month: { gap: 8 },
  monthHead: {
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
  // Deux lignes (nom du mois, puis ses chiffres) : tient sur un petit écran sans rien couper.
  monthText: { flex: 1, gap: 2 },
  monthLabel: { fontFamily: fonts.sansBold, fontSize: 14, color: '#FFFFFF' },
  monthMeta: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  rows: { gap: 8 },
  monthRows: { gap: 8, paddingLeft: 10 },
  more: {
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  moreText: { fontFamily: fonts.sansBold, fontSize: 13 },
});
