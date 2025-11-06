"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createLogger } from "@/lib/logger";
import { cn } from "@/lib/utils";

const logger = createLogger("research-interface");

type ResearchMode = "auto" | "medium" | "deep";

type ModeConfig = {
  id: ResearchMode;
  label: string;
  description: string;
  latency: string;
  icon: string;
};

const MODES: ModeConfig[] = [
  {
    id: "auto",
    label: "AUTO",
    description: "Fast",
    latency: "1-10s",
    icon: "⚡",
  },
  {
    id: "medium",
    label: "MEDIUM",
    description: "Balanced",
    latency: "10-20s",
    icon: "⚖️",
  },
  {
    id: "deep",
    label: "DEEP",
    description: "Comprehensive",
    latency: "25-47s",
    icon: "🔬",
  },
];

type ResearchResponse = {
  success: boolean;
  response?: string;
  metadata?: {
    mode: string;
    stepsUsed: number;
    toolsCalled: string[];
    tokenEstimate: number;
    cached: boolean;
    latency: number;
  };
  sources?: Array<{
    title: string;
    url: string;
  }>;
  error?: {
    code: string;
    message: string;
    retryAfter?: number;
    limitType?: string;
    details?: any;
  };
};

type ResearchInterfaceProps = {
  className?: string;
  onResponse?: (response: ResearchResponse) => void;
};

export function ResearchInterface({
  className,
  onResponse,
}: ResearchInterfaceProps) {
  const [selectedMode, setSelectedMode] = useState<ResearchMode>("auto");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      setError("Please enter a query");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    logger.log("[Research Interface] Submitting query", {
      mode: selectedMode,
      queryLength: query.length,
    });

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          mode: selectedMode,
          jurisdiction: "Zimbabwe",
        }),
      });

      const data: ResearchResponse = await response.json();

      logger.log("[Research Interface] Response received", {
        success: data.success,
        cached: data.metadata?.cached,
        latency: data.metadata?.latency,
      });

      setResult(data);

      if (!data.success) {
        setError(data.error?.message || "Research failed");
      }

      // Call optional callback
      onResponse?.(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to execute research";
      logger.error("[Research Interface] Request failed", { error: err });
      setError(errorMessage);
      setResult({
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: errorMessage,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      <Card>
        <CardHeader>
          <CardTitle>Legal Research</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="font-medium text-sm">Research Mode</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {MODES.map((mode) => (
                <button
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-all",
                    "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    selectedMode === mode.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background"
                  )}
                  data-testid={`mode-${mode.id}`}
                  disabled={isLoading}
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{mode.icon}</span>
                    <span className="font-semibold text-sm">{mode.label}</span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {mode.description} • {mode.latency}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Query Input */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="query">
                Query
              </label>
              <Textarea
                className="resize-none"
                data-testid="query-input"
                disabled={isLoading}
                id="query"
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your legal research query..."
                rows={4}
                value={query}
              />
            </div>

            {/* Submit Button */}
            <Button
              className="w-full"
              data-testid="submit-button"
              disabled={isLoading || !query.trim()}
              type="submit"
            >
              {isLoading ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent border-solid motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                  Researching...
                </>
              ) : (
                "Start Research"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <span className="text-destructive text-xl">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold text-destructive text-sm">Error</p>
                <p className="text-muted-foreground text-sm">{error}</p>
                {result?.error?.retryAfter && (
                  <p className="mt-1 text-muted-foreground text-xs">
                    Retry after {result.error.retryAfter}ms
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {result?.success && result.response && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Results</CardTitle>
              {result.metadata && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  {result.metadata.cached && (
                    <span className="rounded-full bg-green-500/10 px-2 py-1 text-green-600">
                      Cached
                    </span>
                  )}
                  <span>{result.metadata.latency}ms</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Response Text */}
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              data-testid="result-response"
            >
              <div className="whitespace-pre-wrap">{result.response}</div>
            </div>

            {/* Metadata */}
            {result.metadata && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="mb-2 font-semibold text-muted-foreground text-xs uppercase">
                  Metadata
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div>
                    <span className="text-muted-foreground">Mode:</span>{" "}
                    <span className="font-medium">
                      {result.metadata.mode.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Steps:</span>{" "}
                    <span className="font-medium">
                      {result.metadata.stepsUsed}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tools:</span>{" "}
                    <span className="font-medium">
                      {result.metadata.toolsCalled.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tokens:</span>{" "}
                    <span className="font-medium">
                      ~{result.metadata.tokenEstimate}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Sources */}
            {result.sources && result.sources.length > 0 && (
              <div className="space-y-2">
                <p className="font-semibold text-sm">Sources</p>
                <div className="space-y-1">
                  {result.sources.map((source, index) => (
                    <a
                      className="block rounded-md border p-2 text-sm transition-colors hover:bg-accent"
                      href={source.url}
                      key={index}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <p className="font-medium text-foreground">
                        {source.title}
                      </p>
                      <p className="truncate text-muted-foreground text-xs">
                        {source.url}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-r-transparent border-solid" />
              <div>
                <p className="font-medium text-sm">
                  Researching with {selectedMode.toUpperCase()} mode...
                </p>
                <p className="text-muted-foreground text-xs">
                  This may take{" "}
                  {MODES.find((m) => m.id === selectedMode)?.latency}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
