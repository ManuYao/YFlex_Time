import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import DraggableFlatList, {
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';

import GradientBackground from '../components/common/GradientBackground';
import WheelPicker from '../components/common/WheelPicker';
import PressTap from '../components/common/PressTap';
import Button from '../components/common/Button';
import IconButton from '../components/common/IconButton';
import BlockRoleIcon from '../components/common/BlockRoleIcon';
import AppIcon from '../components/common/AppIcon';
import {
  BLOCK_TYPES,
  getBlockType,
  getBlockDuration,
  getMixTotalDuration,
  formatBlockSubtitle,
  makeBlock,
} from '../lib/mix-blocks';
import { makeDefaultMix } from '../lib/mixes';
import { BLOCK_ROLES, getBlockRole, resolveBlockRole } from '../lib/blockRoles';
import { getTimeRange } from '../lib/timeRanges';
import { fonts } from '../lib/fonts';
import { easeImpact, springBouncy, springEnergetic } from '../lib/animations';
import {
  BOTTOM_GAP,
  BUTTON_FONT,
  BUTTON_HEIGHT,
  ROUND_SIZE,
  TAP_SCALE,
  buttonRecipe,
} from '../lib/buttonTokens';
import { useLayoutLevel } from '../lib/responsive';
import { useTimers } from '../contexts/TimersContext';
import { useHaptic } from '../hooks/useHaptic';

const ACCENT = '#9575FF';
const SAVE_HOLD_MS = 3000;

export default function MixBuilder() {
  const router = useRouter();
  const haptic = useHaptic();
  const {
    currentMix,
    library,
    saveCurrentMix,
    saveAsLibraryEntry,
    loadFromLibrary,
    removeFromLibrary,
  } = useTimers();

  const [draft, setDraft] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => {
    if (draft) return;
    if (currentMix) {
      setDraft({ ...currentMix, blocks: currentMix.blocks.map((b) => ({ ...b })) });
    } else {
      setDraft(makeDefaultMix());
    }
  }, [currentMix]);

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
    // Pas de rôle figé à la création : il suit le nom du bloc (resolveBlockRole)
    // tant que l'utilisateur n'a pas touché une pastille.
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
    await saveCurrentMix(draft);
    router.back();
  };

  const handleSaveAsNew = async () => {
    if (draft.blocks.length === 0) return;
    haptic.success();
    const entry = {
      ...draft,
      id: `mix_${Date.now()}`,
      name: (draft.name || 'Sans nom').slice(0, 28),
      blocks: draft.blocks.map((b) => ({ ...b })),
    };
    await saveAsLibraryEntry(entry);
  };

  const handleLoadMix = async (mixId) => {
    haptic.medium();
    const loaded = await loadFromLibrary(mixId);
    if (loaded) {
      setDraft({ ...loaded, blocks: loaded.blocks.map((b) => ({ ...b })) });
    }
    setLibraryOpen(false);
  };

  const handleDeleteMix = async (mixId) => {
    haptic.warning();
    await removeFromLibrary(mixId);
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
        <Text style={styles.sectionHint}>Tap édite · Glisse ← supprime · Maintiens drag</Text>
      </View>
    </View>
  );

  const ListFooter = (
    <Button
      variant="glass"
      fullWidth
      icon="plus"
      label="Ajouter un bloc"
      onPress={() => {
        haptic.light();
        setAddOpen(true);
      }}
      style={styles.addCta}
    />
  );

  return (
    <GradientBackground colors={[ACCENT, '#0A0A0A', '#000000']} ambient textMode="light">
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>BUILDER MIX</Text>
        </View>

        <View style={styles.topBar}>
          <IconButton icon="close" onPress={handleCancel} accessibilityLabel="Annuler" />
          <Text style={styles.topTitle}>Constructeur</Text>
          <Button
            variant="glass"
            size="nav"
            icon="list"
            label={String(library.length)}
            accessibilityLabel="Mes mix enregistrés"
            onPress={() => {
              haptic.light();
              setLibraryOpen(true);
            }}
          />
        </View>

        <View style={styles.listWrap}>
          <DraggableFlatList
            data={draft.blocks}
            onDragEnd={handleDragEnd}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={ListHeader}
            ListFooterComponent={ListFooter}
            contentContainerStyle={styles.listContent}
            style={styles.listInner}
            containerStyle={styles.listInner}
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
        </View>

        <View style={styles.bottomActions}>
          <Button variant="glass" label="Annuler" onPress={handleCancel} />
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
        library={library}
        onClose={() => setLibraryOpen(false)}
        onLoad={handleLoadMix}
        onDelete={handleDeleteMix}
      />
    </GradientBackground>
  );
}

