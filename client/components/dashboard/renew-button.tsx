"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// "Renew for 30 days": puts an ended listing back online. It is free.
// `onRenew` does the work (it calls the server) and throws when it fails.
export function RenewButton({
  onRenew,
  label,
}: {
  onRenew: () => Promise<void>;
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function click() {
    setBusy(true);
    setError(null);
    try {
      await onRenew();
    } catch {
      setError("Could not renew the listing. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button variant="accent" size="sm" onClick={click} disabled={busy}>
        <RefreshCw />
        {busy ? "Renewing…" : label}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
