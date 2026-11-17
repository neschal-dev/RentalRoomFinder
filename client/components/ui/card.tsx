import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// A white panel with a thin border. Used for form sections, stats and filters.
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-card", className)}
      {...props}
    />
  );
}
