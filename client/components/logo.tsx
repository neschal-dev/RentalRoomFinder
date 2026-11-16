import Link from "next/link";
import { cn } from "@/lib/utils";

// The house-with-a-pin mark and the name. `href` is where a click goes.
export function Logo({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <path
          d="M7 16.5 16 8l9 8.5V25a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z"
          className="fill-primary-foreground"
        />
        <circle cx="16" cy="18" r="3.2" className="fill-accent" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight">
        FindMeAPlace
      </span>
    </Link>
  );
}
