import { Suspense } from 'react';
import { SignIn } from '@clerk/nextjs';

// Our own sign-in page at /sign-in. Clerk draws the whole form (email, Google, phone).
// The folder name [[...sign-in]] lets Clerk use extra URL parts such as /sign-in/factor-one.
export default function SignInPage() {
  return (
    <main className="flex flex-1 items-center justify-center py-12">
      {/* The form reads the current URL, which is only known at request time,
          so Cache Components requires it to sit inside Suspense. */}
      <Suspense>
        <SignIn />
      </Suspense>
    </main>
  );
}
