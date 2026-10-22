import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-emerald-50 text-emerald-700 border-emerald-200",
        warning: "border-transparent bg-amber-50 text-amber-700 border-amber-200",
        q1: "bg-purple-100 text-purple-700 border-purple-200 font-bold",
        q2: "bg-amber-100 text-amber-800 border-amber-200 font-bold",
        q3: "bg-slate-200 text-slate-700 dark:text-slate-300 border-slate-300 font-bold",
        q4: "bg-orange-100 text-orange-800 border-orange-200 font-bold",
        q5: "bg-zinc-100 text-zinc-600 border-zinc-200 font-bold",
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

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
