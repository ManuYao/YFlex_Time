import { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import WheelPicker from './WheelPicker';
import Button from './Button';
import PressTap from './PressTap';
import AppIcon from './AppIcon';
import { fonts } from '../../lib/fonts';
import { useHaptic } from '../../hooks/useHaptic';

const isHalf = (w) => Number.isFinite(w) && Math.abs(w - Math.floor(w) - 0.5) < 0.001;

/**
 * Charge saisie PENDANT la séance (MIX lancé depuis le Planning) : même roue
 * que la fiche d'un exercice, mais seule. Le chrono continue de tourner
 * derrière ; fermer sans valider ne change rien.
 */
export default function QuickWeightSheet({ screenH, label, initial, color = '#FFFFFF', onSave, onClose }) {
  const haptic = useHaptic();
  const values = useMemo(() => Array.from({ length: 201 }, (_, i) => i), []);
  const [kg, setKg] = useState(Number.isFinite(initial) ? Math.floor(initial) : 20);
  const [half, setHalf] = useState(isHalf(initial));

  return (
    <BottomSheet screenH={screenH} onClose={onClose} zIndex={140}>
      {({ close }) => (
        <View>
          <Text style={styles.kicker}>CHARGE</Text>
          <Text style={styles.title} numberOfLines={1}>{label}</Text>
          <WheelPicker
            values={values}
            selectedValue={kg}
            type="weight"
            accentColor={color}
            onChange={setKg}
            visibleItems={3}
          />
          <PressTap
            tapScale={0.97}
            onHapticIn={haptic.selection}
            onPress={() => setHalf((h) => !h)}
            accessibilityLabel="Ajouter 0,5 kilo"
            containerStyle={styles.halfWrap}
            style={[styles.halfBtn, half && { borderColor: color, backgroundColor: `${color}26` }]}
          >
            <AppIcon name={half ? 'check' : 'plus'} size={14} color={half ? color : 'rgba(255,255,255,0.7)'} />
            <Text style={[styles.halfText, half && { color: '#FFFFFF' }]}>0,5 kg</Text>
          </PressTap>
          <Button
            variant="solid"
            fullWidth
            label="OK"
            haptic={haptic.medium}
            onPress={() => {
              onSave(kg + (half ? 0.5 : 0));
              close();
            }}
            style={styles.cta}
          />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  title: { fontFamily: fonts.sansExtraBold, fontSize: 20, color: '#FFFFFF', textAlign: 'center', marginTop: 4, marginBottom: 8 },
  halfWrap: { alignSelf: 'center', marginTop: 8 },
  halfBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  halfText: { fontFamily: fonts.sansBold, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  cta: { marginTop: 16 },
});
