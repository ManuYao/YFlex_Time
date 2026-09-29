import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import BottomSheet from './BottomSheet';
import PressTap from './PressTap';
import WheelPicker from './WheelPicker';
import Button from './Button';
import IconButton from './IconButton';
import AppIcon from './AppIcon';
import { fonts } from '../../lib/fonts';
import { formatValue, formatSecondsCompact } from '../../lib/formatters';
import { getCategory } from '../../lib/exercises';
import { BLOCK_TYPES, getBlockType, getRangesForType } from '../../lib/mix-blocks';
import { PLANNING_TIMER_TYPES } from '../../lib/planningMix';
import { useLayoutLevel } from '../../lib/responsive';
import { DANGER, ROUND_SIZE } from '../../lib/buttonTokens';
import { haptic } from '../../hooks/useHaptic';

// Les 4 types utilisables comme chrono d'une étiquette (jamais MIX ni REPOS),
// dans l'ordre du menu de l'accueil (AMRAP, BASIC, EMOM, TABATA), pas celui
// de BLOCK_TYPES.
const TIMER_TYPE_OPTIONS = PLANNING_TIMER_TYPES.map((id) => BLOCK_TYPES.find((t) => t.id === id)).filter(Boolean);

const TIMER_FIELD_LABEL = (typeId, key) => {
  if (key === 'rest') return 'REPOS';
  if (key === 'rounds') return 'TOURS';
  // key === 'duration'
  if (typeId === 'emom') return 'INTERVALLE';
  if (typeId === 'tabata') return 'TRAVAIL';
  return 'DURÉE';
};

const range = (from, to, step) => {
  const out = [];
  for (let v = from; v <= to; v += step) out.push(Math.round(v * 10) / 10);
  return out;
};

const inRange = (list, v) => list.length > 0 && v >= list[0] && v <= list[list.length - 1];
const nearest = (list, v) =>
  list.reduce((best, x) => (Math.abs(x - v) < Math.abs(best - v) ? x : best), list[0]);

// Texte d'une case : "PDC" à 0 kg, "1 min 30" plutôt que "90 s".
const displayOf = (key, v) => {
  if (key === 'weight') return formatValue(v, 'weight');
  if (key === 'sets') return { main: String(v), unit: '' };
  return formatSecondsCompact(v);
};

const FIELDS = [
  { key: 'weight', label: 'CHARGE', unit: 'kg', pickerType: 'weight', fallback: 20 },
  { key: 'sets', label: 'SÉRIES', unit: '', pickerType: 'sets', fallback: 4 },
  { key: 'rest', label: 'REPOS', unit: 's', pickerType: 'seconds', fallback: 90 },
];

