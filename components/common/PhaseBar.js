import { View, StyleSheet } from 'react-native';

// Déroulé d'un timer en capsules arrondies (voir getTimerBar, lib/timers-config) :
// un segment par phase, large comme sa durée. L'effort est une capsule pleine,
// le repos une petite capsule éteinte. Uniquement les couleurs de la carte
// (`active` / `inactive`), pour rester dans la DA.
const WORK_H = 6;
const REST_H = 3;
// Au-delà de ce nombre de phases (MIX de 20 exercices et leurs repos), on
// resserre pour que la barre tienne dans la largeur de la carte.
const DENSE_FROM = 14;

// Accueil : segments { kind, weight }. Séance : segments { kind, weight, status }
// avec `done` en plus — la phase en cours est pleine et plus haute, les phases
// déjà faites en retrait (`done`), les suivantes éteintes (`inactive`).
export default function PhaseBar({ segments, active, inactive, done }) {
  if (!segments || segments.length === 0) return <View style={styles.slot} />;
  const dense = segments.length > DENSE_FROM;
  return (
    <View style={[styles.slot, { gap: dense ? 2 : 4 }]}>
      {segments.map((seg, i) => {
        const rest = seg.kind === 'rest';
        const current = seg.status === 'current';
        const h = current ? WORK_H + 2 : rest ? REST_H : WORK_H;
        let color = rest ? inactive : active;
        if (seg.status === 'current') color = active;
        else if (seg.status === 'done') color = done || inactive;
        else if (seg.status === 'todo') color = inactive;
        return (
          <View
            key={i}
            style={{
              flex: seg.weight,
              minWidth: dense ? (rest ? 2 : 3) : 6,
              height: h,
              borderRadius: h / 2,
              backgroundColor: color,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: 28,
    width: '100%',
    maxWidth: 230,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
