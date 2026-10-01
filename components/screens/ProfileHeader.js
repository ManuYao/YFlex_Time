import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import AppIcon from '../common/AppIcon';
import PressTap from '../common/PressTap';
import PulseGlow from '../common/PulseGlow';
import { fonts } from '../../lib/fonts';
import { GOLD } from '../../lib/buttonTokens';
import { haptic } from '../../hooks/useHaptic';
import { getDiscipline, DISCIPLINE_RANK_LABELS, MAX_DISCIPLINES } from '../../lib/disciplines';

const AVATAR = 96;
const RING_TICKS = 48;

/**
 * Bloc identité du Hub Profil : avatar, pseudo, statut, trophées, disciplines.
 * L'anneau de l'avatar reprend la grammaire du TickRing (graduations, une sur
 * quatre plus longue) : il se remplit avec la série en cours vers le record.
 */
export default function ProfileHeader({
  identity,
  disciplineIds,
  isPremium,
  streak,
  bestStreak,
  trophyCount,
  trophyTotal,
  onEditDisciplines,
  onEditPseudo,
  // Connexion optionnelle (contexts/AuthContext.js) : un petit point vert sur
  // l'avatar suffit à dire "connecté", pas besoin d'une ligne entière dans le
  // menu — voir CLAUDE.md, section CONNEXION UTILISATEUR + BACKEND, pour
  // pourquoi ça a remplacé la ligne "Déconnexion" d'origine.
  accountConnected = false,
  onAccountPress,
  // Carte « Se connecter » (ProfileAccount), posée entre l'identité et les
  // disciplines quand personne n'est connecté (v16.3.0) : le seul endroit où
  // on la voit sans chercher. Null/absente une fois connecté.
  accountSlot = null,
}) {
  const ringProgress = bestStreak > 0 ? Math.min(1, streak / bestStreak) : 0;

  return (
    <View style={styles.root}>
      <View style={styles.identityRow}>
        <View style={styles.avatarWrap}>
          <AvatarRing progress={ringProgress} />
          <View style={styles.avatarCore}>
            <Text style={styles.initials} numberOfLines={1}>
              {identity.initials}
            </Text>
          </View>
          {accountConnected && (
            <PressTap
              onPress={() => {
                haptic.light();
                onAccountPress?.();
              }}
              containerStyle={styles.statusDotWrap}
              style={styles.statusDotInner}
              hitSlop={10}
              accessibilityLabel="Compte connecté"
            >
              <PulseGlow color="#1FC777" size={18} active />
              <View style={styles.statusDot} />
            </PressTap>
          )}
        </View>

        <View style={styles.identityText}>
          <PressTap
            onPress={() => {
              haptic.light();
              onEditPseudo?.();
            }}
            tapScale={0.97}
            style={styles.pseudoRow}
            accessibilityLabel="Modifier mon nom"
          >
            <Text style={styles.pseudo} numberOfLines={1}>
              {identity.pseudo}
            </Text>
            <AppIcon name="sliders" size={14} color="rgba(255,255,255,0.45)" />
          </PressTap>
          <View style={styles.chipsRow}>
            {isPremium ? (
              <View style={[styles.statusChip, styles.statusPremium]}>
                <AppIcon name="crown" size={12} color={GOLD} />
                <Text style={[styles.statusText, { color: GOLD }]}>PREMIUM</Text>
              </View>
            ) : (
              <View style={styles.statusChip}>
                <Text style={styles.statusText}>FREE</Text>
              </View>
            )}
            <View style={styles.statusChip}>
              <AppIcon name="medal" size={12} color="rgba(255,255,255,0.85)" />
              <Text style={styles.statusText}>
                {trophyCount}/{trophyTotal}
              </Text>
            </View>
          </View>
          <Text style={styles.since}>Membre depuis {identity.memberSince}</Text>
        </View>
      </View>

      {accountSlot}

      <DisciplineTags ids={disciplineIds} onPress={onEditDisciplines} />
    </View>
  );
}