function CellValue({ display, color }) {
  return (
    <View style={styles.cellValueRow}>
      <Text
        style={styles.cellValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {display ? display.main : '—'}
      </Text>
      {!!display?.unit && <Text style={[styles.cellUnit, { color }]}>{display.unit}</Text>}
    </View>
  );
}

export default function ExerciseDetailSheet({
  screenH,
  tag,
  blockName,
  dayLabel,
  onClose,
  onSave,
  onRemove,
}) {
  // (V) Même contrainte que PickerSheet : en fenêtre réduite la roue passe
  // à 3 valeurs, sinon la feuille dépasse par le haut (voir lib/responsive.js).
  const level = useLayoutLevel();
  const wheelItems = level === 'full' ? 5 : 3;

  // Copie figée à l'ouverture : "Retirer cet exercice" supprime l'étiquette du
  // planning avant la fin de l'animation de fermeture, donc la prop `tag`
  // devient undefined alors que la feuille est encore à l'écran.
  // Les initialiseurs DOIVENT être des fonctions : un objet littéral passé à
  // useState est reconstruit à chaque rendu (même si sa valeur est ignorée),
  // et lirait tag.weight sur un tag déjà supprimé.
  const [snapshot] = useState(() => tag);
  const [draft, setDraft] = useState(() => ({
    weight: tag.weight,
    sets: tag.sets,
    rest: tag.rest,
  }));
  const [editing, setEditing] = useState(null);

  // Type de chrono à lancer pour cet exercice (v15.1.0, import Planning→MIX,
  // voir lib/planningMix.js) — distinct de `draft.rest` ci-dessus (repos entre
  // séries de musculation, pas le repos d'un cycle TABATA). `timerParams` n'a
  // de sens que si `timerType` est réglé ; changer de type repart des
  // réglages par défaut de CE type plutôt que de garder les anciens chiffres,
  // qui n'auraient pas la même signification d'un type à l'autre.
  const [timerType, setTimerType] = useState(() => tag.timerConfig?.type ?? null);
  const [timerParams, setTimerParams] = useState(() => {
    const cfg = tag.timerConfig;
    if (!cfg?.type) return null;
    return { duration: cfg.duration, rest: cfg.rest, rounds: cfg.rounds };
  });
  const [timerEditing, setTimerEditing] = useState(null); // 'duration' | 'rest' | 'rounds'

  const category = getCategory(snapshot.category);
  const values = useMemo(
    () => ({
      weight: range(0, 200, 2.5),
      sets: range(1, 20, 1),
      rest: range(0, 300, 5),
    }),
    []
  );

  const field = FIELDS.find((f) => f.key === editing);

  const hasRest = (id) => id === 'tabata' || id === 'basic';
  const hasRounds = (id) => !!id && id !== 'amrap';

  // Séries ↔ tours et repos ↔ repos restent liés : modifier l'un met l'autre à
  // jour (dans les deux sens). On ne recopie que si la valeur existe dans la
  // roue de l'autre côté, sinon l'autre valeur reste telle quelle.
  const updateDraft = (key, v) => {
    setDraft((prev) => ({ ...prev, [key]: v }));
    if (!timerType) return;
    if (key === 'sets' && hasRounds(timerType)) {
      setTimerParams((prev) => ({ ...prev, rounds: v }));
    } else if (key === 'rest' && hasRest(timerType)) {
      const list = getRangesForType(timerType, timerParams).rest;
      if (inRange(list, v)) setTimerParams((prev) => ({ ...prev, rest: nearest(list, v) }));
    }
  };

  const updateTimerParam = (key, v) => {
    setTimerParams((prev) => ({ ...prev, [key]: v }));
    if (key === 'rounds' && inRange(values.sets, v)) {
      setDraft((prev) => ({ ...prev, sets: v }));
    } else if (key === 'rest' && inRange(values.rest, v)) {
      setDraft((prev) => ({ ...prev, rest: nearest(values.rest, v) }));
    }
  };

  const pickTimerType = (id) => {
    haptic.selection();
    if (timerType === id) {
      setTimerType(null);
      setTimerParams(null);
      return;
    }
    const type = getBlockType(id);
    // Réglages de départ calés sur ce qui est affiché au-dessus (séries →
    // tours, repos → repos) ; le temps de travail reste celui du type.
    let rest = type.defaults.rest ?? 0;
    if (hasRest(id) && draft.rest != null) {
      const list = getRangesForType(id, { duration: type.defaults.duration, rest }).rest;
      if (inRange(list, draft.rest)) rest = nearest(list, draft.rest);
    }
    setTimerType(id);
    setTimerParams({
      duration: type.defaults.duration ?? 0,
      rest,
      rounds: hasRounds(id) && draft.sets != null ? draft.sets : type.defaults.rounds ?? 1,
    });
  };

  const timerTypeInfo = timerType ? getBlockType(timerType) : null;
  const showTimerDuration = timerType && timerType !== 'basic';
  const showTimerRest = hasRest(timerType);
  const showTimerRounds = hasRounds(timerType);
  const timerRanges = timerType ? getRangesForType(timerType, timerParams) : null;

  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={94}>
      {({ close }) => (
        <View>
          <View style={styles.header}>
            <Text style={styles.title}>{snapshot.label}</Text>
            <Text style={styles.subtitle}>
              {[blockName, dayLabel].filter(Boolean).join(' · ').toUpperCase()}
            </Text>
          </View>

          {field ? (
            <View>
              <View style={styles.editHeader}>
                {/* Vibration déjà dans le handler : pas de prop `haptic`. */}
                <IconButton
                  icon="back"
                  size={ROUND_SIZE.sheet}
                  onPress={() => {
                    haptic.light();
                    setEditing(null);
                  }}
                  accessibilityLabel="Retour"
                />
                <Text style={styles.editLabel}>{field.label}</Text>
              </View>

              <WheelPicker
                key={field.key}
                values={values[field.key]}
                selectedValue={draft[field.key] ?? field.fallback}
                type={field.pickerType}
                accentColor={category.color}
                onChange={(v) => updateDraft(field.key, v)}
                visibleItems={wheelItems}
              />

              <Button
                variant="solid"
                fullWidth
                label="OK"
                onPress={() => {
                  haptic.medium();
                  setEditing(null);
                }}
                style={styles.cta}
              />
            </View>
          ) : timerEditing ? (
            <View>
              <View style={styles.editHeader}>
                <IconButton
                  icon="back"
                  size={ROUND_SIZE.sheet}
                  onPress={() => {
                    haptic.light();
                    setTimerEditing(null);
                  }}
                  accessibilityLabel="Retour"
                />
                <Text style={styles.editLabel}>{TIMER_FIELD_LABEL(timerType, timerEditing)}</Text>
              </View>

              <WheelPicker
                key={`${timerType}-${timerEditing}`}
                values={timerRanges[timerEditing]}
                selectedValue={timerParams[timerEditing]}
                type={timerEditing === 'rounds' ? 'rounds' : 'seconds'}
                accentColor={timerTypeInfo.color}
                onChange={(v) => updateTimerParam(timerEditing, v)}
                visibleItems={wheelItems}
              />

              <Button
                variant="solid"
                fullWidth
                label="OK"
                onPress={() => {
                  haptic.medium();
                  setTimerEditing(null);
                }}
                style={styles.cta}
              />
            </View>
          ) : (
            <View>
              <View style={styles.grid}>
                {FIELDS.map((f) => (
                  // PressTap applique `style` à sa vue interne, pas au
                  // Pressable : en ligne, sans ce wrapper, les trois cases se
                  // réduisent à la largeur de leur texte au lieu d'occuper un
                  // tiers chacune.
                  <View key={f.key} style={styles.cellWrap}>
                  <PressTap
                    onPress={() => {
                      haptic.selection();
                      // La molette s'ouvre sur `fallback` quand rien n'est
                      // saisi : sans ça, valider sans faire tourner la molette
                      // laisserait la valeur à "—" alors qu'un nombre s'affiche.
                      if (draft[f.key] == null) updateDraft(f.key, f.fallback);
                      setEditing(f.key);
                    }}
                    tapScale={0.95}
                    style={styles.cell}
                  >
                    <View style={styles.cellLabelRow}>
                      <Text style={styles.cellLabel}>{f.label}</Text>
                      <Svg width={8} height={8} viewBox="0 0 10 10" fill="none">
                        <Path
                          d="M2 3.5L5 6.5l3-3"
                          stroke="rgba(255,255,255,0.4)"
                          strokeWidth={1.6}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </View>
                    <CellValue
                      display={draft[f.key] == null ? null : displayOf(f.key, draft[f.key])}
                      color={category.color}
                    />
                  </PressTap>
                  </View>
                ))}
              </View>

              {/* Type de chrono à lancer pour cet exercice (v15.1.0) — voir
                  lib/planningMix.js. Optionnel : une étiquette sans type est
                  quand même incluse au lancement du bloc, à configurer ou
                  retirer depuis le Mix Builder. */}
              <Text style={styles.sectionLabel}>TYPE DE CHRONO</Text>
              <View style={styles.typeGrid}>
                {TIMER_TYPE_OPTIONS.map((t) => {
                  const selected = timerType === t.id;
                  // Wrapper flex:1 obligatoire : sur PressTap, `flex` dans `style`
                  // s'applique à la vue interne dont le parent (Pressable) n'a
                  // pas de hauteur, et la cellule s'écrase (icône et nom
                  // sortent de la case).
                  return (
                    <View key={t.id} style={styles.cellWrap}>
                      <PressTap
                        onPress={() => pickTimerType(t.id)}
                        tapScale={0.95}
                        style={[
                          styles.typeCell,
                          selected && { backgroundColor: `${t.color}22`, borderColor: t.color },
                        ]}
                      >
                        <AppIcon name={t.icon} size={28} color={selected ? t.color : 'rgba(255,255,255,0.5)'} />
                        <Text style={[styles.typeCellText, selected && { color: t.color }]}>
                          {t.name}
                        </Text>
                      </PressTap>
                    </View>
                  );
                })}
              </View>

              {!!timerType && (
                <View style={[styles.grid, styles.timerParamsGrid]}>
                  {showTimerDuration && (
                    <View style={styles.cellWrap}>
                      <PressTap
                        onPress={() => {
                          haptic.selection();
                          setTimerEditing('duration');
                        }}
                        tapScale={0.95}
                        style={styles.cell}
                      >
                        <Text style={styles.cellLabel}>{TIMER_FIELD_LABEL(timerType, 'duration')}</Text>
                        <CellValue
                          display={formatSecondsCompact(timerParams.duration)}
                          color={timerTypeInfo.color}
                        />
                      </PressTap>
                    </View>
                  )}
                  {showTimerRest && (
                    <View style={styles.cellWrap}>
                      <PressTap
                        onPress={() => {
                          haptic.selection();
                          setTimerEditing('rest');
                        }}
                        tapScale={0.95}
                        style={styles.cell}
                      >
                        <Text style={styles.cellLabel}>REPOS</Text>
                        <CellValue
                          display={formatSecondsCompact(timerParams.rest)}
                          color={timerTypeInfo.color}
                        />
                      </PressTap>
                    </View>
                  )}
                  {showTimerRounds && (
                    <View style={styles.cellWrap}>
                      <PressTap
                        onPress={() => {
                          haptic.selection();
                          setTimerEditing('rounds');
                        }}
                        tapScale={0.95}
                        style={styles.cell}
                      >
                        <Text style={styles.cellLabel}>TOURS</Text>
                        <CellValue display={{ main: String(timerParams.rounds), unit: '' }} color={timerTypeInfo.color} />
                      </PressTap>
                    </View>
                  )}
                </View>
              )}

              <Button
                variant="solid"
                fullWidth
                label="Enregistrer"
                onPress={() => {
                  haptic.medium();
                  onSave({
                    ...draft,
                    timerConfig: timerType ? { type: timerType, ...timerParams } : null,
                  });
                  close();
                }}
                style={styles.cta}
              />

              <Button
                variant="ghost"
                size="md"
                label="Retirer cet exercice"
                labelStyle={styles.removeText}
                onPress={() => {
                  haptic.warning();
                  onRemove();
                  close();
                }}
                style={styles.removeLink}
              />
            </View>
          )}
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 18,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: fonts.monoRegular,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 3,
  },

  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  cellWrap: {
    flex: 1,
  },
  cell: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  cellLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 6,
  },
  cellLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.40)',
  },
  cellValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  cellValue: {
    fontFamily: fonts.monoBold,
    fontSize: 17,
    color: '#FFFFFF',
  },
  cellUnit: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    marginLeft: 2,
  },

  sectionLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 18,
    marginBottom: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  typeCell: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  typeCellText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.55)',
  },
  timerParamsGrid: {
    marginTop: 10,
  },

  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  editLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.55)',
  },

  // Placement seulement : le rendu des boutons vient de Button
  // (lib/buttonTokens.js).
  cta: {
    marginTop: 20,
  },
  removeLink: {
    marginTop: 4,
  },
  removeText: {
    color: DANGER,
  },
});
