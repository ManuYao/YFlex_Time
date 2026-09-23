import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import BottomSheet from './BottomSheet';
import PressTap from './PressTap';
import WheelPicker from './WheelPicker';
import { fonts } from '../../lib/fonts';
import { getCategory } from '../../lib/exercises';
import { useLayoutLevel } from '../../lib/responsive';
import { haptic } from '../../hooks/useHaptic';

const range = (from, to, step) => {
  const out = [];
  for (let v = from; v <= to; v += step) out.push(Math.round(v * 10) / 10);
  return out;
};

const FIELDS = [
  { key: 'weight', label: 'CHARGE', unit: 'kg', pickerType: 'weight', fallback: 20 },
  { key: 'sets', label: 'SÉRIES', unit: '', pickerType: 'sets', fallback: 4 },
  { key: 'rest', label: 'REPOS', unit: 's', pickerType: 'seconds', fallback: 90 },
];

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
                <PressTap
                  onPress={() => {
                    haptic.light();
                    setEditing(null);
                  }}
                  tapScale={0.9}
                  style={styles.backBtn}
                  hitSlop={8}
                >
                  <Svg width={12} height={12} viewBox="0 0 14 14" fill="none">
                    <Path
                      d="M9 2L3 7l6 5"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </PressTap>
                <Text style={styles.editLabel}>{field.label}</Text>
              </View>

              <WheelPicker
                key={field.key}
                values={values[field.key]}
                selectedValue={draft[field.key] ?? field.fallback}
                type={field.pickerType}
                accentColor={category.color}
                onChange={(v) => setDraft((prev) => ({ ...prev, [field.key]: v }))}
                visibleItems={wheelItems}
              />

              <PressTap
                onPress={() => {
                  haptic.medium();
                  setEditing(null);
                }}
                tapScale={0.97}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>OK</Text>
              </PressTap>
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
                      setDraft((prev) =>
                        prev[f.key] == null ? { ...prev, [f.key]: f.fallback } : prev
                      );
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
                    <View style={styles.cellValueRow}>
                      <Text style={styles.cellValue}>
                        {draft[f.key] == null ? '—' : String(draft[f.key])}
                      </Text>
                      {!!f.unit && draft[f.key] != null && (
                        <Text style={[styles.cellUnit, { color: category.color }]}>
                          {f.unit}
                        </Text>
                      )}
                    </View>
                  </PressTap>
                  </View>
                ))}
              </View>

              <PressTap
                onPress={() => {
                  haptic.medium();
                  onSave(draft);
                  close();
                }}
                tapScale={0.97}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>ENREGISTRER</Text>
              </PressTap>

              <PressTap
                onPress={() => {
                  haptic.warning();
                  onRemove();
                  close();
                }}
                tapScale={0.97}
                style={styles.removeBtn}
              >
                <Text style={styles.removeText}>Retirer cet exercice</Text>
              </PressTap>
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

  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.55)',
  },

  cta: {
    marginTop: 20,
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
  removeBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  removeText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 12.5,
    color: '#FF5454',
  },
});
