"use client";

import { useEffect, useState, type ReactNode } from "react";

// Wraps long copy that would otherwise blow out a space-constrained card:
// collapses to a fixed preview height with a fade-out cue, and grows to the
// full text on click. Height is animated via max-height rather than true
// "auto" — cheap, and reliable inside the flight's 3D-transformed ancestors,
// where layout-measuring approaches tend to misbehave.
export default function ExpandableText({
  children,
  collapsedHeight = "4.6em",
  expandedHeight = "640px",
  toggleClassName = "",
  className = "",
  forceExpanded = false,
  onExpandedChange,
}: {
  children: ReactNode;
  collapsedHeight?: string;
  expandedHeight?: string;
  toggleClassName?: string;
  className?: string;
  // One-way trigger (e.g. the autopilot tour opening the card for the
  // visitor mid-flight) — after it fires, expansion reverts to ordinary
  // click-driven state, so the visitor can still collapse it again.
  forceExpanded?: boolean;
  // Lets a parent react to the real expanded state (manual toggle or
  // forceExpanded alike) instead of just the one-way forceExpanded trigger.
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (forceExpanded) setExpanded(true);
  }, [forceExpanded]);

  useEffect(() => {
    onExpandedChange?.(expanded);
    // onExpandedChange is passed inline by callers — depending on it would
    // re-fire this on every parent render instead of only on real changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  return (
    <div className={className}>
      <div
        className="relative overflow-hidden transition-[max-height] duration-500 ease-in-out"
        style={{ maxHeight: expanded ? expandedHeight : collapsedHeight }}
      >
        {children}
        {!expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-slate-950/70 to-transparent" />
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          // The card this sits in is itself a click target (opens the
          // section page) — this toggle must not also trigger that.
          e.preventDefault();
          e.stopPropagation();
          setExpanded((prev) => !prev);
        }}
        aria-expanded={expanded}
        className={`relative z-10 mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200/70 transition-colors hover:text-sky-100 ${toggleClassName}`}
      >
        {expanded ? "Show less" : "Read more"}
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="m12 15.5-6-6L7.4 8.1L12 12.7l4.6-4.6L18 9.5z"
          />
        </svg>
      </button>
    </div>
  );
}
