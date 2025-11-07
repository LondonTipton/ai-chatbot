"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { SparklesIcon } from "./icons";

type ProcessingState =
  | "processing"
  | "researching"
  | "analyzing"
  | "synthesizing"
  | "finalizing";

const PROCESSING_MESSAGES: Record<ProcessingState, string> = {
  processing: "Processing your request...",
  researching: "Researching legal sources...",
  analyzing: "Analyzing information...",
  synthesizing: "Synthesizing findings...",
  finalizing: "Preparing response...",
};

const PROCESSING_SEQUENCE: ProcessingState[] = [
  "processing",
  "researching",
  "analyzing",
  "synthesizing",
  "finalizing",
];

export const ProcessingMessage = () => {
  const [stateIndex, setStateIndex] = useState(0);
  const currentState = PROCESSING_SEQUENCE[stateIndex];

  useEffect(() => {
    // Cycle through states every 3 seconds
    const interval = setInterval(() => {
      setStateIndex((prev) => (prev + 1) % PROCESSING_SEQUENCE.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="group/message w-full"
      data-role="assistant"
      data-testid="message-assistant-processing"
      initial={{ opacity: 0 }}
    >
      <div className="flex items-start justify-start gap-3">
        {/* Mobile: Animated text - fades in/out while processing */}
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          className="flex px-2 md:hidden"
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        >
          <span className="font-semibold text-sm">DeepCounsel</span>
        </motion.div>

        {/* Desktop: Spinning icon */}
        <div className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border md:flex">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          >
            <SparklesIcon size={14} />
          </motion.div>
        </div>

        <div className="flex w-full flex-col gap-2 md:gap-4">
          <div className="p-0 text-muted-foreground text-sm">
            <LoadingText key={currentState}>
              {PROCESSING_MESSAGES[currentState]}
            </LoadingText>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const LoadingText = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      animate={{ backgroundPosition: ["100% 50%", "-100% 50%"] }}
      className="flex items-center text-transparent"
      initial={{ opacity: 0 }}
      style={{
        background:
          "linear-gradient(90deg, hsl(var(--muted-foreground)) 0%, hsl(var(--muted-foreground)) 35%, hsl(var(--foreground)) 50%, hsl(var(--muted-foreground)) 65%, hsl(var(--muted-foreground)) 100%)",
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
      }}
      transition={{
        duration: 2,
        repeat: Number.POSITIVE_INFINITY,
        ease: "linear",
      }}
    >
      {children}
    </motion.div>
  );
};
