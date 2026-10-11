"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { FlightCard } from "../data/sections";
import { ArrowLeftIcon } from "../components/icons/arrow-left";
import { ArrowRightIcon } from "../components/icons/arrow-right";

type Project = NonNullable<FlightCard["projects"]>[number];

function fileNumber(index: number) {
  return `03-${String(index + 1).padStart(2, "0")}`;
}

function PendingNote() {
  return (
    <p className="mission-pending">
      Case-study details pending Umar&apos;s notes.
    </p>
  );
}

function MissionDossier({
  project,
  index,
  onClose,
}: {
  project: Project;
  index: number;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="mission-dossier"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <header className="mission-dossier-bar">
        <button ref={closeRef} type="button" onClick={onClose} className="mission-button mission-back">
          <ArrowLeftIcon size={14} aria-hidden="true" />
          Mission log
        </button>
        <p>Mission {fileNumber(index)}</p>
        <span className="mission-status">Selected work</span>
      </header>

      <div className="mission-dossier-scroll">
        <article className="mission-dossier-inner">
          <div className="mission-dossier-intro">
            <p className="mission-code">Project dossier / {project.category}</p>
            <h1 id={titleId}>{project.title}</h1>
            <p className="mission-lede">{project.description}</p>
            <dl className="mission-facts">
              <div><dt>Role</dt><dd>To be added</dd></div>
              <div><dt>Timeframe</dt><dd>To be added</dd></div>
              <div><dt>Status</dt><dd>Selected work</dd></div>
            </dl>
          </div>

          <figure className="mission-visual">
            <Image
              src={project.image}
              alt={`${project.title} project preview`}
              fill
              sizes="100vw"
              className={project.imageFit === "contain" ? "object-contain p-4" : "object-cover"}
              priority
            />
          </figure>

          <div className="mission-chapters">
            <section>
              <p className="mission-chapter-no">01 / Challenge</p>
              <h2>What needed to change</h2>
              <p>{project.description}</p>
            </section>
            <section>
              <p className="mission-chapter-no">02 / My role</p>
              <h2>What I owned</h2>
              <PendingNote />
            </section>
            <section>
              <p className="mission-chapter-no">03 / Decisions</p>
              <h2>Choices that shaped the build</h2>
              <PendingNote />
            </section>
            <section>
              <p className="mission-chapter-no">04 / Solution</p>
              <h2>How the system works</h2>
              <PendingNote />
            </section>
            <section>
              <p className="mission-chapter-no">05 / Technology</p>
              <h2>Systems used</h2>
              <ul className="mission-chips">
                {project.stack.map((technology) => <li key={technology}>{technology}</li>)}
              </ul>
            </section>
            <section>
              <p className="mission-chapter-no">06 / Results</p>
              <h2>What improved</h2>
              <PendingNote />
            </section>
          </div>

          <footer className="mission-dossier-footer">
            <p>End of mission {fileNumber(index)}</p>
            <button type="button" onClick={onClose} className="mission-button mission-button-hot">
              Return to projects <ArrowRightIcon size={14} aria-hidden="true" />
            </button>
          </footer>
        </article>
      </div>
    </motion.div>
  );
}

export function ProjectMissionLog({ projects }: { projects: Project[] }) {
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<number | null>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const categories = ["All", ...Array.from(new Set(projects.map((project) => project.category)))];
  const visibleProjects = projects
    .map((project, index) => ({ project, index }))
    .filter(({ project }) => category === "All" || project.category === category);

  const closeDossier = () => {
    setSelected(null);
    requestAnimationFrame(() => returnFocusRef.current?.focus());
  };

  return (
    <>
      <section className="mission-log" aria-labelledby="mission-log-title">
        <header className="mission-log-head">
          <div>
            <p className="mission-code">03 / Selected work</p>
            <h1 id="mission-log-title">Mission log</h1>
          </div>
          <p>Project files covering product interfaces, enterprise systems, and frontend architecture.</p>
        </header>

        <div className="mission-filter" role="group" aria-label="Filter project files">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              className="mission-button"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mission-files">
          {visibleProjects.map(({ project, index }) => (
            <article key={project.title} className="mission-file" data-file={`File ${fileNumber(index)}`}>
              <div className="mission-file-visual">
                <Image
                  src={project.image}
                  alt=""
                  fill
                  sizes="(max-width: 720px) 100vw, 260px"
                  className={project.imageFit === "contain" ? "object-contain p-3" : "object-cover"}
                />
              </div>
              <div className="mission-file-body">
                <p className="mission-code">{project.category}</p>
                <h2>{project.title}</h2>
                <p>{project.description}</p>
                <ul className="mission-chips">
                  {project.stack.map((technology) => <li key={technology}>{technology}</li>)}
                </ul>
                <div className="mission-file-actions">
                  <button
                    type="button"
                    className="mission-button mission-button-hot"
                    onClick={(event) => {
                      returnFocusRef.current = event.currentTarget;
                      setSelected(index);
                    }}
                  >
                    Open mission dossier
                  </button>
                  {project.href && (
                    <a className="mission-button" href={project.href} target="_blank" rel="noreferrer">
                      Open live project
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {selected !== null && (
          <MissionDossier project={projects[selected]} index={selected} onClose={closeDossier} />
        )}
      </AnimatePresence>
    </>
  );
}
