// The starfield's camera and look, shared with the two things that hand
// particles to and from it: the page loader (the US shatters into stars) and
// the closing mark (stars gather back into the US). Both have to agree with
// SpaceParticles to the pixel, or the hand-off shows as a jump.

export const STARFIELD = {
  cameraZ: 18,
  fovDeg: 60,
  depth: 60,
  pointSize: 0.26,
  color: "#3b82f6",
  opacity: 0.4,
} as const;

/** A star the loader hands to the field: where it is on screen (0..1 of the
 *  viewport), how far from the camera, and the size it draws at there. */
export type StarSeed = { nx: number; ny: number; distance: number; px: number };

/** Viewport pixel diameter of a field point at `distance`, as three's
 *  PointsMaterial with sizeAttenuation draws it. */
export function starPixelSize(distance: number, viewportHeight: number) {
  return (STARFIELD.pointSize * (viewportHeight / 2)) / distance;
}

/** Where the shattered US settles: spread over the whole screen at depths
 *  the field actually occupies. */
export function makeStarSeeds(count: number, viewportHeight: number): StarSeed[] {
  const seeds: StarSeed[] = [];
  for (let i = 0; i < count; i++) {
    // Between the near edge of the field's wrap and its far half, weighted
    // toward far — the field reads as depth, not as a spray of big dots.
    const distance = 16 + Math.pow(Math.random(), 0.7) * 40;
    seeds.push({
      nx: 0.03 + Math.random() * 0.94,
      ny: 0.03 + Math.random() * 0.94,
      distance,
      px: starPixelSize(distance, viewportHeight),
    });
  }
  return seeds;
}

// Window events the hand-offs travel on. The field and the loader/mark are
// in different trees and neither owns the other.
export const STARFIELD_SEED_EVENT = "starfield-seed";
export const STARFIELD_GATHER_EVENT = "starfield-gather";
export const STARFIELD_RELEASE_EVENT = "starfield-release";

export type StarfieldSeedDetail = { stars: StarSeed[] };
/** Asks the field for up to `count` stars that are on screen right now; it
 *  hides them and answers through `respond` with their viewport positions. */
export type StarfieldGatherDetail = {
  count: number;
  /** Viewport rect to take stars from — the mark's own canvas, since a
   *  particle outside it could not be drawn. */
  within: { left: number; top: number; right: number; bottom: number };
  respond: (points: { x: number; y: number }[]) => void;
};
