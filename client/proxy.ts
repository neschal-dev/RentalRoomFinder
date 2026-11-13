import { clerkMiddleware } from '@clerk/nextjs/server';

// Runs before every page request (in Next.js 16 this file is called proxy.ts).
// clerkMiddleware reads the Clerk session cookie so the rest of the app knows who is logged in.
// It does NOT block any page by itself. Pages that need a login check it themselves
// (see app/account/layout.tsx).
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes.
    '/(api|trpc)(.*)',
    // Always run for Clerk's own frontend routes.
    '/__clerk/(.*)',
  ],
};