import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#272B27] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F1E8] disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none active:translate-x-[1px] active:translate-y-[1px]",
  {
    variants: {
      variant: {
        default:
          "bg-[#272B27] text-[#F5F1E8] border-2 border-[#272B27] hover:bg-[#343A34] hover:-translate-y-0.5 tech-shadow-sm active:translate-y-[1px] active:shadow-none",
        emergency:
          "bg-[#D94B3D] text-white border-2 border-[#272B27] hover:bg-[#C23E31] hover:-translate-y-0.5 tech-shadow-emergency font-black tracking-wider active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#272B27]",
        report:
          "bg-white text-[#272B27] border-2 border-[#272B27] hover:bg-[#F5F1E8] hover:-translate-y-0.5 tech-shadow-sm font-bold group",
        outline:
          "bg-[#F5F1E8] text-[#272B27] border-2 border-[#272B27] hover:bg-[#EEE8DC] hover:-translate-y-0.5 tech-shadow-sm active:translate-y-[1px]",
        secondary:
          "bg-[#EEE8DC] text-[#272B27] border border-[#272B27]/40 hover:bg-[#E5DDCF] hover:border-[#272B27] active:bg-[#DCD6C9]",
        sage:
          "bg-[#E6ECE5] text-[#272B27] border border-[#272B27]/40 hover:bg-[#D9E3D8] hover:border-[#272B27]",
        ghost:
          "text-[#272B27] hover:bg-[#272B27]/10 active:bg-[#272B27]/15 border border-transparent",
        link:
          "text-[#272B27] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs uppercase tracking-wider font-mono",
        default: "h-10 px-4 py-2",
        lg: "h-12 px-6 text-base tracking-wide",
        xl: "h-16 px-8 text-lg font-bold tracking-wider",
        sos: "h-18 px-8 text-xl font-black uppercase tracking-widest tech-shadow active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading = false, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span>Processing...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
