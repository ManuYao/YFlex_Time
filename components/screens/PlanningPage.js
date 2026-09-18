import React, { useCallback, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import PressTap from '../common/PressTap';
import PageDots from '../common/PageDots';
import BlockSheet from '../common/BlockSheet';
import ExerciseLibrarySheet from '../common/ExerciseLibrarySheet';
import ExerciseDetailSheet from '../common/ExerciseDetailSheet';
import { fonts } from '../../lib/fonts';
import { categoryChip } from '../../lib/exercises';
import { loadHistory } from '../../lib/history';
import { useLongPress } from '../../hooks/useLongPress';
import { haptic } from '../../hooks/useHaptic';
import {
  DAYS,
  addBlock,
  addTag,
  archiveBlock,
  archiveDay,
  countDay,
  emptyPlanning,
  daysUsedThisWeek,
  formatArchiveDate,
  getDay,
  loadPlanning,
  removeBlock,
  removeTag,
  renameBlock,
  reopenBlock,
  reopenDay,
  todayKey,
  updateTag,
} from '../../lib/planning';

const ARCHIVE_HOLD_MS = 2000;

export default function PlanningPage({
  width,
  height,
  screenH,
  pageIndex,
  onSelectPage,
  onSheetChange,
  // { dayKey, blockId, tagId } : arrivée depuis le conseil de surcharge
  // progressive de l'accueil (lib/progression.js) — on se place sur le jour
  // et on ouvre la fiche de l'étiquette pour ajuster la charge.
  focus = null,
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [planning, setPlanning] = useState(emptyPlanning);
  const [dayKey, setDayKey] = useState(() =>
    focus?.dayKey && DAYS.some((d) => d.key === focus.dayKey) ? focus.dayKey : todayKey()
  );
  const [usedDays, setUsedDays] = useState(() => new Set());
  const [sheet, setSheet] = useState(null);
  // Une seule ouverture automatique : revenir sur la page (useFocusEffect
  // rejoue à chaque retour) ne doit pas rouvrir la fiche dans le dos de
  // l'utilisateur qui vient de la fermer.
  const focusConsumed = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadPlanning().then((p) => {
        if (cancelled) return;
        setPlanning(p);
        if (focusConsumed.current || !focus?.blockId || !focus?.tagId) return;
        focusConsumed.current = true;
        // Vérifié sur le planning fraîchement lu, pas sur les params : entre
        // le conseil et l'arrivée ici, l'étiquette a pu être retirée — la
        // fiche lit `tag.weight` au montage et planterait sur undefined.
        const block = (p[focus.dayKey]?.blocks || []).find((b) => b.id === focus.blockId);
        if (!block || block.archivedAt) return;
        if (!block.tags.some((t) => t.id === focus.tagId)) return;
        setSheet({ type: 'detail', blockId: focus.blockId, tagId: focus.tagId });
        onSheetChange?.(true);
      });
      loadHistory().then((sessions) => {
        if (!cancelled) setUsedDays(daysUsedThisWeek(sessions));
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const openSheet = (next) => {
    setSheet(next);
    onSheetChange?.(!!next);
  };
  const closeSheet = () => {
    setSheet(null);
    onSheetChange?.(false);
  };

  const day = getDay(dayKey);
  const dayState = planning[dayKey] ?? { blocks: [], archivedAt: null };
  const archived = !!dayState.archivedAt;
  const counts = countDay(planning, dayKey);
  const today = todayKey();

  const findBlock = (id) => dayState.blocks.find((b) => b.id === id);

  const handleArchiveToggle = async (key) => {
    const isArchivedDay = !!(planning[key] ?? {}).archivedAt;
    if (isArchivedDay) {
      setPlanning(await reopenDay(planning, key));
      return;
    }
    const { planning: next } = await archiveDay(planning, key);
    setPlanning(next);
  };

  return (
    <View style={[styles.page, { width, height }]}>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>PLANIFICATION</Text>
      </View>

      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path
              d="M9 2L3 7l6 5"
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>

        <Text style={styles.topTitle}>Mon planning</Text>

        <Pressable onPress={() => router.push('/settings')} style={styles.iconBtn} hitSlop={8}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 15a3 3 0 100-6 3 3 0 000 6z"
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.daysRow}
        contentContainerStyle={styles.daysContent}
      >
        {DAYS.map((d) => {
          const dayBlocks = (planning[d.key] ?? {}).blocks ?? [];
          return (
            <DayChip
              key={d.key}
              day={d}
              isSelected={d.key === dayKey}
              isToday={d.key === today}
              isUsed={usedDays.has(d.key)}
              isArchived={!!(planning[d.key] ?? {}).archivedAt}
              blockCount={dayBlocks.length}
              onPress={() => {
                haptic.selection();
                setDayKey(d.key);
              }}
              onArchiveToggle={() => handleArchiveToggle(d.key)}
            />
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dayTitleRow}>
          <Text style={styles.dayTitle}>{day.long}</Text>
          {archived && (
            <Svg width={13} height={13} viewBox="0 0 12 12" fill="none">
              <Path
                d="M3.6 5.2V3.8a2.4 2.4 0 014.8 0v1.4"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={1.3}
                strokeLinecap="round"
              />
              <Rect x={2.6} y={5.2} width={6.8} height={4.8} rx={1.3} fill="rgba(255,255,255,0.4)" />
            </Svg>
          )}
        </View>
        <Text style={styles.daySummary}>
          {archived
            ? `ARCHIVÉ · ${formatArchiveDate(dayState.archivedAt).toUpperCase()}`
            : `${counts.blocks} ${counts.blocks > 1 ? 'BLOCS' : 'BLOC'} · ${counts.tags} ${
                counts.tags > 1 ? 'ÉTIQUETTES' : 'ÉTIQUETTE'
              }`}
        </Text>
        {archived && (
          <Text style={styles.archiveHint}>
            Appui long sur le jour pour le rouvrir et le modifier à nouveau.
          </Text>
        )}

        {dayState.blocks.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucun bloc</Text>
            <Text style={styles.emptyHint}>
              Ajoute ton premier bloc d'exercices pour ce jour
            </Text>
          </View>
        ) : (
          dayState.blocks.map((block) => (
            <BlockCard
              key={block.id}
              block={block}
              dayArchived={archived}
              onRename={() => openSheet({ type: 'block', blockId: block.id })}
              onAddTag={() => openSheet({ type: 'library', blockId: block.id })}
              onOpenTag={(tagId) => openSheet({ type: 'detail', blockId: block.id, tagId })}
              onDelete={async () => {
                haptic.warning();
                setPlanning(await removeBlock(planning, dayKey, block.id));
              }}
            />
          ))
        )}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: 8 + insets.bottom }]}>
        <PageDots count={2} activeIndex={pageIndex} onSelect={onSelectPage} />

        {archived ? (
          <PressTap
            onPress={() => {
              haptic.light();
              router.push({ pathname: '/day-archives', params: { day: dayKey } });
            }}
            tapScale={0.97}
            style={styles.ctaGhost}
          >
            <Text style={styles.ctaGhostText}>
              VOIR TOUS LES {day.long.toUpperCase()}S ARCHIVÉS
            </Text>
          </PressTap>
        ) : (
          <PressTap
            onPress={() => {
              haptic.light();
              openSheet({ type: 'block' });
            }}
            tapScale={0.97}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>+ NOUVEAU BLOC</Text>
          </PressTap>
        )}
      </View>

      {sheet?.type === 'block' && screenH > 0 && (
        <BlockSheet
          screenH={screenH}
          initialName={sheet.blockId ? findBlock(sheet.blockId)?.name ?? '' : ''}
          archived={sheet.blockId ? !!findBlock(sheet.blockId)?.archivedAt : false}
          onClose={closeSheet}
          onSubmit={async (name) => {
            setPlanning(
              sheet.blockId
                ? await renameBlock(planning, dayKey, sheet.blockId, name)
                : await addBlock(planning, dayKey, name)
            );
          }}
          onArchive={async () => {
            const { planning: next } = await archiveBlock(planning, dayKey, sheet.blockId);
            setPlanning(next);
          }}
          onReopen={async () => {
            setPlanning(await reopenBlock(planning, dayKey, sheet.blockId));
          }}
          onDelete={async () => {
            setPlanning(await removeBlock(planning, dayKey, sheet.blockId));
          }}
        />
      )}

      {sheet?.type === 'library' && screenH > 0 && (
        <ExerciseLibrarySheet
          screenH={screenH}
          blockName={findBlock(sheet.blockId)?.name}
          onClose={closeSheet}
          onPick={async (exercise) => {
            setPlanning(await addTag(planning, dayKey, sheet.blockId, exercise));
          }}
        />
      )}

      {sheet?.type === 'detail' && screenH > 0 && (
        <ExerciseDetailSheet
          screenH={screenH}
          tag={findBlock(sheet.blockId)?.tags.find((t) => t.id === sheet.tagId)}
          blockName={findBlock(sheet.blockId)?.name}
          dayLabel={day.long}
          onClose={closeSheet}
          onSave={async (values) => {
            setPlanning(await updateTag(planning, dayKey, sheet.blockId, sheet.tagId, values));
          }}
          onRemove={async () => {
            setPlanning(await removeTag(planning, dayKey, sheet.blockId, sheet.tagId));
          }}
        />
      )}
    </View>
  );
}

function BlockCard({
  block,
  dayArchived,
  onRename,
  onAddTag,
  onOpenTag,
  onDelete,
}) {
  const swipeRef = useRef(null);
  const blockArchived = !!block.archivedAt;
  // Lecture seule si le jour OU le bloc est archivé. Le menu ⋮ reste visible
  // sur un bloc archivé dans un jour vivant : c'est par là qu'on le rouvre.
  const archived = dayArchived || blockArchived;

  const card = (
    <View style={[styles.card, blockArchived && styles.cardArchived]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{block.name}</Text>
          {blockArchived && (
            <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
              <Path
                d="M3.6 5.2V3.8a2.4 2.4 0 014.8 0v1.4"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={1.3}
                strokeLinecap="round"
              />
              <Rect x={2.6} y={5.2} width={6.8} height={4.8} rx={1.3} fill="rgba(255,255,255,0.4)" />
            </Svg>
          )}
        </View>
        {!dayArchived && (
          <Pressable
            onPress={() => {
              haptic.light();
              onRename();
            }}
            hitSlop={10}
          >
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <Circle cx={8} cy={3} r={1.4} fill="rgba(255,255,255,0.45)" />
              <Circle cx={8} cy={8} r={1.4} fill="rgba(255,255,255,0.45)" />
              <Circle cx={8} cy={13} r={1.4} fill="rgba(255,255,255,0.45)" />
            </Svg>
          </Pressable>
        )}
      </View>

      <View style={styles.tagsWrap}>
        {block.tags.map((tag) => {
          const chip = categoryChip(tag.category, archived);
          const suffix = archived && tag.weight ? ` · ${tag.weight}KG` : '';
          return (
            <PressTap
              key={tag.id}
              onPress={() => {
                if (archived) return;
                haptic.light();
                onOpenTag(tag.id);
              }}
              disabled={archived}
              tapScale={0.95}
              style={[styles.tag, { backgroundColor: chip.bg, borderColor: chip.border }]}
            >
              <Text style={[styles.tagText, { color: chip.text }]}>
                {tag.label.toUpperCase()}
                {suffix}
              </Text>
            </PressTap>
          );
        })}

        {!archived && (
          <PressTap
            onPress={() => {
              haptic.light();
              onAddTag();
            }}
            tapScale={0.95}
            style={styles.tagAdd}
          >
            <Text style={styles.tagAddText}>+ AJOUTER</Text>
          </PressTap>
        )}
      </View>
    </View>
  );

  if (archived) return <View style={styles.cardSpacing}>{card}</View>;

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={() => (
        <Pressable
          onPress={() => {
            swipeRef.current?.close();
            onDelete();
          }}
          style={({ pressed }) => [
            styles.deleteAction,
            pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
          ]}
        >
          <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
            <Path
              d="M3 5h12M7 5V3h4v2M5 5l1 10h6l1-10M8 8v5M10 8v5"
              stroke="#FFFFFF"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.deleteLabel}>Supprimer</Text>
        </Pressable>
      )}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      containerStyle={styles.swipeContainer}
    >
      {card}
    </Swipeable>
  );
}

function DayChip({
  day,
  isSelected,
  isToday,
  isUsed,
  isArchived,
  blockCount,
  onPress,
  onArchiveToggle,
}) {
  const archivable = isArchived || blockCount > 0;
  const { isPressing, progress, start, cancel } = useLongPress(onArchiveToggle, ARCHIVE_HOLD_MS);

  const w = isSelected ? 54 : 44;
  const h = isSelected ? 68 : 58;
  const radius = Math.min(w, h) / 2 - 4;
  const circumference = 2 * Math.PI * radius;

  const bg = isArchived
    ? 'rgba(255,255,255,0.02)'
    : isSelected
      ? '#FFFFFF'
      : 'rgba(255,255,255,0.05)';
  const border = isArchived
    ? 'rgba(255,255,255,0.06)'
    : isSelected
      ? '#FFFFFF'
      : 'rgba(255,255,255,0.09)';
  const labelColor = isArchived
    ? 'rgba(255,255,255,0.30)'
    : isSelected
      ? '#0A0A0A'
      : 'rgba(255,255,255,0.55)';

  const dotColor = isToday ? '#FF5454' : isUsed ? '#FFC933' : null;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={archivable ? start : undefined}
      onPressOut={archivable ? cancel : undefined}
      style={[
        styles.dayChip,
        { width: w, height: h, backgroundColor: bg, borderColor: border },
      ]}
    >
      <Text style={[styles.dayChipLabel, { color: labelColor }]}>{day.short}</Text>

      {isSelected && !isArchived && blockCount > 0 && (
        <Text style={styles.dayChipCount}>
          {blockCount} {blockCount > 1 ? 'BLOCS' : 'BLOC'}
        </Text>
      )}

      {!!dotColor && !isArchived && (
        <View style={[styles.dayDot, { backgroundColor: dotColor }]} />
      )}

      {isArchived && (
        <View style={styles.lockBadge}>
          <Svg width={9} height={9} viewBox="0 0 12 12" fill="none">
            <Path
              d="M3.6 5.2V3.8a2.4 2.4 0 014.8 0v1.4"
              stroke="#0A0A0A"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <Rect x={2.6} y={5.2} width={6.8} height={4.8} rx={1.3} fill="#0A0A0A" />
          </Svg>
        </View>
      )}

      {isPressing && (
        <Svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Circle
            cx={w / 2}
            cy={h / 2}
            r={radius}
            stroke="rgba(255,255,255,0.14)"
            strokeWidth={2.5}
            fill="none"
          />
          <Circle
            cx={w / 2}
            cy={h / 2}
            r={radius}
            stroke={isSelected ? '#0A0A0A' : '#FFFFFF'}
            strokeWidth={2.5}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress * circumference}
            strokeLinecap="round"
            transform={`rotate(-90 ${w / 2} ${h / 2})`}
          />
        </Svg>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Pas de `flex: 1` : dans une FlatList horizontale le conteneur est en
  // flexDirection row, donc flex:1 écraserait la largeur (flexBasis 0) et
  // laisserait la hauteur se faire dicter par le contenu — ce qui écrasait
  // aussi les feuilles, positionnées en absoluteFill de cette page.
  page: {},

  statusBar: {
    paddingHorizontal: 24,
    paddingTop: 4,
    alignItems: 'center',
  },
  statusText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.55)',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },

  daysRow: {
    flexGrow: 0,
    marginBottom: 20,
  },
  daysContent: {
    paddingHorizontal: 24,
    gap: 7,
    alignItems: 'center',
  },
  dayChip: {
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    letterSpacing: 1.5,
  },
  dayChipCount: {
    fontFamily: fonts.monoBold,
    fontSize: 8.5,
    color: 'rgba(10,10,10,0.75)',
    marginTop: 4,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 5,
  },
  lockBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },

  dayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dayTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 19,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  daySummary: {
    fontFamily: fonts.monoRegular,
    fontSize: 11,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 3,
    marginBottom: 18,
  },
  archiveHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.35)',
    marginTop: -10,
    marginBottom: 18,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 14,
  },
  cardSpacing: {
    marginBottom: 10,
  },
  swipeContainer: {
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  deleteAction: {
    width: 96,
    backgroundColor: '#FF5454',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteLabel: {
    color: '#FFFFFF',
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardArchived: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 10,
  },
  cardTitle: {
    flexShrink: 1,
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    letterSpacing: 0.6,
  },
  tagAdd: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagAddText: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.40)',
  },

  empty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
  },
  emptyHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },

  bottom: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 14,
  },
  cta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    letterSpacing: 1.2,
    color: '#0A0A0A',
  },
  ctaGhost: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaGhostText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 1,
    color: '#FFFFFF',
  },
});
