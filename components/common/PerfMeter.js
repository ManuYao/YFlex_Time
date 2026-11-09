import { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';
import { useFrameCallback, useSharedValue, runOnJS } from 'react-native-reanimated';

import { SLOW_FRAME_MS } from '../../lib/memoryProbeShape';
import { reportPerf } from '../../lib/memoryProbe';

/**
 * Mesure de fluidité (monté UNIQUEMENT par le compteur flottant, donc rien ne
 * tourne quand le compteur est coupé). Ne dessine rien.
 *  - côté ÉCRAN (fil d'interface) : durée de chaque image, par `useFrameCallback` ;
 *  - côté CODE (fil JavaScript) : retard d'un minuteur de 100 ms (= gel du code).
 * Une mesure par seconde est envoyée à lib/memoryProbe.js (reportPerf).
 */
export default function PerfMeter() {
  const path = usePathname();
  const pathRef = useRef(path);
  pathRef.current = path;
  const stallRef = useRef(0);

  const n = useSharedValue(0);
  const worst = useSharedValue(0);
  const slow = useSharedValue(0);
  const t0 = useSharedValue(0);

  // Appelé depuis le fil d'interface, une fois par seconde.
  const onFrames = useRef((fps, worstFrame, slowFrames) => {
    const stall = stallRef.current;
    stallRef.current = 0;
    reportPerf({ fps, worstFrame, slowFrames, stall }, pathRef.current);
  }).current;

  useFrameCallback((info) => {
    'worklet';
    const dt = info.timeSincePreviousFrame;
    if (dt == null) {
      t0.value = info.timestamp;
      return;
    }
    n.value += 1;
    if (dt > worst.value) worst.value = dt;
    if (dt > SLOW_FRAME_MS) slow.value += 1;
    const span = info.timestamp - t0.value;
    if (span >= 1000) {
      runOnJS(onFrames)((n.value * 1000) / span, worst.value, slow.value);
      n.value = 0;
      worst.value = 0;
      slow.value = 0;
      t0.value = info.timestamp;
    }
  });

  useEffect(() => {
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const drift = now - last - 100;
      last = now;
      if (drift > stallRef.current) stallRef.current = drift;
    }, 100);
    return () => clearInterval(id);
  }, []);

  return null;
}
