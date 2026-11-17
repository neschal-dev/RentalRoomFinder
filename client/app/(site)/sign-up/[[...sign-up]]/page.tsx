import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";

// Our own sign-up page at /sign-up. Same idea as the sign-in page.
export default function SignUpPage() {
  return (
    <main className="flex flex-1 items-center justify-center py-12">
      <Suspense>
        <SignUp />
      </Suspense>
    </main>
  );
}
