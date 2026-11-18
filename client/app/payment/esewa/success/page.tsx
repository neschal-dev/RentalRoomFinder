import { Suspense } from "react";
import { PaymentResult } from "@/components/payment-result";

// eSewa sends the owner here after a payment: /payment/esewa/success?data=...
export default function EsewaSuccessPage() {
  return (
    <main className="px-4 pb-16">
      {/* useSearchParams needs a Suspense boundary. */}
      <Suspense fallback={null}>
        <PaymentResult provider="esewa" />
      </Suspense>
    </main>
  );
}
