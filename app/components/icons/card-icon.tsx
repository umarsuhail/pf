"use client";

import type { HTMLAttributes, RefAttributes } from "react";
import { forwardRef } from "react";
import { HomeIcon } from "./home";
<<<<<<< HEAD
import { HatGlassesIcon } from "./hat-glasses";
import { CpuIcon } from "./cpu";
import { BriefcaseBusinessIcon } from "./briefcase-business";
=======
import { UserIcon } from "./user";
import { HatGlassesIcon } from "./hat-glasses";
import { CpuIcon } from "./cpu";
import { BriefcaseBusinessIcon } from "./briefcase-business";
import { FileTextIcon } from "./file-text";
>>>>>>> 8a13a2e (ccc)
import { AtSignIcon } from "./at-sign";

// Every lucide-animated icon shares this exact shape (size?: number over
// HTMLAttributes<HTMLDivElement>, wrapping a ref handle with start/stop) —
// declared once so the registry below can hold them interchangeably.
export type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};
type AnimatedIconProps = HTMLAttributes<HTMLDivElement> & { size?: number };
export type AnimatedIcon = React.ForwardRefExoticComponent<
  AnimatedIconProps & RefAttributes<AnimatedIconHandle>
>;

// One icon per section — keyed by the card id used throughout sections.ts,
// so every place that renders a card can look its icon up the same way.
const REGISTRY: Record<string, AnimatedIcon> = {
  home: HomeIcon,
<<<<<<< HEAD
  skills: HatGlassesIcon,
  projects: CpuIcon,
  experience: BriefcaseBusinessIcon,
=======
  about: UserIcon,
  skills: HatGlassesIcon,
  projects: CpuIcon,
  experience: BriefcaseBusinessIcon,
  resume: FileTextIcon,
>>>>>>> 8a13a2e (ccc)
  contact: AtSignIcon,
};

export const CardIcon = forwardRef<
  AnimatedIconHandle,
  AnimatedIconProps & { id: string }
>(({ id, ...props }, ref) => {
  const Icon = REGISTRY[id] ?? HomeIcon;
  return <Icon ref={ref} {...props} />;
});
CardIcon.displayName = "CardIcon";
