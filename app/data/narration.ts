// The intro narration is four separate ElevenLabs clips, spoken back to back
// — one per sentence-group — rather than one long file with estimated word
// timing. Each clip's own real playback position drives its span's
// highlight, so sync is exact instead of proportionally guessed.
export const NARRATION_SPANS = [
  {
    text: "Hi, I'm Umar Suhail, a Senior Frontend Developer with over seven years of experience building modern, scalable web applications.",
    src: "/music/1.mp3",
    fallbackDuration: 7,
  },
  {
    text: "My experience spans frontend development, application architecture, UI engineering, and building data-driven and interactive digital experiences using a wide range of modern technologies and tools.",
    src: "/music/2.mp3",
    fallbackDuration: 12,
  },
  {
    text: "I enjoy turning complex ideas into intuitive, high-performance products, from enterprise dashboards and business applications to AI-powered and interactive experiences.",
    src: "/music/3.mp3",
    fallbackDuration: 10,
  },
  {
    text: "Welcome to my portfolio. Explore my work and see what I've been building.",
    src: "/music/4.mp3",
    fallbackDuration: 4,
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
