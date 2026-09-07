// Cubic-bezier equivalents of GSAP's Penner "power" eases (the standard
// easings.net approximations), kept in one place so every animation moved
// off GSAP keeps the same curve.
export const POWER1_IN = [0.55, 0.09, 0.68, 0.53] as const;
export const POWER1_OUT = [0.25, 0.46, 0.45, 0.94] as const;
export const POWER2_IN = [0.55, 0.055, 0.675, 0.19] as const;
export const POWER2_OUT = [0.215, 0.61, 0.355, 1] as const;
export const POWER3_IN = [0.895, 0.03, 0.685, 0.22] as const;
export const POWER3_OUT = [0.165, 0.84, 0.44, 1] as const;
export const POWER4_OUT = [0.23, 1, 0.32, 1] as const;

// GSAP's elastic.out(1, 0.8) overshoots and settles — no bezier reproduces
// that, so a tuned spring transition stands in for it.
export const ELASTIC_OUT_SPRING = {
  type: "spring",
  stiffness: 280,
  damping: 18,
  mass: 0.9,
} as const;
