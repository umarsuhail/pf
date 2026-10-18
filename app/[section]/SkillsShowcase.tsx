"use client";

import { motion, type Variants } from "framer-motion";
import { useState } from "react";
import type { FlightCard } from "../data/sections";
import { getSkillGroups, type SkillGroupName } from "../data/skillGroups";
import HandwritingText from "../components/TypoGraphyHand";
import NarratedText from "../components/NarratedText";
import { BrandIcon } from "../components/icons/brand-icon";

const GROUP_THEME: Record<SkillGroupName, { accent: string }> = {
  "Frontend Development": {
    accent: "var(--flight-accent)",
  },
  "UI/UX Design": {
    accent: "color-mix(in srgb, var(--flight-accent) 58%, var(--flight-positive))",
  },
  "Backend & Tooling": {
    accent: "var(--flight-positive)",
  },
};

const LEVEL_PIPS: Record<string, number> = { Expert: 3, Intermediate: 2 };

function LevelMeter({ level, accent }: { level: string; accent: string }) {
  const filled = LEVEL_PIPS[level] ?? 0;
  if (!filled) return null;
  return (
    <span className="inline-flex items-center gap-[3px]" title={level} aria-label={level}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className="h-1 w-3 rounded-full transition-colors"
          style={{
            background:
              i < filled
                ? accent
                : "color-mix(in srgb, var(--flight-ink) 14%, transparent)",
          }}
        />
      ))}
    </span>
  );
}

export function SkillsShowcase({
  card,
  itemVariants,
}: {
  card: FlightCard;
  itemVariants: Variants;
}) {
  const groups = getSkillGroups(card.details);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const [active, setActive] = useState<SkillGroupName | "all">("all");
  const shown = active === "all" ? groups : groups.filter((g) => g.name === active);

  const filters: { key: SkillGroupName | "all"; label: string; count: number; accent: string }[] = [
    { key: "all", label: "Everything", count: total, accent: "var(--flight-ink)" },
    ...groups.map((g) => ({
      key: g.name as SkillGroupName | "all",
      label: g.name.replace(" Development", "").replace(" & Tooling", ""),
      count: g.items.length,
      accent: GROUP_THEME[g.name].accent,
    })),
  ];

  return (
    <>
      <motion.div variants={itemVariants} className="mt-12">
        <span className="detail-eyebrow inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em]">
          {card.eyebrow}
        </span>
        <h1 className="detail-ink mt-6 max-w-[20ch] text-4xl font-semibold leading-[1.1] sm:text-5xl lg:text-6xl">
          <HandwritingText className="text-5xl font-semibold">{card.title}</HandwritingText>
        </h1>
        <p className="detail-copy mt-6 max-w-[54ch] text-base leading-relaxed sm:text-lg">
          <NarratedText id={card.id} text={card.description} />
        </p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        role="group"
        aria-label="Filter skills by discipline"
        className="mt-10 flex flex-wrap gap-2"
      >
        {filters.map((f) => {
          const on = active === f.key;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={on}
              onClick={() => setActive(f.key)}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors"
              style={{
                borderColor: on ? f.accent : "var(--flight-line)",
                background: on
                  ? `color-mix(in srgb, ${f.accent} 10%, transparent)`
                  : "var(--flight-control)",
                color: on ? f.accent : "var(--flight-muted)",
              }}
            >
              {f.label}
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] tabular-nums"
                style={{
                  background: on
                    ? `color-mix(in srgb, ${f.accent} 15%, transparent)`
                    : "var(--flight-control)",
                  color: on ? f.accent : "var(--flight-muted)",
                }}
              >
                {f.count}
              </span>
            </button>
          );
        })}
      </motion.div>

      <div className="mt-12 space-y-14">
        {shown.map((group) => {
          const theme = GROUP_THEME[group.name];
          const headingId = `${group.name.replace(/\W+/g, "-").toLowerCase()}-heading`;
          return (
            <motion.section key={group.name} variants={itemVariants} aria-labelledby={headingId}>
              <div className="flex items-baseline gap-3">
                <span
                  aria-hidden="true"
                  className="h-4 w-1 shrink-0 rounded-full"
                  style={{ background: theme.accent }}
                />
                <h2
                  id={headingId}
                  className="text-xs font-semibold uppercase tracking-[0.32em]"
                  style={{ color: theme.accent }}
                >
                  {group.name}
                </h2>
                <span className="detail-muted text-[10px] font-semibold tabular-nums">
                  {group.items.length}
                </span>
                <div
                  className="h-px flex-1"
                  style={{
                    background: `linear-gradient(90deg, color-mix(in srgb, ${theme.accent} 28%, transparent), transparent)`,
                  }}
                />
              </div>
              <p className="detail-muted mt-2 pl-4 text-sm">{group.blurb}</p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((item) => (
                  <motion.div
                    key={item.label}
                    variants={itemVariants}
                    whileHover={{ y: -4 }}
                    transition={{ type: "spring", stiffness: 320, damping: 24 }}
                    className="detail-surface-subtle group flex items-start gap-3.5 rounded-2xl border p-4 transition-colors"
                  >
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-105"
                      style={{
                        background: `color-mix(in srgb, ${theme.accent} 10%, transparent)`,
                        borderColor: `color-mix(in srgb, ${theme.accent} 28%, transparent)`,
                      }}
                    >
                      <BrandIcon slug={item.icon} className="h-7 w-7" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="detail-ink truncate text-sm font-medium">
                          {item.label}
                        </span>
                        <LevelMeter level={item.level} accent={theme.accent} />
                      </div>
                      <p className="detail-copy mt-1.5 text-xs leading-relaxed">
                        {item.usage}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          );
        })}
      </div>
    </>
  );
}
