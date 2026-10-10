import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-mono font-semibold tracking-wide border uppercase select-none",
  {
    variants: {
      variant: {
        default: "bg-[#272B27] text-[#F5F1E8] border-[#272B27]",
        emergency: "bg-[#D94B3D] text-white border-[#272B27]",
        outline: "bg-transparent text-[#272B27] border-[#272B27]/40",
        sage: "bg-[#E6ECE5] text-[#272B27] border-[#272B27]/30",
        beige: "bg-[#EEE8DC] text-[#272B27] border-[#272B27]/30",
        blue: "bg-[#647F9C]/15 text-[#272B27] border-[#647F9C]/40",
        success: "bg-emerald-100 text-emerald-950 border-emerald-700/40",
        warning: "bg-amber-100 text-amber-950 border-amber-700/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
