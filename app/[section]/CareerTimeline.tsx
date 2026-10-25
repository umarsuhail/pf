"use client";

import { useState, useSyncExternalStore } from "react";
import type { FlightCard } from "../data/sections";

type Job = NonNullable<FlightCard["timeline"]>[number];

// A career laid out against real time.
//
// The previous version stacked each role in an evenly-spaced list, which made
// a two-year run and a six-year one look identical — the one thing a career
// timeline is supposed to tell you. Every entry is now measured: `start` and
// `end` are YYYY-MM, the axis runs from the earliest start to today, and a
// role's bar is as long as the role was.
//
// Laid out in months rather than pixels so the scale survives a new job being
// added at either end without anything being re-tuned.

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** YYYY-MM to an absolute month index, so arithmetic is just subtraction. */
function toMonths(value: string) {
  const [year, month] = value.split("-").map(Number);
  return year * 12 + (month - 1);
}

function fromMonths(index: number) {
  return { year: Math.floor(index / 12), month: index % 12 };
}

function monthsToYears(count: number) {
  const years = Math.floor(count / 12);
  const months = count % 12;
  if (years && months) return `${years}y ${months}m`;
  if (years) return `${years}y`;
  return `${months}m`;
}

function readNowMonths() {
  const now = new Date();
  return now.getFullYear() * 12 + now.getMonth();
}

/** The newest month anything in the data mentions — the server's best guess. */
function latestKnownMonth(jobs: Job[]) {
  return jobs.reduce(
    (latest, job) => Math.max(latest, toMonths(job.end ?? job.start)),
    0,
  );
}

export function CareerTimeline({ jobs }: { jobs: Job[] }) {
  const [openId, setOpenId] = useState<string | null>(jobs[0]?.company ?? null);

  // Read through an external store rather than during render. `new Date()`
  // in a client component is non-deterministic, which Next refuses to
  // prerender — the server answers with the newest month the data itself
  // knows about, and the browser corrects it to the real one on hydration.
  // Only an ongoing role depends on it, and only for the length of its bar.
  const nowMonths = useSyncExternalStore(
    () => () => {},
    readNowMonths,
    () => latestKnownMonth(jobs),
  );

  if (!jobs.length) return null;

  const spans = jobs.map((job) => {
    const start = toMonths(job.start);
    const end = job.end ? toMonths(job.end) : nowMonths;
    return { job, start, end, length: Math.max(end - start, 1) };
  });

  const axisStart = Math.min(...spans.map((s) => s.start));
  const axisEnd = Math.max(...spans.map((s) => s.end));
  const axisSpan = Math.max(axisEnd - axisStart, 1);

  // A tick per calendar year inside the range.
  const firstYear = fromMonths(axisStart).year;
  const lastYear = fromMonths(axisEnd).year;
  const years = Array.from(
    { length: lastYear - firstYear + 1 },
    (_, i) => firstYear + i,
  );

  const positionOf = (months: number) =>
    ((months - axisStart) / axisSpan) * 100;

  return (
    <div className="mt-10">
      {/* The axis. Years are absolute positions on the same scale the bars
          use, so a tick always lines up with the month it names. */}
      <div className="relative mb-3 hidden h-5 sm:block" aria-hidden="true">
        {years.map((year) => {
          const left = positionOf(year * 12);
          if (left < -2 || left > 102) return null;
          return (
            <span
              key={year}
              className="detail-muted absolute top-0 -translate-x-1/2 text-[10px] font-semibold tracking-widest"
              style={{ left: `${left}%` }}
            >
              {year}
            </span>
          );
        })}
      </div>

      <ol className="space-y-3">
        {spans.map(({ job, start, length }) => {
          const isOpen = openId === job.company;
          const left = positionOf(start);
          const width = (length / axisSpan) * 100;
          const started = fromMonths(start);

          return (
            <li key={job.company} className="detail-timeline-row">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : job.company)}
                aria-expanded={isOpen}
                className="group w-full text-left"
              >
                {/* The measured bar. Hidden below `sm` — at phone width a
                    proportional bar is a few pixels wide and says nothing. */}
                <div className="relative hidden h-7 w-full sm:block">
                  <div className="detail-rule absolute inset-x-0 top-1/2 h-px" />
                  <div
                    className="absolute top-1/2 flex h-5 -translate-y-1/2 items-center rounded-full border px-2 transition-colors"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      minWidth: "3rem",
                      borderColor: isOpen
                        ? "var(--mission-accent)"
                        : "var(--mission-line)",
                      background: isOpen
                        ? "color-mix(in srgb, var(--mission-accent) 18%, transparent)"
                        : "color-mix(in srgb, var(--mission-ink) 7%, transparent)",
                    }}
                  >
                    <span className="detail-muted truncate text-[10px] font-semibold uppercase tracking-widest">
                      {monthsToYears(length)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-1">
                  <h3 className="detail-ink text-base font-semibold sm:text-lg">
                    {job.role} — {job.company}
                  </h3>
                  <p className="detail-muted text-xs font-semibold uppercase tracking-widest">
                    {job.period} · {job.location}
                  </p>
                  <span className="detail-muted ml-auto text-[10px] uppercase tracking-widest opacity-70 transition-opacity group-hover:opacity-100">
                    {isOpen ? "Hide" : "Details"}
                  </span>
                </div>
              </button>

              {/* Collapsed by default so the shape of the career reads first
                  and the detail is there when you want it. */}
              {isOpen && (
                <div className="mt-3 border-l pl-5 detail-timeline">
                  <p className="detail-copy max-w-[72ch] text-sm leading-relaxed">
                    {job.summary}
                  </p>

                  {job.highlights?.length ? (
                    <ul className="mt-4 space-y-1.5">
                      {job.highlights.map((line) => (
                        <li
                          key={line}
                          className="detail-copy flex gap-2.5 text-sm leading-relaxed"
                        >
                          <span
                            aria-hidden="true"
                            className="detail-timeline-dot mt-2 h-1 w-1 shrink-0 rounded-full"
                          />
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {job.projects?.length ? (
                    <div className="mt-4">
                      <p className="detail-muted text-[10px] font-semibold uppercase tracking-[0.28em]">
                        Worked on
                      </p>
                      <ul className="mt-2 space-y-1">
                        {job.projects.map((project) => (
                          <li key={project.name} className="text-sm">
                            <span className="detail-ink font-medium">
                              {project.name}
                            </span>
                            <span className="detail-muted"> — {project.note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {job.stack?.length ? (
                    <ul className="mt-4 flex flex-wrap gap-1.5">
                      {job.stack.map((item) => (
                        <li
                          key={item}
                          className="detail-muted rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-widest"
                          style={{ borderColor: "var(--mission-line)" }}
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <p className="detail-muted mt-4 text-[10px] uppercase tracking-widest opacity-60">
                    Started {MONTH_LABELS[started.month]} {started.year}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
