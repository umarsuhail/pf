"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const navLinks = [
  {
    label: "Home",
    id: "home",
    svgPath: (
      <path
        fill="currentColor"
        d="M10 19v-5h4v5c0 .55.45 1 1 1h3c.55 0 1-.45 1-1v-7h1.7c.46 0 .68-.57.33-.87L12.67 3.6c-.38-.34-.96-.34-1.34 0l-8.36 7.53c-.34.3-.13.87.33.87H5v7c0 .55.45 1 1 1h3c.55 0 1-.45 1-1"
      ></path>
    ),
  },
  {
    label: "Skills",
    id: "skills",
    svgPath: (
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7V5a2 2 0 0 1 2-2h2m10 0h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2m5-3s1.5 2 4 2s4-2 4-2M9 9h.01M15 9h.01"
      ></path>
    ),
  },
  {
    label: "Projects",
    id: "projects",
    svgPath: (
      <g fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          d="M5.143 14A7.8 7.8 0 0 1 4 9.919C4 5.545 7.582 2 12 2s8 3.545 8 7.919A7.8 7.8 0 0 1 18.857 14"
        ></path>
        <path d="M7.383 17.098c-.092-.276-.138-.415-.133-.527a.6.6 0 0 1 .382-.53c.104-.041.25-.041.54-.041h7.656c.291 0 .436 0 .54.04a.6.6 0 0 1 .382.531c.005.112-.041.25-.133.527c-.17.511-.255.767-.386.974a2 2 0 0 1-1.2.869c-.238.059-.506.059-1.043.059h-3.976c-.537 0-.806 0-1.043-.06a2 2 0 0 1-1.2-.868c-.131-.207-.216-.463-.386-.974ZM15 19l-.13.647c-.14.707-.211 1.06-.37 1.34a2 2 0 0 1-1.113.912C13.082 22 12.72 22 12 22s-1.082 0-1.387-.1a2 2 0 0 1-1.113-.913c-.159-.28-.23-.633-.37-1.34L9 19"></path>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m12.308 12l-1.461-4.521A.72.72 0 0 0 10.154 7a.72.72 0 0 0-.693.479L8 12m7-5v5m-6.462-1.5h3.231"
        ></path>
      </g>
    ),
  },
  {
    label: "Experience",
    id: "experience",
    svgPath: (
      <path
        fill="currentColor"
        d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h11l5 5v11q0 .825-.587 1.413T19 21zm2-4h10v-2H7zm0-4h10v-2H7zm8-4h4l-4-4zM7 9h5V7H7z"
      ></path>
    ),
  },
  {
    label: "Contact",
    id: "contact",
    svgPath: (
      <path
        fill="currentColor"
        d="M13.17 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8.83c0-.53-.21-1.04-.59-1.41l-4.83-4.83c-.37-.38-.88-.59-1.41-.59M12 10c1.1 0 2 .9 2 2s-.9 2-2 2s-2-.9-2-2s.9-2 2-2m4 8H8v-.57c0-.81.48-1.53 1.22-1.85a6.95 6.95 0 0 1 5.56 0A2.01 2.01 0 0 1 16 17.43z"
      ></path>
    ),
  },
];

function navigateToSection(id: string) {
  window.dispatchEvent(
    new CustomEvent("navigate-flight-section", { detail: { id } }),
  );
}

const sectionProgressMap: Record<string, number> = {
  home: 0,
  skills: 0.22,
  projects: 0.56,
  experience: 0.69,
  contact: 0.92,
};

// Framer's `layout` measures with getBoundingClientRect, so it only behaves
// on elements outside a 3D perspective context — this pill is fixed to the
// viewport, well clear of the flight scene's transforms.
const PILL_SPRING = { type: "spring", stiffness: 320, damping: 32, mass: 0.7 } as const;

