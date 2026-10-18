"use client";

import { useEffect, useState } from "react";
import { narrationSegments, type NarrationWordSegment } from "../data/narration";

type WordState = "read" | "current" | "future";

function resolveStates(
  words: string[],
  segments: NarrationWordSegment[],
  activeSpanIndex: number,
  currentTime: number,
  duration: number,
): WordState[] {
  const states: WordState[] = new Array(words.length).fill("future");
  let cursor = 0;

  for (const segment of segments) {
    const segmentEnd = Math.min(cursor + segment.words, words.length);

    if (segment.spanIndex < activeSpanIndex) {
      states.fill("read", cursor, segmentEnd);
    } else if (segment.spanIndex === activeSpanIndex) {
      const local = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
      const revealed = cursor + Math.floor(local * segment.words);
      states.fill("read", cursor, Math.min(revealed, segmentEnd));
      if (revealed < segmentEnd) states[revealed] = "current";
    }

    cursor = segmentEnd;
  }

  return states;
}

export default function NarratedText({
  id,
  text,
  className,
}: {
  id: string;
  text: string;
  className?: string;
}) {
  const words = text.split(" ");
  const segments = narrationSegments[id];
  const [states, setStates] = useState<WordState[] | null>(null);

  useEffect(() => {
    if (!segments) return;

    const onProgress = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          active?: boolean;
          spanIndex?: number;
          currentTime?: number;
          duration?: number;
        }>
      ).detail;

      if (!detail?.active) {
        setStates(null);
        return;
      }

      setStates(
        resolveStates(
          words,
          segments,
          detail.spanIndex ?? 0,
          detail.currentTime ?? 0,
          detail.duration ?? 0,
        ),
      );
    };

    window.addEventListener("narration-progress", onProgress as EventListener);
    return () => window.removeEventListener("narration-progress", onProgress as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, text]);

  if (!segments || !states) return <>{text}</>;

  return (
    <span className={className}>
      {words.map((word, i) => (
        <span
          key={i}
          className={
            states[i] === "read"
              ? "text-inherit"
              : states[i] === "current"
                ? "text-(--accent)"
                : "text-(--flight-muted) opacity-60"
          }
        >
          {word}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}
