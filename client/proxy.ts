import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Pages that need a logged-in user. Add more here later, for example '/post(.*)'.
// Everything else (home, search, listing details) stays public.
const isProtectedRoute = createRouteMatcher(['/account(.*)']);

// Runs before every page request (in Next.js 16 this file is called proxy.ts).
// clerkMiddleware reads the Clerk session cookie so the rest of the app knows who is logged in.
export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    // Not logged in? Clerk redirects the visitor to the sign-in page.
    await auth.protect();
  }
});

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
