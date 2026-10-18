export const NARRATION_SPANS = [
  {
    text: "Hi, I'm Umar Suhail, a Senior Frontend Developer with over seven years of experience building modern, scalable web applications. My experience spans frontend development, application architecture, UI engineering, and building data-driven and interactive digital experiences using a wide range of modern technologies and tools. I enjoy turning complex ideas into intuitive, high-performance products, from enterprise dashboards and business applications to AI-powered and interactive experiences. Welcome to my portfolio. Explore my work and see what I've been building.",
    src: "/music/intro.aac",
    fallbackDuration: 35,
  },
] as const;

export const NARRATION_DURATION = NARRATION_SPANS.reduce(
  (sum, span) => sum + span.fallbackDuration,
  0,
);

export const NARRATION_SCRIPT = NARRATION_SPANS.map((span) => span.text).join(" ");

export type NarrationWordSegment = { spanIndex: number; words: number };

export const narrationSegments: Record<string, NarrationWordSegment[]> = {
  home: NARRATION_SPANS.map((span, spanIndex) => ({
    spanIndex,
    words: span.text.split(" ").length,
  })),
};
