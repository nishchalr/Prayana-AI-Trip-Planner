/**
 * ColorOS 17 / iOS 18-inspired continuous, interruptible 60fps fluid motion tokens.
 *
 * Zero "hold-go" pauses: tapping mid-animation redirects smoothly on GPU-composited
 * transform + opacity layers. Use `willChange: 'transform, opacity'` on motion elements
 * and `AnimatePresence mode="popLayout"` for zero-layout-thrash exits.
 *
 * Rules:
 *  • No `transition-all` — always animate only transform + opacity via framer-motion.
 *  • All interactive primitives use FLUID_GESTURE_TAP for press feedback.
 *  • Drawers/modals use FLUID_DRAWER_RIGHT_TRANSITION / FLUID_MODAL_TRANSITION.
 *  • Carousel/tab switches use FLUID_CAROUSEL_SPRING with AnimatePresence popLayout.
 */

/** Default spring for popovers, pills, nav buttons */
export const FLUID_SPRING = {
  type: 'spring' as const,
  stiffness: 360,
  damping: 32,
  mass: 0.75,
};

/** iOS 18 Dynamic Island morph spring — nav pills, cards, drawers, book-spine shelves */
export const FLUID_ISLAND_SPRING = {
  type: 'spring' as const,
  stiffness: 360,
  damping: 26,
  mass: 0.85,
};

/**
 * Tap / press feedback — spread onto motion elements alongside whileTap.
 * Applies scale: 0.96, scaleY: 0.94 on press (iOS rubber-sheet feel).
 */
export const FLUID_GESTURE_TAP = {
  whileTap: { scale: 0.96, scaleY: 0.94 },
  whileHover: { scale: 1.025 },
};

/** Carousel / destination switcher spring — smooth cross-fade between titles */
export const FLUID_CAROUSEL_SPRING = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 24,
  mass: 0.9,
};

/** Smooth eased glide — used for view-level transitions (opacity + y) */
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

/** View-level panel enter/exit transition props (spread directly onto motion.div) */
export const FLUID_PANEL_TRANSITION = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: FLUID_GLIDE,
};

/** Modal overlay enter/exit */
export const FLUID_MODAL_TRANSITION = {
  initial: { opacity: 0, scale: 0.97, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 6 },
  transition: FLUID_SPRING,
};

/** Right-edge slide-in drawer (CopilotDrawer, VitalsDrawer) */
export const FLUID_DRAWER_RIGHT_TRANSITION = {
  initial: { x: '100%', opacity: 0.9 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0.9 },
  transition: FLUID_GLIDE,
};
