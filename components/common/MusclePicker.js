import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import BodyMap from './BodyMap';
import PressTap from './PressTap';
import { fonts } from '../../lib/fonts';
import { categoryChip, getCategory } from '../../lib/exercises';

/**
 * Choix des muscles d'un nouveau bloc du planning : le corps de face et de dos
 * côte à côte (toucher une zone allume tout son groupe), une ligne qui dit ce
 * qui est choisi, puis les groupes qui ne sont pas des muscles (Cardio, groupes
 * perso) en pastilles. `selected` = ids de groupes dans l'ordre où ils ont été
 * touchés, `onToggle(id)` ajoute ou retire (la vibration est dans l'appelant).
 */
export default function MusclePicker({ bodyHeight, selected, onToggle, others = [] }) {
  return (
    <View>
      <View style={styles.figures}>
        <View style={styles.figure}>
          <BodyMap side="front" height={bodyHeight} selected={selected} onToggle={onToggle} />
          <Text style={styles.sideLabel}>FACE</Text>
        </View>
        <View style={styles.figure}>
          <BodyMap side="back" height={bodyHeight} selected={selected} onToggle={onToggle} />
          <Text style={styles.sideLabel}>DOS</Text>
        </View>
      </View>

      <Text style={styles.caption} numberOfLines={2}>
        {selected.length === 0 ? (
          <Text style={styles.hint}>Touche les muscles que tu veux travailler</Text>
        ) : (
          selected.map((id, i) => (
            <Text key={id}>
              {i > 0 && <Text style={styles.hint}>{'  ·  '}</Text>}
              <Text style={{ color: getCategory(id).text }}>{getCategory(id).label}</Text>
            </Text>
          ))
        )}
      </Text>

      {others.length > 0 && (
        <View style={styles.others}>
          {others.map((c) => {
            const on = selected.includes(c.id);
            const chip = categoryChip(c.id);
            return (
              <PressTap
                key={c.id}
                onPress={() => onToggle(c.id)}
                tapScale={0.94}
                style={[
                  styles.chip,
                  on && { backgroundColor: chip.bg, borderColor: chip.border },
                ]}
              >
                <Text style={[styles.chipText, on && { color: chip.text }]}>{c.label}</Text>
              </PressTap>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  figures: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
  },
  figure: {
    alignItems: 'center',
  },
  sideLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.32)',
    marginTop: 6,
  },
  caption: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 12,
    minHeight: 16,
  },
  hint: {
    fontFamily: fonts.sansMedium,
    letterSpacing: 0,
    color: 'rgba(255,255,255,0.40)',
  },
  others: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.60)',
  },
});
