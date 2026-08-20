"use client";

import {
  motion,
  useMotionTemplate,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { CardPortal } from "./CardPortal";
import SpaceParticles from "./SpaceParticles";

type FlightCard = {
  id: string;
  eyebrow: string;
  eyebrowIcon?: React.ReactNode;
  title: string;
  description: string;
  cta: string;
  align: "left" | "right";
  x: number;
  z: number;
  width: string;
  tone: "light" | "dark";
};

const cards: FlightCard[] = [
  {
    id: "home",
    eyebrowIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
  <path fill="currentColor" d="M5 19v-8.692q0-.384.172-.727t.474-.565l5.385-4.078q.423-.323.966-.323t.972.323l5.385 4.077q.303.222.474.566q.172.343.172.727V19q0 .402-.299.701T18 20h-3.384q-.344 0-.576-.232q-.232-.233-.232-.576v-4.769q0-.343-.232-.575q-.233-.233-.576-.233h-2q-.343 0-.575.233q-.233.232-.233.575v4.77q0 .343-.232.575T9.385 20H6q-.402 0-.701-.299T5 19"></path>
</svg>`,
    eyebrow: "01 / Hello",
    title: "Umar Suhail — Frontend Developer Crafting Immersive Web Experiences",
    description:
      "I build fast, accessible interfaces with React, Next.js, and TypeScript — and add creative WebGL and motion touches that turn product ideas into polished, production-ready UI.",
    cta: "View My Work",
    align: "left",
    x: -320,
    z: 0,
    width: "clamp(420px, 62vw, 980px)",
    tone: "light",
  },
  {
    id: "about",
    eyebrow: "02 / About Me",
    title: "A Design-Minded Engineer Who Sweats the Details",
    description:
      "Years of shipping component systems, design tokens, and animation-rich pages. I care about clean architecture, readable code, and interfaces that feel effortless to use.",
    cta: "More About Me",
    align: "right",
    x: 280,
    z: -950,
    width: "clamp(380px, 50vw, 780px)",
    tone: "light",
  },
  {
    id: "skills",
    eyebrow: "03 / Skills",
    title: "A Toolbox Built for the Modern Web",
    description:
      "React, Next.js, TypeScript, Tailwind CSS, Framer Motion, GSAP, Three.js, Node.js, REST and GraphQL — with testing in Jest and Playwright, and CI/CD pipelines that keep releases boring.",
    cta: "See Full Stack",
    align: "left",
    x: -250,
    z: -1850,
    width: "clamp(400px, 54vw, 840px)",
    tone: "light",
  },
  {
    id: "projects",
    eyebrow: "04 / Projects",
    title: "Featured Work: From Admin Dashboards to 3D Storytelling",
    description:
      "Highlights include a biometric admin platform, an e-commerce storefront with 95+ Lighthouse scores, and this multiverse portfolio — scroll-driven WebGL flight and all.",
    cta: "Browse Projects",
    align: "right",
    x: 260,
    z: -4700,
    width: "clamp(420px, 60vw, 950px)",
    tone: "dark",
  },
  {
    id: "experience",
    eyebrow: "05 / Experience",
    title: "Teams, Products, and Production Lessons",
    description:
      "From startup sprints to enterprise release trains — building admin platforms, migrating legacy UI to React, owning performance budgets, and mentoring juniors on frontend fundamentals.",
    cta: "View Timeline",
    align: "left",
    x: -290,
    z: -5750,
    width: "clamp(390px, 52vw, 800px)",
    tone: "dark",
  },
  {
    id: "opensource",
    eyebrow: "06 / Open Source",
    title: "Sharing Code, Writing, and Small Tools",
    description:
      "I contribute to UI libraries, publish small utilities, and write about animation performance, rendering internals, and pragmatic TypeScript patterns for real projects.",
    cta: "Read & Explore",
    align: "right",
    x: 300,
    z: -6800,
    width: "clamp(410px, 55vw, 880px)",
    tone: "dark",
  },
  {
    id: "contact",
    eyebrow: "07 / Contact",
    title: "Let's Build Something Great Together",
    description:
      "Open to frontend roles and freelance collaborations. Reach me at umarsuhail112@gmail.com, or connect on LinkedIn and GitHub to talk shop.",
    cta: "Get In Touch",
    align: "left",
    x: -220,
    z: -7900,
    width: "clamp(420px, 58vw, 940px)",
    tone: "dark",
  },
];

const sectionProgressMap: Record<string, number> = {
  home: 0,
  about: 0.11,
  skills: 0.22,
  projects: 0.56,
  experience: 0.69,
  opensource: 0.81,
  contact: 0.92,
};

// Dark gray-blue-emerald gradient per card, each with its own blend
const cardGradients = [
  "linear-gradient(135deg, #1e293b 0%, #0c2f4a 48%, #064e3b 100%)",
  "linear-gradient(160deg, #111827 0%, #1e3a5f 55%, #065f46 100%)",
  "linear-gradient(120deg, #0f172a 0%, #134e4a 52%, #1d4ed8 115%)",
  "linear-gradient(150deg, #1f2937 0%, #0e3a5c 42%, #047857 96%)",
  "linear-gradient(125deg, #0b1120 0%, #155e75 58%, #065f46 100%)",
  "linear-gradient(165deg, #1e293b 0%, #064e3b 46%, #1e40af 112%)",
  "linear-gradient(140deg, #111827 8%, #0f3d5c 50%, #059669 108%)",
];

const sectionProgressStops = cards.map((card) => sectionProgressMap[card.id]);

function getActiveSectionId(progress: number) {
  let activeId = cards[0]?.id ?? "home";

  for (let i = 0; i < cards.length; i++) {
    const stop = sectionProgressMap[cards[i].id];
    if (progress >= stop) {
      activeId = cards[i].id;
    }
  }

  return activeId;
}

function getRevealWindow(index: number) {
  if (index === 0) {
    return { start: 0, end: 0.01 };
  }

  const previous = sectionProgressStops[index - 1];
  const current = sectionProgressStops[index];
  const span = Math.max(current - previous, 0.08);

  return {
    start: Math.max(previous + span * 0.74, 0),
    end: Math.min(current + span * 0.16, 1),
  };
}

function getFocusWindow(index: number) {
  const current = sectionProgressStops[index];
  const previous = index > 0 ? sectionProgressStops[index - 1] : 0;
  const next =
    index < sectionProgressStops.length - 1
      ? sectionProgressStops[index + 1]
      : 1;

  const leftSpan = Math.max(current - previous, 0.08);
  const rightSpan = Math.max(next - current, 0.08);

  return {
    start: Math.max(current - leftSpan * 0.7, 0),
    peak: current,
    end: Math.min(current + rightSpan * 0.65, 1),
  };
}

function BillboardCard({
  card,
  index,
  isMobile,
  scrollYProgress,
  revealStart,
  revealEnd,
}: {
  card: FlightCard;
  index: number;
  isMobile: boolean;
  scrollYProgress: MotionValue<number>;
  revealStart: number;
  revealEnd: number;
}) {
  const alignmentClass =
    isMobile || card.align === "left"
      ? "items-start text-left"
      : "items-end text-right";
  const titleClass = "text-sky-50";
  const bodyClass = "text-slate-100/90";
  const panelClass =
    "border-white/20 shadow-[0_24px_90px_rgba(2,8,23,0.52)]";
  const badgeClass = "border-emerald-200/20 bg-emerald-200/10 text-emerald-100";
  const buttonClass =
    "border-sky-200/25 bg-white/10 text-sky-50 hover:bg-white/16";
  const cardGradient = cardGradients[index % cardGradients.length];
  const baseRotate = isMobile ? 0 : card.align === "left" ? 8 : -8;
  const focus = getFocusWindow(index);
  const upcomingOpacity = useTransform(
    scrollYProgress,
    [0, revealStart, revealEnd, 1],
    [index === 0 ? 1 : 0.22, index === 0 ? 1 : 0.42, 1, 1],
  );
  const upcomingBlur = useTransform(
    scrollYProgress,
    [0, revealStart, revealEnd, 1],
    [index === 0 ? 0 : 2, index === 0 ? 0 : 1.2, 0, 0],
  );
  const upcomingScale = useTransform(
    scrollYProgress,
    [0, revealStart, revealEnd, 1],
    [index === 0 ? 1 : 0.95, index === 0 ? 1 : 0.97, 1, 1],
  );
  const straightening = useTransform(
    scrollYProgress,
    [focus.start, focus.peak, focus.end],
    [0, 1, 0],
  );
  const activeRotateY = useTransform(
    straightening,
    (v) => baseRotate * Math.max(0, 1 - v * 1.45),
  );
  const activeReadabilityBoost = useTransform(straightening, [0, 1], [0, 1]);
  const effectiveBlur = useTransform(
    () => upcomingBlur.get() * (1 - straightening.get()),
  );
  const effectiveOpacity = useTransform(() =>
    Math.min(1, upcomingOpacity.get() + activeReadabilityBoost.get() * 0.38),
  );
  const cardFilter = useMotionTemplate`blur(${effectiveBlur}px)`;

  return (
    <motion.div
      style={{
        width: isMobile ? "min(90vw, 420px)" : card.width,
        translateX: isMobile ? 0 : card.x,
        translateZ: card.z,
        rotateY: activeRotateY,
        opacity: effectiveOpacity,
        filter: cardFilter,
        scale: upcomingScale,
        background: cardGradient,
      }}
      animate={{ y: [0, -6 - (index % 3) * 2, 0] }}
      transition={{
        duration: 6 + index * 0.25,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={`absolute flex rounded-3xl border p-5 sm:rounded-4xl sm:p-8 lg:p-10 ${panelClass}`}
    >
      <div
        className={`flex w-full items-stretch gap-5 sm:gap-8 ${
          !isMobile && card.align === "right" ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <motion.div
          className={`flex min-w-0 flex-1 flex-col ${alignmentClass}`}
          style={{
            opacity: useTransform(activeReadabilityBoost, [0, 1], [0.9, 1]),
          }}
        >
          <span
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] ${badgeClass}`}
          >
            {card.eyebrow}
          </span>
          <h2
            className={`mt-5 max-w-[22ch] text-2xl font-semibold leading-tight sm:mt-6 sm:text-3xl lg:text-5xl ${titleClass}`}
            style={{ color: "#f0f9ff" }}
          >
            {card.title}
          </h2>
          <p
            className={`mt-4 max-w-[38ch] text-sm leading-6 sm:mt-5 sm:text-base sm:leading-7 lg:text-xl ${bodyClass}`}
            style={{ color: "rgba(241, 245, 249, 0.92)" }}
          >
            {card.description}
          </p>
          <button
            type="button"
            className={`mt-6 rounded-full border px-6 py-3 text-sm font-semibold transition duration-300 hover:-translate-y-1 sm:mt-8 ${buttonClass}`}
          >
            {card.cta}
          </button>
        </motion.div>

        {/* Portal window into the multiverse */}
        <div className="relative hidden w-[38%] min-h-65 shrink-0 overflow-hidden rounded-2xl sm:block lg:rounded-3xl">
          <CardPortal
            index={index}
            scrollYProgress={scrollYProgress}
            align={card.align}
          />
        </div>
      </div>
    </motion.div>
  );
}

function MobileCard({ card, index }: { card: FlightCard; index: number }) {
  const titleClass = "text-sky-50";
  const bodyClass = "text-slate-100/90";
  const panelClass = "border-white/15 shadow-[0_18px_40px_rgba(2,8,23,0.35)]";
  const badgeClass = "border-emerald-200/20 bg-emerald-200/10 text-emerald-100";
  const buttonClass = "border-sky-200/25 bg-white/10 text-sky-50";

  return (
    <section
      id={`section-${card.id}`}
      className={`w-full rounded-3xl border p-5 sm:p-6 ${panelClass}`}
      style={{ background: cardGradients[index % cardGradients.length] }}
    >
      <div className="flex w-full flex-col items-start text-left">
        <span
          className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] ${badgeClass}`}
        >
          {card.eyebrow}
        </span>
        <h2
          className={`mt-4 text-2xl font-semibold leading-tight ${titleClass}`}
          style={{ color: "#f0f9ff" }}
        >
          {card.title}
        </h2>
        <p
          className={`mt-3 text-sm leading-6 ${bodyClass}`}
          style={{ color: "rgba(241, 245, 249, 0.92)" }}
        >
          {card.description}
        </p>
        <button
          type="button"
          className={`mt-5 rounded-full border px-5 py-2.5 text-sm font-semibold transition duration-300 ${buttonClass}`}
        >
          {card.cta}
        </button>
      </div>
    </section>
  );
}

