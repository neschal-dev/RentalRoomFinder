"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BedDouble, Building2, House, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

// The tabs in the header. A tab is lit when the page shows that kind of place.
const TABS = [
  { label: "All", href: "/", type: null, icon: LayoutGrid },
  {
    label: "Rooms",
    href: "/listings?propertyType=room",
    type: "room",
    icon: BedDouble,
  },
  {
    label: "Flats",
    href: "/listings?propertyType=flat",
    type: "flat",
    icon: Building2,
  },
  {
    label: "Houses",
    href: "/listings?propertyType=house",
    type: "house",
    icon: House,
  },
];

export function CategoryTabs({ className }: { className?: string }) {
  const pathname = usePathname();
  const type = useSearchParams().get("propertyType");

  return (
    <nav
      aria-label="Kinds of places"
      className={cn("flex items-center gap-6 sm:gap-8", className)}
    >
      {TABS.map(({ label, href, type: tabType, icon: Icon }) => {
        const active =
          tabType === null
            ? pathname === "/"
            : pathname === "/listings" && type === tabType;
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors",
              active
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
