"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { cn } from "@/lib/utils";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

interface VoiceOrbProps {
  state: OrbState;
  onClick?: () => void;
  thinkingText?: string | null;
  volume?: number; // 0 to 1
}

export function VoiceOrb({
  state,
  onClick,
  thinkingText,
  volume = 0,
}: VoiceOrbProps) {
  // Define animation variants for the main orb based on state
  const orbVariants: Variants = {
    idle: {
      scale: [1, 1.05, 1],
      opacity: [0.5, 0.8, 0.5],
      borderRadius: ["50%", "50%", "50%"],
      transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const },
    },
    listening: {
      scale: 1 + volume * 0.5,
      opacity: 0.9,
      borderRadius: ["50%", "45%", "55%", "50%"],
      transition: {
        borderRadius: {
          duration: 2,
          repeat: Infinity,
          ease: "linear" as const,
        },
        scale: { type: "spring", stiffness: 300, damping: 20 },
      },
    },
    thinking: {
      scale: [1, 0.9, 1],
      opacity: [1, 0.6, 1],
      rotate: [0, 180, 360],
      borderRadius: ["50%", "40%", "50%"],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "linear" as const,
      },
    },
    speaking: {
      scale: [1, 1.1 + volume * 0.3, 1],
      opacity: 1,
      borderRadius: ["50%", "45%", "50%"],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        ease: "easeInOut" as const,
      },
    },
  };

  const orbColor =
    state === "idle"
      ? "bg-muted"
      : state === "listening"
        ? "bg-foreground"
        : state === "thinking"
          ? "bg-foreground"
          : "bg-foreground";

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={cn(
          "relative flex items-center justify-center cursor-pointer select-none",
          "w-24 h-24 sm:w-32 sm:h-32", // Responsive size
        )}
        onClick={onClick}
      >
        {/* Glow effect */}
        <motion.div
          variants={orbVariants}
          animate={state}
          className={cn("absolute inset-0 blur-2xl opacity-20", orbColor)}
        />

        {/* Core Orb */}
        <motion.div
          variants={orbVariants}
          animate={state}
          className={cn(
            "relative w-16 h-16 sm:w-20 sm:h-20 shadow-lg",
            orbColor,
          )}
          style={{
            boxShadow: `0 0 20px rgba(255,255,255,${state !== "idle" ? 0.3 : 0.05})`,
          }}
        />
      </div>

      {state === "thinking" && thinkingText && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-muted tracking-widest uppercase text-center h-4"
        >
          {thinkingText}
        </motion.div>
      )}

      {state === "listening" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted tracking-widest uppercase text-center h-4"
        >
          Listening...
        </motion.div>
      )}
    </div>
  );
}
