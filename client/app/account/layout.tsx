import { Suspense, type ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DEMO } from "@/lib/demo";

// Wraps every page inside /account. Shows the page only to logged-in users,
// inside the dashboard frame (sidebar + content).
async function RequireSignIn({ children }: { children: ReactNode }) {
  // Not logged in? Clerk redirects the visitor to the sign-in page.
  // Demo mode skips the check so the pages can be previewed without signing in.
  if (!DEMO) await auth.protect();
  return <DashboardShell>{children}</DashboardShell>;
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
