import Image from "next/image";
import type { FlightCard } from "../data/sections";

type Project = NonNullable<FlightCard["projects"]>[number];

// A project's artwork, or the panel it gets when there is none yet.
//
// Three places render a project image and all three used to pass
// `project.image` straight to next/image. `image` is optional now — four
// entries pointed at files that had been deleted or never added — and with
// `strict` off in tsconfig nothing would have flagged the undefined src, so
// the guard has to live somewhere that every call site goes through.
//
// The fallback is the showcase's own grid-over-gradient, which is already
// drawn behind the project stack. A panel that belongs to the design reads as
// "no screenshot yet"; an empty box reads as broken.
export function ProjectVisual({
  project,
  sizes,
  padding = "p-3",
  priority,
}: {
  project: Project;
  sizes: string;
  padding?: string;
  priority?: boolean;
}) {
  if (!project.image) {
    return (
      <div
        aria-hidden="true"
        className="detail-project-fallback absolute inset-0"
      >
        <div className="detail-project-fallback-grid absolute inset-0 opacity-30 [background-size:14px_14px]" />
      </div>
    );
  }

  return (
    <Image
      src={project.image}
      alt={`${project.title} project preview`}
      fill
      sizes={sizes}
      className={
        project.imageFit === "contain" ? `object-contain ${padding}` : "object-cover"
      }
      priority={priority}
    />
  );
}
