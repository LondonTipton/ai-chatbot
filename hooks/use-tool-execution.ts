"use client";

import { useEffect, useState } from "react";
import { useDataStream } from "@/components/data-stream-provider";
import type { ToolExecution } from "@/components/research-progress";

export function useToolExecution() {
  const [tools, setTools] = useState<ToolExecution[]>([]);
  const { dataStream, setDataStream } = useDataStream();

  useEffect(() => {
    // Filter for current request's tool events only
    const toolStartEvents = dataStream.filter(
      (part) => part.type === "data-toolStart"
    );
    const toolCompleteEvents = dataStream.filter(
      (part) => part.type === "data-toolComplete"
    );

    // Process tool start events
    for (const event of toolStartEvents) {
      const { id, tool, message } = event.data;
      setTools((prev) => {
        // Check if tool already exists
        if (prev.some((t) => t.id === id)) {
          return prev;
        }

        return [
          ...prev,
          {
            id,
            tool,
            message,
            status: "running",
            startTime: Date.now(),
          },
        ];
      });
    }

    // Process tool complete events
    for (const event of toolCompleteEvents) {
      const { id } = event.data;
      setTools((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, status: "complete" as const, endTime: Date.now() }
            : t
        )
      );
    }
  }, [dataStream]);

  // Clear tools when all complete
  useEffect(() => {
    if (tools.length > 0 && tools.every((t) => t.status === "complete")) {
      const timer = setTimeout(() => {
        setTools([]);
        // Clear tool events from dataStream to prevent accumulation
        setDataStream((prev) =>
          prev.filter(
            (part) =>
              part.type !== "data-toolStart" &&
              part.type !== "data-toolComplete"
          )
        );
      }, 3000); // Clear after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [tools, setDataStream]);

  // Reset tools when a new message starts (dataStream gets cleared)
  useEffect(() => {
    // If dataStream is empty or has no tool events, reset tools
    const hasToolEvents = dataStream.some(
      (part) =>
        part.type === "data-toolStart" || part.type === "data-toolComplete"
    );

    if (!hasToolEvents && tools.length > 0) {
      setTools([]);
    }
  }, [dataStream, tools.length]);

  return { tools };
}
