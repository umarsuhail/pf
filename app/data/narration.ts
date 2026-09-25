// The intro narration used to be four separate ElevenLabs clips played back
// to back; it's now one combined file with its background music already
// mixed in underneath (see CockpitTray, which dropped the old separate
// work.mp3 handover as a result). Still an array of "spans" so a future
// split back into multiple clips is just adding entries here — with one
// entry, CockpitTray's sequencing collapses to "play it, then hand over".
export const NARRATION_SPANS = [
  {
    text: "Hi, I'm Umar Suhail, a Senior Frontend Developer with over seven years of experience building modern, scalable web applications. My experience spans frontend development, application architecture, UI engineering, and building data-driven and interactive digital experiences using a wide range of modern technologies and tools. I enjoy turning complex ideas into intuitive, high-performance products, from enterprise dashboards and business applications to AI-powered and interactive experiences. Welcome to my portfolio. Explore my work and see what I've been building.",
    // AAC, not the original WAV: the uncompressed master (48kHz stereo,
    // ~7 MB) was by far the heaviest thing the site could ask anyone to
    // download. This is a raw ADTS .aac stream (128 kbps, ~35s, ~630 KB),
    // which every browser's <audio> plays. One caveat of the raw stream: it
    // carries no duration header, so the browser estimates the length —
    // the word sync reads currentTime/duration, so if the highlighted words
    // ever drift from the voice, re-wrap it as .m4a (same audio, exact
    // duration) rather than re-encoding it.
    //
    // Re-encode from the lossless master, never from this copy.
    src: "/music/intro.aac",
    // Real duration comes from the loaded <audio> element the moment it's
    // available (see CockpitTray's onNarrationProgress) — this is only the
    // guess used before that, roughly the sum of the old four clips.
    fallbackDuration: 35,
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
