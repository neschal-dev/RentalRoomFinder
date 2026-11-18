"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createApi } from "@/lib/api";
import { formatDate } from "@/lib/listings";
import type { VerifyResponse } from "@/lib/payments";

type State =
  | { kind: "checking" }
  | { kind: "done"; result: VerifyResponse }
  | { kind: "error"; message: string };

// The page eSewa sends the owner back to. eSewa puts a Base64 text in the address (?data=...).
// We pass it to our server, which confirms the payment with eSewa before anything goes live.
export function PaymentResult() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const data = useSearchParams().get("data");
  const [state, setState] = useState<State>({ kind: "checking" });
  const started = useRef(false);

  const verify = useCallback(async () => {
    if (!data) return;
    setState({ kind: "checking" });
    try {
      const response = await createApi(getToken).post<VerifyResponse>(
        "/payments/esewa/verify",
        { data },
      );
      setState({ kind: "done", result: response.data });
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } }).response
        ?.status;
      setState({
        kind: "error",
        message:
          status === 503
            ? "We could not reach eSewa to confirm the payment. Nothing was lost. Try again in a moment."
            : "We could not confirm this payment. If money left your account, contact us with the time of payment.",
      });
    }
  }, [data, getToken]);

  useEffect(() => {
    // Once is enough. The server is safe to call twice, but there is no need.
    if (!isLoaded || !isSignedIn || !data || started.current) return;
    started.current = true;
    void verify();
  }, [isLoaded, isSignedIn, data, verify]);

  if (!data) {
    return (
      <Panel icon="fail" title="Nothing to confirm">
        <p>This page is opened by eSewa after a payment.</p>
        <div className="mt-4">
          <MyListingsLink />
        </div>
      </Panel>
    );
  }
  if (isLoaded && !isSignedIn) {
    return (
      <Panel icon="fail" title="Please sign in">
        <p>Sign in with the account you paid from to confirm the payment.</p>
      </Panel>
    );
  }
  if (state.kind === "checking") {
    return (
      <Panel icon="wait" title="Confirming your payment">
        <p>Checking with eSewa. This takes a few seconds.</p>
      </Panel>
    );
  }
  if (state.kind === "error") {
    return (
      <Panel icon="fail" title="Payment not confirmed">
        <p>{state.message}</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => void verify()}>Try again</Button>
          <MyListingsLink />
        </div>
      </Panel>
    );
  }

  const { result } = state;
  if (result.paymentStatus === "success") {
    return (
      <Panel icon="ok" title="Payment received">
        <p>
          Your listing is live
          {result.expiresAt ? ` until ${formatDate(result.expiresAt)}.` : "."}
        </p>
        <div className="mt-4 flex gap-2">
          <Link
            href={`/listings/${result.listingId}`}
            className={buttonVariants()}
          >
            View your listing
          </Link>
          <MyListingsLink />
        </div>
      </Panel>
    );
  }
  if (result.paymentStatus === "pending") {
    return (
      <Panel icon="wait" title="Payment still processing">
        <p>eSewa has not finished the payment yet. Check again in a minute.</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => void verify()}>Check again</Button>
          <MyListingsLink />
        </div>
      </Panel>
    );
  }
  return (
    <Panel icon="fail" title="Payment was not completed">
      <p>
        You were not charged for this try. You can pay again from My listings.
      </p>
      <div className="mt-4">
        <MyListingsLink />
      </div>
    </Panel>
  );
}

function MyListingsLink() {
  return (
    <Link
      href="/account/listings"
      className={buttonVariants({ variant: "outline" })}
    >
      Go to My listings
    </Link>
  );
}

// A centred card with an icon, a title and a body.
export function Panel({
  icon,
  title,
  children,
}: {
  icon: "ok" | "wait" | "fail";
  title: string;
  children: React.ReactNode;
}) {
  const Icon =
    icon === "ok" ? CheckCircle2 : icon === "wait" ? Loader2 : XCircle;
  const color =
    icon === "ok"
      ? "text-success"
      : icon === "wait"
        ? "text-muted-foreground"
        : "text-danger";
  return (
    <Card className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 px-6 py-10 text-center">
      {icon === "wait" ? (
        <Clock className={`size-10 ${color}`} aria-hidden="true" />
      ) : (
        <Icon className={`size-10 ${color}`} aria-hidden="true" />
      )}
      <h1 className="font-display text-xl font-semibold">{title}</h1>
      <div className="text-muted-foreground">{children}</div>
    </Card>
  );
}
