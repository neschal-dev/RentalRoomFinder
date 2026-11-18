import Link from "next/link";
import { Panel } from "@/components/payment-result";
import { buttonVariants } from "@/components/ui/button";

// eSewa sends the owner here when they cancel or the payment fails.
export default function EsewaFailurePage() {
  return (
    <main className="px-4 pb-16">
      <Panel icon="fail" title="Payment was not completed">
        <p>You were not charged. You can pay again whenever you are ready.</p>
        <Link href="/account/listings" className={`${buttonVariants()} mt-4`}>
          Go to My listings
        </Link>
      </Panel>
    </main>
  );
}
