import { memo, useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import PressTap from './PressTap';
import AppIcon from './AppIcon';
import Button from './Button';
import { fonts } from '../../lib/fonts';
import { useHaptic } from '../../hooks/useHaptic';

/**
 * « Ma séance » — la liste des exercices du MIX en cours, ouverte par un appui long sur
 * l'anneau central PENDANT UN REPOS (salle bondée : la machine suivante est prise).
 *
 *  - validés : cochés, grisés, verrouillés ;
 *  - en cours / prochain : surlignés ;
 *  - à venir : on tape un exercice → « Faire maintenant » ou « Reporter à la fin ».
 * Hors repos, la feuille est en lecture seule (on ne réorganise jamais en plein effort).
 * Le chrono continue de tourner derrière ; la feuille reste ouverte après un déplacement
 * (on peut en enchaîner plusieurs).
 */
function MixSessionSheetBase({ screenH, rows, canReorder, restText, color = '#FFFFFF', onMove, onClose }) {
  const haptic = useHaptic();
  const [openId, setOpenId] = useState(null);
  // Callbacks du parent (recréés à chaque rendu de la séance) lus par ref.
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closeStable = useCallback(() => onCloseRef.current?.(), []);

  const todoCount = rows.filter((r) => r.status === 'todo').length;
  const move = (id, where) => {
    onMoveRef.current?.(id, where);
    setOpenId(null);
  };

  return (
    <BottomSheet screenH={screenH} onClose={closeStable} zIndex={140} keyboardAware>
      {() => (
        <View>
          <Text style={styles.kicker}>MA SÉANCE</Text>
          <Text style={styles.title}>
            {canReorder ? 'Machine prise ? Change l’ordre' : 'Tes exercices'}
          </Text>
          <Text style={styles.sub}>
            {canReorder
              ? `Repos ${restText} · touche un exercice à venir`
              : 'On change l’ordre pendant un repos, jamais en plein effort.'}
          </Text>

          <View style={styles.list}>
            {rows.map((r) => {
              const done = r.status === 'done';
              const current = r.status === 'current';
              const todo = r.status === 'todo';
              const editable = todo && canReorder && todoCount > 1;
              const open = editable && openId === r.id;
              const highlighted = current || r.isNext;
              return (
                <View
                  key={r.id}
                  style={[
                    styles.row,
                    highlighted && { borderColor: color, backgroundColor: `${color}1F` },
                    done && styles.rowDone,
                  ]}
                >
                  <PressTap
                    disabled={!editable}
                    tapScale={0.98}
                    onHapticIn={haptic.light}
                    onPress={() => setOpenId((cur) => (cur === r.id ? null : r.id))}
                    accessibilityLabel={`${r.name}${editable ? ', modifier la place' : ''}`}
                    style={styles.rowMain}
                  >
                    <View style={[styles.badge, done && styles.badgeDone, highlighted && { backgroundColor: color }]}>
                      {done ? (
                        <AppIcon name="check" size={14} color="rgba(255,255,255,0.55)" />
                      ) : (
                        <Text style={[styles.badgeText, highlighted && styles.badgeTextOn]}>{r.n}</Text>
                      )}
                    </View>
                    <View style={styles.rowText}>
                      <Text style={[styles.name, done && styles.nameDone]} numberOfLines={1}>
                        {r.name}
                      </Text>
                      {!!r.meta && (
                        <Text style={[styles.meta, done && styles.metaDone]} numberOfLines={1}>
                          {r.meta}
                        </Text>
                      )}
                    </View>
                    {done && <Text style={styles.tag}>FAIT</Text>}
                    {current && <Text style={[styles.tag, { color }]}>EN COURS</Text>}
                    {r.isNext && <Text style={[styles.tag, { color }]}>PROCHAIN</Text>}
                    {todo && !r.isNext && !canReorder && (
                      <AppIcon name="lock" size={14} color="rgba(255,255,255,0.3)" />
                    )}
                  </PressTap>

                  {open && (
                    <View style={styles.actions}>
                      <Button
                        variant="solid"
                        size="sm"
                        fullWidth
                        label="Faire maintenant"
                        disabled={r.isNext}
                        haptic={haptic.medium}
                        onPress={() => move(r.id, 'now')}
                      />
                      <Button
                        variant="glass"
                        size="sm"
                        fullWidth
                        label="Reporter à la fin"
                        disabled={r.lastTodo}
                        haptic={haptic.light}
                        onPress={() => move(r.id, 'end')}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const sameRows = (a, b) =>
  a.length === b.length &&
  a.every(
    (r, i) =>
      r.id === b[i].id &&
      r.status === b[i].status &&
      r.isNext === b[i].isNext &&
      r.lastTodo === b[i].lastTodo &&
      r.name === b[i].name &&
      r.meta === b[i].meta
  );

// Ne se redessine que si ce qu'elle AFFICHE change (la séance, derrière, tourne à 10 Hz).
export default memo(
  MixSessionSheetBase,
  (a, b) =>
    a.screenH === b.screenH &&
    a.color === b.color &&
    a.canReorder === b.canReorder &&
    a.restText === b.restText &&
    sameRows(a.rows, b.rows)
);

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  title: { fontFamily: fonts.sansExtraBold, fontSize: 20, color: '#FFFFFF', textAlign: 'center', marginTop: 4 },
  sub: { fontFamily: fonts.sansMedium, fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 4, marginBottom: 14 },
  list: { gap: 8 },
  row: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  rowDone: { opacity: 0.55 },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 11 },
  rowText: { flex: 1 },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  badgeDone: { backgroundColor: 'rgba(255,255,255,0.08)' },
  badgeText: { fontFamily: fonts.sansBold, fontSize: 13, color: '#FFFFFF' },
  badgeTextOn: { color: '#0A0A0A' },
  name: { fontFamily: fonts.sansBold, fontSize: 16, color: '#FFFFFF' },
  nameDone: { color: 'rgba(255,255,255,0.7)' },
  meta: { fontFamily: fonts.sansMedium, fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 1, letterSpacing: 0.5 },
  metaDone: { color: 'rgba(255,255,255,0.4)' },
  tag: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,0.45)' },
  actions: { gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
});
