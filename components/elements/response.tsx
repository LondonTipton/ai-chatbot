"use client";

import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

type ResponseProps = ComponentProps<typeof Streamdown>;

// Custom components to fix hydration error with images in paragraphs
const customComponents = {
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
    // Check if paragraph only contains an image
    const hasOnlyImage =
      Array.isArray(children) &&
      children.length === 1 &&
      typeof children[0] === "object" &&
      children[0] !== null &&
      "type" in children[0] &&
      children[0].type === "img";

    // If paragraph only contains an image, render as div to avoid nesting issues
    if (hasOnlyImage) {
      return <div {...props}>{children}</div>;
    }

    return <p {...props}>{children}</p>;
  },
};

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        "w-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:whitespace-pre-wrap [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto",
        // Simple table styling - no display changes, just styling
        "[&_table]:my-4 [&_table]:w-auto [&_table]:border-collapse [&_table]:text-sm",
        // Cell styling with smaller padding on mobile
        "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_td]:text-left [&_td]:align-top md:[&_td]:px-3 md:[&_td]:py-2",
        "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:align-top md:[&_th]:px-3 md:[&_th]:py-2",
        className
      )}
      components={customComponents}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";
