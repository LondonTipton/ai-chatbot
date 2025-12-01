"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface SearchWithWarmupProps {
  onSearch: (query: string) => Promise<any>;
  query: string;
  children: (props: {
    isSearching: boolean;
    isWarmingUp: boolean;
    progress: number;
    error: string | null;
  }) => React.ReactNode;
}

export function SearchWithWarmup({
  onSearch,
  query,
  children,
}: SearchWithWarmupProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;

    const performSearch = async () => {
      setIsSearching(true);
      setError(null);
      setProgress(0);

      // Start progress simulation
      const progressInterval = setInterval(() => {
        setProgress((p) => {
          if (p >= 95) return p;
          // Slower progress as we get closer to 100
          const increment = p < 50 ? 2 : p < 80 ? 1 : 0.5;
          return Math.min(p + increment, 95);
        });
      }, 1000);

      try {
        const result = await onSearch(query);
        setProgress(100);
        clearInterval(progressInterval);

        // Reset after a brief moment
        setTimeout(() => {
          setIsSearching(false);
          setIsWarmingUp(false);
          setProgress(0);
        }, 500);

        return result;
      } catch (err: any) {
        clearInterval(progressInterval);

        // Check if it's a warmup error
        if (err.isWarmup || err.message?.includes("warming up")) {
          setIsWarmingUp(true);
          setError(
            "Embedding service is warming up. This takes 60-120 seconds on first use."
          );
        } else {
          setError(err.message || "Search failed");
        }

        setIsSearching(false);
        setProgress(0);
      }
    };

    performSearch();
  }, [query, onSearch]);

  return children({ isSearching, isWarmingUp, progress, error });
}

export function WarmupIndicator({
  isVisible,
  progress,
}: {
  isVisible: boolean;
  progress: number;
}) {
  if (!isVisible) return null;

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-6">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />

      <div className="space-y-2 text-center">
        <p className="font-medium text-sm">Warming up embedding service...</p>
        <p className="text-muted-foreground text-xs">
          First search after idle takes 60-120 seconds
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-center text-muted-foreground text-xs">
          {progress < 30 && "Starting container..."}
          {progress >= 30 && progress < 60 && "Loading models..."}
          {progress >= 60 && progress < 90 && "Almost ready..."}
          {progress >= 90 && "Finalizing..."}
        </p>
      </div>

      <p className="text-muted-foreground text-xs">
        Subsequent searches will be instant
      </p>
    </div>
  );
}
