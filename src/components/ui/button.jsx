import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "rounded-2xl bg-gradient-to-br from-blue-500/90 to-blue-600/90 backdrop-blur-xl backdrop-saturate-150 border border-white/30 text-white shadow-[8px_8px_16px_rgba(0,0,0,0.12),-4px_-4px_12px_rgba(255,255,255,0.9)] hover:shadow-[12px_12px_24px_rgba(0,0,0,0.15),-6px_-6px_16px_rgba(255,255,255,0.95)] hover:translate-y-[-2px] active:translate-y-[1px] active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.8)]",
        destructive:
          "rounded-2xl bg-gradient-to-br from-rose-600/90 to-rose-700/90 backdrop-blur-xl backdrop-saturate-150 border border-white/30 text-white shadow-[8px_8px_16px_rgba(0,0,0,0.12),-4px_-4px_12px_rgba(255,255,255,0.9)] hover:shadow-[12px_12px_24px_rgba(0,0,0,0.15),-6px_-6px_16px_rgba(255,255,255,0.95)] hover:translate-y-[-2px] active:translate-y-[1px] active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.8)]",
        outline:
          "rounded-2xl bg-white/60 backdrop-blur-xl backdrop-saturate-150 border border-white/40 text-slate-700 shadow-[8px_8px_16px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.95)] hover:shadow-[12px_12px_24px_rgba(0,0,0,0.12),-6px_-6px_16px_rgba(255,255,255,1)] hover:translate-y-[-2px] active:translate-y-[1px] active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.08),inset_-4px_-4px_8px_rgba(255,255,255,0.9)]",
        secondary:
          "rounded-2xl bg-gradient-to-br from-slate-100/70 to-slate-200/70 backdrop-blur-xl backdrop-saturate-150 border border-white/50 text-slate-800 shadow-[8px_8px_16px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.9)] hover:shadow-[12px_12px_24px_rgba(0,0,0,0.15),-6px_-6px_16px_rgba(255,255,255,0.95)] hover:translate-y-[-2px] active:translate-y-[1px] active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.85)]",
        ghost: "rounded-2xl text-slate-700 hover:bg-white/40 hover:backdrop-blur-xl hover:backdrop-saturate-150 hover:border hover:border-white/30 hover:shadow-[4px_4px_12px_rgba(0,0,0,0.08),-2px_-2px_8px_rgba(255,255,255,0.9)] active:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.1),inset_-2px_-2px_6px_rgba(255,255,255,0.85)]",
        link: "text-blue-600 underline-offset-4 hover:underline hover:text-blue-700",
        success:
          "rounded-2xl bg-gradient-to-br from-emerald-600/90 to-emerald-700/90 backdrop-blur-xl backdrop-saturate-150 border border-white/30 text-white shadow-[8px_8px_16px_rgba(0,0,0,0.12),-4px_-4px_12px_rgba(255,255,255,0.9)] hover:shadow-[12px_12px_24px_rgba(0,0,0,0.15),-6px_-6px_16px_rgba(255,255,255,0.95)] hover:translate-y-[-2px] active:translate-y-[1px] active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.8)]",
        warning:
          "rounded-2xl bg-gradient-to-br from-amber-500/90 to-amber-600/90 backdrop-blur-xl backdrop-saturate-150 border border-white/30 text-white shadow-[8px_8px_16px_rgba(0,0,0,0.12),-4px_-4px_12px_rgba(255,255,255,0.9)] hover:shadow-[12px_12px_24px_rgba(0,0,0,0.15),-6px_-6px_16px_rgba(255,255,255,0.95)] hover:translate-y-[-2px] active:translate-y-[1px] active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.8)]",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 px-4 py-2 text-xs",
        lg: "h-13 px-8 py-3 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
