// Where the flight lands in the music.
//
// The autopilot used to keep its own clock and merely *scale* it so a tour
// came out the same length as a track. Same length is not the same thing as
// in time: nothing lined up with anything, and every source of slip — the
// gap between calling play() and the first sample, a throttled frame, a
// decode stall — pushed the two further apart for the rest of the journey.
//
// So the song is the clock now (see lib/soundtrack-clock.ts) and this file
// says where, in that clock, each beat of the flight belongs. Every number
// is seconds into the track, measured from the track itself rather than
// chosen: tempo and section boundaries came from a spectral-flux analysis
// of the files, and each arrival sits on a detected section change or a bar
// line. Re-render a track and these have to be measured again — a map
// points at one recording, not at a title.
//
// Time zero is the moment the flight leaves Home, which is also the moment
// the track starts. The narration, where it plays at all, happens before
// this clock exists: the flight is parked on Home for it, because a card
// cannot move to a voice. It moves to music.

export type TrackBeats = {
  /** Measured tempo, kept for anyone retuning these by ear. */
  bpm: number;
  /** One bar in seconds — the grid every arrival below is snapped to. */
  bar: number;
  /** Arrival of the Skills billboard. */
  skills: number;
  /** First and last tool on the radar; the rest space evenly between. */
  toolsFrom: number;
  toolsTo: number;
  projects: number;
  experience: number;
  contact: number;
  /** Arrival at progress 1 — the void where the US mark forms. */
  closing: number;
  /** How long the camera spends moving *into* each kind of arrival. */
  travel: {
    skills: number;
    tool: number;
    projects: number;
    panel: number;
    closing: number;
  };
};

export const TRACK_BEATS: Record<string, TrackBeats> = {
  // 130.1 bpm, 1.845s bars, 8-bar phrases. The track builds for 14s, runs a
  // steady body to ~48, breaks down, and drops hardest at 50 into a
  // sustained final third.
  //
  // The build is the approach to the first billboard. The body is the
  // toolkit — nineteen tools, one bar each, which is why the radar run is
  // exactly nineteen bars long and ends on the breakdown. Projects arrives
  // on the drop at 50.20, the loudest moment in the track, which is the
  // panel where another crew passes. The last three section changes carry
  // Experience, Contact and the closing mark.
  "/music/she-break.webm": {
    bpm: 130.1,
    bar: 1.845,
    skills: 9.89,
    toolsFrom: 14.16,
    toolsTo: 47.37,
    projects: 50.2,
    experience: 55.96,
    contact: 61.35,
    closing: 68.41,
    travel: { skills: 9.89, tool: 0.95, projects: 1.93, panel: 2.77, closing: 3.69 },
  },

  // 87.3 bpm, 2.749s bars. A different shape: strong from the first bar,
  // lifts at 25, dips at 45 and again at 66, and saves its largest section
  // for 68 to the end. The mark forms on that last lift with eleven seconds
  // of music under it.
  "/music/tomoon.webm": {
    bpm: 87.3,
    bar: 2.749,
    skills: 12.61,
    // Half-bar per tool here, not a whole one: at 87 bpm a bar is 2.75s and
    // nineteen of them would run to 52s, which is most of the track. Half a
    // bar is 1.375s, the run fits the song's long unbroken body, and the
    // last tool clears just before the change at 46.88.
    toolsFrom: 19.78,
    toolsTo: 44.52,
    projects: 46.88,
    experience: 56.47,
    contact: 64.06,
    closing: 68.82,
    travel: { skills: 12.61, tool: 1.0, projects: 2.0, panel: 2.75, closing: 2.75 },
  },
};

export type FlightKeyframe = {
  /** Seconds into the track at which the camera arrives. */
  at: number;
  progress: number;
  /** Seconds of movement before `at`; the gap before that is the hold. */
  travel: number;
  cardIndex: number;
};

/**
 * Pairs a track's beats with the flight's own progress stops.
 *
 * The times live here and the destinations live in the flight, so neither
 * can be edited into disagreeing with the other: move a section in
 * sections.ts and its panel still arrives on the same beat of the music.
 */
export function buildKeyframes(
  beats: TrackBeats,
  targets: {
    skills: number;
    projects: number;
    experience: number;
    contact: number;
    tools: number[];
  },
  closingCardIndex: number,
): FlightKeyframe[] {
  const frames: FlightKeyframe[] = [
    { at: beats.skills, progress: targets.skills, travel: beats.travel.skills, cardIndex: 1 },
  ];

  const span = beats.toolsTo - beats.toolsFrom;
  const gaps = Math.max(targets.tools.length - 1, 1);
  targets.tools.forEach((progress, i) => {
    frames.push({
      at: beats.toolsFrom + (span * i) / gaps,
      progress,
      travel: beats.travel.tool,
      cardIndex: 1,
    });
  });

  frames.push({ at: beats.projects, progress: targets.projects, travel: beats.travel.projects, cardIndex: 2 });
  frames.push({ at: beats.experience, progress: targets.experience, travel: beats.travel.panel, cardIndex: 3 });
  frames.push({ at: beats.contact, progress: targets.contact, travel: beats.travel.panel, cardIndex: 4 });
  frames.push({ at: beats.closing, progress: 1, travel: beats.travel.closing, cardIndex: closingCardIndex });

  return frames;
}

/**
 * Where the flight is at a given moment of the track.
 *
 * A pure function of song time, which is the whole point: it cannot drift,
 * and a frame dropped or a tab throttled costs nothing because the next
 * frame asks the song where it is rather than adding to a running total.
 */
export function resolveKeyframes(
  frames: FlightKeyframe[],
  seconds: number,
  ease: (t: number) => number,
) {
  let previous = 0;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const departs = frame.at - frame.travel;

    if (seconds < departs) {
      return { index: i, progress: previous, cardIndex: frames[Math.max(0, i - 1)].cardIndex };
    }
    if (seconds < frame.at) {
      const t = (seconds - departs) / frame.travel;
      return {
        index: i,
        progress: previous + (frame.progress - previous) * ease(t),
        cardIndex: frame.cardIndex,
      };
    }
    previous = frame.progress;
  }

  const last = frames[frames.length - 1];
  return { index: frames.length - 1, progress: last.progress, cardIndex: last.cardIndex };
}
