import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import BottomSheet from './BottomSheet';
import Button from './Button';
import IconButton from './IconButton';
import PressTap from './PressTap';
import AppIcon from './AppIcon';
import { haptic } from '../../hooks/useHaptic';
import { fonts } from '../../lib/fonts';
import { ROUND_SIZE } from '../../lib/buttonTokens';
import { TIMERS } from '../../lib/timers-config';
import { DISCIPLINES } from '../../lib/disciplines';
import { MOCK_PUBLIC_MIXES } from '../../lib/profileMock';

const MODE_COLOR = Object.fromEntries(TIMERS.map((t) => [t.id, t.color]));
// Un bloc repos n'a pas de couleur de mode : blanc translucide, plus court.
const REST_COLOR = 'rgba(255,255,255,0.22)';
const ALL = 'ALL';

/**
 * Bande de segments, un par bloc, à la couleur de son mode. Partagée avec
 * le Hub Profil (ProfileMixShare).
 */
export function BlockStrip({ blocks, height = 6, style }) {
  return (
    <View style={[styles.strip, { height }, style]}>
      {blocks.map((id, i) => (
        <View
          key={`${id}-${i}`}
          style={{
            flex: id === 'rest' ? 0.5 : 1,
            borderRadius: height / 2,
            backgroundColor: id === 'rest' ? REST_COLOR : MODE_COLOR[id] ?? REST_COLOR,
          }}
        />
      ))}
    </View>
  );
}

// « Karim.W » → KW, « ThomasR » → TR.
function initialsOf(author) {
  const parts = author.split(/[^A-Za-zÀ-ÿ0-9]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const word = parts[0] ?? '?';
  const cap = word.slice(1).match(/[A-Z]/);
  return (word[0] + (cap ? cap[0] : word[1] ?? '')).toUpperCase();
}

const disciplineIcon = (short) => DISCIPLINES.find((d) => d.short === short)?.icon ?? 'pulse';

function MixCard({ mix, soon, onTest }) {
  // L'avatar prend la couleur du premier bloc : aucune couleur inventée.
  const tint = MODE_COLOR[mix.blocks.find((b) => b !== 'rest')] ?? '#FFFFFF';

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={[styles.avatar, { backgroundColor: `${tint}24`, borderColor: `${tint}55` }]}>
          <Text style={[styles.avatarText, { color: tint }]}>{initialsOf(mix.author)}</Text>
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardName} numberOfLines={1}>{mix.name}</Text>
          <Text style={styles.cardAuthor} numberOfLines={1}>par {mix.author}</Text>
        </View>
        <View style={styles.tag}>
          <AppIcon name={disciplineIcon(mix.discipline)} size={11} color="rgba(255,255,255,0.70)" />
          <Text style={styles.tagText} numberOfLines={1}>{mix.discipline}</Text>
        </View>
      </View>

      <BlockStrip blocks={mix.blocks} style={styles.cardStrip} />

      <View style={styles.cardFoot}>
        <View style={styles.meta}>
          <AppIcon name="clock" size={12} color="rgba(255,255,255,0.55)" />
          <Text style={styles.metaText}>{mix.duration}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{mix.likes} j'aime</Text>
        </View>
        <Button
          variant="glass"
          size="sm"
          icon={soon ? 'clock' : 'play'}
          label={soon ? 'Bientôt disponible' : 'Tester'}
          onPress={onTest}
        />
      </View>
    </View>
  );
}

function PublicContent({ screenH, close }) {
  const [filter, setFilter] = useState(ALL);
  const [soonId, setSoonId] = useState(null);
  const soonTimer = useRef(null);

  useEffect(() => () => clearTimeout(soonTimer.current), []);

  const chips = useMemo(
    () => [ALL, ...new Set(MOCK_PUBLIC_MIXES.map((m) => m.discipline))],
    []
  );
  const list = filter === ALL ? MOCK_PUBLIC_MIXES : MOCK_PUBLIC_MIXES.filter((m) => m.discipline === filter);

  const handleTest = (id) => {
    haptic.light();
    setSoonId(id);
    clearTimeout(soonTimer.current);
    soonTimer.current = setTimeout(() => setSoonId(null), 2200);
  };

  return (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>FIL PUBLIC</Text>
          <Text style={styles.title} numberOfLines={1}>Les mixes des autres</Text>
        </View>
        <IconButton
          icon="close"
          size={ROUND_SIZE.sheet}
          haptic={haptic.light}
          onPress={close}
          accessibilityLabel="Fermer"
        />
      </View>

      <View style={styles.notice}>
        <AppIcon name="user" size={14} color="rgba(255,255,255,0.60)" />
        <Text style={styles.noticeText}>Aperçu — le fil public arrivera avec les comptes.</Text>
      </View>

      <View style={styles.chips}>
        {chips.map((c) => {
          const active = c === filter;
          return (
            <PressTap
              key={c}
              tapScale={0.94}
              onHapticIn={haptic.selection}
              onPress={() => setFilter(c)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {c === ALL ? 'TOUS' : c}
              </Text>
            </PressTap>
          );
        })}
      </View>

      {/* BottomSheet grandit vers le haut sans limite : la liste est bornée. */}
      <ScrollView
        style={{ maxHeight: Math.min(460, screenH * 0.6) }}
        contentContainerStyle={styles.list}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {list.map((m) => (
          <MixCard key={m.id} mix={m} soon={soonId === m.id} onTest={() => handleTest(m.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

export default function MixPublicSheet({ screenH, onClose }) {
  return (
    <BottomSheet screenH={screenH} onClose={onClose}>
      {({ close }) => <PublicContent screenH={screenH} close={close} />}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    gap: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
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
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.60)',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  chipText: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.75)',
  },
  chipTextActive: {
    color: '#0A0A0A',
  },
  list: {
    gap: 10,
    paddingBottom: 4,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    padding: 14,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardName: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  cardAuthor: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: 120,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tagText: {
    flexShrink: 1,
    fontFamily: fonts.monoBold,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.70)',
  },
  cardStrip: {
    marginTop: 14,
  },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
  },
  meta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  metaText: {
    fontFamily: fonts.monoRegular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.60)',
  },
  metaDot: {
    fontFamily: fonts.monoRegular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.30)',
  },
});
