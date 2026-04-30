import { withTiming, withSpring, Easing, FadeIn, FadeOut } from 'react-native-reanimated';

// ──────────────────────────────────────────────────────────────────
// Springs (mirror Framer Motion presets utilisés dans les maquettes)
// ──────────────────────────────────────────────────────────────────
export const spring = {
  damping: 22,
  stiffness: 380,
  mass: 1,
};

export const springEnergetic = spring;

export const springBouncy = {
  damping: 18,
  stiffness: 500,
  mass: 1,
};

export const springSheet = {
  damping: 30,
  stiffness: 320,
  mass: 1,
};

// ──────────────────────────────────────────────────────────────────
// Easings
// ──────────────────────────────────────────────────────────────────
export const easeImpact = Easing.bezier(0.22, 1, 0.36, 1);
export const easeOvershoot = Easing.bezier(0.22, 1.3, 0.36, 1);
export const easeOutCubic = Easing.out(Easing.cubic);
export const easeInOut = Easing.inOut(Easing.ease);

// ──────────────────────────────────────────────────────────────────
// Durations canoniques (ms)
// ──────────────────────────────────────────────────────────────────
export const D = {
  fast: 200,
  base: 300,
  medium: 350,
  big: 400,
  slow: 500,
  loop: 700,
  morph: 900,
  breath: 3500,
};

// ──────────────────────────────────────────────────────────────────
// Helpers d'entrée/sortie (Reanimated v3 layout transitions)
// Reproduit les patterns Framer initial/animate/exit des maquettes.
// ──────────────────────────────────────────────────────────────────

// initial { y: distance, opacity: 0 } → animate { y: 0, opacity: 1 }
export const slideInY = (distance = 20, duration = D.slow, delay = 0) =>
  FadeIn.duration(duration)
    .delay(delay)
    .easing(easeImpact)
    .withInitialValues({ transform: [{ translateY: distance }] });

export const slideOutY = (distance = -20, duration = D.base) =>
  FadeOut.duration(duration)
    .easing(easeImpact)
    .withInitialValues({ transform: [{ translateY: 0 }] })
    .withCallback(() => {});

// initial { x: distance, opacity: 0 } → animate { x: 0, opacity: 1 }
export const slideInX = (distance = -20, duration = D.slow, delay = 0) =>
  FadeIn.duration(duration)
    .delay(delay)
    .easing(easeImpact)
    .withInitialValues({ transform: [{ translateX: distance }] });

// initial { scale: from, opacity: 0 } → animate { scale: 1, opacity: 1 }
// (substitue le filter:blur via un scale plus prononcé)
export const popIn = (fromScale = 0.4, duration = D.big, delay = 0) =>
  FadeIn.duration(duration)
    .delay(delay)
    .easing(easeOvershoot)
    .withInitialValues({ transform: [{ scale: fromScale }] });

export const popOut = (toScale = 1.4, duration = D.base) =>
  FadeOut.duration(duration)
    .easing(easeImpact)
    .withInitialValues({ transform: [{ scale: 1 }] });

// ──────────────────────────────────────────────────────────────────
// Helpers de tap feedback (whileTap maquette)
// ──────────────────────────────────────────────────────────────────
export const pressDown = (scale = 0.96) =>
  withSpring(scale, springEnergetic);

export const pressUp = () => withSpring(1, springEnergetic);
