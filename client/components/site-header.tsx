import Link from "next/link";
import { Suspense } from "react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { CategoryTabs } from "@/components/category-tabs";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";

// Top bar of the public pages: logo, kinds of places in the middle, account on the right.
export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto grid h-16 w-full max-w-7xl grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-6 md:grid-cols-[1fr_auto_1fr]">
        <Logo />

        {/* The tabs read the URL, so they sit behind Suspense. */}
        <Suspense fallback={<div className="hidden h-12 md:block md:w-96" />}>
          <CategoryTabs className="hidden md:flex" />
        </Suspense>

        <nav className="flex items-center justify-end gap-1 sm:gap-2">
          {/* Whether someone is logged in is only known at request time, so this part
              streams in behind a Suspense boundary (required by Cache Components). */}
          <Suspense fallback={<div className="h-10 w-40" />}>
            <Show when="signed-out">
              <Link
                href="/account/listings/new"
                className={buttonVariants({ variant: "ghost" })}
              >
                Post a place
              </Link>
              <SignInButton mode="redirect">
                <button className={buttonVariants({ variant: "outline" })}>
                  Sign in
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <Link
                href="/account/listings/new"
                className={buttonVariants({ variant: "ghost" })}
              >
                Post a place
              </Link>
              <Link
                href="/account"
                className={buttonVariants({ variant: "outline" })}
              >
                Dashboard
              </Link>
              <div className="ml-1 flex items-center">
                <UserButton />
              </div>
            </Show>
          </Suspense>
        </nav>
      </div>

      {/* On phones the tabs get their own row and scroll sideways if needed. */}
      <div className="overflow-x-auto px-4 md:hidden">
        <Suspense fallback={<div className="h-12" />}>
          <CategoryTabs className="justify-center" />
        </Suspense>
      </div>
    </header>
  );
}
