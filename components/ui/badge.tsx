import * as React from "react"
import { cn } from "@/lib/utils"

const badgeVariants = {
  default: "bg-teal-600 text-white",
  secondary: "bg-slate-100 text-slate-900",
  destructive: "bg-red-500 text-white",
  outline: "border border-slate-200",
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  sand: "bg-amber-50 text-amber-900 border border-amber-200"
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof badgeVariants
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors", badgeVariants[variant], className)} {...props} />
  )
}

export { Badge }
