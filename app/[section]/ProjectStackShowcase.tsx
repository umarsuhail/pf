import Image from "next/image";
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
      className="group relative min-w-[82%] snap-center overflow-hidden rounded-2xl border border-sky-100/15 bg-slate-950/90 shadow-[0_18px_42px_rgba(2,8,23,0.48)] transition-[transform,border-color,box-shadow] duration-300 ease-out hover:border-sky-300/35 hover:shadow-[0_24px_58px_rgba(14,165,233,0.24)] sm:min-w-[66%] lg:absolute lg:left-[var(--stack-left)] lg:top-[var(--stack-top)] lg:h-[19%] lg:w-[93%] lg:min-w-0 lg:rotate-[var(--stack-rotate)] lg:hover:z-50 lg:hover:-translate-x-3 lg:hover:rotate-0 lg:hover:scale-[1.015]"
    >
      <div className="grid h-full grid-rows-[7.5rem_auto] lg:grid-cols-[34%_1fr] lg:grid-rows-1">
        <div className="relative overflow-hidden border-b border-white/10 bg-slate-900 lg:border-b-0 lg:border-r">
          <Image
            src={project.image}
            alt=""
            fill
            sizes="(max-width: 640px) 82vw, (max-width: 1024px) 66vw, 18vw"
            className="object-cover opacity-80 saturate-[0.85] transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.05),rgba(2,6,23,0.5))]" />
          <span className="absolute left-2.5 top-2.5 rounded-full border border-white/15 bg-slate-950/70 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.2em] text-sky-100/75 backdrop-blur-sm">
            Preview {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <div className="flex min-w-0 flex-col justify-center px-4 py-3 lg:px-3.5 lg:py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-sky-300/70">
            {project.category}
          </p>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-sky-50 lg:text-[13px]">
            {project.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-200/65 lg:text-[10px] lg:leading-[1.45]">
            {project.description}
          </p>
        </div>
      </div>
    </article>
  );
}

export function ProjectStackShowcase({ projects }: { projects: Project[] }) {
  return (
    <figure className="relative isolate overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/40 px-4 pb-5 pt-7 shadow-[0_32px_90px_-28px_rgba(14,165,233,0.48)] sm:px-8 sm:pb-8 lg:min-h-[620px] lg:p-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_45%,rgba(56,189,248,0.2),transparent_28%),radial-gradient(circle_at_78%_24%,rgba(37,99,235,0.2),transparent_34%),linear-gradient(145deg,rgba(15,23,42,0.35),rgba(2,6,23,0.9))]" />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(125,211,252,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.08)_1px,transparent_1px)] [background-size:30px_30px] [mask-image:linear-gradient(to_right,black,transparent_68%)]"
      />

      <div className="relative z-10 mx-auto aspect-square w-[min(54vw,13rem)] lg:absolute lg:left-[7%] lg:top-1/2 lg:w-[36%] lg:max-w-[17rem] lg:-translate-y-1/2">
        <span
          aria-hidden="true"
          className="absolute inset-[2%] rounded-full border border-sky-300/20 shadow-[0_0_55px_rgba(56,189,248,0.2),inset_0_0_40px_rgba(59,130,246,0.12)]"
        />
        <span
          aria-hidden="true"
          className="absolute inset-[14%] rounded-full border border-dashed border-emerald-300/20"
        />
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-[46%] w-[116%] -translate-x-1/2 -translate-y-1/2 rotate-[-13deg] rounded-[50%] border border-sky-200/25"
        />
        <div className="absolute inset-[17%]">
          <Image
            src="/images/us2.png"
            alt="US2 portfolio mark"
            fill
            sizes="(max-width: 1024px) 54vw, 17rem"
            className="object-contain drop-shadow-[0_20px_34px_rgba(14,165,233,0.3)]"
          />
        </div>
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.34em] text-sky-100/45">
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
