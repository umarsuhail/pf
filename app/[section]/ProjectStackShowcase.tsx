import Image from "next/image";
import { ProjectVisual } from "./ProjectVisual";
import type { CSSProperties } from "react";
import type { FlightCard } from "../data/sections";

type Project = NonNullable<FlightCard["projects"]>[number];

const CARD_PLACEMENT = [
  { top: "1%", left: "1%", rotate: "-3.5deg" },
  { top: "17%", left: "5%", rotate: "-1.5deg" },
  { top: "33%", left: "2%", rotate: "1deg" },
  { top: "49%", left: "6%", rotate: "-0.5deg" },
  { top: "65%", left: "3%", rotate: "2deg" },
  { top: "81%", left: "7%", rotate: "3.5deg" },
] as const;

function ProjectPreview({
  project,
  index,
}: {
  project: Project;
  index: number;
}) {
  const placement = CARD_PLACEMENT[index % CARD_PLACEMENT.length];
  const desktopStyle = {
    "--stack-top": placement.top,
    "--stack-left": placement.left,
    "--stack-rotate": placement.rotate,
    zIndex: index + 1,
  } as CSSProperties;

  return (
    <article
      style={desktopStyle}
      className="detail-project-card group relative min-w-[82%] snap-center overflow-hidden rounded-2xl border transition-[transform,border-color,box-shadow] duration-300 ease-out sm:min-w-[66%] lg:absolute lg:left-[var(--stack-left)] lg:top-[var(--stack-top)] lg:h-[19%] lg:w-[93%] lg:min-w-0 lg:rotate-[var(--stack-rotate)] lg:hover:z-50 lg:hover:-translate-x-3 lg:hover:rotate-0 lg:hover:scale-[1.015]"
    >
      <div className="grid h-full grid-rows-[7.5rem_auto] lg:grid-cols-[34%_1fr] lg:grid-rows-1">
        <div className="detail-project-visual relative overflow-hidden border-b lg:border-b-0 lg:border-r">
          <div className="absolute inset-0 opacity-80 saturate-[0.85] transition-transform duration-500 ease-out group-hover:scale-[1.04]">
            <ProjectVisual
              project={project}
              sizes="(max-width: 640px) 82vw, (max-width: 1024px) 66vw, 18vw"
              padding="p-2"
            />
          </div>
          <div className="detail-project-veil absolute inset-0" />
          <span className="detail-project-tag absolute left-2.5 top-2.5 rounded-full border px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.2em]">
            Preview {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <div className="flex min-w-0 flex-col justify-center px-4 py-3 lg:px-3.5 lg:py-2">
          <p className="detail-accent text-[9px] font-semibold uppercase tracking-[0.24em]">
            {project.category}
          </p>
          <h3 className="detail-ink mt-1 line-clamp-2 text-sm font-semibold leading-snug lg:text-[13px]">
            {project.title}
          </h3>
          <p className="detail-copy mt-1.5 line-clamp-2 text-xs leading-relaxed lg:text-[10px] lg:leading-[1.45]">
            {project.description}
          </p>
        </div>
      </div>
    </article>
  );
}

export function ProjectStackShowcase({ projects }: { projects: Project[] }) {
  return (
    <figure className="detail-project-stage relative isolate overflow-hidden rounded-[2rem] border px-4 pb-5 pt-7 sm:px-8 sm:pb-8 lg:min-h-[620px] lg:p-0">
      <div className="detail-project-stage-glow absolute inset-0" />
      <div
        aria-hidden="true"
        className="detail-project-grid absolute inset-0 opacity-30 [background-size:30px_30px] [mask-image:linear-gradient(to_right,black,transparent_68%)]"
      />

      <div className="relative z-10 mx-auto aspect-square w-[min(54vw,13rem)] lg:absolute lg:left-[7%] lg:top-1/2 lg:w-[36%] lg:max-w-[17rem] lg:-translate-y-1/2">
        <span
          aria-hidden="true"
          className="detail-project-orbit-primary absolute inset-[2%] rounded-full border"
        />
        <span
          aria-hidden="true"
          className="detail-project-orbit-secondary absolute inset-[14%] rounded-full border border-dashed"
        />
        <span
          aria-hidden="true"
          className="detail-project-orbit-tertiary absolute left-1/2 top-1/2 h-[46%] w-[116%] -translate-x-1/2 -translate-y-1/2 rotate-[-13deg] rounded-[50%] border"
        />
        <div className="absolute inset-[17%]">
          <Image
            src="/images/us2.png"
            alt="US2 portfolio mark"
            fill
            sizes="(max-width: 1024px) 54vw, 17rem"
            className="detail-project-logo object-contain"
          />
        </div>
        <span className="detail-muted absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.34em]">
          Selected work archive
        </span>
      </div>

      <div className="relative z-20 -mx-4 mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-8 sm:px-8 lg:absolute lg:inset-y-6 lg:left-[42%] lg:right-5 lg:mx-0 lg:mt-0 lg:block lg:overflow-visible lg:px-0 lg:pb-0">
        {projects.map((project, index) => (
          <ProjectPreview key={project.title} project={project} index={index} />
        ))}
      </div>

      <figcaption className="sr-only">
        A stack of project previews arranged beside the US2 portfolio mark.
      </figcaption>
    </figure>
  );
}
