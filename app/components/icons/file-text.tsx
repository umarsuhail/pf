"use client";

import type { Transition, Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface FileTextIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface FileTextIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const LINE_TRANSITION = (delay: number): Transition => ({
  duration: 0.4,
  ease: "easeInOut",
  delay,
});

const LINE_VARIANTS: Variants = {
  normal: {
    scaleX: 1,
    opacity: 1,
  },
  animate: {
    scaleX: [0, 1],
    opacity: [0, 1],
  },
};

const FileTextIcon = forwardRef<FileTextIconHandle, FileTextIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <motion.path
            animate={controls}
            d="M10 9H8"
            style={{ transformOrigin: "left center" }}
            transition={LINE_TRANSITION(0)}
            variants={LINE_VARIANTS}
          />
          <motion.path
            animate={controls}
            d="M16 13H8"
            style={{ transformOrigin: "left center" }}
            transition={LINE_TRANSITION(0.1)}
            variants={LINE_VARIANTS}
          />
          <motion.path
            animate={controls}
            d="M16 17H8"
            style={{ transformOrigin: "left center" }}
            transition={LINE_TRANSITION(0.2)}
            variants={LINE_VARIANTS}
          />
        </svg>
      </div>
    );
  }
);

FileTextIcon.displayName = "FileTextIcon";

export { FileTextIcon };
