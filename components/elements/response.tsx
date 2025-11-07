"use client";

import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        "w-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:whitespace-pre-wrap [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto",
        // Table responsive styles - wrap in scrollable container
        "[&_table]:my-4 [&_table]:block [&_table]:w-full [&_table]:max-w-full [&_table]:border-collapse [&_table]:overflow-x-auto [&_table]:text-sm md:[&_table]:table",
        "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_td]:text-left md:[&_td]:px-3 md:[&_td]:py-2",
        "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold md:[&_th]:px-3 md:[&_th]:py-2",
        "[&_tbody]:table-row-group [&_td]:table-cell [&_th]:table-cell [&_thead]:table-header-group [&_tr]:table-row",
        className
      )}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";
