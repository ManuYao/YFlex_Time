import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import PressTap from './PressTap';
import Button from './Button';
import IconButton from './IconButton';
import AppIcon from './AppIcon';
import TouchShield from './TouchShield';
import MusclePicker from './MusclePicker';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { DANGER, ROUND_SIZE } from '../../lib/buttonTokens';
import { BLOCK_NAME_MAX, blockNameFromGroups, toggleGroup } from '../../lib/bodyMap';
import { getCategory, getCustomCategories, loadCustomCategories } from '../../lib/exercises';

// Hauteur d'une silhouette du corps cliquable : suit la hauteur de l'écran,
// bornée (la feuille défile si le clavier est ouvert).
const bodyHeightFor = (screenH) => Math.round(Math.min(300, Math.max(190, screenH * 0.32)));

/**
 * Feuille d'un bloc du Planning. Trois usages, une seule coquille :
 *  - création (pas de nom de départ) : corps cliquable (face / dos) + Cardio et
 *    groupes perso en pastilles, le nom se remplit tout seul tant qu'on ne l'a
 *    pas tapé soi-même, puis « Ajouter le bloc ». `onSubmit(nom, groupes)` ;
 *  - menu d'un bloc existant (le ⋮ de sa carte) : Modifier le nom, Déplacer,
 *    Archiver, Supprimer. « Modifier le nom » et « Déplacer » ouvrent une vue
 *    dans la même feuille (jamais une feuille empilée sur une autre) ;
 *  - bloc archivé : lecture seule, on peut seulement le rouvrir ou le supprimer.
 *
 * `moveTargets` : les autres jours, `{ key, long, count, archived }` — un jour
 * archivé est verrouillé, on ne peut pas y déposer un bloc. `onMove(dayKey)`.
 */
