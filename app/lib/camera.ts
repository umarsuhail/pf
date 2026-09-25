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
// Tripled from 7800/8400. Not a tuning nudge — a structural one. Depth is
// `progress x travel`, and progress is normalised to 1, so the legs were all
// competing for one fixed pot: every attempt to give one stretch more room
// took it from a neighbour, three times in a row, and the corridor never
// actually got longer. This is the only number that lengthens all of it at
// once, and it does so without moving a single panel in flight *time* — no
// stop moves, no fade window changes, no closing-beat threshold shifts.
//
// What it buys, per card: an arrival that starts at ~0.28 of reading size
// and grows ~3.9x on the way in, where before it started at ~0.63 and grew
// 1.7x. That is the difference between a panel fading up at roughly the size
// it will end at, and one you can see coming from a long way off.
export const CAMERA_TRAVEL = { mobile: 23400, desktop: 25200 } as const;

// Where a card sits, relative to the camera, at its own reading slot. Just
// past the lens (1100 / (1100 - 80) = 1.08x) so the panel is at comfortable
// full size with the corridor still visibly running past it.
export const CARD_READING_DEPTH = 80;

// How near a card comes before it stops. This is a pass-through, not a stop:
// at 0.82 of the projection distance a card is 5.6x, so a 900px billboard is
// ~5000px across and the viewport is *inside* it — which is what flying
// through something looks like.
//
// develop has no limit here at all: `translateZ: card.z` and the corridor
// group carries the card straight past. That genuinely reads as travelling
// through it — the panel grows past 4x while still fully opaque and becomes
// a wash you pass inside — but it also runs the card through the projection
// plane at 58% opacity, which is where the inverted flash on a landscape
// phone came from. This keeps develop's move and stops just short of that.
export const CARD_PASS_THROUGH_Z = CSS_PERSPECTIVE_Z * 0.82;

// Where a departing card starts to go (1.45x). Past the reading depth, big
// enough that the fade is clearly happening to something on its way past.
export const CARD_DEPART_NEAR_Z = 340;

// Once a departing object reaches this depth it recedes at the same rate as
// the camera instead of continuing toward the singularity. Its largest
// possible perspective scale is therefore 1100 / (1100 - 440) = 1.67x: enough
// to feel like a pass-through, never enough to turn into a clipped
// full-screen slab.
export const MAX_CARD_CAMERA_Z = CSS_PERSPECTIVE_Z * 0.4;

export function cameraTravelFor(isMobile: boolean) {
  return isMobile ? CAMERA_TRAVEL.mobile : CAMERA_TRAVEL.desktop;
}

// Where a card has to be parked so the camera reaches it exactly at its
// reading slot. This used to be five hand-authored `z` values in
// sections.ts, which meant they were three numbers that had to be kept in
// agreement — the stop, the travel, and the depth — and twice they were not:
// Skills sat 825 too deep and Contact 403, so both were read at roughly half
// the size of the panels either side. Derived, they cannot drift, and the
// travel above becomes a single knob for the whole corridor.
//
// It takes `isMobile` because the two devices travel different distances. A
// single authored depth could only ever be right for one of them.
export function cardDepthFor(slot: number, isMobile: boolean) {
  return CARD_READING_DEPTH - slot * cameraTravelFor(isMobile);
}

// The progress a departing object spends reaching MAX_CARD_CAMERA_Z, past
// which it stops approaching and recedes with the camera instead. Anything
// timing a fade against "how long until this stops growing" wants this, not
// a literal — the literal was 0.042, correct only while travel was 8400.
export function passThroughSpanFor(isMobile: boolean) {
  return MAX_CARD_CAMERA_Z / cameraTravelFor(isMobile);
}
