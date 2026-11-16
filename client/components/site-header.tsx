import Link from "next/link";
import { Suspense } from "react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";

// Top bar of the public pages.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/listings"
            className={buttonVariants({ variant: "ghost" })}
          >
            Find a place
          </Link>

          {/* Whether someone is logged in is only known at request time, so this part
              streams in behind a Suspense boundary (required by Cache Components). */}
          <Suspense fallback={<div className="h-10 w-44" />}>
            <Show when="signed-out">
              <SignInButton mode="redirect">
                <button className={buttonVariants({ variant: "ghost" })}>
                  Sign in
                </button>
              </SignInButton>
              <Link
                href="/account/listings/new"
                className={buttonVariants({ variant: "accent" })}
              >
                Post a place
              </Link>
            </Show>
            <Show when="signed-in">
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
    </header>
  );
}
