// The intro narration used to be four separate ElevenLabs clips played back
// to back; it's now one combined file with its background music already
// mixed in underneath (see CockpitTray, which dropped the old separate
// work.mp3 handover as a result). Still an array of "spans" so a future
// split back into multiple clips is just adding entries here — with one
// entry, CockpitTray's sequencing collapses to "play it, then hand over".
export const NARRATION_SPANS = [
  {
    text: "Hi, I'm Umar Suhail, a Senior Frontend Developer with over seven years of experience building modern, scalable web applications. My experience spans frontend development, application architecture, UI engineering, and building data-driven and interactive digital experiences using a wide range of modern technologies and tools. I enjoy turning complex ideas into intuitive, high-performance products, from enterprise dashboards and business applications to AI-powered and interactive experiences. Welcome to my portfolio. Explore my work and see what I've been building.",
    src: "/music/intro.wav",
    // Real duration comes from the loaded <audio> element the moment it's
    // available (see CockpitTray's onNarrationProgress) — this is only the
    // guess used before that, roughly the sum of the old four clips.
    fallbackDuration: 33,
  },
] as const;

// Fallback total (nominal clip lengths) — used only before real <audio>
// metadata has loaded for every span; actual pacing follows the real files.
export const NARRATION_DURATION = NARRATION_SPANS.reduce(
  (sum, span) => sum + span.fallbackDuration,
  0,
);

// Full narrated text in spoken order — this concatenation is what
// sections.ts's home description should read verbatim, so the on-screen
// copy and the spoken script never drift apart.
export const NARRATION_SCRIPT = NARRATION_SPANS.map((span) => span.text).join(" ");

export type NarrationWordSegment = { spanIndex: number; words: number };

// home's text, broken into per-span word counts in spoken order —
// NarratedText walks these against the word list it's given, lighting up
// whichever span is currently playing and marking earlier ones as read.
export const narrationSegments: Record<string, NarrationWordSegment[]> = {
  home: NARRATION_SPANS.map((span, spanIndex) => ({
    spanIndex,
    words: span.text.split(" ").length,
  })),
};