function AvatarRing({ progress }) {
  const ticks = useMemo(() => {
    const c = AVATAR / 2;
    const outer = c - 2;
    return Array.from({ length: RING_TICKS }, (_, i) => {
      const a = (i / RING_TICKS) * Math.PI * 2 - Math.PI / 2;
      const major = i % 4 === 0;
      const inner = outer - (major ? 7 : 4.5);
      return {
        x1: c + Math.cos(a) * inner,
        y1: c + Math.sin(a) * inner,
        x2: c + Math.cos(a) * outer,
        y2: c + Math.sin(a) * outer,
        major,
      };
    });
  }, []);
  const active = Math.round(RING_TICKS * progress);

  return (
    <Svg width={AVATAR} height={AVATAR} style={StyleSheet.absoluteFill}>
      {ticks.map((t, i) => (
        <Line
          key={i}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          stroke="#FFFFFF"
          strokeOpacity={i < active ? 1 : t.major ? 0.3 : 0.16}
          strokeWidth={t.major ? 2 : 1.3}
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}

function DisciplineTags({ ids, onPress }) {
  const handlePress = () => {
    haptic.light();
    onPress?.();
  };

  return (
    <View style={styles.disciplines}>
      <View style={styles.disciplinesHeader}>
        <Text style={styles.sectionTitle}>Disciplines</Text>
        <Text style={styles.disciplinesCount}>
          {ids.length}/{MAX_DISCIPLINES}
        </Text>
      </View>
      <PressTap onPress={handlePress} tapScale={0.97} style={styles.tagsRow} accessibilityLabel="Modifier mes disciplines">
        {ids.length === 0 ? (
          <View style={[styles.tag, styles.tagEmpty]}>
            <AppIcon name="plus" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.tagEmptyText}>Choisis tes disciplines</Text>
          </View>
        ) : (
          ids.map((id, i) => {
            const d = getDiscipline(id);
            return (
              <View key={id} style={[styles.tag, i === 0 && styles.tagPrimary]}>
                <View style={[styles.tagIcon, i === 0 && styles.tagIconPrimary]}>
                  <AppIcon name={d.icon} size={16} color={i === 0 ? '#0A0A0A' : '#FFFFFF'} />
                </View>
                <View style={styles.tagText}>
                  <Text style={styles.tagRank}>{DISCIPLINE_RANK_LABELS[i]}</Text>
                  <Text style={styles.tagLabel} numberOfLines={1}>
                    {d.label}
                  </Text>
                </View>
              </View>
            );
          })
        )}
        <View style={styles.editDot}>
          <AppIcon name="sliders" size={16} color="rgba(255,255,255,0.8)" />
        </View>
      </PressTap>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginBottom: 24,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 20,
  },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDotWrap: {
    position: 'absolute',
    right: -1,
    bottom: -1,
  },
  statusDotInner: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#1FC777',
    borderWidth: 2,
    borderColor: '#0A0A0A',
  },
  avatarCore: {
    width: AVATAR - 26,
    height: AVATAR - 26,
    borderRadius: (AVATAR - 26) / 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: 1,
    includeFontPadding: false,
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  pseudoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pseudo: {
    flexShrink: 1,
    fontFamily: fonts.sansExtraBold,
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  statusPremium: {
    backgroundColor: 'rgba(240,201,84,0.12)',
    borderColor: 'rgba(240,201,84,0.40)',
  },
  statusText: {
    fontFamily: fonts.monoBold,
    fontSize: 10.5,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.9)',
  },
  since: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 8,
  },

  disciplines: {},
  disciplinesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
  },
  disciplinesCount: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  tagPrimary: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.28)',
  },
  tagIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagIconPrimary: {
    backgroundColor: '#FFFFFF',
  },
  tagText: {
    flex: 1,
    minWidth: 0,
  },
  tagRank: {
    fontFamily: fonts.monoBold,
    fontSize: 8.5,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.5)',
  },
  tagLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
    marginTop: 1,
  },
  tagEmpty: {
    borderStyle: 'dashed',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  tagEmptyText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  editDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
