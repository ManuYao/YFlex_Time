import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, BackHandler, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import AppIcon from '../common/AppIcon';
import Button from '../common/Button';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';

// Petit tour contextuel posé sur un VRAI écran (menu, accueil) : le fond
// s'assombrit, UNE zone reste éclairée avec sa bulle d'explication, un tap passe
// à la suivante. Rien n'est imposé : « Passer » (ou le retour Android) ferme
// tout. Le calque avale tous les appuis : rien de l'écran dessous ne se
// déclenche pendant le tour.
//
// Props:
// - steps         : [{ id, icon, title, text, radius? }] dans l'ordre d'affichage ;
//                   radius = coins de l'éclairage (nombre, ou 'full' = rond/pilule)
// - measureTarget : (id) => Promise<{ x, y, width, height } | null> — rectangle
//                   de la zone en coordonnées de FENÊTRE (null = zone absente,
//                   l'étape est sautée)
// - onDone        : appelé une seule fois avec { reason, index } :
//                   'done' (dernier « Compris »), 'skip' (« Passer », retour
//                   Android), 'more' (bouton `moreLabel` de la dernière bulle)
// - moreLabel     : si donné, la dernière bulle propose « Terminer » + ce libellé
//                   (la suite du tour) au lieu d'un simple « Compris »
// - onStepEnter   : (id) => void | Promise — appelé en arrivant sur une étape,
//                   AVANT la mesure de sa zone ; s'il renvoie une promesse, la
//                   mesure l'attend (ex. l'accueil remet le carrousel en place)

const PAD = 6; // marge de l'éclairage autour de la zone
const RADIUS = 28;
const BUBBLE_ROOM = 190; // place minimale pour poser la bulle sous la zone

