"use client";

import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ComprehensiveWorkflowToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const handleCheckedChange = (checked: boolean) => {
    console.log("Switch toggled:", checked);
    onChange(checked);
  };

  const handleLabelClick = () => {
    console.log("Label clicked, toggling from", enabled, "to", !enabled);
    onChange(!enabled);
  };

  return (
    <span className="relative z-10 flex items-center gap-1.5">
      <Switch
        checked={enabled}
        className="relative z-10 scale-75"
        id="comprehensive-workflow"
        data-testid="deep-research-switch"
        onCheckedChange={handleCheckedChange}
      />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="flex items-center gap-1 border-0 bg-transparent p-0 text-muted-foreground text-xs transition-colors hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                handleLabelClick();
              }}
              data-testid="deep-research-label"
              type="button"
            >
              Deep Research
              {enabled && (
                <span
                  className="rounded-full bg-orange-500/10 px-1.5 py-0.5 font-medium text-[10px] text-orange-500"
                  data-testid="deep-research-on-badge"
                >
                  ON
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs" side="top">
            <div className="space-y-2">
              <p className="font-semibold">Deep Research Mode</p>
              <ul className="space-y-1 text-xs">
                <li>• 18K-20K tokens (high cost)</li>
                <li>• 25-47 seconds latency</li>
                <li>• Context search with raw content</li>
                <li>• Gap analysis & conditional branching</li>
                <li>• Publication-quality output</li>
              </ul>
              <p className="text-muted-foreground text-xs">
                Use for comprehensive research requiring maximum depth.
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}
