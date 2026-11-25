/**
 * ColorOS 17–inspired continuous, interruptible 60fps fluid motion tokens.
 * Zero "hold-go" pauses: tapping mid-animation redirects smoothly on GPU-composited
 * transform + opacity layers without waiting for exit completion.
 */

export const FLUID_SPRING = {
  type: 'spring' as const,
  stiffness: 360,
  damping: 32,
  mass: 0.75,
};

export const FLUID_GLIDE = {
  duration: 0.34,
  ease: [0.16, 1, 0.3, 1] as const,
};

export const FLUID_HOVER = {
  y: -2,
  scale: 1.02,
};

export const FLUID_TAP = {
  scale: 0.97,
};

export const FLUID_PANEL_TRANSITION = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: FLUID_GLIDE,
};

export const FLUID_MODAL_TRANSITION = {
  initial: { opacity: 0, scale: 0.97, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 6 },
  transition: FLUID_SPRING,
};

export const FLUID_DRAWER_RIGHT_TRANSITION = {
  initial: { x: '100%', opacity: 0.9 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0.9 },
  transition: FLUID_GLIDE,
};
