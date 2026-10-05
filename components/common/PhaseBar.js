import { View, StyleSheet } from 'react-native';

// Déroulé d'un timer en barre de segments (voir getTimerBar, lib/timers-config).
// `active` / `inactive` = couleurs de la carte (tokens) ; un segment qui porte
// sa propre couleur (bloc de MIX) la garde, en plus discret pour un repos.
export default function PhaseBar({ segments, active, inactive, height = 8 }) {
  if (!segments || segments.length === 0) return null;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      {segments.map((seg, i) => (
        <View
          key={i}
          style={{
            flex: seg.weight,
            minWidth: height,
            borderRadius: height / 2,
            backgroundColor: seg.color || (seg.kind === 'rest' ? inactive : active),
            opacity: seg.color && seg.kind === 'rest' ? 0.35 : 1,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 3,
    width: '100%',
    maxWidth: 320,
    overflow: 'hidden',
  },
});
