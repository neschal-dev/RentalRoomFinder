"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createApi } from "@/lib/api";
import { DEMO } from "@/lib/demo";
import {
  LISTING_FEE_NPR,
  submitToEsewa,
  type InitiateResponse,
} from "@/lib/payments";

// "Pay NPR 200 to publish": asks our server to start a payment, then opens eSewa.
// For a listing that ran out, `renew` changes the wording.
export function PayButton({
  listingId,
  renew = false,
}: {
  listingId: string;
  renew?: boolean;
}) {
  const { getToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    if (DEMO) {
      setError("Payments are switched off in demo mode.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await createApi(getToken).post<InitiateResponse>(
        "/payments/esewa/initiate",
        { listingId },
      );
      // The page is replaced by eSewa's, so we leave "busy" on.
      submitToEsewa(response.data.formUrl, response.data.fields);
    } catch {
      setError("Could not start the payment. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button variant="accent" size="sm" onClick={pay} disabled={busy}>
        <CreditCard />
        {busy
          ? "Opening eSewa…"
          : renew
            ? `Renew for NPR ${LISTING_FEE_NPR}`
            : `Pay NPR ${LISTING_FEE_NPR} to publish`}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
