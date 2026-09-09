import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "danger" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    
    // Base styles + Premium hover-lift
    const baseStyles = "inline-flex items-center justify-center whitespace-nowrap font-bold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 active:scale-95";
    
    // Variant styles matching our Glassmorphism theme
    const variants = {
      default: "premium-btn bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-lg",
      secondary: "premium-btn bg-sky-500 hover:bg-sky-600 text-slate-950 shadow-lg",
      outline: "border border-slate-700 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white",
      ghost: "hover:bg-slate-800/50 text-slate-400 hover:text-white",
      danger: "premium-btn bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20",
    };

    // Size styles
    const sizes = {
      default: "h-11 px-6 py-2.5 rounded-xl",
      sm: "h-9 px-4 rounded-lg text-sm",
      lg: "h-14 px-8 rounded-2xl text-lg",
      icon: "h-11 w-11 rounded-xl",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
