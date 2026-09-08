
"use client";

import { motion } from "framer-motion";

interface NeonTextProps {
  text: string;
  className?: string;
}

export default function NeonText({
  text,
  className = "",
}: NeonTextProps) {
  const letters = text.split("");

  return (
    <div className={`absolute inline-block ${className}`}>
      {/* Ambient glow behind text */}
      <motion.div
        aria-hidden
        className="absolute inset-0 blur-2xl opacity-40"
        animate={{
          opacity: [0.25, 0.55, 0.3, 0.7, 0.25],
          scale: [0.98, 1.03, 1, 1.04, 0.98],
        }}
        transition={{
          duration: 2.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <span className="text-[#39ff14]">{text}</span>
      </motion.div>

      {/* Main text */}
      <motion.div
        className="relative font-bold tracking-[0.12em] text-[#39ff14]"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.06,
            },
          },
        }}
        style={{
          textShadow: `
            0 0 4px #39ff14,
            0 0 10px #39ff14,
            0 0 20px #39ff14,
            0 0 40px rgba(57, 255, 20, 0.8)
          `,
        }}
      >
        {letters.map((letter, index) => (
          <motion.span
            key={`${letter}-${index}`}
            className="inline-block"
            variants={{
              hidden: {
                opacity: 0,
                y: 12,
                filter: "blur(8px)",
              },
              visible: {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                transition: {
                  duration: 0.45,
                  ease: [0.22, 1, 0.36, 1],
                },
              },
            }}
          >
            {letter === " " ? "\u00A0" : letter}
          </motion.span>
        ))}
      </motion.div>

      {/* Neon flicker overlay */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 font-bold tracking-[0.12em] text-[#39ff14]"
        animate={{
          opacity: [
            0,
            0,
            0.15,
            0,
            0.35,
            0,
            0.08,
            0,
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatDelay: 1.5,
          ease: "linear",
        }}
        style={{
          textShadow: `
            0 0 5px #39ff14,
            0 0 15px #39ff14,
            0 0 30px #39ff14
          `,
        }}
      >
        {text}
      </motion.div>
    </div>
  );
}
