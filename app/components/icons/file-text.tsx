"use client";

<<<<<<< HEAD
import type { Transition, Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
=======
import { motion, useAnimation } from "motion/react";
import type React from "react";
>>>>>>> 8a13a2e (ccc)
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

<<<<<<< HEAD
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
=======
const FILE_TEXT = forwardRef<FileTextIconHandle, FileTextIconProps>(
>>>>>>> 8a13a2e (ccc)
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
<<<<<<< HEAD
        <svg
          fill="none"
          height={size}
=======
        <motion.svg
          animate={controls}
          fill="none"
          height={size}
          initial="normal"
>>>>>>> 8a13a2e (ccc)
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
<<<<<<< HEAD
=======
          variants={{
            normal: { scale: 1 },
            animate: {
              scale: 1.05,
              transition: {
                duration: 0.3,
                ease: "easeOut",
              },
            },
          }}
>>>>>>> 8a13a2e (ccc)
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
<<<<<<< HEAD
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
=======

          <motion.path
            d="M10 9H8"
            stroke="currentColor"
            strokeWidth="2"
            variants={{
              normal: {
                pathLength: 1,
                x1: 8,
                x2: 10,
              },
              animate: {
                pathLength: [1, 0, 1],
                x1: [8, 10, 8],
                x2: [10, 10, 10],
                transition: {
                  duration: 0.7,
                  delay: 0.3,
                },
              },
            }}
          />
          <motion.path
            d="M16 13H8"
            stroke="currentColor"
            strokeWidth="2"
            variants={{
              normal: {
                pathLength: 1,
                x1: 8,
                x2: 16,
              },
              animate: {
                pathLength: [1, 0, 1],
                x1: [8, 16, 8],
                x2: [16, 16, 16],
                transition: {
                  duration: 0.7,
                  delay: 0.5,
                },
              },
            }}
          />
          <motion.path
            d="M16 17H8"
            stroke="currentColor"
            strokeWidth="2"
            variants={{
              normal: {
                pathLength: 1,
                x1: 8,
                x2: 16,
              },
              animate: {
                pathLength: [1, 0, 1],
                x1: [8, 16, 8],
                x2: [16, 16, 16],
                transition: {
                  duration: 0.7,
                  delay: 0.7,
                },
              },
            }}
          />
        </motion.svg>
>>>>>>> 8a13a2e (ccc)
      </div>
    );
  }
);

<<<<<<< HEAD
FileTextIcon.displayName = "FileTextIcon";

export { FileTextIcon };
=======
FILE_TEXT.displayName = "FileTextIcon";

export { FILE_TEXT as FileTextIcon };
>>>>>>> 8a13a2e (ccc)
