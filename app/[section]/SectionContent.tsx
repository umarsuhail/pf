"use client";

import { motion, stagger, type Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef } from "react";
import { ArrowLeftIcon } from "../components/icons/arrow-left";
import { ArrowRightIcon } from "../components/icons/arrow-right";
import { ActivityIcon } from "../components/icons/activity";
import { BotIcon } from "../components/icons/bot";
import { CardIcon } from "../components/icons/card-icon";
import { CpuIcon } from "../components/icons/cpu";
import { FolderKanbanIcon } from "../components/icons/folder-kanban";
import { DownloadIcon } from "../components/icons/download";
import { HistoryIcon } from "../components/icons/history";
import { SparklesIcon } from "../components/icons/sparkles";
import { BrandIcon } from "../components/icons/brand-icon";
import type { AnimatedIconHandle } from "../components/icons/card-icon";
import { cards as allCards } from "../data/sections";
import type { FlightCard } from "../data/sections";
import { getSkillGroups } from "../data/skillGroups";
import CallbackForm from "../components/CallbackForm";
import NarratedText from "../components/NarratedText";
import HandwritingText from "../components/TypoGraphyHand";
import { ProjectMissionLog } from "./ProjectMissionLog";
import { SkillsShowcase } from "./SkillsShowcase";

const RESUME_PDF_URL = "/umar-suhail-resume-2026.pdf";

const HOME_STATS = [
  { Icon: HistoryIcon, value: "7+", label: "Years Experience" },
  { Icon: FolderKanbanIcon, value: "6+", label: "Projects Delivered" },
  { Icon: ActivityIcon, value: "1M+", label: "Transactions Monitored" },
  { Icon: CpuIcon, value: "50+", label: "Tenant Configurations" },
];

const WHAT_I_DO = [
  {
    Icon: SparklesIcon,
    title: "UI Engineering",
    description: "Building clean, responsive, and accessible user interfaces with React and Next.js.",
  },
  {
    Icon: CpuIcon,
    title: "Frontend Architecture",
    description: "Designing scalable, maintainable frontend systems and reusable component libraries.",
  },
  {
    Icon: ActivityIcon,
    title: "Data & Analytics",
    description: "Building enterprise dashboards for transaction monitoring, revenue tracking, and reporting.",
  },
  {
    Icon: BotIcon,
    title: "AI & Integrations",
    description: "Integrating AI-powered features like face recognition and chatbots into production apps.",
  },
];

const PANEL_CLASS =
  "detail-panel relative overflow-hidden rounded-[1.5rem] border p-5 sm:rounded-[2rem] sm:p-10 lg:p-12";

function Eyebrow({ card }: { card: FlightCard }) {
  return (
    <span className="detail-eyebrow inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em]">
      <CardIcon id={card.id} size={14} aria-hidden="true" />
      {card.eyebrow}
    </span>
  );
}
function GlowOverlay() {
  return (
    <div className="detail-glow pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full" />
  );
}

function parseContactLine(line: string): { label: string; value: string } {
  const separator = line.indexOf(": ");
  if (separator === -1) return { label: line, value: "" };
  return { label: line.slice(0, separator), value: line.slice(separator + 2) };
}

