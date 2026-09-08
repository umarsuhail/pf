"use client";

import { motion, type Variants } from "framer-motion";
import type { FlightCard } from "../data/sections";
import { getSkillGroups } from "../data/skillGroups";
import HandwritingText from "../components/TypoGraphyHand";
import NarratedText from "../components/NarratedText";
import { BrandIcon } from "../components/icons/brand-icon";

const LEVEL_STYLES: Record<string, string> = {
  Expert: "text-sky-300/90",
  Intermediate: "text-slate-400/80",
};

export function SkillsShowcase({
  card,
  itemVariants,
}: {
  card: FlightCard;
  itemVariants: Variants;
}) {
  const groups = getSkillGroups(card.details);

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

      <div className="mt-16 space-y-14">
        {groups.map((group) => (
          <motion.section key={group.name} variants={itemVariants} aria-labelledby={`${group.name}-heading`}>
            <div className="flex items-baseline gap-4">
              <h2
                id={`${group.name}-heading`}
                className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-100/60"
              >
                {group.name}
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>
            <p className="mt-2 text-sm text-slate-300/60">{group.blurb}</p>

            <div className="mt-8 flex flex-wrap gap-x-10 gap-y-8">
              {group.items.map((item, idx) => (
                <motion.div
                  key={item.label}
                  variants={itemVariants}
                  whileHover={{ y: -6 }}
                  className="group flex w-20 flex-col items-center gap-2.5 text-center"
                >
                  <motion.div
                    animate={{ y: [0, -7, 0] }}
                    transition={{
                      duration: 2.4 + (idx % 5) * 0.3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: idx * 0.12,
                    }}
                    whileHover={{ scale: 1.2 }}
                  >
                    <BrandIcon slug={item.icon} className="h-10 w-10 drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)] sm:h-12 sm:w-12" />
                  </motion.div>
                  <span className="text-xs font-medium text-slate-100/85 sm:text-sm">
                    {item.label}
                  </span>
                  {item.level && (
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-widest ${
                        LEVEL_STYLES[item.level] ?? "text-slate-400/70"
                      }`}
                    >
                      {item.level}
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        ))}
      </div>
    </>
  );
}