export default function MultiverseFlight() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    onResize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const zCamera = useTransform(
    scrollYProgress,
    [0, 1],
    [0, isMobile ? 7800 : 8400],
  );
  const topColor = useTransform(
    scrollYProgress,
    [0, 0.28, 0.44, 0.62, 1],
    ["#0b1226", "#0a1122", "#0f172a", "#040b1f", "#020617"],
  );
  const bottomColor = useTransform(
    scrollYProgress,
    [0, 0.28, 0.44, 0.62, 1],
    ["#101b3a", "#0d1730", "#091225", "#020617", "#01030a"],
  );
  const sceneBackground = useMotionTemplate`linear-gradient(180deg, ${topColor} 0%, ${bottomColor} 100%)`;
  const heroImageOpacity = useTransform(
    scrollYProgress,
    [0, 0.16, 0.26],
    [1, 1, 0],
  );
  const heroImageX = useTransform(scrollYProgress, [0, 0.26], [0, 120]);
  const heroImageScale = useTransform(
    scrollYProgress,
    [0, 0.2, 0.26],
    [1, 1.06, 0.84],
  );
  const lightGlowOpacity = useTransform(
    scrollYProgress,
    [0, 0.28, 0.42],
    [1, 0.8, 0],
  );
  const deepGlowOpacity = useTransform(
    scrollYProgress,
    [0.42, 0.58, 1],
    [0, 0.8, 1],
  );

  useEffect(() => {
    const handleNavigation = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string }>;
      const targetId = customEvent.detail?.id;
      const targetProgress = targetId
        ? sectionProgressMap[targetId]
        : undefined;
      const container = containerRef.current;

      if (window.innerWidth < 1024 && targetId) {
        document.getElementById(`section-${targetId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }

      if (targetProgress === undefined || !container) {
        return;
      }

      const containerTop =
        window.scrollY + container.getBoundingClientRect().top;
      const scrollableHeight = container.offsetHeight - window.innerHeight;

      window.scrollTo({
        top: containerTop + scrollableHeight * targetProgress,
        behavior: "smooth",
      });
    };

    window.addEventListener(
      "navigate-flight-section",
      handleNavigation as EventListener,
    );

    return () => {
      window.removeEventListener(
        "navigate-flight-section",
        handleNavigation as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (value) => {
      const progress = Math.min(1, Math.max(0, value));
      const activeId = getActiveSectionId(progress);

      window.dispatchEvent(
        new CustomEvent("flight-progress-update", {
          detail: { progress, activeId },
        }),
      );
    });

    return () => {
      unsubscribe();
    };
  }, [scrollYProgress]);

  if (isMobile) {
    return (
      <div
        ref={containerRef}
        className="relative min-h-screen w-full overflow-x-hidden bg-transparent pt-24"
      >
        <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
          {cards.map((card, index) => (
            <MobileCard key={card.id} card={card} index={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="relative h-[1100vh] w-full bg-transparent"
      >
        <div className="sticky top-0 flex h-screen w-screen items-center justify-center overflow-hidden [perspective:1100px]">
          <motion.div
            className="absolute inset-0"
            style={{ background: sceneBackground, opacity: 0.8 }}
          />
          <motion.div
            className="absolute inset-x-0 top-0 h-[45vh] bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.22),_transparent_62%)]"
            style={{ opacity: lightGlowOpacity }}
          />
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,_rgba(56,189,248,0.12),_transparent_48%)]"
            style={{ opacity: deepGlowOpacity }}
          />
          <SpaceParticles />
{/* 
          <motion.div
            className="pointer-events-none absolute right-[7vw] top-1/2 hidden h-[52vh] w-[24vw] min-w-[260px] -translate-y-1/2 rounded-[2.2rem] border border-white/40 bg-white/10 p-6 backdrop-blur-md lg:flex"
            style={{
              opacity: heroImageOpacity,
              x: heroImageX,
              scale: heroImageScale,
            }}
            animate={{ y: [0, -14, 0], rotateZ: [0, 1.2, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="relative flex w-full items-center justify-center overflow-hidden rounded-[1.8rem]">
              <Image
                src="/EFR-3D.png"
                alt="EFR 3D Logo"
                width={520}
                height={360}
                className="h-full w-full object-contain"
                priority
              />
            </div>
          </motion.div> */}

          <motion.div
            style={{
              translateZ: zCamera,
              transformStyle: "preserve-3d",
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {cards.map((card, index) => (
              <BillboardCard
                key={card.id}
                card={card}
                index={index}
                isMobile={isMobile}
                scrollYProgress={scrollYProgress}
                revealStart={getRevealWindow(index).start}
                revealEnd={getRevealWindow(index).end}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </>
  );
}