export function SectionContent({
  card,
  gradient,
  previous,
  next,
}: {
  card: FlightCard;
  gradient: string;
  previous: FlightCard;
  next: FlightCard;
}) {
  const backArrowRef = useRef<AnimatedIconHandle>(null);
  const previousArrowRef = useRef<AnimatedIconHandle>(null);
  const nextArrowRef = useRef<AnimatedIconHandle>(null);

  const projects = useMemo(() => card.projects ?? [], [card.projects]);

  const homeTechItems = useMemo(
    () => getSkillGroups(allCards.find((c) => c.id === "skills")?.details ?? []).flatMap((g) => g.items),
    [],
  );

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { delayChildren: stagger(0.1, { startDelay: 0.1 }) },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 20 },
    },
  };

  return (
    <>
      <div
        aria-hidden="true"
        className="detail-atmosphere pointer-events-none fixed inset-0 z-0"
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="detail-page relative z-10 mx-auto w-full max-w-[110rem] px-4 pb-20 pt-24 sm:px-8 sm:pb-24 sm:pt-28 lg:px-12 xl:px-16"
      >
        <motion.div variants={itemVariants}>
          <Link
            href="/"
            className="detail-back-link group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] transition-colors"
            onMouseEnter={() => backArrowRef.current?.startAnimation()}
            onMouseLeave={() => backArrowRef.current?.stopAnimation()}
          >
            <ArrowLeftIcon ref={backArrowRef} size={14} aria-hidden="true" />
            Back to the flight
          </Link>
        </motion.div>

        {card.id === "home" && (
          <>
            <motion.header
              variants={itemVariants}
              className="mt-12 grid gap-10 sm:mt-16 lg:grid-cols-2 lg:items-center lg:gap-16"
            >
              <div>
                <Eyebrow card={card} />
                <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                  <HandwritingText className="detail-ink block">
                    <span className="block">Hi, I&apos;m</span>
                    <span className="detail-accent block">Umar Suhail</span>
                  </HandwritingText>
                </h1>
                <p className="detail-status-pill mt-6 inline-flex flex-wrap items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium">
                  Lead Frontend Engineer
                  <span className="detail-positive-dot h-1 w-1 rounded-full" aria-hidden="true" />
                  7+ Years Experience
                </p>
                <p className="detail-copy mt-6 max-w-[62ch] text-lg leading-relaxed sm:text-xl lg:text-[1.375rem]">
                  I build modern, scalable, and high-performance web applications with a strong
                  focus on clean UI, great user experience, and solving real-world problems
                  through code.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/projects"
                    className="detail-action-primary inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold hover:-translate-y-0.5"
                  >
                    View My Work
                    <ArrowRightIcon size={14} aria-hidden="true" />
                  </Link>
                  <a
                    href={RESUME_PDF_URL}
                    download
                    className="detail-action-secondary inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold hover:-translate-y-0.5"
                  >
                    Download CV
                    <DownloadIcon size={14} aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
                <div className="detail-glow pointer-events-none absolute inset-0 rounded-full" />
                <div className="detail-line relative aspect-square w-full overflow-hidden rounded-[2rem] border">
                  <Image src="/images/me-s.jpg" alt="Umar Suhail" fill className="object-cover" />
                </div>
                {[
                  { title: "UI Engineering", detail: "Design Systems", pos: "-left-4 top-8 sm:-left-8" },
                  { title: "Architecture", detail: "Scalable & Maintainable", pos: "-right-4 top-2 sm:-right-8" },
                  { title: "Frontend", detail: "React, Next.js, TypeScript", pos: "-left-4 bottom-16 sm:-left-8" },
                  { title: "Problem Solver", detail: "Turning ideas into real products", pos: "-right-4 bottom-6 sm:-right-8" },
                ].map((chip) => (
                  <div
                    key={chip.title}
                    className={`detail-surface-raised absolute hidden rounded-xl border px-4 py-3 shadow-lg sm:block ${chip.pos}`}
                  >
                    <p className="detail-ink text-xs font-semibold">{chip.title}</p>
                    <p className="detail-muted text-[11px]">{chip.detail}</p>
                  </div>
                ))}
              </div>
            </motion.header>

            <motion.div
              variants={itemVariants}
              className="detail-surface mt-10 grid grid-cols-2 gap-3 rounded-2xl border p-4 sm:grid-cols-4 sm:p-6"
            >
              {HOME_STATS.map(({ Icon, value, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="detail-icon inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="detail-ink text-lg font-semibold">{value}</p>
                    <p className="detail-muted text-xs">{label}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div variants={itemVariants} className="mt-16 grid gap-10 lg:grid-cols-2 lg:gap-14">
              <div>
                <h2 className="detail-ink text-lg font-semibold">What I Do</h2>
                <div className="detail-rule mt-4 h-px w-12" />
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {WHAT_I_DO.map(({ Icon, title, description }) => (
                    <div key={title} className="detail-surface-subtle rounded-2xl border p-5">
                      <span className="detail-icon inline-flex h-9 w-9 items-center justify-center rounded-lg border">
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <p className="detail-ink mt-3 text-sm font-semibold">{title}</p>
                      <p className="detail-copy mt-1.5 text-xs leading-relaxed">{description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="detail-ink text-lg font-semibold">Tech I Work With</h2>
                <div className="detail-rule mt-4 h-px w-12" />
                <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5">
                  {homeTechItems.map((item) => (
                    <div
                      key={item.label}
                      className="detail-surface-subtle flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center"
                    >
                      <span className="detail-icon inline-flex h-10 w-10 items-center justify-center rounded-lg border">
                        <BrandIcon slug={item.icon} className="h-6 w-6" />
                      </span>
                      <p className="detail-copy text-xs">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}

        {card.id === "skills" && <SkillsShowcase card={card} itemVariants={itemVariants} />}

        {card.id === "experience" && (
          <motion.header
            variants={itemVariants}
            className={`${PANEL_CLASS} mt-12`}
            style={{ background: gradient }}
          >
            <div className="relative z-10">
              <Eyebrow card={card} />
              <h1 className="detail-ink mt-6 max-w-[24ch] text-[2.5rem] font-semibold leading-[1.08] sm:text-6xl lg:text-7xl">
                <HandwritingText className="text-5xl font-semibold">{card.title}</HandwritingText>
              </h1>
              <p className="detail-copy mt-6 max-w-[62ch] text-lg leading-relaxed sm:text-xl lg:text-[1.375rem]">
                <NarratedText id={card.id} text={card.description} />
              </p>
            </div>
            <GlowOverlay />
          </motion.header>
        )}

        {card.id === "projects" && (
          <motion.div variants={itemVariants} className="mt-12">
            <ProjectMissionLog projects={projects} />
          </motion.div>
        )}

        {card.id === "experience" && (
          <motion.section variants={itemVariants} className="mt-16">
            <div className="flex items-center gap-4">
              <h2 className="detail-muted text-xs font-semibold uppercase tracking-[0.32em]">
                Career Timeline
              </h2>
              <div className="detail-rule h-px flex-1" />
            </div>
            <div className="detail-timeline relative mt-10 space-y-10 border-l pl-8">
              {(card.timeline ?? []).map((job) => (
                <motion.div variants={itemVariants} key={job.company} className="relative">
                  <span className="detail-timeline-dot absolute -left-[2.375rem] top-1.5 h-3 w-3 rounded-full" />
                  <p className="detail-muted text-xs font-semibold uppercase tracking-widest">
                    {job.period} · {job.location}
                  </p>
                  <h3 className="detail-ink mt-1.5 text-lg font-semibold">
                    {job.role} — {job.company}
                  </h3>
                  <p className="detail-copy mt-2 max-w-[72ch] text-base leading-relaxed">
                    {job.summary}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {card.id === "contact" && (
          <motion.section
            variants={itemVariants}
            className={`${PANEL_CLASS} mt-12`}
            style={{ background: gradient }}
          >
            <div className="relative z-10">
              <Eyebrow card={card} />
              <h1 className="detail-ink mt-6 max-w-[24ch] text-[2.5rem] font-semibold leading-[1.08] sm:text-6xl lg:text-7xl">
                <HandwritingText className="text-4xl font-semibold sm:text-5xl lg:text-6xl">{card.title}</HandwritingText>
              </h1>
              <p className="detail-copy mt-6 max-w-[62ch] text-lg leading-relaxed sm:text-xl lg:text-[1.375rem]">
                <NarratedText id={card.id} text={card.description} />
              </p>

              <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {card.details.map((line) => {
                  const { label, value } = parseContactLine(line);
                  return (
                    <div
                      key={line}
                      className="detail-surface-subtle rounded-2xl border px-5 py-4"
                    >
                      <p className="detail-muted text-[10px] font-semibold uppercase tracking-widest">
                        {label}
                      </p>
                      <p className="detail-ink mt-1 text-sm leading-relaxed">
                        {value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
            <GlowOverlay />
          </motion.section>
        )}

        {card.id === "contact" && (
          <motion.div variants={itemVariants} className="mt-16">
            <CallbackForm />
          </motion.div>
        )}

        <motion.nav
          variants={itemVariants}
          aria-label="Other sections"
          className="detail-line mt-20 flex flex-col gap-6 border-t pt-10 sm:flex-row sm:items-center sm:justify-between"
        >
          <Link
            href={`/${previous.id}`}
            className="detail-back-link group flex flex-col items-start gap-1 transition-colors"
            onMouseEnter={() => previousArrowRef.current?.startAnimation()}
            onMouseLeave={() => previousArrowRef.current?.stopAnimation()}
          >
            <span className="detail-muted text-xs font-semibold uppercase tracking-widest">
              Previous
            </span>
            <div className="detail-copy flex items-center gap-3 text-sm font-medium">
              <ArrowLeftIcon ref={previousArrowRef} size={16} aria-hidden="true" />
              <span>{previous.eyebrow.replace(/^\d+\s*\/\s*/, "")}</span>
            </div>
          </Link>
          <Link
            href={`/${next.id}`}
            className="detail-back-link group flex flex-col items-start gap-1 transition-colors sm:items-end"
            onMouseEnter={() => nextArrowRef.current?.startAnimation()}
            onMouseLeave={() => nextArrowRef.current?.stopAnimation()}
          >
            <span className="detail-muted text-xs font-semibold uppercase tracking-widest">
              Next
            </span>
            <div className="detail-copy flex items-center gap-3 text-sm font-medium">
              <span>{next.eyebrow.replace(/^\d+\s*\/\s*/, "")}</span>
              <ArrowRightIcon ref={nextArrowRef} size={16} aria-hidden="true" />
            </div>
          </Link>
        </motion.nav>
      </motion.div>
    </>
  );
}
