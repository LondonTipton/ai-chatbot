import {
  type ChangeEvent,
  type ComponentProps,
  forwardRef,
  useEffect,
  useState,
} from "react";
import { MAX_INPUT_LENGTH } from "@/lib/input-sanitizer";
import { cn } from "@/lib/utils";

export type TextareaProps = ComponentProps<"textarea"> & {
  showCharacterCount?: boolean;
};

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      showCharacterCount = false,
      maxLength = MAX_INPUT_LENGTH,
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const [charCount, setCharCount] = useState(() => {
      const initialValue = value ?? defaultValue ?? "";
      return String(initialValue).length;
    });

    // Update character count when value changes
    useEffect(() => {
      if (value !== undefined) {
        setCharCount(String(value).length);
      }
    }, [value]);

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      props.onChange?.(e);
    };

    return (
      <div className="relative w-full">
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            showCharacterCount && "pb-8",
            className
          )}
          defaultValue={defaultValue}
          maxLength={maxLength}
          onChange={handleChange}
          ref={ref}
          value={value}
          {...props}
        />
        {showCharacterCount && (
          <div
            className={cn(
              "absolute right-2 bottom-2 text-xs",
              charCount > maxLength * 0.9
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {charCount}/{maxLength}
          </div>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