export default function BlockSheet({
  screenH,
  initialName = '',
  archived = false,
  moveTargets = [],
  onClose,
  onSubmit,
  onMove,
  onArchive,
  onReopen,
  onDelete,
}) {
  const [name, setName] = useState(initialName);
  const isEdit = !!initialName;
  // 'menu' | 'name' | 'move' — seule la création démarre directement sur le
  // champ du nom.
  const [view, setView] = useState(isEdit && !archived ? 'menu' : 'name');
  const [movingTo, setMovingTo] = useState(null);
  const guard = useSubmitGuard();
  const trimmed = name.trim();

  // Création : groupes touchés sur le corps ou en pastilles, dans l'ordre.
  // Le nom suit la sélection tant que la personne ne l'a pas tapé elle-même
  // (vider le champ rend la main à la sélection).
  const [groups, setGroups] = useState([]);
  const nameTyped = useRef(false);
  const [customGroups, setCustomGroups] = useState(getCustomCategories);
  useEffect(() => {
    if (isEdit) return undefined;
    let cancelled = false;
    loadCustomCategories().then(() => {
      if (!cancelled) setCustomGroups(getCustomCategories());
    });
    return () => {
      cancelled = true;
    };
  }, [isEdit]);

  // Poignée stable (lit la sélection par une ref) : taper le nom ne redessine
  // pas les deux silhouettes (BodyMap est mémoïsé) à chaque lettre.
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const toggleMuscle = useCallback((id) => {
    haptic.selection();
    const next = toggleGroup(groupsRef.current, id);
    groupsRef.current = next;
    setGroups(next);
    if (!nameTyped.current) {
      setName(blockNameFromGroups(next, (gid) => getCategory(gid).label));
    }
  }, []);

  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={90} keyboardAware>
      {({ close }) => {
        const submitName = () => {
          if (!trimmed) return;
          guard.run(
            'name',
            () => {
              onSubmit(trimmed, isEdit ? undefined : groups);
              close();
            },
            haptic.medium
          );
        };

        const moveTo = (target) => {
          if (target.archived) {
            haptic.warning();
            return;
          }
          setMovingTo(target.key);
          guard.run(
            'move',
            () => {
              onMove?.(target.key);
              close();
            },
            haptic.success
          );
        };

        const backToMenu = () => {
          haptic.light();
          setName(initialName);
          setView('menu');
        };

        return (
          <View>
            {/* ───────── Bloc archivé : lecture seule ───────── */}
            {archived && (
              <>
                <Text style={styles.title}>{initialName}</Text>
                <Text style={styles.subtitle}>BLOC ARCHIVÉ · LECTURE SEULE</Text>
                <Button
                  variant="solid"
                  fullWidth
                  label="Rouvrir ce bloc"
                  onPress={() => {
                    haptic.success();
                    onReopen?.();
                    close();
                  }}
                  style={styles.cta}
                />
              </>
            )}

            {/* ───────── Menu d'un bloc existant ───────── */}
            {!archived && isEdit && view === 'menu' && (
              <>
                <Text style={styles.title} numberOfLines={1}>{initialName}</Text>
                <Text style={styles.subtitle}>OPTIONS DU BLOC</Text>

                <Button
                  variant="glass"
                  fullWidth
                  icon="edit"
                  label="Modifier le nom"
                  onPress={() => {
                    haptic.light();
                    setView('name');
                  }}
                />

                <View style={styles.pairRow}>
                  <Button
                    variant="glass"
                    icon="move"
                    label="Déplacer"
                    onPress={() => {
                      haptic.light();
                      setView('move');
                    }}
                    style={styles.pairBtn}
                  />
                  <Button
                    variant="glass"
                    label="Archiver"
                    onPress={() => {
                      haptic.success();
                      onArchive?.();
                      close();
                    }}
                    style={styles.pairBtn}
                  />
                </View>
                <Text style={styles.ghostHint}>
                  Archiver fige le bloc en lecture seule et le range dans tes archives.
                </Text>
              </>
            )}

            {/* ───────── Nom : création ou renommage ───────── */}
            {!archived && view === 'name' && (
              <>
                {isEdit ? (
                  <View style={styles.subHeader}>
                    {/* La vibration est déjà dans le handler : pas de prop `haptic`. */}
                    <IconButton
                      icon="back"
                      size={ROUND_SIZE.sheet}
                      onPress={backToMenu}
                      accessibilityLabel="Retour"
                    />
                    <Text style={styles.subHeaderLabel}>MODIFIER LE NOM</Text>
                  </View>
                ) : (
                  <Text style={styles.title}>Nouveau bloc</Text>
                )}

                {!isEdit && (
                  <View style={styles.picker}>
                    <MusclePicker
                      bodyHeight={bodyHeightFor(screenH)}
                      selected={groups}
                      onToggle={toggleMuscle}
                      others={[getCategory('cardio'), ...customGroups]}
                    />
                  </View>
                )}

                <TextInput
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    nameTyped.current = text.trim().length > 0;
                  }}
                  placeholder="Nom du bloc"
                  placeholderTextColor="rgba(255,255,255,0.30)"
                  selectionColor="#FFFFFF"
                  maxLength={BLOCK_NAME_MAX}
                  autoFocus={isEdit}
                  style={styles.input}
                  returnKeyType="done"
                  onSubmitEditing={submitName}
                />

                <Button
                  variant="solid"
                  fullWidth
                  label={isEdit ? 'Enregistrer' : 'Ajouter le bloc'}
                  disabled={!trimmed}
                  loading={guard.busyKey === 'name'}
                  onPress={submitName}
                  style={styles.cta}
                />
              </>
            )}

            {/* ───────── Déplacer vers un autre jour ───────── */}
            {!archived && isEdit && view === 'move' && (
              <>
                <View style={styles.subHeader}>
                  <IconButton
                    icon="back"
                    size={ROUND_SIZE.sheet}
                    onPress={backToMenu}
                    accessibilityLabel="Retour"
                  />
                  <Text style={styles.subHeaderLabel}>DÉPLACER VERS…</Text>
                </View>

                <View style={styles.dayGrid}>
                  {moveTargets.map((t) => {
                    const picked = movingTo === t.key;
                    return (
                      <View key={t.key} style={styles.dayCellWrap}>
                        <PressTap
                          onPress={() => moveTo(t)}
                          tapScale={0.95}
                          style={[
                            styles.dayCell,
                            t.archived && styles.dayCellLocked,
                            picked && styles.dayCellPicked,
                          ]}
                        >
                          <View style={styles.dayCellTop}>
                            <Text
                              style={[
                                styles.dayCellName,
                                t.archived && styles.dayCellNameLocked,
                                picked && styles.dayCellNamePicked,
                              ]}
                              numberOfLines={1}
                            >
                              {t.long}
                            </Text>
                            {t.archived && (
                              <AppIcon name="lock" size={11} color="rgba(255,255,255,0.4)" />
                            )}
                          </View>
                          <Text style={[styles.dayCellCount, picked && styles.dayCellCountPicked]}>
                            {t.archived
                              ? 'ARCHIVÉ'
                              : `${t.count} ${t.count > 1 ? 'BLOCS' : 'BLOC'}`}
                          </Text>
                        </PressTap>
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.ghostHint}>
                  Le bloc arrive à la fin du jour choisi, avec ses exercices et ses réglages.
                </Text>
              </>
            )}

            {isEdit && (archived || view === 'menu') && (
              <Button
                variant="ghost"
                size="md"
                label="Supprimer ce bloc"
                labelStyle={styles.deleteText}
                onPress={() => {
                  haptic.warning();
                  onDelete?.();
                  close();
                }}
                style={styles.deleteLink}
              />
            )}

            {/* Pendant une validation (et un instant après), tout appui est
                avalé : le second appui d'un double-clic ne doit rien toucher. */}
            {guard.locked && <TouchShield />}
          </View>
        );
      }}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: '#FFFFFF',
    marginBottom: 14,
  },
  subtitle: {
    fontFamily: fonts.monoRegular,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.40)',
    marginTop: -10,
    marginBottom: 18,
  },
  ghostHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.38)',
    textAlign: 'center',
    marginTop: 8,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  subHeaderLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.55)',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.sansSemibold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  picker: {
    marginBottom: 18,
  },
  cta: {
    marginTop: 20,
  },
  // Déplacer et Archiver côte à côte : même hauteur, chacun la moitié de la
  // rangée (flex dans `style` = sur la zone d'appui, voir Button).
  pairRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  pairBtn: {
    flex: 1,
  },
  deleteLink: {
    marginTop: 4,
  },
  deleteText: {
    color: DANGER,
  },

  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // Trois par rangée. Wrapper obligatoire : sur PressTap, `style` va sur la
  // vue interne, pas sur la zone d'appui (voir ExerciseDetailSheet).
  dayCellWrap: {
    flexBasis: '31%',
    flexGrow: 1,
  },
  dayCell: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  dayCellLocked: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dayCellPicked: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  dayCellTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dayCellName: {
    flexShrink: 1,
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  dayCellNameLocked: {
    color: 'rgba(255,255,255,0.35)',
  },
  dayCellNamePicked: {
    color: '#0A0A0A',
  },
  dayCellCount: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 5,
  },
  dayCellCountPicked: {
    color: 'rgba(10,10,10,0.6)',
  },
});
