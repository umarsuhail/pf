export const CSS_PERSPECTIVE_Z = 1100;

export const CAMERA_TRAVEL = { mobile: 23400, desktop: 25200 } as const;

export const CARD_READING_DEPTH = 80;

export const CARD_PASS_THROUGH_Z = CSS_PERSPECTIVE_Z * 0.82;

export const CARD_DEPART_NEAR_Z = 340;

export const PARKED_OPACITY = 0.01;
export const PARKED_OFFSET = "-300vh";

export const MAX_CARD_CAMERA_Z = CSS_PERSPECTIVE_Z * 0.4;

export function cameraTravelFor(isMobile: boolean) {
  return isMobile ? CAMERA_TRAVEL.mobile : CAMERA_TRAVEL.desktop;
}

export function cardDepthFor(slot: number, isMobile: boolean) {
  return CARD_READING_DEPTH - slot * cameraTravelFor(isMobile);
}

export function passThroughSpanFor(isMobile: boolean) {
  return MAX_CARD_CAMERA_Z / cameraTravelFor(isMobile);
}
