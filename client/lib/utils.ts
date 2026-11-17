import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Joins class names and lets the later one win when two clash:
// cn("px-2", "px-4") -> "px-4". Used by every component in components/ui.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
