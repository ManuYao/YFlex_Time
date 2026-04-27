import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import GradientBackground from '../components/common/GradientBackground';
import WheelPicker from '../components/common/WheelPicker';
import {
  BLOCK_TYPES,
  getBlockType,
  getBlockDuration,
  getMixTotalDuration,
  formatBlockSubtitle,
  makeBlock,
} from '../lib/mix-blocks';
import { makeDefaultMix } from '../lib/mixes';
import { fonts } from '../lib/fonts';
import { useTimers } from '../contexts/TimersContext';
import { useHaptic } from '../hooks/useHaptic';

const ACCENT = '#9575FF';

export default function MixBuilder() {
  const router = useRouter();
  const haptic = useHaptic();
  const { activeMix, saveMix } = useTimers();

  const [draft, setDraft] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState(null);

  useEffect(() => {
    if (draft) return;
    if (activeMix) {
      setDraft({ ...activeMix, blocks: activeMix.blocks.map((b) => ({ ...b })) });
    } else {
      setDraft(makeDefaultMix());
    }
  }, [activeMix]);

  if (!draft) {
    return (
      <GradientBackground colors={[ACCENT, '#0A0A0A', '#000000']} ambient textMode="light">
        <SafeAreaView style={styles.safe} />
      </GradientBackground>
    );
  }

  const totalSec = getMixTotalDuration(draft.blocks);
  const totalMin = Math.floor(totalSec / 60);
  const totalRest = totalSec % 60;

  const updateName = (v) => setDraft((d) => ({ ...d, name: v }));

  const addBlock = (typeId) => {
    const block = makeBlock(typeId);
    if (!block) return;
    haptic.light();
    setDraft((d) => ({ ...d, blocks: [...d.blocks, block] }));
    setAddOpen(false);
  };

  const removeBlock = (id) => {
    haptic.warning();
    setDraft((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) }));
  };

  const moveBlock = (id, delta) => {
    setDraft((d) => {
      const idx = d.blocks.findIndex((b) => b.id === id);
      const next = [...d.blocks];
      const target = idx + delta;
      if (idx < 0 || target < 0 || target >= next.length) return d;
      [next[idx], next[target]] = [next[target], next[idx]];
      haptic.selection();
      return { ...d, blocks: next };
    });
  };

  const updateBlock = (id, patch) => {
    setDraft((d) => ({
      ...d,
      blocks: d.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  };

  const handleCancel = () => {
    haptic.warning();
    router.back();
  };

  const handleSave = async () => {
    if (draft.blocks.length === 0) return;
    haptic.success();
    await saveMix(draft);
    router.back();
  };

  const editingBlock = editingBlockId
    ? draft.blocks.find((b) => b.id === editingBlockId)
    : null;

  return (
    <GradientBackground colors={[ACCENT, '#0A0A0A', '#000000']} ambient textMode="light">
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>BUILDER MIX</Text>
        </View>

        <View style={styles.topBar}>
          <Pressable onPress={handleCancel} style={styles.iconBtn} hitSlop={8}>
            <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
              <Path
                d="M2 2l8 8M10 2l-8 8"
                stroke="#FFFFFF"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
          </Pressable>
          <Text style={styles.topTitle}>Constructeur</Text>
          <View style={styles.iconBtnGhost} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroKicker}>Ton MIX</Text>
              <TextInput
                value={draft.name}
                onChangeText={updateName}
                style={styles.heroName}
                maxLength={28}
                placeholder="Nom du mix"
                placeholderTextColor="rgba(255,255,255,0.30)"
                selectionColor={ACCENT}
              />
              <Text style={styles.heroMeta}>
                {draft.blocks.length} bloc{draft.blocks.length > 1 ? 's' : ''} ·{' '}
                {formatTotalShort(totalSec)}
              </Text>
            </View>
            <View style={styles.heroRight}>
              <Text style={styles.heroDurLabel}>Durée</Text>
              <Text style={styles.heroDurValue}>
                {String(totalMin).padStart(2, '0')}
                <Text style={styles.heroDurSep}>:</Text>
                {String(totalRest).padStart(2, '0')}
              </Text>
            </View>
          </View>

          <View style={styles.timeline}>
            {draft.blocks.length === 0 ? (
              <View style={styles.timelineEmpty} />
            ) : (
              draft.blocks.map((b) => {
                const t = getBlockType(b.type);
                const flex = Math.max(0.001, getBlockDuration(b)) / Math.max(1, totalSec);
                return (
                  <View
                    key={b.id}
                    style={[
                      styles.timelineSeg,
                      { flex, backgroundColor: t?.color || '#FFFFFF' },
                    ]}
                  />
                );
              })
            )}
          </View>

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Blocs de la séance</Text>
            <Text style={styles.sectionHint}>↑ ↓ pour réorganiser</Text>
          </View>

          {draft.blocks.map((b, i) => (
            <BlockRow
              key={b.id}
              block={b}
              index={i}
              isFirst={i === 0}
              isLast={i === draft.blocks.length - 1}
              onEdit={() => setEditingBlockId(b.id)}
              onDelete={() => removeBlock(b.id)}
              onUp={() => moveBlock(b.id, -1)}
              onDown={() => moveBlock(b.id, 1)}
            />
          ))}

          <Pressable
            onPress={() => {
              haptic.light();
              setAddOpen(true);
            }}
            style={({ pressed }) => [
              styles.addCta,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path
                d="M7 2v10M2 7h10"
                stroke="rgba(255,255,255,0.65)"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
            <Text style={styles.addCtaText}>Ajouter un bloc</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.bottomActions}>
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.btnSecondary,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.btnSecondaryText}>Annuler</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={draft.blocks.length === 0}
            style={({ pressed }) => [
              styles.btnPrimary,
              { backgroundColor: ACCENT, shadowColor: ACCENT },
              draft.blocks.length === 0 && { opacity: 0.45 },
              pressed && draft.blocks.length > 0 && { opacity: 0.92, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
              <Path
                d="M2 6l3 3 5-6"
                stroke="#FFFFFF"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.btnPrimaryText}>Enregistrer le MIX</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <AddBlockSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onPick={addBlock}
      />

      <EditBlockSheet
        block={editingBlock}
        onClose={() => setEditingBlockId(null)}
        onUpdate={(patch) => editingBlock && updateBlock(editingBlock.id, patch)}
      />
    </GradientBackground>
  );
}

function BlockRow({ block, index, isFirst, isLast, onEdit, onDelete, onUp, onDown }) {
  const type = getBlockType(block.type);
  if (!type) return null;
  return (
    <View style={styles.row}>
      <View
        style={[styles.rowBlob, { backgroundColor: type.color }]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.rowIndex,
          {
            backgroundColor: `${type.color}22`,
            borderColor: `${type.color}66`,
          },
        ]}
      >
        <Text style={[styles.rowIndexText, { color: type.color }]}>{index + 1}</Text>
      </View>
      <View
        style={[
          styles.rowBadge,
          { backgroundColor: `${type.color}22` },
        ]}
      >
        <Text style={[styles.rowBadgeText, { color: type.color }]}>{type.name}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel} numberOfLines={1}>{block.label}</Text>
        <Text style={styles.rowSubtitle}>{formatBlockSubtitle(block)}</Text>
      </View>

      <View style={styles.rowArrows}>
        <Pressable
          onPress={onUp}
          disabled={isFirst}
          hitSlop={4}
          style={({ pressed }) => [
            styles.arrowBtn,
            isFirst && { opacity: 0.25 },
            pressed && !isFirst && { opacity: 0.6 },
          ]}
        >
          <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
            <Path d="M2 7l3-4 3 4" stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <Pressable
          onPress={onDown}
          disabled={isLast}
          hitSlop={4}
          style={({ pressed }) => [
            styles.arrowBtn,
            isLast && { opacity: 0.25 },
            pressed && !isLast && { opacity: 0.6 },
          ]}
        >
          <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
            <Path d="M2 3l3 4 3-4" stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
      </View>

      <Pressable
        onPress={onEdit}
        hitSlop={6}
        style={({ pressed }) => [
          styles.iconAction,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
          <Path
            d="M8 2l2 2-6 6H2v-2l6-6z"
            stroke="#FFFFFF"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>

      <Pressable
        onPress={onDelete}
        hitSlop={6}
        style={({ pressed }) => [
          styles.iconAction,
          { backgroundColor: 'rgba(255,84,84,0.12)' },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
          <Path
            d="M2 2l6 6M8 2l-6 6"
            stroke="#FF5454"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      </Pressable>
    </View>
  );
}

function AddBlockSheet({ visible, onClose, onPick }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheetStyles.root}>
        <BlurView intensity={40} tint="dark" pointerEvents="none" style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={sheetStyles.dim} />
        <Pressable style={sheetStyles.tap} onPress={onClose} />
        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.handle} />
          <View style={sheetStyles.headerRow}>
            <View>
              <Text style={sheetStyles.kicker}>NOUVEAU BLOC</Text>
              <Text style={sheetStyles.title}>Choisis un type</Text>
            </View>
            <Pressable onPress={onClose} style={sheetStyles.closeBtn} hitSlop={6}>
              <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                <Path d="M2 2l8 8M10 2l-8 8" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </Pressable>
          </View>

          <View style={sheetStyles.grid}>
            {BLOCK_TYPES.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => onPick(t.id)}
                style={({ pressed }) => [
                  sheetStyles.gridCell,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
                ]}
              >
                <View style={[sheetStyles.gridBlob, { backgroundColor: t.color }]} pointerEvents="none" />
                <View
                  style={[
                    sheetStyles.gridIcon,
                    { backgroundColor: `${t.color}22` },
                  ]}
                >
                  <Text style={[sheetStyles.gridIconText, { color: t.color }]}>{t.icon}</Text>
                </View>
                <Text style={sheetStyles.gridName}>{t.name}</Text>
                <Text style={[sheetStyles.gridHint, { color: t.color }]}>{t.hint}</Text>
              </Pressable>
            ))}
            <View style={[sheetStyles.gridCell, { opacity: 0 }]} pointerEvents="none" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EditBlockSheet({ block, onClose, onUpdate }) {
  const [labelDraft, setLabelDraft] = useState('');

  useEffect(() => {
    setLabelDraft(block?.label || '');
  }, [block?.id]);

  if (!block) return null;
  const type = getBlockType(block.type);

  const ranges = getRangesForType(block.type);
  const showRest = block.type === 'tabata' || block.type === 'basic';
  const showRounds = block.type !== 'rest' && block.type !== 'amrap';

  return (
    <Modal visible={!!block} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheetStyles.root}>
        <BlurView intensity={40} tint="dark" pointerEvents="none" style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={sheetStyles.dim} />
        <Pressable style={sheetStyles.tap} onPress={onClose} />
        <View style={[sheetStyles.sheet, { paddingBottom: 24 }]}>
          <View style={sheetStyles.handle} />
          <View style={sheetStyles.headerRow}>
            <View>
              <Text style={sheetStyles.kicker}>BLOC {type.name}</Text>
              <TextInput
                value={labelDraft}
                onChangeText={(v) => {
                  setLabelDraft(v);
                  onUpdate({ label: v });
                }}
                style={sheetStyles.titleInput}
                maxLength={32}
                selectionColor={type.color}
                placeholder="Nom du bloc"
                placeholderTextColor="rgba(255,255,255,0.30)"
              />
            </View>
            <Pressable onPress={onClose} style={sheetStyles.closeBtn} hitSlop={6}>
              <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                <Path d="M2 2l8 8M10 2l-8 8" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </Pressable>
          </View>

          <View style={sheetStyles.pickersRow}>
            <View style={sheetStyles.pickerCol}>
              <Text style={sheetStyles.pickerLabel}>
                {block.type === 'rest' ? 'DURÉE' : block.type === 'amrap' ? 'DURÉE' : block.type === 'emom' ? 'INTERVALLE' : 'TRAVAIL'}
              </Text>
              <WheelPicker
                values={ranges.duration}
                selectedValue={block.duration}
                type="seconds"
                accentColor={type.color}
                onChange={(v) => onUpdate({ duration: v })}
              />
            </View>

            {showRest && (
              <View style={sheetStyles.pickerCol}>
                <Text style={sheetStyles.pickerLabel}>{block.type === 'tabata' ? 'REPOS' : 'PAUSE'}</Text>
                <WheelPicker
                  values={ranges.rest}
                  selectedValue={block.rest || 0}
                  type="seconds"
                  accentColor={type.color}
                  onChange={(v) => onUpdate({ rest: v })}
                />
              </View>
            )}

            {showRounds && (
              <View style={sheetStyles.pickerCol}>
                <Text style={sheetStyles.pickerLabel}>TOURS</Text>
                <WheelPicker
                  values={ranges.rounds}
                  selectedValue={block.rounds || 1}
                  type="rounds"
                  accentColor={type.color}
                  onChange={(v) => onUpdate({ rounds: v })}
                />
              </View>
            )}
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              sheetStyles.doneBtn,
              { backgroundColor: type.color },
              pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={sheetStyles.doneText}>OK</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const formatTotalShort = (s) => {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec === 0 ? `${m}min` : `${m}min ${sec}s`;
};

const range = (a, b, step = 1) => {
  const out = [];
  for (let i = a; i <= b; i += step) out.push(i);
  return out;
};

const getRangesForType = (typeId) => {
  if (typeId === 'amrap') return { duration: range(60, 1800, 30), rest: [], rounds: [] };
  if (typeId === 'rest') return { duration: range(10, 600, 5), rest: [], rounds: [] };
  if (typeId === 'tabata') return { duration: range(5, 60, 5), rest: range(5, 60, 5), rounds: range(1, 30) };
  if (typeId === 'basic') return { duration: range(10, 600, 5), rest: range(0, 300, 5), rounds: range(1, 30) };
  if (typeId === 'emom') return { duration: range(10, 300, 5), rest: [], rounds: range(1, 30) };
  return { duration: range(10, 300), rest: [], rounds: [] };
};

const styles = StyleSheet.create({
  safe: { flex: 1 },

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
    paddingBottom: 8,
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
  iconBtnGhost: { width: 40, height: 40 },
  topTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },

  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 18,
    gap: 12,
  },
  heroLeft: { flex: 1, minWidth: 0 },
  heroKicker: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: ACCENT,
    marginBottom: 6,
  },
  heroName: {
    color: '#FFFFFF',
    fontFamily: fonts.sansExtraBold,
    fontSize: 28,
    letterSpacing: -0.7,
    padding: 0,
    margin: 0,
    lineHeight: 32,
  },
  heroMeta: {
    fontFamily: fonts.sansSemibold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 6,
  },
  heroRight: {
    alignItems: 'flex-end',
  },
  heroDurLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroDurValue: {
    fontFamily: fonts.display,
    fontSize: 38,
    letterSpacing: -1.5,
    lineHeight: 38,
    includeFontPadding: false,
    color: '#FFFFFF',
  },
  heroDurSep: {
    color: 'rgba(255,255,255,0.40)',
  },

  timeline: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 2,
    marginBottom: 24,
  },
  timelineEmpty: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
  },
  timelineSeg: {
    height: '100%',
    borderRadius: 2,
  },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
  },
  sectionHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.30)',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  rowBlob: {
    position: 'absolute',
    top: -16,
    left: -16,
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.18,
  },
  rowIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIndexText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
  },
  rowBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rowBadgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.3,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  rowSubtitle: {
    fontFamily: fonts.monoRegular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 1,
  },
  rowArrows: {
    flexDirection: 'column',
    gap: 2,
    paddingHorizontal: 2,
  },
  arrowBtn: {
    width: 22,
    height: 18,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconAction: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addCta: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  addCtaText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
  },

  bottomActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  btnSecondary: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    color: '#FFFFFF',
    fontFamily: fonts.sansBold,
    fontSize: 13,
    letterSpacing: -0.2,
  },
  btnPrimary: {
    flex: 1.6,
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontFamily: fonts.sansBold,
    fontSize: 13,
    letterSpacing: -0.2,
  },
});

const sheetStyles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  tap: {
    flex: 1,
  },
  sheet: {
    backgroundColor: 'rgba(10,10,10,0.92)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.30)',
    marginBottom: 16,
  },
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
  titleInput: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    padding: 0,
    margin: 0,
    minWidth: 200,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCell: {
    width: '48%',
    minHeight: 110,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  gridBlob: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 64,
    height: 64,
    borderRadius: 32,
    opacity: 0.30,
  },
  gridIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridIconText: {
    fontSize: 16,
    fontFamily: fonts.sansBold,
  },
  gridName: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  gridHint: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  pickersRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
  },
  pickerCol: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 6,
  },
  doneBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
