"use client";

import { useEffect, useState, type ReactNode } from "react";

export default function ExpandableText({
  children,
  collapsedHeight = "4.6em",
  expandedHeight = "640px",
  toggleClassName = "",
  className = "",
  forceExpanded = false,
  scrollExpanded = false,
  resetKey,
  onExpandedChange,
}: {
  children: ReactNode;
  scrollExpanded?: boolean;
  collapsedHeight?: string;
  expandedHeight?: string;
  toggleClassName?: string;
  className?: string;
  forceExpanded?: boolean;
  resetKey?: number;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const [prevForceExpanded, setPrevForceExpanded] = useState(forceExpanded);
  if (forceExpanded !== prevForceExpanded) {
    setPrevForceExpanded(forceExpanded);
    if (forceExpanded) setExpanded(true);
  }
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setExpanded(false);
  }

  useEffect(() => {
    onExpandedChange?.(expanded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  return (
    <div className={className}>
      <div
        // Same reason as the chat transcript: Lenis preventDefaults the wheel
        // on `window` to drive the document, so an expanded bio would never
        // scroll — the flight would move instead. Only meaningful while this
        // is actually scrollable, but the attribute is inert otherwise.
        data-lenis-prevent={expanded && scrollExpanded ? "" : undefined}
        className={`relative transition-[max-height] duration-500 ease-in-out ${expanded && scrollExpanded ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}
        style={{ maxHeight: expanded ? expandedHeight : collapsedHeight }}
      >
        {children}
        {!expanded && (
          <div className="flight-copy-fade pointer-events-none absolute inset-x-0 bottom-0 h-6" />
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setExpanded((prev) => !prev);
        }}
        aria-expanded={expanded}
        className={`flight-copy-toggle relative z-10 mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors ${toggleClassName}`}
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