export default function NeumorphicNavbar() {
  const [activeId, setActiveId] = useState("home");
  const [journeyProgress, setJourneyProgress] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPillOpen, setIsPillOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    if (!isPillOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsPillOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPillOpen]);

  useEffect(() => {
    const handleProgressUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        progress?: number;
        activeId?: string;
      }>;
      const progress = customEvent.detail?.progress;
      const nextActive = customEvent.detail?.activeId;

      if (typeof progress === "number") {
        setJourneyProgress(Math.min(1, Math.max(0, progress)));
      }

      if (nextActive) {
        setActiveId(nextActive);
      }
    };

    window.addEventListener(
      "flight-progress-update",
      handleProgressUpdate as EventListener,
    );

    return () => {
      window.removeEventListener(
        "flight-progress-update",
        handleProgressUpdate as EventListener,
      );
    };
  }, []);

  const handleNavigate = (id: string) => {
    setActiveId(id);
    setJourneyProgress(sectionProgressMap[id] ?? 0);
    navigateToSection(id);
  };

  return (
    <>
      {/* Collapsed: a single round button. Tap it and the pill grows sideways
         into a horizontal card of section links. */}
      <div className="fixed left-1/2 top-3 z-50 -translate-x-1/2 sm:top-6">
        <motion.nav
          layout
          transition={PILL_SPRING}
          aria-label="Sections"
          className="flex items-center gap-1 overflow-hidden rounded-full border border-white/15 bg-slate-950/70 p-1.5 shadow-[0_8px_32px_rgba(2,8,23,0.55)] backdrop-blur-md"
        >
          <motion.button
            layout
            type="button"
            onClick={() => setIsPillOpen((prev) => !prev)}
            aria-expanded={isPillOpen}
            aria-label={isPillOpen ? "Close section menu" : "Open section menu"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sky-100 transition-colors hover:bg-white/20"
          >
            <motion.svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              animate={{ rotate: isPillOpen ? 90 : 0 }}
              transition={PILL_SPRING}
            >
              <path
                fill="currentColor"
                d={
                  isPillOpen
                    ? "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                    : "M3 18h18v-2H3zm0-5h18v-2H3zm0-7v2h18V6z"
                }
              />
            </motion.svg>
          </motion.button>

          <motion.button
            layout
            type="button"
            onClick={() => setShowSidebar((prev) => !prev)}
            aria-pressed={showSidebar}
            aria-label={showSidebar ? "Hide side navigation" : "Show side navigation"}
            title={showSidebar ? "Hide side navigation" : "Show side navigation"}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
              showSidebar
                ? "bg-(--accent) text-slate-950"
                : "bg-white/10 text-sky-100 hover:bg-white/20"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <line x1="9" y1="4" x2="9" y2="20" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </motion.button>

          <AnimatePresence initial={false}>
            {isPillOpen &&
              navLinks.map((link, i) => {
                const isActive = activeId === link.id;
                return (
                  <motion.button
                    key={link.id}
                    layout
                    type="button"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ ...PILL_SPRING, delay: i * 0.035 }}
                    onClick={() => {
                      handleNavigate(link.id);
                      setIsPillOpen(false);
                    }}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                      isActive
                        ? "bg-(--accent) text-slate-950"
                        : "text-sky-100/70 hover:bg-white/10 hover:text-sky-50"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      {link.svgPath}
                    </svg>
                    {link.label}
                  </motion.button>
                );
              })}
          </AnimatePresence>
        </motion.nav>

        {/* <nav className="relative flex items-center justify-between rounded-2xl border border-white/70 bg-gray-100/95 px-3 py-2 shadow-md backdrop-blur-sm sm:h-20 sm:rounded-full sm:px-4 sm:py-0 sm:shadow-[8px_8px_16px_#d1d5db,-8px_-8px_16px_#ffffff]">
          <div className="hidden items-center gap-3 lg:flex">
            {navLinks.map((link) => {
              const isActive = activeId === link.id;

              return (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => handleNavigate(link.id)}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ease-in-out focus:outline-none active:scale-95 ${
                    isActive
                      ? "bg-(--accent) text-white shadow-[inset_2px_2px_6px_rgba(255,255,255,0.25),0_8px_20px_rgba(18,70,119,0.35)]"
                      : "bg-gray-100 text-(--accent) shadow-[4px_4px_8px_#d1d5db,-4px_-4px_8px_#ffffff] hover:shadow-[inset_4px_4px_8px_#d1d5db,inset_-4px_-4px_8px_#ffffff]"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {link.label}
                </button>
              );
            })}
          </div>

          <div className="hidden items-center gap-2 pr-2 md:flex">
            <button
              type="button"
              onClick={() => handleNavigate("services")}
              className="rounded-full bg-gray-100 px-8 py-3 text-sm font-bold text-(--accent) transition-all duration-300 ease-in-out shadow-[4px_4px_8px_#d1d5db,-4px_-4px_8px_#ffffff] hover:shadow-[inset_4px_4px_8px_#d1d5db,inset_-4px_-4px_8px_#ffffff] active:scale-95 focus:outline-none"
            >
              Book a Demo
            </button>

            <button
              type="button"
              aria-label="Go to Home"
              onClick={() => handleNavigate("home")}
              className="flex items-center justify-center rounded-full border border-white/75 bg-white/70 p-2 shadow-sm"
            >
              <Image
                src="/ef-r-logo.png"
                alt="EFR Company Logo"
                width={36}
                height={36}
                className="h-8 w-8 object-contain"
              />
            </button>
          </div>

          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="mr-1 rounded-xl border border-white/80 bg-gray-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-(--accent) shadow-sm transition-all duration-300 active:scale-95 lg:hidden"
          >
            {isMenuOpen ? "Close" : "Menu"}
          </button>

          {isMenuOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.6rem)] rounded-2xl border border-white/80 bg-gray-100/98 p-3 shadow-xl lg:hidden">
              <div className="grid grid-cols-1 gap-2">
                {navLinks.map((link) => (
                  <button
                    key={link.label}
                    type="button"
                    onClick={() => handleNavigate(link.id)}
                    className={`rounded-xl px-4 py-3 text-left text-sm font-semibold ${
                      activeId === link.id
                        ? "bg-(--accent) text-white"
                        : "bg-gray-100 text-(--accent) shadow-[inset_2px_2px_6px_#d1d5db,inset_-2px_-2px_6px_#ffffff]"
                    }`}
                    aria-current={activeId === link.id ? "page" : undefined}
                  >
                    {link.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleNavigate("services")}
                  className="mt-1 rounded-xl bg-(--accent) px-4 py-3 text-sm font-semibold text-white"
                >
                  Book a Demo
                </button>
              </div>
            </div>
          )}
        </nav> */}
      </div>

      <motion.aside
        initial={false}
        animate={{ opacity: showSidebar ? 1 : 0, x: showSidebar ? 0 : 24 }}
        transition={PILL_SPRING}
        style={{ pointerEvents: showSidebar ? "auto" : "none" }}
        aria-hidden={!showSidebar}
        className="fixed right-2 top-1/2 z-40 flex -translate-y-1/2 flex-col sm:right-4"
      >
        <button
          type="button"
          className="p-2 rounded-md cursor-pointer border-white/45 bg-white/70 px-3 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.14)] backdrop-blur-sm  mb-2"
          onClick={() => handleNavigate("home")}
        >
          <Image
            src="/images/us.png"
            alt="Umar Suhail"
            width={150}
            height={128}
            priority
            className="h-10 w-auto object-contain sm:h-12"
          />
        </button>
        <div className={`flex absolute top-[80px] right-0 items-center gap-3 rounded-2xl border border-white/45 bg-white/70 pl-2 pr-3 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.14)] backdrop-blur-sm transition-all duration-300`}>
          <div className="flex h-88 flex-col items-center justify-between [@media(max-height:560px)]:h-56">
            {navLinks.map((link) => {
              const isActive = activeId === link.id;
              return (
                <button
                  key={`dot-${link.id}`}
                  type="button"
                  onClick={() => handleNavigate(link.id)}
                  aria-label={`Go to ${link.label}`}
                  title={link.label}
                  className=" flex w-full justify-between gap-2 rounded-md px-1 py-1"
                >
                  <svg
                    min={20}
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                  >
                    {link.svgPath}
                  </svg>
                  {!isCollapsed && (
                    <span
                      className={`pointer-events-none whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors ${isActive ? "text-(--accent)" : "text-slate-500"
                        }`}
                    >
                      {link.label}
                    </span>
                  )}
                  <span
                    className={`h-3.5 w-3.5 rounded-full border transition-all duration-300 ${isActive
                        ? "scale-110 border-white bg-(--accent) shadow-[0_0_0_4px_rgba(18,70,119,0.2)]"
                        : "border-slate-300 bg-white hover:border-(--accent)"
                      }`}
                  />
                </button>
              );
            })}
          </div>

          {!isCollapsed && (
            <div className="relative h-88 w-2.5 rounded-full bg-slate-200 [@media(max-height:560px)]:h-56">
              <div
                className="absolute bottom-0 left-0 w-full rounded-full bg-[linear-gradient(180deg,#2f78bc_0%,#124677_100%)] transition-[height] duration-500"
                style={{ height: `${Math.max(6, journeyProgress * 100)}%` }}
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="mt-2 absolute top-[55px] left-[-10px] self-center rounded-full border border-white/45 bg-white/70 p-1.5 shadow-[0_4px_12px_rgba(15,23,42,0.12)] backdrop-blur-sm transition-all duration-300 hover:bg-white/90"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            className={`text-[#124677] transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
          >
            <path
              fill="currentColor"
              d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"
            />
          </svg>
        </button>
      </motion.aside>
    </>
  );
}
