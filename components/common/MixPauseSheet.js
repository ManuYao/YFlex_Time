import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import Button from './Button';
import AppIcon from './AppIcon';
import { getMixTotalDuration, hasEstimatedDuration } from '../../lib/mix-blocks';
import { formatMixClock } from '../../lib/formatters';
import { cleanMixColor } from '../../lib/mixMeta';
import { fonts } from '../../lib/fonts';
import { PAIR_GAP } from '../../lib/buttonTokens';
import { haptic } from '../../hooks/useHaptic';

const TITLES = {
  creation: 'Mes créations',
  download: 'Sauvegardés',
};

/**
 * « Choisis tes mix actifs » : en gratuit la bibliothèque est limitée (3 créés,
 * 5 sauvegardés). Quand elle dépasse (fin de Premium), la personne choisit ceux
 * qu'elle garde ACTIFS ; les autres passent EN PAUSE : ils restent sur le
 * téléphone, rien n'est supprimé, et ils reviennent tous si elle repasse Pro.
 *
 * `groups` = lib/libraryLimits.js reviewNeeded() : `{ kind, limit, candidates,
 * kept }` par classe qui dépasse. `onConfirm(kinds, keepIds)` pose le choix.
 * Zéro à choisir au-delà de la limite : le bouton n'est actif que quand chaque
 * volet a exactement `limit` mix cochés.
 */
export default function MixPauseSheet({ screenH, groups, onConfirm, onClose }) {
  const [kept, setKept] = useState(() => new Set(groups.flatMap((g) => g.kept)));

  const toggle = (group, id) => {
    const isOn = kept.has(id);
    const count = group.candidates.filter((m) => kept.has(m.id)).length;
    if (!isOn && count >= group.limit) {
      // Complet : on dit qu'il faut d'abord en décocher un.
      haptic.warning();
      return;
    }
    haptic.light();
    setKept((prev) => {
      const next = new Set(prev);
      if (isOn) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const counts = groups.map((g) => g.candidates.filter((m) => kept.has(m.id)).length);
  const ready = groups.every((g, i) => counts[i] === g.limit);

  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={130}>
      {({ close }) => (
        <View>
          <Text style={styles.kicker}>BIBLIOTHÈQUE GRATUITE</Text>
          <Text style={styles.title}>Choisis tes mix actifs</Text>
          <Text style={styles.body}>
            Sans Pro, tu gardes {groups.map((g) => `${g.limit} ${g.kind === 'creation' ? 'mix créés' : 'mix sauvegardés'}`).join(' et ')}{' '}
            d'actifs. Les autres ne sont pas supprimés : ils attendent en pause sur ton téléphone et
            reviennent tous si tu repasses en Pro.
          </Text>

          {groups.map((g, gi) => (
            <View key={g.kind} style={styles.group}>
              <Text style={styles.groupTitle}>
                {TITLES[g.kind]} · {counts[gi]} / {g.limit} gardés
              </Text>
              <View style={styles.list}>
                {g.candidates.map((m) => {
                  const on = kept.has(m.id);
                  const color = cleanMixColor(m.color);
                  const total = getMixTotalDuration(m.blocks || []);
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => toggle(g, m.id)}
                      style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && { opacity: 0.75 }]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                    >
                      {!!color && <View pointerEvents="none" style={[styles.colorBar, { backgroundColor: color }]} />}
                      <View style={[styles.check, on && styles.checkOn]}>
                        {on && <AppIcon name="check" size={12} color="#0A0A0A" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name} numberOfLines={1}>
                          {m.name}
                        </Text>
                        <Text style={styles.meta} numberOfLines={1}>
                          {m.blocks?.length || 0} blocs · {hasEstimatedDuration(m.blocks) ? '~' : ''}
                          {formatMixClock(total)}
                          {on ? '' : ' · en pause'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <Text style={styles.foot}>Tu pourras en échanger quand tu veux depuis « Mes mix ».</Text>

          <View style={styles.actions}>
            <Button variant="glass" label="Plus tard" haptic={haptic.light} onPress={close} />
            <Button
              variant="solid"
              label="Garder ces mix"
              disabled={!ready}
              haptic={haptic.medium}
              onPress={() => {
                onConfirm(
                  groups.map((g) => g.kind),
                  [...kept]
                );
                close();
              }}
              style={styles.confirm}
            />
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
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
  body: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 10,
  },
  group: {
    marginTop: 18,
  },
  groupTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2.4,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  rowOn: {
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  colorBar: {
    position: 'absolute',
    left: 6,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  name: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  meta: {
    fontFamily: fonts.monoRegular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  foot: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PAIR_GAP,
    marginTop: 18,
  },
  confirm: {
    flex: 1,
  },
});