function BlockRow({ block, index, drag, isActive, onEdit, onDelete }) {
  const type = getBlockType(block.type);
  const swipeRef = useRef(null);
  if (!type) return null;

  const renderRightActions = () => (
    <Pressable
      onPress={() => {
        swipeRef.current?.close();
        onDelete?.();
      }}
      style={({ pressed }) => [
        styles.swipeDelete,
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
      <Text style={styles.swipeDeleteLabel}>Supprimer</Text>
    </Pressable>
  );

  return (
    <ScaleDecorator>
      <Swipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
        rightThreshold={40}
        enabled={!isActive}
        containerStyle={styles.swipeWrap}
      >
        <Pressable
          onLongPress={drag}
          delayLongPress={250}
          onPress={onEdit}
          style={({ pressed }) => [
            styles.row,
            isActive && {
              backgroundColor: 'rgba(149,117,255,0.18)',
              borderColor: ACCENT,
            },
            pressed && !isActive && { opacity: 0.92 },
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
            <View style={styles.rowMeta}>
              <RoleBadge role={resolveBlockRole(block)} />
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                {formatBlockSubtitle(block)}
              </Text>
            </View>
          </View>

          <View style={styles.dragHandle} pointerEvents="none">
            <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
              <Path
                d="M5 5h2M11 5h2M5 9h2M11 9h2M5 13h2M11 13h2"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
          </View>
        </Pressable>
      </Swipeable>
    </ScaleDecorator>
  );
}

function RoleBadge({ role }) {
  const info = getBlockRole(role);
  const pop = useSharedValue(1);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    pop.value = withSequence(
      withTiming(1.14, { duration: 120 }),
      withSpring(1, springBouncy)
    );
  }, [role]);

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  return (
    <Animated.View style={[styles.roleBadge, popStyle]}>
      <BlockRoleIcon role={role} size={11} opacity={0.85} />
      <Text style={styles.roleBadgeText} numberOfLines={1}>{info?.short}</Text>
    </Animated.View>
  );
}

function RoleChip({ role, selected, onPress, onLayout }) {
  const progress = useSharedValue(selected ? 1 : 0);
  const pop = useSharedValue(1);
  const mountedRef = useRef(false);

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, { duration: 200, easing: easeImpact });
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (selected) {
      pop.value = withSequence(
        withTiming(1.1, { duration: 110 }),
        withSpring(1, springBouncy)
      );
    }
  }, [selected]);

  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(255,255,255,0.16)', '#FFFFFF']
    ),
  }));

  const onStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    // PressTap ne relaie pas onLayout : la mesure vit sur la View autour.
    <View onLayout={onLayout}>
      <PressTap onPress={onPress} tapScale={0.92} accessibilityLabel={role.label}>
        <Animated.View style={[sheetStyles.roleChip, chipStyle]}>
          <BlockRoleIcon role={role.id} size={14} opacity={0.7} />
          <Text style={sheetStyles.roleChipText}>{role.label}</Text>
          <Animated.View pointerEvents="none" style={[sheetStyles.roleChipOn, onStyle]}>
            <BlockRoleIcon role={role.id} size={14} color="#0A0A0A" />
            <Text style={[sheetStyles.roleChipText, sheetStyles.roleChipTextOn]}>
              {role.label}
            </Text>
          </Animated.View>
        </Animated.View>
      </PressTap>
    </View>
  );
}

