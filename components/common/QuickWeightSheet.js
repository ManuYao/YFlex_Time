import { memo, useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import BottomSheet from './BottomSheet';
import WheelPicker from './WheelPicker';
import Button from './Button';
import LoadAdviceCard from './LoadAdviceCard';
import PressTap from './PressTap';
import AppIcon from './AppIcon';
import { fonts } from '../../lib/fonts';
import { useHaptic } from '../../hooks/useHaptic';

const isHalf = (w) => Number.isFinite(w) && Math.abs(w - Math.floor(w) - 0.5) < 0.001;

// Le tableau des valeurs est créé UNE fois pour toute l'app (et non à chaque
// ouverture de la feuille).
const WEIGHT_VALUES = Array.from({ length: 201 }, (_, i) => i);

/**
 * Charge saisie PENDANT la séance (MIX lancé depuis le Planning) : même roue
 * que la fiche d'un exercice, mais seule. Le chrono continue de tourner
 * derrière ; fermer sans valider ne change rien.
 */
function QuickWeightSheetBase({ screenH, kicker = 'CHARGE', label, initial, color = '#FFFFFF', advice = null, onSave, onClose }) {
  const haptic = useHaptic();
  const values = WEIGHT_VALUES;
  // La charge choisie n'est lue qu'au « OK » : une ref, pas un état. Un état
  // redessinait toute la feuille à CHAQUE cran de la roue (et la séance, derrière,
  // se redessine déjà 10 fois par seconde : le tout ramait de plus en plus).
  const kgRef = useRef(Number.isFinite(initial) ? Math.floor(initial) : 20);
  const [half, setHalf] = useState(isHalf(initial));
  // « PDC » (poids de corps) = 0 kg. L'état ne change que lorsque la roue arrive
  // sur 0 ou le quitte (React ignore un setState de même valeur) : pas de
  // redessin à chaque cran. `wheelNonce` remonte la roue, qui ne lit sa valeur
  // qu'au montage, pour la faire sauter sur 0.
  const [pdc, setPdc] = useState(initial === 0);
  const [wheelNonce, setWheelNonce] = useState(0);
  // Callbacks du parent (recréés à chaque rendu de la séance) lus par ref : la
  // feuille ne dépend plus de leur identité.
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closeStable = useCallback(() => onCloseRef.current?.(), []);
  const handleWheel = useCallback((v) => {
    kgRef.current = v;
    setPdc(v === 0);
  }, []);
  const pickBodyWeight = useCallback(() => {
    kgRef.current = 0;
    setHalf(false);
    setPdc(true);
    setWheelNonce((n) => n + 1);
  }, []);
  const isPdc = pdc && !half;

  return (
    <BottomSheet screenH={screenH} onClose={closeStable} zIndex={140}>
      {({ close }) => (
        <View>
          <Text style={styles.kicker}>{kicker}</Text>
          <Text style={styles.title} numberOfLines={1}>{label}</Text>
          {/* Conseil « tu peux monter » (Premium, lib/loadAdviceShape.js) : appliquer enregistre et ferme. */}
          <LoadAdviceCard
            advice={advice}
            color={color}
            onApply={(w) => {
              onSaveRef.current?.(w);
              close();
            }}
          />
          <WheelPicker
            key={wheelNonce}
            values={values}
            selectedValue={kgRef.current}
            type="weight"
            accentColor={color}
            onChange={handleWheel}
            visibleItems={3}
          />
          <View style={styles.quickRow}>
            <PressTap
              tapScale={0.97}
              onHapticIn={haptic.selection}
              onPress={() => setHalf((h) => !h)}
              accessibilityLabel="Ajouter 0,5 kilo"
              style={[styles.halfBtn, half && { borderColor: color, backgroundColor: `${color}26` }]}
            >
              <AppIcon name={half ? 'check' : 'plus'} size={14} color={half ? color : 'rgba(255,255,255,0.7)'} />
              <Text style={[styles.halfText, half && { color: '#FFFFFF' }]}>0,5 kg</Text>
            </PressTap>
            {/* PDC (poids de corps) : saute à 0 kg sans faire défiler la roue. */}
            <PressTap
              tapScale={0.97}
              onHapticIn={haptic.selection}
              onPress={pickBodyWeight}
              accessibilityLabel="Poids de corps, sans charge"
              style={[styles.halfBtn, isPdc && { borderColor: color, backgroundColor: `${color}26` }]}
            >
              {isPdc && <AppIcon name="check" size={14} color={color} />}
              <Text style={[styles.halfText, isPdc && { color: '#FFFFFF' }]}>PDC</Text>
            </PressTap>
          </View>
          <Button
            variant="solid"
            fullWidth
            label="OK"
            haptic={haptic.medium}
            onPress={() => {
              onSaveRef.current?.(kgRef.current + (half ? 0.5 : 0));
              close();
            }}
            style={styles.cta}
          />
        </View>
      )}
    </BottomSheet>
  );
}

// Ne se redessine que si ce qu'elle AFFICHE change (pas à chaque tick du chrono).
export default memo(
  QuickWeightSheetBase,
  (a, b) =>
    a.screenH === b.screenH && a.kicker === b.kicker && a.label === b.label && a.initial === b.initial && a.color === b.color && a.advice === b.advice
);

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  title: { fontFamily: fonts.sansExtraBold, fontSize: 20, color: '#FFFFFF', textAlign: 'center', marginTop: 4, marginBottom: 8 },
  quickRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 8 },
  halfBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  halfText: { fontFamily: fonts.sansBold, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  cta: { marginTop: 16 },
});
