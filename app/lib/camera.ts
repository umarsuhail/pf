// The flight's camera, in one coordinate system.
//
// These used to live inside MultiverseFlight, which was fine while it was the
// only thing placed in the corridor. The technology spiral flies through the
// same space and has to agree with it exactly — a node whose depth is derived
// from a different travel distance drifts away from the scroll position it is
// supposed to mark — so the numbers live here and both read them.

// A billboard that reaches this depth is sitting on the projection plane;
// past it the browser projects it inverted at an effectively unbounded scale.
// That is the tall, narrow strip that used to flash while reversing through
// Home/Skills on a landscape phone.
export const CSS_PERSPECTIVE_Z = 1100;

// How far the camera travels over the whole flight. Shorter on phones, where
// the same distance at a smaller card size reads as faster.
//
// In flight progress, not scroll: these numbers set how much depth a unit of
// progress buys, and every depth-sensitive constant in the flight is tuned
// against them. Scaling them to match a longer track — as an earlier attempt
// did — changes what all of those constants mean. Scroll length belongs to
// flightTimeline.ts instead.
export const CAMERA_TRAVEL = { mobile: 7800, desktop: 8400 } as const;

// Once a departing object reaches this depth it recedes at the same rate as
// the camera instead of continuing toward the singularity. Its largest
// possible perspective scale is therefore 1100 / (1100 - 440) = 1.67x: enough
// to feel like a pass-through, never enough to turn into a clipped
// full-screen slab.
export const MAX_CARD_CAMERA_Z = CSS_PERSPECTIVE_Z * 0.4;

export function cameraTravelFor(isMobile: boolean) {
  return isMobile ? CAMERA_TRAVEL.mobile : CAMERA_TRAVEL.desktop;
}
