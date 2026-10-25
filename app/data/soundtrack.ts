// The soundtrack, and the contract the autopilot keeps with it.
//
// One track covers one journey. The autopilot scales its own leg timings so
// a tour lasts exactly as long as a track minus LOGO_LEAD_SECONDS, which puts
// the closing US mark on screen with that much music still to run — the mark
// appears, the track finishes under it, and the journey ends on both at once.
//
// **Every file here must be the same length.** A journey is timed against
// SOUNDTRACK_SECONDS, so a shorter track would end before the mark and a
// longer one would still be playing after it. CockpitTray checks each file's
// real duration against this on load and warns if they disagree, because
// nothing else would tell you — the tour would simply drift.

export const SOUNDTRACK_TRACKS = [
  { src: "/music/tomoon.webm", title: "To The Moon" },
  { src: "/music/she-break.webm", title: "She Break" },
] as const;

/** Just the files, for the shuffle bag and the preload. */
export const SOUNDTRACK_SRCS: readonly string[] = SOUNDTRACK_TRACKS.map(
  (track) => track.src,
);

export function soundtrackTitle(src: string) {
  return SOUNDTRACK_TRACKS.find((track) => track.src === src)?.title ?? "";
}

/** Measured, not guessed: both files are 80.008s. */
export const SOUNDTRACK_SECONDS = 80.008;

/**
 * How much track is left when the tour's clock stops.
 *
 * Not when the mark *appears* — it is armed at progress 0.955 and is on
 * screen for the whole of the final hold. This is the margin after the last
 * beat, so the track is still playing when the flight has finished moving.
 */
export const LOGO_LEAD_SECONDS = 1.1;

/**
 * What one autopilot tour should last, from the moment the soundtrack starts
 * — which is the narration handover, not the press of play. A first-time
 * visitor hears the narration first and the music begins after it, so the
 * narration's length never enters this.
 */
export const AUTOPILOT_TARGET_SECONDS = SOUNDTRACK_SECONDS - LOGO_LEAD_SECONDS;

/** Tolerance before the mismatch warning fires. */
export const SOUNDTRACK_LENGTH_TOLERANCE = 0.25;
