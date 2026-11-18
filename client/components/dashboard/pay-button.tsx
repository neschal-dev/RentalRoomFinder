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
  type KhaltiInitiateResponse,
  type Provider,
} from "@/lib/payments";

// "Pay NPR 200 to publish". The first click asks how to pay (Khalti or eSewa).
// The second click asks our server to start that payment and opens the provider's page.
// For a listing that ran out, `renew` changes the wording.
export function PayButton({
  listingId,
  renew = false,
}: {
  listingId: string;
  renew?: boolean;
}) {
  const { getToken } = useAuth();
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay(provider: Provider) {
    if (DEMO) {
      setError("Payments are switched off in demo mode.");
      return;
    }
    setBusy(provider);
    setError(null);
    try {
      const api = createApi(getToken);
      if (provider === "khalti") {
        const response = await api.post<KhaltiInitiateResponse>(
          "/payments/khalti/initiate",
          { listingId },
        );
        // The browser leaves for Khalti's page, so we keep "busy" on.
        window.location.href = response.data.paymentUrl;
      } else {
        const response = await api.post<InitiateResponse>(
          "/payments/esewa/initiate",
          { listingId },
        );
        submitToEsewa(response.data.formUrl, response.data.fields);
      }
    } catch {
      setError("Could not start the payment. Try again.");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      {!choosing ? (
        <Button variant="accent" size="sm" onClick={() => setChoosing(true)}>
          <CreditCard />
          {renew
            ? `Renew for NPR ${LISTING_FEE_NPR}`
            : `Pay NPR ${LISTING_FEE_NPR} to publish`}
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="accent"
            size="sm"
            onClick={() => pay("khalti")}
            disabled={busy !== null}
          >
            {busy === "khalti" ? "Opening Khalti…" : "Pay with Khalti"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => pay("esewa")}
            disabled={busy !== null}
          >
            {busy === "esewa" ? "Opening eSewa…" : "Pay with eSewa"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setChoosing(false)}
            disabled={busy !== null}
          >
            Cancel
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
