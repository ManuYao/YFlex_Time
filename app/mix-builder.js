import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import DraggableFlatList, {
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

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
const SAVE_HOLD_MS = 3000;

export default function MixBuilder() {
  const router = useRouter();
  const haptic = useHaptic();
  const { activeMix, mixes, saveMix, setActiveMix, deleteMix } = useTimers();

  const [draft, setDraft] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

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

  const updateBlock = (id, patch) => {
    setDraft((d) => ({
      ...d,
      blocks: d.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  };

  const handleDragEnd = ({ data }) => {
    haptic.selection();
    setDraft((d) => ({ ...d, blocks: data }));
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

  const handleSaveAsNew = async () => {
    if (draft.blocks.length === 0) return;
    haptic.success();
    const copy = {
      ...draft,
      id: `mix_${Date.now()}`,
      name: `${draft.name || 'Sans nom'} (copie)`.slice(0, 28),
    };
    await saveMix(copy);
    setDraft(copy);
  };

  const handleLoadMix = async (mixId) => {
    const target = mixes.find((m) => m.id === mixId);
    if (!target) return;
    haptic.medium();
    await setActiveMix(mixId);
    setDraft({ ...target, blocks: target.blocks.map((b) => ({ ...b })) });
    setLibraryOpen(false);
  };

  const handleDeleteMix = async (mixId) => {
    haptic.warning();
    await deleteMix(mixId);
  };

  const editingBlock = editingBlockId
    ? draft.blocks.find((b) => b.id === editingBlockId)
    : null;

  const ListHeader = (
    <View>
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
        <Text style={styles.sectionHint}>Maintiens ≡ pour réorganiser</Text>
      </View>
    </View>
  );

  const ListFooter = (
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
      <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <Path
          d="M8 2v12M2 8h12"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={styles.addCtaText}>Ajouter un bloc</Text>
    </Pressable>
  );

  return (
    <GradientBackground colors={[ACCENT, '#0A0A0A', '#000000']} ambient textMode="light">
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>BUILDER MIX</Text>
        </View>

        <View style={styles.topBar}>
          <Pressable onPress={handleCancel} style={styles.iconBtn} hitSlop={10}>
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path
                d="M3 3l8 8M11 3l-8 8"
                stroke="#FFFFFF"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
          </Pressable>
          <Text style={styles.topTitle}>Constructeur</Text>
          <Pressable
            onPress={() => {
              haptic.light();
              setLibraryOpen(true);
            }}
            style={({ pressed }) => [
              styles.libraryBtn,
              pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
            ]}
            hitSlop={10}
          >
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path
                d="M2 3h10M2 7h10M2 11h7"
                stroke="#FFFFFF"
                strokeWidth={1.8}
                strokeLinecap="round"
              />
            </Svg>
            <Text style={styles.libraryBtnText}>{mixes.length}</Text>
          </Pressable>
        </View>

        <DraggableFlatList
          data={draft.blocks}
          onDragEnd={handleDragEnd}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          contentContainerStyle={styles.listContent}
          activationDistance={6}
          renderItem={({ item, drag, isActive, getIndex }) => (
            <BlockRow
              block={item}
              index={getIndex() ?? 0}
              drag={drag}
              isActive={isActive}
              onEdit={() => setEditingBlockId(item.id)}
              onDelete={() => removeBlock(item.id)}
            />
          )}
        />

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
          <SaveButton
            disabled={draft.blocks.length === 0}
            onTap={handleSave}
            onLongComplete={handleSaveAsNew}
          />
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

      <LibrarySheet
        visible={libraryOpen}
        mixes={mixes}
        activeId={activeMix?.id}
        onClose={() => setLibraryOpen(false)}
        onLoad={handleLoadMix}
        onDelete={handleDeleteMix}
      />
    </GradientBackground>
  );
}

function BlockRow({ block, index, drag, isActive, onEdit, onDelete }) {
  const type = getBlockType(block.type);
  if (!type) return null;
  return (
    <ScaleDecorator>
      <View
        style={[
          styles.row,
          isActive && {
            backgroundColor: 'rgba(149,117,255,0.18)',
            borderColor: ACCENT,
          },
        ]}
      >
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

        <View style={styles.rowInfo}>
          <View style={styles.rowInfoTop}>
            <View
              style={[
                styles.rowBadge,
                { backgroundColor: `${type.color}22` },
              ]}
            >
              <Text style={[styles.rowBadgeText, { color: type.color }]}>{type.name}</Text>
            </View>
            <Text style={styles.rowLabel} numberOfLines={1}>{block.label}</Text>
          </View>
          <Text style={styles.rowSubtitle}>{formatBlockSubtitle(block)}</Text>
        </View>

        <Pressable
          onPress={onEdit}
          hitSlop={10}
          style={({ pressed }) => [
            styles.iconAction,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Path
              d="M11 2l3 3-8 8H3v-3l8-8z"
              stroke="#FFFFFF"
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>

        <Pressable
          onPress={onDelete}
          hitSlop={10}
          style={({ pressed }) => [
            styles.iconAction,
            { backgroundColor: 'rgba(255,84,84,0.14)' },
            pressed && { opacity: 0.6 },
          ]}
        >
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path
              d="M3 3l8 8M11 3l-8 8"
              stroke="#FF5454"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
        </Pressable>

        <Pressable
          onLongPress={drag}
          delayLongPress={120}
          hitSlop={10}
          style={({ pressed }) => [
            styles.dragHandle,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
            <Path
              d="M5 5h2M11 5h2M5 9h2M11 9h2M5 13h2M11 13h2"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
        </Pressable>
      </View>
    </ScaleDecorator>
  );
}

function SaveButton({ disabled, onTap, onLongComplete }) {
  const haptic = useHaptic();
  const progress = useSharedValue(0);
  const startedRef = useRef(0);
  const triggeredRef = useRef(false);
  const tickRef = useRef(null);
  const longTimeoutRef = useRef(null);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const cleanup = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (longTimeoutRef.current) clearTimeout(longTimeoutRef.current);
    tickRef.current = null;
    longTimeoutRef.current = null;
  };

  const handlePressIn = () => {
    if (disabled) return;
    triggeredRef.current = false;
    startedRef.current = Date.now();
    progress.value = withTiming(1, { duration: SAVE_HOLD_MS });
    let lastSec = 0;
    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startedRef.current;
      const sec = Math.floor(elapsed / 1000);
      if (sec > lastSec && sec < SAVE_HOLD_MS / 1000) {
        lastSec = sec;
        haptic.light();
      }
    }, 100);
    longTimeoutRef.current = setTimeout(() => {
      triggeredRef.current = true;
      cleanup();
      progress.value = withTiming(0, { duration: 200 });
      onLongComplete?.();
    }, SAVE_HOLD_MS);
  };

  const handlePressOut = () => {
    cleanup();
    if (triggeredRef.current) return;
    progress.value = withTiming(0, { duration: 200 });
  };

  const handlePress = () => {
    if (disabled) return;
    if (triggeredRef.current) {
      triggeredRef.current = false;
      return;
    }
    onTap?.();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btnPrimary,
        { backgroundColor: ACCENT, shadowColor: ACCENT },
        disabled && { opacity: 0.45 },
        pressed && !disabled && { opacity: 0.92 },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.btnPrimaryFill, fillStyle]}
      />
      <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
        <Path
          d="M2 7l3 3 6-7"
          stroke="#FFFFFF"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={styles.btnPrimaryText}>Enregistrer</Text>
      <Text style={styles.btnPrimaryHint}>Maintiens 3s = nouveau</Text>
    </Pressable>
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
            <Pressable onPress={onClose} style={sheetStyles.closeBtn} hitSlop={10}>
              <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                <Path d="M3 3l8 8M11 3l-8 8" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
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
            <View style={{ flex: 1, paddingRight: 12 }}>
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
            <Pressable onPress={onClose} style={sheetStyles.closeBtn} hitSlop={10}>
              <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                <Path d="M3 3l8 8M11 3l-8 8" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
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

function LibrarySheet({ visible, mixes, activeId, onClose, onLoad, onDelete }) {
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
              <Text style={sheetStyles.kicker}>MES MIX</Text>
              <Text style={sheetStyles.title}>
                {mixes.length} enregistré{mixes.length > 1 ? 's' : ''}
              </Text>
            </View>
            <Pressable onPress={onClose} style={sheetStyles.closeBtn} hitSlop={10}>
              <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                <Path d="M3 3l8 8M11 3l-8 8" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </Pressable>
          </View>

          <View style={sheetStyles.libList}>
            {mixes.length === 0 && (
              <Text style={sheetStyles.libEmpty}>Aucun mix enregistré</Text>
            )}
            {mixes.map((m) => {
              const isActive = m.id === activeId;
              const total = getMixTotalDuration(m.blocks || []);
              const min = Math.floor(total / 60);
              const sec = total % 60;
              return (
                <View
                  key={m.id}
                  style={[
                    sheetStyles.libRow,
                    isActive && { borderColor: ACCENT, backgroundColor: 'rgba(149,117,255,0.10)' },
                  ]}
                >
                  <Pressable
                    onPress={() => onLoad(m.id)}
                    style={({ pressed }) => [
                      sheetStyles.libRowMain,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={[sheetStyles.libDot, { backgroundColor: isActive ? ACCENT : 'rgba(255,255,255,0.30)' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={sheetStyles.libName} numberOfLines={1}>{m.name}</Text>
                      <Text style={sheetStyles.libMeta}>
                        {(m.blocks?.length || 0)} blocs · {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
                      </Text>
                    </View>
                  </Pressable>
                  {!isActive && (
                    <Pressable
                      onPress={() => onDelete(m.id)}
                      style={({ pressed }) => [
                        sheetStyles.libDelete,
                        pressed && { opacity: 0.7 },
                      ]}
                      hitSlop={10}
                    >
                      <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                        <Path d="M3 3l8 8M11 3l-8 8" stroke="#FF5454" strokeWidth={2} strokeLinecap="round" />
                      </Svg>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>

          <Text style={sheetStyles.libHint}>
            Tap = charger · 3s sur Enregistrer = nouveau mix
          </Text>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
  },
  libraryBtn: {
    height: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  libraryBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 130,
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
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    overflow: 'hidden',
    minHeight: 64,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIndexText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowInfoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  rowBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rowBadgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.3,
  },
  rowLabel: {
    flex: 1,
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  rowSubtitle: {
    fontFamily: fonts.monoRegular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
  },
  iconAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 36,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addCta: {
    height: 60,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  addCtaText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
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
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  btnSecondary: {
    flex: 1,
    height: 56,
    borderRadius: 18,
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
    flex: 1.7,
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  btnPrimaryFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontFamily: fonts.sansBold,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  btnPrimaryHint: {
    position: 'absolute',
    bottom: 4,
    color: 'rgba(255,255,255,0.65)',
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    letterSpacing: 0.6,
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
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    height: 50,
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