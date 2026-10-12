import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border-0 px-4 py-1.5 text-xs font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-[4px_4px_8px_rgba(0,0,0,0.1),-2px_-2px_6px_rgba(255,255,255,0.9)]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 hover:shadow-[6px_6px_12px_rgba(0,0,0,0.12),-3px_-3px_8px_rgba(255,255,255,0.95)] hover:translate-y-[-1px] active:translate-y-[0px]",
        secondary:
          "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 hover:shadow-[6px_6px_12px_rgba(0,0,0,0.12),-3px_-3px_8px_rgba(255,255,255,0.95)] hover:translate-y-[-1px]",
        destructive:
          "bg-gradient-to-br from-rose-100 to-rose-200 text-rose-700 hover:shadow-[6px_6px_12px_rgba(0,0,0,0.12),-3px_-3px_8px_rgba(255,255,255,0.95)] hover:translate-y-[-1px]",
        outline: "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-700 hover:shadow-[6px_6px_12px_rgba(0,0,0,0.12),-3px_-3px_8px_rgba(255,255,255,0.95)]",
        success:
          "bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 hover:shadow-[6px_6px_12px_rgba(0,0,0,0.12),-3px_-3px_8px_rgba(255,255,255,0.95)] hover:translate-y-[-1px]",
        warning:
          "bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 hover:shadow-[6px_6px_12px_rgba(0,0,0,0.12),-3px_-3px_8px_rgba(255,255,255,0.95)] hover:translate-y-[-1px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
