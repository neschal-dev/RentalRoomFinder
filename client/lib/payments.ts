import type { ListingStatus } from "./listings";

// The price of one listing, shown on buttons. The SERVER decides the real amount.
export const LISTING_FEE_NPR = 200;

// What POST /payments/esewa/initiate gives back.
export type InitiateResponse = {
  paymentId: string;
  formUrl: string;
  fields: Record<string, string>;
};

// What POST /payments/khalti/initiate gives back: the Khalti page to send the owner to.
export type KhaltiInitiateResponse = {
  paymentId: string;
  paymentUrl: string;
};

// The two ways to pay.
export type Provider = "khalti" | "esewa";

// What POST /payments/<provider>/verify gives back.
export type VerifyResponse = {
  paymentId: string;
  paymentStatus: "success" | "pending" | "failed";
  listingId: string;
  listingStatus: ListingStatus | null;
  expiresAt: string | null;
};

// Sends the browser to eSewa's payment page.
//
// eSewa wants the fields as a normal HTML form POST, so we build a form that is not
// shown on screen, fill it with the signed fields from our server, and submit it.
export function submitToEsewa(formUrl: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = formUrl;
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}
