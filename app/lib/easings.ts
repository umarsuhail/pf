export const POWER1_IN = [0.55, 0.09, 0.68, 0.53] as const;
export const POWER1_OUT = [0.25, 0.46, 0.45, 0.94] as const;
export const POWER2_IN = [0.55, 0.055, 0.675, 0.19] as const;
export const POWER2_OUT = [0.215, 0.61, 0.355, 1] as const;
export const POWER3_IN = [0.895, 0.03, 0.685, 0.22] as const;
export const POWER3_OUT = [0.165, 0.84, 0.44, 1] as const;
export const POWER4_OUT = [0.23, 1, 0.32, 1] as const;

export const BACK_OUT = [0.34, 1.56, 0.64, 1] as const;

export const ELASTIC_OUT_SPRING = {
  type: "spring",
  stiffness: 280,
  damping: 18,
  mass: 0.9,
} as const;
