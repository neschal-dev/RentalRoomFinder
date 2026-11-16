"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// On a phone the filters are hidden behind a button. On a wide screen they are always shown.
// The filter form itself is passed in as `children`, so it still renders on the server.
export function FiltersToggle({
  children,
  activeCount,
}: {
  children: ReactNode;
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="w-full md:hidden"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <SlidersHorizontal />
        Filters{activeCount > 0 ? ` (${activeCount})` : ""}
      </Button>
      <div className={cn("mt-3 md:mt-0 md:block", open ? "block" : "hidden")}>
        {children}
      </div>
    </>
  );
}
