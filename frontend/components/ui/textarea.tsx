import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full bg-white px-3 py-2 text-sm text-[#272B27] placeholder:text-[#5B6158]/60 border border-[#272B27] tech-shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#272B27] disabled:cursor-not-allowed disabled:opacity-50 font-sans resize-y",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
