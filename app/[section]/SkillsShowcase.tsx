"use client";

import { motion, type Variants } from "framer-motion";
import { useState } from "react";
import type { FlightCard } from "../data/sections";
import { getSkillGroups, type SkillGroupName } from "../data/skillGroups";
import HandwritingText from "../components/TypoGraphyHand";
import NarratedText from "../components/NarratedText";
import { BrandIcon } from "../components/icons/brand-icon";

// One accent per discipline, taken from the flight's own palette (see
// `atmospheres` in CardPortal) so the three groups read as the same colour
// system the rest of the site travels through rather than as a chart legend.
// Colour is the fastest way to tell the groups apart while scanning, which is
// the whole point of separating them.
const GROUP_THEME: Record<SkillGroupName, { accent: string; tint: string; ring: string }> = {
  "Frontend Development": {
    accent: "#7dd3fc",
    tint: "rgba(125,211,252,0.10)",
    ring: "rgba(125,211,252,0.28)",
  },
  "UI/UX Design": {
    accent: "#a78bfa",
    tint: "rgba(167,139,250,0.10)",
    ring: "rgba(167,139,250,0.28)",
  },
  "Backend & Tooling": {
    accent: "#2dd4bf",
    tint: "rgba(45,212,191,0.10)",
    ring: "rgba(45,212,191,0.28)",
  },
};

// Expert/Intermediate as three pips rather than as a word. A level is a
// comparison — the only question anyone asks of it is "more or less than the
// one next to it" — and a row of pips answers that without being read.
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
          style={{ background: i < filled ? accent : "rgba(255,255,255,0.14)" }}
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
  // "all" by default, so the server-rendered HTML carries every skill and the
  // filter is an enhancement rather than a gate on the content.
  const [active, setActive] = useState<SkillGroupName | "all">("all");
  const shown = active === "all" ? groups : groups.filter((g) => g.name === active);

  const filters: { key: SkillGroupName | "all"; label: string; count: number; accent: string }[] = [
    { key: "all", label: "Everything", count: total, accent: "#e2f2ff" },
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
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/30 bg-emerald-200/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-emerald-100">
          {card.eyebrow}
        </span>
        <h1 className="mt-6 max-w-[20ch] text-4xl font-semibold leading-[1.1] text-sky-50 sm:text-5xl lg:text-6xl">
          <HandwritingText className="text-5xl font-semibold">{card.title}</HandwritingText>
        </h1>
        <p className="mt-6 max-w-[54ch] text-base leading-relaxed text-slate-100/90 sm:text-lg">
          <NarratedText id={card.id} text={card.description} />
        </p>
      </motion.div>

      {/* Discipline switcher. The three groups exist in the data already; this
          is what makes that separation usable rather than merely present —
          "show me only the backend" is the question this page gets asked. */}
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
                borderColor: on ? f.accent : "rgba(255,255,255,0.10)",
                background: on ? `${f.accent}1a` : "rgba(255,255,255,0.03)",
                color: on ? f.accent : "rgba(226,240,255,0.6)",
              }}
            >
              {f.label}
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] tabular-nums"
                style={{
                  background: on ? `${f.accent}26` : "rgba(255,255,255,0.06)",
                  color: on ? f.accent : "rgba(226,240,255,0.45)",
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
                {/* The group's colour, stated once at full strength, so the
                    tiles beneath it can carry it at 10% and still be read as
                    belonging to this heading. */}
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
                <span className="text-[10px] font-semibold tabular-nums text-slate-400/70">
                  {group.items.length}
                </span>
                <div
                  className="h-px flex-1"
                  style={{
                    background: `linear-gradient(90deg, ${theme.ring}, transparent)`,
                  }}
                />
              </div>
              <p className="mt-2 pl-4 text-sm text-slate-300/60">{group.blurb}</p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((item) => (
                  <motion.div
                    key={item.label}
                    variants={itemVariants}
                    // Hover-only motion. Every tile used to run its own
                    // infinite bob — nineteen concurrent looping animations
                    // that never stopped, on a page whose content does not
                    // move. Removing them is quieter to read and takes the
                    // main thread back on mobile.
                    whileHover={{ y: -4 }}
                    transition={{ type: "spring", stiffness: 320, damping: 24 }}
                    className="group flex items-start gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06]"
                  >
                    {/* Icon on its group's own tinted plate: the discipline is
                        legible from the tile alone, without tracing back up to
                        the heading. */}
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-105"
                      style={{ background: theme.tint, borderColor: theme.ring }}
                    >
                      <BrandIcon slug={item.icon} className="h-7 w-7" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-slate-100/90">
                          {item.label}
                        </span>
                        <LevelMeter level={item.level} accent={theme.accent} />
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-300/70">
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
