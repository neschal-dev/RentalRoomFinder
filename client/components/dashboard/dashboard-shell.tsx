"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import {
  Building2,
  LayoutDashboard,
  Menu,
  PlusCircle,
  Search,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { DEMO } from "@/lib/demo";
import { cn } from "@/lib/utils";

// Each line of the sidebar. `isActive` decides which one is highlighted for the current URL.
const NAV = [
  {
    href: "/account",
    label: "Overview",
    icon: LayoutDashboard,
    isActive: (path: string) => path === "/account",
  },
  {
    href: "/account/listings",
    label: "My listings",
    icon: Building2,
    // Also lights up on the edit page of a listing, but not on "Post a place".
    isActive: (path: string) =>
      path.startsWith("/account/listings") &&
      !path.startsWith("/account/listings/new"),
  },
  {
    href: "/account/listings/new",
    label: "Post a place",
    icon: PlusCircle,
    isActive: (path: string) => path.startsWith("/account/listings/new"),
  },
];

// The dashboard frame: a sidebar on the left (a slide-in menu on phones) and the page on the right.
export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-4">
      <Logo href="/account" className="px-2 pt-1" />

      <nav className="flex flex-col gap-1" aria-label="Dashboard">
        {NAV.map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/80 hover:bg-muted",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        {DEMO && (
          <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
            Demo mode: you are looking at sample listings. Nothing is saved.
          </p>
        )}
        <Link
          href="/listings"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full justify-start",
          )}
        >
          <Search /> Find a place
        </Link>
        <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
          <UserButton />
          <span className="text-sm text-muted-foreground">Your account</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Wide screens: the sidebar is always visible. */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-card md:block">
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phones: a small bar with a menu button. */}
        <div className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="flex size-10 cursor-pointer items-center justify-center rounded-lg hover:bg-muted"
          >
            <Menu className="size-5" />
          </button>
          <Logo href="/account" />
        </div>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">
          {children}
        </main>
      </div>

      {/* Phones: the slide-in menu. */}
      {open && (
        <div className="fixed inset-0 z-30 md:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-card shadow-xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-3 flex size-9 cursor-pointer items-center justify-center rounded-lg hover:bg-muted"
            >
              <X className="size-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}
    </div>
  );
}
