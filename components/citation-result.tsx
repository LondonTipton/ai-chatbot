"use client";

import { ExternalLinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type CitationSource = {
  position: number;
  title: string;
  url: string;
  content: string;
  relevanceScore?: number;
  publishedDate?: string;
};

export type CitationResultProps = {
  sources: CitationSource[];
  className?: string;
};

export const CitationResult = ({ sources, className }: CitationResultProps) => {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {sources.map((source) => (
        <div
          className="group flex gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
          key={source.position}
        >
          <div className="flex shrink-0 items-start pt-0.5">
            <Badge
              className="flex size-6 items-center justify-center rounded-full p-0 font-semibold text-xs"
              variant="secondary"
            >
              {source.position}
            </Badge>
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <a
              className="inline-flex items-center gap-1.5 font-medium text-foreground text-sm transition-colors hover:text-primary"
              href={source.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span className="line-clamp-2">{source.title}</span>
              <ExternalLinkIcon className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
            </a>

            <p className="line-clamp-2 text-muted-foreground text-xs leading-relaxed">
              {source.content}
            </p>

            <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
              <span className="max-w-[200px] truncate">{source.url}</span>
              {source.publishedDate &&
                source.publishedDate !== "Not available" && (
                  <>
                    <span>•</span>
                    <span>{source.publishedDate}</span>
                  </>
                )}
              {source.relevanceScore !== undefined && (
                <>
                  <span>•</span>
                  <span>
                    Relevance: {Math.round(source.relevanceScore * 100)}%
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