// Enregistrer : un appui = enregistrer, 3 s d'appui = archiver en nouveau mix.
// Garde sa propre mécanique d'appui (la barre qui se remplit, que Button ne
// sait pas faire) mais porte le rendu de la recette 'accent' de
// lib/buttonTokens.js : même capsule que tous les autres boutons.
function SaveButton({ disabled, onTap, onLongComplete }) {
  const haptic = useHaptic();
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  const longFiredRef = useRef(false);
  const r = buttonRecipe({ variant: 'accent', color: ACCENT });

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      disabled={disabled}
      delayLongPress={SAVE_HOLD_MS}
      onPressIn={() => {
        if (disabled) return;
        longFiredRef.current = false;
        scale.value = withSpring(TAP_SCALE.lg, springEnergetic);
        progress.value = withTiming(1, { duration: SAVE_HOLD_MS });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, springEnergetic);
        progress.value = withTiming(0, { duration: 200 });
      }}
      onLongPress={() => {
        if (disabled) return;
        longFiredRef.current = true;
        haptic.medium();
        onLongComplete?.();
      }}
      onPress={() => {
        if (disabled) return;
        if (longFiredRef.current) {
          longFiredRef.current = false;
          return;
        }
        onTap?.();
      }}
      style={styles.saveSlot}
    >
      <Animated.View
        style={[styles.saveOuter, disabled ? styles.saveDisabled : { boxShadow: r.outer }, scaleStyle]}
      >
        <View
          style={[
            styles.saveInner,
            { borderColor: r.borderColor, borderWidth: r.borderWidth, boxShadow: r.inner },
          ]}
        >
          <LinearGradient
            colors={r.fill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={r.sheen}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.saveSheen}
            pointerEvents="none"
          />
          <Animated.View pointerEvents="none" style={[styles.btnPrimaryFill, fillStyle]} />
          <AppIcon name="check" size={16} color={r.textColor} />
          <Text style={[styles.saveText, { color: r.textColor }]}>Enregistrer</Text>
          <Text style={styles.btnPrimaryHint}>Maintiens 3s = nouveau</Text>
        </View>
      </Animated.View>
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
            <IconButton
              icon="close"
              size={ROUND_SIZE.sheet}
              haptic={haptic.light}
              onPress={onClose}
              accessibilityLabel="Fermer"
            />
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
                  <AppIcon name={t.icon} size={20} color={t.color} />
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
  const haptic = useHaptic();
  const [labelDraft, setLabelDraft] = useState('');
  const roleScrollRef = useRef(null);
  const roleRevealedFor = useRef(null);

  // (V) Même contrainte que PickerSheet : en fenêtre réduite les roues
  // passent à 3 valeurs, sinon la feuille dépasse par le haut. Les trois
  // sont côte à côte, donc c'est bien la hauteur d'une seule qui compte.
  const level = useLayoutLevel();
  const wheelItems = level === 'full' ? 5 : 3;
  // En réduit, une seule rangée qui défile : trois rangées de chips feraient déborder la feuille.
  const rolesInline = level !== 'full';

  useEffect(() => {
    setLabelDraft(block?.label || '');
    roleRevealedFor.current = null;
  }, [block?.id]);

  if (!block) return null;
  const type = getBlockType(block.type);

  const ranges = getRangesForType(block.type, block);
  const showRest = block.type === 'tabata';
  const showRounds = block.type !== 'rest' && block.type !== 'amrap';
  const currentRole = resolveBlockRole(block);

  const pickRole = (id) => {
    haptic.selection();
    if (block.role !== id) onUpdate({ role: id });
  };

  // Le rôle choisi peut être hors champ dans la rangée qui défile (REPOS est le dernier).
  const revealRole = (id, e) => {
    if (!rolesInline || id !== currentRole || roleRevealedFor.current === block.id) return;
    roleRevealedFor.current = block.id;
    const x = e.nativeEvent.layout.x;
    roleScrollRef.current?.scrollTo({ x: Math.max(0, x - 20), animated: false });
  };

  const roleChips = BLOCK_ROLES.map((r) => (
    <RoleChip
      key={r.id}
      role={r}
      selected={r.id === currentRole}
      onPress={() => pickRole(r.id)}
      onLayout={(e) => revealRole(r.id, e)}
    />
  ));

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
            <IconButton
              icon="close"
              size={ROUND_SIZE.sheet}
              haptic={haptic.light}
              onPress={onClose}
              accessibilityLabel="Fermer"
            />
          </View>

          <View style={sheetStyles.roleSection}>
            <Text style={sheetStyles.pickerLabel}>RÔLE</Text>
            {rolesInline ? (
              <ScrollView
                ref={roleScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={sheetStyles.roleScroll}
                contentContainerStyle={sheetStyles.roleScrollContent}
              >
                {roleChips}
              </ScrollView>
            ) : (
              <View style={sheetStyles.roleWrap}>{roleChips}</View>
            )}
          </View>

          <View style={sheetStyles.pickersRow}>
            <View style={sheetStyles.pickerCol}>
              <Text style={sheetStyles.pickerLabel}>
                {block.type === 'rest' ? 'DURÉE'
                  : block.type === 'amrap' ? 'DURÉE'
                  : block.type === 'emom' ? 'INTERVALLE'
                  : block.type === 'basic' ? 'REPOS'
                  : 'TRAVAIL'}
              </Text>
              <WheelPicker
                values={ranges.duration}
                selectedValue={block.duration}
                type="seconds"
                accentColor={type.color}
                onChange={(v) => onUpdate({ duration: v })}
                visibleItems={wheelItems}
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
                  visibleItems={wheelItems}
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
                  visibleItems={wheelItems}
                />
              </View>
            )}
          </View>

          <Button
            variant="accent"
            color={type.color}
            fullWidth
            label="OK"
            haptic={haptic.light}
            onPress={onClose}
            style={sheetStyles.doneCta}
          />
        </View>
      </View>
    </Modal>
  );
}

