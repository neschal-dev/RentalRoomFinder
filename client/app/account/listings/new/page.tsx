import { ListingForm } from "@/components/listing-form";

export default function NewListingPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Post a place</h1>
      <ListingForm />
    </main>
  );
}
