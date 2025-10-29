"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  className,
}: {
  className?: string;
} & React.ComponentProps<typeof Button>) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Button
      className={cn(
        "h-8 w-8 px-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 md:h-fit md:w-fit md:px-2",
        className
      )}
      data-testid="theme-toggle"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      variant="outline"
    >
      {resolvedTheme === "dark" ? (
        <svg
          height="16"
          strokeLinejoin="round"
          style={{ color: "currentcolor" }}
          viewBox="0 0 16 16"
          width="16"
        >
          <path
            clipRule="evenodd"
            d="M8 0.5C8.41421 0.5 8.75 0.835786 8.75 1.25V2.25C8.75 2.66421 8.41421 3 8 3C7.58579 3 7.25 2.66421 7.25 2.25V1.25C7.25 0.835786 7.58579 0.5 8 0.5ZM11.182 2.75736C11.4749 2.46447 11.9497 2.46447 12.2426 2.75736L12.9497 3.46447C13.2426 3.75736 13.2426 4.23223 12.9497 4.52513C12.6568 4.81802 12.182 4.81802 11.8891 4.52513L11.182 3.81802C10.8891 3.52513 10.8891 3.05025 11.182 2.75736ZM4.81802 2.75736C5.11091 3.05025 5.11091 3.52513 4.81802 3.81802L4.11091 4.52513C3.81802 4.81802 3.34315 4.81802 3.05025 4.52513C2.75736 4.23223 2.75736 3.75736 3.05025 3.46447L3.75736 2.75736C4.05025 2.46447 4.52513 2.46447 4.81802 2.75736ZM8 5.5C6.61929 5.5 5.5 6.61929 5.5 8C5.5 9.38071 6.61929 10.5 8 10.5C9.38071 10.5 10.5 9.38071 10.5 8C10.5 6.61929 9.38071 5.5 8 5.5ZM4 8C4 5.79086 5.79086 4 8 4C10.2091 4 12 5.79086 12 8C12 10.2091 10.2091 12 8 12C5.79086 12 4 10.2091 4 8ZM13.75 8C13.75 7.58579 14.0858 7.25 14.5 7.25H15.5C15.9142 7.25 16.25 7.58579 16.25 8C16.25 8.41421 15.9142 8.75 15.5 8.75H14.5C14.0858 8.75 13.75 8.41421 13.75 8ZM0.5 7.25C0.914214 7.25 1.25 7.58579 1.25 8C1.25 8.41421 0.914214 8.75 0.5 8.75H-0.5C-0.914214 8.75 -1.25 8.41421 -1.25 8C-1.25 7.58579 -0.914214 7.25 -0.5 7.25H0.5ZM12.2426 11.4749C12.5355 11.7678 12.5355 12.2426 12.2426 12.5355L11.5355 13.2426C11.2426 13.5355 10.7678 13.5355 10.4749 13.2426C10.182 12.9497 10.182 12.4749 10.4749 12.182L11.182 11.4749C11.4749 11.182 11.9497 11.182 12.2426 11.4749ZM3.75736 11.4749C4.05025 11.182 4.52513 11.182 4.81802 11.4749C5.11091 11.7678 5.11091 12.2426 4.81802 12.5355L4.11091 13.2426C3.81802 13.5355 3.34315 13.5355 3.05025 13.2426C2.75736 12.9497 2.75736 12.4749 3.05025 12.182L3.75736 11.4749ZM8 13C8.41421 13 8.75 13.3358 8.75 13.75V14.75C8.75 15.1642 8.41421 15.5 8 15.5C7.58579 15.5 7.25 15.1642 7.25 14.75V13.75C7.25 13.3358 7.58579 13 8 13Z"
            fill="currentColor"
            fillRule="evenodd"
          />
        </svg>
      ) : (
        <svg
          fill="none"
          height="16"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
          width="16"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
      <span className="sr-only">
        {resolvedTheme === "dark"
          ? "Switch to light mode"
          : "Switch to dark mode"}
      </span>
    </Button>
  );
}