function LibrarySheet({ visible, library, onClose, onLoad, onDelete }) {
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
                {library.length} enregistré{library.length > 1 ? 's' : ''}
              </Text>
            </View>
            <IconButton
              icon="close"
              size={ROUND_SIZE.sheet}
              haptic={haptic.light}
              onPress={onClose}
              accessibilityLabel="Fermer"
            />
          </View>

          <View style={sheetStyles.libList}>
            {library.length === 0 && (
              <Text style={sheetStyles.libEmpty}>
                Aucun mix sauvegardé.{'\n'}Maintiens "Enregistrer" 3s pour en archiver un.
              </Text>
            )}
            {library.map((m) => {
              const total = getMixTotalDuration(m.blocks || []);
              const min = Math.floor(total / 60);
              const sec = total % 60;
              return (
                <View key={m.id} style={sheetStyles.libRow}>
                  <Pressable
                    onPress={() => onLoad(m.id)}
                    style={({ pressed }) => [
                      sheetStyles.libRowMain,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={[sheetStyles.libDot, { backgroundColor: 'rgba(255,255,255,0.40)' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={sheetStyles.libName} numberOfLines={1}>{m.name}</Text>
                      <Text style={sheetStyles.libMeta}>
                        {(m.blocks?.length || 0)} blocs · {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
                      </Text>
                    </View>
                  </Pressable>
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

// Paliers progressifs (lib/timeRanges.js), comme sur l'accueil. La valeur
// déjà enregistrée dans le bloc est toujours gardée dans la roue : un mix
// créé avec l'ancien pas de 5s (125s, 305s...) ne doit pas perdre son réglage.
// AMRAP garde ses paliers de 30s, déjà adaptés à une durée d'endurance.
const getRangesForType = (typeId, block) => {
  const d = block?.duration;
  const r = block?.rest;
  if (typeId === 'amrap') return { duration: range(60, 1800, 30), rest: [], rounds: [] };
  if (typeId === 'rest') return { duration: getTimeRange(10, 600, d), rest: [], rounds: [] };
  if (typeId === 'tabata') return { duration: getTimeRange(5, 300, d), rest: getTimeRange(5, 300, r), rounds: range(1, 30) };
  if (typeId === 'basic') return { duration: getTimeRange(5, 600, d), rest: [], rounds: range(1, 30) };
  if (typeId === 'emom') return { duration: getTimeRange(10, 300, d), rest: [], rounds: range(1, 30) };
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
  topTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
  },

  listWrap: {
    flex: 1,
  },
  listInner: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
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
    padding: 14,
    overflow: 'hidden',
    minHeight: 72,
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
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  roleBadgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.1,
    color: 'rgba(255,255,255,0.78)',
    textTransform: 'uppercase',
  },
  rowSubtitle: {
    flexShrink: 1,
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
    width: 28,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeWrap: {
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  swipeDelete: {
    width: 96,
    backgroundColor: '#FF5454',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    gap: 4,
  },
  swipeDeleteLabel: {
    color: '#FFFFFF',
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  addCta: {
    marginTop: 6,
  },

  bottomActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: BOTTOM_GAP,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  saveSlot: {
    flex: 1,
  },
  saveOuter: {
    height: BUTTON_HEIGHT.lg,
    borderRadius: BUTTON_HEIGHT.lg / 2,
  },
  saveDisabled: {
    opacity: 0.38,
  },
  // paddingBottom : remonte un peu « Enregistrer » pour laisser respirer
  // l'indice « Maintiens 3s » posé en bas de la capsule.
  saveInner: {
    flex: 1,
    borderRadius: BUTTON_HEIGHT.lg / 2,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  saveSheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '55%',
  },
  saveText: {
    fontFamily: fonts.sansExtraBold,
    fontSize: BUTTON_FONT.lg,
    letterSpacing: -0.1,
    includeFontPadding: false,
  },
  btnPrimaryFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.22)',
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
    ...StyleSheet.absoluteFill,
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

  roleSection: {
    marginBottom: 16,
  },
  roleWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  roleScroll: {
    flexGrow: 0,
    marginHorizontal: -20,
  },
  roleScrollContent: {
    paddingHorizontal: 20,
    gap: 6,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  roleChipOn: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  roleChipText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
  },
  roleChipTextOn: {
    color: '#0A0A0A',
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
  doneCta: {
    marginTop: 4,
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