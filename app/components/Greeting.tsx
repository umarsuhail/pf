"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

// One boot-screen-style cycle per time of day — same spirit as the iPhone
// "hello" startup screen, just swapped for a greeting that actually matches
// when the visitor is looking at it.
const GREETINGS: Record<TimeOfDay, string[]> = {
  morning: [
    "Good Morning",
    "Buenos Días",
    "Bonjour",
    "Guten Morgen",
    "Bom Dia",
    "Buongiorno",
    "おはようございます",
    "早上好",
    "좋은 아침이에요",
    "صباح الخير",
    "सुप्रभात",
    "Доброе утро",
  ],
  afternoon: [
    "Good Afternoon",
    "Buenas Tardes",
    "Bon Après-midi",
    "Guten Tag",
    "Boa Tarde",
    "Buon Pomeriggio",
    "こんにちは",
    "下午好",
    "안녕하세요",
    "مساء الخير",
    "शुभ दोपहर",
    "Добрый день",
  ],
  evening: [
    "Good Evening",
    "Buenas Noches",
    "Bonsoir",
    "Guten Abend",
    "Boa Noite",
    "Buonasera",
    "こんばんは",
    "晚上好",
    "안녕하세요",
    "مساء الخير",
    "शुभ संध्या",
    "Добрый вечер",
  ],
  night: [
    "Good Night",
    "Buenas Noches",
    "Bonne Nuit",
    "Gute Nacht",
    "Boa Noite",
    "Buonanotte",
    "おやすみなさい",
    "晚安",
    "안녕히 주무세요",
    "تصبح على خير",
    "शुभ रात्रि",
    "Спокойной ночи",
  ],
};

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export default function Greeting({ className = "" }: { className?: string }) {
  // Null until mounted — the visitor's local hour is only knowable on the
  // client, and guessing during server rendering would mismatch on hydration.
  const [words, setWords] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // The local hour is an external, client-only input (unknowable during
    // SSR) — this is the one-time read-and-store effect React's own docs
    // carve out an exception for, not state derivable from props/state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWords(GREETINGS[getTimeOfDay(new Date().getHours())]);
  }, []);

  useEffect(() => {
    if (!words) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, 1800);
    return () => clearInterval(id);
  }, [words]);

  if (!words) return <span className={className}>&nbsp;</span>;

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={index}
        initial={{ opacity: 0, y: 10, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 1.05 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className={`inline-block ${className}`}
        style={{ fontFamily: "var(--font-twinkle-star)" }}
      >
        {words[index]}
      </motion.span>
    </AnimatePresence>
  );
}
