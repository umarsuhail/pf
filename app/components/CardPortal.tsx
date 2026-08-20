"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";

interface CardPortalProps {
  index: number;
  scrollYProgress: any;
  align?: "left" | "right";
}

const sectionProgressStops = [0, 0.11, 0.22, 0.56, 0.69, 0.81, 0.92];

export function CardPortal({
  index,
  scrollYProgress,
  align = "left",
}: CardPortalProps) {
  const earthRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!earthRef.current) return;

    // Quick setters keep per-scroll updates cheap (percent-based, GPU-composited)
    const earthX = gsap.quickTo(earthRef.current, "xPercent", {
      duration: 0.6,
      ease: "power3.out",
    });
    const earthY = gsap.quickTo(earthRef.current, "yPercent", {
      duration: 0.6,
      ease: "power3.out",
    });

    const currentStop = sectionProgressStops[index] ?? 0;
    const previousStop = index > 0 ? sectionProgressStops[index - 1] : 0;
    const approachSpan = Math.max(currentStop - previousStop, 0.08);

    // Earth reveals only when very close to the card's focus point
    const revealStart = Math.max(currentStop - approachSpan * 0.3, 0);
    const revealPeak = currentStop;

    // Earth rises from the bottom corner, staying clipped inside the window
    const cornerDirection = align === "left" ? 1 : -1;
    const ease = gsap.parseEase("power3.out");
    let lastReveal = -1;

    const update = (progress: number) => {
      let reveal = 0;
      if (progress >= revealStart && progress < revealPeak) {
        reveal =
          (progress - revealStart) / Math.max(revealPeak - revealStart, 0.001);
      } else if (progress >= revealPeak) {
        reveal = 1;
      }
      // First card: earth visible from the start
      if (index === 0) reveal = Math.max(reveal, 1 - progress / 0.06);
      reveal = Math.min(Math.max(reveal, 0), 1);

      // Skip redundant work while the card is far away (or fully revealed)
      if (reveal === lastReveal) return;
      lastReveal = reveal;

      const eased = ease(reveal);
      earthX(cornerDirection * 30 * (1 - eased));
      earthY(105 * (1 - eased));
    };

    update(scrollYProgress.get());
    const unsubscribe = scrollYProgress.on("change", update);
    return () => unsubscribe();
  }, [index, align, scrollYProgress]);

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="relative h-full w-full overflow-hidden rounded-2xl lg:rounded-3xl">
        {/* Space backdrop filling the window */}
        <Image
          src="/space.svg"
          alt=""
          fill
          className="object-cover"
          priority={index === 0}
        />

        {/* Color overlay blending the window with the scene palette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(15, 23, 42, 0.55) 0%, rgba(2, 6, 23, 0.15) 45%, rgba(6, 78, 59, 0.35) 100%)",
          }}
        />

        {/* Earth rises inside the window, overlaying the space backdrop */}
        <div
          ref={earthRef}
          className="absolute inset-x-0 bottom-0 h-[65%]"
          style={{
            transform: "translateY(105%)",
            willChange: "transform",
          }}
        >
          <Image
            src="/earth.png"
            alt=""
            fill
            className="object-cover object-top"
          />
        </div>
      </div>
    </div>
  );
}
