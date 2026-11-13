import Link from 'next/link';
import { Suspense } from 'react';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';

// Top bar shown on every page.
export function SiteHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-black/10 px-6 dark:border-white/15">
      <Link href="/" className="text-lg font-semibold">
        FindMeAPlace
      </Link>

      {/* Whether someone is logged in is only known at request time, so this part
          streams in behind a Suspense boundary (required by Cache Components). */}
      <Suspense fallback={<div className="h-10 w-40" />}>
        <nav className="flex items-center gap-4">
          {/* Visitors who are not logged in see these two buttons. */}
          <Show when="signed-out">
            <SignInButton mode="redirect">
              <button className="cursor-pointer text-sm font-medium">Sign in</button>
            </SignInButton>
            <SignUpButton mode="redirect">
              <button className="h-10 cursor-pointer rounded-full bg-black px-5 text-sm font-medium text-white dark:bg-white dark:text-black">
                Sign up
              </button>
            </SignUpButton>
          </Show>

          {/* Logged-in users see a link to their account and the avatar menu (with sign out). */}
          <Show when="signed-in">
            <Link href="/account" className="text-sm font-medium">
              My account
            </Link>
            <UserButton />
          </Show>
        </nav>
      </Suspense>
    </header>
  );
}