// Un grand rectangle percé d'un rectangle arrondi (remplissage « evenodd »).
const holePath = (w, h, x, y, rw, rh, r) =>
  `M0 0H${w}V${h}H0Z` +
  `M${x + r} ${y}H${x + rw - r}A${r} ${r} 0 0 1 ${x + rw} ${y + r}V${y + rh - r}` +
  `A${r} ${r} 0 0 1 ${x + rw - r} ${y + rh}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + rh - r}` +
  `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;

export default function SpotlightTips({ steps, measureTarget, onDone, moreLabel = null, onStepEnter }) {
  const rootRef = useRef(null);
  const doneRef = useRef(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [box, setBox] = useState({ w: 0, h: 0, ox: 0, oy: 0 });
  const step = steps[i];
  const isLast = i === steps.length - 1;

  const indexRef = useRef(0);
  indexRef.current = i;

  const finish = useCallback(
    (reason) => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDone({ reason, index: indexRef.current });
    },
    [onDone]
  );

  // La fenêtre et le calque ne partent pas forcément du même point (barre
  // d'état) : on mesure le calque lui-même pour convertir les rectangles.
  const handleLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    rootRef.current?.measureInWindow?.((ox, oy) => setBox({ w: width, h: height, ox, oy }));
  }, []);

  // Une entrée à la fois : on mesure la nouvelle cible, pas avant.
  useEffect(() => {
    let cancelled = false;
    setRect(null);
    Promise.resolve(onStepEnter ? onStepEnter(step.id) : undefined)
      .then(() => (cancelled ? null : measureTarget(step.id)))
      .then((r) => {
        if (cancelled) return;
        if (r) setRect(r);
        // Zone absente (fenêtre réduite…) : on passe à la suivante, ou on
        // termine si c'était la dernière — jamais d'écran bloqué.
        else if (isLast) finish('done');
        else setI((v) => v + 1);
      });
    return () => {
      cancelled = true;
    };
  }, [step.id, measureTarget, onStepEnter, finish, isLast]);

  // Le retour Android ferme le tour (jamais d'écran piège).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      finish('skip');
      return true;
    });
    return () => sub.remove();
  }, [finish]);

  const next = () => {
    haptic.light();
    if (isLast) finish('done');
    else setI((v) => v + 1);
  };

  const more = () => {
    haptic.light();
    finish('more');
  };

  const skip = () => {
    haptic.light();
    finish('skip');
  };

  // Rectangle éclairé, en coordonnées du calque.
  const lit = rect
    ? {
        x: rect.x - box.ox - PAD,
        y: rect.y - box.oy - PAD,
        w: rect.width + PAD * 2,
        h: rect.height + PAD * 2,
      }
    : null;
  const ready = !!lit && box.w > 0;
  const below = ready ? box.h - (lit.y + lit.h) >= BUBBLE_ROOM : true;
  const caretX = ready ? Math.max(40, Math.min(box.w - 40, lit.x + lit.w / 2)) : 40;
  // Coins de l'éclairage : jamais plus que la moitié du plus petit côté.
  const radius = ready
    ? Math.min(
        step.radius === 'full' ? Infinity : step.radius ?? RADIUS,
        Math.min(lit.w, lit.h) / 2
      )
    : RADIUS;

  return (
    <View ref={rootRef} style={styles.root} onLayout={handleLayout} pointerEvents="auto">
      {/* Fond assombri, percé autour de la zone expliquée. */}
      {ready ? (
        <Animated.View key={`dim-${step.id}`} entering={FadeIn.duration(220)} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={box.w} height={box.h}>
            <Path
              d={holePath(box.w, box.h, lit.x, lit.y, lit.w, lit.h, radius)}
              fill="#000000"
              fillOpacity={0.78}
              fillRule="evenodd"
            />
          </Svg>
          <View
            style={[
              styles.ring,
              { left: lit.x, top: lit.y, width: lit.w, height: lit.h, borderRadius: radius },
            ]}
          />
        </Animated.View>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.flatDim]} pointerEvents="none" />
      )}

      {/* Un tap n'importe où = la bulle suivante. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={next}
        accessibilityRole="button"
        accessibilityLabel="Bulle suivante"
      />

      {ready ? (
        <Animated.View
          key={`bubble-${step.id}`}
          entering={FadeIn.delay(80).duration(260)}
          exiting={FadeOut.duration(120)}
          style={[
            styles.bubble,
            below ? { top: lit.y + lit.h + 14 } : { bottom: box.h - lit.y + 14 },
          ]}
        >
          <View
            pointerEvents="none"
            style={[
              styles.caret,
              below
                ? { top: -7, borderLeftWidth: 1, borderTopWidth: 1 }
                : { bottom: -7, borderRightWidth: 1, borderBottomWidth: 1 },
              { left: caretX - 20 - 7 },
            ]}
          />
          <View style={styles.head}>
            <View style={styles.iconWrap}>
              <AppIcon name={step.icon} size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {step.title}
            </Text>
            <Text style={styles.count}>
              {i + 1}/{steps.length}
            </Text>
          </View>
          <Text style={styles.text}>{step.text}</Text>
          <View style={styles.actions}>
            {!isLast ? (
              <Button variant="ghost" size="sm" label="Passer" onPress={skip} />
            ) : moreLabel ? (
              <Button variant="ghost" size="sm" label="Terminer" onPress={next} />
            ) : (
              <View />
            )}
            <Button
              variant="solid"
              size="sm"
              label={!isLast ? 'Suivant' : moreLabel ?? 'Compris'}
              icon={isLast && !moreLabel ? 'check' : 'arrow'}
              iconPosition={isLast && !moreLabel ? 'left' : 'right'}
              onPress={isLast && moreLabel ? more : next}
            />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Au-dessus de tout le menu (liste, boutons du haut).
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 50,
    elevation: 50,
  },
  flatDim: {
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  bubble: {
    position: 'absolute',
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#23232B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
  },
  caret: {
    position: 'absolute',
    width: 14,
    height: 14,
    backgroundColor: '#23232B',
    borderColor: 'rgba(255,255,255,0.22)',
    transform: [{ rotate: '45deg' }],
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: fonts.sansExtraBold,
    fontSize: 17,
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  count: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.55)',
  },
  text: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.86)',
    marginTop: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
});
