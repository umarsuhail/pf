"use client";

import type { HTMLAttributes, RefAttributes } from "react";
import { forwardRef } from "react";
import { HomeIcon } from "./home";
import { HatGlassesIcon } from "./hat-glasses";
import { CpuIcon } from "./cpu";
import { BriefcaseBusinessIcon } from "./briefcase-business";
import { AtSignIcon } from "./at-sign";

export type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};
type AnimatedIconProps = HTMLAttributes<HTMLDivElement> & { size?: number };
export type AnimatedIcon = React.ForwardRefExoticComponent<
  AnimatedIconProps & RefAttributes<AnimatedIconHandle>
>;

const REGISTRY: Record<string, AnimatedIcon> = {
  home: HomeIcon,
  skills: HatGlassesIcon,
  projects: CpuIcon,
  experience: BriefcaseBusinessIcon,
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
