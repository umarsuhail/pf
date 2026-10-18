
export const STARFIELD = {
  cameraZ: 18,
  fovDeg: 60,
  depth: 60,
  pointSize: 0.26,
  color: "#3b82f6",
  opacity: 0.4,
} as const;

export type StarSeed = { nx: number; ny: number; distance: number; px: number };

export function starPixelSize(distance: number, viewportHeight: number) {
  return (STARFIELD.pointSize * (viewportHeight / 2)) / distance;
}

export function makeStarSeeds(count: number, viewportHeight: number): StarSeed[] {
  const seeds: StarSeed[] = [];
  for (let i = 0; i < count; i++) {
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

export const STARFIELD_SEED_EVENT = "starfield-seed";
export const STARFIELD_GATHER_EVENT = "starfield-gather";
export const STARFIELD_RELEASE_EVENT = "starfield-release";

export type StarfieldSeedDetail = { stars: StarSeed[] };
export type StarfieldGatherDetail = {
  count: number;
  within: { left: number; top: number; right: number; bottom: number };
  respond: (points: { x: number; y: number }[]) => void;
};
