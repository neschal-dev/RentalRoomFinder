import { Suspense } from "react";
import { PaymentResult } from "@/components/payment-result";

// Khalti sends the owner here after a payment: /payment/khalti/success?pidx=...&purchase_order_id=...
// A cancelled payment also comes here, and the server then reports it as not completed.
export default function KhaltiSuccessPage() {
  return (
    <main className="px-4 pb-16">
      {/* useSearchParams needs a Suspense boundary. */}
      <Suspense fallback={null}>
        <PaymentResult provider="khalti" />
      </Suspense>
    </main>
  );
}
