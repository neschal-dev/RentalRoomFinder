import { Suspense, type ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";

// Wraps every page inside /account. Shows the page only to logged-in users.
async function RequireSignIn({ children }: { children: ReactNode }) {
  // Not logged in? Clerk redirects the visitor to the sign-in page.
  await auth.protect();
  return children;
}

export default function AccountLayout({ children }: { children: ReactNode }) {
  // Who is logged in is only known at request time, so the check sits inside Suspense
  // (required by Cache Components).
  return (
    <Suspense>
      <RequireSignIn>{children}</RequireSignIn>
    </Suspense>
  );
}
