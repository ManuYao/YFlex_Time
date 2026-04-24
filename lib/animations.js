import { withTiming, Easing } from 'react-native-reanimated';

export const springEnergetic = {
  damping: 22,
  stiffness: 380,
  mass: 1,
};

export const springBouncy = {
  damping: 18,
  stiffness: 500,
  mass: 1,
};

export const easeImpact = Easing.bezier(0.22, 1, 0.36, 1);
export const easeForward = Easing.bezier(0.22, 1.3, 0.36, 1);

export const timingImpact = (toValue, duration = 500) =>
  withTiming(toValue, { duration, easing: easeImpact });
