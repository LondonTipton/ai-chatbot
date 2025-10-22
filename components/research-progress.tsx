"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Brain, CheckCircle2, FileText, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";

export interface ToolExecution {
  id: string;
  tool: string;
  status: "running" | "complete";
  message: string;
  startTime: number;
  endTime?: number;
}

interface ResearchProgressProps {
  tools: ToolExecution[];
}

const toolIcons: Record<string, any> = {
  tavilySearch: Search,
  tavilyExtract: FileText,
  summarizeContent: Brain,
  default: Loader2,
};

const toolMessages: Record<string, string> = {
  tavilySearch: "Searching legal databases",
  tavilyExtract: "Extracting content from sources",
  summarizeContent: "Analyzing and summarizing",
};

export function ResearchProgress({ tools }: ResearchProgressProps) {
  const [durations, setDurations] = useState<Record<string, number>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      const newDurations: Record<string, number> = {};
      tools.forEach((tool) => {
        if (tool.status === "running") {
          newDurations[tool.id] = Date.now() - tool.startTime;
        } else if (tool.endTime) {
          newDurations[tool.id] = tool.endTime - tool.startTime;
        }
      });
      setDurations(newDurations);
    }, 100);

    return () => clearInterval(interval);
  }, [tools]);

  if (tools.length === 0) return null;

  const activeTools = tools.filter((t) => t.status === "running");
  const completedTools = tools.filter((t) => t.status === "complete");

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-lg border border-border bg-background/95 p-4 shadow-lg backdrop-blur-sm"
      exit={{ opacity: 0, y: -10 }}
      initial={{ opacity: 0, y: -10 }}
    >
      <div className="mb-3 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="font-medium text-sm">Research in Progress</span>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {tools.map((tool) => {
            const Icon = toolIcons[tool.tool] || toolIcons.default;
            const duration = durations[tool.id] || 0;
            const seconds = (duration / 1000).toFixed(1);

            return (
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 rounded-md bg-background/50 p-3"
                exit={{ opacity: 0, x: 20 }}
                initial={{ opacity: 0, x: -20 }}
                key={tool.id}
              >
                <div className="flex-shrink-0">
                  {tool.status === "running" ? (
                    <Icon className="h-4 w-4 animate-pulse text-primary" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm">
                      {tool.message || toolMessages[tool.tool] || tool.tool}
                    </span>
                    <span className="whitespace-nowrap text-muted-foreground text-xs">
                      {seconds}s
                    </span>
                  </div>

                  {tool.status === "running" && (
                    <motion.div
                      animate={{ opacity: 1 }}
                      className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted"
                      initial={{ opacity: 0 }}
                    >
                      <motion.div
                        animate={{ width: "100%" }}
                        className="h-full bg-primary"
                        initial={{ width: "0%" }}
                        transition={{
                          duration: 30,
                          ease: "linear",
                        }}
                      />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {activeTools.length === 0 && completedTools.length > 0 && (
        <motion.div
          animate={{ opacity: 1 }}
          className="mt-3 text-center text-muted-foreground text-xs"
          initial={{ opacity: 0 }}
        >
          Research complete • {completedTools.length} operation
          {completedTools.length !== 1 ? "s" : ""}
        </motion.div>
      )}
    </motion.div>
  );
}
