import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import BottomSheet from './BottomSheet';
import ConfirmSheet from './ConfirmSheet';
import PressTap from './PressTap';
import Button from './Button';
import { fonts } from '../../lib/fonts';
import { DANGER, PAIR_GAP } from '../../lib/buttonTokens';
import {
  CATEGORY_PALETTE,
  addCustomCategory,
  addCustomExercise,
  categoryChip,
  getAllCategories,
  getCategory,
  guessCategoryFromName,
  isCustomCategory,
  loadCustomCategories,
  loadCustomExercises,
  removeCustomCategory,
  removeCustomExercise,
  updateCustomCategory,
} from '../../lib/exercises';
import { haptic } from '../../hooks/useHaptic';

// Vues de la feuille : 'list' = bibliothèque, 'exercise' = création d'un
// exercice, 'category' = création / modification d'un groupe musculaire.
const emptyCategoryDraft = () => ({
  id: null,
  label: '',
  color: CATEGORY_PALETTE[0].color,
  text: CATEGORY_PALETTE[0].text,
});

export default function ExerciseLibrarySheet({ screenH, blockName, onClose, onPick }) {
  const [categories, setCategories] = useState(getAllCategories);
  // Le rayon s'ouvre sur le groupe déduit du nom du bloc ("Jambes" → JAMBES)
  // au lieu du premier de la liste. Recalculé quand `categories` change :
  // les groupes perso arrivent d'AsyncStorage après le premier rendu, un bloc
  // nommé comme l'un d'eux ne peut être reconnu qu'à ce moment-là.
  const guess = useMemo(() => guessCategoryFromName(blockName), [blockName, categories]);
  const [categoryId, setCategoryId] = useState(() => guess ?? categories[0].id);
  // Dès que l'utilisateur a choisi ou touché un groupe lui-même, la
  // présélection ne le reprend plus — lui changer sa sélection sous les
  // doigts serait pire que de ne rien présélectionner.
  const manualPick = useRef(false);
  const [customs, setCustoms] = useState([]);
  const [view, setView] = useState('list');
  const [customName, setCustomName] = useState('');
  const [draft, setDraft] = useState(emptyCategoryDraft);

  // Le chip présélectionné peut être hors champ dans la rangée horizontale
  // (CARDIO est le 6ᵉ, un groupe perso encore plus loin) : sans recadrage,
  // l'utilisateur verrait une rangée sans chip actif et des exercices d'un
  // groupe qu'il ne voit pas. Les chips ne sont mesurés qu'après le montage,
  // d'où `revealTarget` : onLayout prend le relais si la mesure manque encore.
  const catScrollRef = useRef(null);
  const chipX = useRef({});
  const revealTarget = useRef(null);
  const revealChip = (id) => {
    const x = chipX.current[id];
    if (x == null) {
      revealTarget.current = id;
      return;
    }
    revealTarget.current = null;
    catScrollRef.current?.scrollTo({
      x: Math.max(0, x - styles.catContent.paddingHorizontal),
      animated: false,
    });
  };

  useEffect(() => {
    if (!guess || manualPick.current) return;
    setCategoryId(guess);
    revealChip(guess);
  }, [guess]);

  useEffect(() => {
    let cancelled = false;
    loadCustomExercises().then((list) => {
      if (!cancelled) setCustoms(list);
    });
    loadCustomCategories().then(() => {
      if (!cancelled) setCategories(getAllCategories());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const category = getCategory(categoryId);
  const chip = categoryChip(categoryId);
  const customInCategory = customs.filter((e) => e.category === categoryId);
  const exercises = [
    ...category.exercises.map((label) => ({ label, custom: false })),
    ...customInCategory.map((e) => ({ label: e.label, custom: true })),
  ];
  const trimmed = customName.trim();
  const draftLabel = draft.label.trim();

  const submitCustom = (close) => {
    if (!trimmed) return;
    haptic.medium();
    addCustomExercise({ label: trimmed, category: categoryId });
    onPick({ label: trimmed, category: categoryId });
    close();
  };

  const openCategoryEditor = (cat) => {
    haptic.light();
    manualPick.current = true;
    setDraft(
      cat
        ? { id: cat.id, label: cat.label, color: cat.color, text: cat.text }
        : emptyCategoryDraft()
    );
    setView('category');
  };

  const submitCategory = async () => {
    if (!draftLabel) return;
    haptic.medium();
    if (draft.id) {
      await updateCustomCategory(draft.id, {
        label: draftLabel,
        color: draft.color,
        text: draft.text,
      });
      setCategories(getAllCategories());
    } else {
      const created = await addCustomCategory({
        label: draftLabel,
        color: draft.color,
        text: draft.text,
      });
      setCategories(getAllCategories());
      setCategoryId(created.id);
    }
    setView('list');
  };

  // Un exercice perso n'est qu'une entrée de bibliothèque (pas d'id, pas de
  // charge/séries/repos ici) : le retirer n'affecte aucune séance déjà
  // planifiée, donc pas besoin du même luxe d'avertissement que pour un
  // groupe entier — une confirmation suffit. `confirm` pilote la feuille
  // `ConfirmSheet` rendue plus bas : pas d'`Alert.alert` (popup système, hors
  // charte — police et fond par défaut au milieu d'une app 100 % custom).
  const [confirm, setConfirm] = useState(null);

  const confirmDeleteExercise = (label) => {
    haptic.light();
    setConfirm({ type: 'exercise', label });
  };

  const confirmDeleteCategory = () => {
    haptic.light();
    setConfirm({ type: 'category' });
  };

  const runDeleteExercise = async (label) => {
    setCustoms(await removeCustomExercise({ label, category: categoryId }));
  };

  const runDeleteCategory = async () => {
    await removeCustomCategory(draft.id);
    const next = getAllCategories();
    setCategories(next);
    setCustoms(await loadCustomExercises());
    if (categoryId === draft.id) setCategoryId(next[0].id);
    setView('list');
  };

  return (
    <>
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={92}>
      {({ close }) => (
        <View>
          <Text style={styles.title}>
            {view === 'category'
              ? draft.id
                ? 'Modifier le groupe'
                : 'Nouveau groupe'
              : 'Ajouter un exercice'}
          </Text>
          {view === 'category' ? (
            <Text style={styles.subtitle}>GROUPE MUSCULAIRE</Text>
          ) : (
            !!blockName && <Text style={styles.subtitle}>{blockName.toUpperCase()}</Text>
          )}

          {view === 'category' ? (
            <View style={styles.createBox}>
              <TextInput
                value={draft.label}
                onChangeText={(label) => setDraft((d) => ({ ...d, label }))}
                placeholder="Nom du groupe"
                placeholderTextColor="rgba(255,255,255,0.30)"
                selectionColor={draft.color}
                maxLength={24}
                autoCapitalize="characters"
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={submitCategory}
              />

              <Text style={styles.swatchLabel}>COULEUR</Text>
              <View style={styles.swatchRow}>
                {CATEGORY_PALETTE.map((p) => {
                  const isActive = p.color === draft.color;
                  return (
                    <PressTap
                      key={p.color}
                      onPress={() => {
                        haptic.selection();
                        setDraft((d) => ({ ...d, color: p.color, text: p.text }));
                      }}
                      tapScale={0.9}
                      style={[
                        styles.swatch,
                        {
                          backgroundColor: p.color,
                          borderColor: isActive ? '#FFFFFF' : 'transparent',
                        },
                      ]}
                    >
                      {isActive && (
                        <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                          <Path
                            d="M2.5 6.2l2.4 2.4 4.6-5"
                            stroke="#0A0A0A"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      )}
                    </PressTap>
                  );
                })}
              </View>

              {/* « Annuler » en verre à la largeur de son texte, l'action prend
                  le reste. Vibrations déjà dans les handlers : pas de `haptic`. */}
              <View style={styles.createActions}>
                <Button
                  variant="glass"
                  label="Annuler"
                  onPress={() => {
                    haptic.light();
                    setView('list');
                  }}
                />
                <Button
                  variant="solid"
                  label={draft.id ? 'Enregistrer' : 'Créer'}
                  disabled={!draftLabel}
                  onPress={submitCategory}
                  style={styles.ctaMain}
                />
              </View>

              {!!draft.id && (
                <Button
                  variant="ghost"
                  size="md"
                  label="Supprimer ce groupe"
                  labelStyle={styles.deleteText}
                  onPress={confirmDeleteCategory}
                  style={styles.deleteLink}
                />
              )}
            </View>
          ) : (
            <>
              <ScrollView
                ref={catScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.catRow}
                contentContainerStyle={styles.catContent}
              >
                {categories.map((c) => {
                  const isActive = c.id === categoryId;
                  return (
                    // PressTap ne relaie pas onLayout : la mesure vit sur une
                    // View neutre autour, sans effet sur le rendu du chip.
                    <View
                      key={c.id}
                      onLayout={(e) => {
                        chipX.current[c.id] = e.nativeEvent.layout.x;
                        if (revealTarget.current === c.id) revealChip(c.id);
                      }}
                    >
                      <PressTap
                        onPress={() => {
                          haptic.selection();
                          manualPick.current = true;
                          setCategoryId(c.id);
                          setView('list');
                        }}
                        // Seuls les groupes créés se modifient : les six groupes
                        // d'origine sont le socle de la bibliothèque.
                        onLongPress={
                          isCustomCategory(c.id) ? () => openCategoryEditor(c) : undefined
                        }
                        tapScale={0.94}
                        style={[
                          styles.catChip,
                          {
                            backgroundColor: isActive ? c.color : 'rgba(255,255,255,0.05)',
                            borderColor: isActive ? c.color : 'rgba(255,255,255,0.12)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.catText,
                            { color: isActive ? '#0A0A0A' : 'rgba(255,255,255,0.65)' },
                          ]}
                        >
                          {c.label}
                        </Text>
                      </PressTap>
                    </View>
                  );
                })}

                <PressTap
                  onPress={() => openCategoryEditor(null)}
                  tapScale={0.94}
                  style={styles.catAdd}
                >
                  <Text style={styles.catAddText}>+ GROUPE</Text>
                </PressTap>
              </ScrollView>

              {isCustomCategory(categoryId) ? (
                <Text style={styles.catHint}>
                  Appui long sur le groupe pour le renommer, le recolorer ou le
                  supprimer{customInCategory.length > 0
                    ? ', et sur un exercice créé pour le retirer.'
                    : '.'}
                </Text>
              ) : (
                customInCategory.length > 0 && (
                  <Text style={styles.catHint}>
                    Appui long sur un exercice créé pour le retirer de la bibliothèque.
                  </Text>
                )
              )}

              {view === 'exercise' ? (
                <View style={styles.createBox}>
                  <TextInput
                    value={customName}
                    onChangeText={setCustomName}
                    placeholder="Nom de l'exercice"
                    placeholderTextColor="rgba(255,255,255,0.30)"
                    selectionColor={category.color}
                    maxLength={32}
                    style={styles.input}
                    returnKeyType="done"
                    onSubmitEditing={() => submitCustom(close)}
                  />
                  <Text style={styles.createHint}>
                    Il sera gardé dans {category.label} pour tes prochaines séances.
                  </Text>

                  <View style={styles.createActions}>
                    <Button
                      variant="glass"
                      label="Annuler"
                      onPress={() => {
                        haptic.light();
                        setView('list');
                      }}
                    />
                    <Button
                      variant="solid"
                      label="Ajouter"
                      disabled={!trimmed}
                      onPress={() => submitCustom(close)}
                      style={styles.ctaMain}
                    />
                  </View>
                </View>
              ) : (
                <ScrollView
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                >
                  {exercises.map((ex) => (
                    <PressTap
                      key={ex.label}
                      onPress={() => {
                        haptic.medium();
                        onPick({ label: ex.label, category: categoryId });
                        close();
                      }}
                      // Seuls les exercices créés se suppriment ainsi — ceux
                      // de la bibliothèque d'origine ne bougent pas. Pas de
                      // conflit de geste ici (pas de Swipeable autour, à la
                      // différence des étiquettes du planning) : l'appui long
                      // reste fiable dans cette feuille.
                      onLongPress={ex.custom ? () => confirmDeleteExercise(ex.label) : undefined}
                      tapScale={0.95}
                      style={[
                        styles.exerciseChip,
                        { backgroundColor: chip.bg, borderColor: chip.border },
                      ]}
                    >
                      <Text style={[styles.exerciseText, { color: chip.text }]}>
                        {ex.label.toUpperCase()}
                      </Text>
                    </PressTap>
                  ))}

                  <PressTap
                    onPress={() => {
                      haptic.light();
                      setCustomName('');
                      setView('exercise');
                    }}
                    tapScale={0.95}
                    style={styles.createChip}
                  >
                    <Text style={styles.createChipText}>+ CRÉER</Text>
                  </PressTap>
                </ScrollView>
              )}
            </>
          )}
        </View>
      )}
    </BottomSheet>

    {!!confirm && (
      <ConfirmSheet
        screenH={screenH}
        title={confirm.type === 'exercise' ? 'Retirer cet exercice' : 'Supprimer ce groupe'}
        body={
          confirm.type === 'exercise'
            ? `« ${confirm.label} » sera retiré de la bibliothèque ${category.label}.`
            : `« ${draft.label} » et les exercices que tu y as créés seront supprimés de la bibliothèque. Les étiquettes déjà posées dans ton planning restent en place, sans couleur de groupe.`
        }
        confirmLabel={confirm.type === 'exercise' ? 'Retirer' : 'Supprimer'}
        onConfirm={() =>
          confirm.type === 'exercise' ? runDeleteExercise(confirm.label) : runDeleteCategory()
        }
        onClose={() => setConfirm(null)}
      />
    )}
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: fonts.monoRegular,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 3,
  },

  catRow: {
    flexGrow: 0,
    marginTop: 16,
    marginHorizontal: -20,
  },
  catContent: {
    paddingHorizontal: 20,
    gap: 6,
  },
  catChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  catText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.3,
  },
  catAdd: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  catAddText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.3,
    color: 'rgba(255,255,255,0.45)',
  },
  catHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 10,
  },

  list: {
    marginTop: 16,
    maxHeight: 260,
  },
  listContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 4,
  },
  exerciseChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exerciseText: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    letterSpacing: 0.6,
  },
  createChip: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  createChipText: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.45)',
  },

  createBox: {
    marginTop: 16,
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
  createHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 10,
  },
  swatchLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 2.2,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 18,
    marginBottom: 10,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PAIR_GAP,
    marginTop: 18,
  },
  // Placement seulement : le rendu des boutons vient de Button
  // (lib/buttonTokens.js). `style` de Button est posé sur la zone d'appui,
  // donc le `flex: 1` fait bien grandir l'action dans la rangée.
  ctaMain: {
    flex: 1,
  },
  deleteLink: {
    marginTop: 10,
  },
  deleteText: {
    color: DANGER,
  },
});
